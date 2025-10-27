"""Configuration module for the recipe reader application."""

# Import configuration components for easy access
from app.config.ai import GEMINI_MODEL, ai_config
from app.config.security import security_config

__all__ = [
    'GEMINI_MODEL',
    'ai_config',
    'security_config',
]