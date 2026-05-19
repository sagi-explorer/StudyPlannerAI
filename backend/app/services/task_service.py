from datetime import date, datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


async def get_tasks(
    db: AsyncSession,
    category_id: int | None = None,
    status: str | None = None,
    due_date_start: date | None = None,
    due_date_end: date | None = None,
) -> list[Task]:
    stmt = select(Task)
    if category_id is not None:
        stmt = stmt.where(Task.category_id == category_id)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if due_date_start is not None:
        stmt = stmt.where(Task.due_date >= due_date_start)
    if due_date_end is not None:
        stmt = stmt.where(Task.due_date <= due_date_end)
    stmt = stmt.order_by(Task.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalars().first()


async def create_task(db: AsyncSession, data: TaskCreate) -> Task:
    task = Task(
        category_id=data.category_id,
        goal_id=data.goal_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        due_date=data.due_date,
        original_due_date=data.due_date,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, task_id: int, data: TaskUpdate) -> Task | None:
    task = await get_task(db, task_id)
    if task is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    await db.flush()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task_id: int) -> bool:
    task = await get_task(db, task_id)
    if task is None:
        return False
    await db.delete(task)
    await db.flush()
    return True


async def update_task_status(db: AsyncSession, task_id: int, status: str) -> Task | None:
    task = await get_task(db, task_id)
    if task is None:
        return None
    task.status = status
    if status == "done":
        task.completed_at = datetime.utcnow()
    elif task.completed_at is not None and status != "done":
        task.completed_at = None
    await db.flush()
    await db.refresh(task)
    return task


async def postpone_task(
    db: AsyncSession,
    task_id: int,
    new_due_date: date,
    reason: str | None = None,
) -> Task | None:
    task = await get_task(db, task_id)
    if task is None:
        return None
    task.due_date = new_due_date
    task.postpone_count += 1
    if reason is not None:
        task.postpone_reason = reason
    await db.flush()
    await db.refresh(task)
    return task


async def get_task_stats(db: AsyncSession, category_id: int | None = None) -> dict:
    base = select(Task)
    if category_id is not None:
        base = base.where(Task.category_id == category_id)

    result = await db.execute(base)
    tasks = list(result.scalars().all())

    today = date.today()
    week_end = today + timedelta(days=(6 - today.weekday()))

    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == "todo")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    done = sum(1 for t in tasks if t.status == "done")
    overdue = sum(1 for t in tasks if t.status == "overdue")
    due_this_week = sum(
        1 for t in tasks
        if t.due_date is not None and today <= t.due_date <= week_end and t.status != "done"
    )

    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "overdue": overdue,
        "due_this_week": due_this_week,
    }
