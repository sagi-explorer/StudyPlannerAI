from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.models.task import Task
from app.schemas.goal import GoalCreate, GoalUpdate


async def get_goals(
    db: AsyncSession,
    type: str | None = None,
    status: str | None = None,
    parent_goal_id: int | None = None,
) -> list[Goal]:
    stmt = select(Goal)
    if type is not None:
        stmt = stmt.where(Goal.type == type)
    if status is not None:
        stmt = stmt.where(Goal.status == status)
    if parent_goal_id is not None:
        stmt = stmt.where(Goal.parent_goal_id == parent_goal_id)
    stmt = stmt.order_by(Goal.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_goal(db: AsyncSession, goal_id: int) -> Goal | None:
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    return result.scalars().first()


async def create_goal(db: AsyncSession, data: GoalCreate) -> Goal:
    goal = Goal(
        type=data.type,
        title=data.title,
        description=data.description,
        category_id=data.category_id,
        parent_goal_id=data.parent_goal_id,
        target_date=data.target_date,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return goal


async def update_goal(db: AsyncSession, goal_id: int, data: GoalUpdate) -> Goal | None:
    goal = await get_goal(db, goal_id)
    if goal is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    await db.flush()
    await db.refresh(goal)
    return goal


async def delete_goal(db: AsyncSession, goal_id: int) -> bool:
    goal = await get_goal(db, goal_id)
    if goal is None:
        return False
    await db.delete(goal)
    await db.flush()
    return True


async def update_goal_status(db: AsyncSession, goal_id: int, status: str) -> Goal | None:
    goal = await get_goal(db, goal_id)
    if goal is None:
        return None
    goal.status = status
    if status == "completed":
        goal.completed_at = datetime.utcnow()
    elif goal.completed_at is not None and status != "completed":
        goal.completed_at = None
    await db.flush()
    await db.refresh(goal)
    return goal


async def get_goal_progress(db: AsyncSession, goal_id: int) -> dict | None:
    goal = await get_goal(db, goal_id)
    if goal is None:
        return None

    children_result = await db.execute(
        select(Goal).where(Goal.parent_goal_id == goal_id)
    )
    children = list(children_result.scalars().all())

    if goal.type == "weekly":
        tasks_result = await db.execute(
            select(Task).where(Task.goal_id == goal_id)
        )
        tasks = list(tasks_result.scalars().all())
        related_tasks_count = len(tasks)
        completed_tasks_count = sum(1 for t in tasks if t.status == "done")
    else:
        related_tasks_count = 0
        completed_tasks_count = 0
        for child in children:
            child_tasks_result = await db.execute(
                select(Task).where(Task.goal_id == child.id)
            )
            child_tasks = list(child_tasks_result.scalars().all())
            related_tasks_count += len(child_tasks)
            completed_tasks_count += sum(1 for t in child_tasks if t.status == "done")

    return {
        "goal": goal,
        "children": children,
        "related_tasks_count": related_tasks_count,
        "completed_tasks_count": completed_tasks_count,
    }


async def recalculate_progress(db: AsyncSession, goal_id: int) -> Goal | None:
    """
    进度计算逻辑（设计文档 §4.5）：
    - 周目标进度 = 关联任务完成数 / 关联任务总数 * 100
    - 月目标进度 = 子周目标的平均进度
    - 终极目标进度 = 子月目标的平均进度
    """
    goal = await get_goal(db, goal_id)
    if goal is None:
        return None

    if goal.type == "weekly":
        tasks_result = await db.execute(
            select(Task).where(Task.goal_id == goal_id)
        )
        tasks = list(tasks_result.scalars().all())
        if len(tasks) == 0:
            goal.progress = 0
        else:
            done_count = sum(1 for t in tasks if t.status == "done")
            goal.progress = round(done_count / len(tasks) * 100)

    elif goal.type in ("monthly", "ultimate"):
        children_result = await db.execute(
            select(Goal).where(Goal.parent_goal_id == goal_id)
        )
        children = list(children_result.scalars().all())
        if len(children) == 0:
            goal.progress = 0
        else:
            for child in children:
                await recalculate_progress(db, child.id)
            await db.flush()
            children_result = await db.execute(
                select(Goal).where(Goal.parent_goal_id == goal_id)
            )
            children = list(children_result.scalars().all())
            avg = sum(c.progress for c in children) / len(children)
            goal.progress = round(avg)

    await db.flush()
    await db.refresh(goal)
    return goal
