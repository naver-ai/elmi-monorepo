
import asyncio
from langchain_core.runnables import RunnableParallel

from sqlmodel import select
from backend.database.models import Line, Project, ProjectConfiguration, User
from backend.router.app.tasks.preprocessing.base_gloss_generation import BaseGlossGenerationPipeline
from backend.router.app.tasks.preprocessing.common import BaseGlossGenerationPipelineInputArgs, InspectionPipelineInputArgs, TranslatedLyricsPipelineInputArgs
from backend.router.app.tasks.preprocessing.gloss_option_generation import GlossOptionGenerationPipeline
from backend.router.app.tasks.preprocessing.inspection import InspectionPipeline
from backend.database.engine import db_sessionmaker
from backend.router.app.tasks.preprocessing.performance_guide_generation import PerformanceGuideGenerationPipeline


async def run():

    async with db_sessionmaker() as session:

        project_query_results = await session.exec(select(Project).join(User, User.id == Project.user_id).where(User.alias == "test"))
        project = project_query_results.first()
        if project is not None:
            lines = [line for verse in project.song.verses[:2] for line in verse.lines]


            line_batches: list[list[Line]] = []
            
            if len(project.song.verses) > 1:
                curr_batch = []
                for verse_i, verse in enumerate(project.song.verses):
                    if len(curr_batch) > 0 and len(curr_batch) + len(verse.lines) > 20:
                        line_batches.append(curr_batch)
                        curr_batch = []
                    
                    curr_batch += [line.lyric for line in verse.lines]
                    
                    if len(curr_batch) >= 15:
                        line_batches.append(curr_batch)
                        curr_batch = []
                if len(curr_batch) > 0:
                    line_batches.append(curr_batch)
            else:
                line_batches = list(batched([line for verse in project.song.verses for line in verse.lines], n=20))

            print(line_batches)


            user_settings = ProjectConfiguration(**project.user_settings)
            
            inspector = InspectionPipeline()
            gloss_generator = BaseGlossGenerationPipeline()
            performance_guide_generator = PerformanceGuideGenerationPipeline()
            gloss_options_generator = GlossOptionGenerationPipeline()

            inspection_input = InspectionPipelineInputArgs(lyric_lines=lines, song_info=project.song, configuration=user_settings)
            inspection_result = await inspector.run(InspectionPipelineInputArgs(lyric_lines=lines, song_info=project.song, configuration=user_settings))

            print(inspection_result)

            base_gloss_generation_result = await gloss_generator.run(BaseGlossGenerationPipelineInputArgs(**inspection_input.__dict__, inspection_result=inspection_result))

            print(base_gloss_generation_result)


            translated_lyrics_input = TranslatedLyricsPipelineInputArgs(
                song_info=project.song,
                configuration=user_settings,
                lyric_lines=lines,
                gloss_generations=base_gloss_generation_result
            )

            combined_result = await RunnableParallel(performance_guides = performance_guide_generator.chain, 
                                                                       gloss_options = gloss_options_generator.chain).ainvoke(translated_lyrics_input)

            performance_guide_result = combined_result["performance_guides"]
            gloss_option_generation_result = combined_result["gloss_options"]

            #performance_guide_result = await performance_guide_generator.run(traslated_lyrics_input)

            print(performance_guide_result)

            #gloss_option_generation_result = await gloss_options_generator.run(traslated_lyrics_input)

            print(gloss_option_generation_result)



        else:
            print("No test user found.")

if __name__ == "__main__":
    asyncio.run(run())
