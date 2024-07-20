from datetime import datetime
from enum import StrEnum, auto
from os import path
from typing import Literal, Optional, Union
from pydantic import BaseModel, ConfigDict
from sqlalchemy import DateTime, func
from sqlmodel import Relationship, SQLModel, Field, UniqueConstraint, Column, JSON
from nanoid import generate

from backend.config import ElmiConfig
from backend.utils.lyric_data_types import SyncedTimestamps

def generate_id() -> str:
    return generate()

class SignLanguageType(StrEnum):
    ASL="ASL"
    PSE="PSE"

class IdTimestampMixin(BaseModel):
    id: str = Field(primary_key=True, default_factory=generate_id)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs=dict(server_default=func.now(), nullable=True)
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs=dict(server_default=func.now(), onupdate=func.now(), nullable=True)
    )

class SongInfo(IdTimestampMixin):
    title: str
    artist: str
    description: str | None = Field(nullable=True)
    cover_image_stored: bool = Field(default=False, nullable=False)

class Song(SQLModel, SongInfo, table=True):
    audio_filename: Optional[str] = Field(nullable=True)
    projects: list['Project'] = Relationship(back_populates="song", sa_relationship_kwargs={'lazy': 'selectin'})
    verses: list['Verse'] = Relationship(back_populates="song", sa_relationship_kwargs={'lazy': 'selectin'})
    trimmed_media: list['TrimmedMedia'] = Relationship(back_populates="song", sa_relationship_kwargs={'lazy': 'selectin'})
    

    def get_audio_file_path(self)->str:
        return path.join(ElmiConfig.get_song_dir(self.id), self.audio_filename)
    
    def audio_file_exists(self)->bool:
        return path.exists(self.get_audio_file_path())
    
    def get_lyrics(self,include_verse_title: bool = True, sep="\n")->str:
        lines = []
        for verse in self.verses:
            if include_verse_title and verse.title is not None:
                lines.append(f"[{verse.title}]")
            for line in verse.lines:
                lines.append(line.lyric)
        return sep.join(lines)

class SongIdMixin(BaseModel):
    song_id: str = Field(foreign_key=f"{Song.__tablename__}.id")

class TimestampRangeMixin(BaseModel):
    start_millis: Optional[int] = Field(ge=0, default=None)
    end_millis: Optional[int] = Field(ge=0, default=None)

class VerseInfo(IdTimestampMixin, SongIdMixin, TimestampRangeMixin):
    title: Optional[str] = Field(nullable=True)
    verse_ordering: int = Field(nullable=False)
    included: bool = Field(default=True)

class Verse(SQLModel, VerseInfo, table=True):
    lines: list['Line'] = Relationship(back_populates='verse', sa_relationship_kwargs={'lazy': 'selectin'})
    song: Song = Relationship(back_populates='verses', sa_relationship_kwargs={'lazy': 'selectin'})

class VerseIdMixin(BaseModel):
    verse_id: str = Field(foreign_key=f"{Verse.__tablename__}.id")

class LineInfo(IdTimestampMixin, VerseIdMixin, SongIdMixin, TimestampRangeMixin):
    line_number: int = Field(nullable=False)
    lyric: str = Field(nullable=False)
    tokens: list[str] = Field(sa_column=Column(JSON), default=[])
    timestamps: list[TimestampRangeMixin] = Field(sa_column=Column(JSON), default=[])

class Line(SQLModel, LineInfo, table=True):
    __table_args__ = (UniqueConstraint("verse_id", "line_number", name="line_number_uniq_by_verse_idx"), )

    verse: Verse = Relationship(back_populates='lines')
    inference1_results: list["Inference1Result"] = Relationship(back_populates="line")


class SharableUserInfo(IdTimestampMixin):
    
    callable_name: Optional[str] = Field(nullable=True)
    sign_language: SignLanguageType = Field(default=SignLanguageType.ASL, nullable=False)


class User(SQLModel, SharableUserInfo, table=True):
    alias: str = Field(nullable=False, min_length=1)
    passcode: str = Field(unique=True, allow_mutation=False, default_factory=lambda: generate('0123456789', size=6))
    projects: list['Project'] = Relationship(back_populates="user", sa_relationship_kwargs={'lazy': 'selectin'})


class UserIdMixin(BaseModel):
    user_id: str = Field(foreign_key=f"{User.__tablename__}.id")

class MainAudience(StrEnum):
    Deaf=auto()
    Hearing=auto()

class AgeGroup(StrEnum):
    Children=auto()
    Adult=auto()

class LanguageProficiency(StrEnum):
    Novice=auto()
    Moderate=auto()
    Expert=auto()

class SigningSpeed(StrEnum):
    Slow=auto()
    Moderate=auto()
    Fast=auto()

class EmotionalLevel(StrEnum):
    Calm=auto()
    Moderate=auto()
    Excited=auto()

class BodyLanguage(StrEnum):
    NotUsed=auto()
    Moderate=auto()
    Rich=auto()

class ClassifierLevel(StrEnum):
    NotUsed=auto()
    Moderate=auto()
    Rich=auto()


class ProjectConfiguration(BaseModel):
      model_config = ConfigDict(use_enum_values=True)

      main_audience: MainAudience = Field(default=MainAudience.Deaf)
      age_group: AgeGroup = Field(default=AgeGroup.Adult)
      main_language: SignLanguageType = SignLanguageType.ASL
      language_proficiency: LanguageProficiency = LanguageProficiency.Moderate
      signing_speed: SigningSpeed = SigningSpeed.Moderate
      emotional_level: EmotionalLevel = EmotionalLevel.Moderate
      body_language: BodyLanguage = BodyLanguage.Moderate
      classifier_level: ClassifierLevel = ClassifierLevel.Moderate

class Project(SQLModel, IdTimestampMixin, UserIdMixin, SongIdMixin, table=True):

    last_accessed_at: Optional[datetime] = Field(
        default=None,
        nullable=True,
        sa_type=DateTime(timezone=True)
    )

    user_settings: ProjectConfiguration = Field(sa_column=Column(JSON), default_factory=lambda: ProjectConfiguration().model_dump())

    user: User | None = Relationship(back_populates="projects", sa_relationship_kwargs={'lazy': 'selectin'})
    song: Song = Relationship(back_populates='projects', sa_relationship_kwargs={'lazy': 'selectin'}) 

class ProjectIdMixin(BaseModel):
    project_id: str = Field(foreign_key=f"{Project.__tablename__}.id")

class MediaType(StrEnum):
    Video="video"
    Audio="audio"

class TrimmedMedia(SQLModel, IdTimestampMixin, SongIdMixin, table=True):
    trimmed_filename: str = Field(nullable=False)
    type: MediaType = Field(nullable=False)
    start_millis: Optional[int] = Field(nullable=True, default=None)
    end_millis: Optional[int] = Field(nullable=True, default=None)

    song: Song = Relationship(back_populates='trimmed_media', sa_relationship_kwargs={'lazy': 'selectin'}) 

    def get_trimmed_file_path(self)->str:
        return path.join(ElmiConfig.get_song_cache_dir(self.id), self.trimmed_filename)
    
    def trimmed_file_exists(self)->bool:
        return path.exists(self.get_trimmed_file_path())


class Inference1Result(SQLModel, table=True):
    id: str = Field(default_factory=generate_id, primary_key=True)
    line_id: str = Field(foreign_key="line.id")
    challenges: list[str] = Field(sa_column=Column(JSON), default=[])
    description: Optional[str] = None

    line: Optional["Line"] = Relationship(back_populates="inference1_results")

class GlossDescription(BaseModel):
    gloss: str
    description: str

class Inference234Result(SQLModel, table=True):
    id: str = Field(default_factory=generate, primary_key=True)
    line_id: str = Field(foreign_key="line.id", nullable=False)
    gloss:  str = Field(nullable=False)
    gloss_description: str = Field(nullable=True)
    mood: str = Field(nullable=True)
    facial_expression: str = Field(nullable=True)
    body_gesture: str = Field(nullable=True)
    emotion_description: str = Field(nullable=True)
    gloss_options_with_description: list[GlossDescription] = Field(sa_column=Column(JSON, nullable=True))