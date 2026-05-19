from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class GoalCreate(BaseModel):
    type: Literal["ultimate", "monthly", "weekly"]
    title: str
    description: str | None = None
    category_id: int | None = None
    parent_goal_id: int | None = None
    target_date: date | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: int | None = None
    target_date: date | None = None


class GoalStatusUpdate(BaseModel):
    status: Literal["active", "completed", "abandoned"]


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    description: str | None
    category_id: int | None
    parent_goal_id: int | None
    target_date: date | None
    status: str
    progress: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class GoalProgressResponse(BaseModel):
    goal: GoalResponse
    children: list[GoalResponse]
    related_tasks_count: int
    completed_tasks_count: int
