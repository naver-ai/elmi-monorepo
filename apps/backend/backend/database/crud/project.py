from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.models import InteractionLog, InteractionType, Line, LineAnnotation, LineInspection, LineTranslation, Project, User

async def fetch_line_inspections_by_project(db: AsyncSession, project_id: str, user_id: str | None)->list[LineInspection]:
    return (await db.exec(select(LineInspection).join(Line, Line.id == LineInspection.line_id)
                          .join(Project, Project.id == LineAnnotation.project_id)
                          .where(Project.user_id == user_id if user_id is not None else True)
                          .where(LineInspection.project_id == project_id).order_by(Line.start_millis))).all()

async def fetch_line_inspection_by_line(db: AsyncSession, project_id: str, line_id: str) -> LineInspection:
    return (await db.exec(select(LineInspection)
                          .where(LineInspection.line_id == line_id)
                          .where(LineInspection.project_id == project_id))).first()

async def fetch_line_annotations_by_project(db: AsyncSession, project_id: str, user_id: str | None)->list[LineInspection]:
    return (await db.exec(select(LineAnnotation)
                          .join(Line, Line.id == LineAnnotation.line_id)
                          .join(Project, Project.id == LineAnnotation.project_id)
                          .where(Project.user_id == user_id if user_id is not None else True)
                          .where(LineAnnotation.project_id == project_id).order_by(Line.start_millis))).all()


async def fetch_line_translations_by_project(db: AsyncSession, project_id: str, user_id: str | None)->list[LineTranslation]:
    return (await db.exec(select(LineTranslation)
                          .join(Line, Line.id == LineTranslation.line_id)
                          .join(Project, Project.id == LineTranslation.project_id)
                          .where(Project.user_id == user_id if user_id is not None else True)
                          .where(LineTranslation.project_id == project_id).order_by(Line.start_millis))).all()

async def fetch_line_annotation_by_line(db: AsyncSession, project_id: str, line_id: str) -> LineInspection | None:
    return (await db.exec(select(LineAnnotation)
                          .where(LineAnnotation.line_id == line_id)
                          .where(LineInspection.project_id == project_id))).first()


async def fetch_line_translation_by_line(db: AsyncSession, project_id: str, line_id: str) -> LineTranslation | None:
    return (await db.exec(select(LineTranslation)
                          .where(LineTranslation.line_id == line_id)
                          .where(LineTranslation.project_id == project_id))).first()

async def store_interaction_log(db: AsyncSession, user_id: str, project_id: str, type: InteractionType, metadata: dict | None = None, timestamp: int | None = None, timezone: str | None = None):
    orm = InteractionLog(type=type, metadata_json=metadata, timestamp=timestamp, local_timezone=timezone, user_id=user_id, project_id=project_id)
    print(orm)
    db.add(orm)
    await db.commit()