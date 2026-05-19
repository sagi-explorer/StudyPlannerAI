import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.config import settings
from app.prompts.task_parse import build_task_parse_prompt

logger = logging.getLogger(__name__)


class QwenAPIError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Qwen API error {status_code}: {detail}")


class QwenClient:
    def __init__(self) -> None:
        self._base_url = settings.QWEN_API_URL
        self._default_model = settings.QWEN_MODEL
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers={
                    "Authorization": f"Bearer {settings.QWEN_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(60.0, connect=10.0),
                verify=False,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _check_api_key(self) -> None:
        if not settings.QWEN_API_KEY:
            raise QwenAPIError(
                status_code=401,
                detail="未配置 QWEN_API_KEY，请在 .env 文件中设置",
            )

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.7,
    ) -> str:
        self._check_api_key()
        payload = {
            "model": model or self._default_model,
            "messages": messages,
            "stream": False,
            "temperature": temperature,
        }
        client = self._get_client()
        try:
            resp = await client.post("/chat/completions", json=payload)
        except httpx.RequestError as exc:
            raise QwenAPIError(status_code=502, detail=f"网络请求失败: {exc}") from exc

        if resp.status_code != 200:
            raise QwenAPIError(
                status_code=resp.status_code,
                detail=resp.text,
            )
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        self._check_api_key()
        payload = {
            "model": model or self._default_model,
            "messages": messages,
            "stream": True,
            "temperature": temperature,
        }
        client = self._get_client()
        try:
            async with client.stream(
                "POST", "/chat/completions", json=payload
            ) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    raise QwenAPIError(
                        status_code=resp.status_code,
                        detail=body.decode("utf-8", errors="replace"),
                    )
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[len("data: "):]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except httpx.RequestError as exc:
            raise QwenAPIError(status_code=502, detail=f"流式请求失败: {exc}") from exc

    async def parse_tasks(
        self,
        user_input: str,
        today: str,
        categories: list[str],
    ) -> list[dict[str, Any]]:
        system_prompt = build_task_parse_prompt(today, categories)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ]

        max_retries = 2
        for attempt in range(max_retries + 1):
            raw = await self.chat(messages, temperature=0.3)
            raw = raw.strip()

            extracted = self._extract_json_array(raw)
            if extracted is not None:
                return extracted

            logger.warning(
                "任务解析 JSON 失败 (第 %d 次): %s", attempt + 1, raw[:200]
            )
            if attempt < max_retries:
                messages.append({"role": "assistant", "content": raw})
                messages.append(
                    {
                        "role": "user",
                        "content": "返回格式不正确，请直接返回 JSON 数组，不要包含任何其他文字。",
                    }
                )
        return []

    @staticmethod
    def _extract_json_array(text: str) -> list[dict[str, Any]] | None:
        import re
        code_block = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
        if code_block:
            text = code_block.group(1).strip()

        bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
        if bracket_match:
            text = bracket_match.group(0)

        try:
            result = json.loads(text)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass
        return None


qwen_client = QwenClient()
