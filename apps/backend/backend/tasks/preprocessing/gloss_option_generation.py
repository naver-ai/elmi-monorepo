from langchain_core.runnables import RunnableConfig

from backend.tasks.preprocessing.common import GlossOptionGenerationResult, TranslatedLyricsPipelineBase


class GlossOptionGenerationPipeline(TranslatedLyricsPipelineBase[GlossOptionGenerationResult]):
    def __init__(self) -> None:
        super().__init__("GlossOptionGeneration", GlossOptionGenerationResult, '''You are a helpful assistant that helps user to translate ENG lyrics into sign language.
Your goal is to figure out how to sign the line in multiple ways considering the user preference.
Given the lyrics and translation, provide 2 more options how to sign it differently from the given gloss (shorter gloss, longer gloss).

[Input format]
  {{
    "song_title": string // Title of the song
    "song_description" // Description about the song
    "lyrics": Array<{{
        "id": string // ID of the individual line
        "lyric": string // Lyric text
        "gloss": string // Gloss labels for the line. This will be a reference to option generation.
        "gloss_description": string // description on the glosses.
    }}>
    "user_settings": object // The user preferences. Refer to it when suggesting gloss options.
  }}


[Output format]
  - You will provide output, for ALL of the lines:
  - DO NOT PRINT OTHER things and just return a JSON object formatted as follows:
  {{
    options: Array<{{
        "line_id": string // ID of the lyric line,
        "gloss_short_ver": string // An alternative of the gloss translation for the line of lyrics, shorter than the reference glosses.
        "gloss_description_short_ver": string // The description on the short version of gloss. Do NOT mention it is shorter or longer version. Explain the gloss as if it is stand-alone.
        "gloss_long_ver": string // An alternative of the gloss translation for the line of lyrics, longer than the reference glosses.
        "gloss_description_long_ver": string // The description on the long version of gloss. Do NOT mention it is shorter or longer version. Explain the gloss as if it is stand-alone.
    }}>''')


    @classmethod
    def _postprocess_output(cls, output: GlossOptionGenerationResult, config: RunnableConfig) -> GlossOptionGenerationResult:
        original_lyrics = config["metadata"]["lyric_lines"]
        for option in output.options:
            option.line_id = original_lyrics[int(option.line_id)].id # Replace number index into unique id.
        

        assert len(original_lyrics) == len(output.options)
        assert all(l.id == g.line_id for l, g in zip(original_lyrics, output.options))

        return output

