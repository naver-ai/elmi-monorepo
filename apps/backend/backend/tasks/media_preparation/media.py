from io import BytesIO
import os
import gdown
from os import path
from PIL import Image
from retry import retry

from backend.config import ElmiConfig
import httpx
from yt_dlp import YoutubeDL

class MediaManager:
    @staticmethod
    def retrieve_song_from_gdrive(song_id: str, filename: str, gdrive_file_id: str):
        file_path = path.join(ElmiConfig.get_song_dir(song_id), filename)
        gdown.download(id=gdrive_file_id, output=file_path)

    @staticmethod
    @retry(tries=3)
    def retrieve_song_from_youtube(song_id: str, filename: str, youtube_id: str):
        file_path = path.join(ElmiConfig.get_song_dir(song_id), filename.replace('.mp3', ''))
        
        if path.exists(file_path):
            os.remove(file_path)
        
        opts = {
            "outtmpl": file_path,
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192"
            }]
        }
        YoutubeDL(opts).download(f"https://www.youtube.com/watch?v={youtube_id}")


    @staticmethod
    @retry(tries=3)
    def retrieve_video_from_youtube(song_id: str, filename: str, youtube_id: str):
        file_path = path.join(ElmiConfig.get_song_dir(song_id), filename.replace('.mp3', ''))
        if path.exists(file_path):
            os.remove(file_path)
        
        opts = {
            "outtmpl": file_path,
            "format": "bv*[vcodec^=avc]",
             'postprocessors': [{  # Add post-processor
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',  # Convert to mp4 after download
            }],
        }
        YoutubeDL(opts).download(f"https://www.youtube.com/watch?v={youtube_id}")

    @staticmethod
    @retry(tries=3)
    async def retrieve_song_image_file(song_id: str, image_url: str) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                if response.status_code == 200:
                    file_path = ElmiConfig.get_song_cover_filepath(song_id)
                    print(file_path)
                    image = Image.open(BytesIO(response.content))
                    print(image)
                    image.convert("RGB").save(file_path, format="JPEG")
                    return True
                else:
                    return False
        except Exception as ex:
            print(ex)
            return False