# API Client Guide

## Quick Start

1. **Get API Key**: Contact support for API access
2. **Check Version**: `curl http://localhost:8000/api/versions`
3. **Make Request**:
```bash
curl -X POST "http://localhost:8000/api/v1/recipe/text" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{"text": "2 cups flour, 1 cup sugar, mix together"}'
```

## Authentication

All endpoints require `X-API-Key` header:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'your_api_key_here'
};
```

## Endpoints

- `POST /api/v1/recipe/text` - Process recipe text
- `POST /api/v1/recipe/url` - Process recipe from URL  
- `POST /api/v1/recipe/image` - Process recipe from image

## Common Errors

- `401` - Missing API key
- `403` - Invalid API key
- `500` - Server error

Error format:
```json
{
  "error": "invalid_api_key",
  "message": "Invalid API Key",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Migration from Unversioned API

**Old**: `/recipe/text` (no auth)  
**New**: `/api/v1/recipe/text` (requires `X-API-Key`)

---

Support: api-support@example.com