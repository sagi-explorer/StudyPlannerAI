from datetime import date

from pydantic import BaseModel


class PostponeAnalyzeRequest(BaseModel):
    reason: str | None = None


class TaskDensity(BaseModel):
    date: date
    task_count: int


class RelatedTask(BaseModel):
    id: int
    title: str


class PostponeAnalysis(BaseModel):
    task_id: int
    current_due_date: date
    postpone_count: int
    suggested_new_date: date
    ai_analysis: str
    upcoming_task_density: list[TaskDensity]
    affected_related_tasks: list[RelatedTask]
