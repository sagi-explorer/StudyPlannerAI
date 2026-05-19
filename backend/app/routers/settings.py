from __future__ import annotations

import csv
import io
from datetime import date, datetime
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_settings
from app.database import get_db
from app.models.category import Category
from app.models.conversation import Conversation
from app.models.focus_session import FocusSession
from app.models.goal import Goal
from app.models.insight import Insight, InsightTagLink
from app.models.insight_tag import InsightTag
from app.models.message import Message
from app.models.review import Review
from app.models.setting import Setting
from app.models.task import Task
from app.schemas.setting import SettingUpdate, SettingResponse
from app.services import setting_service

router = APIRouter(prefix="/api/settings", tags=["settings"])

_SCHEDULE_KEYS = frozenset({"daily_review_time", "weekly_review_day"})

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def _row_to_dict(row) -> dict:
    d: dict = {}
    for c in row.__table__.columns:
        v = getattr(row, c.key)
        if isinstance(v, (datetime, date)):
            v = v.isoformat()
        d[c.key] = v
    return d


# ── existing CRUD ──────────────────────────────────────────────


@router.get("", response_model=list[SettingResponse])
async def list_settings(db: AsyncSession = Depends(get_db)):
    return await setting_service.get_all_settings(db)


@router.put("", response_model=SettingResponse)
async def update_setting(
    data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await setting_service.update_setting(db, data.key, data.value)
    if data.key in _SCHEDULE_KEYS:
        from app.services.scheduler_service import update_schedule
        await update_schedule()
    return result


# ── export: full JSON ──────────────────────────────────────────


@router.get("/export/json")
async def export_json(db: AsyncSession = Depends(get_db)):
    tables = {
        "tasks": Task,
        "goals": Goal,
        "categories": Category,
        "settings": Setting,
        "conversations": Conversation,
        "messages": Message,
        "focus_sessions": FocusSession,
        "reviews": Review,
        "insights": Insight,
        "insight_tags": InsightTag,
    }
    payload: dict = {}
    for key, model in tables.items():
        rows = (await db.execute(select(model))).scalars().all()
        payload[key] = [_row_to_dict(r) for r in rows]

    link_rows = (await db.execute(select(InsightTagLink))).fetchall()
    payload["insight_tag_links"] = [
        {"insight_id": r[0], "tag_id": r[1]} for r in link_rows
    ]
    return JSONResponse(content=payload)


# ── export: tasks CSV ──────────────────────────────────────────

_CSV_COLUMNS = [
    "id", "title", "category_id", "priority", "status",
    "due_date", "created_at", "estimated_minutes", "actual_minutes",
    "postpone_count",
]


@router.get("/export/tasks/csv")
async def export_tasks_csv(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Task))).scalars().all()

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for t in rows:
        d = _row_to_dict(t)
        focus = getattr(t, "focus_sessions", None) or []
        d["estimated_minutes"] = sum(
            (s.planned_minutes or 0) for s in focus
        )
        d["actual_minutes"] = sum(
            (s.actual_minutes or 0) for s in focus
        )
        writer.writerow(d)

    raw = buf.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(raw),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=tasks_export.csv",
        },
    )


# ── .env helper ───────────────────────────────────────────────


def _update_env_var(key: str, value: str) -> None:
    lines: list[str] = []
    found = False
    prefix = f"{key}="

    if _ENV_PATH.exists():
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            if line.startswith(prefix):
                lines.append(f"{key}={value}")
                found = True
            else:
                lines.append(line)

    if not found:
        lines.append(f"{key}={value}")

    _ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ── API key management ─────────────────────────────────────────


class _ApiKeyBody(BaseModel):
    api_key: str


@router.put("/apikey")
async def update_api_key(body: _ApiKeyBody):
    _update_env_var("QWEN_API_KEY", body.api_key)
    app_settings.QWEN_API_KEY = body.api_key
    return {"status": "ok"}


@router.get("/apikey/status")
async def api_key_status():
    configured = bool(app_settings.QWEN_API_KEY and app_settings.QWEN_API_KEY.strip())
    return {"configured": configured}


@router.post("/apikey/test")
async def test_api_key():
    key = app_settings.QWEN_API_KEY
    if not key or not key.strip():
        return {"success": False, "message": "API Key 未配置"}

    try:
        async with httpx.AsyncClient(timeout=15, verify=False) as client:
            resp = await client.post(
                f"{app_settings.QWEN_API_URL}/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": app_settings.QWEN_MODEL,
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 8,
                },
            )
        if resp.status_code == 200:
            return {"success": True, "message": "API Key 验证成功"}
        return {
            "success": False,
            "message": f"API 返回 {resp.status_code}: {resp.text[:200]}",
        }
    except httpx.TimeoutException:
        return {"success": False, "message": "请求超时，请检查网络连接"}
    except Exception as exc:
        return {"success": False, "message": f"连接失败: {exc}"}


# ── Model management ──────────────────────────────────────────


class _ModelBody(BaseModel):
    model: str


@router.get("/model")
async def get_model():
    return {"model": app_settings.QWEN_MODEL}


@router.put("/model")
async def update_model(body: _ModelBody):
    _update_env_var("QWEN_MODEL", body.model)
    app_settings.QWEN_MODEL = body.model
    return {"status": "ok", "model": body.model}
