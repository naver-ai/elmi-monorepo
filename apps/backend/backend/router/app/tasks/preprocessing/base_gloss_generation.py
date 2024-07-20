from time import perf_counter
from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser

from backend.database.models import LineInfo, ProjectConfiguration, SongInfo
from backend.router.app.tasks.preprocessing.common import BaseInspectionElement, BasePipelineInput, GlossGenerationResult, InputLyricLine, InspectionResult, ProjectConfigurationV1
from backend.utils.env_helper import EnvironmentVariables, get_env_variable

class InputLyricLineWithInspection(InputLyricLine):
    note: BaseInspectionElement | None = None

class GlossGenerationInputArgs(BasePipelineInput):
    lyrics: list[InputLyricLineWithInspection]

class BaseGlossGenerationPipeline:

    def __init__(self) -> None:
        system_instruction = '''
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
        "gloss": string // gloss labels for the line of lyrics. Refer to preference above.
        "description": string // description on you rationale of why you created this line of gloss. Show that you considered the user settings.
    }}> // The translations must be provided for all lyric lines.
  }}'''
        
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

        # Initialize the chain
        self.chain = chat_prompt | client | PydanticOutputParser(pydantic_object=GlossGenerationResult)

    async def generate_gloss(self, lyric_lines: list[LineInfo], song_info: SongInfo, configuration: ProjectConfiguration, inspection_result: InspectionResult) -> InspectionResult:

        ts = perf_counter()

        lyrics = [InputLyricLineWithInspection(lyric=line.lyric, id=line_index) for line_index, line in enumerate(lyric_lines[:12])]
        for inspection in inspection_result.inspections:
            ls = [l for l in lyrics if l.id == inspection.line_id]
            if len(ls) > 0:
                ls[0].note = BaseInspectionElement(**inspection)

        input = GlossGenerationInputArgs(
                song_title=song_info.title,
                song_description=song_info.description,
                lyrics=lyrics,
                user_settings=ProjectConfigurationV1(**configuration.model_dump())
            )
        
        result : GlossGenerationResult = await self.chain.ainvoke({"input": input.json(exclude_none=True)})


        for translation in result.translations:
            translation.line_id = lyric_lines[int(translation.line_id)].id # Replace number index into unique id.

        te = perf_counter()

        print(f"Base gloss generation took {te-ts} sec.")

        return result
