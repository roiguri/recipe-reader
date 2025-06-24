from fastapi import APIRouter, HTTPException, Depends
from pydantic import ValidationError
from ..models.recipe import TextProcessRequest, UrlProcessRequest, ImageProcessRequest, RecipeResponse
from ..services.text_processor import TextProcessor
from ..services.url_processor import UrlProcessor
from ..services.image_processing_service import ImageProcessingService
from ..config.confidence import URL_EXTRACTION_CONFIDENCE_WEIGHT, AI_PROCESSING_CONFIDENCE_WEIGHT

router = APIRouter(
    prefix="/recipe",
    tags=["Recipe"],
    responses={404: {"description": "Not found"}},
)


# Dependencies to get services
def get_text_processor():
    return TextProcessor()

# Singleton URL processor for connection pooling efficiency
_url_processor_instance = None

async def get_url_processor():
    """
    Get a singleton instance of UrlProcessor for connection pooling efficiency.
    
    This function implements a singleton pattern to ensure only one UrlProcessor
    instance is created per application lifecycle. This is important for:
    
    - Connection pooling: Reuses HTTP connections across requests
    - Resource optimization: Avoids overhead of creating multiple instances
    - Rate limiting: Maintains consistent request patterns to external sites
    
    Returns:
        UrlProcessor: The singleton UrlProcessor instance
    """
    global _url_processor_instance
    if _url_processor_instance is None:
        _url_processor_instance = UrlProcessor()
    return _url_processor_instance

# Singleton Image processor for resource efficiency
_image_processor_instance = None

def get_image_processor():
    """
    Get a singleton instance of ImageProcessingService for resource efficiency.
    
    Returns:
        ImageProcessingService: The singleton ImageProcessingService instance
    """
    global _image_processor_instance
    if _image_processor_instance is None:
        _image_processor_instance = ImageProcessingService()
    return _image_processor_instance

@router.post("/text", response_model=RecipeResponse)
async def process_recipe_text(
    request: TextProcessRequest,
    text_processor: TextProcessor = Depends(get_text_processor)
):
    """
    Process plain text to extract structured recipe data.
    
    - **text**: Recipe text to process
    - **options**: Optional processing parameters
    
    **Note**: The extracted recipe's difficulty field will be validated against 
    standard values: 'easy', 'medium', 'hard'. Invalid difficulty values will 
    result in validation errors.
    """
    try:
        result = await text_processor.process_text(request.text, request.options)
        return result
    except ValidationError as e:
        # Handle Pydantic validation errors with clear messages
        error_details = []
        for error in e.errors():
            if error['loc'] == ('difficulty',):
                error_details.append(f"Invalid difficulty value: {error['input']}. Must be one of: easy, medium, hard")
            else:
                error_details.append(f"Validation error in {'.'.join(map(str, error['loc']))}: {error['msg']}")
        raise HTTPException(status_code=422, detail={"validation_errors": error_details})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing recipe text: {str(e)}")


@router.post("/url", response_model=RecipeResponse)
async def process_recipe_url(
    request: UrlProcessRequest,
    url_processor: UrlProcessor = Depends(get_url_processor),
    text_processor: TextProcessor = Depends(get_text_processor)
):
    """
    Process a recipe URL to extract structured recipe data.
    
    - **url**: Recipe URL to process
    - **options**: Optional processing parameters
    
    **Note**: The extracted recipe's difficulty field will be validated against 
    standard values: 'easy', 'medium', 'hard'. Invalid difficulty values will 
    result in validation errors.
    """
    try:
        # Process URL to extract content
        url_result = await url_processor.process_url(request.url, request.options)
        
        if not url_result['success']:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to fetch URL content: {url_result.get('error', 'Unknown error')}"
            )
        
        # Process extracted content through text processor
        text_options = request.options.copy()
        text_options['source_url'] = url_result['source_url']
        text_options['extraction_method'] = url_result['extraction_method']
        text_options['url_confidence'] = url_result['confidence']
        
        result = await text_processor.process_text(url_result['content'], text_options)
        
        # Update the recipe with source URL
        if result.recipe:
            result.recipe.source_url = url_result['source_url']
        
        # Adjust confidence score based on URL extraction quality
        url_confidence = url_result['confidence']
        original_confidence = result.confidence_score
        
        # Combined confidence: both URL extraction and AI processing must be good
        combined_confidence = (url_confidence * URL_EXTRACTION_CONFIDENCE_WEIGHT) + (original_confidence * AI_PROCESSING_CONFIDENCE_WEIGHT)
        result.confidence_score = min(combined_confidence, original_confidence)
        
        return result
        
    except HTTPException:
        raise
    except ValidationError as e:
        # Handle Pydantic validation errors with clear messages
        error_details = []
        for error in e.errors():
            if error['loc'] == ('difficulty',):
                error_details.append(f"Invalid difficulty value: {error['input']}. Must be one of: easy, medium, hard")
            else:
                error_details.append(f"Validation error in {'.'.join(map(str, error['loc']))}: {error['msg']}")
        raise HTTPException(status_code=422, detail={"validation_errors": error_details})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing recipe URL: {str(e)}")


@router.post("/image", response_model=RecipeResponse)
async def process_recipe_image(
    request: ImageProcessRequest,
    image_processor: ImageProcessingService = Depends(get_image_processor)
):
    """
    Process single or multiple recipe images to extract structured recipe data.
    
    - **image_data**: Base64 encoded image data (single string or list of strings)
    - **options**: Optional processing parameters
    
    For multiple images: provide a list of base64 strings representing pages of the same recipe.
    The service will extract text from each image and consolidate them into a single recipe.
    
    **Note**: The extracted recipe's difficulty field will be validated against 
    standard values: 'easy', 'medium', 'hard'. Invalid difficulty values will 
    result in validation errors.
    """
    try:
        result = await image_processor.extract_recipe_from_image(request.image_data, request.options)
        return result
    except ValidationError as e:
        # Handle Pydantic validation errors with clear messages
        error_details = []
        for error in e.errors():
            if error['loc'] == ('difficulty',):
                error_details.append(f"Invalid difficulty value: {error['input']}. Must be one of: easy, medium, hard")
            else:
                error_details.append(f"Validation error in {'.'.join(map(str, error['loc']))}: {error['msg']}")
        raise HTTPException(status_code=422, detail={"validation_errors": error_details})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing recipe image(s): {str(e)}")
