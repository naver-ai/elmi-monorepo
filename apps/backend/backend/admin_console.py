import asyncio
from enum import StrEnum
from backend.database.engine import create_db_and_tables, engine
from backend.database.models import SongWhitelistItem, User
from backend.database.test import create_test_db_entities
from backend.tasks.media_preparation.common import LyricsPackage
import questionary
from backend.database import db_sessionmaker
from sqlmodel import select

from backend.tasks.media_preparation import prepare_song


class ConsoleMenu(StrEnum):
    CreateUser = "Create user"
    ListUser = "Show users"
    AddSong = "Add song"
    Exit = "Exit"

validate_non_null_str = lambda s: "Required." if s is None or len(s) == 0 else True

async def _create_user():
    async with db_sessionmaker() as session:
        alias = await questionary.text(
            message="Enter user alias (e.g., P1):",
            
            validate=lambda s: "User alias cannot be empty." if s is None or len(s) == 0 else True).ask_async()
         
        confirm = await questionary.confirm(f"Create a user with alias \"{alias}\"").ask_async()

        if confirm:
            user = User(alias=alias, callable_name=None, sign_language=None)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print("Create user:")
            print(user)
    
async def _list_user():
    async with db_sessionmaker() as db:
        l = (await db.exec(select(User))).all()
        print(f"{len(l)} users in the database.")
        print(l)

async def _add_song():

    async with db_sessionmaker() as db:
        async with db.begin():
            title = await questionary.text(message="Enter song title:", validate=validate_non_null_str).ask_async()
            artist = await questionary.text(message="Enter artist:", validate=validate_non_null_str).ask_async()
            youtube_id = await questionary.text(message="Enter YouTube ID for reference video:", validate=validate_non_null_str).ask_async()

            use_override_lyrics = await questionary.confirm("Use your own lyrics?").ask_async()

            if use_override_lyrics is True:
                raw_lines = await questionary.text(message="Enter raw lyric lines:", validate=validate_non_null_str).ask_async()
                override_lyrics = LyricsPackage.from_list_str(raw_lines.split("\n"))
            else:
                override_lyrics = None

            use_whitelist = await questionary.confirm("Make this song available to specific users?").ask_async()
            whitelist_users: list[User] = []
            if use_whitelist:
                users = (await db.exec(select(User))).all()
                selected_users: list[User] = []
                while True:
                    remaining_users = [u for u in users if u not in selected_users]
                    options = [u.alias for u in remaining_users] + ["[Done]"]
                    choice = await questionary.select("Select user to allow to sign this song:", options, show_selected=True).ask_async()
                    choice_index = options.index(choice)
                    if choice_index == len(options)-1:
                        # Finish
                        break
                    else:
                        selected_users.append(remaining_users[choice_index])
                whitelist_users = selected_users
            
            song = await prepare_song(title, artist, youtube_id, db, override_lyrics=override_lyrics, force=True)
            if len(whitelist_users) > 0:
                db.add_all([SongWhitelistItem(user_id=u.id, song_id=song.id, active=True) for u in whitelist_users])
            print("====Successfully created the song.")


async def _run_console_loop():

    await create_db_and_tables(engine)
    await create_test_db_entities()

    while True:
        menu = await questionary.select("Select a command.", [menu for menu in ConsoleMenu]).ask_async()

        if menu is ConsoleMenu.CreateUser:
            await _create_user()
        if menu is ConsoleMenu.ListUser:
            await _list_user()
        if menu is ConsoleMenu.AddSong:
            await _add_song()
        elif menu is ConsoleMenu.Exit:
            print("Bye.")
            break


if __name__ == "__main__":
    print("Launching admin console...")
    asyncio.run(_run_console_loop())