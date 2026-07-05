# Backend Completion Changelog

## Backend/Prisma
- `prisma/schema.prisma` — added `Chat.backendMode`, corrected ChinnaLLM model uniqueness to `displayName`, and preserved ChinnaLLM/credit/BYOK relations.
- `prisma/migrations/20250101000000_auth_core/migration.sql` — added idempotent auth/platform baseline so fresh deploys create `User`, auth tables, `Setting`, `RateLimit`, and `AuditLog` before dependent migrations.
- `prisma/migrations/20260630110000_add_project_models/migration.sql` — renamed project/workspace migration into chronological order before RLS policies.
- `prisma/migrations/20260705110000_backend_chinnallm_completion/migration.sql` — added idempotent migration for `Chat.aiIntegration`, `Chat.backendMode`, ChinnaLLM models, credits, usage, encrypted BYOK, uploads, checkpoints, and feature flags.
- `prisma/seed-chinnallm.ts` — changed seed to Prisma 7 adapter style and idempotent `displayName` upsert so duplicate provider model IDs can safely power multiple ChinnaLLM tiers.

## ChinnaLLM runtime
- `lib/chinnallm/credits.ts` — rebuilt transactional credit ledger with free/pro monthly grants, reserve/deduct/refund paths, and plan reset behavior.
- `lib/chinnallm/invoke.ts` — hardened invocation with credit reservation before streaming, post-call reconciliation, sanitized errors, fallback handling, timeout support, and usage logging.
- `lib/chinnallm/sdk-template.ts` — changed generated SDK endpoint to `/api/chinnallm/invoke` and added BYOK-safe option support without exposing provider details.
- `lib/prompts.ts` — removed direct-provider BYOK instructions from generated apps; ChinnaLLM SDK is now the only generated AI integration path.
- `lib/auth.ts` — grants initial ChinnaLLM credits on new user creation.

## API routes
- `app/api/chinnallm/invoke/route.ts` — sanitized generic failure response and retained auth/zod/rate-limit/BYOK decryption.
- `app/api/chinnallm/models/route.ts` — added rate limit to model list and keeps provider IDs hidden.
- `app/api/chinnallm/credits/route.ts` — added rate limit to balance/usage endpoint.
- `app/api/chinnallm/byok/route.ts` — added rate limits to list/delete and returns masked key metadata only.
- `app/api/chinnallm/admin/models/route.ts` — rate-limited admin-only model CRUD.
- `app/api/chinnallm/admin/credits/route.ts` — rate-limited admin credit ledger list/adjustment.
- `app/api/chinnallm/admin/usage/route.ts` — rate-limited admin usage analytics.
- `app/api/admin/chinnallm/models/route.ts` — rate-limited admin model listing used by the admin UI.
- `app/api/admin/chinnallm/usage/route.ts` — rate-limited admin usage analytics used by the admin UI.
- `app/api/admin/credits/transactions/route.ts` — rate-limited transaction log.
- `app/api/admin/users/route.ts` — rate-limited users table data with credit/BYOK metadata.
- `app/api/admin/users/[id]/route.ts` — rate-limited user detail endpoint.
- `app/api/admin/dashboard/route.ts` — rate-limited dashboard stats endpoint.
- `app/api/create-chat/route.ts` — accepts `backendMode`, writes it to chat, seeds backend artifacts, and removes provider-name config leakage from errors.
- `app/api/get-next-completion-stream-promise/route.ts` — injects ChinnaLLM and backend-mode system blocks at generation time and hides provider header branding.
- `app/api/build-spec/route.ts` — accepts `backendMode` and defaults shadcn to true.
- `app/api/chats/[id]/route.ts` — allows safe patching of `aiIntegration` and `backendMode`.
- `app/api/chats/[id]/builder-settings/route.ts` — persists backend mode through builder settings.
- `app/api/user-settings/route.ts` — added `backendDefault` setting.

## Backend generation system
- `lib/build-engine.ts` — added backend-mode detection, Neon/Prisma/Supabase artifact generation, `.env.example`, prompt-domain resource inference, API route generation, dependency hints, route hints, and backend system context.

## UI/admin hardening
- `app/(main)/home-page.client.tsx` — added backend toggle, passes backend mode into chat creation, and blocks eager stream start for AI prompts so the chooser appears first.
- `app/(main)/chats/[id]/page.client.tsx` — added backend setup panel in the chat sidebar and changed ChinnaLLM env detection to `CHINNALLM_ENABLED`.
- `components/chats/artifact-action-bar.tsx` — changed ChinnaLLM integration labels/required key display away from provider-specific envs.
- `app/(main)/chats/[id]/chat-box.tsx` — replaced provider-specific suggestion wording with ChinnaLLM-safe wording.
- `app/admin/page.tsx` — removed `recharts` usage and replaced charts with dependency-free shadcn-style visual bars.
- `app/admin/chinnallm/page.tsx` — corrected seed command copy to `pnpm seed:chinnallm`.
- `components/ui/checkbox.tsx` — added missing shadcn-compatible checkbox component without introducing new dependencies.

## Package/env
- `package.json` — removed undeclared `recharts` dependency drift while preserving the existing lockfile contract and seed script.
- `package-lock.json` — removed stale npm lockfile so the project remains pnpm-only.
- `.env.example` — added production env template for database, auth, ChinnaLLM, BYOK encryption, uploads, and optional services.
- `.example.env` — appended missing ChinnaLLM/Prisma env keys for existing setup docs.
- `README-PHASE2.md` / `README-PHASE4.md` — corrected seed command references to pnpm.
