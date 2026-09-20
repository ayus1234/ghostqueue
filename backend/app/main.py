import os
from fastapi import FastAPI
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="GhostQueue — Human Process Abandonment Intelligence API",
    swagger_favicon_url="/favicon.ico",
)

# Enable CORS for frontend dashboard communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_PREFIX)
app.include_router(router, prefix="/api/v1")


FAVICON_PATH = os.path.join(os.path.dirname(__file__), "static", "favicon.ico")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    if os.path.exists(FAVICON_PATH):
        return FileResponse(FAVICON_PATH, media_type="image/x-icon")
    return Response(status_code=204)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ghostqueue-api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

