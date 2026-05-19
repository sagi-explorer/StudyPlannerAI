import json
import logging
import re
from datetime import date


from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.category import Category
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import (
    ChatRequest,
    ConversationCreate,
    ConversationResponse,
    MessageResponse,
)
from app.schemas.task import TaskCreate
from app.services.ai_service import QwenAPIError, qwen_client
from app.services.context_service import (
    build_system_context,
    compress_conversation,
    get_conversation_messages,
)
from app.services.task_service import create_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["conversations"])


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
):
    conv = Conversation(title=data.title)
    db.add(conv)
    await db.flush()
    await db.refresh(conv)
    return conv


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def list_messages(
    conversation_id: int,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    msgs = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id)
    )
    for msg in msgs.scalars().all():
        await db.delete(msg)
    await db.delete(conv)
    await db.commit()


@router.post("/chat")
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    if data.conversation_id is not None:
        conv = await db.get(Conversation, data.conversation_id)
        if conv is None:
            raise HTTPException(status_code=404, detail="会话不存在")
    else:
        conv = Conversation(title=None)
        db.add(conv)
        await db.flush()
        await db.refresh(conv)

    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    await db.flush()

    try:
        system_prompt = await build_system_context(db)
    except Exception:
        logger.exception("构建系统上下文失败")
        system_prompt = "你是一个学习/工作计划管理助手。"

    history = await get_conversation_messages(db, conv.id, limit=10)

    messages = [{"role": "system", "content": system_prompt}]
    if conv.summary:
        messages.append(
            {"role": "system", "content": f"之前的对话摘要：{conv.summary}"}
        )
    messages.extend(history)

    async def event_stream():
        full_reply = []
        try:
            async for chunk in qwen_client.chat_stream(messages):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            logger.exception("SSE 流中发生异常")
            error_detail = getattr(exc, "detail", str(exc))
            error_payload = json.dumps(
                {"error": error_detail}, ensure_ascii=False
            )
            yield f"data: {error_payload}\n\n"
            yield "data: [DONE]\n\n"
            return

        reply_text = "".join(full_reply)

        yield f"data: {json.dumps({'stream_end': True, 'conversation_id': conv.id}, ensure_ascii=False)}\n\n"

        assistant_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=reply_text,
        )
        db.add(assistant_msg)

        if conv.title is None and reply_text:
            conv.title = data.content[:30]

        await db.flush()

        tasks_result = await _try_auto_create_tasks(db, data.content, reply_text)

        strictness_result = await _try_adjust_strictness(db, data.content, reply_text)

        await compress_conversation(db, conv.id)

        await db.commit()

        post_payload: dict = {}
        if tasks_result:
            post_payload["tasks_created"] = tasks_result
        if strictness_result is not None:
            post_payload["strictness_updated"] = strictness_result
        if post_payload:
            yield f"data: {json.dumps(post_payload, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    try:
        qwen_client._check_api_key()
    except QwenAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _try_auto_create_tasks(
    db: AsyncSession,
    user_input: str,
    ai_reply: str,
) -> list[dict] | None:
    try:
        cat_result = await db.execute(select(Category))
        categories = [c.name for c in cat_result.scalars().all()]
        today_str = date.today().isoformat()

        parsed = await qwen_client.parse_tasks(user_input, today_str, categories)
        if not parsed:
            return None

        cat_map_result = await db.execute(select(Category))
        cat_map = {c.name: c.id for c in cat_map_result.scalars().all()}

        created_tasks = []
        for task_data in parsed:
            category_name = task_data.get("category", "")
            category_id = cat_map.get(category_name)
            if category_id is None and cat_map:
                category_id = next(iter(cat_map.values()))

            due_date = task_data.get("due_date")
            if isinstance(due_date, str):
                try:
                    from datetime import date as date_cls
                    due_date = date_cls.fromisoformat(due_date)
                except ValueError:
                    due_date = None

            priority = task_data.get("priority", "medium")
            if priority not in ("low", "medium", "high", "urgent"):
                priority = "medium"

            task_create = TaskCreate(
                category_id=category_id,
                title=task_data.get("title", "未命名任务"),
                description=task_data.get("description"),
                priority=priority,
                due_date=due_date,
            )
            task = await create_task(db, task_create)
            created_tasks.append({
                "title": task.title,
                "category": category_name,
                "due_date": str(task.due_date) if task.due_date else None,
                "priority": task.priority,
            })
        return created_tasks if created_tasks else None
    except Exception:
        logger.exception("自动创建任务失败")
        return None


_STRICTNESS_KEYWORDS = {
    "温和": 1, "温柔": 1, "鼓励": 1,
    "友善": 2, "友好": 2,
    "中性": 3, "客观": 3, "默认": 3,
    "严格": 4, "严厉": 4,
    "毒舌": 5, "鞭策": 5, "狠": 5,
}


async def _try_adjust_strictness(
    db: AsyncSession,
    user_input: str,
    ai_reply: str,
) -> int | None:
    combined = user_input + " " + ai_reply
    if not re.search(r"(调整|改|换|设|切换).{0,6}(风格|严厉|语气|程度)", combined):
        return None

    digit = re.search(r"(?:等级|级别|程度)\s*[：:]?\s*(\d)", combined)
    if digit:
        level = int(digit.group(1))
        if 1 <= level <= 5:
            return await _apply_strictness(db, level)

    for keyword, level in _STRICTNESS_KEYWORDS.items():
        if keyword in combined:
            return await _apply_strictness(db, level)

    return None


async def _apply_strictness(db: AsyncSession, level: int) -> int:
    from app.models.setting import Setting

    result = await db.execute(
        select(Setting).where(Setting.key == "ai_strictness")
    )
    row = result.scalars().first()
    if row:
        row.value = str(level)
    else:
        db.add(Setting(key="ai_strictness", value=str(level)))
    await db.flush()
    return level
