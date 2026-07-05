# Design System Feature — Changelog

## What was audited first
Your VS Code Codex session (GPT-5.5) had already genuinely completed real work
before this pass: removed the landing page gradient (confirmed in
CHANGELOG-PHASE2-MISSING-PIECES.md), added /pricing, and started the build
error overlay UX. That work is untouched and preserved.

## What this pass adds (all new — nothing here existed before)

### 1. Expanded from 5 to 12 built-in design styles
`lib/sandbox-theme.ts`: added brutalist, oled-dark, liquid-metal, neon-tokyo,
terra-earth, minimal-mono, and shadcn-default — each a genuinely distinct,
complete CSS token set (not a copy-paste of an existing preset), matching the
names you specified. `lib/prompts.ts` got a matching STYLE_DIRECTION_BLOCKS
entry for each, with explicit anti-patterns per style so generation actually
follows the chosen look strictly, not loosely.

### 2. Removed the old chip rows you didn't like
- The inline "Modern SaaS / Editorial / Warm / Vibrant / Glass" chip row is
  gone — replaced by the icon-triggered `DesignPicker` (a palette icon,
  matching your reference screenshot, opening a popover).
- "Add structure" and "Add variables" (which just appended canned boilerplate
  text to your prompt) are removed entirely — they added little value.
- "Save prompt" and "Library" are kept (they're a real, useful feature — your
  own saved prompts) but moved into the existing "..." actions dropdown
  instead of sitting as a permanent chip row, decluttering the composer.

### 3. "Start with your design" — full new feature, persisted per user
- New `DesignPreset` Prisma model, scoped to the user, with cascade delete.
- New routes: `GET/POST/DELETE /api/design-presets` (list/create/delete) and
  `GET /api/design-presets/[id]` (fetch full content when applying one).
- New `DesignSystemDialog` component matching your reference screenshot:
  paste DESIGN.md, upload a .md/.txt file, GitHub repo URL, website URL,
  additional instructions, Continue button.
- Saved designs appear in the `DesignPicker` popover under "Your designs,"
  selectable for any future build — exactly the "show their design to them
  for using in the future" behavior you asked for.
- Selecting a custom design overrides the 12 built-in presets for that build:
  `lib/prompts.ts` has a new `getCustomDesignBlock()` that injects the user's
  own DESIGN.md as a **strict, binding contract** the model must follow
  exactly — wired through `create-chat`'s new `designPresetId` field.

### 4. Honest limitation, not faked
Uploading images/fonts/logos and .fig files, and automated style extraction
from a GitHub repo or website URL, are **not implemented** in this pass —
real visual-asset parsing and repo/site scraping is a substantial separate
feature. The dialog is upfront about this: the image/fonts/logo upload box
shows a "Coming soon" badge, and if you only provide a GitHub/website URL
without pasting or uploading a DESIGN.md, the dialog shows an inline note
explaining that your typed "Additional instructions" will carry the design
intent instead of a real automated scan. This was a deliberate choice over
silently pretending those inputs do something they don't.

### 5. vulk.dev-style app-type chips
New `AppTypeChips` row below the composer: Prototype, Backend, Web app,
Mobile app, 3D/WebGL, Image, Video, App stores — matching your reference
screenshot's layout and lock-icon treatment for premium-gated types (Mobile
app, 3D/WebGL, Image, Video, App stores are gated behind feature flags
`app-type-mobile` / `app-type-3d` / `app-type-image` / `app-type-video` /
`app-type-stores`, which default to off — turn them on per plan in the
existing admin Feature Flags page). Selecting "Backend" reuses your existing
`backendEnabled` toggle and its already-working Neon/Prisma generation path
rather than introducing a second, competing concept.

## What was NOT touched
Everything else from prior phases — ChinnaLLM engine, admin dashboard, the
artifact settings panel, pricing page, truncation fix, PWA — is untouched.

## How to verify
1. `npx prisma migrate dev` (new `DesignPreset` table).
2. Open `/`. The old style chips and "Add structure/variables" chips should
   be gone. A palette icon should appear in the composer's bottom toolbar.
3. Click the palette icon — should show "Start with your design" plus 12
   named design styles with distinct swatch colors and descriptions.
4. Click "Start with your design" — the full dialog should match the
   reference layout (paste/upload/GitHub/website/instructions/Continue).
5. Paste some DESIGN.md-style text, name it, click Continue — should save,
   toast success, and show under "Your designs" in the palette popover on
   next open.
6. Start a build with a saved custom design selected — the generated app
   should visibly follow the pasted design's described colors/spacing/tone,
   not one of the 12 built-in presets.
7. The new app-type chip row should appear below the composer, with locked
   (grayed, lock-icon) chips for Mobile app/3D/Image/Video/App stores unless
   those feature flags are turned on in `/admin/flags`.
