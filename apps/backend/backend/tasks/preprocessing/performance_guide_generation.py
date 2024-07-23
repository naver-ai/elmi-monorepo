from langchain_core.runnables import RunnableConfig

from backend.tasks.preprocessing.common import PerformanceGuideGenerationResult, TranslatedLyricsPipelineBase, TranslatedLyricsPipelineInputArgs


class PerformanceGuideGenerationPipeline(TranslatedLyricsPipelineBase[PerformanceGuideGenerationResult]):
    def __init__(self) -> None:
        super().__init__("PerformanceGuideGeneration", PerformanceGuideGenerationResult, 
                         """You are a helpful assistant that helps user to translate ENG lyrics into sign language.
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
            "mood": Array<string> // List of keywords for main mood or emotion of the line. Try to use adjectives: e.g., Energetic, Calm, Confident
            "facial_expression": string // how to express the mood of the lines using facial expressions 
            "body_gesture": string // how to express the mood of the lines using bodily gestures
            "emotion_description": string // description on you rationale of why you chose these expressions. This will be given to the users to support the results. 
        }}> // Provide guides for ALL lines.
    }}""")

    @classmethod
    def _postprocess_output(cls, output: PerformanceGuideGenerationResult, config: RunnableConfig) -> PerformanceGuideGenerationResult:
        original_lyrics = config["metadata"]["lyric_lines"]
        for guide in output.guides:
            guide.line_id = original_lyrics[int(guide.line_id)].id # Replace number index into unique id.
        

        assert len(original_lyrics) == len(output.guides)
        assert all(l.id == g.line_id for l, g in zip(original_lyrics, output.guides))

        return output
