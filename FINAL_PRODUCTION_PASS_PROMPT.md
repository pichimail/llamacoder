You are working in this repo:

Repository: https://github.com/pichimail/llamacoder
Branch: release/production-ready

Goal:
Make this branch the only final production branch, fix every remaining audit blocker, rebuild broken Design Mode, pass all verification commands, then prepare it for merge into main.

Do not create another branch.
Do not leave TODOs.
Do not claim complete unless every command passes.
Do not add fake tests.
Do not use placeholder security claims.
Do not use the broken getCurrentUserOrNull protected-route pattern.

Current baseline:
- release/production-ready exists and is pushed.
- pnpm prisma validate passes.
- pnpm lint passes.
- pnpm build passes.
- This is only the clean baseline, not production-ready yet.

Critical forbidden pattern:
Never do this in protected routes:

const user = await getCurrentUserOrNull()
if (user) {
  await requireAccess(...)
}
// request continues when user is null

Protected routes must require authentication immediately with requireCurrentUser() or a strict equivalent.

Complete these production fixes.

1. Branch and dependency cleanup
- Stay on release/production-ready.
- Use pnpm only.
- Add missing scripts:
  - test
  - test:e2e
  - typecheck
- Add required dependencies:
  - @playwright/test
  - vitest if unit tests are used
  - server-only if imported
- Ensure pnpm install --frozen-lockfile passes.

2. Model registry and validation
- Ensure lib/constants.ts exports getVisibleModels().
- Add:
  - assertValidModel(model)
  - getDefaultAvailableModel()
- Reject unknown model IDs.
- Reject unavailable provider models when required API key is missing.
- Fix stale hardcoded defaults.
- /api/create-chat and stream generation must validate requested model before use.

3. Final AuthZ layer
Create or finalize lib/authz.ts with:
- getCurrentUserOrNull()
- requireCurrentUser()
- requireAdmin()
- requireChatAccess(chatId, level)
- requireMessageAccess(messageId, level)
- requireProjectAccess(projectId, level)
- getScopedChatListWhere()
- authErrorResponse()

Access levels:
- viewer: read only
- editor: create/update/sync/generate/design apply
- owner: env save, GitHub connect, create PR, publish, delete, project management

Rules:
- REQUIRE_GOOGLE_AUTH=false may allow local dev user only outside production.
- In production, auth must default secure.
- No protected route can continue when user is null.

4. Protect all private routes/actions
Fix:
- /api/create-chat
- /api/get-next-completion-stream-promise
- /api/workspace/[chatId]
- /api/blob-upload
- /api/import-github-repo
- /api/messages/[id]/preview-image
- /api/rewrite-prompt
- /api/build-spec
- all admin routes
- all chat/project/message server actions

Expected status codes:
- unauthenticated: 401
- unauthorized: 403 or 404 where hiding existence is safer
- not found: 404
- validation error: 400
- rate limited: 429
- production errors must not expose stack traces

5. Remove local placeholder ownership
Remove production usage of:
- LOCAL_USER_ID
- workspace@hyperspeed.local
- fake local projects

In production/auth-required mode:
- orphan chats must not auto-create fake projects.
- orphan chats return 404/403.
- Add scripts/backfill-orphan-chats.ts for explicit migration only.
- Backfill must require env vars and never run automatically during normal requests.

6. Secure uploads fully
Add/finalize FileUpload model:
- id
- userId
- blobUrl
- pathname
- filename
- mimeType
- size
- chatId optional
- messageId optional
- createdAt
- indexes on userId, chatId, messageId, createdAt

/api/blob-upload must:
- require auth
- validate MIME
- validate size
- validate file count
- enforce monthly quota
- upload privately where supported
- create FileUpload row
- return upload ID and URL metadata
- never trust arbitrary remote URLs

/api/create-chat must:
- accept attachment upload IDs or blob URLs
- verify every attachment belongs to current user
- reject unowned URLs
- link uploads to chat/message after chat creation

7. Rate limiting
Implement durable production limiter:
- Upstash/KV required in production OR Prisma RateLimit fallback
- if rate storage is missing and RATE_LIMIT_DISABLED !== true, fail closed
- create-chat per user
- stream generation per user/model
- GitHub import per user
- blob upload per user
- design apply per user/chat
- admin-sensitive routes
- return 429 with retry information

8. Admin hardening
- Remove hardcoded fallback admin email.
- In production, missing ADMIN_EMAIL must not create fallback admin.
- requireAdmin() must use real authenticated session.
- old password admin login remains disabled.
- Add AuditLog writes for:
  - admin setting change
  - env save
  - publish
  - create PR
  - design apply
  - checkpoint restore
  - file upload

9. Environment variable encryption
Encrypt EnvironmentVariable.value at rest.
- Use ENCRYPTION_SECRET or derive from AUTH_SECRET.
- Use AES-GCM or equivalent authenticated encryption.
- Never return raw values to client.
- Return masked values only.
- Support backward compatibility for existing plaintext values.
- save-env encrypts before database write.
- decrypt only server-side when needed.

10. Rebuild Design Mode
The current Design Mode is visually broken and too console-like. Rebuild it as a production-grade visual editor.

Layout:
- left rail: minimal icons only
- left history/checkpoints panel: collapsible
- center preview canvas: primary dominant area
- right inspector: collapsible desktop panel
- mobile inspector: bottom sheet
- bottom diagnostics: hidden by default, opens only on errors
- no overlapping panels
- no squeezed preview
- no blank black preview shell
- no huge debug hierarchy always visible
- thin separators only
- dark/light/system support
- responsive from 390px to large desktop

Preview canvas:
- sandbox iframe always visible
- desktop/tablet/mobile viewport controls
- fit-to-screen
- zoom controls
- reload preview
- runtime error capture
- loading/empty/error states
- no blank black screen without useful diagnostics

Element inspection:
- postMessage bridge between iframe and parent
- hover inspect toggle
- click to select only when inspector mode is active
- subtle 1px selection outline
- small floating label
- no big blue overlays
- no layout shift
- Escape clears selection
- collect tag, text snippet, className, accessible name, role, bounding box, file/component hint

Inspector:
- selected element summary
- breadcrumb/hierarchy
- spacing controls
- typography controls
- color/background controls
- accessibility checks
- prompt-based edit instruction
- Apply, Reset, Save
- all buttons must work
- save state must be real backend status

Backend design routes:
Create:
- GET /api/design/[chatId]
- POST /api/design/[chatId]/apply
- POST /api/design/[chatId]/checkpoint
- POST /api/design/[chatId]/restore

Rules:
- all use requireChatAccess
- GET requires viewer
- apply/checkpoint require editor
- restore requires owner or editor depending checkpoint policy
- never operate on another user’s project
- apply route uses selected element metadata + instruction + current project files
- natural-language design edits use LLM/code patching pipeline
- validate changed files before saving
- save valid changes to ProjectFile
- return changed files, validation, preview reload token
- if validation fails, return diagnostics and do not silently save invalid files

Add DesignCheckpoint model:
- id
- chatId
- projectId
- userId
- name
- snapshot Json
- createdAt
- indexes on chatId, projectId, userId, createdAt

Restore must update ProjectFile rows transactionally.

11. Generated code validation
Upgrade validation:
- syntax validation
- TypeScript transpile diagnostics
- missing import detection
- path traversal prevention
- dependency allowlist
- validate before publish
- validate before create-pr
- validate before design apply save
- auto-repair max 3 attempts

12. CI/CD
Add .github/workflows/ci.yml.

It must run:
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm build
pnpm test
pnpm test:e2e

Use safe placeholder env vars.
Do not leak secrets.

13. Real tests
Add real tests, not expect(true).

Unit:
- authz helpers
- model validation
- env encryption
- rate limiter
- upload validation

Integration:
- unauthenticated create-chat returns 401
- User A cannot access User B chat
- User A cannot stream User B message
- workspace sync requires editor
- save-env requires owner
- create-pr requires owner
- blob upload creates FileUpload row
- create-chat rejects unowned attachment URL
- rate limiter fails closed in production
- non-admin blocked from admin APIs

E2E:
- homepage composer renders
- auth-required mode blocks private routes
- create chat flow works after login/mock auth
- chat page loads authorized chat
- Design Mode opens without layout breaking
- preview stays visible
- inspector selection does not distort layout
- checkpoint restore works

14. Documentation
Update truthfully:
- README.md
- CONTRIBUTING.md
- SECURITY.md
- HARDENING_GUIDE.md
- ARCHITECTURE_UPDATE.md
- .example.env

Do not say production complete unless the verification commands pass.

15. Final verification
Run:
pnpm install --frozen-lockfile
DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:5432/llamacoder_ci}" pnpm prisma validate
pnpm prisma generate
pnpm lint
pnpm build
pnpm test
pnpm test:e2e

Manual verification:
- unauthenticated users cannot create chats
- unauthenticated users cannot stream generations
- unauthenticated users cannot update preview images
- User A cannot access User B chat/project/files/uploads
- upload creates FileUpload row
- create-chat rejects unowned upload URLs
- env vars encrypted at rest
- admin fallback email removed
- rate limiter fails closed
- Design Mode responsive on 390px mobile and desktop
- preview no longer becomes blank black
- inspector Apply changes real project files
- checkpoint restore works

Final report must include:
- exact files changed
- migrations added
- tests added
- commands run
- command results
- remaining risks, if any
- merge readiness verdict

Only after all commands pass, prepare PR:
release/production-ready -> main
