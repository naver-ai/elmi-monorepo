
from typing import Annotated
from backend.database.engine import with_db_session
from backend.database.models import InteractionLog, Project, User, SharableUserInfo
from backend.router.admin.common import check_admin_credential
from backend.router.endpoint_models import ProjectDetails, ProjectInfo, convert_project_to_project_details, convert_project_to_project_info
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession


router = APIRouter(dependencies=[Depends(check_admin_credential)])

class AdminSharedUser(SharableUserInfo):
    passcode: str
    alias: str
    projects: list[ProjectInfo]

@router.get("/users/all", response_model=list[AdminSharedUser])
async def get_all_users(db: Annotated[AsyncSession, Depends(with_db_session)]):
    users = (await db.exec(select(User))).all()
    
    result = []
    for user in users:
        obj = user.model_dump()
        obj["projects"] = [convert_project_to_project_info(project) for project in user.projects]
        result.append(obj)
    
    return result

@router.get("/users/{user_id}/projects/{project_id}/info", response_model=ProjectDetails)
async def get_project_detail(user_id: str, project_id: str, db: Annotated[AsyncSession, Depends(with_db_session)]):
    print("Get project detail...")
    project = await db.get(Project, project_id)
    if project.user_id == user_id:
        return await convert_project_to_project_details(project, user_id, db, include_logs=True)
    else:
        raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="User ID and project id do not correspond with each other.")
    

@router.get("/users/{user_id}/projects/{project_id}/logs", response_model=list[InteractionLog])
async def get_interaction_logs(user_id: str, project_id: str, db: Annotated[AsyncSession, Depends(with_db_session)]):
    project = await db.get(Project, project_id)
    if project.user_id == user_id:
        return project.logs
    else:
        raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="User ID and project id do not correspond with each other.")
    