import json
import logging
from datetime import date, timedelta, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import Review
from app.models.setting import Setting
from app.models.task import Task
from app.models.goal import Goal
from app.prompts.review import build_review_prompt
from app.services.ai_service import qwen_client, QwenAPIError
from app.services import focus_service

logger = logging.getLogger(__name__)


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _week_bounds(ref: date | None = None) -> tuple[date, date]:
    """Return (monday, sunday) for the week containing *ref*."""
    d = ref or _utc_today()
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


async def _collect_tasks_data(
    db: AsyncSession, start: date, end: date
) -> tuple[str, dict]:
    result = await db.execute(
        select(Task).where(
            Task.created_at >= datetime.combine(start, datetime.min.time()),
            Task.created_at < datetime.combine(end + timedelta(days=1), datetime.min.time()),
        )
    )
    tasks = list(result.scalars().all())

    due_result = await db.execute(
        select(Task).where(
            Task.due_date >= start,
            Task.due_date <= end,
        )
    )
    due_tasks = list(due_result.scalars().all())

    all_tasks = {t.id: t for t in tasks}
    for t in due_tasks:
        all_tasks[t.id] = t
    merged = list(all_tasks.values())

    total = len(merged)
    done = sum(1 for t in merged if t.status == "done")
    overdue = sum(1 for t in merged if t.status == "overdue")
    postponed = sum(1 for t in merged if t.postpone_count > 0)
    in_progress = sum(1 for t in merged if t.status == "in_progress")

    completion_rate = round(done / total * 100, 1) if total > 0 else 0
    postpone_rate = round(postponed / total * 100, 1) if total > 0 else 0

    lines = [
        f"总任务数: {total}",
        f"已完成: {done}",
        f"进行中: {in_progress}",
        f"逾期: {overdue}",
        f"延期过的任务: {postponed}",
        f"完成率: {completion_rate}%",
    ]

    if overdue > 0:
        overdue_tasks = [t for t in merged if t.status == "overdue"]
        lines.append("\n逾期任务列表:")
        for t in overdue_tasks:
            lines.append(f"  - {t.title} (截止: {t.due_date})")

    if postponed > 0:
        postponed_tasks = [t for t in merged if t.postpone_count > 0]
        lines.append("\n延期任务列表:")
        for t in postponed_tasks:
            lines.append(
                f"  - {t.title} (延期{t.postpone_count}次, "
                f"原截止: {t.original_due_date}, 现截止: {t.due_date})"
            )

    stats = {
        "total": total,
        "done": done,
        "in_progress": in_progress,
        "overdue": overdue,
        "postponed": postponed,
        "completion_rate": completion_rate,
        "postpone_rate": postpone_rate,
    }

    return "\n".join(lines), stats


async def _collect_goals_progress(db: AsyncSession) -> str:
    result = await db.execute(
        select(Goal).where(Goal.status == "active")
    )
    goals = list(result.scalars().all())

    if not goals:
        return "当前没有进行中的目标。"

    lines = []
    for g in goals:
        lines.append(f"- [{g.type}] {g.title}: 进度 {g.progress}%, 状态 {g.status}")
    return "\n".join(lines)


async def _collect_focus_stats(db: AsyncSession, period: str) -> str:
    stats = await focus_service.get_stats(db, period=period)

    lines = [
        f"总学习时长: {stats['total_minutes']} 分钟",
        f"专注次数: {stats['total_sessions']} 次",
        f"完成专注: {stats['completed_sessions']} 次",
        f"与上周期对比: {stats['comparison_with_last_week']:+.1f}%",
    ]

    if stats.get("category_breakdown"):
        lines.append("\n分类时长:")
        for cat in stats["category_breakdown"]:
            lines.append(f"  - {cat['category_name']}: {cat['minutes']} 分钟")

    return "\n".join(lines)


async def _collect_daily_focus_stats(db: AsyncSession) -> str:
    """Collect today's focus data without modifying P7's focus_service."""
    from app.models.focus_session import FocusSession

    today = _utc_today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = today_start + timedelta(days=1)

    result = await db.execute(
        select(FocusSession).where(
            FocusSession.started_at >= today_start,
            FocusSession.started_at < today_end,
        )
    )
    sessions = list(result.scalars().all())

    total_minutes = sum(s.actual_minutes or 0 for s in sessions)
    total_sessions = len(sessions)
    completed = sum(1 for s in sessions if s.completed)

    yesterday_start = today_start - timedelta(days=1)
    prev_result = await db.execute(
        select(FocusSession).where(
            FocusSession.started_at >= yesterday_start,
            FocusSession.started_at < today_start,
        )
    )
    prev_sessions = list(prev_result.scalars().all())
    prev_minutes = sum(s.actual_minutes or 0 for s in prev_sessions)

    if prev_minutes > 0:
        comparison = round((total_minutes - prev_minutes) / prev_minutes * 100, 1)
    else:
        comparison = 100.0 if total_minutes > 0 else 0.0

    lines = [
        f"今日学习时长: {total_minutes} 分钟",
        f"今日专注次数: {total_sessions} 次",
        f"完成专注: {completed} 次",
        f"与昨日对比: {comparison:+.1f}%",
    ]
    return "\n".join(lines)


async def generate_review(
    db: AsyncSession,
    review_type: str = "manual",
    period_start: date | None = None,
    period_end: date | None = None,
) -> Review:
    today = _utc_today()

    if review_type == "daily":
        period_start = period_start or today
        period_end = period_end or today
    elif review_type == "weekly":
        monday, sunday = _week_bounds(today)
        period_start = period_start or monday
        period_end = period_end or sunday
    else:
        period_start = period_start or today
        period_end = period_end or today

    tasks_text, tasks_stats = await _collect_tasks_data(db, period_start, period_end)
    goals_text = await _collect_goals_progress(db)

    if review_type == "daily":
        focus_text = await _collect_daily_focus_stats(db)
    else:
        focus_text = await _collect_focus_stats(db, "week")

    strictness_result = await db.execute(
        select(Setting).where(Setting.key == "ai_strictness")
    )
    strictness_setting = strictness_result.scalars().first()
    strictness = int(strictness_setting.value) if strictness_setting else 3

    type_label = {"daily": "每日", "weekly": "每周", "manual": "手动"}.get(
        review_type, "手动"
    )

    prompt_text = build_review_prompt(
        strictness=strictness,
        review_type=type_label,
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        tasks_data=tasks_text,
        goals_progress=goals_text,
        focus_session_stats=focus_text,
    )

    content: str | None = None
    try:
        content = await qwen_client.chat(
            [{"role": "user", "content": prompt_text}],
            temperature=0.8,
        )
    except QwenAPIError as e:
        logger.error("复盘生成失败: %s", e)
        content = f"⚠️ 复盘生成失败: {e.detail}"
    except Exception as e:
        logger.error("复盘生成异常: %s", e)
        content = f"⚠️ 复盘生成失败: {e}"

    review = Review(
        type=review_type,
        period_start=period_start,
        period_end=period_end,
        content=content,
        stats=json.dumps(tasks_stats, ensure_ascii=False),
        is_read=False,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


async def get_reviews(
    db: AsyncSession,
    review_type: str | None = None,
    is_read: bool | None = None,
) -> list[Review]:
    stmt = select(Review).order_by(Review.created_at.desc())
    if review_type is not None:
        stmt = stmt.where(Review.type == review_type)
    if is_read is not None:
        stmt = stmt.where(Review.is_read == is_read)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_review(db: AsyncSession, review_id: int) -> Review | None:
    result = await db.execute(select(Review).where(Review.id == review_id))
    return result.scalars().first()


async def get_unread_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Review.id)).where(Review.is_read == False)  # noqa: E712
    )
    return result.scalar_one()


async def mark_as_read(db: AsyncSession, review_id: int) -> Review | None:
    review = await get_review(db, review_id)
    if review is None:
        return None
    review.is_read = True
    await db.flush()
    await db.refresh(review)
    return review
