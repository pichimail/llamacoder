# Chinna Coder Backend Production Build

This build completes the backend pass for the Next.js/Prisma/shadcn AI app-builder with ChinnaLLM, credit management, BYOK, admin controls, and backend-mode app generation.

## Setup

```bash
corepack enable
corepack prepare pnpm@10.29.1 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
# Fill .env.local values
pnpm prisma generate
pnpm prisma migrate deploy
pnpm seed:chinnallm
pnpm build
pnpm start
```

For local development:

```bash
pnpm prisma migrate dev
pnpm seed:chinnallm
pnpm dev
```

## Environment variables

| Variable | Required/Optional | What breaks if missing | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | Required | Prisma runtime DB access, auth, chats, credits, admin pages fail | Neon/Postgres dashboard |
| `POSTGRES_PRISMA_URL` | Optional | If used, Prisma adapter falls back to `DATABASE_URL` when missing | Neon pooled connection |
| `DIRECT_URL` | Required for migrations | Prisma migrations may fail when using pooled DB URLs | Neon direct connection |
| `AUTH_SECRET` | Required | Auth.js sessions/sign-in fail | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | Required | Auth.js compatibility secret missing | same value as `AUTH_SECRET` |
| `NEXTAUTH_URL` | Required in production | OAuth callbacks/session URLs may fail | deployment URL |
| `GOOGLE_CLIENT_ID` | Required when auth enforced | Google login unavailable | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Required when auth enforced | Google login unavailable | Google Cloud Console |
| `REQUIRE_GOOGLE_AUTH` | Optional | Defaults may require auth depending existing config | `true` / `false` |
| `ADMIN_EMAIL` | Required for admin | Admin dashboard access unavailable | your admin email |
| `OPENROUTER_API_KEY` | Required for platform-funded ChinnaLLM and builder provider | ChinnaLLM non-BYOK calls and provider-backed builder generation fail | OpenRouter dashboard |
| `OPENROUTER_BASE_URL` | Optional | Defaults to provider API URL | provider API settings |
| `OPENROUTER_SITE_URL` | Optional | Provider attribution header omitted | deployment URL |
| `OPENROUTER_APP_NAME` | Optional | Provider attribution title defaults | any app name |
| `TOGETHER_API_KEY` | Optional fallback | Builder fallback provider unavailable | Together dashboard |
| `ENCRYPTION_SECRET` | Required for BYOK | BYOK storage/decryption fails | `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | Required for uploads | Attachments/screenshots uploads fail | Vercel Blob |
| `SUPABASE_URL` | Optional | Generated backend-mode Supabase client disabled | Supabase dashboard |
| `SUPABASE_ANON_KEY` | Optional | Generated backend-mode Supabase client disabled | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Public Supabase client disabled in generated apps | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Public Supabase client disabled in generated apps | Supabase dashboard |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis-backed rate limiting unavailable; DB fallback remains | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis-backed rate limiting unavailable; DB fallback remains | Upstash |
| `KV_REST_API_URL` | Optional | Vercel KV rate-limit fallback unavailable | Vercel KV |
| `KV_REST_API_TOKEN` | Optional | Vercel KV rate-limit fallback unavailable | Vercel KV |
| `BRAINTRUST_API_KEY` | Optional | Observability logs disabled | Braintrust |
| `HELICONE_API_KEY` | Optional | Helicone tracing disabled | Helicone |
| `CSB_API_KEY` | Optional | CodeSandbox integration disabled | CodeSandbox |
| `S3_UPLOAD_REGION` / `S3_UPLOAD_BUCKET` / `S3_UPLOAD_SECRET` / `S3_UPLOAD_KEY` | Optional | S3 upload/export path disabled | AWS/S3-compatible provider |
| `GITHUB_REPOSITORY` | Optional | Default GitHub repository features unavailable | GitHub repo slug |

## How to verify

### Phase 1 — UI/theme baseline
1. Run `pnpm build`.
2. Create three chats with different style presets.
3. Expected: outputs use distinct theme accents, not one flat gray theme; shadcn output resolves.

### Phase 2 — ChinnaLLM engine
1. Run `pnpm prisma migrate deploy`.
2. Run `pnpm seed:chinnallm`.
3. Call `/api/chinnallm/models` while signed in.
4. Expected: enabled ChinnaLLM models return with display names/tiers only, no provider model IDs.
5. POST to `/api/chinnallm/invoke` with `{ "action": "text", "prompt": "hello" }`.
6. Expected: response returns and credits decrement.

### Phase 3 — AI chooser
1. From home, prompt: `build a chatbot for customer support`.
2. Expected: chat opens and shows the inline AI chooser before generation starts.
3. Choose ChinnaLLM.
4. Expected: generated files use the ChinnaLLM SDK path.
5. Choose Skip in a separate test.
6. Expected: generated app contains safe AI stubs, not live calls.

### Phase 4 — Admin controls
1. Open `/admin/chinnallm` as admin.
2. Disable a model.
3. Call `/api/chinnallm/models` as a user.
4. Expected: disabled model disappears.
5. Open `/admin/credits`, grant 500 credits to a user.
6. Expected: user balance updates and transaction appears.

### Phase 5 — Backend mode
1. Enable Backend in the home composer.
2. Prompt: `build a CRM with contacts, deals and activities`.
3. Expected generated artifact seed includes `lib/db/neon.ts`, `lib/db/supabase.ts`, `prisma/schema.prisma`, `.env.example`, `BACKEND_SETUP.md`, and API resource routes.
4. Expected chat sidebar shows Backend setup with env keys.

### BYOK encryption roundtrip
1. Set `ENCRYPTION_SECRET`.
2. POST a BYOK key to `/api/chinnallm/byok`.
3. Inspect DB.
4. Expected: only encrypted ciphertext + IV are stored; plaintext is not stored.
5. Invoke with `useByok: true`.
6. Expected: usage logs `isByok=true` and credits are not deducted.

### Rate limit
1. Send more than 30 ChinnaLLM invoke requests within 60 seconds for one user.
2. Expected: endpoint returns HTTP 429 after the configured limit.

## ChinnaLLM quick start

1. Sign in as admin using `ADMIN_EMAIL`.
2. Set `OPENROUTER_API_KEY` in `.env.local` or deployment environment.
3. Run:

```bash
pnpm prisma migrate deploy
pnpm seed:chinnallm
pnpm build
```

4. Open `/admin/chinnallm` and confirm models are enabled.
5. Open `/credits` as a user and confirm free credits exist.
6. Use a generated app with ChinnaLLM SDK; it calls `/api/chinnallm/invoke` and consumes credits unless BYOK is selected.

## Validation note

In this sandbox I could not run full install/build because `node_modules` is absent and pnpm/registry bootstrap is unavailable. I did run static parser checks over the modified files; no TypeScript parser/syntax errors were detected. Full production verification should be run with the setup commands above on a machine with internet access.
