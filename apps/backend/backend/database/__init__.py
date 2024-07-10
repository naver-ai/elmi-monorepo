from os import getcwd, path
from typing import AsyncGenerator
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

async def with_db_session() -> AsyncGenerator[AsyncSession]:
    async with db_sessionmaker() as session:
        yield session