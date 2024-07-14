from datetime import datetime
from enum import StrEnum
from os import path
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import DateTime, func
from sqlmodel import Relationship, SQLModel, Field, UniqueConstraint
from nanoid import generate

from backend.config import ElmiConfig

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
    matched_timestamp_start: Optional[int] = Field(ge=0, default=None)
    matched_timestamp_end: Optional[int] = Field(ge=0, default=None)

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

class Line(SQLModel, LineInfo, table=True):
    __table_args__ = (UniqueConstraint("verse_id", "line_number", name="line_number_uniq_by_verse_idx"), )

    verse: Verse = Relationship(back_populates='lines')


class SharableUserInfo(IdTimestampMixin):
    
    callable_name: Optional[str] = Field(nullable=True)
    sign_language: SignLanguageType = Field(default=SignLanguageType.ASL, nullable=False)


class User(SQLModel, SharableUserInfo, table=True):
    alias: str = Field(nullable=False, min_length=1)
    passcode: str = Field(unique=True, allow_mutation=False, default_factory=lambda: generate('0123456789', size=6))
    projects: list['Project'] = Relationship(back_populates="user", sa_relationship_kwargs={'lazy': 'selectin'})


class UserIdMixin(BaseModel):
    user_id: str = Field(foreign_key=f"{User.__tablename__}.id")


class Project(SQLModel, IdTimestampMixin, UserIdMixin, SongIdMixin, table=True):

    last_accessed_at: Optional[datetime] = Field(
        default=None,
        nullable=True,
        sa_type=DateTime(timezone=True)
    )

    user: User | None = Relationship(back_populates="projects", sa_relationship_kwargs={'lazy': 'selectin'})
    song: Song = Relationship(back_populates='projects', sa_relationship_kwargs={'lazy': 'selectin'}) 

class ProjectIdMixin(BaseModel):
    project_id: str = Field(foreign_key=f"{Project.__tablename__}.id")
