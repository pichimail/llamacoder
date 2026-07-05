# Changelog — Phase 3 (AI Integration Chooser)

| File | Change |
|---|---|
| `lib/ai-detection.ts` | NEW: `requiresAI(prompt)` scans for 30+ AI keyword patterns across 6 capability categories (text, vision, image, code, music, video); exports `CAPABILITY_MODEL_MAP` linking each to a ChinnaLLM tier. Pure function, no DB/network. |
| `components/chats/ai-integration-chooser.tsx` | NEW: non-blocking inline Card with 3 options — ChinnaLLM (shows live credit balance), BYOK (inline key input + encrypted save), Skip (stubs). shadcn Card/Badge/Button/Input, mobile-stacked, accessible. |
| `components/chats/credit-indicator.tsx` | NEW: header pill showing `⚡ N credits` with color coding (green >50, amber 10–50, red <10, pulsing red 0). Popover with plan, balance, reset date, and manage/BYOK links. Auto-refreshes every 60s. Only renders when `aiIntegration === "chinnallm"`. |
| `lib/prompts.ts` | Added `getChinnaLLMPromptBlock(aiIntegration, capabilities)` — returns full system-prompt injection for chinnallm (SDK + proxy route), byok (env-based client + server proxy), or skip (stubs with TODOs). `getMainCodingPrompt` gains `aiIntegration` + `aiCapabilities` params; block appended after style/3D blocks. Existing prompt rules untouched. |
| `app/api/create-chat/route.ts` | Added `aiIntegration` (enum, nullable) and `aiCapabilities` (string array) to zod schema; stored on Chat record; passed through to `getMainCodingPrompt`. |
| `app/api/chats/[id]/route.ts` | PATCH handler extended: accepts `aiIntegration` field, updates Chat record via Prisma. Added `getPrisma` import. |
| `app/(main)/chats/[id]/page.client.tsx` | Imports `AIIntegrationChooser`, `CreditIndicator`, `requiresAI`. Adds chooser state (`aiChooserPending`, `aiChooserCapabilities`, `pendingGenerateCallback`). Initial-generation effect gates on AI detection for first messages — shows chooser, pauses generation, resumes on selection. Builder panel renders chooser overlay when pending. CreditIndicator added to header right section. |
| `app/(main)/home-page.client.tsx` | Imports `requiresAI`; passes detected `aiCapabilities` array in the create-chat request body so the prompt injection applies from the first generation. |
| `CHANGELOG-PHASE3.md` | This file. |
| `README-PHASE3.md` | Setup + verification tests. |

Verified: `tsc --noEmit` 0 errors · 28/28 unit tests pass · `next build` exit 0 · no "OpenRouter" in user-visible surfaces · chooser never triggers for non-AI prompts (detection is keyword-gated).
