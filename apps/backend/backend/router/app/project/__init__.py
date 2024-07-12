from datetime import datetime
from typing import Annotated
from fastapi import APIRouter, status, Depends
from pydantic import BaseModel
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database import with_db_session
from backend.database.models import Line, LineInfo, Project, Song, SongInfo, User, Verse, VerseInfo
from backend.router.app.common import get_signed_in_user

router = APIRouter()

class ProjectInfo(BaseModel):
    id: str
    user_id: str
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
    return [ProjectInfo(id=proj.id, user_id=user.id, song_id=song.id, 
                        song_title=song.title, song_artist=song.artist, song_description=song.description, 
                        last_accessed_at=proj.last_accessed_at) for proj, song in results]


class ProjectDetails(BaseModel):
    id: str
    last_accessed_at: datetime | None
    song: SongInfo
    verses: list[VerseInfo]
    lines: list[LineInfo]


@router.get("/{project_id}", response_model=ProjectDetails)
async def get_project_detail(project_id: str, user: Annotated[User, Depends(get_signed_in_user)], 
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    project = await db.get(Project, project_id)
    if project is not None:
        if project.user_id == user.id:
            return ProjectDetails(
                id=project.id,
                last_accessed_at=project.last_accessed_at,
                song=project.song,
                verses=project.song.verses,
                lines=[line for verse in project.song.verses for line in verse.lines]
            )
        else:
            return status.HTTP_403_FORBIDDEN
    else:
        return status.HTTP_404_NOT_FOUND