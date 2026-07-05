# chinnacoder-FINAL-CLEAN.zip — What's in here

## Confirmed working (verified by code grep before packaging)

### Bug fixes (verified not regressions)
- `app/api/create-chat/route.ts` — Prisma relation fix: `project: { connect: { id: project.id } }` not bare scalar
- `app/api/import-github-repo/route.ts` — same fix
- `app/api/public-settings/route.ts` — reads real `s.autoFixDefault` from settings DB, not hardcoded `false`
- `public/sw.js` — never intercepts navigation requests; always returns a real Response; never undefined
- `components/service-worker-registration.tsx` — production-only; auto-unregisters stale SW in dev

### Truncation fix (fully wired)
- `lib/chat-completion-stream-client.ts` — reads and emits `finish_reason`; sets `wasTruncated`
- `lib/constants.ts` — `DEFAULT_MAX_OUTPUT_TOKENS = 16000`; `getMaxOutputTokensForModel()`
- `app/api/get-next-completion-stream-promise/route.ts` — uses `resolvedMaxTokens` not hardcoded 9000; `isContinuation` support
- `app/(main)/chats/[id]/page.client.tsx` — `MAX_CONTINUATION_ROUNDS = 3`; auto-continues on truncation; exhausted Alert UI; `autoFixEnabled` default `true`; `MAX_AUTO_FIX_ATTEMPTS = 2`
- `lib/generated-code-validation.ts` — `detectTruncatedFile()` structural fallback
- `lib/settings.ts` — `autoFixDefault: "on"` platform default

### ChinnaLLM engine (fully wired)
- `lib/chinnallm/` — invoke, credits (5 `prisma.$transaction` calls), encryption, models, sdk-template, index
- `app/api/chinnallm/` — invoke, models, credits, byok routes
- `app/api/chinnallm/admin/` — models CRUD, usage stats, credits management (all admin-guarded)
- `components/chats/ai-integration-chooser.tsx` — chooser UI
- `components/chats/credit-indicator.tsx` — credit display

### Premium themes
- `lib/sandbox-theme.ts` — 5 presets: modern-saas (default), editorial-dark, warm-neutral, vibrant-accent, glassmorphism
- `lib/sandpack-config.ts` — theme CSS merging, Three.js allowed

### Visual inspector (Phase B)
- `lib/design-inspector.ts` — extended with tree nodes, precise `applyClassProperty`, `STYLE_PROPERTY_MATCHERS`
- `lib/design-inspector-runtime.ts` — live DOM tree via MutationObserver, request-tree support
- `components/chats/design-inspector-bridge.tsx` — tree forwarding, onTreeUpdate
- `components/chats/design-workspace.tsx` — Layers/History toggle, tree-synced left panel
- `components/chats/mode-design.tsx` — full Typography/Color/Layout property editor, box-model diagram, scoped-instruction flow

### PWA / Mobile (Phase A)
- `public/manifest.json` — full PWA manifest
- `public/sw.js` — production-only app-shell SW (no navigate interception)
- `components/install-prompt.tsx` — Android native + iOS manual install flow
- `components/service-worker-registration.tsx` — production-only registration
- `app/globals.css` — overflow guard, safe-area utilities, swipe-row, touch-target enforcement
- `app/layout.tsx` — manifest link, viewport-fit=cover, apple-web-app meta

### Admin
- `app/admin/chinnallm/page.tsx` — model management with real CRUD
- `app/admin/credits/page.tsx` — credit management
- `app/admin/users/page.tsx` — user management

## What is NOT in this zip

- Phase C (per-artifact settings panel, per-plan feature gating, pricing plans) — not built yet
- sidebar-08/sidebar-13/dot-flow/lucide-animated registry installs — not installed (CLI commands can't run offline)
- Landing page redesign — gradient still present, not yet replaced
- Phase B Step 3 full shadcn conversion of every button in page.client.tsx — partial only
- `prisma/seed.ts` — not present; migration files may need `prisma migrate dev` on your end

## First thing to do after unzipping

1. `npm install`
2. In Chrome DevTools → Application → Service Workers → click "Unregister" (clears the old broken SW)
3. `npx prisma generate`
4. `npx prisma migrate dev`
5. `npm run dev`

If you get a TypeScript error on first run, it's almost certainly a missing `@types/*` package that only shows up after `npm install` in a real environment. Report the exact error and it's a one-line fix.
