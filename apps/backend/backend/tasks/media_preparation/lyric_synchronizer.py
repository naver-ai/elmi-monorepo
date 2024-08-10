from difflib import Match, SequenceMatcher
from io import BytesIO
from math import ceil, floor
import re
from backend.database.models import Line, TimestampRangeMixin, Verse
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, TypeAdapter, validate_call
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
import openai
from openai.types.audio import Transcription
from youtube_transcript_api import YouTubeTranscriptApi
from rapidfuzz import fuzz
from pydub import AudioSegment
from langchain_core.runnables import Runnable
from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

import json

from .genius import LyricLine, LyricsPackage, clean_lyric_line
from backend.utils.lyric_data_types import SyncedLyricSegment, SyncedLyricsSegmentWithWordLevelTimestamp, SyncedText, SyncedTimestamps

PROMPT_LINE_MATCH = """
You are a helpful assistant that helps align lyrics with audio transcripts.

[Input]
The user will give you a subtitle and lyrics.
The subtitle will contain text segments with start and end timestamps, the text of which may not be accurate.
The subtitle will be formatted as JSON array: Array<{"text": string, "start": number, "end": number}>

The lyrics are accurate ground truth, with line IDs.
The lyrics will be formatted as a JSON array: Array<{"id": number, "text": string}>

[Output]
Match the lyrics text with subtitle, and map the lyrics with the subtitle segment. 

The output must be a JSON array with:
Array<{
    "text": string // corrected lyrics
    "start": number // the start timestamp,
    "end": number // the end timestamp,
    "original_lyric_ids": Array<number> // list of lyric line IDs contributed to this segment. 
}>

- A subtitle line may contain multiple lyric lines, and multiple recurring lyric lines may be represented as one subtitle line.
In that case, put all related lyric line ids into "original_lyric_ids". Note that you must INCLUDE ALL lyric lines in the original_lyric_ids.
- The subtitle segmentation and timestamp should be consistent with the input and text to be replaced using lyrics.

Do NOT add your informal message but just provide JSON string.
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

def tokenize_lyrics_cleaned(lyric_line: str) -> list[str]:
    return [clean_token_for_comparison(t) for t in tokenize_lyrics(lyric_line)]


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

class BestMatchOutput(BaseModel):
    index: int

async def find_best_match_llm(ref: str, candidates: list[str])->int:
    prompt= ChatPromptTemplate.from_messages(
        [("system", """
You are a helpful assistant that matches the reference lyrics with automatically-generated subtitles which may be dirty.
Given the reference lyric phrase and a candidate list of subtitles, find a candidate that best matches the reference.

[Output Format]
Yield a json object formatted as follows:
{{
    "index": number // an index of the candidate. Start with 0. If there are no matches, return -1.
}}
"""),
        ("human", "[Reference]\n{ref}\n\n[Candidates]\n{candidates}")
        ]
    )

    model = ChatOpenAI(api_key=get_env_variable(EnvironmentVariables.OPENAI_API_KEY), 
                                model_name="gpt-4o", 
                                temperature=0, 
                                max_tokens=256,
                                model_kwargs=dict(
                                    frequency_penalty=0, 
                                    presence_penalty=0)
                                )

    chain = prompt | model | PydanticOutputParser(pydantic_object=BestMatchOutput)

    result: BestMatchOutput = await chain.ainvoke({"ref": f"\"{ref}\"", "candidates": "\n".join([f"{i}: \"{c}\"" for i, c in enumerate(candidates)])})

    return result.index

class LyricSynchronizer:
    
    def __init__(self) -> None:
        self.openai_client = openai.AsyncClient(api_key=get_env_variable(EnvironmentVariables.OPENAI_API_KEY))

    def retrieve_segment_timestamped_subtitles_from_youtube(self, youtube_id: str, expand_duration_millis: int = 1000) -> list[SyncedText]:

        youtube_transcript = YouTubeTranscriptApi.get_transcript(youtube_id)

        print("Original youtube transcript: ", youtube_transcript)

        subtitles = [SyncedText(text=clean_lyric_line(seg["text"]), start=seg["start"], end=seg["start"] + seg["duration"]) for seg in youtube_transcript if clean_lyric_line(seg["text"]) != ""]

        return subtitles

    @validate_call
    async def apply_line_level_timestamps_llm(self, lyrics: LyricsPackage, subtitles: list[SyncedText])->list[SyncedLyricSegment]:
        
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

        for seg in merged:
            if len(seg.original_lyric_ids)>0:
                seg.text = " ".join([lyrics.lines[lyric_line_id].text for lyric_line_id in seg.original_lyric_ids]) 

        return merged

    @validate_call
    async def apply_line_level_timestamps(self, lyrics: LyricsPackage, subtitles: list[SyncedText], song_duration_sec: float)->list[SyncedLyricSegment]:
        merged = [SyncedLyricSegment(**subt.model_dump(), original_lyric_ids=[]) for subt in subtitles]
        last_subtitle_idx_paired = -1
        for line_i, lyric_line in enumerate(lyrics.lines):
            print("Try match line - ", lyric_line.text, line_i, len(lyrics.lines))
            candidates: list[SyncedLyricSegment] = []
            if last_subtitle_idx_paired >=0:
                candidates.append(merged[last_subtitle_idx_paired])
            if last_subtitle_idx_paired < len(merged) - 1:
                candidates.append(merged[last_subtitle_idx_paired + 1])
            
            if last_subtitle_idx_paired + 1 < len(merged) - 1:
                candidates.append(merged[last_subtitle_idx_paired + 2])
            
            similarities = [fuzz.ratio(tokenize_lyrics_cleaned(cand.text), tokenize_lyrics_cleaned(lyric_line.text)) for cand in candidates]

            # similarities_with_next_line = [fuzz.ratio(tokenize_lyrics_cleaned(cand.text), tokenize_lyrics_cleaned(lyric_line.text + " " + lyrics.lines[line_i+1].text)) for cand in candidates]
            
            stitched_candidates = [[candidate, candidates[i+1]] if i < len(candidates) - 1 else None for i, candidate in enumerate(candidates)]
            stitched_candidates = [cc for cc in stitched_candidates if cc is not None]
            similarities_stitched_subtitles = [fuzz.ratio(tokenize_lyrics_cleaned(cc[0].text + " " + cc[1].text), tokenize_lyrics_cleaned(lyric_line.text)) for cc in stitched_candidates]

            highest_similarity = max(similarities)
            # highest_similarity_with_next_line = max(similarities_with_next_line)
            highest_similarity_with_stitched_subtitles = max(similarities_stitched_subtitles) if len(similarities_stitched_subtitles) > 0 else -1

            if max(highest_similarity, highest_similarity_with_stitched_subtitles) > 40:
                if highest_similarity >= highest_similarity_with_stitched_subtitles:
                    if similarities[0] == similarities[1] == highest_similarity:
                        print("There might be skipped repeatedness in the subtitles.")
                        cand_highest_similarity = candidates[1]
                    else:         
                        cand_highest_similarity = candidates[similarities.index(highest_similarity)]
                    
                    subt_idx = merged.index(cand_highest_similarity)
                    merged[subt_idx].original_lyric_ids.append(line_i)
                    last_subtitle_idx_paired = subt_idx
                elif highest_similarity_with_stitched_subtitles > highest_similarity:
                    # merge the two subtitles
                    cand1, cand2 = stitched_candidates[similarities_stitched_subtitles.index(highest_similarity_with_stitched_subtitles)]
                    print(f"Merge subtitles: {cand1.text} + {cand2.text}")
                    
                    cand1.end = cand2.end
                    cand1.text += " " + cand2.text
                    cand1_index = merged.index(cand1)
                    del merged[cand1_index+1]
                    cand1.original_lyric_ids.append(line_i)
                    last_subtitle_idx_paired = cand1_index
                
                print("original: ", lyric_line.text, ", candidates: ", candidates, stitched_candidates, similarities, similarities_stitched_subtitles, last_subtitle_idx_paired)
                print("-------------")
            else:
                print("Find best match using LLM")
                normalized_candidates = []
                for i, candidate in enumerate(candidates):
                    normalized_candidates.append((candidate.text, False, i))
                for i, (candidate1, candidate2) in enumerate(stitched_candidates):
                    normalized_candidates.append((candidate1.text + " " + candidate2.text, True, i))
                
                best_match_index = await find_best_match_llm(lyric_line.text, [c[0] for c in normalized_candidates])
                print(f"Best match index for {lyric_line.text}, among {[c[0] for c in normalized_candidates]}: ", best_match_index)
                if best_match_index >= 0:
                    best_match_normalized_candidate = normalized_candidates[best_match_index]
                    if best_match_normalized_candidate[1] == False:
                        candidate = candidates[best_match_normalized_candidate[2]]
                        subt_idx = merged.index(candidate)
                        merged[subt_idx].original_lyric_ids.append(line_i)
                        last_subtitle_idx_paired = subt_idx
                    else:
                        cand1, cand2 = stitched_candidates[best_match_normalized_candidate[2]]
                        print(f"Merge subtitles: {cand1.text} + {cand2.text}")
                        
                        cand1.end = cand2.end
                        cand1.text += " " + cand2.text
                        cand1_index = merged.index(cand1)
                        del merged[cand1_index+1]
                        cand1.original_lyric_ids.append(line_i)
                        last_subtitle_idx_paired = cand1_index
                else:
                    print("Did not find the lyrics line match. Make a new bridge subtitle...")
                    print("Before:", merged[last_subtitle_idx_paired])
                    print("After:", merged[last_subtitle_idx_paired + 1])
                    segment = SyncedLyricSegment(
                        start=merged[last_subtitle_idx_paired].end,
                        end=merged[last_subtitle_idx_paired + 1].start if (last_subtitle_idx_paired < len(merged) - 1 and line_i < len(lyrics.lines) - 1) else song_duration_sec,
                        text=lyric_line.text,
                        original_lyric_ids=[line_i]
                    )
                    print("new bridge segment: ", segment)
                    merged.insert(last_subtitle_idx_paired+1, segment)
                    last_subtitle_idx_paired += 1


        for seg in merged:
            if len(seg.original_lyric_ids)>0:
                seg.text = " ".join([lyrics.lines[lyric_line_id].text for lyric_line_id in seg.original_lyric_ids])

        merged = [seg for seg in merged if len(seg.original_lyric_ids) > 0]


        print(json.dumps([l.model_dump() for l in merged], indent=4))

        return merged
    
    @validate_call
    async def apply_word_level_timestamps(self, synced_lyrics: list[SyncedLyricSegment], audio_path: str) -> list[SyncedLyricsSegmentWithWordLevelTimestamp]:
        
        audio: AudioSegment = AudioSegment.from_mp3(audio_path)

        segments = []        
        
        for lyric_segment in synced_lyrics:

            print(f"Sync word-level lyrics - {lyric_segment.text}, audio range: {lyric_segment.start} - {lyric_segment.end}")
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
                    prompt=f"Use this actual lyric AS-IS: \"{lyric_segment.text}\"")
                
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

            while len(lyric_tokens_segmented) > 0 or len(timestamp_tokens_segmented) > 0:
                # Find orphans
                first_orphan_lyrics_idx = find_subsequent_indices(lyric_tokens_segmented, lambda seg: isinstance(seg, str)) if  len(lyric_tokens_segmented) > 0 and isinstance(lyric_tokens_segmented[0], str) else None
                first_orphan_timstamp_idx = find_subsequent_indices(timestamp_tokens_segmented, lambda seg: isinstance(seg, SyncedText)) if len(timestamp_tokens_segmented) > 0 and isinstance(timestamp_tokens_segmented[0], SyncedText) else None
                
                if first_orphan_lyrics_idx is not None:
                    first_orphan_lyrics_sequence = lyric_tokens_segmented[first_orphan_lyrics_idx[0]:first_orphan_lyrics_idx[1]+1]
                else:
                    first_orphan_lyrics_sequence = None

                
                if first_orphan_timstamp_idx is not None:
                    first_orphan_timestamp_sequence = timestamp_tokens_segmented[first_orphan_timstamp_idx[0]:first_orphan_timstamp_idx[1]+1]
                else:
                    first_orphan_timestamp_sequence = None

                print(first_orphan_lyrics_sequence, first_orphan_timestamp_sequence)

                #Handle orphans
                if first_orphan_lyrics_sequence is None and first_orphan_timestamp_sequence is None:
                    # First element is match.
                    for lyric, ts in zip(lyric_tokens_segmented[0], timestamp_tokens_segmented[0]):
                        new_lyric_tokens.append(lyric)
                        new_words.append(SyncedTimestamps(start=ts.start, end=ts.end))
                    del lyric_tokens_segmented[0]
                    del timestamp_tokens_segmented[0]

                    #Handle orphans behind.
                    print(lyric_tokens_segmented)
                    print(timestamp_tokens_segmented)

                elif first_orphan_lyrics_sequence is not None and first_orphan_timestamp_sequence is None:
                    print("Only lyrics has orphans. Try to assign them timestamps.", first_orphan_lyrics_sequence)
                    new_lyric_tokens.append(join_lyric_tokens(first_orphan_lyrics_sequence))
                    new_words.append(SyncedTimestamps(
                        start=new_words[len(new_words)-1].end if len(new_words) > 0 else lyric_line.start,
                        end=timestamp_tokens_segmented[0][0].start if len(timestamp_tokens_segmented) > 0 else lyric_line.end
                    ))
                    
                    #if len(new_lyric_tokens) > 0:
                    #    new_lyric_tokens[-1] = join_lyric_tokens([new_lyric_tokens[-1]] + first_orphan_lyrics_sequence)
                    #else:
                    #    lyric_tokens_segmented[first_orphan_lyrics_idx[1]+1][0] = join_lyric_tokens(first_orphan_lyrics_sequence + [lyric_tokens_segmented[first_orphan_lyrics_idx[1]+1][0]])
                    

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

            print(new_lyric_tokens, new_words, "original_lyrics: ", lyric_tokens_cleaned, "original_subtitle_tokens", timestamp_tokens_cleaned)

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
    
    @validate_call
    def convert_lyrics_to_orms(self, song_id: str, lyrics: LyricsPackage, song_duration_millis: int, 
                               word_synced_lyrics: list[SyncedLyricsSegmentWithWordLevelTimestamp],
                               insert_instrumental_verses: bool = True,
                               instrumental_verse_threshold_millis: int = 5000,
                               instrumental_verse_name: list[str] = ["Intro", "Instrumental", "Outro"]
                               ) -> tuple[list[Verse], list[Line]]:

        verse_orms: list[Verse] = [Verse(title=lyric_verse.title, song_id=song_id, verse_ordering=i) for i, lyric_verse in enumerate(lyrics.verses)]
    
        verses_by_lyric_verse_id: dict[str, Verse] = {lyric_verse.id:verse_orm for lyric_verse, verse_orm in zip(lyrics.verses, verse_orms)}
        
        line_orms: list[Line] = []

        line_counter: int = 0
        verse_orm: Verse | None = None
        for synced_lyric_line in word_synced_lyrics:
                            
            this_verse_orm = verses_by_lyric_verse_id[lyrics.lines[synced_lyric_line.original_lyric_ids[0]].verse_id]
            if verse_orm != this_verse_orm:
                line_counter = 0
                verse_orm = this_verse_orm
            
            line_orm = Line(line_number=line_counter, lyric=synced_lyric_line.text, tokens=synced_lyric_line.tokens, 
                            timestamps=[TimestampRangeMixin(start_millis=floor(word.start * 1000), end_millis=ceil(word.end * 1000)).model_dump() for word in synced_lyric_line.words],
                            start_millis=floor(synced_lyric_line.start * 1000),
                            end_millis=ceil(synced_lyric_line.end * 1000),
                            verse_id=this_verse_orm.id, song_id=song_id)
            line_orms.append(line_orm)
            line_counter += 1
               
        for verse in verse_orms:
            lines = [l for l in line_orms if l.verse_id == verse.id]
            if len(lines) > 0:
                verse.start_millis = lines[0].start_millis
                verse.end_millis = lines[-1].end_millis


        for i, verse in enumerate(verse_orms):
            if verse.start_millis is None:
                if i > 0:
                    verse.start_millis = verse_orms[i-1].end_millis
                else:
                    verse.start_millis = 0
            
            if verse.end_millis is None:
                if i < len(verse_orms)-1:
                    verse.end_millis = verse_orms[i+1].start_millis
                else:
                    verse.end_millis = song_duration_millis

        if insert_instrumental_verses:
            pointer = 0

            #Intro
            if verse_orms[pointer].start_millis > instrumental_verse_threshold_millis:
                verse_orms.insert(0, Verse(start_millis=0, end_millis=verse_orms[pointer].start_millis, title=instrumental_verse_name[0], song_id=song_id))
                pointer += 1

            while pointer < len(verse_orms) - 1:
                if verse_orms[pointer+1].start_millis - verse_orms[pointer].end_millis > instrumental_verse_threshold_millis:
                    verse_orms.insert(pointer+1, Verse(start_millis=verse_orms[pointer].end_millis, end_millis=verse_orms[pointer+1].start_millis, title=instrumental_verse_name[1], song_id=song_id))
                    pointer += 1

                pointer += 1

            if song_duration_millis - verse_orms[-1].end_millis > instrumental_verse_threshold_millis:
                verse_orms.append(Verse(start_millis=verse_orms[-1].end_millis, end_millis=song_duration_millis, title=instrumental_verse_name[2], song_id=song_id))

            for i, verse in enumerate(verse_orms):
                verse.verse_ordering = i

        return verse_orms, line_orms