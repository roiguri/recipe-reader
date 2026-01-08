## 2024-05-22 - CORS Misconfiguration
**Vulnerability:** The application was configured with `allow_origins=["*"]` while also having `allow_credentials=True`. This configuration is generally insecure and often rejected by browsers, but can lead to security issues if not handled correctly by the server.
**Learning:** Defaulting to wildcard origins is a common "demo" convenience that becomes a liability. Even if browsers block it, it signals poor security posture.
**Prevention:** Always use a configurable whitelist for origins. Implemented `ALLOWED_ORIGINS` environment variable support with a safer default mechanism.
