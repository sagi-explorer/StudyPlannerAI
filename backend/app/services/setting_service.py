from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting


async def get_all_settings(db: AsyncSession) -> list[Setting]:
    result = await db.execute(select(Setting))
    return list(result.scalars().all())


async def update_setting(db: AsyncSession, key: str, value: str) -> Setting:
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalars().first()
    if setting is None:
        setting = Setting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(setting)
    return setting
