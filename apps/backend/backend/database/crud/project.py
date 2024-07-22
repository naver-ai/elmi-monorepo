from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.models import Line, LineAnnotation, LineInspection

async def fetch_line_inspections_by_project(db: AsyncSession, project_id: str)->list[LineInspection]:
    return (await db.exec(select(LineInspection).join(Line, Line.id == LineInspection.line_id)
                          .where(LineInspection.project_id == project_id).order_by(Line.start_millis))).all()

async def fetch_line_inspection_by_line(db: AsyncSession, line_id: str) -> LineInspection:
    return (await db.exec(select(LineInspection).where(LineInspection.line_id == line_id))).first()

async def fetch_line_annotations_by_project(db: AsyncSession, project_id: str)->list[LineInspection]:
    return (await db.exec(select(LineAnnotation).join(Line, Line.id == LineAnnotation.line_id)
                          .where(LineAnnotation.project_id == project_id).order_by(Line.start_millis))).all()

async def fetch_line_annotation_by_line(db: AsyncSession, line_id: str) -> LineInspection:
    return (await db.exec(select(LineAnnotation).where(LineAnnotation.line_id == line_id))).first()