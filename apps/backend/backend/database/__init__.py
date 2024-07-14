from os import getcwd, path
import re
from typing import AsyncGenerator

from sqlmodel import select

from backend.config import ElmiConfig
from backend.utils.genius import genius
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
from backend.utils.media import MediaManager
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

async def create_test_db_entities():
    async with db_sessionmaker() as db:
        async with db.begin():
            query = select(User).where(User.alias == 'test')
            test_users = await db.exec(query)
            if test_users.first() is None:

                title = "Dynamite"
                artist = "BTS"

                song_info = await genius.retrieve_song_info(title, artist)

                song = Song(title=song_info.title, artist=song_info.artist_names, description=song_info.description)

                db.add(song)
                
                if song_info.song_art_image_url is not None:
                    print("Download cover image file...")
                    if (await MediaManager.retrieve_song_image_file(song.id, song_info.song_art_image_url)) == True:
                        song.cover_image_stored = True
                        db.add(song)

                audio_filename = f"{title}-{artist}.mp3".lower()
                MediaManager.retrieve_song_from_gdrive(song.id, audio_filename, get_env_variable(EnvironmentVariables.EXAMPLE_SONG_GDRIVE_ID))
                song.audio_filename = audio_filename
                db.add(song)

                if song_info.lyrics is not None:
                    print("Create lyrics orms...")
                    verses: list[Verse] = []
                    line_counter: int = 0
                    for line in song_info.lyrics.split("\n"):
                        if line.strip() == "":
                            pass
                        elif re.match(r'^\[.*\]$', line):
                            verse_title = line[1:-1]
                            verse = Verse(title=verse_title, song_id=song.id, verse_ordering=len(verses))
                            db.add(verse)
                            verses.append(verse)
                            line_counter = 0
                        else:
                            if len(verses) == 0:
                                default_verse = Verse(title=None, song_id=song.id, verse_ordering=0)
                                db.add(default_verse)
                                verses.append(default_verse)
                            
                            line_orm = Line(line_number=line_counter, lyric=line, verse_id=verses[len(verses)-1].id, song_id=song.id)
                            line_counter += 1
                            db.add(line_orm)


                print("Create test user...")
                user = User(alias="test", callable_name="Soohyun Yoo", sign_language=SignLanguageType.ASL, passcode="12345")
                project = Project(song=song, user=user)
                
                db.add(user)
                db.add(project)
                await db.commit()
