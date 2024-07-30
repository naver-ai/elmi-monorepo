from typing import Annotated
from backend.database.engine import with_db_session
from backend.database.models import Project, Thread, ThreadMessage, User
from backend.router.app.common import get_signed_in_user
from backend.chatbot import ChatIntent, classify_user_intent, proactive_chat
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
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
        return ChatData(
            threads=project.threads,
            messages=project.messages
        )
    else:
        raise HTTPException(status_code=404, detail="NoSuchProject")
    


class ThreadCreate(BaseModel):
    project_id: str
    line_id: str
    mode: str

@router.post("/thread", response_model=Thread)
async def create_thread(data: ThreadCreate, 
                        user: Annotated[User, Depends(get_signed_in_user)],
                        db: Annotated[AsyncSession, Depends(with_db_session)]):
    logger.info(f"Received thread data: {data}")

    # Ensure the user is authorized to create a thread for the given project and line
    stmt = select(Project).where(Project.id == data.project_id, Project.user_id == user.id)
    project = (await db.exec(stmt)).first()
    if not project:
        raise HTTPException(status_code=404, detail="NoSuchProject")

    new_thread = Thread(line_id=data.line_id, project_id=data.project_id, mode=data.mode)
    db.add(new_thread)
    await db.commit()
    await db.refresh(new_thread)
    return new_thread


class MessageCreate(BaseModel):
    thread_id: str
    role: str
    message: str
    mode: str

@router.post("/message", response_model=ThreadMessage)
async def create_message(data: MessageCreate, 
                         user: Annotated[User, Depends(get_signed_in_user)],
                         db: Annotated[AsyncSession, Depends(with_db_session)]):
    logger.info(f"Received message data: {data}")

    thread = await db.get(Thread, data.thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="NoSuchThread")
    
    stmt = select(Project).where(Project.id == thread.project_id, Project.user_id == user.id)
    project = (await db.exec(stmt)).first()
    if not project:
        raise HTTPException(status_code=404, detail="NoSuchProject")

    new_message = ThreadMessage(thread_id=data.thread_id, role=data.role, message=data.message, mode=data.mode, project_id=project.id)
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)

    # Forward the user input to chat_with_bot
    if data.role == 'user':
        chat_request = ChatRequest(
            project_id=project.id,
            line_id=thread.line_id,
            user_input=data.message
        )
    response = await chat_with_bot(chat_request, user, db)
    logger.info(f"Chatbot response: {response.message}")


    return new_message


# New chat endpoint to interact with the chatbot
class ChatRequest(BaseModel):
    project_id: str
    line_id: str
    user_input: str
    intent: ChatIntent | None = None

class ChatResponse(BaseModel):
    message: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_bot(request: ChatRequest, user: Annotated[User, Depends(get_signed_in_user)], db: Annotated[AsyncSession, Depends(with_db_session)]):
    logger.info(f"Chat request received: project_id={request.project_id}, line_id={request.line_id}, user_input={request.user_input}")

    async with db:
        try:
            response_message = await proactive_chat(request.project_id, request.line_id, request.user_input, request.intent, is_button_click=False)
            logger.info(f"Response message: {response_message}")

            return ChatResponse(message=response_message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
