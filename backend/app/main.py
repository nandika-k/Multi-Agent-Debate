from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.debates import router as debates_router
from app.core.settings import settings
from app.db.repository import DebateRepository


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_runtime()
    DebateRepository().initialize()
    yield


app = FastAPI(
    title="Counter",
    version="0.2.0",
    lifespan=lifespan,
)

app.include_router(debates_router, prefix="/api")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
