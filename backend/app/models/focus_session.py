from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.category import Category


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("tasks.id"), nullable=True
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = mapped_column(nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    task: Mapped[Optional["Task"]] = relationship(
        "Task", back_populates="focus_sessions", lazy="selectin"
    )
    category: Mapped[Optional["Category"]] = relationship(
        "Category", lazy="selectin"
    )
