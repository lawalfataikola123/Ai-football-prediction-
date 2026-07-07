from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.matches import router as matches_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/v1")
api_router.include_router(matches_router, prefix="/v1")