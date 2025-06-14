from fastapi import APIRouter, HTTPException, Depends
from ..models.recipe import TextProcessRequest, UrlProcessRequest, RecipeResponse
from ..services.text_processor import TextProcessor
from ..services.url_processor import UrlProcessor

router = APIRouter(
    prefix="/recipe",
    tags=["Recipe"],
    responses={404: {"description": "Not found"}},
)

# Confidence score weighting constants
URL_EXTRACTION_CONFIDENCE_WEIGHT = 0.3
AI_PROCESSING_CONFIDENCE_WEIGHT = 0.7

# Dependencies to get services
def get_text_processor():
    return TextProcessor()

# Singleton URL processor for connection pooling efficiency
_url_processor_instance = None

async def get_url_processor():
    global _url_processor_instance
    if _url_processor_instance is None:
        _url_processor_instance = UrlProcessor()
    return _url_processor_instance

@router.post("/text", response_model=RecipeResponse)
async def process_recipe_text(
    request: TextProcessRequest,
    text_processor: TextProcessor = Depends(get_text_processor)
):
    """
    Process plain text to extract structured recipe data.
    
    - **text**: Recipe text to process
    - **options**: Optional processing parameters
    """
    try:
        result = await text_processor.process_text(request.text, request.options)
        return result
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing recipe URL: {str(e)}")
