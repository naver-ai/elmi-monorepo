from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.engine import with_db_session
from backend.database.models import Project, Thread, User
from backend.errors import ErrorType
import jwt

from backend.utils.env_helper import EnvironmentVariables, get_env_variable


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


async def get_signed_in_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[AsyncSession, Depends(with_db_session)]) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=ErrorType.NoSuchUser,
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = jwt.decode(token, get_env_variable(EnvironmentVariables.APP_AUTH_SECRET), algorithms=["HS256"])
    user_id: str = payload.get("sub")
    user = await db.get(User, user_id)
    if user is not None:
        return user
    else:
        raise credentials_exception
    

async def get_project(project_id: str, user: Annotated[User, Depends(get_signed_in_user)], db: Annotated[AsyncSession, Depends(with_db_session)]) -> Project:
    project = (await db.exec(select(Project).where(Project.id == project_id, Project.user_id == user.id))).first()
    if project is not None:
        return project
    else:
        raise Exception("NoSuchProject")
    
async def get_thread(thread_id: str, project: Annotated[Project, Depends(get_project)], db: Annotated[AsyncSession, Depends(with_db_session)]) -> Thread:
    thread = (await db.exec(select(Thread).where(Thread.id == thread_id, Thread.project_id == project.id))).first()
    if thread is not None:
        return thread
    else:
        raise Exception("NoSuchThread")
    
