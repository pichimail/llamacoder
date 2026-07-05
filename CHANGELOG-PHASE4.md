# Changelog — Phase 4: Admin Dashboard, Feature Flags & Platform Management

## New: Feature Flag System (dynamic control of every P1–P4 feature)
- `prisma/schema.prisma` — new `FeatureFlag` model (key, label, description, category, enabled).
- `lib/feature-flags.ts` — 19 flag definitions across 4 categories (builder / ai / chat / platform); `getFeatureFlags()` overlays DB rows on defaults and fails open.
- `app/api/feature-flags/route.ts` — public read (no-store) for client gating.
- `app/api/admin/feature-flags/route.ts` — admin GET (merged list) + PATCH (upsert toggle), zod + rate-limited.
- `hooks/use-feature-flags.ts` — client hook; everything defaults enabled until fetch resolves (no flash-off).
- `app/admin/flags/page.tsx` — grouped flags console with optimistic Switch toggles and rollback on failure.
- Wired gates:
  - Composer: style picker, web search, deep thinking, canvas, GitHub import, prompt library (save/library/saved chips), voice dictation.
  - Landing: featured templates section (`templates`).
  - Chat: AI integration chooser (`ai-chooser` + `chinnallm`), credit indicator (`credit-indicator`).
  - Sidebar: gallery (`gallery`), credits page link (`credits-page`).

## Admin restructure
- `app/admin/layout.tsx` — rewritten: sectioned sidebar (Overview / Content / AI Engine / Billing / Users / System), left-border active accent, mobile hamburger → Sheet drawer, avatar + Admin badge footer.
- `app/admin/page.tsx` — rewritten with real data: 4 stat cards (total users, apps today, active sessions, credits today), recharts area chart (apps/day 30d), donut (credits by tier), bar (calls by model), recent-activity table. Skeletons + empty states throughout.

## ChinnaLLM admin
- `app/admin/chinnallm/page.tsx` — rewritten: full CRUD table (name / tier / provider ID / cost / Switch / edit / delete), tier filter Select, Add/Edit Dialog (name, provider ID, tier, cost, capability chips, description), delete confirmation Dialog.
- `app/admin/chinnallm/usage/page.tsx` — new: date range + tier + BYOK + user filters, 5 summary cards (calls, tokens, credits, avg latency, error rate), invocation table, CSV export.

## Credits admin
- `app/admin/credits/page.tsx` — new: manual grant/deduct with 300ms-debounced user search (shows current balance before submit), paginated transaction log (type/user filters), bulk grant-to-free and monthly-reset with confirmation Dialogs.

## Users admin
- `app/admin/users/page.tsx` — rewritten with real data: avatar/plan/credits/apps/BYOK/joined table, debounced search, plan/BYOK/sort filters, pagination, right-side detail Sheet (profile, stat tiles, plan Select → PATCH, grant-credits Dialog, revoke-BYOK confirmation, recent apps, credit history).

## Gallery admin
- `app/admin/gallery/page.tsx` — new: FeaturedPin curation over the existing `/api/admin/featured` API (add-pin Dialog, remove confirmation).

## New admin API routes (all: admin guard + zod + rate limiting where mutating)
- `app/api/admin/dashboard/route.ts` — aggregated stats + 30-day series + recent activity.
- `app/api/admin/chinnallm/models/route.ts` — GET (tier filter) / POST / PUT / DELETE.
- `app/api/admin/chinnallm/usage/route.ts` — filtered usage + summary + `?format=csv` export (≤5000 rows).
- `app/api/admin/credits/route.ts` — discriminated ops: manual grant/deduct, bulk-grant-free, bulk-reset-monthly (transactional, ledgered).
- `app/api/admin/credits/transactions/route.ts` — paginated log with type/user/date filters + user email join.
- `app/api/admin/users/route.ts` — paginated list with search/plan/BYOK filters, joined/credits/apps sort, computed balance/BYOK/app counts.
- `app/api/admin/users/[id]/route.ts` — detail (credits, keys, projects, transactions, usage aggregates); PATCH planTier / revokeByok.
- `lib/admin-guard.ts` — shared `requireAdmin()` + `adminErrorResponse()`.

## Main app refresh ("no AI slop")
- `components/global-app-shell.tsx` — sidebar recreated: theme-aware surfaces (no hardcoded black), one link per destination (removed duplicates and dead links), New build button, Recents section, subtle hover/active states, collapse control, flag-gated entries.
- `PremiumPromptComposer` (home page) — recreated: single hairline border, no glow/heavy shadows, quiet chips, monochrome send button, border-top toolbar; every optional control feature-flag gated; all functionality preserved (modes, model select, toggles, attachments, GitHub import, saved prompts, voice, typewriter placeholder).

## Fixes
- `lib/chinnallm/tiers.ts` — new client-safe tier constants; `lib/chinnallm/models.ts` now re-exports them. Fixes `pg`/`dns` leaking into client bundles when admin pages import tier lists.
- Added `recharts` dependency.

## Untouched
- ABSOLUTE PROMPT OBEDIENCE / routing sections in `lib/prompts.ts`; all P1–P3 behavior; existing `/api/chinnallm/*` routes remain for backward compatibility.
