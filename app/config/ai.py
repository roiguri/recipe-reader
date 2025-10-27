"""
AI model configuration for the Recipe Reader API.

This module centralizes AI model selection for Google Gemini services,
providing a single source of truth for model names used across all services.

Configuration:
    Set the GEMINI_MODEL_NAME environment variable to override the default model:

    GEMINI_MODEL_NAME="gemini-2.5-pro"

    If not set, defaults to gemini-2.5-flash (best price-performance).

Available Gemini Models (as of 2025):
    - gemini-2.5-flash (default): Best price-performance, supports text and vision
    - gemini-2.5-pro: More powerful for complex reasoning tasks
    - gemini-2.5-flash-lite: Fastest, most cost-efficient option
    - gemini-2.5-flash-image: Specialized for multimodal with image generation
"""

import os


# Gemini Model Configuration
# Default: gemini-2.5-flash (best price-performance, supports text and vision)
# Override via environment: GEMINI_MODEL_NAME=gemini-2.5-pro
GEMINI_MODEL = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")


class AIConfig:
    """AI service configuration settings."""

    def __init__(self):
        """Initialize AI configuration from environment variables."""
        self._model_name = GEMINI_MODEL

    @property
    def gemini_model(self) -> str:
        """
        Get the configured Gemini model name.

        Returns:
            str: The Gemini model identifier (e.g., "gemini-2.5-flash")
        """
        return self._model_name

    def __repr__(self) -> str:
        """String representation of AI configuration."""
        return f"AIConfig(gemini_model='{self._model_name}')"


# Global AI configuration instance
ai_config = AIConfig()
