# FitCore – AI-Powered Fitness App

A premium fitness SaaS application competing with Fitbod, Freeletics, MyFitnessPal, Strava, and Future. Dark-by-default, data-dense, mobile-first.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/fitness-app run dev` — run the frontend (port 21558, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-exercises` — seed the 100-exercise dataset (clears existing exercises first)
- Required env: `DATABASE_URL` — Postgres connection string (pre-configured by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter, TanStack Query, Zustand, Framer Motion, Recharts
- API: Express 5 (modular router per domain)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Auth: Token-based (SHA-256 + salt, Bearer token stored in localStorage)
- Build: esbuild (API server CJS bundle)

## Where things live

```
artifacts/fitness-app/       — React frontend
  src/
    pages/                   — Route pages (landing, login, signup, onboarding, dashboard, etc.)
    components/              — Reusable components
    store/                   — Zustand auth store (auth.ts)
    index.css                — Theme tokens (dark mode, lime/electric palette)

artifacts/api-server/src/
  routes/                    — One file per domain module:
    auth.ts                  — Register, login, logout, /auth/me
    users.ts                 — User profile CRUD
    workouts.ts              — Workout plans + completions
    exercises.ts             — Exercise library (filterable)
    nutrition.ts             — Nutrition entries + daily summary
    progress.ts              — Progress entries, achievements, stats
    dashboard.ts             — Summary + activity feed
    ai.ts                    — Conversations + messages (stubbed AI responses)
    subscriptions.ts         — Plans + current subscription (stubbed)
  lib/auth.ts                — Token generation/verification, requireAuth middleware

lib/db/src/schema/           — Drizzle schema (one file per domain)
lib/api-spec/openapi.yaml    — Single source of truth for ALL API contracts
lib/api-client-react/        — Generated React Query hooks (do not edit)
lib/api-zod/                 — Generated Zod schemas for server validation (do not edit)
```

## Architecture decisions

- **OpenAPI-first**: All API contracts live in `lib/api-spec/openapi.yaml`. Codegen produces typed hooks (frontend) and Zod schemas (server). Never hand-write types that codegen produces.
- **Modular routes**: Each domain (auth, workouts, nutrition, etc.) is a separate Express router file. Add new endpoints within the correct domain file.
- **Token auth without sessions**: Bearer tokens encoded as base64 JSON with userId + random bytes. Simple, stateless. Future: replace with JWT or session store for production.
- **Stubbed AI & payments**: AI responses are random from a curated list. Subscriptions are hardcoded. Both are architected to swap in real providers (OpenAI, Stripe) with minimal change.
- **Dark mode default**: `next-themes` wraps the app; theme class applied to `<html>`. CSS variables in `index.css` define the dark/light palettes.

## Product

FitCore covers:
- **Landing**: Marketing page with hero, features, social proof, pricing teaser
- **Auth**: Register / Login / multi-step Onboarding wizard
- **Dashboard**: Weekly ring, streak, nutrition summary, today's workout, activity feed
- **Workouts**: Plan library, plan detail with exercise list, completion logging
- **Exercise library**: 20 seeded exercises, filterable by category/muscle/difficulty
- **Nutrition**: Daily meal log with macro tracking and calorie goal ring
- **Progress**: Weight/measurement history, achievements, lifetime stats
- **AI Coach**: Conversation list + chat interface (stubbed responses)
- **Profile**: User info, fitness preferences, subscription status

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- After any `lib/db` schema change: run `pnpm run typecheck:libs` before typechecking the API server
- The `--filter @workspace/db run push` command uses `drizzle-kit push` — dev only, never production
- Do not run `pnpm dev` at workspace root — use individual workflow restarts via Replit workflows
- Body schemas in `openapi.yaml` must use entity-shaped names (e.g. `WorkoutPlanInput`), never operation-shaped names like `CreateWorkoutBody` — Orval collision rule

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
- See `artifacts/api-server/src/routes/` for server implementation reference
