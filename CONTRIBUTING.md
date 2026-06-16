# Contributing Guide

Thank you for your interest in contributing to this project! We accept contributions via bug reports, feature requests and pull requests. We also have a roadmap outlined below.

For simple fixes or small items on the roadmap below, feel free to submit a pull request. For anything more complex, please open an issue first to discuss the changes you want to make.

## Running the repo

To run the repo locally, simply `npm install` to install dependencies and then `npm run dev` to run the app.

Apply database migrations before first run or after pulling schema changes:

```bash
npx prisma migrate deploy
```

Export training data for fine-tuning experiments:

```bash
pnpm export:training
```

## Roadmap

### Shipped

- [x] Add self-correcting to the app so it can fix its own errors
- [x] Compressing prompt: Use small model like Llama 3.3 70B to retain what happened in the past, good memory management is key
- [x] Add more good examples to the `shadcn-examples.ts` file (single components that span a whole app and use shadcn)
- [x] Add dynamic OG images to the specific generations & include the prompt + a screenshot in the image
- [x] Show a "featured apps" section on `/gallery` (and on the homepage). `/id/[slug]` opens sandbox-ready template previews
- [x] Finetuning scaffolding: `pnpm export:training` + `scripts/finetune-config.example.json`
- [x] Add dark mode to the site overall, nice design change
- [x] Admin featured pinning: `/admin` Featured section + `FeaturedPin` table + `/api/admin/featured`
- [x] Compression caching: `Chat.historySummary` keyed by middle message ids in the completion route
- [x] Live Sandpack thumbnails on featured/gallery cards (`FeaturedSandboxThumb` + `/api/featured/sandbox`)
- [x] First fine-tune run script: `pnpm run:finetune` + `FINETUNED_MODEL_ID` wired via `getVisibleModels()`
- [x] Python / Streamlit preview path in the builder (`python-artifact-runner` + runtime detection)
- [x] Motion template pack: curated prompts in `lib/motion-templates.ts` + gallery section
- [x] Gallery filters: source, model, and min file count via URL params (`/gallery?source=motion`)
- [x] Consistent shadcn component library in host app + Sandpack previews (toggle on/off per chat)
- [x] Diff-style follow-ups: patch mode hints + file merge instead of full regeneration
- [x] Screenshot / file upload to seed generations (homepage + chat composer)
- [x] Prompt rewriter launched (`/api/rewrite-prompt` + Enhance button in composer)
- [x] Share modal for public app links (`ShareDialog` with copy, publish, X share)
- [x] Public sharing via `/share/v2/[messageId]` + workspace publish
- [x] Theme CSS variables injected into sandbox previews (light/dark follows host theme)
- [x] Dynamic OG images with prompt (+ optional Playwright capture via `pnpm capture:og`)
- [x] Duplicate publish protection surfaced in UI (`duplicateProtected`)
- [x] Experimental chain-of-thought reasoning toggle (Together `reasoning.enabled`)

### In progress / next up

- [ ] Add evals with Braintrust to measure generation quality over time and catch regressions
- [ ] Run a first fine-tune on exported JSONL and promote the checkpoint in production env
- [ ] Execute Python/Streamlit in a real sandbox (CSB SDK or Vercel Sandbox) instead of simulated preview
- [ ] Motion template pack: licensed third-party prompt library integration (avoid DMCA-blocked sources)

## License

By contributing, you agree that your contributions will be licensed under the project's license.