---
name: API server zod dependency
description: zod must be listed in the api-server package.json dependencies or esbuild cannot bundle routes that import it directly.
---

# API server zod dependency

**Rule:** Any route file in `artifacts/api-server/src/routes/` that imports from `"zod"` directly requires `"zod": "catalog:"` in `artifacts/api-server/package.json` under `dependencies`.

**Why:** esbuild bundles the API server and resolves all imports at build time. `zod` is not listed as external in `build.mjs`. If it's missing from package.json, the build fails with `Could not resolve "zod"`.

**How to apply:** When adding a new route that uses zod for runtime validation, check that zod is present in `artifacts/api-server/package.json` dependencies before running the build.
