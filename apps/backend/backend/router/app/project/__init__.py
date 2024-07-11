from typing import Annotated
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database import with_db_session
from backend.database.models import Project, Song, User
from backend.router.app.common import get_signed_in_user



router = APIRouter()

class ProjectInfo(BaseModel):
    id: str
    song_id: str
    song_title: str
    song_artist: str
    song_description: str | None
    last_accessed_at: int | None

@router.get("/", response_model=list[ProjectInfo])
async def get_projects(user: Annotated[User, Depends(get_signed_in_user)], 
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    query = select(Project, Song).where(Project.user_id == user.id, Project.song_id == Song.id).order_by(desc(Project.last_accessed_at))
    results = (await db.exec(query)).all()
    print(results)
    return [ProjectInfo(id=proj.id, song_id=song.id, song_title=song.title, song_artist=song.artist, song_description=song.description, last_accessed_at=proj.last_accessed_at) for proj, song in results]

@router.get("/{project_id}", response_model=Project)
async def get_project_detail(project_id: str, user: Annotated[User, Depends(get_signed_in_user)], 
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    query = select(Project).where(Project.user_id == user.id, Project.id == project_id).limit(1)
    result = await db.exec(query)
    project = await result.first()
    
