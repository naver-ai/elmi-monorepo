from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.engine import with_db_session
from backend.database.models import User
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