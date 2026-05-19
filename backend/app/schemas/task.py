from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    category_id: int | None = None
    goal_id: int | None = None
    title: str
    description: str | None = None
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    due_date: date | None = None


class TaskUpdate(BaseModel):
    category_id: int | None = None
    goal_id: int | None = None
    title: str | None = None
    description: str | None = None
    priority: Literal["low", "medium", "high", "urgent"] | None = None
    due_date: date | None = None


class TaskStatusUpdate(BaseModel):
    status: Literal["todo", "in_progress", "done", "overdue"]


class TaskPostpone(BaseModel):
    new_due_date: date
    reason: str | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int | None
    goal_id: int | None
    title: str
    description: str | None
    status: str
    priority: str
    due_date: date | None
    original_due_date: date | None
    completed_at: datetime | None
    postpone_count: int
    postpone_reason: str | None
    related_task_ids: str | None
    source_message: str | None
    created_at: datetime
    updated_at: datetime


class TaskStats(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int
    overdue: int
    due_this_week: int
