from typing import Annotated, Optional
from nanoid import generate
from pydantic import BaseModel
from pydub import AudioSegment
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.config import ElmiConfig
from backend.database.engine import with_db_session
from backend.database.models import MEDIA_IDENTIFIER_REFERENCE, Line, MediaType, Song, SongWhitelistItem, TrimmedMedia, User
from backend.errors import ErrorType
from backend.router.app.common import get_signed_in_user
from os import path
import numpy as np
import ffmpeg

router = APIRouter()

class SongInfoSummary(BaseModel):
    id: str
    title: str
    artist: str

@router.get("/songs", response_model=list[SongInfoSummary])
async def get_songs(user: Annotated[User, Depends(get_signed_in_user)], db: Annotated[AsyncSession, Depends(with_db_session)]):
    songs: list[Song] = (await db.exec(select(Song))).all()
    return [song for song in songs if song.is_whitelisted_to_user(user.id)]

@router.get("/songs/{song_id}/cover_image", dependencies=[Depends(get_signed_in_user)], response_class=FileResponse)
def get_cover_image(song_id: str):
    image_file_path = ElmiConfig.get_song_cover_filepath(song_id=song_id)
    print(image_file_path)
    if path.exists(image_file_path):
        return FileResponse(image_file_path, media_type="image/jpeg")
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ErrorType.ItemNotFound)
    
@router.get("/songs/{song_id}/audio", dependencies=[Depends(get_signed_in_user)], response_class=FileResponse)
async def get_audio(song_id: str, 
                    db: Annotated[AsyncSession, Depends(with_db_session)],
                    start_millis: int | None = None, end_millis: int | None = None):
    song = await db.get(Song, song_id)
    if song is not None and song.audio_file_exists():
        audio_file_path = song.get_audio_file_path()
        if start_millis is None and end_millis is None:
            return FileResponse(audio_file_path, media_type="audio/mp3")
        else:
            cache_query = select(TrimmedMedia).where(TrimmedMedia.song_id == song_id, 
                                                     TrimmedMedia.start_millis == start_millis, 
                                                     TrimmedMedia.end_millis == end_millis, 
                                                     TrimmedMedia.song.audio_filename == song.audio_filename).limit(1)
            caches = await db.exec(cache_query)
            cache = caches.first()
            if cache is not None:
                if cache.trimmed_file_exists():
                    return FileResponse(cache.get_trimmed_file_path(), media_type="audio/mp3")
            
            if start_millis is not None and end_millis is None:
                seg: AudioSegment = AudioSegment.from_mp3(audio_file_path)[start_millis:]
            elif start_millis is None and end_millis is not None:
                seg: AudioSegment = AudioSegment.from_mp3(audio_file_path)[:end_millis]
            else:
                seg: AudioSegment = AudioSegment.from_mp3(audio_file_path)[start_millis:end_millis]
            
            if cache is None:
                trimmed_filename = f"{song_id}_{start_millis}_{end_millis}_{generate(size=5)}.mp3"
                cache = TrimmedMedia(
                    start_millis=start_millis,
                    end_millis=end_millis,
                    type=MediaType.Audio,
                    song_id=song.id,
                    trimmed_filename=trimmed_filename
                )
                db.add(cache)
                await db.commit()
                await db.refresh(cache)
                
            seg.export(cache.get_trimmed_file_path(), format="audio/mp3")
            
            return FileResponse(cache.get_trimmed_file_path(), media_type="audio/mp3")

    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ErrorType.ItemNotFound)
    

    
@router.get("/songs/{song_id}/video", dependencies=[Depends(get_signed_in_user)], response_class=FileResponse)
async def get_video(song_id: str,
                    db: Annotated[AsyncSession, Depends(with_db_session)]):
    song = await db.get(Song, song_id)
    if song is not None and song.video_file_exists():
        video_file_path = song.get_video_file_path()
        return FileResponse(video_file_path, media_type="video/mp4")
    
@router.get("/songs/{song_id}/lines/{line_id}/video", dependencies=[Depends(get_signed_in_user)], response_class=FileResponse)
async def get_video(song_id: str, 
                    line_id: str,
                    db: Annotated[AsyncSession, Depends(with_db_session)]):
    song = await db.get(Song, song_id)
    if song is not None and song.video_file_exists():
        video_file_path = song.get_video_file_path()
        
        line = await db.get(Line, line_id)
        if line is None or line.song_id != song_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ErrorType.ItemNotFound)
        else:
            cache_query = select(TrimmedMedia).where(TrimmedMedia.song_id == song_id, 
                                                     TrimmedMedia.type == MediaType.Video,
                                                     TrimmedMedia.identifier == MEDIA_IDENTIFIER_REFERENCE,
                                                     TrimmedMedia.start_millis == line.start_millis, 
                                                     TrimmedMedia.end_millis == line.end_millis).limit(1)
            caches = await db.exec(cache_query)
            cache = caches.first()
            if cache is not None:
                if cache.trimmed_file_exists():
                    return FileResponse(cache.get_trimmed_file_path(), media_type="video/mp4")
            
            
            if cache is None:
                print("Create video cache...")
                trimmed_filename = f"{song_id}_{MediaType.Video}_{line.start_millis}_{line.end_millis}_{generate(size=5)}.mp4"
                cache = TrimmedMedia(
                    start_millis=line.start_millis,
                    end_millis=line.end_millis,
                    type=MediaType.Video,
                    identifier=MEDIA_IDENTIFIER_REFERENCE,
                    song_id=song.id,
                    trimmed_filename=trimmed_filename
                )
                db.add(cache)
                await db.commit()
                await db.refresh(cache)

            probe = ffmpeg.probe(video_file_path)
            print(probe)
            video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
            fps = int(video_info['r_frame_rate'].split('/')[0])
            print("Video fps: ", fps)
            
            in_file = ffmpeg.input(video_file_path, ss=line.start_millis/1000, t=(line.end_millis - line.start_millis)/1000)
            out_file = ffmpeg.output(in_file, cache.get_trimmed_file_path()
                                     )
            ffmpeg.run(out_file)
            
            return FileResponse(cache.get_trimmed_file_path(), media_type="video/mp4")

    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ErrorType.ItemNotFound)

@router.get("/songs/{song_id}/audio/samples", dependencies=[Depends(get_signed_in_user)], response_model=list[float])
async def get_audio(song_id: str, db: Annotated[AsyncSession, Depends(with_db_session)]):
    song = await db.get(Song, song_id)
    if song is not None and song.audio_file_exists():
        seg: AudioSegment = AudioSegment.from_mp3(song.get_audio_file_path())
        samples = seg.get_array_of_samples()[::int(seg.frame_count()/100)]
        max_val = np.max(np.abs(samples))
        normalized_samples = samples/max_val

        return normalized_samples
