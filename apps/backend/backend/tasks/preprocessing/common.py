
from abc import ABC
from typing import Generic
from typing_extensions import Self
from pydantic import BaseModel, ConfigDict, Field, model_validator
from langchain_core.runnables import RunnableConfig

from backend.database.models import LineInfo, ProjectConfiguration, SongInfo, TranslationChallengeType
from backend.tasks.chain_mapper import ChainMapper, OutputType


class InputLyricLine(BaseModel):
    id: str
    lyric: str

class BasePipelineInput(BaseModel):
    song_title: str
    song_description: str
    user_settings: ProjectConfiguration

class BaseInspectionElement(BaseModel):
    model_config=ConfigDict(use_enum_values=True)
    
    challenges: list[TranslationChallengeType] = Field(description="Challenge labels for the line of lyrics. Refer to 'List of Challenge Labels' above.")
    description: str = Field(description="Description on you rationale of why you chose this line of lyrics and put that challenge labels.")    


class InspectionElement(BaseInspectionElement):
    line_id: str = Field(description="Specific id of the line.")
    
class InspectionResult(BaseModel):
    inspections: list[InspectionElement] = Field(description="List of inspections. Provide an empty array if there are no challenges.")

class GlossLine(BaseModel):
    line_id: str
    gloss: str
    description: str

class GlossGenerationResult(BaseModel):
    translations: list[GlossLine]


class InspectionPipelineInputArgs(BaseModel):
    lyric_lines: list[LineInfo]
    song_info: SongInfo
    configuration: ProjectConfiguration

class BaseGlossGenerationPipelineInputArgs(InspectionPipelineInputArgs):
    inspection_result: InspectionResult

class InputLyricLineWithGloss(InputLyricLine):
    gloss: str
    gloss_description: str

class PerformanceGuideElement(BaseModel):
    line_id: str
    mood: str
    facial_expression: str
    body_gesture: str
    emotion_description: str

class PerformanceGuideGenerationResult(BaseModel):
    guides: list[PerformanceGuideElement]

class TranslatedLyricsPipelineInputArgs(BaseModel):
    song_info: SongInfo
    configuration: ProjectConfiguration
    lyric_lines: list[LineInfo]
    gloss_generations: GlossGenerationResult

    @model_validator(mode='after')
    def check_lyric_gloss_match(self) -> Self:
        assert len(self.lyric_lines) == len(self.gloss_generations.translations)
        assert all(l.id == g.line_id for l, g in zip(self.lyric_lines, self.gloss_generations.translations))


class TranslatedLyricsPromptInputArgs(BasePipelineInput):
    lyrics: list[InputLyricLineWithGloss]


class GlossOptionElement(BaseModel):
    line_id: str
    gloss_short_ver: str
    gloss_description_short_ver: str
    gloss_long_ver: str
    gloss_description_long_ver: str

class GlossOptionGenerationResult(BaseModel):
    options: list[GlossOptionElement]

class TranslatedLyricsPipelineBase(Generic[OutputType], ChainMapper[TranslatedLyricsPipelineInputArgs, OutputType], ABC):

    

    @classmethod
    def _input_to_str(cls, input: TranslatedLyricsPipelineInputArgs, config: RunnableConfig) -> str:
        return TranslatedLyricsPromptInputArgs(
                song_title=input.song_info.title,
                song_description=input.song_info.description,
                lyrics=[InputLyricLineWithGloss(lyric=line.lyric, gloss=gloss.gloss, gloss_description=gloss.description, id=str(line_index)) 
                        for line_index, (line, gloss) in enumerate(zip(input.lyric_lines, input.gloss_generations.translations))],
                user_settings=input.configuration
            ).model_dump_json(indent=2)

    