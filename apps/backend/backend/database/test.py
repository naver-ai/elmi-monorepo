from sqlmodel import select

from backend.database.models import User
from backend.database.engine import db_sessionmaker
from backend.tasks.media_preparation import prepare_song
from backend.tasks.preprocessing import preprocess_song

from sqlmodel import select

from .models import *

async def create_test_db_entities():
    async with db_sessionmaker() as db:
        query = select(User).where(User.alias == 'test')
        test_users = await db.exec(query)
        test_user = test_users.first()
        if test_user is None:

            song1 = await prepare_song("Dynamite", "BTS", "gdZLi9oWNZg", db)

            song2 = await prepare_song(title="Viva La Vida", artist="Coldplay", reference_youtube_id="dvgZkm1xWPE", db=db)
                
            async with db.begin_nested():
                print("Create test user...")
                user = User(alias="test", callable_name="Sue Yoo", sign_language=SignLanguageType.ASL, passcode="12345")
                project1 = Project(song=song1, 
                                  user=user
                    )
                project2 = Project(song=song2, user=user)
                
                db.add(user)
                db.add(project1)
                db.add(project2)
                await db.commit()

    async with db_sessionmaker() as db:
        query = select(User).where(User.alias == 'test')
        test_users = await db.exec(query)
        test_user = test_users.first()
        if test_user is not None:
            for project in test_user.projects:
                await preprocess_song(project.id, db, force=False)