from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    claude_default_model: str = "claude-sonnet-4-6"
    claude_vision_model: str = "claude-sonnet-4-6"

    replicate_api_token: str = ""
    # Replicate model slugs (owner/name; the latest version is used). Overridable
    # so models can be pinned/rotated without a code change.
    replicate_staging_model: str = "adirik/interior-design"
    replicate_relight_model: str = "zsxkib/ic-light"
    # LaMa object removal: image + mask (white = remove). See replicate.remove_object.
    replicate_inpaint_model: str = "zylim0702/remove-object"

    clipdrop_api_key: str = ""

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "eu-west-2"

    # Shared HMAC secret for orchestrator -> API callbacks.
    ai_callback_secret: str = ""

    # Cloudflare R2 (S3-compatible) — orchestrator uploads enhanced/staged
    # outputs directly, then POSTs the resulting URL to the API.
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_base_url: str = ""


def get_settings() -> Settings:
    return Settings()
