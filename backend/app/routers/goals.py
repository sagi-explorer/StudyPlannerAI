from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.goal import (
    GoalCreate,
    GoalUpdate,
    GoalStatusUpdate,
    GoalResponse,
    GoalProgressResponse,
)
from app.services import goal_service

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    type: str | None = Query(None),
    status: str | None = Query(None),
    parent_goal_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await goal_service.get_goals(
        db, type=type, status=status, parent_goal_id=parent_goal_id
    )


@router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
):
    return await goal_service.create_goal(db, data)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
):
    goal = await goal_service.get_goal(db, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
):
    goal = await goal_service.update_goal(db, goal_id, data)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted = await goal_service.delete_goal(db, goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")


@router.put("/{goal_id}/status", response_model=GoalResponse)
async def update_goal_status(
    goal_id: int,
    data: GoalStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    goal = await goal_service.update_goal_status(db, goal_id, data.status)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
):
    await goal_service.recalculate_progress(db, goal_id)
    progress = await goal_service.get_goal_progress(db, goal_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return progress
