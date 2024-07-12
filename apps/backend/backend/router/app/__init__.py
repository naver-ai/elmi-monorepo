from fastapi import APIRouter
from .auth import router as auth_router
from .project import router as project_router
from .media import router as media_router


router = APIRouter()

router.include_router(auth_router, prefix="/auth")
router.include_router(project_router, prefix="/projects")
router.include_router(media_router, prefix="/media")