# Recipe Auto-Creation API

**FastAPI service for AI-powered recipe extraction from text, URLs, and images, with secure client management and admin controls.**

> [!NOTE]
> **Project status: paused (as of 2026-05-28).** The hosted API on Vercel and the React demo on Netlify have been torn down, and the linked Supabase project has been retired. The codebase is preserved as a portfolio artifact and is fully restorable. See [How to redeploy from scratch](#-how-to-redeploy-from-scratch).

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

> The hosted API and demo are no longer running. To try the API live, follow [How to redeploy from scratch](#-how-to-redeploy-from-scratch) to spin up your own instance.

### **Example API Usage**

Once deployed, the API accepts requests like:

```bash
# Text processing
curl -X POST "https://YOUR-DEPLOY.vercel.app/api/v1/recipe/text" \
  -H "X-API-Key: your_provided_api_key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Chocolate Cake\n\nIngredients:\n2 cups flour\n1 cup sugar\n\nInstructions:\n1. Mix ingredients\n2. Bake at 350°F"}'

# URL processing
curl -X POST "https://YOUR-DEPLOY.vercel.app/api/v1/recipe/url" \
  -H "X-API-Key: your_provided_api_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/recipe"}'

# Health check (no API key required)
curl https://YOUR-DEPLOY.vercel.app/health
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

### **Previous Production Stack** (parked; see redeploy section above)
- **Platform**: Vercel with Python runtime
- **Database**: Neon PostgreSQL (serverless)
- **AI Service**: Google Gemini API
- **Configuration**: Environment variables via Vercel dashboard

## ⚡ Performance Features

- **Singleton Services**: Connection pooling and resource optimization
- **Async Architecture**: Non-blocking I/O for high concurrency
- **Confidence Scoring**: Quality assessment for all extractions  
- **Hebrew Language Support**: Cultural context and RTL handling
- **Robust Error Handling**: Comprehensive validation and recovery
- **Production Ready**: Logging, monitoring, and security best practices

## ♻️ How to Redeploy from Scratch

The project was paused on 2026-05-28. Everything needed to spin it back up is in this repo. The steps below assume a fresh start with no surviving infra.

### 1. Backend API (FastAPI on Vercel)

1. **Create a Postgres database** (Neon, Supabase, or Vercel Postgres). Note the connection string.
2. **Apply the backend migration** to the new database:
   ```bash
   psql "$DATABASE_URL" -f app/database/migrations/001_clients.sql
   ```
3. **Get a Google AI Studio key** at https://aistudio.google.com/app/apikey.
4. **Deploy to Vercel**:
   ```bash
   npx vercel link        # link to a new or existing Vercel project
   npx vercel env add     # set GOOGLE_AI_API_KEY, DATABASE_URL, ADMIN_API_KEY
   npx vercel --prod
   ```
   See `.env.example` for the full list of supported env vars (including optional `TRUSTED_PROXY_IPS`, `GEMINI_MODEL_NAME`).
5. **Create your first API client** via the admin endpoint:
   ```bash
   curl -X POST "https://YOUR-DEPLOY.vercel.app/api/v1/admin/create-client" \
     -H "X-Admin-Key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"client_name": "demo-frontend", "rate_limit": 100}'
   ```

### 2. Supabase Project (Auth + Edge Functions for the Demo)

1. **Create a new Supabase project** at https://supabase.com/dashboard. Note the project ref, URL, and `anon` key.
2. **Apply the schema** from this repo:
   ```bash
   supabase link --project-ref YOUR_NEW_REF
   supabase db push        # applies demo-frontend/supabase/migrations/0001_initial_schema.sql
   ```
   This recreates the `user_recipes` and `demo_rate_limits` tables, the `increment_rate_limit` RPC, RLS policies, and triggers.
3. **Configure OAuth providers** in dashboard → Authentication → Providers:
   - Enable Google and GitHub
   - Set redirect URL to `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
   - For Google: create OAuth credentials at https://console.cloud.google.com → APIs & Services → Credentials. Add the same redirect URL.
   - For GitHub: register an OAuth App at https://github.com/settings/developers with the same redirect URL.
4. **Create the storage bucket** `recipe-images` in dashboard → Storage. Set policies to authenticated-read/write as needed.
5. **Deploy edge functions**:
   ```bash
   supabase functions deploy recipe-proxy
   supabase functions deploy cookbook-transfer
   ```
   Set their secrets (`supabase secrets set REACT_APP_API_URL=https://YOUR-VERCEL-DEPLOY.vercel.app` etc.).

### 3. Demo Frontend (React on Netlify)

1. Copy `demo-frontend/.env.example` → `demo-frontend/.env.local` and fill in:
   - `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` from step 2
   - `REACT_APP_API_URL` from step 1
   - `REACT_APP_GOOGLE_CLIENT_ID` and `REACT_APP_GITHUB_CLIENT_ID` from step 2
2. **Verify locally**:
   ```bash
   cd demo-frontend && npm install && npm run build
   ```
3. **Deploy to Netlify**:
   ```bash
   npx netlify link
   npx netlify env:import demo-frontend/.env.local   # or set vars in dashboard
   npx netlify deploy --prod
   ```

### 4. Verify End-to-End

- Backend `/health` returns 200
- Frontend loads and sign-in flow completes
- A text/URL/image submission reaches the backend and returns structured JSON

The last known-good commit before pause is tagged `v1.0-paused`.

