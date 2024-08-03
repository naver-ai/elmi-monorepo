import json
from os import getcwd, path

from .models import *
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

def json_serializer(a):
    print("serialize JSON", a)
    return a.model_dump_json() if isinstance(a, BaseModel) else json.dumps(a)

def create_database_engine(db_path: str, verbose: bool = False) -> AsyncEngine:
    return create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=verbose, 
                               json_serializer=json_serializer)


def make_async_session_maker(engine: AsyncEngine) -> sessionmaker[AsyncSession]:
    return sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def create_db_and_tables(engine: AsyncEngine):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


engine = create_database_engine(path.join(getcwd(), "../../database/database.db"), verbose=False)

db_sessionmaker = make_async_session_maker(engine)

async def with_db_session() -> AsyncSession:
    async with db_sessionmaker() as session:
        yield session


if False:
    # Function to insert the first inference result into the database
    async def insert_inference1_result(session: AsyncSession, line_id: str, challenges: list, description: str):
        inference_result = Inference1Result(
            line_id=line_id,
            challenges=challenges,
            description=description
        )
        session.add(inference_result)
        await session.commit()

    async def insert_combined_result(session: AsyncSession, line_id: str, gloss: str, gloss_description: str, mood: str, facial_expression: str, body_gesture: str, emotion_description: str, gloss_options_with_description: list[GlossDescription]):
        combined_result = Inference234Result(
            line_id=line_id,
            gloss=gloss,
            gloss_description=gloss_description,
            mood=mood,
            facial_expression=facial_expression,
            body_gesture=body_gesture,
            emotion_description=emotion_description,
            gloss_options_with_description=gloss_options_with_description
        )
        session.add(combined_result)
        await session.commit()