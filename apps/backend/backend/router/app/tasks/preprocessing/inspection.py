from time import perf_counter
from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from pydantic import validate_call

from backend.database.models import LineInfo, ProjectConfiguration, SongInfo
from backend.router.app.tasks.preprocessing.common import BasePipelineInput, InputLyricLine, InspectionResult, ProjectConfigurationV1
from backend.utils.env_helper import EnvironmentVariables, get_env_variable


class InspectionInputArgs(BasePipelineInput):
    song_title: str
    song_description: str
    lyrics:list[InputLyricLine]
    user_settings: ProjectConfigurationV1


class InspectionPipeline():

    def __init__(self) -> None:

        system_template = '''You are a helpful assistant that helps user to translate ENG lyrics into sign language.
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

  '''
        # Define the prompt template
        chat_prompt = ChatPromptTemplate.from_messages([
            ("system", system_template),
            ("human", "{input}")
        ])

        # Retrieve API key from environment variable
        api_key = get_env_variable(EnvironmentVariables.OPENAI_API_KEY)


        # Initialize the OpenAI client
        client = ChatOpenAI(api_key=api_key, 
                            model_name="gpt-4o", 
                            temperature=1, 
                            max_tokens=2048,
                            model_kwargs=dict(
                                frequency_penalty=0, 
                                presence_penalty=0
                            )
        )

        # Initialize the chain
        self.chain = chat_prompt | client | PydanticOutputParser(pydantic_object=InspectionResult)

    @validate_call
    async def inspect(self, lyric_lines: list[LineInfo], song_info: SongInfo, configuration: ProjectConfiguration) -> InspectionResult:

        ts = perf_counter()

        input = InspectionInputArgs(
                song_title=song_info.title,
                song_description=song_info.description,
                lyrics=[InputLyricLine(lyric=line.lyric, id=line_index) for line_index, line in enumerate(lyric_lines[:12])],
                user_settings=ProjectConfigurationV1(**configuration.model_dump())
            )
         
        result: InspectionResult = await self.chain.ainvoke({
            "input": input.json()
        })

        for inspection in result.inspections:
            inspection.line_id = lyric_lines[int(inspection.line_id)].id # Replace number index into unique id.

        te = perf_counter()

        print(f"Inspection took {te-ts} sec.")

        return result
       