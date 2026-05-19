import json
import logging
from datetime import datetime

from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.insight import Insight, InsightTagLink
from app.models.insight_tag import InsightTag
from app.prompts.insight import build_insight_prompt
from app.services.ai_service import qwen_client, QwenAPIError

logger = logging.getLogger(__name__)

TAG_COLORS = [
    "#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
    "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
]


def _pick_tag_color(existing_count: int) -> str:
    return TAG_COLORS[existing_count % len(TAG_COLORS)]


async def _get_or_create_tags(
    db: AsyncSession, tag_names: list[str], existing_tags: list[InsightTag]
) -> list[InsightTag]:
    tag_map = {t.name: t for t in existing_tags}
    result = []
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        if name in tag_map:
            result.append(tag_map[name])
        else:
            tag = InsightTag(name=name, color=_pick_tag_color(len(tag_map)))
            db.add(tag)
            await db.flush()
            tag_map[name] = tag
            result.append(tag)
    return result


async def create_insight(
    db: AsyncSession, raw_input: str, source: str = "manual"
) -> Insight:
    existing_tags = (await db.execute(select(InsightTag))).scalars().all()
    existing_tag_names = [t.name for t in existing_tags]

    prompt_text = build_insight_prompt(raw_input, existing_tag_names)
    messages = [{"role": "user", "content": prompt_text}]

    content = raw_input
    summary = None
    tag_names: list[str] = []

    try:
        ai_result = await qwen_client.chat(messages, temperature=0.3)
        ai_result = ai_result.strip()
        if ai_result.startswith("```"):
            lines = ai_result.split("\n")
            ai_result = "\n".join(lines[1:-1]) if len(lines) > 2 else ai_result

        parsed = json.loads(ai_result)
        content = parsed.get("content", raw_input)
        summary = parsed.get("summary")
        tag_names = parsed.get("tags", [])
        if not isinstance(tag_names, list):
            tag_names = []
    except Exception as e:
        logger.warning("AI 改写失败，使用原始输入: %s", e)

    tags = await _get_or_create_tags(db, tag_names, list(existing_tags))

    insight = Insight(
        raw_input=raw_input,
        content=content,
        summary=summary,
        source=source,
        is_pinned=False,
    )
    insight.tags = tags
    db.add(insight)
    await db.flush()
    await db.refresh(insight, attribute_names=["tags"])
    return insight


async def get_insights(
    db: AsyncSession,
    *,
    tag_id: int | None = None,
    keyword: str | None = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
) -> tuple[list[Insight], int]:
    query = select(Insight).options(selectinload(Insight.tags))

    if tag_id is not None:
        query = query.join(InsightTagLink).where(InsightTagLink.c.tag_id == tag_id)

    if keyword:
        pattern = f"%{keyword}%"
        query = query.where(
            Insight.content.ilike(pattern) | Insight.summary.ilike(pattern)
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    order_cols = [Insight.is_pinned.desc()]
    if sort_by == "updated_at":
        order_cols.append(Insight.updated_at.desc())
    else:
        order_cols.append(Insight.created_at.desc())

    query = query.order_by(*order_cols).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().unique().all()), total


async def get_insight(db: AsyncSession, insight_id: int) -> Insight | None:
    result = await db.execute(
        select(Insight)
        .options(selectinload(Insight.tags))
        .where(Insight.id == insight_id)
    )
    return result.scalars().first()


async def update_insight(
    db: AsyncSession, insight_id: int, data: dict
) -> Insight | None:
    insight = await get_insight(db, insight_id)
    if insight is None:
        return None

    if "content" in data and data["content"] is not None:
        insight.content = data["content"]
    if "summary" in data and data["summary"] is not None:
        insight.summary = data["summary"]

    if "tag_ids" in data and data["tag_ids"] is not None:
        tag_result = await db.execute(
            select(InsightTag).where(InsightTag.id.in_(data["tag_ids"]))
        )
        insight.tags = list(tag_result.scalars().all())

    insight.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(insight, attribute_names=["tags"])
    return insight


async def delete_insight(db: AsyncSession, insight_id: int) -> bool:
    insight = await get_insight(db, insight_id)
    if insight is None:
        return False
    await db.delete(insight)
    await db.flush()
    return True


async def toggle_pin(db: AsyncSession, insight_id: int) -> Insight | None:
    insight = await get_insight(db, insight_id)
    if insight is None:
        return None
    insight.is_pinned = not insight.is_pinned
    insight.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(insight, attribute_names=["tags"])
    return insight


async def rewrite_insight(db: AsyncSession, insight_id: int) -> Insight | None:
    insight = await get_insight(db, insight_id)
    if insight is None:
        return None
    if not insight.raw_input:
        return insight

    existing_tags = (await db.execute(select(InsightTag))).scalars().all()
    existing_tag_names = [t.name for t in existing_tags]

    prompt_text = build_insight_prompt(insight.raw_input, existing_tag_names)
    messages = [{"role": "user", "content": prompt_text}]

    try:
        ai_result = await qwen_client.chat(messages, temperature=0.3)
        ai_result = ai_result.strip()
        if ai_result.startswith("```"):
            lines = ai_result.split("\n")
            ai_result = "\n".join(lines[1:-1]) if len(lines) > 2 else ai_result

        parsed = json.loads(ai_result)
        insight.content = parsed.get("content", insight.content)
        insight.summary = parsed.get("summary", insight.summary)

        tag_names = parsed.get("tags", [])
        if isinstance(tag_names, list) and tag_names:
            tags = await _get_or_create_tags(db, tag_names, list(existing_tags))
            insight.tags = tags
    except Exception as e:
        logger.warning("AI 重新改写失败: %s", e)
        raise

    insight.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(insight, attribute_names=["tags"])
    return insight


async def get_tags(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(InsightTag))
    tags = result.scalars().all()

    tag_list = []
    for tag in tags:
        count_q = select(func.count()).select_from(InsightTagLink).where(
            InsightTagLink.c.tag_id == tag.id
        )
        count = (await db.execute(count_q)).scalar() or 0
        tag_list.append({
            "id": tag.id,
            "name": tag.name,
            "color": tag.color,
            "insight_count": count,
            "created_at": tag.created_at,
        })
    return tag_list


async def create_tag(db: AsyncSession, name: str, color: str | None = None) -> InsightTag:
    existing = (await db.execute(select(InsightTag))).scalars().all()
    if color is None:
        color = _pick_tag_color(len(existing))
    tag = InsightTag(name=name, color=color)
    db.add(tag)
    await db.flush()
    return tag


async def update_tag(
    db: AsyncSession, tag_id: int, data: dict
) -> InsightTag | None:
    result = await db.execute(select(InsightTag).where(InsightTag.id == tag_id))
    tag = result.scalars().first()
    if tag is None:
        return None
    if "name" in data and data["name"] is not None:
        tag.name = data["name"]
    if "color" in data and data["color"] is not None:
        tag.color = data["color"]
    await db.flush()
    return tag


async def delete_tag(db: AsyncSession, tag_id: int) -> bool:
    result = await db.execute(select(InsightTag).where(InsightTag.id == tag_id))
    tag = result.scalars().first()
    if tag is None:
        return False
    await db.execute(
        delete(InsightTagLink).where(InsightTagLink.c.tag_id == tag_id)
    )
    await db.delete(tag)
    await db.flush()
    return True


async def merge_tags(
    db: AsyncSession, source_tag_id: int, target_tag_id: int
) -> InsightTag | None:
    source_result = await db.execute(
        select(InsightTag).where(InsightTag.id == source_tag_id)
    )
    source_tag = source_result.scalars().first()
    target_result = await db.execute(
        select(InsightTag).where(InsightTag.id == target_tag_id)
    )
    target_tag = target_result.scalars().first()

    if source_tag is None or target_tag is None:
        return None

    source_links = await db.execute(
        select(InsightTagLink.c.insight_id).where(
            InsightTagLink.c.tag_id == source_tag_id
        )
    )
    source_insight_ids = [row[0] for row in source_links.all()]

    target_links = await db.execute(
        select(InsightTagLink.c.insight_id).where(
            InsightTagLink.c.tag_id == target_tag_id
        )
    )
    target_insight_ids = set(row[0] for row in target_links.all())

    for insight_id in source_insight_ids:
        if insight_id not in target_insight_ids:
            await db.execute(
                InsightTagLink.insert().values(
                    insight_id=insight_id, tag_id=target_tag_id
                )
            )

    await db.execute(
        delete(InsightTagLink).where(InsightTagLink.c.tag_id == source_tag_id)
    )
    await db.delete(source_tag)
    await db.flush()
    return target_tag
