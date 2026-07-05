# Phase 1 — Premium Output Quality + Landing Redesign

## Setup

```bash
npm install            # runs prisma generate via postinstall
cp .env.example .env   # if present; otherwise create .env with the vars below
npx prisma migrate deploy   # or `npx prisma db push` for a fresh dev DB
npm run dev            # http://localhost:3000
```

## Environment variables

| Variable | Required? | What breaks without it | Where to get it |
|---|---|---|---|
| `DATABASE_URL` (or `POSTGRES_PRISMA_URL`) | REQUIRED | Chat creation returns 500 "missing database URL"; nothing persists | Neon / Supabase / any Postgres connection string |
| `TOGETHER_API_KEY` / `OPENROUTER_API_KEY` | REQUIRED (at least one provider) | Generation never starts — create-chat rejects with "no provider configured" | together.ai / openrouter.ai dashboards |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) | REQUIRED | Login/session breaks; authed routes fail | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OPTIONAL | Google sign-in unavailable; other auth still works | Google Cloud Console → OAuth credentials |
| `BLOB_READ_WRITE_TOKEN` | OPTIONAL | File/screenshot attachments fail to upload | Vercel → Storage → Blob |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | OPTIONAL | Rate limiting falls back / degrades | Vercel KV or Upstash |
| `ENCRYPTION_SECRET` | OPTIONAL | Stored per-user API keys can't be encrypted | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | OPTIONAL | No account is treated as admin | Your email |
| `GITHUB_TOKEN` / `GH_TOKEN` | OPTIONAL | GitHub import hits low rate limits on public repos | GitHub → Developer settings → PAT |
| `BRAINTRUST_API_KEY`, `HELICONE_API_KEY` | OPTIONAL | Observability/logging disabled, app unaffected | Respective dashboards |
| `OPENROUTER_BASE_URL`, `GENERATION_TEMPERATURE`, `FINETUNED_MODEL_ID` | OPTIONAL | Sensible defaults used | — |

## How to verify Phase 1

**Test 1 — Landing page.** Open `/`. You should see a dark cinematic hero (indigo/violet radial gradient + subtle grid, no orange blob), a staggered "Build. Preview. Ship." reveal, and a floating glassmorphic prompt composer whose placeholder types example prompts. The composer shows a row of five style chips with color dots (● Modern SaaS ● Editorial ● Warm ● Vibrant ● Glass). Scroll down: "How it works", "Built for production", and "Powered by ChinnaLLM" sections animate in on scroll; footer is minimal and dark.

**Test 2 — Mobile (375px).** In devtools responsive mode at 375px: hero text scales down (~38px), style chips and preset chips wrap/scroll without horizontal overflow, all chips are comfortable touch targets, footer respects safe-area insets. (Full app-wide mobile pass including the chat workspace lands in Phase 2.)

**Test 3 — Modern SaaS output.** Leave style on "Modern SaaS", prompt: `build a project tracker`. The preview should render with indigo accent colors, rounded-xl cards, generous spacing, and a true-dark (near-black, not gray) dark mode — NOT flat gray.

**Test 4 — Three.js.** New chat, prompt: `build a 3D solar system viewer with Three.js`. Preview should render an interactive WebGL scene with OrbitControls and no import errors (`three`, `@react-three/fiber`, `@react-three/drei` are allowlisted; the system prompt now instructs correct Canvas sizing and cleanup).

**Test 5 — Editorial style.** Switch the composer chip to "Editorial", prompt: `build a blog`. Preview should render with an amber accent on a warm dark background — visibly distinct from Modern SaaS. You can also set a default style in Settings → Build defaults → "Default output style".

## Summary

Phase 1 fixes generated-output quality at the root: the sandbox now injects one of five premium shadcn token sets instead of a flat gray palette, the CSS sanitizer merges model-authored `:root`/`.dark` token overrides instead of discarding them, the system prompt gains per-style design-direction blocks plus a Three.js/WebGL rule (all appended additively — obedience and routing rules untouched), and shadcn defaults to on across the API, composer, and settings. In parallel, the landing page was rebuilt to a premium dark standard: cinematic gradient hero with framer-motion reveals, typewriter composer, style-preset picker wired end-to-end into generation, scroll-revealed feature sections on shadcn primitives, and a clean footer. Phase 2 covers the chat workspace, settings/gallery/admin redesigns, the full mobile pass, and mid-session style switching.
