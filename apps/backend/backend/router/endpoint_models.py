from datetime import datetime
from backend.database.crud.project import fetch_line_translations_by_project
from backend.database.models import InteractionLog, LineAnnotation, LineInfo, LineInspection, LineTranslationInfo, Project, SongInfo, Thread, ThreadMessage, VerseInfo
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession


class ProjectInfo(BaseModel):
    id: str
    user_id: str
    song_id: str
    song_title: str
    song_artist: str
    song_description: str | None
    last_accessed_at: int | None

def convert_project_to_project_info(project: Project) -> ProjectInfo:
    return ProjectInfo(id=project.id, user_id=project.user_id, song_id=project.song_id, 
                        song_title=project.song.title, song_artist=project.song.artist, song_description=project.song.description, 
                        last_accessed_at=project.last_accessed_at)


class ProjectDetails(BaseModel):
    id: str
    last_accessed_at: datetime | None
    song: SongInfo
    verses: list[VerseInfo]
    lines: list[LineInfo]
    translations: list[LineTranslationInfo]
    annotations: list[LineAnnotation]
    inspections: list[LineInspection]
    logs: list[InteractionLog] | None
    threads: list[Thread] | None
    messages: list[ThreadMessage] | None

async def convert_project_to_project_details(project: Project, user_id: str, db: AsyncSession, 
                                             include_logs: bool = False,
                                             include_threads: bool = False,
                                             include_messages: bool = False
                                             ) -> ProjectDetails:
    return ProjectDetails(
                id=project.id,
                last_accessed_at=project.last_accessed_at,
                song=project.song,
                verses=project.song.verses,
                lines=[line for verse in project.song.verses for line in verse.lines],
                translations=await fetch_line_translations_by_project(db, project.id, user_id),
                annotations=project.latest_annotations,
                inspections=project.inspections,
                logs= None if include_logs is False else project.logs,
                threads=None if include_threads is False else project.threads,
                messages=None if include_messages is False else project.messages
            )