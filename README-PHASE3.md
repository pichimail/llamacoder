# Phase 3 — AI Integration Chooser

When a user's prompt needs AI capabilities (chatbot, summarizer, vision, image gen, etc.), a non-blocking chooser card appears before generation begins, letting them pick ChinnaLLM credits, BYOK, or stub-only mode. The system prompt is then injected with the right SDK, proxy route, or TODO stubs. Non-AI prompts are completely unaffected.

## Setup

No new migrations or env vars beyond Phase 2. The `aiIntegration` column was added to `Chat` in Phase 2's schema.

```bash
npm install
npx prisma migrate dev    # if not already applied
npm run dev
```

## How to verify Phase 3

**Test 1 — Non-AI prompt (zero UX change).**
Prompt: `build a landing page`. The chooser must NOT appear. Generation starts directly, identical to pre-Phase-3 behavior. The `requiresAI()` function returns `{ detected: false, capabilities: [] }` for this prompt.

**Test 2 — AI prompt triggers chooser.**
Prompt: `build a chatbot with AI`. The chooser card appears in the builder panel showing detected capabilities (e.g. `[Text AI]`), three options (ChinnaLLM / BYOK / Skip), and a live credit balance. Generation is paused until selection.

**Test 3 — ChinnaLLM selection.**
Select "ChinnaLLM" in the chooser. After the page resumes generation, the system prompt includes the full `getChinnaLLMPromptBlock("chinnallm", ...)` injection: the model is instructed to generate `lib/chinnallm.ts` (SDK) and `app/api/ai/invoke/route.ts` (proxy), and to use `chinnaLLM.text()` etc. in components. The generated app should include these files and show loading/error states around AI calls.

**Test 4 — Skip selection.**
Select "Skip for now". The system prompt includes the stub block. Generated AI functions return placeholder strings with `// TODO: Replace with real AI integration` comments. UI shows "AI feature coming soon" states. No real API calls. Clean compilation.

**Test 5 — BYOK selection.**
Select "Bring Your Own Key". An inline key input appears. Enter a test key (e.g. `sk-test-12345678`) and click "Save & continue". The key is stored encrypted via `POST /api/chinnallm/byok`. The system prompt includes the BYOK block: a `lib/ai-client.ts` reading from env and a server-side proxy route.

**Test 6 — Credit indicator.**
After selecting ChinnaLLM, the chat header shows `⚡ N credits` pill (visible on md+ screens). Color: green if >50, amber 10–50, red <10, pulsing red at 0. Clicking opens a popover with plan tier, balance, reset date, and links to manage credits and add a BYOK key. The indicator only appears for chats where `aiIntegration === "chinnallm"` — not for BYOK, skip, or non-AI chats.

## Architecture

```
User prompt
  → requiresAI(prompt)           # lib/ai-detection.ts (client, pure)
  → detected? Show chooser       # components/chats/ai-integration-chooser.tsx
  → Selection → PATCH /api/chats/[id] { aiIntegration }
  → Resume generation
  → create-chat passes aiCapabilities[]
  → getMainCodingPrompt(..., aiIntegration, aiCapabilities)
    → getChinnaLLMPromptBlock()   # lib/prompts.ts (additive append)
  → Model generates SDK/stubs based on injection
```

## Summary

Phase 3 adds intelligent AI feature detection and a three-option integration chooser that gates generation only when the prompt needs AI capabilities — non-AI prompts see zero UX change. The chooser feeds into an additive prompt injection system that instructs the code-generation model to produce the right SDK client, proxy route, and error handling (ChinnaLLM), an env-based client (BYOK), or clean stubs with TODO comments (Skip). A color-coded credit indicator pill in the chat header provides live balance visibility for ChinnaLLM-powered chats. All changes are additive: existing prompt rules, routing, and file-structure sections are untouched; the detection is keyword-gated so it never false-positives on plain UI prompts.
