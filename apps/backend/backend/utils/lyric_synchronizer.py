from io import BytesIO
import re
from pydantic import BaseModel, TypeAdapter, validate_call
from backend.config import ElmiConfig
from backend.database.models import Song
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
import openai
from openai.types.audio import Transcription
from sqlmodel.ext.asyncio.session import AsyncSession
from youtube_transcript_api import YouTubeTranscriptApi
from os import path
from rapidfuzz import fuzz
from pydub import AudioSegment
import json

from backend.utils.genius import LyricsPackage, clean_lyric_line

class SyncedTimestamps(BaseModel):
    start: float
    end: float

class SyncedText(SyncedTimestamps):
    text: str

class SyncedLyricSegment(SyncedText):
    original_lyric_ids: list[int]

class SyncedLyricsSegmentWithWordLevelTimestampArgs(SyncedLyricSegment):
    words: list[SyncedText]

class SyncedLyricsSegmentWithWordLevelTimestamp(SyncedLyricSegment):
    tokens: list[str]
    words: list[SyncedTimestamps]

PROMPT_LINE_MATCH = """
You are a helpful assistant that helps align lyrics with audio transcripts.

The user will give you a subtitle and lyrics.
The subtitle will contain text segments with start and end timestamps, the text of which may not be accurate.
The subtitle will be formatted as JSON array: Array<{"text": string, "start": number, "end": number}>

The lyrics are accurate ground truth, with line IDs.
The lyrics will be formatted as a JSON array: Array<{"id": number, "text": string}>

Match the lyrics text with subtitle, and map the lyrics with the subtitle segment.

The subtitle segmentation and timestamp should be maintained and text to be replaced.

The output must be a JSON array with:
Array<{
    "text": string // corrected lyrics
    "start": number // the start timestamp,
    "end": number // the end timestamp,
    "original_lyric_ids": Array<number> // list of lyric line IDs contributed to this segment. 
}>

Do NOT add your informal message but just provide JSON text.
"""

markdown_json_block_pattern = r'^```(json)?\s*(.*?)\s*```$'

segment_synced_type_adapter = TypeAdapter(list[SyncedLyricSegment])

def clean_token_for_comparison(token: str) -> str:
    return re.sub(r'[\'\".,?\-]', "", token).strip().lower()

class LyricSynchronizer:
    
    def __init__(self) -> None:
        self.openai_client = openai.AsyncClient(api_key=get_env_variable(EnvironmentVariables.OPENAI_API_KEY))

    def retrieve_segment_timestamped_subtitles_from_youtube(self, youtube_id: str) -> list[SyncedText]:
        return [SyncedText(text=clean_lyric_line(seg["text"]), start=seg["start"], end=seg["start"] + seg["duration"]).model_dump() for seg in YouTubeTranscriptApi.get_transcript(youtube_id)]

    @validate_call
    async def apply_line_level_timestamps(self, lyrics: LyricsPackage, subtitles: list[SyncedText])->list[SyncedLyricSegment]:
        
        message = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": PROMPT_LINE_MATCH},
                    {"role": "user", "content": f"""[Subtitles]
{TypeAdapter(list[SyncedText]).dump_json(subtitles, indent=2)}

[Lyrics]
{json.dumps([dict(id=i, text=line.text) for i, line in enumerate(lyrics.lines)], indent=2)}
"""}
                ], max_tokens=4096
            )

        llm_output_str = message.choices[0].message.content
        print(llm_output_str)

        match = re.search(markdown_json_block_pattern, llm_output_str, re.DOTALL)
        if match:
            merged = segment_synced_type_adapter.validate_json(match.group(2))
        else:
            merged = segment_synced_type_adapter.validate_json(llm_output_str)

        #with open(path.join(ElmiConfig.DIR_DATA, "test_lyric_segment_timestamp.json"), 'w') as f:
        #    f.write(json.dumps([line.model_dump() for line in merged], indent=2))

        return merged
    
    @validate_call
    async def apply_word_level_timestamps(self, synced_lyrics: list[SyncedLyricSegment], audio_path: str):
        
        audio: AudioSegment = AudioSegment.from_mp3(audio_path)

        segments = []        
        
        for lyric_segment in synced_lyrics:
            audio_segment = audio[lyric_segment.start * 1000 : lyric_segment.end * 1000]
            buffer = BytesIO()
            buffer.name="audio.mp3"
            audio_segment.export(buffer, format="mp3")

            retryLeft = 10
            maximum_similarity: float = -100
            maximum_similarity_transcription: Transcription | None = None
            while (retryLeft > 0 or (maximum_similarity < 80 and retryLeft > -20)):
                transcription = await self.openai_client.audio.transcriptions.create(
                    model="whisper-1", file=buffer, response_format="verbose_json", timestamp_granularities=["word"],
                    language="en",
                    prompt=f"""
    The actual lyric is "{lyric_segment.text}." Use this text AS-IS.
    """)
                
                similarity = fuzz.ratio(re.sub(r"[.,!]$", "", lyric_segment.text.lower()), re.sub(r"[.,!]$", "", transcription.text.lower()))
                print(f"Similarity: {similarity}, Original: {lyric_segment.text} // Transcription: {transcription.text}")
                if maximum_similarity < similarity:
                    maximum_similarity = similarity
                    maximum_similarity_transcription = transcription
                
                    if similarity == 100:
                        break

                retryLeft -= 1

            print(f"Best result ({maximum_similarity}):")
            print(maximum_similarity_transcription)
            segments.append(
                await self.align_lyric_line_with_word_timestamps(lyric_segment, 
                                                                 [SyncedText(
                                                                     text=word["word"], 
                                                                     start=word["start"] + lyric_segment.start, 
                                                                     end=lyric_segment.start + word["end"]) 
                                                                     for word in maximum_similarity_transcription.words])
            )

        #with open(path.join(ElmiConfig.DIR_DATA, "test_lyric_segment_word_timestamps.json"), 'w') as f:
        #    f.write(json.dumps([line.model_dump() for line in segments], indent=2))

    @validate_call
    async def align_lyric_line_with_word_timestamps(self, lyric_line: SyncedLyricSegment, word_timestamps: list[SyncedText]) -> SyncedLyricsSegmentWithWordLevelTimestamp:
        lyric_tokens = re.split(r'([\s\-])', lyric_line.text)
        lyric_tokens = [t for t in lyric_tokens if not t.isspace()]
        for i, t in enumerate(lyric_tokens):
            if t == "-" and i > 0:
                lyric_tokens[i-1] = f"{lyric_tokens[i-1]}-"
                lyric_tokens[i] = " "
        lyric_tokens = [t for t in lyric_tokens if not t.isspace()]

        lyric_tokens_cleaned = [clean_token_for_comparison(word) for word in lyric_tokens]
        #print(lyric_tokens)
        #print(lyric_tokens_cleaned)
        #print([clean_token_for_comparison(word.text) for word in word_timestamps])
        timestamp_tokens_cleaned = [clean_token_for_comparison(word.text) for word in word_timestamps]
        similarity = fuzz.ratio(lyric_tokens_cleaned, timestamp_tokens_cleaned)
        if similarity >= 100:
            pass
            # Direct matching
            return SyncedLyricsSegmentWithWordLevelTimestamp(
                **lyric_line.model_dump(),
                tokens=lyric_tokens,
                words=[SyncedTimestamps(**word.model_dump()) for word in word_timestamps]
            )

        else:
            print(similarity)
            print(lyric_tokens_cleaned)
            print(timestamp_tokens_cleaned)
            print(word_timestamps)
            
