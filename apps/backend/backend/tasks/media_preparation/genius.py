import re
from backend.tasks.media_preparation.common import LyricLine, LyricVerse, LyricsPackage, clean_lyric_line
from fastapi import HTTPException
import httpx
from pydantic import BaseModel
from bs4 import BeautifulSoup
from retry import retry

from backend.utils.env_helper import get_env_variable, EnvironmentVariables

class GeniusSongInfo(BaseModel):
    id: int
    artist_names: str
    title: str
    song_art_image_thumbnail_url: str | None
    song_art_image_url: str | None
    lyrics: LyricsPackage
    description: str

# Modified from https://github.com/johnwmillr/LyricsGenius/blob/master/lyricsgenius/genius.py
@retry()
async def extract_lyrics_and_description(song_path: str) -> tuple[LyricsPackage|None, str|None]:
    url = f"https://genius.com{song_path}"

    print(url)

    webpage_text: str
    async with httpx.AsyncClient() as client:
        response = await client.get(url=url)
        if response.status_code != 200:
            raise HTTPException("Failed to get Genius webpage.")
        webpage_text = response.text.replace('<br/>', '\n')
        

    html = BeautifulSoup(webpage_text,
            "html.parser"
        )

    # Determine the class of the div
    lyrics_divs = html.find_all("div", attrs={"data-lyrics-container": "true"})
    if lyrics_divs is None or len(lyrics_divs) <= 0:
        print("No lyrics found on the webpage.")
        lyrics = None
    else:
        lyrics = "\n".join([div.get_text() for div in lyrics_divs])
        lyrics = lyrics.split("\n")
        print(lyrics)
    
        lyrics = LyricsPackage.from_list_str(lyrics)
    

    description_div = html.find("div", class_=re.compile("^SongDescription__Content"))
    if description_div is not None:
        description = description_div.get_text()
    else:
        description = None

    return lyrics, description


class GeniusManager:
    HOST = "https://api.genius.com"
    ENDPOINT_SEARCH = f"{HOST}/search"
    
    def __init__(self) -> None:
        self.token = get_env_variable(EnvironmentVariables.GENIUS_ACCESS_TOKEN)
    
    retry()
    async def retrieve_song_info(self, title: str, artist: str) -> GeniusSongInfo | None:

        params = {"q": f"{title}"}

        headers = {
                'Authorization': f"Bearer {self.token}"
            }

        async with httpx.AsyncClient() as client:
            response = await client.get(url=self.ENDPOINT_SEARCH, params=params, headers=headers, timeout=20000)
            print(response.json())
            songs = [hit["result"] for hit in response.json()["response"]["hits"] if hit["type"] == "song"]
            if len(songs) > 0:
                print(f"{len(songs)} songs")
                for song in songs:
                    print(f"Check {song['title']} / {song['artist_names']}")
                    if song["title"].strip().lower() == title.strip().lower():
                        if song["artist_names"].strip().lower() == artist.strip().lower():

                            print(song)

                            lyrics, desc = await extract_lyrics_and_description(song["path"])

                            return GeniusSongInfo(**song, lyrics=lyrics, description=desc)
                
            return None

genius = GeniusManager()