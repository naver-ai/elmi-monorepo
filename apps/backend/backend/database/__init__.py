from os import getcwd, path
import re
from typing import AsyncGenerator

from pydantic import TypeAdapter
from sqlmodel import select

from backend.config import ElmiConfig
from backend.utils.genius import genius
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
from backend.utils.lyric_data_types import SyncedLyricsSegmentWithWordLevelTimestamp
from backend.utils.media import MediaManager
from .models import *
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from math import floor, ceil

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
                MediaManager.retrieve_song_from_youtube(song.id, audio_filename, "gdZLi9oWNZg")
                song.audio_filename = audio_filename
                db.add(song)

                if song_info.lyrics is not None:
                    print("Create lyrics orms...")
                    with open(path.join(ElmiConfig.DIR_DATA, "sample_synced_lyrics_dynamite_bts.json"), 'r') as f:
                        synced_lyrics: list[SyncedLyricsSegmentWithWordLevelTimestamp] = TypeAdapter(list[SyncedLyricsSegmentWithWordLevelTimestamp]).validate_json(f.read())
                        
                        verses_by_lyric_verse_id: dict[str, Verse] = {lyric_verse.id:Verse(title=lyric_verse.title, song_id=song.id, verse_ordering=i) for i, lyric_verse in enumerate(song_info.lyrics.verses)}
                        line_orms: list[Line] = []

                        line_counter: int = 0
                        verse_orm: Verse | None = None
                        for synced_lyric_line in synced_lyrics:
                            
                            this_verse_orm = verses_by_lyric_verse_id[song_info.lyrics.lines[synced_lyric_line.original_lyric_ids[0]].verse_id]
                            if verse_orm != this_verse_orm:
                                line_counter = 0
                                verse_orm = this_verse_orm
                            line_orm = Line(line_number=line_counter, lyric=synced_lyric_line.text, tokens=synced_lyric_line.tokens, 
                                            timestamps=[TimestampRangeMixin(start_millis=floor(word.start * 1000), end_millis=ceil(word.end * 1000)).model_dump() for word in synced_lyric_line.words],
                                            start_millis=floor(synced_lyric_line.start * 1000),
                                            end_millis=ceil(synced_lyric_line.end * 1000),
                                            verse_id=this_verse_orm.id, song_id=song.id)
                            line_orms.append(line_orm)
                            line_counter += 1
                        
                        for _, verse in verses_by_lyric_verse_id.items():
                            lines = [l for l in line_orms if l.verse_id == verse.id]
                            verse.start_millis = lines[0].start_millis
                            verse.end_millis = lines[-1].end_millis

                            db.add(verse)
                        
                        for line in line_orms:
                            db.add(line)


                print("Create test user...")
                user = User(alias="test", callable_name="Sue Yoo", sign_language=SignLanguageType.ASL, passcode="12345")
                project = Project(song=song, 
                                  user=user,
                                  user_settings={
                                    "MainAudience": "Deaf",
                                    "AgeGroup": "Adult",
                                    "MainLanguage": "ASL",
                                    "LanguageLevel": "Moderate",
                                    "SpeedOfSigning": "Moderate",
                                    "EmotionalLevel": "Moderate",
                                    "UseOfBodyLanguage": "Moderate",
                                    "UseOfClassifiers": "Moderate"
                                     }
                    )
                
                db.add(user)
                db.add(project)
                await db.commit()



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