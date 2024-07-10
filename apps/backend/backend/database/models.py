from datetime import datetime
from enum import StrEnum
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import DateTime, func
from sqlmodel import Relationship, SQLModel, Field
from nanoid import generate

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


class SharableUserInfo(IdTimestampMixin):
    
    callable_name: Optional[str] = Field(nullable=True)
    sign_language: SignLanguageType = Field(default=SignLanguageType.ASL, nullable=False)


class User(SQLModel, SharableUserInfo, table=True):
    alias: str = Field(nullable=False, min_length=1)
    passcode: str = Field(unique=True, allow_mutation=False, default_factory=lambda: generate('0123456789', size=6))
    projects: list['Project'] = Relationship(back_populates="user", sa_relationship_kwargs={'lazy': 'selectin'})


class UserIdMixin(BaseModel):
    user_id: str = Field(foreign_key=f"{User.__tablename__}.id")


class Project(SQLModel, IdTimestampMixin, UserIdMixin, table=True):
    song_title: str
    song_artist: str
    song_description: str | None = Field(nullable=True)
    user: User | None = Relationship(back_populates="projects")

