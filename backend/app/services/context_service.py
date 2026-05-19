from datetime import date, datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.goal import Goal
from app.models.message import Message
from app.models.setting import Setting
from app.models.task import Task
from app.prompts.chat import build_chat_system_prompt
from app.services.ai_service import qwen_client


def _format_goals(goals: list[Goal]) -> str:
    if not goals:
        return "（暂无）"
    lines = []
    for g in goals:
        lines.append(f"- {g.title}（进度 {g.progress}%，状态 {g.status}）")
    return "\n".join(lines)


def _format_overdue_tasks(tasks: list[Task]) -> str:
    if not tasks:
        return "（无逾期任务）"
    lines = []
    for t in tasks:
        cat_name = t.category.name if t.category else "未分类"
        lines.append(
            f"- [{cat_name}] {t.title}（截止 {t.due_date}，已延期 {t.postpone_count} 次）"
        )
    return "\n".join(lines)


async def build_system_context(db: AsyncSession) -> str:
    today = date.today()
    today_str = today.isoformat()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    all_tasks_result = await db.execute(
        select(Task).where(Task.status != "done")
    )
    all_tasks = list(all_tasks_result.scalars().all())

    todo_count = sum(1 for t in all_tasks if t.status == "todo")
    in_progress_count = sum(1 for t in all_tasks if t.status == "in_progress")
    overdue_list = [
        t for t in all_tasks
        if t.due_date is not None and t.due_date < today and t.status != "done"
    ]
    overdue_count = len(overdue_list)
    due_this_week = sum(
        1 for t in all_tasks
        if t.due_date is not None and today <= t.due_date <= week_end
    )

    task_stats = {
        "todo": todo_count,
        "in_progress": in_progress_count,
        "overdue": overdue_count,
        "due_this_week": due_this_week,
    }

    ultimate_result = await db.execute(
        select(Goal).where(Goal.type == "ultimate", Goal.status == "active")
    )
    ultimate_goals = list(ultimate_result.scalars().all())

    monthly_result = await db.execute(
        select(Goal).where(Goal.type == "monthly", Goal.status == "active")
    )
    monthly_goals = list(monthly_result.scalars().all())

    weekly_result = await db.execute(
        select(Goal).where(Goal.type == "weekly", Goal.status == "active")
    )
    weekly_goals = list(weekly_result.scalars().all())

    strictness_result = await db.execute(
        select(Setting).where(Setting.key == "ai_strictness")
    )
    strictness_row = strictness_result.scalars().first()
    strictness = int(strictness_row.value) if strictness_row else 3

    weekly_study_hours = 0.0
    remaining_study_hours = 0.0

    return build_chat_system_prompt(
        strictness=strictness,
        today=today_str,
        ultimate_goals=_format_goals(ultimate_goals),
        monthly_goals=_format_goals(monthly_goals),
        weekly_goals=_format_goals(weekly_goals),
        task_stats=task_stats,
        weekly_study_hours=weekly_study_hours,
        remaining_study_hours=remaining_study_hours,
        overdue_tasks=_format_overdue_tasks(overdue_list),
    )


async def get_conversation_messages(
    db: AsyncSession,
    conversation_id: int,
    limit: int = 10,
) -> list[dict[str, str]]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    return [{"role": m.role, "content": m.content} for m in messages]


async def compress_conversation(
    db: AsyncSession,
    conversation_id: int,
) -> None:
    count_result = await db.execute(
        select(func.count())
        .select_from(Message)
        .where(Message.conversation_id == conversation_id)
    )
    total = count_result.scalar() or 0
    if total <= 20:
        return

    all_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    all_messages = list(all_result.scalars().all())

    early_count = total - 10
    early_messages = all_messages[:early_count]

    summary_input = "\n".join(
        f"{m.role}: {m.content}" for m in early_messages
    )
    summary = await qwen_client.chat(
        [
            {
                "role": "system",
                "content": "请将以下对话内容压缩为一段简洁的摘要，保留关键信息和决策。用中文回复。",
            },
            {"role": "user", "content": summary_input},
        ],
        temperature=0.3,
    )

    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalars().first()
    if conv:
        conv.summary = summary

    for m in early_messages:
        await db.delete(m)
    await db.flush()
