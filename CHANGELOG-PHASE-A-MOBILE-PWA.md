# Phase A — Mobile PWA Foundation — Changelog

## Delivered and real in this pass

1. **public/manifest.json** — full PWA manifest (name, icons, standalone display,
   theme colors) — required for installability.
2. **public/sw.js** — app-shell service worker. Caches static shell assets, always
   bypasses cache for `/api/*`, HMR, and streaming (SSE) requests so generation and
   live preview are never served stale.
3. **components/service-worker-registration.tsx** — registers the SW on load,
   fails silently on unsupported browsers/local http.
4. **components/install-prompt.tsx** — real "Add to Home Screen" banner:
   - Android/Chrome: listens for the native `beforeinstallprompt` event, one tap
     triggers the real OS install dialog.
   - iOS Safari (no `beforeinstallprompt` support exists on iOS): shows manual
     Share → Add to Home Screen instructions inline.
   - Dismissible, remembers dismissal for 14 days via localStorage, respects
     safe-area-inset-bottom, hidden entirely once running in standalone mode.
5. **app/layout.tsx** — wired manifest link, `viewport-fit=cover`, apple-web-app
   meta tags, theme-color, and mounted the install prompt + SW registration.
6. **app/globals.css** — global mobile hardening:
   - `overflow-x: hidden` safety net on html/body so no page can horizontally
     break out of the viewport regardless of an individual component's own sizing.
   - `.safe-area-top/bottom/left/right/x` utility classes for any fixed-position
     element (bottom nav, sheets, composer bars) to respect notches/home indicators.
   - `[data-icon-only="true"]` enforces a 44×44px minimum touch target on mobile
     for icon-only buttons without changing their visual icon size.
   - `[data-swipe-row="true"]` gives any element opted into it real momentum
     horizontal scroll with snap points and a hidden scrollbar — ready to apply
     to model-picker chips, template galleries, admin tabs, etc.

## What this does NOT cover yet (honest scope note)

The full "audit every page for overflow/bottom-sheet conversion/gesture rewiring"
from the original Phase A prompt is a much larger effort that requires reading
every page component individually — I was asked to ship the working foundation
now rather than risk a rushed, partially-broken sweep across the whole app.

**Still pending, needs a dedicated follow-up pass:**
- Converting existing centered Dialogs to bottom Sheets specifically on mobile
  (shadcn Sheet component already exists in this repo — this is a per-dialog
  swap, not new infrastructure).
- Applying `data-swipe-row="true"` to the actual horizontally-scrollable
  elements (model picker, template gallery, admin tabs) — the CSS is ready,
  the markup attribute needs adding per element.
- A fixed bottom tab bar (Chat | Code | Preview | Settings) for the chat page
  on mobile — not yet built.
- Page-by-page touch-target and overflow audit — the global CSS overflow guard
  prevents the worst case (breaking the viewport) but doesn't fix cramped
  layouts within a page.

## How to verify what's here now
1. `npm run build && npm start`, open on a real phone or Chrome DevTools device
   emulation at 375px width.
2. Chrome DevTools → Application → Manifest: should show no errors, icons load.
3. On Android Chrome: should see the install banner after a few seconds; tapping
   Install triggers the real OS prompt.
4. On iOS Safari: should see the banner with manual instructions when tapped.
5. Confirm no page has horizontal scroll/overflow at 375px (global CSS guard).
