from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.database.engine import with_db_session
from backend.database.models import Project, SignLanguageType, User
from backend.errors import ErrorType
from backend.router.app.common import get_signed_in_user
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
import jwt
import pendulum


router = APIRouter()



class LoginCodeCredential(BaseModel):
    code: str

class AuthenticationResult(BaseModel):
    jwt: str

@router.post("/login", response_model=AuthenticationResult)
async def login_with_code(credential: LoginCodeCredential, db: Annotated[AsyncSession, Depends(with_db_session)]):
    try:
        query = select(User).where(User.passcode == credential.code).limit(1)
        result = await db.exec(query)
        user = result.first()
        if user is not None:
            issued_at = int(pendulum.now().timestamp())
            parcel = {
                "sub": user.id,
                "callable_name": user.callable_name,
                "sign_language": user.sign_language,
                "iat": issued_at,
                "exp": issued_at + (365 * 24 * 3600)
            }
            
            return AuthenticationResult(jwt=jwt.encode(parcel, get_env_variable(EnvironmentVariables.APP_AUTH_SECRET), algorithm='HS256'))
    except ValueError as ex:
        print(ex)
        raise HTTPException(status_code=400, detail=ErrorType.NoSuchUser)
    

@router.get("/verify", dependencies=[Depends(get_signed_in_user)])
async def verify():
    return status.HTTP_200_OK