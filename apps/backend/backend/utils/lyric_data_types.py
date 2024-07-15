
from pydantic import BaseModel, ConfigDict


class SyncedTimestamps(BaseModel):
    model_config=ConfigDict(use_enum_values=True)
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