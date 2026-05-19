from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Integer, Boolean, ForeignKey, Column, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.insight_tag import InsightTag

InsightTagLink = Table(
    "insight_tag_links",
    Base.metadata,
    Column(
        "insight_id",
        Integer,
        ForeignKey("insights.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        Integer,
        ForeignKey("insight_tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raw_input: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="manual")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    tags: Mapped[list["InsightTag"]] = relationship(
        "InsightTag",
        secondary=InsightTagLink,
        back_populates="insights",
        lazy="selectin",
    )
