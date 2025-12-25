# Sentinel Journal

## 2025-12-25 - Timing Attack in Admin Auth
**Vulnerability:** The admin authentication logic used simple string comparison (`!=`) for API key validation, allowing potential timing attacks.
**Learning:** Even in high-level languages like Python, simple string comparison for secrets is variable-time and insecure.
**Prevention:** Always use `secrets.compare_digest()` for comparing sensitive values like API keys, tokens, or hashes.
