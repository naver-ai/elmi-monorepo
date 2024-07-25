import json
from pydantic import TypeAdapter
from sqlmodel import select
from backend.config import ElmiConfig
from backend.database.models import User
from backend.tasks.media_preparation.genius import genius
from backend.utils.lyric_data_types import SyncedLyricSegment, SyncedLyricsSegmentWithWordLevelTimestampArgs
from backend.tasks.media_preparation.lyric_synchronizer import LyricSynchronizer
from os import path
import asyncio

async def run():

    song_info = await genius.retrieve_song_info("Viva La Vida", "Coldplay")
    segmented_lyrics = synchronizer.retrieve_segment_timestamped_subtitles_from_youtube("dvgZkm1xWPE")
    await synchronizer.apply_line_level_timestamps(song_info.lyrics, segmented_lyrics, 300)
    #with open(path.join(ElmiConfig.DIR_DATA, "test_lyric_segment_timestamp.json"), "r") as f:
    #    await synchronizer.apply_word_level_timestamps(TypeAdapter(list[SyncedLyricSegment]).validate_json(f.read()), 
    #                                                   ElmiConfig.get_song_dir("QCX3WwmjCh9N4Yo5Vma1Q") + "/dynamite-bts-youtube.mp3"
    #                                                   )
    #with open(path.join(ElmiConfig.DIR_DATA, "test_lyric_segment_word_timestamps.json"), "r") as f:
    #    data = TypeAdapter(list[SyncedLyricsSegmentWithWordLevelTimestampArgs]).validate_json(f.read())
        #print(data)
    #    synced_lyrics = [await synchronizer.align_lyric_line_with_word_timestamps(SyncedLyricSegment(**seg.model_dump()), seg.words) for seg in data]
    #    synced_lyrics = synchronizer.split_multiline_lyrics(song_info.lyrics, synced_lyrics)
        
    #    with open(path.join(ElmiConfig.DIR_DATA, "test_synced_lyrics_dynamite_bts.json"), "w") as lf:
    #        lf.write(json.dumps([lyric.model_dump() for lyric in synced_lyrics], indent=2))


    #print(await synchronizer.create_synced_lyrics(song_info.lyrics, "gdZLi9oWNZg", ElmiConfig.get_song_dir("QCX3WwmjCh9N4Yo5Vma1Q") + "/dynamite-bts-youtube.mp3"))

if __name__ == "__main__":
    synchronizer = LyricSynchronizer()
    
    asyncio.run(run())
