---
name: Orval hook naming conventions
description: Orval generates React Query hook names from HTTP verb + path segments, not from schema names. Always verify generated names before using them in frontend code.
---

# Orval hook naming conventions

**Rule:** Always grep `lib/api-client-react/src/generated/api.ts` for actual exported hook names after codegen. Do not guess based on schema names.

**Pattern:** `use<Verb><PathSegmentsPascalCase>`
- `GET /progress-photos` → `useGetProgressPhotos`
- `POST /progress-photos` → `usePostProgressPhotos`
- `DELETE /progress-photos/{id}` → `useDeleteProgressPhotosId`

**Why:** Using assumed names like `useCreateProgressPhoto` causes runtime SyntaxErrors in the browser ("module does not provide an export named…"), breaking the entire app.

**How to apply:** After codegen, run:
```
grep -n "^export function use\|^export const use" lib/api-client-react/src/generated/api.ts | grep -i <feature>
```
Then copy the exact names into the frontend.
