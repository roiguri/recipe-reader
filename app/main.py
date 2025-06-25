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

# Check database configuration
if not os.getenv("DATABASE_URL"):
    logger.warning("DATABASE_URL not found in environment variables. Database features will be unavailable.")
else:
    logger.info("DATABASE_URL found - Database features will be available")

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.routers import recipe
# Import database components
from app.database.connection import db_manager
# Import authentication dependencies
from app.dependencies.authentication import get_client_from_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.
    
    Handles database connection setup and cleanup during application
    startup and shutdown events.
    """
    # Startup
    try:
        logger.info("Application startup: Connecting to database...")
        await db_manager.connect()
        logger.info("Database connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database during startup: {str(e)}")
        # Don't prevent startup if database is unavailable
        # This allows the service to run without database features
    
    yield
    
    # Shutdown
    try:
        logger.info("Application shutdown: Disconnecting from database...")
        await db_manager.disconnect()
        logger.info("Database disconnected successfully")
    except Exception as e:
        logger.error(f"Error during database shutdown: {str(e)}")

# Create FastAPI app instance
app = FastAPI(
    title="Recipe Auto-Creation Service",
    description="API service that automatically creates structured recipe data from various inputs",
    version="0.1.0",
    lifespan=lifespan,
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
    Health check endpoint to verify the API and database are running.
    """
    db_connected = db_manager.is_connected
    db_healthy = False
    connection_error = None
    
    # Try to connect if not connected (for serverless)
    if not db_connected:
        try:
            logger.info("Health check: Attempting database connection...")
            await db_manager.connect()
            db_connected = db_manager.is_connected
            logger.info(f"Health check: Connection attempt result: {db_connected}")
        except Exception as e:
            connection_error = str(e)
            logger.error(f"Health check: Database connection failed: {connection_error}")
    
    # Check database health if connected
    if db_connected:
        try:
            db_healthy = await db_manager.health_check()
            logger.info(f"Health check: Database health check result: {db_healthy}")
        except Exception as e:
            logger.error(f"Health check: Database health check failed: {str(e)}")
    
    return {
        "status": "ok",
        "message": "Recipe Auto-Creation Service is running",
        "database": {
            "connected": db_connected,
            "healthy": db_healthy,
            "error": connection_error
        },
        "services": {
            "gemini": bool(os.getenv("GOOGLE_AI_API_KEY")),
            "database": bool(os.getenv("DATABASE_URL"))
        }
    }

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

# API Version Discovery endpoint
@app.get("/api/versions", tags=["Versioning"])
async def get_api_versions():
    """
    Discover available API versions and their status.
    
    This endpoint provides information about supported API versions,
    deprecation timelines, and migration guidance for clients.
    
    Returns:
        dict: API version information including supported versions,
              latest version, deprecated versions, and metadata
    """
    from datetime import datetime
    
    return {
        "supported_versions": ["v1"],
        "latest_version": "v1",
        "deprecated_versions": [],
        "version_info": {
            "v1": {
                "status": "stable",
                "released_date": "2024-01-15",
                "deprecated_date": None,
                "sunset_date": None,
                "documentation": "/docs",
                "features": [
                    "API key authentication",
                    "Recipe text processing",
                    "Recipe URL processing", 
                    "Recipe image processing",
                    "Usage tracking"
                ],
                "breaking_changes": [],
                "migration_guide": None
            }
        },
        "policies": {
            "deprecation_notice_period": "6 months",
            "support_period_after_deprecation": "12 months",
            "backward_compatibility": "Guaranteed within major versions"
        },
        "current_time": datetime.now(datetime.UTC).isoformat()
    }

# Include routers with versioning and authentication
app.include_router(
    recipe.router,
    prefix="/api/v1",
    dependencies=[Depends(get_client_from_db)]
)

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
