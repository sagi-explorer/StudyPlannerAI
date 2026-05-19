from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InsightCreate(BaseModel):
    raw_input: str


class InsightUpdate(BaseModel):
    content: str | None = None
    summary: str | None = None
    tag_ids: list[int] | None = None


class InsightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    summary: str | None
    source: str
    is_pinned: bool
    tags: list["InsightTagResponse"]
    created_at: datetime
    updated_at: datetime


class InsightListResponse(BaseModel):
    items: list[InsightResponse]
    total: int
    page: int
    page_size: int


class InsightTagCreate(BaseModel):
    name: str
    color: str | None = None


class InsightTagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class InsightTagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str | None
    insight_count: int = 0
    created_at: datetime


class InsightTagMerge(BaseModel):
    source_tag_id: int
    target_tag_id: int
