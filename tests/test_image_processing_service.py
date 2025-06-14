# tests/test_image_processing_service.py
import pytest
import json
import os
import sys
import base64
from unittest.mock import patch, MagicMock
from pathlib import Path
from PIL import Image
from io import BytesIO

# Add the project root directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import modules
from app.services.image_processing_service import ImageProcessingService
from app.models.recipe import RecipeResponse, RecipeBase, ImageProcessRequest


class MockGeminiResponse:
    """Mock response object for Gemini Vision API"""
    def __init__(self, text):
        self.text = text


def create_test_image(width=800, height=600, format='JPEG'):
    """Create a test image in bytes format."""
    image = Image.new('RGB', (width, height), color='white')
    # Add some text-like content
    from PIL import ImageDraw
    draw = ImageDraw.Draw(image)
    draw.text((50, 50), "Test Recipe Image", fill='black')
    
    buffer = BytesIO()
    image.save(buffer, format=format)
    return buffer.getvalue()


def image_to_base64(image_bytes, format='JPEG'):
    """Convert image bytes to base64 string."""
    b64_string = base64.b64encode(image_bytes).decode('utf-8')
    return f"data:image/{format.lower()};base64,{b64_string}"


@pytest.mark.asyncio
async def test_image_processing_service_initialization():
    """Test ImageProcessingService initialization with and without API key."""
    # Test with API key
    service = ImageProcessingService(api_key="test_key")
    assert service.available is True
    assert hasattr(service, 'client')
    assert service.max_image_size == 4 * 1024 * 1024
    assert service.supported_formats == {'JPEG', 'PNG', 'WEBP', 'GIF'}
    
    # Test without API key
    with patch.dict('os.environ', {}, clear=True):
        service = ImageProcessingService()
        assert service.available is False


@pytest.mark.asyncio
async def test_image_processing_valid_formats():
    """Test image processing with different valid formats."""
    service = ImageProcessingService(api_key="test_key")
    
    # Test different formats
    formats = ['JPEG', 'PNG', 'WEBP']
    
    for format in formats:
        image_bytes = create_test_image(format=format)
        result = await service._process_image(image_bytes, {})
        
        assert result['mime_type'] == 'image/jpeg'  # All converted to JPEG
        assert result['data'] is not None
        assert result['dimensions'] == (800, 600)
        assert 0.1 <= result['quality_score'] <= 1.0


@pytest.mark.asyncio
async def test_image_processing_base64_input():
    """Test image processing with base64 encoded input."""
    service = ImageProcessingService(api_key="test_key")
    
    # Create test image and convert to base64
    image_bytes = create_test_image()
    base64_string = image_to_base64(image_bytes)
    
    result = await service._process_image(base64_string, {})
    
    assert result['mime_type'] == 'image/jpeg'
    assert result['data'] is not None
    assert result['dimensions'] == (800, 600)


@pytest.mark.asyncio
async def test_image_processing_size_limits():
    """Test image processing with size limits."""
    service = ImageProcessingService(api_key="test_key")
    
    # Test oversized image (should be resized)
    large_image = create_test_image(width=3000, height=3000)
    result = await service._process_image(large_image, {})
    
    # Should be resized to max_dimension
    max_dim = max(result['dimensions'])
    assert max_dim <= service.max_dimension


@pytest.mark.asyncio
async def test_image_processing_invalid_data():
    """Test image processing with invalid data."""
    service = ImageProcessingService(api_key="test_key")
    
    # Test invalid base64
    with pytest.raises(ValueError, match="Invalid image data"):
        await service._process_image("invalid_base64", {})
    
    # Test non-image data
    invalid_data = base64.b64encode(b"not an image").decode('utf-8')
    with pytest.raises(ValueError, match="Invalid image data"):
        await service._process_image(invalid_data, {})


@pytest.mark.asyncio
async def test_image_quality_calculation():
    """Test image quality score calculation."""
    service = ImageProcessingService(api_key="test_key")
    
    # High resolution image
    high_res_image = Image.new('RGB', (2000, 1500), color='white')
    quality_high = service._calculate_image_quality(high_res_image, (2000, 1500))
    
    # Low resolution image
    low_res_image = Image.new('RGB', (200, 150), color='white')
    quality_low = service._calculate_image_quality(low_res_image, (200, 150))
    
    # High resolution should have better quality score
    assert quality_high > quality_low
    assert 0.1 <= quality_high <= 1.0
    assert 0.1 <= quality_low <= 1.0


@pytest.mark.asyncio
async def test_extract_recipe_from_image_success():
    """Test successful recipe extraction from image."""
    service = ImageProcessingService(api_key="test_key")
    
    # Mock API response
    mock_response_data = {
        "name": "Test Recipe from Image",
        "description": "A recipe extracted from an image",
        "ingredients": [
            {"item": "flour", "amount": "2", "unit": "cups"},
            {"item": "sugar", "amount": "1", "unit": "cup"}
        ],
        "instructions": ["Mix ingredients", "Bake at 350F"],
        "stages": None,
        "prepTime": 10,
        "cookTime": 30,
        "totalTime": 40,
        "servings": 4,
        "tags": ["dessert"],
        "mainIngredient": "flour"
    }
    
    mock_response = MockGeminiResponse(json.dumps(mock_response_data))
    
    # Mock the client call
    with patch.object(service, 'client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        
        # Test image
        image_bytes = create_test_image()
        
        result = await service.extract_recipe_from_image(image_bytes)
        
        assert isinstance(result, RecipeResponse)
        assert result.recipe.name == "Test Recipe from Image"
        assert len(result.recipe.ingredients) == 2
        assert result.recipe.ingredients[0].item == "flour"
        assert result.confidence_score > 0.1
        assert result.processing_time > 0


@pytest.mark.asyncio
async def test_extract_recipe_from_image_with_options():
    """Test recipe extraction with various options."""
    service = ImageProcessingService(api_key="test_key")
    
    mock_response_data = {
        "name": "Structured Recipe",
        "description": "A recipe with stages",
        "ingredients": [{"item": "test", "amount": "1", "unit": "cup"}],
        "instructions": None,
        "stages": [
            {"title": "Preparation", "instructions": ["Prepare ingredients"]},
            {"title": "Cooking", "instructions": ["Cook the dish"]}
        ],
        "prepTime": None,
        "cookTime": None,
        "totalTime": None,
        "servings": None,
        "tags": [],
        "mainIngredient": None
    }
    
    mock_response = MockGeminiResponse(json.dumps(mock_response_data))
    
    with patch.object(service, 'client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        
        options = {
            "format_type": "structured",
            "temperature": 0.2,
            "max_retries": 2,
            "use_cache": False
        }
        
        image_bytes = create_test_image()
        result = await service.extract_recipe_from_image(image_bytes, options)
        
        assert result.recipe.stages is not None
        assert len(result.recipe.stages) == 2
        assert result.recipe.instructions is None


@pytest.mark.asyncio
async def test_extract_recipe_fallback():
    """Test fallback behavior when extraction fails."""
    service = ImageProcessingService(api_key="test_key")
    
    # Mock client to raise exception
    with patch.object(service, 'client') as mock_client:
        mock_client.models.generate_content.side_effect = Exception("API Error")
        
        image_bytes = create_test_image()
        options = {"max_retries": 1}  # Reduce retries for faster test
        
        result = await service.extract_recipe_from_image(image_bytes, options)
        
        assert isinstance(result, RecipeResponse)
        assert result.recipe.name == "Image Processing Failed"
        assert result.confidence_score == 0.1  # Low confidence for fallback
        assert "image-extraction-failed" in result.recipe.tags


@pytest.mark.asyncio
async def test_image_cache_functionality():
    """Test caching functionality for image processing."""
    service = ImageProcessingService(api_key="test_key")
    
    mock_response_data = {
        "name": "Cached Recipe",
        "description": "Test caching",
        "ingredients": [{"item": "test", "amount": "1", "unit": "cup"}],
        "instructions": ["Test instruction"],
        "stages": None,
        "prepTime": None,
        "cookTime": None,
        "totalTime": None,
        "servings": None,
        "tags": [],
        "mainIngredient": None
    }
    
    mock_response = MockGeminiResponse(json.dumps(mock_response_data))
    
    with patch.object(service, 'client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        
        image_bytes = create_test_image()
        
        # First call - should hit API
        result1 = await service.extract_recipe_from_image(image_bytes, {"use_cache": True})
        
        # Second call - should use cache
        result2 = await service.extract_recipe_from_image(image_bytes, {"use_cache": True})
        
        # Should have called API only once
        assert mock_client.models.generate_content.call_count == 1
        
        # Results should be similar
        assert result1.recipe.name == result2.recipe.name


def test_image_process_request_validation():
    """Test ImageProcessRequest validation for single and multiple images."""
    # Valid single image
    image_bytes = create_test_image()
    valid_b64 = image_to_base64(image_bytes)
    
    request = ImageProcessRequest(image_data=valid_b64, options={})
    assert request.image_data == valid_b64
    
    # Valid multiple images
    image_list = [valid_b64, valid_b64]
    request_multi = ImageProcessRequest(image_data=image_list, options={})
    assert request_multi.image_data == image_list
    
    # Invalid base64 data (single)
    with pytest.raises(ValueError, match="Invalid base64 image data in image 1"):
        ImageProcessRequest(image_data="invalid_base64", options={})
    
    # Invalid base64 data (multiple)
    with pytest.raises(ValueError, match="Invalid base64 image data in image 2"):
        ImageProcessRequest(image_data=[valid_b64, "invalid_base64"], options={})
    
    # Empty list
    with pytest.raises(ValueError, match="At least one image is required"):
        ImageProcessRequest(image_data=[], options={})
    
    # Too many images
    too_many_images = [valid_b64] * 11
    with pytest.raises(ValueError, match="Maximum 10 images allowed"):
        ImageProcessRequest(image_data=too_many_images, options={})
    
    # Unsupported format
    unsupported_data = "data:image/bmp;base64," + base64.b64encode(b"test").decode()
    with pytest.raises(ValueError, match="Unsupported image format in image 1"):
        ImageProcessRequest(image_data=unsupported_data, options={})


@pytest.mark.asyncio
async def test_confidence_scoring():
    """Test confidence score calculation for image extraction."""
    service = ImageProcessingService(api_key="test_key")
    
    # Complete recipe data
    complete_recipe = {
        "name": "Complete Recipe",
        "ingredients": [
            {"item": "flour", "amount": "2", "unit": "cups"},
            {"item": "sugar", "amount": "1", "unit": "cup"},
            {"item": "eggs", "amount": "3", "unit": "units"}
        ],
        "instructions": ["Step 1", "Step 2", "Step 3"],
        "prepTime": 10,
        "cookTime": 30,
        "servings": 4,
        "mainIngredient": "flour",
        "tags": ["dessert", "baking"]
    }
    
    # Incomplete recipe data
    incomplete_recipe = {
        "name": "Incomplete Recipe",
        "ingredients": [{"item": "flour", "amount": "1", "unit": "cup"}],
        "instructions": ["Mix"],
        "prepTime": None,
        "cookTime": None,
        "servings": None,
        "mainIngredient": None,
        "tags": []
    }
    
    # High quality image
    high_quality_score = 0.8
    complete_confidence = service._calculate_image_confidence(complete_recipe, high_quality_score)
    
    # Low quality image  
    low_quality_score = 0.3
    incomplete_confidence = service._calculate_image_confidence(incomplete_recipe, low_quality_score)
    
    assert complete_confidence > incomplete_confidence
    assert complete_confidence <= 0.9  # Cap for images
    assert incomplete_confidence >= 0.1  # Minimum confidence


@pytest.mark.asyncio
async def test_multiple_images_processing():
    """Test processing multiple images for multi-page recipes."""
    service = ImageProcessingService(api_key="test_key")
    
    # Mock OCR responses for each image
    mock_ocr_responses = [
        "Recipe Title: Multi-Page Recipe\nIngredients:\n2 cups flour\n1 cup sugar",
        "Instructions:\n1. Mix flour and sugar\n2. Bake at 350F for 30 minutes"
    ]
    
    # Mock final recipe response from TextProcessor
    mock_recipe_data = {
        "name": "Multi-Page Recipe", 
        "ingredients": [
            {"item": "flour", "amount": "2", "unit": "cups"},
            {"item": "sugar", "amount": "1", "unit": "cup"}
        ],
        "instructions": ["Mix flour and sugar", "Bake at 350F for 30 minutes"],
        "stages": None,
        "prepTime": None,
        "cookTime": 30,
        "totalTime": None,
        "servings": None,
        "tags": [],
        "mainIngredient": "flour"
    }
    
    # Mock the OCR calls
    with patch.object(service, '_extract_text_from_image') as mock_ocr:
        mock_ocr.side_effect = mock_ocr_responses
        
        # Mock the TextProcessor
        with patch.object(service.text_processor, 'process_text') as mock_text_processor:
            mock_text_processor.return_value = RecipeResponse(
                recipe=service._convert_to_recipe_model(mock_recipe_data),
                confidence_score=0.85,
                processing_time=1.0
            )
            
            # Test with multiple images
            image_bytes = create_test_image()
            image_list = [image_to_base64(image_bytes), image_to_base64(image_bytes)]
            
            result = await service.extract_recipe_from_image(image_list)
            
            assert isinstance(result, RecipeResponse)
            assert result.recipe.name == "Multi-Page Recipe"
            assert len(result.recipe.ingredients) == 2
            assert result.confidence_score > 0.8  # Should be boosted for multi-image
            
            # Verify OCR was called for each image
            assert mock_ocr.call_count == 2
            
            # Verify consolidated text was processed
            mock_text_processor.assert_called_once()
            call_args = mock_text_processor.call_args
            consolidated_text = call_args[0][0]
            assert "MULTI-PAGE RECIPE" in consolidated_text
            assert "PAGE 1" in consolidated_text
            assert "PAGE 2" in consolidated_text


@pytest.mark.asyncio
async def test_ocr_text_extraction():
    """Test OCR-only text extraction from images."""
    service = ImageProcessingService(api_key="test_key")
    
    mock_ocr_text = "Recipe: Test OCR\nIngredients: flour, sugar\nInstructions: mix and bake"
    
    # Mock the Gemini Vision API response for OCR
    mock_response = MagicMock()
    mock_response.text = mock_ocr_text
    
    with patch.object(service, 'client') as mock_client:
        mock_client.models.generate_content.return_value = mock_response
        
        image_bytes = create_test_image()
        extracted_text = await service._extract_text_from_image(image_bytes, {})
        
        assert extracted_text == mock_ocr_text
        
        # Verify the API was called with OCR-specific config
        call_args = mock_client.models.generate_content.call_args
        config = call_args[1]['config']
        assert config.temperature == 0.0  # Should use very low temperature for OCR


@pytest.mark.asyncio
async def test_text_consolidation():
    """Test text consolidation logic for multiple pages."""
    service = ImageProcessingService(api_key="test_key")
    
    # Sample extracted texts from multiple pages
    extracted_texts = [
        {
            'page': 1,
            'text': 'Chocolate Chip Cookies\n\nIngredients:\n2 cups flour\n1 cup sugar\n2 eggs'
        },
        {
            'page': 2, 
            'text': 'Instructions:\n1. Mix flour and sugar\n2. Add eggs\n3. Bake at 350F for 12 minutes'
        }
    ]
    
    consolidated = service._consolidate_extracted_texts(extracted_texts)
    
    # Check that consolidation worked properly
    assert "MULTI-PAGE RECIPE" in consolidated
    assert "PAGE 1" in consolidated
    assert "PAGE 2" in consolidated
    assert "Chocolate Chip Cookies" in consolidated
    assert "2 cups flour" in consolidated
    assert "Mix flour and sugar" in consolidated


@pytest.mark.asyncio
async def test_fallback_when_no_text_extracted():
    """Test fallback behavior when no text can be extracted from any image."""
    service = ImageProcessingService(api_key="test_key")
    
    # Mock OCR to return empty strings
    with patch.object(service, '_extract_text_from_image') as mock_ocr:
        mock_ocr.return_value = ""
        
        image_bytes = create_test_image()
        image_list = [image_to_base64(image_bytes), image_to_base64(image_bytes)]
        
        result = await service.extract_recipe_from_image(image_list)
        
        assert isinstance(result, RecipeResponse)
        assert result.recipe.name == "Image Processing Failed"
        assert result.confidence_score == 0.1  # Low confidence for fallback