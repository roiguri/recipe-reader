# Recipe Auto-Creation API

**Enterprise-grade FastAPI service for AI-powered recipe extraction from text, URLs, and images with secure client management and admin controls.**

## 🚀 Live Demo

**Try it now: [https://recipe-reader-demo.netlify.app](https://recipe-reader-demo.netlify.app)**

Experience the API through our React demo with Google/GitHub authentication, real-time rate limiting, and multi-language support.

## ✨ API Features

### **Recipe Processing** (3 Endpoints)
- **📝 `/api/v1/recipe/text`**: Extract structured data from plain text
- **🔗 `/api/v1/recipe/url`**: Scrape and process recipes from websites
- **📸 `/api/v1/recipe/image`**: OCR extraction from single/multiple images

### **Enterprise Features**
- **🔐 API Key Authentication**: Secure client-based access control
- **👥 Admin Dashboard**: Client management, usage tracking, rate limiting
- **📊 Usage Analytics**: Request monitoring and monthly reporting
- **🌐 Multi-language**: Advanced Hebrew RTL support with cultural context
- **⚡ High Performance**: Singleton services, connection pooling, caching

### **AI & Accuracy**
- **🤖 Google Gemini AI**: Advanced structured data extraction
- **📈 Confidence Scoring**: Quality assessment for all extractions
- **🛡️ Robust Parsing**: Noise removal, format standardization
- **🔄 Validation**: Comprehensive input/output validation

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | FastAPI with async/await |
| **AI Service** | Google Gemini Pro (Generative AI) |
| **Database** | PostgreSQL with async drivers |
| **Authentication** | API key-based client authentication |
| **Web Scraping** | aiohttp with connection pooling |
| **Image Processing** | Base64 + AI vision models |
| **Testing** | pytest with 90%+ coverage |
| **Deployment** | Docker, Vercel, Railway |

## 🚀 Quick Start

### **For End Users: Try the Demo**

**🎯 Ready to use: [https://recipe-reader-demo.netlify.app](https://recipe-reader-demo.netlify.app)**

No setup required! Sign in with Google/GitHub and start processing recipes immediately.

### **For Developers: API Integration**

The API is hosted on Vercel with enterprise-grade infrastructure. Contact us for:
- **Production API keys** for your applications
- **Custom rate limits** based on your usage needs  
- **Admin access** for client management
- **Technical support** and integration assistance

### **API Documentation**

**📖 Live API Docs: [https://recipe-reader-chi.vercel.app/docs](https://recipe-reader-chi.vercel.app/docs)**

```bash
# Health check (no API key required)
curl https://recipe-reader-chi.vercel.app/health

# API version information
curl https://recipe-reader-chi.vercel.app/api/versions
```

### **Example API Usage** (with provided API key)

```bash
# Text processing
curl -X POST "https://recipe-reader-chi.vercel.app/api/v1/recipe/text" \
  -H "X-API-Key: your_provided_api_key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Chocolate Cake\n\nIngredients:\n2 cups flour\n1 cup sugar\n\nInstructions:\n1. Mix ingredients\n2. Bake at 350°F"}'

# URL processing  
curl -X POST "https://recipe-reader-chi.vercel.app/api/v1/recipe/url" \
  -H "X-API-Key: your_provided_api_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/recipe"}'
```

## 📡 API Reference

### **Recipe Processing Endpoints**

#### `POST /api/v1/recipe/text`
Extract structured recipe data from plain text.

**Headers:** `X-API-Key: your_client_key`

**Request:**
```json
{
  "text": "Chocolate Chip Cookies\n\nIngredients:\n2 cups flour\n1 cup sugar\n1/2 cup butter\n2 eggs\n1 tsp vanilla\n\nInstructions:\n1. Preheat oven to 375°F\n2. Mix dry ingredients\n3. Cream butter and sugar\n4. Add eggs and vanilla\n5. Combine wet and dry ingredients\n6. Bake for 10-12 minutes",
  "options": {}
}
```

**Response:**
```json
{
  "recipe": {
    "name": "Chocolate Chip Cookies",
    "ingredients": [
      {"item": "flour", "amount": "2", "unit": "cups"},
      {"item": "sugar", "amount": "1", "unit": "cup"},
      {"item": "butter", "amount": "1/2", "unit": "cup"},
      {"item": "eggs", "amount": "2", "unit": ""},
      {"item": "vanilla", "amount": "1", "unit": "tsp"}
    ],
    "instructions": [
      "Preheat oven to 375°F",
      "Mix dry ingredients", 
      "Cream butter and sugar",
      "Add eggs and vanilla",
      "Combine wet and dry ingredients",
      "Bake for 10-12 minutes"
    ],
    "prepTime": "15 minutes",
    "cookTime": "10-12 minutes", 
    "servings": "24 cookies",
    "difficulty": "easy"
  },
  "confidence_score": 0.95,
  "processing_time": 1.8
}
```

#### `POST /api/v1/recipe/url`
Extract recipe from website URL.

**Headers:** `X-API-Key: your_client_key`

**Request:**
```json
{
  "url": "https://example.com/chocolate-chip-cookies",
  "options": {}
}
```

#### `POST /api/v1/recipe/image`
Extract recipe from image(s) using OCR.

**Headers:** `X-API-Key: your_client_key`

**Request:**
```json
{
  "image_data": ["base64_encoded_image_data"],
  "options": {}
}
```

### **Admin Endpoints** (Require `X-Admin-Key`)

#### `POST /api/v1/admin/create-client`
Create new API client with generated key.

```json
{
  "client_name": "My Application",
  "rate_limit": 500
}
```

#### `GET /api/v1/admin/clients`
List all API clients with usage statistics.

#### `GET /api/v1/admin/usage-stats`
Get overall API usage analytics.

### **System Endpoints**

#### `GET /health`
System health check with service status.

#### `GET /api/versions`
API version discovery and compatibility information.

## 🏗️ Architecture

### **System Design**
```
Client Application
    ↓ X-API-Key Authentication
FastAPI Server (Python 3.9+)
    ↓ Rate Limiting & Validation
AI Service Layer (Google Gemini)
    ↓ Structured Extraction
PostgreSQL Database (Optional)
    ↓ Client & Usage Tracking
JSON Response with Confidence Score
```

### **Project Structure**
```
app/
├── main.py                    # FastAPI app with lifespan management
├── routers/
│   ├── recipe.py             # Recipe processing endpoints
│   └── admin.py              # Client management & analytics
├── services/
│   ├── gemini_service.py     # AI processing service  
│   ├── text_processor.py     # Text extraction logic
│   ├── url_processor.py      # Web scraping & parsing
│   └── image_processing.py   # OCR & image handling
├── models/
│   └── recipe.py             # Pydantic data models
├── database/
│   ├── connection.py         # Async database manager
│   └── client_repository.py  # Client CRUD operations
└── dependencies/
    ├── authentication.py     # API key validation
    └── admin_auth.py         # Admin authentication
```

## 🧪 Testing & Development

### **Run Tests**
```bash
# Full test suite with coverage
pytest tests/ -v --cov=app

# Specific test modules
pytest tests/unit/services/test_gemini_service.py -v
pytest tests/unit/routers/test_recipe_router.py -v

# Integration tests
pytest tests/unit/test_admin_integration.py -v
```

### **Local Development Setup** (For Contributors)

```bash
# Clone repository for development
git clone https://github.com/roiguri/recipe-reader.git
cd recipe-reader

# Install dependencies  
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your keys:
# GOOGLE_AI_API_KEY=your_google_ai_key
# DATABASE_URL=your_neon_postgres_url
# ADMIN_KEY=your_secure_admin_key

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Note**: Local development requires:
- Google AI API key for Gemini processing
- PostgreSQL database (Neon recommended for production parity)
- Admin key for client management features

### **Production Deployment**
- **Platform**: Vercel with Python runtime
- **Database**: Neon PostgreSQL (serverless)
- **AI Service**: Google Gemini Pro API
- **Configuration**: Environment variables via Vercel dashboard

## ⚡ Performance Features

- **Singleton Services**: Connection pooling and resource optimization
- **Async Architecture**: Non-blocking I/O for high concurrency
- **Confidence Scoring**: Quality assessment for all extractions  
- **Hebrew Language Support**: Cultural context and RTL handling
- **Robust Error Handling**: Comprehensive validation and recovery
- **Production Ready**: Logging, monitoring, and security best practices

## 🤝 Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.