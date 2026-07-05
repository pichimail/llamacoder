# Phase 2 Missing Pieces Changelog

## Files touched

- `app/(main)/home-page.client.tsx` — removed the hero radial-gradient backdrop, removed the gradient text treatment from `Preview.`, and kept the hero on `bg-background` / `text-foreground`.
- `app/pricing/page.tsx` — added the static Pricing page with Free, Pro, and Enterprise shadcn Card plans, including monthly price, credit grant, model tier access, backend mode, custom domains, and CTAs.
- `components/global-app-shell.tsx` — added `/pricing` to the global sidebar navigation.
- `app/(main)/chats/[id]/page.client.tsx` — kept the existing validation/auto-fix logic intact while preventing the manual validation-error dialog from being immediately cleared by a page refresh.
- `app/(main)/chats/[id]/code-viewer.tsx` — added subtle `Fixing error automatically...` text beside the existing auto-fix status indicator while automatic fixing is running.
- `CHANGELOG-PHASE2-MISSING-PIECES.md` — added this deliverable changelog.

## Routing confirmation

- `/` is served by `app/(main)/page.tsx`, which renders `HomePageWrapper`, which renders `app/(main)/home-page.client.tsx`.
- No competing root `app/page.tsx` file is present.
- `npm run build` confirms both `/` and `/pricing` are present in the App Router output.
