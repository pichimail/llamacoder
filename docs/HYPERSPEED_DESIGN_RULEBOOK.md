# HyperSpeed Design Rulebook

This is the permanent rulebook for the HyperSpeed builder experience, especially `/chats/[id]`.

## Principal Role

Act as a Principal UI/UX Engineer. Reject generic templates, default AI styling, fake proof, dead controls, oversized cards, and lazy generated aesthetics.

HyperSpeed must feel minimal, technical, calm, sharp, and fully functional.

## App Creation Flow

Never break this flow:

```txt
Home prompt -> create chat/message -> /chats/[id] -> PageClient streams files -> versions -> Preview/Code/Design/Database
```

The left chat panel and bottom composer must stay available by default on desktop in Preview, Code, Design, and Database modes.

The composer must keep attachments, model selector, send, stop, version switcher, follow-up generation, and undo/version revert controls.

## Anti-AI Design Rules

Forbidden:

- no generic purple AI gradients
- no glowing blobs or heavy shadows
- no repetitive bento/card-tile layouts in the builder shell
- no fake metrics, fake users, fake activity, or fake proof
- no layered boxes behind every icon or button
- no dead icons
- no browser-native alert, confirm, or prompt in visible flows

Required:

- floating controls over the page
- transparent surfaces by default
- thin separators and 1px outlines only where needed
- high-contrast text and icons
- compact tooltips and ARIA labels
- subtle hover/focus states
- mobile-safe panels, sheets, and toggles

## Typography and Color

Avoid Inter for new application UI. Prefer Geist, DM Sans, Satoshi, Plus Jakarta Sans, or Space Grotesk. Use JetBrains Mono, Fira Code, or system monospace for code.

Use contrast and spacing for hierarchy, not decoration.

## `/chats` Visual Shell

Apply this only to the builder shell, never to the generated artifact iframe.

Shell controls should use:

```txt
transparent background
thin outline where needed
bright icon/text
subtle hover tint
clear focus ring
no heavy shadow
no stacked background layers
```

Only primary actions like Send, Publish, Save Changes, and Apply may use a compact filled treatment.

## Unified Header

Use one header only.

Left:

- collapse or expand rail
- workspace/app title
- active version chip

Center:

- Preview
- Code
- Design
- Database

Right:

- artifact route previous and next arrows
- single Web/Mobile icon toggle
- version dropdown
- upload/export/share
- Publish/Site
- Create PR only when the integration exists
- more menu
- theme toggle if present

## Preview Mode

Keep live preview and auto-fix. Remove tablet mode.

The Web/Mobile toggle must live in the header as one icon:

- Web active means show Mobile icon
- Mobile active means show Web icon

Detect artifact routes from generated files and show subtle previous/next route arrows. Disable them when only one route exists.

## Code Mode

Use the real CodeViewer and Monaco editor.

Required controls:

- file explorer icons
- new file and new folder
- refresh and collapse
- search/replace drawer
- file context menu
- open to side
- copy path and relative path
- rename
- delete
- download file
- terminal toggle
- bottom terminal with slim splitter
- save as new version
- undo and redo
- minimap toggle
- word wrap toggle
- side-by-side editor/preview controls
- split editor view
- extensions/components panel

Search/replace must support all-file search, match case, replace current file, replace all files, and clicking a result to open a file.

The file context menu must be backed by real actions or disabled until backed.

## Design Mode

Layout:

```txt
Left: chat
Center: live artifact preview
Right: visual inspector
```

The inspector must include selected layer, typography, color, background, layout, instructions, reset, preview, and apply controls.

Instruction chips:

```txt
/modern /contrast /spacious /simplify /readable /shadows /pop /hierarchy
```

Instruction input placeholder:

```txt
Add instructions for this element... (Enter to apply, Shift+Enter for new line)
```

Edits update the preview immediately but persist only when saved/applied as a new version.

Unsaved exits must use themed shadcn AlertDialog with Save Changes, Discard Changes, and Cancel.

## Database Mode

Show only real detected schema or a clean empty state. Do not show fake users/projects/messages tables. Supabase and Drizzle expansion is deferred.

## OpenRouter Provider

Add OpenRouter as a first-class server-side provider with streaming, model registry, fallback behavior, and clear missing-configuration errors. Preserve the existing generation flow and provider support.

## GitHub Create PR

Create PR must use a safe GitHub integration flow. If the integration is missing, show Connect GitHub. When connected, create a branch, commit files, open a PR, persist PR status, and show a real result or real error.

Do not expose integration secrets in UI or generated artifacts.

## Accessibility

Required:

- ARIA labels for icon buttons
- role/tablist and aria-selected for modes
- aria-expanded for menus
- keyboard resizing for splitters
- focus-visible rings
- reduced motion support
- no color-only state

Keyboard shortcuts:

```txt
Cmd/Ctrl + S: save
Cmd/Ctrl + Z: undo
Cmd/Ctrl + Shift + Z: redo
Cmd/Ctrl + `: terminal
Alt + 1/2/3/4: Preview/Code/Design/Database
```

## One-Shot Implementation Spec

Use this implementation command for the next pass:

```txt
Complete the HyperSpeed /chats builder experience without replacing PageClient or breaking the existing app creation flow.

Keep: Home prompt -> create chat/message -> /chats/[id] -> PageClient stream handling -> versions -> Preview/Code/Design/Database.

Implement only:
1. Remove heavy backgrounds from /chats shell controls, not generated artifacts.
2. Make controls float with thin outlines, transparent surfaces, rich contrast, tooltips, and focus rings.
3. Keep one unified header.
4. Move Web/Mobile preview toggle into the header as one icon and remove tablet mode.
5. Add artifact route previous/next arrows from detected generated routes.
6. Replace native alert/confirm/prompt with shadcn AlertDialog, Dialog, DropdownMenu, or themed toast.
7. Complete Code mode with search/replace, file context menu, side-by-side editor/preview, side editor, terminal, minimap toggle, word wrap toggle, extensions/components panel, and save-as-version.
8. Complete Design mode with chat, preview, right inspector, selected layer, typography, color, background, layout, instructions textarea, reset, preview, and apply controls.
9. Add OpenRouter as a server-side streaming provider while preserving current generation.
10. Upgrade Create PR to a real safe integration-backed branch/commit/PR flow.
11. Skip Supabase/Drizzle database expansion for now.

Acceptance:
- pnpm run build passes.
- New chat generation works.
- Follow-up generation creates next versions.
- Chat remains available on desktop in all modes.
- No visible dummy controls.
- No native browser confirmation UI remains in visible flows.
- Code edits save as new versions.
- Design edits preview, reset, and apply as new versions.
- Create PR creates a real PR or clearly asks for connection.
```

## Done Means Done

A feature is complete only when UI, accessibility, state, backend or local artifact behavior, loading/empty/error states, and build success all exist. If not, hide it until ready.
