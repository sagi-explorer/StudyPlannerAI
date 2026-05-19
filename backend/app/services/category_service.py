from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.task import Task
from app.models.goal import Goal
from app.schemas.category import CategoryCreate, CategoryUpdate


async def get_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.sort_order))
    return list(result.scalars().all())


async def get_category(db: AsyncSession, category_id: int) -> Category | None:
    result = await db.execute(select(Category).where(Category.id == category_id))
    return result.scalars().first()


async def create_category(db: AsyncSession, data: CategoryCreate) -> Category:
    category = Category(
        name=data.name,
        icon=data.icon,
        color=data.color,
        default_priority=data.default_priority,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


async def update_category(
    db: AsyncSession, category_id: int, data: CategoryUpdate
) -> Category | None:
    category = await get_category(db, category_id)
    if category is None:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    await db.flush()
    await db.refresh(category)
    return category


async def has_related_records(db: AsyncSession, category_id: int) -> bool:
    task_result = await db.execute(
        select(func.count()).select_from(Task).where(Task.category_id == category_id)
    )
    if task_result.scalar() > 0:
        return True

    goal_result = await db.execute(
        select(func.count()).select_from(Goal).where(Goal.category_id == category_id)
    )
    return goal_result.scalar() > 0


async def delete_category(db: AsyncSession, category_id: int) -> Category | None:
    category = await get_category(db, category_id)
    if category is None:
        return None
    await db.delete(category)
    await db.flush()
    return category
