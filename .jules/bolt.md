# Bolt's Journal

## Critical Learnings

## 2024-05-23 - [Singleton Services in FastAPI]
**Learning:** Using `functools.lru_cache` is a standard and clean way to implement singleton dependencies in FastAPI. It handles the caching mechanism automatically and is thread-safe.
**Action:** Use `@lru_cache()` on dependency provider functions instead of manual global variable checks for singletons. This is especially important for services with expensive initialization (like API clients).
