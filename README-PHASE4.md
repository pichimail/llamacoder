# Phase 4 — Admin Dashboard, Credit & User Management, Feature Flags

## Setup
1. `npm install`
2. Env (same as P2/P3): `DATABASE_URL`, `OPENROUTER_API_KEY`, `ENCRYPTION_SECRET` (32+ chars), auth vars.
3. `npx prisma migrate dev -n phase4-feature-flags` (adds `FeatureFlag`) — or `npx prisma db push`.
4. `pnpm seed:chinnallm` if models aren't seeded yet.
5. Sign in with an admin account (`role = "admin"` or an email in the admin allowlist).

## What's new
- **/admin** — live dashboard: stats, 30-day area chart, credit donut, model bar chart, recent activity.
- **/admin/chinnallm** — model CRUD with dialogs, tier filter, enable switches.
- **/admin/chinnallm/usage** — filtered analytics + CSV export.
- **/admin/credits** — manual grant/deduct with user search, transaction log, bulk ops.
- **/admin/users** — searchable table + detail sheet with plan change, grants, BYOK revoke.
- **/admin/gallery** — featured pin curation.
- **/admin/flags** — every P1–P4 feature toggleable live: 9 builder flags, 5 AI flags, 2 chat flags, 3 platform flags. Disabling a flag removes the corresponding UI (composer toggles, style picker, AI chooser, credit pill, templates, sidebar links) on next load.
- Recreated main sidebar and prompt composer with a minimal, quiet visual language.

## VERIFY
- **Test 1:** Visit `/admin` as an admin → 4 stat cards populate with real counts and the three charts render (empty-state text if no usage yet).
- **Test 2:** `/admin/chinnallm` → model table lists seeded models; flip a Switch (persists after refresh); click "Add Model", fill the dialog, submit → new row appears.
- **Test 3:** `/admin/credits` → search a user, grant 50 credits → success toast shows the new balance and the transaction log's top row is the grant.
- **Test 4:** `/admin/users` → click the eye icon on a user → detail Sheet opens with credits/apps; change the plan Select to "pro" → toast confirms and the table's Plan badge updates.
- **Test 5:** Open every `/admin` page at 375px width → sidebar collapses to a hamburger Sheet, tables scroll horizontally, dialogs fit the viewport.
- **Test 6:** Delete a model, remove a gallery pin, revoke BYOK, or run a bulk credit op → each shows a confirmation Dialog before anything happens.
- **Bonus (flags):** `/admin/flags` → toggle "Style presets" off → reload the landing page → the 5-swatch picker is gone from the composer. Toggle back on → it returns.

## Verification results (this build)
- `npx tsc --noEmit` → 0 errors.
- `npx vitest run tests/unit lib/__tests__` → 28/28 passing.
- `npx next build` → exit 0, all admin pages and API routes registered.

## Notes / honest scope
- "Plans & Pricing" and "Deployments" nav items from the original wireframe were folded into Credits Management and existing Settings to avoid dead links; plan allowances are still enforced via `PLAN_MONTHLY_GRANTS`.
- The date-range filter uses native date inputs (no Calendar primitive exists in this component set; adding react-day-picker was out of scope).
- Feature flags gate UI client-side and are read fresh per page load; server-side enforcement exists only where routes already validate (e.g. ChinnaLLM invoke checks models/credits regardless of flags).
