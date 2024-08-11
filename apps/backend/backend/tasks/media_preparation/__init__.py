from math import ceil, floor
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from pydub import AudioSegment

from backend.database.models import Line, Song, TimestampRangeMixin, Verse
from .genius import genius
from .media import MediaManager
from .common import LyricsPackage
from backend.utils.string import spinalcase
from .lyric_synchronizer import LyricSynchronizer

synchronizer = LyricSynchronizer()

async def prepare_song(title: str, artist: str, 
                       reference_youtube_id: str, db: AsyncSession,
                       override_lyrics: LyricsPackage | None = None,
                       force: bool = False)->Song:

    match_songs = await db.exec(select(Song).where(Song.title == title, Song.artist == artist).limit(1))
    match_song = match_songs.first()
    if match_song is not None and force is False:
        return match_song

    async with db.begin_nested():
        song_info = await genius.retrieve_song_info(title, artist)
        if override_lyrics is not None:
            print("Override custom lyrics.")
            song_info.lyrics = override_lyrics

        song = Song(title=song_info.title, artist=song_info.artist_names, description=song_info.description, reference_video_id=reference_youtube_id)
                    
        if song_info.song_art_image_url is not None:
            print("Download cover image file...")
            if (await MediaManager.retrieve_song_image_file(song.id, song_info.song_art_image_url)) == True:
                song.cover_image_stored = True
                db.add(song)

        audio_filename = f"{spinalcase(title)}_{spinalcase(artist)}.mp3".lower()
        MediaManager.retrieve_song_from_youtube(song.id, audio_filename, song.reference_video_id)
        song.audio_filename = audio_filename
        print(f"Saved audio file at {song.get_audio_file_path()}")

        video_filename = f"{spinalcase(title)}_{spinalcase(artist)}.mp4".lower()
        MediaManager.retrieve_video_from_youtube(song.id, video_filename, song.reference_video_id)
        song.video_filename = video_filename
        print(f"Saved video file at {song.get_video_file_path()}")

        audio: AudioSegment = AudioSegment.from_mp3(song.get_audio_file_path())
        song.duration_seconds = audio.duration_seconds
        db.add(song)

        duration_millis = round(audio.duration_seconds * 1000)

        print("Reference Lyrics:")
        print(song_info.lyrics)

        segmented_lyrics = synchronizer.retrieve_segment_timestamped_subtitles_from_youtube(song.reference_video_id)

        print("Segmented lyrics from YouTube:")
        print(segmented_lyrics)
        
        line_synced_lyrics = await synchronizer.apply_line_level_timestamps(song_info.lyrics, segmented_lyrics, audio.duration_seconds)
        print("Line-synced lyrics:")
        print(line_synced_lyrics)


        word_synced_lyrics = await synchronizer.apply_word_level_timestamps(line_synced_lyrics, song.get_audio_file_path())
        word_synced_lyrics = synchronizer.split_multiline_lyrics(song_info.lyrics, word_synced_lyrics)

        verse_orms, line_orms = synchronizer.convert_lyrics_to_orms(song.id, song_info.lyrics, duration_millis, word_synced_lyrics)
                        
        for verse in verse_orms:
            db.add(verse)

        for line in line_orms:
            db.add(line)

        return song