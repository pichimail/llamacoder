# CHINNA-CODER HOUSE DESIGN SYSTEM

This spec governs the visual style of EVERY generated app.

## PRIORITY (read first — non-negotiable order)
1. If the user explicitly requests a style, theme, color, aesthetic, or references a specific look (brutalist, glassmorphic, retro, a named brand, a screenshot, etc.) → THEIR request fully overrides this house style. Build exactly what they asked.
2. If the user specifies SOME visual details but not all → honor every detail they gave; fill only the unstated gaps from this house style.
3. If the user says nothing about visual style → apply this entire house style.
Never blend a contradicting house rule into an explicit user style. User intent wins.

## HOUSE STYLE (applies when user is silent on style)

### Theme toggle (MANDATORY — every generation, no exceptions)
- EVERY generated output — landing pages, marketing sites, web apps, dashboards, e-commerce storefronts, e-com dashboards, admin panels, auth screens, anything — MUST include a working Light / Dark / System theme toggle. This is never optional and never skipped, regardless of app type.
- Three modes, all functional: Light, Dark, and System (System follows the OS via prefers-color-scheme and updates live when the OS preference changes).
- Implement with a real mechanism (e.g. next-themes or a documented CSS-variable + class strategy) that actually works in the live preview — not two unused CSS classes. Persist the user's choice.
- Place the toggle where users expect it: top-right of nav/header for sites and landing pages; sidebar footer or topbar for dashboards/admin/apps.
- Both Light and Dark must be fully designed and readable — no invisible text, no washed-out borders, no broken contrast in either mode. System must resolve correctly to whichever the OS reports.

### Color
- Dark mode is the default starting point. Near-black base (#000 / #0A0A0A), not slate-900.
- Exactly ONE intentional accent per app. Never ship raw default Tailwind slate/zinc/gray as the entire palette.
- The accent and both themes must stay consistent across every page/route of the app.

### Surface & depth
- 12px radius baseline.
- 1px hairline separators only. NO stacked drop-shadows. NO double-layered backgrounds behind icons, buttons, or cards.
- Controls float over a single clean surface. One surface level, not nested boxes.

### Type & space
- Intentional type scale with real hierarchy (clear display / heading / body / caption steps).
- Generous, deliberate spacing. No cramped default gaps, no uniform-grey card walls.

### Anti-SOP (forbidden generic AI look)
- Do NOT emit the default "centered title + 3 equal feature cards + default buttons" template.
- Demand structural variety and a confident, specific layout for the app type.
- No purple-to-pink generic gradients unless the user asked. No lorem-ipsum filler. No fake logos/metrics/testimonials unless requested.
- Target polish/density of Linear, Vercel, Stripe, Raycast.

### Responsive (non-negotiable, every build)
- Mobile-first. Verify layout holds at 375px, 768px, 1280px.
- No horizontal overflow, no overlapping text, no hover-only interactions required to use the app.

### Functional (every build)
- Every interactive element wired with real local behavior: nav, tabs, dialogs, sheets, forms, filters, search, toggles.
- Every data surface includes real empty, loading, and error states. No static decoration passed off as a working feature.
- Multi-page/full-stack: real route entries with working in-preview navigation; backend-shaped files kept out of the preview render path.
