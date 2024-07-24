from difflib import Match, SequenceMatcher
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
from backend.utils.lyric_data_types import SyncedLyricSegment, SyncedLyricsSegmentWithWordLevelTimestamp, SyncedText, SyncedTimestamps

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

def join_lyric_tokens(tokens: list[str])->str:
    text = ""
    for token in tokens:
        if text.endswith("-") or text == "":
            text += token
        else:
            text += " " + token
    return text

def tokenize_lyrics(lyric_line: str) -> list[str]:
    lyric_tokens = re.split(r'([\s\-])', lyric_line)
    lyric_tokens = [t for t in lyric_tokens if not t.isspace() and t != ""]
    for i, t in enumerate(lyric_tokens):
        if t == "-" and i > 0:
            lyric_tokens[i-1] = f"{lyric_tokens[i-1]}-"
            lyric_tokens[i] = " "
    lyric_tokens = [t for t in lyric_tokens if not t.isspace() and t != ""]
    return lyric_tokens


def find_subsequent_indices(lst: list, condition) -> tuple[int, int] | None:
    subsequence_start = None
    
    for i, x in enumerate(lst):
        if condition(x) == True:
            if subsequence_start is None:
                subsequence_start = i
        else:
            if subsequence_start is not None:
                return [subsequence_start, i-1]
    
    if subsequence_start is not None:
        return [subsequence_start, subsequence_start]
    else:
        return None
    

class LyricSynchronizer:
    
    def __init__(self) -> None:
        self.openai_client = openai.AsyncClient(api_key=get_env_variable(EnvironmentVariables.OPENAI_API_KEY))

    async def create_synced_lyrics(self, lyrics: LyricsPackage, youtube_id: str, audio_path: str) -> list[SyncedLyricsSegmentWithWordLevelTimestamp]:
        line_level_synced_lyrics = await self.apply_line_level_timestamps(lyrics, self.retrieve_segment_timestamped_subtitles_from_youtube(youtube_id))
        print(line_level_synced_lyrics)

        return await self.apply_word_level_timestamps(line_level_synced_lyrics, audio_path)

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
    async def apply_word_level_timestamps(self, synced_lyrics: list[SyncedLyricSegment], audio_path: str) -> list[SyncedLyricsSegmentWithWordLevelTimestamp]:
        
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
                                                                     start=lyric_segment.start + word["start"], 
                                                                     end=lyric_segment.start + word["end"]) 
                                                                     for word in maximum_similarity_transcription.words])
            )

        return segments

        #with open(path.join(ElmiConfig.DIR_DATA, "test_lyric_segment_word_timestamps.json"), 'w') as f:
        #    f.write(json.dumps([line.model_dump() for line in segments], indent=2))

    @validate_call
    async def align_lyric_line_with_word_timestamps(self, lyric_line: SyncedLyricSegment, word_timestamps: list[SyncedText]) -> SyncedLyricsSegmentWithWordLevelTimestamp:
        lyric_tokens = tokenize_lyrics(lyric_line.text)

        lyric_tokens_cleaned = [clean_token_for_comparison(word) for word in lyric_tokens]
        #print(lyric_tokens)
        #print(lyric_tokens_cleaned)
        #print([clean_token_for_comparison(word.text) for word in word_timestamps])

        word_timestamps = [word for word in word_timestamps if not re.match(r'^[^\w\s]+$', word.text)]
        
        timestamp_tokens_cleaned = [clean_token_for_comparison(word.text) for word in word_timestamps]
        similarity = fuzz.ratio(lyric_tokens_cleaned, timestamp_tokens_cleaned)
        if similarity >= 100:
            # Direct matching
            return SyncedLyricsSegmentWithWordLevelTimestamp(
                **lyric_line.model_dump(),
                tokens=lyric_tokens,
                words=[SyncedTimestamps(**word.model_dump()) for word in word_timestamps]
            )

        else:
            s_matcher = SequenceMatcher(None, lyric_tokens_cleaned, timestamp_tokens_cleaned)
            matches = [match for match in s_matcher.get_matching_blocks()]

            # Segment common matches
            
            lyric_tokens_segmented: list[str | list[str]] = []
            timestamp_tokens_segmented: list[SyncedText | list[SyncedText]] = []
            
            pointer_a = 0
            pointer_b = 0
            for match in matches:
                lyric_tokens_segmented += lyric_tokens[pointer_a:match.a]
                timestamp_tokens_segmented += word_timestamps[pointer_b:match.b]
                if match.size > 0:
                    lyric_tokens_segmented.append(lyric_tokens[match.a:match.a+match.size])
                    timestamp_tokens_segmented.append(word_timestamps[match.b:match.b+match.size])
                pointer_a = match.a + match.size
                pointer_b = match.b + match.size
            
            # Slide the segmented arrays until all elements becomes array.

            new_lyric_tokens: list[str] = []
            new_words: list[SyncedTimestamps] = []

            while len(lyric_tokens_segmented) > 0 and len(timestamp_tokens_segmented) > 0:
                # Find orphans
                first_orphan_lyrics_idx = find_subsequent_indices(lyric_tokens_segmented, lambda seg: isinstance(seg, str)) if isinstance(lyric_tokens_segmented[0], str) else None
                first_orphan_timstamp_idx = find_subsequent_indices(timestamp_tokens_segmented, lambda seg: isinstance(seg, SyncedText)) if isinstance(timestamp_tokens_segmented[0], SyncedText) else None
                
                if first_orphan_lyrics_idx is not None:
                    first_orphan_lyrics_sequence = lyric_tokens_segmented[first_orphan_lyrics_idx[0]:first_orphan_lyrics_idx[1]+1]
                else:
                    first_orphan_lyrics_sequence = None

                
                if first_orphan_timstamp_idx is not None:
                    first_orphan_timestamp_sequence = timestamp_tokens_segmented[first_orphan_timstamp_idx[0]:first_orphan_timstamp_idx[1]+1]
                else:
                    first_orphan_timestamp_sequence = None

                #Handle orphans
                if first_orphan_lyrics_sequence is None and first_orphan_timestamp_sequence is None:
                    # First element is match.
                    for lyric, ts in zip(lyric_tokens_segmented[0], timestamp_tokens_segmented[0]):
                        new_lyric_tokens.append(lyric)
                        new_words.append(SyncedTimestamps(start=ts.start, end=ts.end))
                    del lyric_tokens_segmented[0]
                    del timestamp_tokens_segmented[0]
                elif first_orphan_lyrics_sequence is not None and first_orphan_timestamp_sequence is None:
                    print("Only lyrics has orphans. Try to merge them with before or next tokens: ", first_orphan_lyrics_sequence)
                    if len(new_lyric_tokens) > 0:
                        new_lyric_tokens[-1] = join_lyric_tokens([new_lyric_tokens[-1]] + first_orphan_lyrics_sequence)
                    else:
                        lyric_tokens_segmented[first_orphan_lyrics_idx[1]+1][0] = join_lyric_tokens(first_orphan_lyrics_sequence + [lyric_tokens_segmented[first_orphan_lyrics_idx[1]+1][0]])

                    del lyric_tokens_segmented[first_orphan_lyrics_idx[0]:first_orphan_lyrics_idx[1]+1]
                elif first_orphan_lyrics_sequence is None and first_orphan_timestamp_sequence is not None:
                    print("Only subtitle has timestamps. Disregard it.")
                    del timestamp_tokens_segmented[first_orphan_timstamp_idx[0]:first_orphan_timstamp_idx[1]+1]
                else:
                    print("Both subtitles and lyrics has orphans. Merge each.")
                    new_lyric_tokens.append(join_lyric_tokens(first_orphan_lyrics_sequence))
                    new_words.append(SyncedTimestamps(start=first_orphan_timestamp_sequence[0].start, end=first_orphan_timestamp_sequence[-1].end))

                    del timestamp_tokens_segmented[first_orphan_timstamp_idx[0]:first_orphan_timstamp_idx[1]+1]
                    del lyric_tokens_segmented[first_orphan_lyrics_idx[0]:first_orphan_lyrics_idx[1]+1]
            
            assert len(new_lyric_tokens) == len(new_words)

            print(new_lyric_tokens, new_words)

            #print(words)
            return SyncedLyricsSegmentWithWordLevelTimestamp(
                **lyric_line.model_dump(exclude={"text"}),
                text=join_lyric_tokens(new_lyric_tokens),
                tokens=new_lyric_tokens,
                words=new_words
            )
        
    def split_multiline_lyrics(self, original_lyrics: LyricsPackage, synced_lyrics: list[SyncedLyricsSegmentWithWordLevelTimestamp]) -> list[SyncedLyricsSegmentWithWordLevelTimestamp]:
        new_lyrics: list[SyncedLyricsSegmentWithWordLevelTimestamp] = []
        for seg in synced_lyrics:
            if len(seg.original_lyric_ids) > 1:
                # Split
                pointer = 0
                last_end = None
                for ii, orig_lyric_idx in enumerate(seg.original_lyric_ids):
                    orig_tokens = [clean_token_for_comparison(tok) for tok in tokenize_lyrics(original_lyrics.lines[orig_lyric_idx].text)]
                    
                    match, adjusted_match_size = self._find_first_match_including_merged(orig_tokens, seg.tokens[pointer:])

                    new_seg_end = seg.end if ii >= len(seg.original_lyric_ids)-1 else seg.words[pointer + adjusted_match_size - 1].end

                    new_lyrics.append(SyncedLyricsSegmentWithWordLevelTimestamp(
                        start= seg.start if last_end is None else (seg.words[pointer].start + last_end)/2,
                        end= new_seg_end,
                        text=join_lyric_tokens(seg.tokens[pointer:pointer+adjusted_match_size]),
                        original_lyric_ids=[orig_lyric_idx],
                        tokens=seg.tokens[pointer:pointer+adjusted_match_size],
                        words=seg.words[pointer:pointer+adjusted_match_size]
                    ))
                    last_end = new_seg_end

                    pointer = adjusted_match_size               
            else:
                new_lyrics.append(seg)
        
        return new_lyrics
    
    @staticmethod
    def _find_first_match_including_merged(a_tokens_perfect: list[str], b_tokens: list[str])->tuple[Match, int]:
        b_flatten = []
        b_token_indices = []

        for i, b_token in enumerate(b_tokens):
            b_split = tokenize_lyrics(b_token)
            for b_split_token in b_split:
                b_flatten.append(clean_token_for_comparison(b_split_token))
                b_token_indices.append(i)

        
        s_matcher = SequenceMatcher(None, a_tokens_perfect, b_flatten)
        match = s_matcher.find_longest_match()

        print(a_tokens_perfect, b_flatten, b_token_indices, match)

        assert match.a == match.b == 0 and match.size == len(a_tokens_perfect)
        return match, b_token_indices[match.size-1]+1
