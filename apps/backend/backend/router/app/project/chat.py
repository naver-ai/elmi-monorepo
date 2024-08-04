from typing import Annotated, Self
from backend.database.engine import with_db_session
from backend.database.models import ChatIntent, MessageRole, Project, Thread, ThreadMessage, User
from backend.router.app.common import get_project, get_signed_in_user, get_thread
from backend.tasks.chat.chatbot import generate_chat_response
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, field_validator, model_validator
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChatData(BaseModel):
    threads: list[Thread]
    messages: list[ThreadMessage]

@router.get("/all", response_model=ChatData)
async def get_chat_data(project_id: str, 
                        user: Annotated[User, Depends(get_signed_in_user)],
                        db: Annotated[AsyncSession, Depends(with_db_session)]):
    project = await db.get(Project, project_id)
    if project is not None and project.user_id == user.id:

        threads = sorted(project.threads, key=lambda t: (t.line.line_number, t.line.verse.verse_ordering))

        return ChatData(
            threads=threads,
            messages=project.messages
        )
    else:
        raise HTTPException(status_code=404, detail="NoSuchProject")
    

class ThreadCreate(BaseModel):
    line_id: str

class ThreadStartResult(BaseModel):
    thread: Thread
    initial_assistant_message: ThreadMessage

@router.post("/threads/start", response_model=ThreadStartResult)
async def start_thread(args: ThreadCreate,
                        project: Annotated[Project, Depends(get_project)],
                        db: Annotated[AsyncSession, Depends(with_db_session)]):

    thread = Thread(line_id=args.line_id, project_id=project.id)

    print(f"Create new thread - {thread.id}")

    db.add(thread)
    await db.commit()
    await db.refresh(thread)

    print("Generate initial assistant message...")

    intent, assistant_message = await generate_chat_response(db, thread, None, None)

    response_message = ThreadMessage(
            thread_id=thread.id,
            role=MessageRole.Assistant,
            message=assistant_message,
            intent=intent,
            project_id=thread.project_id
        )
    db.add(response_message)
    await db.commit()

    return ThreadStartResult(thread=thread, initial_assistant_message=response_message)


##########################################################################################################

class MessageCreate(BaseModel):
    message: str | None = None
    intent: ChatIntent | None = None

    @field_validator('message')
    @classmethod
    def handle_empty_string(cls, msg: str | None)  -> str | None:
        if msg is not None and len(msg) == 0:
            return None
        else:
            return msg

    @model_validator(mode = 'after')
    def check_message_intent(self) -> Self:
        if self.intent is None and self.message is None:
            raise ValueError("Either message or intent must be provided.")
        else:
            return self

class UserMessageResponse(BaseModel):
    user_input: ThreadMessage
    assistant_output: ThreadMessage

@router.post("/threads/{thread_id}/messages/new", response_model=UserMessageResponse)
async def send_user_message(args: MessageCreate, 
                         thread: Annotated[Thread, Depends(get_thread)],
                         db: Annotated[AsyncSession, Depends(with_db_session)]):
    logger.info(f"Received message data: {args}")

    new_user_message = ThreadMessage(thread_id=thread.id, role=MessageRole.User, message=args.message, project_id=thread.project_id)
    db.add(new_user_message)
    
    intent, assistant_response = await generate_chat_response(db, thread, args.message, args.intent)

    response_message = ThreadMessage(
            thread_id=thread.id,
            role=MessageRole.Assistant,
            message=assistant_response,
            intent=intent,
            project_id=thread.project_id
        )
    
    db.add(response_message)
    await db.commit()
    await db.refresh(response_message)
    await db.refresh(new_user_message)

    return UserMessageResponse(user_input=new_user_message, assistant_output=response_message)