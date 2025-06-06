# Load environment variables FIRST, before other imports
from dotenv import load_dotenv
import os
import logging

# Load environment variables at startup
load_dotenv()

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Verify critical environment variables
if not os.getenv("GOOGLE_AI_API_KEY"):
    logger.warning("GOOGLE_AI_API_KEY not found in environment variables. Gemini service will be unavailable.")
else:
    logger.info("GOOGLE_AI_API_KEY found - Gemini service will be available")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.routers import recipe

# Create FastAPI app instance
app = FastAPI(
    title="Recipe Auto-Creation Service",
    description="API service that automatically creates structured recipe data from various inputs",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "ok", "message": "Recipe Auto-Creation Service is running"}

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with basic API information.
    """
    return {
        "message": "Welcome to the Recipe Auto-Creation Service API",
        "docs_url": "/docs",
        "version": app.version,
    }

# Include routers
app.include_router(recipe.router)

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
