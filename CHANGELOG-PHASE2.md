# Phase 2 — Extend Existing Settings System — Changelog

## Files changed (all extended, nothing duplicated)

1. **app/api/design/[chatId]/checkpoint/route.ts** — added `GET` handler to
   list checkpoints for a chat (existing `POST` untouched). Needed for the
   Backups tab to show a list.

2. **app/api/workspace/[chatId]/route.ts**:
   - Added `save-domain` and `remove-domain` actions, following the exact
     pattern of the existing `save-env` action (owner-level access, zod-style
     validation, `logAudit` call, returns refreshed `serializeWorkspace`).
   - `serializeWorkspace()` now also returns `domains` and `checkpoints` arrays
     (two new parallel Prisma queries added to the existing `Promise.all`).
   - No new Prisma models. Used the existing `Domain` and `DesignCheckpoint`
     models exactly as they were already defined.

3. **components/chats/artifact-action-bar.tsx** (the existing settings panel):
   - **Shadcn cleanup**: removed the hardcoded violet/fuchsia/amber glow
     styling from `iconButton` and the version selector (now a real shadcn
     `Select`). Converted every raw `<input>`/`<select>`/`<textarea>` to
     `Input`/`Select`/`Textarea` — env vars (both the tab and the popover-menu
     quick-add), integration install-key fields, app name, app description,
     mobile tab nav. The only remaining native element is the hidden
     `<input type="file">` for uploads, which has no shadcn equivalent and is
     standard practice even in pure-shadcn codebases.
   - **Domains tab**: replaced the stub (single Publish button) with a real
     implementation — add/remove domains, DNS instructions (CNAME record),
     verified/pending status Badge. Wired to the new `save-domain`/
     `remove-domain` actions.
   - **Backups tab** (new): create a named backup, list existing ones with
     timestamp, restore any of them. Reuses the existing
     `/api/design/[chatId]/checkpoint` and `/restore` routes — no new routes.
   - **SEO tab** (new): meta title/description/OG image fields, all disabled,
     with a `Badge variant="secondary"` reading "Coming soon" — no backend,
     clearly marked as not wired to a real build.
   - **MCP Servers tab** (new): empty-state UI with a "Coming soon" Badge —
     no backend.
   - **AI API Keys tab** (new): surfaces the existing ChinnaLLM BYOK system
     (`/api/chinnallm/byok` GET/POST/DELETE, `ApiKeyStore` model). Explicitly
     labeled in the UI copy as account-wide (BYOK keys are stored per-user,
     not per-chat, in the existing schema — this tab does not invent a
     per-chat key store that doesn't exist).
   - **Mobile**: the whole settings panel now renders as a shadcn `Sheet`
     (bottom, 92vh) on screens under 768px (via the existing `useIsMobile`
     hook) and stays a `Dialog` on desktop — same shared content, two shells.

4. **app/(main)/chats/[id]/page.client.tsx**:
   - Added a persistent "+ Add AI" button in the chat header, shown only when
     `chat.aiIntegration === "skip"`. Clicking it re-derives AI capabilities
     from the chat's original prompt via the existing `requiresAI()` and
     reopens the existing `AIIntegrationChooser` component — no new chooser,
     no full-chat rebuild. Selecting an option there already PATCHes
     `aiIntegration` on the chat (pre-existing behavior in the chooser
     component, confirmed during audit, not changed).

## What was NOT touched (confirmed already real during audit)

General, Environment Variables (tab), Integrations, GitHub, Share/Export
(action bar buttons), Template, Analytics/Advanced — all were already
functioning against real Prisma models and routes. Verified, left as-is.

## Real vs Placeholder — all 12 sections

See REAL-VS-PLACEHOLDER.md for the full table.
