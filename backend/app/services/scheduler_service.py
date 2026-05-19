import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.database import async_session_factory
from app.models.setting import Setting

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

DAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


async def _run_daily_review() -> None:
    from app.services import review_service

    logger.info("定时触发每日复盘")
    async with async_session_factory() as db:
        try:
            await review_service.generate_review(db, review_type="daily")
            await db.commit()
            logger.info("每日复盘生成成功")
        except Exception:
            await db.rollback()
            logger.exception("每日复盘生成失败")


async def _run_weekly_review() -> None:
    from app.services import review_service

    logger.info("定时触发每周复盘")
    async with async_session_factory() as db:
        try:
            await review_service.generate_review(db, review_type="weekly")
            await db.commit()
            logger.info("每周复盘生成成功")
        except Exception:
            await db.rollback()
            logger.exception("每周复盘生成失败")


async def update_schedule() -> None:
    """Read settings and reschedule daily/weekly review jobs."""
    async with async_session_factory() as db:
        result = await db.execute(select(Setting))
        settings_map = {s.key: s.value for s in result.scalars().all()}

    daily_time = settings_map.get("daily_review_time", "21:00")
    weekly_day = settings_map.get("weekly_review_day", "sunday")

    hour, minute = (int(x) for x in daily_time.split(":"))
    day_of_week = DAY_MAP.get(weekly_day.lower(), 6)

    if scheduler.get_job("daily_review"):
        scheduler.remove_job("daily_review")
    scheduler.add_job(
        _run_daily_review,
        CronTrigger(hour=hour, minute=minute),
        id="daily_review",
        replace_existing=True,
    )
    logger.info("每日复盘调度已更新: %02d:%02d", hour, minute)

    if scheduler.get_job("weekly_review"):
        scheduler.remove_job("weekly_review")
    weekly_hour = hour
    weekly_minute = minute + 30
    if weekly_minute >= 60:
        weekly_hour += 1
        weekly_minute -= 60
    if weekly_hour >= 24:
        weekly_hour -= 24
    scheduler.add_job(
        _run_weekly_review,
        CronTrigger(day_of_week=day_of_week, hour=weekly_hour, minute=weekly_minute),
        id="weekly_review",
        replace_existing=True,
    )
    day_name = [k for k, v in DAY_MAP.items() if v == day_of_week][0]
    logger.info("每周复盘调度已更新: %s %02d:%02d", day_name, weekly_hour, weekly_minute)


async def start_scheduler() -> None:
    await update_schedule()
    scheduler.start()
    logger.info("APScheduler 已启动")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler 已关闭")
