from fastapi import APIRouter, HTTPException, Depends
from ..models.recipe import TextProcessRequest, RecipeResponse
from ..services.text_processor import TextProcessor

router = APIRouter(
    prefix="/recipe",
    tags=["Recipe"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get the text processor service
def get_text_processor():
    return TextProcessor()

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
    
@router.post("/text/structured", response_model=RecipeResponse)
async def process_recipe_text_structured(
    request: TextProcessRequest,
    text_processor: TextProcessor = Depends(get_text_processor)
):
    """
    Process plain text using structured output (more reliable).
    
    This endpoint uses Gemini's structured output feature to guarantee valid JSON
    and improve reliability, especially for non-English recipes.
    """
    try:
        result = await text_processor.process_text_structured(request.text, request.options)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing recipe text: {str(e)}")
