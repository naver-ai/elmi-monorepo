
from langchain.pydantic_v1 import BaseModel, Field

from backend.database.models import AgeGroup, BodyLanguage, ClassifierLevel, EmotionalLevel, LanguageProficiency, MainAudience, SignLanguageType, SigningSpeed


class InputLyricLine(BaseModel):
    id: str
    lyric: str

class ProjectConfigurationV1(BaseModel):
      main_audience: MainAudience = Field(default=MainAudience.Deaf)
      age_group: AgeGroup = Field(default=AgeGroup.Adult)
      main_language: SignLanguageType = SignLanguageType.ASL
      language_proficiency: LanguageProficiency = LanguageProficiency.Moderate
      signing_speed: SigningSpeed = SigningSpeed.Moderate
      emotional_level: EmotionalLevel = EmotionalLevel.Moderate
      body_language: BodyLanguage = BodyLanguage.Moderate
      classifier_level: ClassifierLevel = ClassifierLevel.Moderate

class BasePipelineInput(BaseModel):
    song_title: str
    song_description: str
    user_settings: ProjectConfigurationV1

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