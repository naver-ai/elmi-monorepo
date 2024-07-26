from typing import Annotated
from backend.database.engine import with_db_session
from backend.database.models import Project, Thread, ThreadMessage, User
from backend.router.app.common import get_signed_in_user
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

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