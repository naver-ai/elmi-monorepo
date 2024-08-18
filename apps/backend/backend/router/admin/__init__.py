from fastapi import APIRouter
from . import auth, data

router = APIRouter()

router.include_router(auth.router, prefix='/auth')
router.include_router(data.router, prefix="/data")