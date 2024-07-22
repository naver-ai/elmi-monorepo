from langchain_core.runnables import RunnableConfig

from backend.database.models import LineInfo
from backend.router.app.tasks.chain_mapper import ChainMapper
from backend.router.app.tasks.preprocessing.common import BaseGlossGenerationPipelineInputArgs, BaseInspectionElement, BasePipelineInput, GlossGenerationResult, InputLyricLine

class InputLyricLineWithInspection(InputLyricLine):
    note: BaseInspectionElement | None = None

class GlossGenerationPromptInputArgs(BasePipelineInput):
    lyrics: list[InputLyricLineWithInspection]

class BaseGlossGenerationPipeline(ChainMapper[BaseGlossGenerationPipelineInputArgs, GlossGenerationResult]):

    def __init__(self) -> None:
        super().__init__(
            "BaseGlossGeneration", GlossGenerationResult, '''
  You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Given the lyrics, provide the gloss of each lines.

  You will refer to the Genius Annotation below:
  
  You will also consider the user preference (below is the category):

  [User preference]
   1. Main Audience
    - Hearing: Emphasize clarity and explicitness in gloss to facilitate understanding for those who might rely on written descriptions.
    - Deaf: Focus on naturalness and fluency in ASL, considering the nuances and fluidity of native sign language usage.
   2. Age Group
    - Children: Use simpler language and concepts, provide more repetition and visual aids.
    - Adults: Use more complex language and concepts, tailored to the adult's comprehension level.
   3. Main Language
    - ASL (American Sign Language): Generate gloss that follows ASL grammar and structure, focusing on signs.
    - PSE (Pidgin Signed English): Create a blend of ASL signs in English word order, suitable for users who are transitioning between English and ASL.
   4. Language Level
    - Professional: Use advanced terminology and detailed descriptions, assuming high proficiency in the language.
    - Moderate: Include common terms and moderately complex structures, providing some explanations for less common signs.
    - Novice: Use basic vocabulary and simple sentence structures, providing detailed explanations and context for each sign.
   5. Speed of Signing
    - Slow: Generate gloss with clear, spaced-out instructions, suitable for learners who need more time to process each sign.
    - Moderate: Create gloss that balances clarity with fluidity, appropriate for users with some experience.
    - Fast: Focus on natural speed and flow, suitable for advanced users who can keep up with rapid signing.
   6. Emotional Level
    - Simple: Keep emotional expressions straightforward, using basic facial expressions and body language.
    - Moderate: Include a range of emotional expressions with more nuanced NMS.
    - Complex: Integrate intricate emotional expressions and detailed body language to convey complex emotions.
   7. Use of Body Language (NMS) *NMS should be described in parenthesis "()" 
    - NotUsed: Do not use NMS, only provide the signs.
    - Moderate: Use a balanced amount of NMS to enhance meaning without overwhelming the user.
    - Rich: Incorporate extensive NMS to convey richer meaning and context.
   8. Use of Classifiers *Classifiers should be described in "(CL: )"
    - NotUsed: Do not incorporate classifiers, focusing on standard signs.
    - Moderate: Use classifiers where necessary to enhance understanding.
    - Rich: Integrate classifiers frequently to convey detailed and complex concepts efficiently.

  

[Input format]
  - The user will provide a JSON object formatted as follows:
  {{
    "song_title": string // Title of the song
    "song_description" // Description about the song
    "lyrics": Array<{{
        "id": string // ID of the individual line
        "lyric": string // Lyric text
        "note": // Some lines may include the pre-notes on potential challenges and consideration, formatted as:
            {{
                "challenges": Array<string> // Challenge labels for the line of lyrics. Refer to 'List of Challenge Labels' above.
                "description": string // description on you rationale of why you chose this line of lyrics and put that challenge labels. 
            }} | null
    }}>
    "user_settings": object // The user preferences.
  }}

[Output format]
  - You will provide output, for ALL of the lines:
  - DO NOT PRINT OTHER things and just return a JSON object formatted as follows:
  {{
    "translations": Array<{{
        "line_id": string // id of the line,
        "gloss": string // gloss labels for the line of lyrics. Refer to user preference above.
        "description": string // description on you rationale of why you created this line of gloss. Show that you considered the user settings.
    }}> // The translations must be provided for all lyric lines.
  }}''')

    @classmethod
    def _postprocess_output(cls, output: GlossGenerationResult, config: RunnableConfig) -> GlossGenerationResult:
        lyric_lines : list[LineInfo] = config["metadata"]["lyric_lines"]

        for translation in output.translations:
            translation.line_id = lyric_lines[int(translation.line_id)].id # Replace number index into unique id.

        assert len(lyric_lines) == len(output.translations)
        assert all(l.id == g.line_id for l, g in zip(lyric_lines, output.translations))

        return output

    @classmethod
    def _input_to_str(cls, input: BaseGlossGenerationPipelineInputArgs, config: RunnableConfig) -> str:
        lyrics = [InputLyricLineWithInspection(lyric=line.lyric, id=str(line_index)) 
                  for line_index, line in enumerate(input.lyric_lines)]
        for inspection in input.inspection_result.inspections:
            ls = [l for l in lyrics if l.id == inspection.line_id]
            if len(ls) > 0:
                ls[0].note = BaseInspectionElement(**inspection)

        prompt_input = GlossGenerationPromptInputArgs(
                song_title=input.song_info.title,
                song_description=input.song_info.description,
                lyrics=lyrics,
                user_settings=input.configuration
            )
        
        return prompt_input.model_dump_json(exclude_none=True, indent=2)

