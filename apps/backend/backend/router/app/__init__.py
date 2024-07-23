from fastapi import APIRouter, Depends

from backend.router.app.common import get_signed_in_user
from .auth import router as auth_router
from .project import router as project_router
from .media import router as media_router


router = APIRouter()

router.include_router(auth_router, prefix="/auth")
router.include_router(project_router, prefix="/projects", dependencies=[Depends(get_signed_in_user)])
router.include_router(media_router, prefix="/media", dependencies=[Depends(get_signed_in_user)])