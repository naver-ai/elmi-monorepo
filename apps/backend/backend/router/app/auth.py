from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
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

class ProfileArgs(BaseModel):

    callable_name: Optional[str] = Field(default=None, exclude_default=True)
    sign_language: Optional[SignLanguageType] = Field(default=None, exclude_default=True)

    def name_is_set(self) -> bool:
        return 'callable_name' in self.model_fields_set

    def language_is_set(self) -> bool:
        return 'sign_language' in self.model_fields_set

@router.put("/profile", dependencies=[Depends(get_signed_in_user)], response_model=User)
async def update_profile(args: ProfileArgs, 
                         user: Annotated[User, Depends(get_signed_in_user)],
                         db: Annotated[AsyncSession, Depends(with_db_session)]):
    if args.name_is_set():
        user.callable_name = args.callable_name
    
    if args.language_is_set():
        user.sign_language = args.sign_language
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user