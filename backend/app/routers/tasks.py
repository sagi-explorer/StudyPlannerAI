from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskPostpone,
    TaskResponse,
    TaskStats,
)
from app.schemas.postpone import PostponeAnalysis, PostponeAnalyzeRequest
from app.services import task_service
from app.services.ai_service import QwenAPIError

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    category_id: int | None = Query(None),
    status: str | None = Query(None),
    due_date_start: date | None = Query(None),
    due_date_end: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await task_service.get_tasks(
        db,
        category_id=category_id,
        status=status,
        due_date_start=due_date_start,
        due_date_end=due_date_end,
    )


@router.get("/stats", response_model=TaskStats)
async def task_stats(
    category_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await task_service.get_task_stats(db, category_id=category_id)


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
):
    return await task_service.create_task(db, data)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.update_task(db, task_id, data)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted = await task_service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")


@router.put("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: int,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.update_task_status(db, task_id, data.status)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/postpone/analyze", response_model=PostponeAnalysis)
async def analyze_postpone(
    task_id: int,
    data: PostponeAnalyzeRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    from app.services import postpone_service

    reason = data.reason if data else None
    try:
        return await postpone_service.analyze_postpone(db, task_id, reason)
    except ValueError:
        raise HTTPException(status_code=404, detail="Task not found")
    except QwenAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.put("/{task_id}/postpone", response_model=TaskResponse)
async def postpone_task(
    task_id: int,
    data: TaskPostpone,
    db: AsyncSession = Depends(get_db),
):
    task = await task_service.postpone_task(
        db, task_id, data.new_due_date, data.reason
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
