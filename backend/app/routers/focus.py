from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.focus_session import (
    FocusSessionStart,
    FocusSessionComplete,
    FocusSessionResponse,
    FocusStats,
    WeeklyCompletionRate,
)
from app.services import focus_service

router = APIRouter(prefix="/api/focus", tags=["focus"])


@router.post("/start", response_model=FocusSessionResponse, status_code=201)
async def start_focus(
    data: FocusSessionStart,
    db: AsyncSession = Depends(get_db),
):
    return await focus_service.start_session(db, data)


@router.put("/{session_id}/complete", response_model=FocusSessionResponse)
async def complete_focus(
    session_id: int,
    data: FocusSessionComplete | None = None,
    db: AsyncSession = Depends(get_db),
):
    note = data.note if data else None
    session = await focus_service.complete_session(db, session_id, note=note)
    if session is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return session


@router.put("/{session_id}/abandon", response_model=FocusSessionResponse)
async def abandon_focus(
    session_id: int,
    data: FocusSessionComplete | None = None,
    db: AsyncSession = Depends(get_db),
):
    note = data.note if data else None
    session = await focus_service.abandon_session(db, session_id, note=note)
    if session is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return session


@router.get("/active", response_model=FocusSessionResponse | None)
async def get_active_focus(
    db: AsyncSession = Depends(get_db),
):
    return await focus_service.get_active_session(db)


@router.get("/stats", response_model=FocusStats)
async def get_focus_stats(
    period: str = Query("week"),
    category_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await focus_service.get_stats(db, period=period, category_id=category_id)


@router.get("/today", response_model=list[FocusSessionResponse])
async def get_today_focus(
    db: AsyncSession = Depends(get_db),
):
    return await focus_service.get_today_sessions(db)


@router.get("/completion-rates", response_model=list[WeeklyCompletionRate])
async def get_completion_rates(
    weeks: int = Query(4, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    return await focus_service.get_weekly_completion_rates(db, weeks=weeks)
