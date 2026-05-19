from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Integer, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.task import Task


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    parent_goal_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("goals.id"), nullable=True
    )
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    category: Mapped[Optional["Category"]] = relationship(
        "Category", lazy="selectin"
    )
    parent_goal: Mapped[Optional["Goal"]] = relationship(
        "Goal", remote_side="Goal.id", back_populates="children", lazy="selectin"
    )
    children: Mapped[list["Goal"]] = relationship(
        "Goal", back_populates="parent_goal", lazy="selectin"
    )
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="goal", lazy="selectin"
    )
