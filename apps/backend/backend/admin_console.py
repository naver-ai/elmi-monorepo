import asyncio
from enum import StrEnum
from backend.database.engine import create_db_and_tables, engine
from backend.database.models import User
from backend.database.test import create_test_db_entities
import questionary
from backend.database import db_sessionmaker
from sqlmodel import select


class ConsoleMenu(StrEnum):
    CreateUser = "Create user"
    ListUser = "Show users"
    Exit = "Exit"

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


async def _run_console_loop():

    await create_db_and_tables(engine)
    await create_test_db_entities()

    while True:
        menu = await questionary.select("Select a command.", [menu for menu in ConsoleMenu]).ask_async()

        if menu is ConsoleMenu.CreateUser:
            await _create_user()
        if menu is ConsoleMenu.ListUser:
            await _list_user()
        elif menu is ConsoleMenu.Exit:
            print("Bye.")
            break


if __name__ == "__main__":
    print("Launching admin console...")
    asyncio.run(_run_console_loop())