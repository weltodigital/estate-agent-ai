from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    claude_default_model: str = "claude-sonnet-4-6"
    claude_vision_model: str = "claude-sonnet-4-6"

    replicate_api_token: str = ""
    clipdrop_api_key: str = ""

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "eu-west-2"

    ai_callback_secret: str = ""


def get_settings() -> Settings:
    return Settings()
