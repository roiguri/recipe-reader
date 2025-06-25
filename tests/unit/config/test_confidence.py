"""
Tests for confidence scoring configuration.

This module tests the confidence score constants and validation
used for recipe processing from different sources.
"""

import pytest
from app.config.confidence import (
    URL_EXTRACTION_CONFIDENCE_WEIGHT,
    AI_PROCESSING_CONFIDENCE_WEIGHT
)


class TestConfidenceConstants:
    """Test cases for confidence scoring constants."""
    
    def test_confidence_weights_exist(self):
        """Test that confidence weight constants are defined."""
        assert URL_EXTRACTION_CONFIDENCE_WEIGHT is not None
        assert AI_PROCESSING_CONFIDENCE_WEIGHT is not None
    
    def test_confidence_weights_are_numeric(self):
        """Test that confidence weights are numeric values."""
        assert isinstance(URL_EXTRACTION_CONFIDENCE_WEIGHT, (int, float))
        assert isinstance(AI_PROCESSING_CONFIDENCE_WEIGHT, (int, float))
    
    def test_confidence_weights_are_positive(self):
        """Test that confidence weights are positive values."""
        assert URL_EXTRACTION_CONFIDENCE_WEIGHT > 0
        assert AI_PROCESSING_CONFIDENCE_WEIGHT > 0
    
    def test_confidence_weights_sum_to_one(self):
        """Test that confidence weights sum to 1.0 for proper normalization."""
        total = URL_EXTRACTION_CONFIDENCE_WEIGHT + AI_PROCESSING_CONFIDENCE_WEIGHT
        assert total == 1.0, f"Weights sum to {total}, should be 1.0"
    
    def test_confidence_weights_within_valid_range(self):
        """Test that individual weights are between 0 and 1."""
        assert 0 < URL_EXTRACTION_CONFIDENCE_WEIGHT < 1
        assert 0 < AI_PROCESSING_CONFIDENCE_WEIGHT < 1
    
    def test_confidence_weights_logical_distribution(self):
        """Test that AI processing has higher weight than URL extraction."""
        # This reflects the design decision that AI processing confidence
        # should be weighted more heavily than URL extraction confidence
        assert AI_PROCESSING_CONFIDENCE_WEIGHT > URL_EXTRACTION_CONFIDENCE_WEIGHT
    
    def test_confidence_calculation_example(self):
        """Test example confidence score calculation."""
        # Example: URL extraction confidence = 0.8, AI processing confidence = 0.9
        url_confidence = 0.8
        ai_confidence = 0.9
        
        combined_confidence = (
            url_confidence * URL_EXTRACTION_CONFIDENCE_WEIGHT +
            ai_confidence * AI_PROCESSING_CONFIDENCE_WEIGHT
        )
        
        # Should be weighted average favoring AI processing
        expected = 0.8 * 0.3 + 0.9 * 0.7  # 0.24 + 0.63 = 0.87
        assert abs(combined_confidence - expected) < 0.001
    
    def test_confidence_boundary_cases(self):
        """Test confidence calculation with boundary values."""
        # Test with minimum confidence (0.0)
        min_combined = (
            0.0 * URL_EXTRACTION_CONFIDENCE_WEIGHT +
            0.0 * AI_PROCESSING_CONFIDENCE_WEIGHT
        )
        assert min_combined == 0.0
        
        # Test with maximum confidence (1.0)
        max_combined = (
            1.0 * URL_EXTRACTION_CONFIDENCE_WEIGHT +
            1.0 * AI_PROCESSING_CONFIDENCE_WEIGHT
        )
        assert max_combined == 1.0
    
    def test_module_assertion_validation(self):
        """Test that the module's assertion passes (weights sum to 1.0)."""
        # This test ensures the assertion in the module itself is valid
        # If the assertion fails, the module import would fail
        try:
            # Re-import to trigger the assertion check
            import app.config.confidence
            assert True  # If we get here, assertion passed
        except AssertionError:
            pytest.fail("Module assertion failed: confidence weights don't sum to 1.0")