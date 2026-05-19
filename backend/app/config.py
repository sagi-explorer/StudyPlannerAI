from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite+aiosqlite:///./studyplanner.db"
    QWEN_API_KEY: str = ""
    QWEN_API_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    QWEN_MODEL: str = "qwen3.5-plus"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DEBUG: bool = True


settings = Settings()
