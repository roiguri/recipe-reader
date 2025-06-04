# Recipe Auto-Creation Service

A Python-based API service that automatically creates structured recipe data from text using Google's Gemini AI with advanced Hebrew language support.

## ✅ Current Features

- **Text Processing**: Extract structured recipe data from plain text
- **Hebrew Support**: Full support for Hebrew recipes with RTL text handling
- **Multiline Text**: Proper handling of complex, multiline recipe formats
- **Structured Output**: JSON consistent output
- **High Accuracy**: AI-powered extraction with confidence scoring
- **Robust Parsing**: Handles website-scraped content with noise removal

## 🚧 Planned Features

- URL processing (extract recipes from websites)
- PDF generation with Hebrew RTL support
- Image processing (OCR for recipe images)
- Enhanced web interface

## Tech Stack

- **Language**: Python 3.9+
- **Framework**: FastAPI
- **AI Service**: Google Gen AI SDK (Gemini)
- **Testing**: pytest with comprehensive test coverage

## 🚀 Quick Start

### Installation

1. Clone the repository:
```bash
git clone https://github.com/roiguri/recipe-reader.git
cd recipe-reader
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your Google AI API key to .env
GOOGLE_AI_API_KEY=your_api_key_here
```

4. Run the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Usage

Access the API documentation at: `http://localhost:8000/docs`

## 📡 API Endpoints

### `POST /recipe/text`
Extract structured recipe data from text.

**Request:**
```json
{
  "text": "פרגיות אסיאתיות\n\nמצרכים:\n1 קג פרגיות\n2 כפות שמן זית\n\nהוראות:\n1. לחמם השמן\n2. לטגן את הפרגיות",
  "options": {}
}
```

**Response:**
```json
{
  "recipe": {
    "name": "פרגיות אסיאתיות",
    "ingredients": [
      {"item": "פרגיות", "amount": "1", "unit": "קג"},
      {"item": "שמן זית", "amount": "2", "unit": "כפות"}
    ],
    "instructions": ["לחמם השמן", "לטגן את הפרגיות"],
    "prepTime": null,
    "cookTime": null,
    "servings": null
  },
  "confidence_score": 0.85,
  "processing_time": 2.3
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Recipe Auto-Creation Service is running"
}
```

## 🧪 Testing

Run the test suite:
```bash
pytest tests/ -v
```

Run specific tests:
```bash
pytest tests/unit/test_gemini_service.py -v
```

## 🔧 Development

### Project Structure
```
app/
├── main.py              # FastAPI application
├── models/
│   └── recipe.py        # Pydantic models
├── services/
│   └── gemini_service.py # AI processing service
└── routers/
    └── recipe.py        # API endpoints

tests/
└── unit/
    └── test_gemini_service.py
```

### Environment Variables
```bash
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## 🌟 Highlights

- **Advanced Hebrew Processing**: Handles Hebrew text with proper RTL layout and cultural context
- **Multiline Support**: Processes complex recipe formats with multiple sections
- **Noise Removal**: Automatically cleans website-scraped content
- **Structured Output**: Uses Google's structured generation for reliable JSON
- **High Confidence**: AI confidence scoring for extraction quality assessment

## 🤝 Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.