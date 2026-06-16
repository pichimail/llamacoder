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

### In progress / next up

- [ ] Add evals with Braintrust to measure generation quality over time and catch regressions
- [ ] Admin UI to pin real generations as featured apps (`messageId` on `FEATURED_APPS`)
- [ ] Cache compressed chat summaries in the database to avoid re-summarizing on every follow-up
- [ ] Homepage template cards with live Sandpack thumbnails (not just OG placeholders)
- [ ] Run a first fine-tune on exported JSONL and wire the checkpoint into `MODELS`
- [ ] Support more languages starting with Python (like Streamlit) and see if I can run them on CSB SDK
- [ ] Motion/animation template pack integration (curated prompts + preview assets)
- [ ] Gallery filters: sort by model, file count, and featured vs community

## License

By contributing, you agree that your contributions will be licensed under the project's license.