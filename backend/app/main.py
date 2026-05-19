from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory, init_db
from app.models.category import Category
from app.models.setting import Setting


async def _seed_default_categories() -> None:
    async with async_session_factory() as session:
        result = await session.execute(select(Category).limit(1))
        if result.scalars().first() is not None:
            return

        defaults = [
            Category(
                name="LLM Lab",
                icon="🧪",
                color="#7c3aed",
                default_priority="high",
                sort_order=0,
            ),
            Category(
                name="Work Hub",
                icon="💼",
                color="#06b6d4",
                default_priority="medium",
                sort_order=1,
            ),
        ]
        session.add_all(defaults)
        await session.commit()


async def _seed_default_settings() -> None:
    async with async_session_factory() as session:
        result = await session.execute(select(Setting).limit(1))
        if result.scalars().first() is not None:
            return

        defaults = [
            Setting(key="ai_strictness", value="3"),
            Setting(key="daily_review_time", value="21:00"),
            Setting(key="weekly_review_day", value="sunday"),
            Setting(key="default_category", value="1"),
            Setting(key="daily_available_hours", value="8"),
            Setting(key="focus_minutes", value="25"),
            Setting(key="break_minutes", value="5"),
        ]
        session.add_all(defaults)
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from app.services.scheduler_service import start_scheduler, stop_scheduler

    await init_db()
    await _seed_default_categories()
    await _seed_default_settings()
    await start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="StudyPlannerAI",
    description="AI 驱动的学习/工作计划管理助手",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


from app.routers import tasks, goals, categories, conversations, focus, settings as settings_router, insights, reviews

app.include_router(tasks.router)
app.include_router(goals.router)
app.include_router(categories.router)
app.include_router(conversations.router)
app.include_router(focus.router)
app.include_router(settings_router.router)
app.include_router(insights.router)
app.include_router(reviews.router)
