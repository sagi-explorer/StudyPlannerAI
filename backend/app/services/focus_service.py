from calendar import monthrange
from datetime import datetime, timedelta, date, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.focus_session import FocusSession
from app.models.category import Category
from app.schemas.focus_session import FocusSessionStart


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _week_range(ref: date | None = None) -> tuple[datetime, datetime]:
    """Return (monday 00:00 UTC, next-monday 00:00 UTC) for the week containing *ref*."""
    d = ref or _utc_today()
    monday = d - timedelta(days=d.weekday())
    start = datetime.combine(monday, datetime.min.time())
    end = start + timedelta(days=7)
    return start, end


def _month_range(ref: date | None = None) -> tuple[datetime, datetime]:
    """Return (1st 00:00 UTC, next-month 1st 00:00 UTC) for the month containing *ref*."""
    d = ref or _utc_today()
    start = datetime.combine(d.replace(day=1), datetime.min.time())
    _, last_day = monthrange(d.year, d.month)
    end = start + timedelta(days=last_day)
    return start, end


async def start_session(db: AsyncSession, data: FocusSessionStart) -> FocusSession:
    session = FocusSession(
        task_id=data.task_id,
        category_id=data.category_id,
        planned_minutes=data.planned_minutes,
        started_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def complete_session(
    db: AsyncSession, session_id: int, note: str | None = None
) -> FocusSession | None:
    result = await db.execute(
        select(FocusSession).where(FocusSession.id == session_id)
    )
    session = result.scalars().first()
    if session is None:
        return None

    session.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.completed = True
    session.actual_minutes = session.planned_minutes
    if note is not None:
        session.note = note

    await db.flush()
    await db.refresh(session)
    return session


async def abandon_session(
    db: AsyncSession, session_id: int, note: str | None = None
) -> FocusSession | None:
    result = await db.execute(
        select(FocusSession).where(FocusSession.id == session_id)
    )
    session = result.scalars().first()
    if session is None:
        return None

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session.ended_at = now
    session.completed = False
    elapsed = (now - session.started_at).total_seconds()
    session.actual_minutes = max(1, round(elapsed / 60))
    if note is not None:
        session.note = note

    await db.flush()
    await db.refresh(session)
    return session


async def get_active_session(db: AsyncSession) -> FocusSession | None:
    """Find a running session (ended_at IS NULL), regardless of start date."""
    result = await db.execute(
        select(FocusSession)
        .where(FocusSession.ended_at.is_(None))
        .order_by(FocusSession.started_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def get_today_sessions(db: AsyncSession) -> list[FocusSession]:
    today = _utc_today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = today_start + timedelta(days=1)
    result = await db.execute(
        select(FocusSession)
        .where(
            FocusSession.started_at >= today_start,
            FocusSession.started_at < today_end,
        )
        .order_by(FocusSession.started_at.desc())
    )
    return list(result.scalars().all())


async def get_stats(
    db: AsyncSession,
    period: str = "week",
    category_id: int | None = None,
) -> dict:
    if period == "month":
        cur_start, cur_end = _month_range()
        prev_ref = (_utc_today().replace(day=1) - timedelta(days=1))
        prev_start, prev_end = _month_range(prev_ref)
    else:
        cur_start, cur_end = _week_range()
        prev_start, prev_end = _week_range(_utc_today() - timedelta(days=7))

    base_filter = [
        FocusSession.started_at >= cur_start,
        FocusSession.started_at < cur_end,
    ]
    if category_id is not None:
        base_filter.append(FocusSession.category_id == category_id)

    result = await db.execute(
        select(FocusSession).where(*base_filter)
    )
    sessions = list(result.scalars().all())

    total_minutes = sum(s.actual_minutes or 0 for s in sessions)
    total_sessions = len(sessions)
    completed_sessions = sum(1 for s in sessions if s.completed)

    num_days = (cur_end - cur_start).days
    daily_map: dict[str, int] = {}
    for i in range(num_days):
        d = (cur_start + timedelta(days=i)).date()
        daily_map[d.isoformat()] = 0
    for s in sessions:
        day_key = s.started_at.date().isoformat()
        if day_key in daily_map:
            daily_map[day_key] += s.actual_minutes or 0
    daily_breakdown = [
        {"date": k, "minutes": v} for k, v in daily_map.items()
    ]

    cat_map: dict[int | None, int] = {}
    for s in sessions:
        cat_map.setdefault(s.category_id, 0)
        cat_map[s.category_id] += s.actual_minutes or 0

    cat_ids = [cid for cid in cat_map if cid is not None]
    cat_names: dict[int, str] = {}
    if cat_ids:
        cat_result = await db.execute(
            select(Category).where(Category.id.in_(cat_ids))
        )
        for cat in cat_result.scalars().all():
            cat_names[cat.id] = cat.name

    category_breakdown = []
    for cid, mins in cat_map.items():
        category_breakdown.append({
            "category_id": cid,
            "category_name": cat_names.get(cid, "未分类") if cid else "未分类",
            "minutes": mins,
        })

    prev_filter = [
        FocusSession.started_at >= prev_start,
        FocusSession.started_at < prev_end,
    ]
    if category_id is not None:
        prev_filter.append(FocusSession.category_id == category_id)

    prev_result = await db.execute(
        select(FocusSession).where(*prev_filter)
    )
    prev_sessions = list(prev_result.scalars().all())
    prev_minutes = sum(s.actual_minutes or 0 for s in prev_sessions)

    if prev_minutes > 0:
        comparison = round((total_minutes - prev_minutes) / prev_minutes * 100, 1)
    else:
        comparison = 100.0 if total_minutes > 0 else 0.0

    return {
        "total_minutes": total_minutes,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "daily_breakdown": daily_breakdown,
        "category_breakdown": category_breakdown,
        "comparison_with_last_week": comparison,
    }


async def get_weekly_completion_rates(
    db: AsyncSession, weeks: int = 4
) -> list[dict]:
    """Return task completion rate per week for the last N weeks (for trend chart)."""
    from app.models.task import Task

    today = _utc_today()
    rates = []
    for i in range(weeks - 1, -1, -1):
        ref = today - timedelta(weeks=i)
        w_start, w_end = _week_range(ref)
        result = await db.execute(
            select(Task).where(
                Task.created_at >= w_start,
                Task.created_at < w_end,
            )
        )
        tasks = list(result.scalars().all())
        total = len(tasks)
        done = sum(1 for t in tasks if t.status == "done")
        rate = round(done / total * 100) if total > 0 else 0
        week_label = w_start.strftime("%m/%d")
        rates.append({"week": week_label, "rate": rate, "total": total, "done": done})
    return rates
