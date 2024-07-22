from time import perf_counter
from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables.retry import RunnableRetry
from langchain.output_parsers import PydanticOutputParser
from pydantic import ValidationError, validate_call

from backend.database.models import LineInfo, ProjectConfiguration, SongInfo
from backend.router.app.tasks.preprocessing.common import BasePipelineInput, GlossGenerationResult, InputLyricLineWithGloss, PerformanceGuideGenerationPipelineInputArgs, PerformanceGuideGenerationResult
from backend.utils.env_helper import EnvironmentVariables, get_env_variable

class PerformanceGuideGenerationPromptInputArgs(BasePipelineInput):
    lyrics: list[InputLyricLineWithGloss]

class PerformanceGuideGenerationPipeline:
    def __init__(self) -> None:
        system_instruction = """You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Your goal is to figure out how to express each line considering the mood of the song.
  Given the lyrics, mark lines with emotion and how to interpret with facial expression and body language.

  [Input format]
  {{
    "song_title": string // Title of the song
    "song_description" // Description about the song
    "lyrics": Array<{{
        "id": string // ID of the individual line
        "lyric": string // Lyric text
        "gloss": string // Gloss labels for the line.
        "gloss_description": string // description on the glosses.
    }}>
    "user_settings": object // The user preferences.
  }}


  [Output format]
    - DO NOT PRINT OTHER things and just return a JSON object formatted as follows: 
    {{
        "guides": Array<{{
            "line_id": string // id of the line,
            "mood": string // main mood or emotion of the line
            "facial_expression": string // how to express the mood of the lines using facial expressions 
            "body_gesture": string // how to express the mood of the lines using bodily gestures
            "emotion_description": string // description on you rationale of why you chose these expressions. This will be given to the users to support the results. 
        }}> // Provide guides for ALL lines.
    }}"""
        
                # Define the prompt template
        chat_prompt = ChatPromptTemplate.from_messages([
            ("system", system_instruction),
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

        self.chain: Runnable = self.__input_parser | RunnableRetry(
            bound=chat_prompt | client | PydanticOutputParser(pydantic_object=PerformanceGuideGenerationResult) | self.__output_parser,
            retry_exception_types=(ValidationError, AssertionError),
            max_attempt_number=5
        )


    @staticmethod
    def __input_parser(input: PerformanceGuideGenerationPipelineInputArgs, config: RunnableConfig):
        config["metadata"].update(input.__dict__)
        return {"input": PerformanceGuideGenerationPromptInputArgs(
                song_title=input.song_info.title,
                song_description=input.song_info.description,
                lyrics=[InputLyricLineWithGloss(lyric=line.lyric, gloss=gloss.gloss, gloss_description=gloss.description, id=str(line_index)) 
                        for line_index, (line, gloss) in enumerate(zip(input.lyric_lines, input.gloss_generations.translations))],
                user_settings=input.configuration
            ).model_dump_json(indent=2)}

    @staticmethod
    def __output_parser(output: PerformanceGuideGenerationResult, config: RunnableConfig):
        original_lyrics = config["metadata"]["lyric_lines"]
        for guide in output.guides:
            guide.line_id = original_lyrics[int(guide.line_id)].id # Replace number index into unique id.
        

        assert len(original_lyrics) == len(output.guides)
        assert all(l.id == g.line_id for l, g in zip(original_lyrics, output.guides))

        return output
    
    @validate_call
    async def generate_performance_guides(self, lyric_lines: list[LineInfo], song_info: SongInfo, configuration: ProjectConfiguration, gloss_generation_result: GlossGenerationResult)->PerformanceGuideGenerationResult:
        ts = perf_counter()

        result = await self.chain.ainvoke(PerformanceGuideGenerationPipelineInputArgs(
            song_info=song_info,
            configuration=configuration,
            lyric_lines=lyric_lines,
            gloss_generations=gloss_generation_result
        ))

        te = perf_counter()

        print(f"Performance guide generation took {te-ts} sec.")

        return result