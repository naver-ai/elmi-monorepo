from sqlmodel import select

from backend.database.models import Song, User
from backend.database.engine import db_sessionmaker
from backend.tasks.preprocessing import preprocess_song
from backend.utils import genius
from backend.utils.media import MediaManager

from pydantic import TypeAdapter
from sqlmodel import select

from backend.config import ElmiConfig
from backend.utils.genius import genius
from backend.utils.lyric_data_types import SyncedLyricsSegmentWithWordLevelTimestamp
from backend.utils.media import MediaManager
from .models import *
from math import floor, ceil

async def create_test_db_entities():
    async with db_sessionmaker() as db:
        async with db.begin():
            query = select(User).where(User.alias == 'test')
            test_users = await db.exec(query)
            test_user = test_users.first()
            if test_user is None:

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
                                  user=user
                    )
                
                db.add(user)
                db.add(project)
                await db.commit()

    async with db_sessionmaker() as db:
        async with db.begin():
            query = select(User).where(User.alias == 'test')
            test_users = await db.exec(query)
            test_user = test_users.first()
            if test_user is not None:
                await preprocess_song(test_user.projects[0].id, db)