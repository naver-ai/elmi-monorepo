from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse

from backend.config import ElmiConfig
from backend.router.app.common import get_signed_in_user
from os import path

router = APIRouter()

@router.get("/cover_image/{song_id}", dependencies=[Depends(get_signed_in_user)], response_class=FileResponse)
def get_cover_image(song_id: str):
    image_file_path = ElmiConfig.get_song_cover_filepath(song_id=song_id)
    print(image_file_path)
    if path.exists(image_file_path):
        return FileResponse(image_file_path, media_type="image/jpeg")
    else:
        return status.HTTP_404_NOT_FOUND