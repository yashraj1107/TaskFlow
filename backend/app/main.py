from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, boards, lists, cards


@asynccontextmanager
async def lifespan(app: FastAPI):

    yield


app = FastAPI(
    title="TaskFlow API",
    description="Production-grade project management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(boards.router, prefix="/api/v1")
app.include_router(lists.router, prefix="/api/v1")
app.include_router(cards.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "taskflow-api"}
