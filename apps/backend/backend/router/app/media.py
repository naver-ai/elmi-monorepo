from typing import Annotated, Optional
from nanoid import generate
from pydub import AudioSegment
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.config import ElmiConfig
from backend.database.engine import with_db_session
from backend.database.models import MediaType, Song, TrimmedMedia
from backend.errors import ErrorType
from backend.router.app.common import get_signed_in_user
from os import path
import numpy as np

router = APIRouter()

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

@router.get("/songs/{song_id}/audio/samples", dependencies=[Depends(get_signed_in_user)], response_model=list[float])
async def get_audio(song_id: str, db: Annotated[AsyncSession, Depends(with_db_session)]):
    song = await db.get(Song, song_id)
    if song is not None and song.audio_file_exists():
        seg: AudioSegment = AudioSegment.from_mp3(song.get_audio_file_path())
        samples = seg.get_array_of_samples()[::int(seg.frame_count()/100)]
        max_val = np.max(np.abs(samples))
        normalized_samples = samples/max_val

        return normalized_samples
