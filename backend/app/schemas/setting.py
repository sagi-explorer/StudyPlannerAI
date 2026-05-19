from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: str
    updated_at: datetime | None
