from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ReviewGenerate(BaseModel):
    type: Literal["daily", "weekly", "manual"] = "manual"
    period_start: date | None = None
    period_end: date | None = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    period_start: date
    period_end: date
    content: str | None
    stats: str | None
    is_read: bool
    created_at: datetime
