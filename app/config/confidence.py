"""
Confidence scoring configuration for recipe processing.

This module contains configuration constants used for calculating
confidence scores when processing recipes from different sources.
"""

# Confidence score weighting constants for URL-based recipe processing
URL_EXTRACTION_CONFIDENCE_WEIGHT = 0.3
AI_PROCESSING_CONFIDENCE_WEIGHT = 0.7

# Ensure weights sum to 1.0 for proper normalization
assert URL_EXTRACTION_CONFIDENCE_WEIGHT + AI_PROCESSING_CONFIDENCE_WEIGHT == 1.0, \
    "Confidence weights must sum to 1.0"