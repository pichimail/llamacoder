# Phase B — Real Visual Inspector — Changelog

## Audit finding (Step 1)
The old design mode was NOT thrown away wholesale — audited first, as instructed.
What existed:
- `lib/design-inspector.ts`, `lib/design-inspector-runtime.ts`,
  `components/chats/design-inspector-bridge.tsx`: solid, working postMessage
  hover/select bridge between the Sandpack iframe and the parent. This
  infrastructure was genuinely good and was **kept and extended**, not replaced.
- `components/chats/mode-design.tsx`: this was the actual quality gap. It had
  only a basic instruction-chip system with crude keyword matching
  (`if (text.includes('contrast')) appendUtility(...)`), a flat token list, and
  no real typography/color/layout property editor, no layers tree, no box-model
  diagram. **This file was fully replaced.**

## What's new and real

1. **Live DOM layers tree** — `lib/design-inspector-runtime.ts` now builds and
   broadcasts a real tree of every inspectable element in the rendered iframe
   (via `MutationObserver`, debounced), not a static source-code guess. New
   `tree`/`request-tree` message types added to the existing protocol in
   `lib/design-inspector.ts`. The bridge (`design-inspector-bridge.tsx`)
   forwards this to the parent and requests a fresh tree whenever the
   inspector is enabled.
2. **Layers panel (left rail)** — `design-workspace.tsx`'s left rail now has a
   Layers/History toggle. Layers shows the live tree, indented by real DOM
   depth, click-to-select, hover-to-highlight (synced both ways with the
   preview overlay). History still shows the existing checkpoint system.
3. **Real property editor (right panel)** — `mode-design.tsx` is a complete
   rewrite with:
   - **Typography**: font family, size, weight, bold/italic toggles, line
     height, letter spacing, alignment, case, decoration — all real controls,
     all read the selected element's current values and write back precise
     Tailwind arbitrary-value classes (`text-[22px]`, `tracking-[0.02em]`, etc).
   - **Color**: text/background color pickers (native `<input type="color">`
     in a shadcn Popover + synced hex text input).
   - **Layout**: display selector + a real box-model diagram (margin outer
     ring, padding inner ring, content center) with per-side numeric inputs.
   - **Instructions**: free-text box + preset chips that sends a **scoped**
     follow-up prompt targeting only the selected element/file — reuses the
     exact same message + `?generate=` pipeline as every other chat turn
     (including the truncation/continuation logic from the prior fix), not a
     parallel code path.
   - **Action bar**: Reset / Preview / Apply & Save, matching the reference
     screenshot's pattern.
4. **Precise class editing primitive** — new `applyClassProperty()` and
   `readClassProperty()` in `lib/design-inspector.ts`, built on predicate
   functions rather than string-prefix matching. This matters: the old
   `replaceClassToken()` approach would have let a font-size edit
   (`text-[22px]`) accidentally strip a text-color edit (`text-[#3b82f6]`)
   since both start with `text-[`. Each property now has its own exact
   matcher (see `STYLE_PROPERTY_MATCHERS`), so edits never conflate.
5. **Truncation UI polish (Step 4)** — when the automatic continuation loop
   (from the earlier truncation fix) exhausts its 3 rounds, the chat page now
   shows a persistent shadcn `Alert` with a `Continue` button right above the
   composer — matching the reference screenshot's "Generation was interrupted
   — retry to continue" pattern — instead of a toast that disappears.

## Step 3 — shadcn conversion (honest scope note)
Converted the raw `<button>` elements I introduced/touched this pass (layers
panel collapse toggle, checkpoint restore/create buttons in `design-workspace.tsx`)
to proper shadcn `Button`. I deliberately did **not** blindly convert the ~15-17
pre-existing raw buttons in `page.client.tsx` and `chat-box.tsx` that I didn't
author this session — several have specific compact/flush styling that a
default `Button` would fight, and converting 15+ unfamiliar call sites without
verifying each one's exact behavior risks silent regressions. This is a real
remaining task, not something to fake as done: **flag these files for a
dedicated shadcn-conversion pass** if full 100% conversion is required.

## How to test the inspector
1. Open any chat with a generated app, switch to "Design" mode.
2. **Layers**: left panel should show a real indented tree of the rendered
   app. Click any row — the corresponding element gets a highlight box in the
   preview.
3. **Select in preview**: click any element directly in the preview iframe —
   it highlights and the right panel populates with its current typography/
   color/layout values.
4. **Typography**: change Size to `24` — the preview updates immediately
   without a full reload. Toggle Bold — same. Check the underlying file in
   Code mode afterward — the class should show `text-[24px] font-bold`.
5. **Color**: click the Background swatch, pick a color — preview updates,
   class shows `bg-[#yourhex]`.
6. **Layout**: type `16` into the padding-top box in the box-model diagram —
   preview updates, class shows `pt-[16px]`.
7. **Instructions**: with an element selected, type "make this more compact"
   and click Send. Confirm: (a) it navigates through the normal `?generate=`
   flow, (b) only the targeted file changes, not the whole app.
8. **Apply & Save**: click it — confirms the edits persist as a real message
   in chat history and survive a page refresh.
9. **Truncation banner**: to test without waiting for a real truncation,
   temporarily lower `maxOutputTokens` for your test model in
   `lib/constants.ts` to something small (e.g. 200), prompt a multi-file app,
   and confirm the "Generation was interrupted" Alert with a working Continue
   button appears once the 3 automatic rounds are exhausted. Revert the test
   value afterward.

## Post-delivery hotfix (found via real user testing)

**Bug:** `prisma.chat.create()` in both `app/api/create-chat/route.ts` and
`app/api/import-github-repo/route.ts` used a bare `projectId: project.id`
scalar assignment against `Chat.project`, which is an **optional** relation
(`Project? @relation(...)`). This throws `Unknown argument 'projectId'` at
runtime depending on Prisma client generation state — confirmed by real
testing, not caught by any static check.

**Fix:** Changed both to the nested relation syntax:
`project: { connect: { id: project.id } }` — this is unconditionally valid
Prisma syntax for a relation field regardless of client generation quirks.

**Also run `npx prisma generate`** after pulling this — if your local
generated client predates recent schema changes, that alone can cause the
same class of error independent of this code fix.

**Bigger finding:** `app/api/workspace/[chatId]/route.ts` already implements
substantial parts of the originally-proposed "Phase C" (env vars, integrations,
deployments, share links, GitHub sync, project files) — this was not fully
audited before Phase C was scoped as a from-scratch build. Audit this file
first before running any Phase C prompt; it may need targeted fixes and a UI
layer, not a full rebuild.
