from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FocusSessionStart(BaseModel):
    task_id: int | None = None
    category_id: int | None = None
    planned_minutes: int = 25


class FocusSessionComplete(BaseModel):
    note: str | None = None


class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int | None
    category_id: int | None
    planned_minutes: int
    actual_minutes: int | None
    started_at: datetime
    ended_at: datetime | None
    completed: bool
    note: str | None


class DailyBreakdown(BaseModel):
    date: str
    minutes: int


class CategoryBreakdown(BaseModel):
    category_id: int | None
    category_name: str
    minutes: int


class FocusStats(BaseModel):
    total_minutes: int
    total_sessions: int
    completed_sessions: int
    daily_breakdown: list[DailyBreakdown]
    category_breakdown: list[CategoryBreakdown]
    comparison_with_last_week: float


class WeeklyCompletionRate(BaseModel):
    week: str
    rate: int
    total: int
    done: int
