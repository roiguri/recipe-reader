# API Versioning

## Current Version: v1

All endpoints use `/api/v1` prefix and require API key authentication.

## Version Discovery

Check available versions:
```bash
curl http://localhost:8000/api/versions
```

## Breaking Changes Policy

- **6 months notice** before deprecating versions
- **12 months support** after deprecation
- Backward compatibility within major versions

## Version States

- **Stable**: Production ready, fully supported
- **Deprecated**: Supported but scheduled for removal
- **Sunset**: No longer supported

## Client Integration

### Best Practices
1. Always pin to specific version (`/api/v1`)
2. Monitor deprecation headers in responses
3. Test new versions in staging before migration

### Migration Timeline
- **Deprecation notice**: 6 months advance warning
- **Migration window**: 12 months support overlap
- **Final sunset**: Version becomes unavailable

---
