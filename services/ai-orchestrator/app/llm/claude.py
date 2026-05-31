"""Single chokepoint for Anthropic SDK calls.

All Claude requests must go through this module. Never hardcode model strings
in callers — they read them from env via `Settings.claude_default_model` /
`Settings.claude_vision_model`.
"""

from anthropic import AsyncAnthropic

from app.config import get_settings


def get_client() -> AsyncAnthropic:
    settings = get_settings()
    return AsyncAnthropic(api_key=settings.anthropic_api_key)
