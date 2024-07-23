from langchain_core.runnables import RunnableConfig

from backend.tasks.chain_mapper import ChainMapper
from backend.tasks.preprocessing.common import BasePipelineInput, InspectionPipelineInputArgs, InputLyricLine, InspectionResult


class InspectionPromptInputArgs(BasePipelineInput):
    lyrics:list[InputLyricLine]


class InspectionPipeline(ChainMapper[InspectionPipelineInputArgs, InspectionResult]):

    def __init__(self) -> None:

        super().__init__("Inspection", InspectionResult, '''You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Your goal is to figure out noteworthy part where the user might need to think how to interpret the lines.
  Given the lyrics, mark lines that seems to be challenging to translate.
  
  [List of Challenge Labels]
  - 'poetic': The phrase is too poetic that the text cannot be directly translated into sign language.
  - 'cultural': The phrase contains some keywords that only a specific group of people may understand the meaning.
  - 'broken': The phrase is in broken English without concrete meanings. For example, the phrase is repeating meaningless words. 
  - 'mismatch': The phrase doesn't exist in ASL, so the user need to finger spell.

  You will get input:

  [Input format]
  The user will provide the following JSON as an input:
  {{
    "song_title": string // Title of the song
    "song_description" // Description about the song
    "lyrics": Array<{{
        "id": string // ID of the individual line
        "lyric": string // Lyric text
    }}>
    "user_settings": object // An object containing the configuration of the song signing translation provided by the user.
  }}

  [Output format]
  Return a JSON object formatted as the following:
  {{
    "inspections": Array<{{
        "line_id": string // specific id of the line.
        "challenges": Array<string> // Challenge labels for the line of lyrics. Refer to 'List of Challenge Labels' above.
        "description": string // description on you rationale of why you chose this line of lyrics and put that challenge labels. 
    }}>
  }}  

  ''')

    @classmethod
    def _input_to_str(cls, input: InspectionPipelineInputArgs, config: RunnableConfig) -> str:
        return InspectionPromptInputArgs(
                song_title=input.song_info.title,
                song_description=input.song_info.description,
                lyrics=[InputLyricLine(lyric=line.lyric, id=str(line_index)) for line_index, line in enumerate(input.lyric_lines)],
                user_settings=input.configuration
            ).model_dump_json(indent=2)

    @classmethod
    def _postprocess_output(cls, output: InspectionResult, config: RunnableConfig) -> InspectionResult:
        original_lyrics = config["metadata"]["lyric_lines"]
        for inspection in output.inspections:
            inspection.line_id = original_lyrics[int(inspection.line_id)].id # Replace number index into unique id.
        
        return output

       