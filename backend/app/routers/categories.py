from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await category_service.get_categories(db)


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    return await category_service.create_category(db, data)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    category = await category_service.update_category(db, category_id, data)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    has_related = await category_service.has_related_records(db, category_id)
    if has_related:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete category with associated tasks or goals",
        )
    category = await category_service.delete_category(db, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
