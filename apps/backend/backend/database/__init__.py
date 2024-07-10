from os import getcwd, path
from typing import AsyncGenerator

from sqlmodel import select
from .models import *
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

def create_database_engine(db_path: str, verbose: bool = False) -> AsyncEngine:
    return create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=verbose)


def make_async_session_maker(engine: AsyncEngine) -> sessionmaker[AsyncSession]:
    return sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def create_db_and_tables(engine: AsyncEngine):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


engine = create_database_engine(path.join(getcwd(), "../../database/database.db"), verbose=True)

db_sessionmaker = make_async_session_maker(engine)

async def with_db_session() -> AsyncSession:
    async with db_sessionmaker() as session:
        yield session

async def create_test_user():
    async with db_sessionmaker() as db:

        query = select(User).where(User.alias == 'test')
        test_users = await db.exec(query)
        if test_users.first() is None:
            print("Create test user...")
            user = User(alias="test", callable_name="Soohyun Yoo", sign_language=SignLanguageType.ASL, passcode="12345")
            project = Project(song_title="Dynamite", song_artist="BTS", song_description="""
    \"Dynamite\" is an upbeat disco-pop song that sings of joy and confidence, bringing a new surge of ‘energy’ to reinvigorate the community during these difficult times. The song finds global superstars searching for happiness by doing again what they are best at—spreading joy to the world through music and performances. It marks BTS‘ first song to be released completely in English as a lead artist. It is featured in the ad for Samsung’s Galaxy S20 FE series.
    """, user=user)
            
            db.add(user)
            db.add(project)
            await db.commit()