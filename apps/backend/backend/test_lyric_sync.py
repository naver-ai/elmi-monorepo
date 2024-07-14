from pydantic import TypeAdapter
from sqlmodel import select
from backend.config import ElmiConfig
from backend.database.models import User
from backend.utils.genius import genius
from backend.utils.lyric_synchronizer import LyricSynchronizer, SyncedLyricSegment
from os import path
import asyncio

async def run():

    song_info = await genius.retrieve_song_info("Dynamite", "BTS")
    segmented_lyrics = synchronizer.retrieve_segment_timestamped_subtitles_from_youtube("gdZLi9oWNZg")
    await synchronizer.apply_line_level_timestamps(song_info.lyrics, segmented_lyrics)
    with open(path.join(ElmiConfig.DIR_DATA, "test_lyric_segment_timestamp.json"), "r") as f:
        await synchronizer.apply_word_level_timestamps(TypeAdapter(list[SyncedLyricSegment]).validate_json(f.read()), 
                                                       ElmiConfig.get_song_dir("QCX3WwmjCh9N4Yo5Vma1Q") + "/dynamite-bts-youtube.mp3"
                                                       )
        


if __name__ == "__main__":
    synchronizer = LyricSynchronizer()
    
    asyncio.run(run())
