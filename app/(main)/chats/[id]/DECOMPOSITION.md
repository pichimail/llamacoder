# page.client.tsx Decomposition Status

## Extracted modules (on main, ready to wire)

| Module | Path | Contents |
|--------|------|----------|
| Helpers | `./chat-helpers.ts` | `getMessageFiles`, `normalizeFile`, `autoFixFingerprint`, `isNonFixablePreviewError`, `isPlanModeConversation`, `validationDescription`, `formatFixFileContext`, `detectRequiredEnvKeys`, constants |
| Chrome | `./builder-chrome.tsx` | `BuilderMode`, `BackendSetupPanel`, `BuilderModeButton`, `ProjectMenuItem`, `SheetAction`, `OpenAppMenuAction` |
| Auto-fix | `./use-auto-fix.ts` | Full auto-fix ledger + requestFix/triggerAutoFix/preview handlers |
| Stream | `./use-chat-stream.ts` | Stream state, URL generation, continuation, finalContent merge |

## Current state of page.client.tsx

Still self-contained (local copies of helpers + chrome + inline stream/autofix).
Modules above are additive — app behavior unchanged.

## Wiring order (do not skip)

1. Replace local pure functions with imports from `chat-helpers`
2. Replace local UI subcomponents with imports from `builder-chrome`
3. Wire shared refs, then `useAutoFix` + `useChatStream` (stream owns refs; autofix callbacks via refs to break cycle)
4. Delete inlined stream/autofix bodies
5. Verify: prompt → stream → extract → preview → edit → continue

## Circular dependency note

`useChatStream` accepts `triggerAutoFixRef` / `presentBuildErrorRef`.
Page must set those refs after `useAutoFix` returns.
