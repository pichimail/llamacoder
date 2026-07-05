# Truncation Fix — Changelog

## Root cause fixed
Generation was silently stopping mid-file on large builds with no error and no recovery.

## Files changed

1. **lib/chat-completion-stream-client.ts** — Now reads `finish_reason` from every
   stream chunk (previously typed but never read). Emits a `finishReason` event and
   passes `{ finishReason, wasTruncated }` alongside the final content, so callers can
   tell a truncated response apart from a genuinely finished one.

2. **lib/constants.ts** — Added `maxOutputTokens` field to `ModelConfig` and a new
   `getMaxOutputTokensForModel()` helper with a safe `DEFAULT_MAX_OUTPUT_TOKENS = 16000`
   fallback. Generation code no longer hardcodes a token ceiling.

3. **app/api/get-next-completion-stream-promise/route.ts** — Replaced the hardcoded
   `maxTokens: 9000` with the resolved per-model ceiling. Added `isContinuation` and
   `continuationContext` to the request schema; when set, the route sends a
   continuation-specific system message instead of the fresh-build prompt-lock framing
   (so a continuation call never resets the app back to a blank scaffold).

4. **lib/generated-code-validation.ts** — Added `detectTruncatedFile()`: a structural
   fallback (bracket balance, unterminated strings, unclosed JSX tags, unclosed code
   fences) that flags a truncated file even if `finish_reason` is missing or misreported
   by a provider. Wired into the main validation loop as `[TRUNCATED_RESPONSE]` issues.

5. **app/(main)/chats/[id]/page.client.tsx** — Core continuation logic:
   - Raised `MAX_AUTO_FIX_ATTEMPTS` from 1 to 2.
   - Added `MAX_CONTINUATION_ROUNDS = 3` and `CONTINUATION_TAIL_CHARS = 6000`.
   - Added `currentGenerationRef`, `continuationRoundRef`, `accumulatedGenerationTextRef`,
     and `continuationStatus` state to track the in-flight generation's identity and
     accumulate text across automatic continuation rounds.
   - The `finalContent` handler now checks `wasTruncated`. If truncated and rounds
     remain, it automatically fires a new request with `isContinuation: true` and the
     tail of the accumulated text, shows a "Finishing remaining files..." toast, and
     resumes streaming — up to 3 rounds before falling back to a clear "still
     incomplete" toast (the partial result is still committed, never lost).
   - Flipped the component-level `autoFixEnabled` default from `false` to `true`.

6. **app/(main)/chats/[id]/chat-box.tsx** — `onNewStreamPromise` now also passes
   `messageId` and `model` so continuation works for messages sent directly from the
   chat box, not just the initial generation.

7. **lib/settings.ts** — Flipped the platform-wide `autoFixDefault` setting from
   `"off"` to `"on"`.

8. **app/api/public-settings/route.ts** — **Critical bug fix.** This route was
   hardcoding `autoFixDefault: false` in its response regardless of what the admin
   panel or `lib/settings.ts` actually had configured. This meant the admin's auto-fix
   toggle had **zero effect** — the client always received `false`. Fixed to actually
   read `s.autoFixDefault` from the resolved settings.

## What this means in practice
- Large multi-file builds that exceed the token ceiling now self-heal automatically
  instead of stopping silently.
- Auto-fix is on by default for new sessions and actually respects the admin setting.
- A structural safety net catches truncation even on providers that don't report
  `finish_reason` reliably.

## Known limitation
Full automatic continuation depends on `currentGenerationRef` being populated, which
requires the call site to pass `messageId`/`model` through `onNewStreamPromise`. This
is wired for the three main generation paths (initial build, chat-box follow-ups,
autofix). If any other future call site starts a stream without setting this ref,
truncation will still be *detected and shown to the user* via the toast/validation
fallback, but won't auto-continue — it degrades gracefully rather than silently.
