from typing import Self
from nanoid import generate
from pydantic import BaseModel, Field
import re


class LyricVerse(BaseModel):
    id: str = Field(default_factory=lambda: generate(size=5))
    title: str | None


class LyricLine(BaseModel):
    id: str = Field(default_factory=lambda: generate(size=5))
    text: str
    text_original: str
    verse_id: str


class LyricsPackage(BaseModel):
    verses: list[LyricVerse] = []
    lines: list[LyricLine] = []

    @staticmethod
    def from_list_str(raw_lines: list[str])->Self:
        verses: list[LyricVerse] = []
        lines: list[LyricLine] = []
        line_counter: int = 0
        for line in raw_lines:
            if line.strip() == "":
                pass
            elif re.match(r'^\[.*\]$', line):
                verse_title = line[1:-1]
                verse = LyricVerse(title=verse_title)
                verses.append(verse)
                line_counter = 0
            else:
                if len(verses) == 0:
                    default_verse = LyricVerse(title=None)
                    verses.append(default_verse)

                cleaned_lyric_line = clean_lyric_line(line)
                if len(cleaned_lyric_line.strip()) > 0:
                    line_info = LyricLine(text=cleaned_lyric_line, text_original=line, verse_id=verses[len(verses)-1].id)
                    line_counter += 1
                    lines.append(line_info)

        return LyricsPackage(lines=lines, verses=verses)


@staticmethod
def clean_lyric_line(line: str) -> str:
    cleaned_line = line.strip()
    cleaned_line = re.sub(r"^[^a-zA-Z0-9]+$", "", cleaned_line)
    cleaned_line = re.sub(r'\(.*?\)', "", cleaned_line)
    cleaned_line = re.sub(r'\s+([,?.!;:])', r'\1', cleaned_line)
    cleaned_line = re.sub(f'\s+', ' ', cleaned_line).strip()
    return cleaned_line
