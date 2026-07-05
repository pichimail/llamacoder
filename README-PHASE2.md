# Phase 2 — ChinnaLLM: Whitelabel AI Service Engine

ChinnaLLM lets apps built by your users call AI (text, vision, code, image, streaming) through a branded service. The admin sets one provider key; users consume credits or bring their own key (BYOK). The underlying provider is never named anywhere user-visible.

## Setup

```bash
npm install                       # installs deps incl. tsx, runs prisma generate
npx prisma migrate dev -n chinnallm   # creates the 5 new tables + Chat.aiIntegration
pnpm seed:chinnallm            # seeds 17 default models (idempotent)
npm run dev
```

## Environment variables (Phase 2 additions)

| Variable | Required? | What breaks without it | Where to get it |
|---|---|---|---|
| `OPENROUTER_API_KEY` | REQUIRED | ChinnaLLM won't work — invoke returns 503 ConfigurationError (unless every user is BYOK) | openrouter.ai/keys |
| `ENCRYPTION_SECRET` | REQUIRED | BYOK key storage fails with a clear error | `openssl rand -hex 32` |
| `DATABASE_URL` | REQUIRED | Already required by Phase 1 | Neon dashboard |

## Architecture

- **`lib/chinnallm/`** — models registry (provider IDs live only here + admin API), transactional credit ledger, AES-256-GCM key vault, and the invocation engine (tier resolution → credit pre-check → provider call → streaming/settlement → within-tier fallback → usage logging, 120s timeout with partial-stream settlement).
- **User APIs** — `POST /api/chinnallm/invoke` (SDK shorthand or full messages, streaming, BYOK via `useByok: true`), `GET /models` (display names only), `GET /credits`, `POST/GET/DELETE /byok`.
- **Admin APIs** — `/admin/models` (CRUD, openRouterId visible here only), `/admin/credits` (grant/deduct + ledger), `/admin/usage` (totals, by model/tier/user/day).
- **UI** — sidebar "Credits" page (balance, BYOK, history) and admin "ChinnaLLM" console (registry toggles, usage KPIs, credit administration).
- **SDK** — `CHINNALLM_SDK` in `lib/chinnallm/sdk-template.ts` is the exact `lib/chinnallm.ts` injected into generated apps; it calls the app-local `/api/ai/invoke` proxy with friendly aliases (auto/lite/pro/ultra/code/vision/think).

## How to verify Phase 2

1. **Migrate:** `npx prisma migrate dev -n chinnallm` → 5 new tables + `Chat.aiIntegration`, no errors.
2. **Seed:** `pnpm seed:chinnallm` → "17 total" logged; rows visible at `/admin/chinnallm`.
3. **Invoke:** logged in, `POST /api/chinnallm/invoke` with `{"action":"text","prompt":"hello","stream":true}` → SSE stream; `GET /api/chinnallm/credits` shows a deduct transaction after.
4. **No leak:** `GET /api/chinnallm/models` → objects contain `displayName`/`tier`/`capabilities`, no `openRouterId` field.
5. **BYOK:** `POST /api/chinnallm/byok` with `{"provider":"openrouter","key":"sk-test..."}` → `ApiKeyStore` row has base64 ciphertext + iv, not the plaintext. Invoke with `{"useByok":true,...}` → response `creditsUsed: 0`, balance unchanged, usage row has `isByok: true`.
6. **Exhaustion:** drain to 0 (admin deduct at `/admin/chinnallm` or `POST /api/chinnallm/admin/credits`), invoke without BYOK → HTTP 402 `{ error, balance: 0, needed, upgradeUrl }`.

## Summary

Phase 2 adds a complete whitelabel AI engine: five new Prisma models track the model registry, credit ledger, usage telemetry, and encrypted BYOK keys; a fallback-capable invocation core wraps the upstream provider with streaming, transactional credit settlement, and 402/503-typed failures; seven authenticated, rate-limited, zod-validated routes split user surfaces (which never expose provider IDs) from admin surfaces (which do); and two new shadcn pages — a user Credits hub and an admin ChinnaLLM console — are wired into both sidebars. The injected SDK gives generated apps `chinnaLLM.text/vision/image/code/stream` with tier aliases, keeping the entire provider layer invisible to end users.
