# Changelog — Phase 1

| File | Change |
|---|---|
| `lib/sandbox-theme.ts` | Replaced single flat-gray palette with 5 premium token sets (Modern SaaS, Editorial Dark, Warm Neutral, Vibrant Accent, Glassmorphism); added `getThemeCSS(styleId)`, `SANDBOX_STYLE_PRESETS`, `isSandboxStyleId`; kept `SANDBOX_GLOBALS_CSS` backward-compatible; added canvas CSS support for WebGL. |
| `lib/sandpack-config.ts` | B2: `sanitizePreviewCssContent` now extracts `:root`/`.dark` custom-property declarations (including inside `@theme` blocks) and merges them after injected preset CSS instead of discarding — only crash-causing directives are stripped; added `styleId` to `SandpackBuildOptions`; both globals.css injection points resolve theme via `getThemeCSS(options.styleId)`. |
| `lib/prompts.ts` | B3: added 5 additive STYLE DIRECTION blocks + `getStyleDirectionBlock`; B5: added 3D/WEBGL SUPPORT rule (react-three-fiber, drei, OrbitControls, canvas sizing, cleanup); `getMainCodingPrompt` accepts optional `styleId` and appends both blocks AFTER all existing rules — ABSOLUTE PROMPT OBEDIENCE, routing, and file-structure sections untouched. |
| `app/api/create-chat/route.ts` | B4: `shadcn` schema default flipped to `true`; added validated `styleId` field (default "modern-saas") passed into `getMainCodingPrompt`. |
| `app/(main)/home-page.client.tsx` | A1: full landing redesign — cinematic indigo/violet gradient hero (orange blob removed), framer-motion staggered headline reveal, typewriter cycling placeholder, focus-glow glassmorphic composer, indigo send button with spinner; B6: 5-swatch style preset picker wired to create-chat; new scroll-reveal sections (How it works, Built for production, Powered by ChinnaLLM) using shadcn Card/Badge/Button; restyled featured templates container; minimal dark footer with safe-area inset; `prefers-reduced-motion` respected throughout; chips meet 44px touch targets. shadcn default already flips via `useState(true)`. |
| `app/(main)/settings/page.client.tsx` | B4: `shadcnDefault: true`; B6: added `styleDefault` field + "Default output style" select. |
| `app/api/user-settings/route.ts` | B4: server-side `shadcnDefault` default flipped to `true`; added `styleDefault` enum field so the preference persists. |
| `CHANGELOG.md` | This file. |
| `README-PHASE1.md` | Setup, env table, verification tests. |

Notes: `three`, `@react-three/fiber`, `@react-three/drei` were already present in the sandpack dependency allowlist — verified, no change needed. `styleId` is passed into the generation prompt rather than persisted on the Chat model to keep Phase 1 free of DB migrations (fully backward-compatible); a `Chat.styleId` column + mid-session switching lands in Phase 2 with the chat-page action bar work.
