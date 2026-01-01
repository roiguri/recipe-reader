## 2024-05-23 - [Singleton Services in FastAPI]
**Learning:** The codebase uses manual singleton implementation (global variable + lazy initialization) for service dependencies instead of `functools.lru_cache`. This pattern is used for `UrlProcessor` and `ImageProcessingService`.
**Action:** When implementing or modifying service dependencies, follow the existing manual singleton pattern for consistency, rather than introducing `lru_cache`.
