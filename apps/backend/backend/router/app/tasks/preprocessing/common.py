
from pydantic import BaseModel, Field
from langchain_core.runnables import RunnableConfig

from backend.database.models import LineInfo, ProjectConfiguration, SongInfo


class InputLyricLine(BaseModel):
    id: str
    lyric: str

class BasePipelineInput(BaseModel):
    song_title: str
    song_description: str
    user_settings: ProjectConfiguration

class BaseInspectionElement(BaseModel):
    challenges: list[str] = Field(description="Challenge labels for the line of lyrics. Refer to 'List of Challenge Labels' above.")
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