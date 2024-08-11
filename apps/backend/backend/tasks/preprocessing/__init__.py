from time import perf_counter
from backend.database.crud.project import fetch_line_annotation_by_line, fetch_line_translation_by_line
from nanoid import generate
from sqlmodel import select, delete
from sqlmodel.ext.asyncio.session import AsyncSession
from langchain_core.runnables import RunnableParallel
import asyncio
from more_itertools import sliced

from backend.database.models import AltGlossesInfo, CachedAltGlossGenerationResult, GlossDescription, Line, LineAnnotation, LineInspection, Project
from .base_gloss_generation import BaseGlossGenerationPipeline
from .common import BaseGlossGenerationPipelineInputArgs, GlossGenerationResult, GlossLine, GlossOptionGenerationResult, InspectionPipelineInputArgs, PerformanceGuideGenerationResult, TranslatedLyricsPipelineInputArgs
from .gloss_option_generation import GlossOptionGenerationPipeline
from .inspection import InspectionPipeline
from .performance_guide_generation import PerformanceGuideGenerationPipeline

inspector = InspectionPipeline()
gloss_generator = BaseGlossGenerationPipeline()
performance_guide_generator = PerformanceGuideGenerationPipeline()
gloss_options_generator = GlossOptionGenerationPipeline()


async def generate_alt_glosses_with_user_translation(project_id: str, db: AsyncSession, line_id: str, user_translation: str)->AltGlossesInfo | None:

    project = await db.get(Project, project_id)
    user_settings = project.safe_user_settings

    cache = (await db.exec(select(CachedAltGlossGenerationResult).where(
            CachedAltGlossGenerationResult.project_id == project_id,
            CachedAltGlossGenerationResult.line_id == line_id,
            CachedAltGlossGenerationResult.base_gloss == user_translation,
            CachedAltGlossGenerationResult.user_settings_hash == user_settings.make_hash()
        ))).first()
    
    if cache is not None:
        return cache
    

    line = await db.get(Line, line_id)

    if user_translation is not None and len(user_translation) > 0:
        

        simulated_base_gloss_generation_result = GlossGenerationResult(translations=[GlossLine(line_id=line_id, gloss=user_translation, description="User-inserted translation")])
        translated_lyrics_input = TranslatedLyricsPipelineInputArgs(
                                song_info=project.song,
                                configuration=user_settings,
                                lyric_lines=[line],
                                gloss_generations=simulated_base_gloss_generation_result
                            )
                
        gloss_options = await gloss_options_generator.run(translated_lyrics_input)

        result = CachedAltGlossGenerationResult(
            project_id=project_id,
            line_id=line_id,
            base_gloss=user_translation,
            alt_glosses=[gloss_options.options[0].gloss_short_ver, gloss_options.options[0].gloss_long_ver],
            user_settings_hash=user_settings.make_hash()
        )

        db.add(result)
        await db.commit()

        return result
    else:
        return None
                                
async def generate_line_annotation_with_user_translation(project_id: str, db:AsyncSession, line_id: str) -> LineAnnotation | None:
        project = await db.get(Project, project_id)
        user_settings = project.safe_user_settings
        line, user_translation = await asyncio.gather(
            db.get(Line, line_id),
            fetch_line_translation_by_line(db, project_id, line_id)
            )
        
        if user_translation is not None and user_translation.gloss is not None and len(user_translation.gloss) > 0:
            existing_annotation = await fetch_line_annotation_by_line(db, project_id, line_id)
            if existing_annotation is None or existing_annotation.gloss != user_translation.gloss:

                simulated_base_gloss_generation_result = GlossGenerationResult(translations=[GlossLine(line_id=line_id, gloss=user_translation.gloss, description="User-inserted translation")])
                translated_lyrics_input = TranslatedLyricsPipelineInputArgs(
                                song_info=project.song,
                                configuration=user_settings,
                                lyric_lines=[line],
                                gloss_generations=simulated_base_gloss_generation_result
                            )
                
                combined_result = await RunnableParallel(
                                performance_guides = performance_guide_generator.chain, 
                                gloss_options = gloss_options_generator.chain).ainvoke(translated_lyrics_input)
                
                performance_guide_result: PerformanceGuideGenerationResult = combined_result["performance_guides"]
                gloss_option_generation_result: GlossOptionGenerationResult = combined_result["gloss_options"]

                base_gloss, performance_guide, gloss_options = simulated_base_gloss_generation_result.translations[0], performance_guide_result.guides[0], gloss_option_generation_result.options[0]
                assert base_gloss.line_id == performance_guide.line_id == gloss_options.line_id
                annotation = LineAnnotation( project_id=project.id, 
                                        processing_id="",
                                        line_id=base_gloss.line_id, 
                                        gloss=base_gloss.gloss,
                                        gloss_description=base_gloss.description,
                                        gloss_alts=[
                                            GlossDescription(gloss=gloss_options.gloss_short_ver, description=gloss_options.gloss_description_short_ver).model_dump(),
                                            GlossDescription(gloss=gloss_options.gloss_long_ver, description=gloss_options.gloss_description_long_ver).model_dump()
                                            ],
                                        **performance_guide.model_dump(exclude={"line_id"})
                                )
                print(annotation)
                return annotation

        return None


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

                user_settings = project.safe_user_settings

                #lines = [line for verse in project.song.verses for line in verse.lines]

                line_batches: list[list[Line]] = []
                
                if len(project.song.verses) > 1:
                    for verse_i, verse in enumerate(project.song.verses):
                        if len(verse.lines) > 12:
                            verse_batches = list(sliced([line for line in verse.lines], n=8))
                            line_batches.extend(verse_batches)
                else:
                    line_batches = list(sliced([line for verse in project.song.verses for line in verse.lines], n=10))

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

                    combined_result = await RunnableParallel(
                        performance_guides = performance_guide_generator.chain, 
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