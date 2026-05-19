from datetime import datetime, date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Integer, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.goal import Goal
    from app.models.focus_session import FocusSession


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    goal_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("goals.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="todo")
    priority: Mapped[str] = mapped_column(String, default="medium")
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    original_due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    postpone_count: Mapped[int] = mapped_column(Integer, default=0)
    postpone_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    related_task_ids: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_message: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    category: Mapped[Optional["Category"]] = relationship(
        "Category", lazy="selectin"
    )
    goal: Mapped[Optional["Goal"]] = relationship(
        "Goal", back_populates="tasks", lazy="selectin"
    )
    focus_sessions: Mapped[list["FocusSession"]] = relationship(
        "FocusSession", back_populates="task", lazy="selectin"
    )
