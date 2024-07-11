from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database import with_db_session
from backend.database.models import Project, ProjectInfo, User
from backend.router.app.common import get_signed_in_user



router = APIRouter()

@router.get("/", response_model=list[ProjectInfo])
async def get_projects(user: Annotated[User, Depends(get_signed_in_user)], 
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    query = select(Project).where(Project.user_id == user.id).order_by(desc(Project.last_accessed_at))
    return [row for row in (await db.exec(query)).all()]

@router.get("/{project_id}", response_model=Project)
async def get_project_detail(user: Annotated[User, Depends(get_signed_in_user)], 
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    pass