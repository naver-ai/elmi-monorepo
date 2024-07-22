
import asyncio

from sqlmodel import select
from backend.database.models import Line, Project, ProjectConfiguration, User, Verse
from backend.router.app.tasks.preprocessing.base_gloss_generation import BaseGlossGenerationPipeline
from backend.router.app.tasks.preprocessing.common import InspectionPipelineInputArgs
from backend.router.app.tasks.preprocessing.inspection import InspectionPipeline
from backend.database import db_sessionmaker
from backend.router.app.tasks.preprocessing.performance_guide_generation import PerformanceGuideGenerationPipeline


async def run():

    async with db_sessionmaker() as session:

        project_query_results = await session.exec(select(Project).join(User, User.id == Project.user_id).where(User.alias == "test"))
        project = project_query_results.first()
        if project is not None:
            lines = [line for verse in project.song.verses[:2] for line in verse.lines]
            user_settings = ProjectConfiguration(**project.user_settings)
            
            inspector = InspectionPipeline()
            gloss_generator = BaseGlossGenerationPipeline()
            performance_guide_generator = PerformanceGuideGenerationPipeline()


            inspection_result = await inspector.inspect(lines, project.song, user_settings)

            print(inspection_result)

            base_gloss_generation_result = await gloss_generator.generate_gloss(lines, project.song, user_settings, inspection_result)

            print(base_gloss_generation_result)

            performance_guide_result = await performance_guide_generator.generate_performance_guides(lines, project.song, user_settings, base_gloss_generation_result)

            print(performance_guide_result)


        else:
            print("No test user found.")

if __name__ == "__main__":
    asyncio.run(run())
