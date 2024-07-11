from fastapi import APIRouter
from .auth import router as auth_router
from .project import router as project_router


router = APIRouter()

router.include_router(auth_router, prefix="/auth")
router.include_router(project_router, prefix="/projects")