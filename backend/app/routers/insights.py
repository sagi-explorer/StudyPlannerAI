from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.insight import (
    InsightCreate,
    InsightUpdate,
    InsightResponse,
    InsightListResponse,
    InsightTagCreate,
    InsightTagUpdate,
    InsightTagResponse,
    InsightTagMerge,
)
from app.services import insight_service

router = APIRouter(tags=["insights"])


@router.get("/api/insights", response_model=InsightListResponse)
async def list_insights(
    tag_id: int | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    db: AsyncSession = Depends(get_db),
):
    items, total = await insight_service.get_insights(
        db, tag_id=tag_id, keyword=keyword, page=page, page_size=page_size, sort_by=sort_by
    )
    return InsightListResponse(
        items=[_to_insight_response(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/api/insights", response_model=InsightResponse, status_code=201)
async def create_insight(
    data: InsightCreate,
    db: AsyncSession = Depends(get_db),
):
    insight = await insight_service.create_insight(db, data.raw_input)
    return _to_insight_response(insight)


@router.get("/api/insights/{insight_id}", response_model=InsightResponse)
async def get_insight(
    insight_id: int,
    db: AsyncSession = Depends(get_db),
):
    insight = await insight_service.get_insight(db, insight_id)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    return _to_insight_response(insight)


@router.put("/api/insights/{insight_id}", response_model=InsightResponse)
async def update_insight(
    insight_id: int,
    data: InsightUpdate,
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    insight = await insight_service.update_insight(db, insight_id, update_data)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    return _to_insight_response(insight)


@router.delete("/api/insights/{insight_id}", status_code=204)
async def delete_insight(
    insight_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted = await insight_service.delete_insight(db, insight_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Insight not found")


@router.put("/api/insights/{insight_id}/pin", response_model=InsightResponse)
async def toggle_pin(
    insight_id: int,
    db: AsyncSession = Depends(get_db),
):
    insight = await insight_service.toggle_pin(db, insight_id)
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    return _to_insight_response(insight)


@router.post("/api/insights/{insight_id}/rewrite", response_model=InsightResponse)
async def rewrite_insight(
    insight_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        insight = await insight_service.rewrite_insight(db, insight_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 改写失败: {e}")
    if insight is None:
        raise HTTPException(status_code=404, detail="Insight not found")
    return _to_insight_response(insight)


@router.get("/api/insight-tags", response_model=list[InsightTagResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db),
):
    return await insight_service.get_tags(db)


@router.post("/api/insight-tags", response_model=InsightTagResponse, status_code=201)
async def create_tag(
    data: InsightTagCreate,
    db: AsyncSession = Depends(get_db),
):
    tag = await insight_service.create_tag(db, data.name, data.color)
    return InsightTagResponse(
        id=tag.id, name=tag.name, color=tag.color,
        insight_count=0, created_at=tag.created_at,
    )


@router.put("/api/insight-tags/{tag_id}", response_model=InsightTagResponse)
async def update_tag(
    tag_id: int,
    data: InsightTagUpdate,
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    tag = await insight_service.update_tag(db, tag_id, update_data)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/api/insight-tags/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted = await insight_service.delete_tag(db, tag_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tag not found")


@router.post("/api/insight-tags/merge", response_model=InsightTagResponse)
async def merge_tags(
    data: InsightTagMerge,
    db: AsyncSession = Depends(get_db),
):
    if data.source_tag_id == data.target_tag_id:
        raise HTTPException(status_code=400, detail="不能合并相同的标签")
    tag = await insight_service.merge_tags(db, data.source_tag_id, data.target_tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


def _to_insight_response(insight: object) -> InsightResponse:
    tags = [
        InsightTagResponse(
            id=t.id, name=t.name, color=t.color,
            insight_count=0, created_at=t.created_at,
        )
        for t in insight.tags  # type: ignore[attr-defined]
    ]
    return InsightResponse(
        id=insight.id,  # type: ignore[attr-defined]
        content=insight.content,  # type: ignore[attr-defined]
        summary=insight.summary,  # type: ignore[attr-defined]
        source=insight.source,  # type: ignore[attr-defined]
        is_pinned=insight.is_pinned,  # type: ignore[attr-defined]
        tags=tags,
        created_at=insight.created_at,  # type: ignore[attr-defined]
        updated_at=insight.updated_at,  # type: ignore[attr-defined]
    )
