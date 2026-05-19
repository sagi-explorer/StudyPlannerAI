from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.insight import InsightTagLink

if TYPE_CHECKING:
    from app.models.insight import Insight


class InsightTag(Base):
    __tablename__ = "insight_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    color: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    insights: Mapped[list["Insight"]] = relationship(
        "Insight",
        secondary=InsightTagLink,
        back_populates="tags",
        lazy="selectin",
    )
