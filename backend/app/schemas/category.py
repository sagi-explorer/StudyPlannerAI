from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    icon: str | None = None
    color: str | None = None
    default_priority: Literal["low", "medium", "high", "urgent"] = "medium"


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    default_priority: Literal["low", "medium", "high", "urgent"] | None = None
    sort_order: int | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None
    color: str | None
    default_priority: str
    sort_order: int
    created_at: datetime
    updated_at: datetime
