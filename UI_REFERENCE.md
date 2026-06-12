# LlamaCoder UI Reference Guide

## Layout Dimensions

```
Sidebar: w-64 (256px)
Top Nav: h-12 (48px)
Right Panel: w-80 (320px)

Responsive Breakpoints:
├── Mobile: < 768px → Sidebar collapses, panels stack
├── Tablet: 768px-1024px → Layout optimized
└── Desktop: ≥ 1024px → Full layout
```

## Top Navigation Bar

```
┌─────────────────────────────────────────────────────────────┐
│ Logo + Title  │  Mode Buttons  │  Share  │  More Menu      │
│ ══════════════│════════════════│═════════│═════════════    │
│               │                │         │                 │
│ llamacoder    │  👁️  💻  🎨  🗄️ │ 🔗     │ ⋯               │
│ • App Title   │ Preview Code   │ Tooltip │                 │
│               │ Design DB      │         │                 │
└─────────────────────────────────────────────────────────────┘
```

### Components Used
- **Left**: Breadcrumb with dropdown
- **Center**: ModeSwitcher with 4 buttons + tooltips
- **Right**: Share button, More menu (…)
- **Spacing**: 4-2-4 padding pattern
- **Height**: 48px (h-12)

## Left Sidebar

```
┌──────────────────┐
│ llamacoder       │  Header (64px)
│ ┌──────────────┐ │
│ │ + New Chat   │ │  Create Button
│ └──────────────┘ │
│ ──────────────── │  Divider
│ 🏠 Home          │
│ 💬 Chats ✓       │  Navigation (active)
│ 🎨 Design Sys    │
│ 📚 Templates     │
│ ──────────────── │  Divider
│ ┌──────────────┐ │
│ │ 🔍 Search... │ │  Search box
│ └──────────────┘ │
│ ──────────────── │  Divider
│ 📌 Pinned:       │
│  > App v2        │  Pinned chats
│  > Landing Page  │
│ ──────────────── │  Divider
│ 🕐 Recent:       │
│  > Chat 1        │  Clickable items
│  > Chat 2        │  with icons
│  > Chat 3        │
│  [scrollable]    │
│ ──────────────── │  Divider
│ ⚙️ Settings      │
│ 🚪 Sign Out      │  Footer menu
└──────────────────┘
```

### Components Used
- **Header**: New Chat button (h-12)
- **Navigation**: NavItem buttons (h-7 each)
- **Search**: Input field (h-7)
- **Chat List**: ChatItem buttons (h-6 each)
- **Icons**: Lucide React icons
- **Colors**: text-muted-foreground on hover:bg-background

## PREVIEW Mode (Real Engine)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Full PageClient Component]                               │
│                                                             │
│  • Streaming chat display                                  │
│  • File extraction                                          │
│  • Version management                                       │
│  • Download & publish buttons                              │
│  • Error handling                                           │
│  • Resizable panes                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## CODE Mode

```
┌─────────────────────────────────────────────────────────────┐
│ File Header: /src/app.tsx              [Copy] [Download]    │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│ 📁 src/          │  1  'use client'                         │
│  ├─ app.tsx ✓    │  2                                       │
│  ├─ 📁 comp.     │  3  import { Button } from '@/...'       │
│  │  ├─ Btn.tsx   │  4                                       │
│  │  └─ Card.tsx  │  5  export default function App() {      │
│  └─ styles/      │  6    return <div>Hello</div>            │
│     └─ g.css     │  7  }                                    │
│ 📄 package.json  │                                          │
│ 📄 README.md     │  [Code display area]                     │
│                  │                                          │
│ [+ New File]     │                                          │
├──────────────────┼──────────────────────────────────────────┤
│ 7 lines · UTF-8  │ JavaScript · CRLF                        │
└──────────────────┴──────────────────────────────────────────┘
```

### Components Used
- **Left Panel**: FileExplorer (search, tree, create/delete)
- **Right Panel**: Code editor with line numbers
- **Header**: File path + action buttons
- **Footer**: Stats (line count, encoding, language)
- **Icons**: Folder (blue), File (gray), actions

## DESIGN Mode

```
┌─────────────────────────────────────────────────────────────┐
│ Design System Preview         [Reset to Defaults]           │
├──────────────────────────────────────────────────────────────┤
│                                                             │
│  Colors:                                                    │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Primary       │  │  Secondary      │                  │
│  │   #000000       │  │  #666666        │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  Typography:                                               │
│  ┌─────────────────────────────────────┐                  │
│  │ font-sans: The quick brown fox...   │                  │
│  └─────────────────────────────────────┘                  │
│                                                             │
│  Spacing Scale:                                             │
│  xs  [▉]  4px                                              │
│  sm  [▉▉▉]  8px                                            │
│  md  [▉▉▉▉▉▉]  16px                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Right Panel (w-80):
┌──────────────────┐
│ Design Tokens    │
├──────────────────┤
│ [Colors] Type    │
│ [Spacing]        │
│                  │
│ Primary:         │
│ [■] #000000      │  Editable
│     [#000000 x]  │  Swatch + Input
│                  │
│ Secondary:       │
│ [■] #666666      │
│     [#666666 x]  │
│                  │
└──────────────────┘
```

### Components Used
- **Left Canvas**: Token previews
- **Right Panel**: Token editor with tabs
- **Swatches**: Clickable color blocks
- **Inputs**: Editable hex/value fields
- **Tabs**: Colors, Typography, Spacing (text-xs)

## DATABASE Mode

```
┌──────────────┬──────────────────────────────────────────────┐
│              │ users                 🗄️    [1,250 rows]     │
│ users        │ ──────────────────────────────────────────  │
│ projects ✓   │ Columns:                                     │
│ chats        │  id           String    PK Required          │
│ messages     │  email        String         Required        │
│              │  name         String    Optional             │
│              │  createdAt    DateTime       Required        │
│              │                                              │
│              │ Relations: (none)                            │
│              │                                              │
│              │ ──────────────────────────────────────────  │
│              │                                              │
│ [Search...]  │ [Stats and detailed schema view]             │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Components Used
- **Left Panel**: Table list with search and selection
- **Right Panel**: Schema inspector with columns/relations
- **Badges**: Type (secondary), PK/FK (outline), Required
- **Icons**: Database icon, Table2 icon
- **Colors**: Blue for types, highlighting for primary key

## Share Panel

```
┌──────────────────────────────┐
│ Share & Collaborate  [✕]     │
├──────────────────────────────┤
│                              │
│ Visibility:                  │
│ [▾ Private]                  │
│ Only you can access          │
│                              │
│ People with access:          │
│ ┌──────────────────────────┐ │
│ │ [Y] You          Owner    │ │
│ │     you@example.com      │ │
│ └──────────────────────────┘ │
│                              │
│ ℹ️ How does sharing work?    │
│ Share public links to let    │
│ others view your chat...     │
│                              │
└──────────────────────────────┘
```

### Components Used
- **Visibility Select**: Dropdown with Private/Public options
- **Collaborator Cards**: Avatar + name + email + role
- **Share Link**: Input + copy button (when public)
- **Info Box**: Blue background with help text
- **Icons**: Lock, Globe, Copy

## Settings Panel

```
┌──────────────────────────────┐
│ Settings & Integrations [✕]  │
├──────────────────────────────┤
│ [General] [Integrations] Env │
│                              │
│ Chat Settings:               │
│ Title: [________________]     │
│ Model: [gpt-4-turbo] (locked)│
│                              │
│ ──────────────────────────   │
│ Danger Zone:                 │
│ [Delete Chat]  [red button]  │
│                              │
│ Or in Integrations tab:      │
│ Connected Services:          │
│ ┌──────────────────────────┐ │
│ │ GitHub  Deploy to GH     │ │
│ │ [Connected] ✓            │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ Database  PostgreSQL     │ │
│ │ [Connect] →              │ │
│ └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

### Components Used
- **Tabs**: TabsList + TabsContent
- **Input Fields**: Labeled inputs for settings
- **Integration Cards**: Icon + name + status + button
- **Badge**: "Connected" variant
- **Button**: "Delete Chat" variant="destructive"

## Color Palette

```
Background Colors:
├── bg-background  (main surface)
├── bg-muted       (secondary surface)
├── bg-card        (elevated surface)
└── bg-accent      (interactive)

Text Colors:
├── text-foreground        (primary text)
├── text-muted-foreground  (secondary text)
└── text-accent-foreground (on accent)

Borders:
├── border-border (UI divisions)
└── border-muted  (subtle dividers)
```

## Typography

```
Headings:
├── text-2xl font-bold     (Main title)
├── text-lg font-semibold  (Section header)
└── text-sm font-semibold  (Subsection)

Body:
├── text-sm (normal content)
└── text-xs (secondary info)

Monospace (code):
├── font-mono text-xs (file paths)
└── font-mono text-sm (code display)
```

## Interactive States

```
Button States:
├── Default: bg-primary text-white
├── Hover: opacity-90
├── Active: ring-2 ring-offset-2
└── Disabled: opacity-50 cursor-not-allowed

Input States:
├── Default: border-border
├── Focus: ring-2 ring-accent
├── Error: border-red-500
└── Disabled: bg-muted opacity-50

Hover Effects:
├── bg-background (subtle)
├── opacity-75 (dim)
└── text-accent (highlight)
```

## Icons Used

### Top Navigation
- Eye (preview)
- Code (code mode)
- Palette (design mode)
- Database (database mode)
- Share2 (share)
- MoreHorizontal (menu)

### Sidebar
- Home (home)
- MessageSquare (chats)
- Palette (design)
- Database (docs)
- Plus (new)
- Search (search)
- Clock (recent)
- Star (pinned)
- Settings (settings)
- LogOut (logout)

### Components
- ChevronRight, ChevronDown (expand/collapse)
- File, Folder (file tree)
- Trash2 (delete)
- Copy, Download (actions)
- Key, Link2 (relations)
- Lock, Globe (visibility)
- Zap, Github (integrations)
- Type, Spacing (design)

## Responsive Design

```
Desktop (≥1024px):
┌──────┬────────────────┬──────┐
│      │                │      │
│ 256px│  Flexible      │ 320px│
│      │                │      │
└──────┴────────────────┴──────┘

Tablet (768-1024px):
┌────┬──────────────┬────┐
│    │              │    │
│192px│  Flexible    │256px
│    │              │    │
└────┴──────────────┴────┘

Mobile (<768px):
┌─────────────────────┐
│ Header (Full Width) │
├─────────────────────┤
│                     │
│  Main Content       │
│  (Full Width)       │
│  or                 │
│  Sidebar (Drawer)   │
│                     │
└─────────────────────┘
```

## Animation & Transitions

```
State Changes:
├── Mode switching: Instant (CSS class change)
├── Panel toggle: Fade in/out (200ms)
├── Hover effects: 150ms ease
└── Loading states: Skeleton screens

Interactions:
├── Button press: Tactile feedback
├── Input focus: Ring highlight
├── Expand/collapse: Smooth height animation
└── Search: Instant filter with debounce
```

---

**Last Updated**: 2026-06-12  
**Status**: Complete UI Reference  
**All Components**: Styled with Tailwind CSS + shadcn/ui
