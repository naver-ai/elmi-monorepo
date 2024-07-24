from math import ceil, floor
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.models import Line, Song, TimestampRangeMixin, Verse
from backend.utils.genius import genius
from backend.utils.media import MediaManager
from backend.utils.string import spinalcase
from backend.utils.lyric_synchronizer import LyricSynchronizer

synchronizer = LyricSynchronizer()

async def prepare_song(title: str, artist: str, reference_youtube_id: str, db: AsyncSession, force: bool = False)->Song:

    match_songs = await db.exec(select(Song).where(Song.title == title, Song.artist == artist).limit(1))
    match_song = match_songs.first()
    if match_song is not None and force is False:
        return match_song

    async with db.begin_nested():
        song_info = await genius.retrieve_song_info(title, artist)

        song = Song(title=song_info.title, artist=song_info.artist_names, description=song_info.description, reference_video_id=reference_youtube_id)
                    
        if song_info.song_art_image_url is not None:
            print("Download cover image file...")
            if (await MediaManager.retrieve_song_image_file(song.id, song_info.song_art_image_url)) == True:
                song.cover_image_stored = True
                db.add(song)

        audio_filename = f"{spinalcase(title)}_{spinalcase(artist)}.mp3".lower()
        MediaManager.retrieve_song_from_youtube(song.id, audio_filename, song.reference_video_id)
        song.audio_filename = audio_filename
        db.add(song)

        segmented_lyrics = synchronizer.retrieve_segment_timestamped_subtitles_from_youtube(song.reference_video_id)
        line_synced_lyrics = await synchronizer.apply_line_level_timestamps(song_info.lyrics, segmented_lyrics)
        word_synced_lyrics = await synchronizer.apply_word_level_timestamps(line_synced_lyrics, song.get_audio_file_path())
        word_synced_lyrics = synchronizer.split_multiline_lyrics(song_info.lyrics, word_synced_lyrics)

        verses_by_lyric_verse_id: dict[str, Verse] = {lyric_verse.id:Verse(title=lyric_verse.title, song_id=song.id, verse_ordering=i) for i, lyric_verse in enumerate(song_info.lyrics.verses)}
        line_orms: list[Line] = []

        line_counter: int = 0
        verse_orm: Verse | None = None
        for synced_lyric_line in word_synced_lyrics:
                            
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

        return song.id
