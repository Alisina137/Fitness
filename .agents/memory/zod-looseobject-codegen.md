---
name: Zod looseObject codegen issue
description: Orval generates zod.looseObject() for bare object schemas, which crashes at runtime in Zod v3. Fix and prevention approach documented here.
---

# Zod `looseObject` codegen crash

## The rule
After every `pnpm --filter @workspace/api-spec run codegen` run, check `lib/api-zod/src/generated/api.ts` for `zod.looseObject(` and replace with `zod.object(`. The API server will crash at startup if any remain.

**Why:** Orval's zod generator emits `z.looseObject({})` for bare `type: object` schemas (those without `additionalProperties: false`). This is a Zod v4 method — the project uses Zod v3 (`zod@3.25.76`), where `looseObject` is undefined. At module-load time, the api-zod module throws `TypeError: (void 0) is not a function`.

**How to apply:** After any codegen run:
```bash
sed -i 's/zod\.looseObject(/zod.object(/g' lib/api-zod/src/generated/api.ts
```

## Prevention in spec
Add `additionalProperties: false` to any bare `type: object` schema in `lib/api-spec/openapi.yaml` to prevent orval from generating `looseObject` for that field. Already applied to `progressionRules` in the WorkoutPlanInput schema.

## The crash chain
`artifacts/api-server/src/routes/health.ts` imports `HealthCheckResponse` from `@workspace/api-zod` → loads the entire generated `api.ts` module → module-level `zod.looseObject({})` call → `TypeError` → server exits.

## Duplicate index exports
The codegen also caused `lib/api-client-react/src/index.ts` to have duplicate `export *` lines. The file should contain exactly:
```ts
export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
```
Restore this after any codegen run if duplicates appear.
