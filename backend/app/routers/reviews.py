from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.review import ReviewGenerate, ReviewResponse
from app.services import review_service

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    type: str | None = Query(None),
    is_read: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await review_service.get_reviews(db, review_type=type, is_read=is_read)


@router.post("/generate", response_model=ReviewResponse, status_code=201)
async def generate_review(
    body: ReviewGenerate,
    db: AsyncSession = Depends(get_db),
):
    return await review_service.generate_review(
        db,
        review_type=body.type,
        period_start=body.period_start,
        period_end=body.period_end,
    )


@router.get("/unread-count")
async def get_unread_count(db: AsyncSession = Depends(get_db)):
    count = await review_service.get_unread_count(db)
    return {"count": count}


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
):
    review = await review_service.get_review(db, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="复盘报告不存在")
    return review


@router.put("/{review_id}/read", response_model=ReviewResponse)
async def mark_review_read(
    review_id: int,
    db: AsyncSession = Depends(get_db),
):
    review = await review_service.mark_as_read(db, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="复盘报告不存在")
    return review
