from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db
from app.api.v1 import auth, users, policies, agent, simulator, guide, bookmarks, profiles
from app.tasks.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="AI 정책 추천 에이전트",
    description="맞춤형 정책 추천 및 정보 리터러시 에이전트 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(policies.router, prefix="/api/v1/policies", tags=["policies"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["agent"])
app.include_router(guide.router, prefix="/api/v1/guide", tags=["guide"])
app.include_router(bookmarks.router, prefix="/api/v1/bookmarks", tags=["bookmarks"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["profiles"])
app.include_router(simulator.router, prefix="/ws", tags=["simulator"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
