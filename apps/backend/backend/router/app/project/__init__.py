from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, status, Depends
from pydantic import BaseModel, Field
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.engine import with_db_session
from backend.database.models import Line, LineAnnotation, LineInfo, LineInspection, LineTranslation, Project, Song, SongInfo, User, Verse, VerseInfo
from backend.router.app.common import get_signed_in_user
from backend.database.crud.project import fetch_line_annotations_by_project, fetch_line_inspections_by_project, fetch_line_translation_by_line, fetch_line_translations_by_project
from backend.router.app.project.chat import router as chatRouter

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
    translations: list[LineTranslation]
    annotations: list[LineAnnotation]
    inspections: list[LineInspection]


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
                lines=[line for verse in project.song.verses for line in verse.lines],
                translations=await fetch_line_translations_by_project(db, project_id, user.id),
                annotations=project.annotations,
                inspections=project.inspections
            )
        else:
            return status.HTTP_403_FORBIDDEN
    else:
        return status.HTTP_404_NOT_FOUND


@router.get("/{project_id}/inspections/all", response_model=list[LineInspection])
async def get_line_inspections(project_id: str, user: Annotated[User, Depends(get_signed_in_user)],
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    return await fetch_line_inspections_by_project(db, project_id, user.id)

@router.get("/{project_id}/annotations/all", response_model=list[LineAnnotation])
async def get_line_annotations(project_id: str, user: Annotated[User, Depends(get_signed_in_user)],
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    return await fetch_line_annotations_by_project(db, project_id, user.id)

@router.get("/{project_id}/translations/all", response_model=list[LineTranslation])
async def get_line_translations(project_id: str, user: Annotated[User, Depends(get_signed_in_user)],
                       db: Annotated[AsyncSession, Depends(with_db_session)]):
    return await fetch_line_translations_by_project(db, project_id, user.id)

@router.get("/{project_id}/lines/{line_id}/translation", response_model=LineTranslation | None)
async def get_one_line_translation(project_id: str, line_id: str, db: Annotated[AsyncSession, Depends(with_db_session)]):
    return await fetch_line_translation_by_line(db, project_id, line_id)

class TranslationInfo(BaseModel):
    gloss: Optional[str] = Field(default=None, exclude_default=True)
    memo: Optional[str] = Field(default=None, exclude_default=True)

    def memo_is_set(self) -> bool:
        return 'memo' in self.model_fields_set

    def gloss_is_set(self) -> bool:
        return 'gloss' in self.model_fields_set
    


@router.put("/{project_id}/lines/{line_id}/translation", response_model=LineTranslation)
async def upsert_line_translation(info: TranslationInfo,
                                  project_id: str, line_id: str, 
                                  db: Annotated[AsyncSession, Depends(with_db_session)]):
    translation = await fetch_line_translation_by_line(db, project_id, line_id)
    if translation is not None:
        if info.gloss_is_set():
            translation.gloss = info.gloss if info.gloss is not None and len(info.gloss.strip()) > 0 else None
        
        if info.memo_is_set():
            translation.memo = info.memo if info.memo is not None and len(info.memo.strip()) > 0 else None
        
    else:
        translation = LineTranslation(project_id=project_id, line_id=line_id, 
                                      gloss=info.gloss, memo=info.memo)
        

    db.add(translation)
    await db.commit()
    await db.refresh(translation)
    return translation

router.include_router(chatRouter, prefix="/{project_id}/chat")