# Settings Panel — Real vs Placeholder (12 sections)

| # | Section | Status | Detail |
|---|---|---|---|
| 1 | General | ✅ **REAL** (pre-existing, untouched) | `update-project` action, persists app name/description to `Project` model |
| 2 | Environment Variables | ✅ **REAL** (pre-existing, untouched) | Encrypted at rest (`encryptEnvValue`), `EnvironmentVariable` model, real upsert |
| 3 | AI API Keys | ✅ **REAL** (newly surfaced this phase) | Uses existing `ApiKeyStore` model + `/api/chinnallm/byok` route. Account-wide scope, not per-chat — no per-chat key model exists, UI says so honestly |
| 4 | Integrations | ✅ **REAL** (pre-existing, untouched) | `Integration` model, install/confirm flow with per-integration required keys |
| 5 | Deployments | ⚠️ **PARTIAL** (pre-existing, untouched this phase) | Backend real (`Deployment` model, `publish` action creates records); dedicated deployment-history UI with logs viewer was not built this phase — out of this phase's scope per the corrected prompt |
| 6 | Domains | ✅ **REAL** (extended this phase) | New `save-domain`/`remove-domain` actions, real `Domain` model, DNS instructions, verified/pending Badge |
| 7 | Share | ✅ **REAL** (pre-existing, untouched) | `ShareLink` model, `buildShareToken`, publish button in the action bar toolbar |
| 8 | Backups | ✅ **REAL** (newly built this phase) | Reuses existing `DesignCheckpoint` model + `/checkpoint` and `/restore` routes. Added the missing `GET` list endpoint and the tab UI |
| 9 | SEO | ❌ **COMING SOON** (UI-only, by design) | Fields present and disabled, `Badge` reads "Coming soon". No backend — not faked as wired |
| 10 | GitHub | ✅ **REAL** (pre-existing, untouched) | `connect-github`, `create-pr` actions, `createArtifactPullRequest` |
| 11 | Export | ✅ **REAL** (pre-existing, untouched) | Download-zip button already wired in the action bar toolbar |
| 12 | MCP Servers | ❌ **COMING SOON** (UI-only, by design) | Empty-state card with "Coming soon" Badge. No backend |

## Summary
- **9 of 12** fully real and working against actual Prisma models/routes
- **1 of 12** (Deployments) has real backend but thinner UI than ideal — flagged, not hidden
- **2 of 12** (SEO, MCP Servers) are honest placeholders — full UI, clearly badged, zero fake wiring

No new Prisma models were created. No duplicate settings panel or parallel API
route group was created. Everything above extends what already existed.
