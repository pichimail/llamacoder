# Importing & Running External Git Repos (Dynamic Bootstrap)

ChinnaCoder supports bringing any public (or private with token) open source GitHub repository into your chats as a living base.

This dramatically reduces AI generation costs — instead of the model writing everything from scratch, you clone real working code and only ask the AI for targeted changes.

## How it works in the app (chats page)

1. Paste a GitHub URL anywhere in the prompt composer inside a chat, e.g.:
   - `https://github.com/vercel/next.js`
   - `Import https://github.com/tiangolo/fastapi`

2. Or use the **Import Git** action (in header or command center).

3. The system will:
   - Parse the repo
   - Detect the stack (Next.js, Vite, FastAPI, Flutter, Spring Boot, Go, etc.)
   - Fetch the relevant source files
   - **Automatically create two special files in your workspace**:
     - `bootstrap.sh` — fully executable one-command script
     - `RUN.md` — human readable instructions
   - Load the files into the live preview (for web stacks) or show rich instructions
   - Populate the in-chat terminal with useful commands

4. In the **Workspace Terminal** (in chats page) you can type:
   - `bootstrap`
   - `cat bootstrap.sh`
   - `help`

## Generated files (always created on import)

- `bootstrap.sh` — detects environment and runs the right install + dev command
- `RUN.md` — copy-paste instructions for local development

You can download them or run the commands shown.

## Standalone script (works everywhere)

There is also a universal helper at:

```
scripts/clone-and-bootstrap.sh
```

Usage:

```bash
chmod +x scripts/clone-and-bootstrap.sh
./scripts/clone-and-bootstrap.sh https://github.com/owner/repo
```

Or pipe it:

```bash
curl -fsSL ... | bash -s -- <url>
```

## Supported / auto-detected stacks (growing)

- Next.js, Vite (React/Vue/Svelte), CRA, Nuxt, SvelteKit, Remix, Astro
- Python: FastAPI, Flask, Django, Streamlit, generic
- Flutter (web target supported for preview)
- React Native / Expo
- Java (Maven + Spring Boot, Gradle)
- Go
- Rust
- Ruby on Rails
- PHP Laravel
- Anything with Dockerfile

For stacks without great browser previews (Flutter mobile, native Java, RN), the system gives you excellent local run instructions + the full source in the workspace so you can iterate with AI on the code.

## Preview behavior per stack

| Stack         | Live Preview in Chats          | Notes                              |
|---------------|--------------------------------|------------------------------------|
| Next.js / Vite / React | Full Sandpack + hot reload    | Best experience                    |
| Python / Streamlit     | Source + simulated UI         | Full run via bootstrap.sh locally or Vercel Sandbox |
| Flutter (web)          | Possible via web build        | `flutter build web` + serve        |
| Others                 | Instructions + file browser   | Use terminal + download script     |

## Security

- Only public repos by default.
- Private repos require a GitHub token (BYOK or connected account).
- All execution (when using real sandboxes) happens in isolated Vercel Sandbox environments.
- Never blindly trust postinstall scripts from random repos.

## Reducing AI costs

Importing a repo bypasses (or greatly reduces) the main generation LLM call. The files become the "current version". Subsequent messages are small patches against the real codebase.

This is one of the most powerful "clone type" features for power users and teams bringing existing OSS or internal starters.

## Future / Advanced

- One-click "Run in real Vercel Sandbox + live URL" (when enabled)
- Background `git pull` + diff against upstream
- Multi-repo workspaces
- Auto PR back to the original repo after edits

---

Questions? The stack detection lives in `lib/stack-detector.ts`.
