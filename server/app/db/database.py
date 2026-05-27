from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


_engine = None
AsyncSessionLocal: Optional[async_sessionmaker] = None


async def init_db():
    global _engine, AsyncSessionLocal
    from app.config import settings

    _engine = create_async_engine(settings.database_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False)

    # 테이블 자동 생성
    from app.models import user, policy, bookmark, conversation  # noqa: F401 — 모델 등록
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
