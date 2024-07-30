from time import perf_counter
from nanoid import generate
from sqlmodel import select, delete
from sqlmodel.ext.asyncio.session import AsyncSession
from langchain_core.runnables import RunnableParallel
import asyncio

from backend.database.models import GlossDescription, Line, LineAnnotation, LineInspection, Project, ProjectConfiguration
from .base_gloss_generation import BaseGlossGenerationPipeline
from .common import BaseGlossGenerationPipelineInputArgs, GlossOptionGenerationResult, InspectionPipelineInputArgs, PerformanceGuideGenerationResult, TranslatedLyricsPipelineInputArgs
from .gloss_option_generation import GlossOptionGenerationPipeline
from .inspection import InspectionPipeline
from .performance_guide_generation import PerformanceGuideGenerationPipeline

inspector = InspectionPipeline()
gloss_generator = BaseGlossGenerationPipeline()
performance_guide_generator = PerformanceGuideGenerationPipeline()
gloss_options_generator = GlossOptionGenerationPipeline()

async def preprocess_song(project_id: str, db: AsyncSession, force: bool = True):
    async with db.begin_nested():
        project = await db.get(Project, project_id)
        if project is not None:

            if project.last_processing_id is None or force is True:
                # Clear previuse annotations and inspections
                await db.exec(delete(LineAnnotation).where(LineAnnotation.project_id == project_id))
                await db.exec(delete(LineInspection).where(LineInspection.project_id == project_id))
                await db.refresh(project)

                processing_id = generate(size=8)

                user_settings = ProjectConfiguration(**project.user_settings)

                #lines = [line for verse in project.song.verses for line in verse.lines]

                line_batches: list[list[Line]] = []
                
                if len(project.song.verses) > 1:
                    curr_batch = []
                    for verse_i, verse in enumerate(project.song.verses):
                        if len(curr_batch) > 0 and len(curr_batch) + len(verse.lines) > 15:
                            line_batches.append(curr_batch)
                            curr_batch = []
                        
                        curr_batch += verse.lines
                        
                        if len(curr_batch) >= 10:
                            line_batches.append(curr_batch)
                            curr_batch = []
                    if len(curr_batch) > 0:
                        line_batches.append(curr_batch)
                else:
                    line_batches = list(batched([line for verse in project.song.verses for line in verse.lines], n=10))

                async def batch_analysis(lines: list[Line], batch_id: int):

                    print(f"[Batch {batch_id}] Inspecting lyrics to note potential challenges...")

                    inspection_input = InspectionPipelineInputArgs(lyric_lines=lines, song_info=project.song, configuration=user_settings)
                    inspection_result = await inspector.run(InspectionPipelineInputArgs(lyric_lines=lines, song_info=project.song, configuration=user_settings))

                    print(f"[Batch {batch_id}] Inspection complete.")

                    for inspection in inspection_result.inspections:
                        db.add(
                            LineInspection(project_id=project.id, processing_id=processing_id, **inspection.__dict__)
                        )

                    print(f"[Batch {batch_id}] Generating base gloss...")
                    
                    base_gloss_generation_result = await gloss_generator.run(BaseGlossGenerationPipelineInputArgs(**inspection_input.__dict__, inspection_result=inspection_result))

                    print(f"[Batch {batch_id}] Generated base gloss.")

                    translated_lyrics_input = TranslatedLyricsPipelineInputArgs(
                        song_info=project.song,
                        configuration=user_settings,
                        lyric_lines=lines,
                        gloss_generations=base_gloss_generation_result
                    )

                    print(f"[Batch {batch_id}] Generating performance guides and alternative glosses...")

                    combined_result = await RunnableParallel(performance_guides = performance_guide_generator.chain, 
                                                                            gloss_options = gloss_options_generator.chain).ainvoke(translated_lyrics_input)

                    performance_guide_result: PerformanceGuideGenerationResult = combined_result["performance_guides"]
                    gloss_option_generation_result: GlossOptionGenerationResult = combined_result["gloss_options"]

                    for base_gloss, performance_guide, gloss_options in zip(base_gloss_generation_result.translations, performance_guide_result.guides, gloss_option_generation_result.options):
                        assert base_gloss.line_id == performance_guide.line_id == gloss_options.line_id

                        db.add(
                            LineAnnotation( project_id=project.id, 
                                            processing_id=processing_id,
                                            line_id=base_gloss.line_id, 
                                            gloss=base_gloss.gloss,
                                            gloss_description=base_gloss.description,
                                            gloss_alts=[
                                                GlossDescription(gloss=gloss_options.gloss_short_ver, description=gloss_options.gloss_description_short_ver).model_dump(),
                                                GlossDescription(gloss=gloss_options.gloss_long_ver, description=gloss_options.gloss_description_long_ver).model_dump()
                                            ],
                                            **performance_guide.model_dump(exclude={"line_id"})
                                        )
                        )
                    print(f"[Batch {batch_id}] Preprocessing complete.")
                
                ts = perf_counter()
                await asyncio.gather(*[batch_analysis(batch, i) for i, batch in enumerate(line_batches)])
                te = perf_counter()

                print(f"Preprocessing complete - {te-ts} sec.")
                project.last_processing_id = processing_id
                db.add(project)
                await db.commit()