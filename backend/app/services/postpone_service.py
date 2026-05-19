import json
import logging
import re
from collections import Counter
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.models.task import Task
from app.prompts.postpone import build_postpone_prompt
from app.schemas.postpone import (
    PostponeAnalysis,
    RelatedTask,
    TaskDensity,
)
from app.services.ai_service import QwenAPIError, qwen_client

logger = logging.getLogger(__name__)

_DEFAULT_POSTPONE_DAYS = 2
_UPCOMING_WINDOW_DAYS = 7


async def _get_ai_strictness(db: AsyncSession) -> int:
    result = await db.execute(
        select(Setting).where(Setting.key == "ai_strictness")
    )
    setting = result.scalars().first()
    if setting is None:
        return 3
    try:
        return max(1, min(5, int(setting.value)))
    except (ValueError, TypeError):
        return 3


def _parse_suggested_date(ai_text: str, today: date) -> date:
    """Extract a YYYY-MM-DD date from AI response text."""
    match = re.search(r"(\d{4}-\d{1,2}-\d{1,2})", ai_text)
    if match:
        try:
            parts = match.group(1).split("-")
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            pass
    match = re.search(r"(\d{1,2})月(\d{1,2})[日号]", ai_text)
    if match:
        try:
            return date(today.year, int(match.group(1)), int(match.group(2)))
        except ValueError:
            pass
    return today + timedelta(days=_DEFAULT_POSTPONE_DAYS)


async def analyze_postpone(
    db: AsyncSession,
    task_id: int,
    user_reason: str | None,
) -> PostponeAnalysis:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if task is None:
        raise ValueError(f"任务 {task_id} 不存在")

    today = date.today()
    window_start = today
    window_end = today + timedelta(days=_UPCOMING_WINDOW_DAYS)

    upcoming_result = await db.execute(
        select(Task).where(
            Task.due_date >= window_start,
            Task.due_date <= window_end,
            Task.status != "done",
            Task.id != task_id,
        )
    )
    upcoming_tasks = list(upcoming_result.scalars().all())

    date_counts: Counter[date] = Counter()
    for t in upcoming_tasks:
        if t.due_date:
            date_counts[t.due_date] += 1

    density: list[TaskDensity] = []
    for i in range(_UPCOMING_WINDOW_DAYS + 1):
        d = today + timedelta(days=i)
        density.append(TaskDensity(date=d, task_count=date_counts.get(d, 0)))

    related_ids: list[int] = []
    if task.related_task_ids:
        try:
            related_ids = json.loads(task.related_task_ids)
        except (json.JSONDecodeError, TypeError):
            related_ids = []

    affected: list[RelatedTask] = []
    if related_ids:
        rel_result = await db.execute(
            select(Task).where(Task.id.in_(related_ids))
        )
        for rt in rel_result.scalars().all():
            affected.append(RelatedTask(id=rt.id, title=rt.title))

    upcoming_text_lines: list[str] = []
    for d_item in density:
        upcoming_text_lines.append(f"  {d_item.date}: {d_item.task_count} 个任务")
    upcoming_text = "\n".join(upcoming_text_lines) if upcoming_text_lines else "无"

    related_text_lines: list[str] = []
    for rt in affected:
        related_text_lines.append(f"  - {rt.title} (ID: {rt.id})")
    related_text = "\n".join(related_text_lines) if related_text_lines else "无"

    strictness = await _get_ai_strictness(db)

    prompt = build_postpone_prompt(
        task_title=task.title,
        due_date=str(task.due_date) if task.due_date else "未设置",
        postpone_count=task.postpone_count,
        user_reason=user_reason or "未说明",
        today=str(today),
        upcoming_tasks=upcoming_text,
        related_tasks=related_text,
        strictness=strictness,
    )

    try:
        ai_response = await qwen_client.chat(
            [
                {"role": "system", "content": "你是一个学习计划助手，负责帮用户分析任务延期的影响并给出建议。请在回复中明确给出建议的新截止日期（YYYY-MM-DD 格式）。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )
    except QwenAPIError:
        logger.exception("AI 延期分析调用失败")
        fallback_date = today + timedelta(days=_DEFAULT_POSTPONE_DAYS)
        ai_response = (
            f"AI 分析暂时不可用。默认建议将任务延期到 {fallback_date}。"
            f"\n\n该任务已延期 {task.postpone_count} 次。"
        )

    suggested = _parse_suggested_date(ai_response, today)
    if suggested <= today:
        suggested = today + timedelta(days=1)

    return PostponeAnalysis(
        task_id=task.id,
        current_due_date=task.due_date or today,
        postpone_count=task.postpone_count,
        suggested_new_date=suggested,
        ai_analysis=ai_response,
        upcoming_task_density=density,
        affected_related_tasks=affected,
    )
