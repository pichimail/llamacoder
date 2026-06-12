# LlamaCoder Architecture

## Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    Top Navigation Bar (h-12)                │
│  llamacoder · Chat Title    [Eye] [Code] [Palette] [DB]     │
│                                      [Share] [⋮]             │
├──────────────┬──────────────────────────────────┬────────────┤
│              │                                  │            │
│   Sidebar    │          Main Content Area       │   Right    │
│  (w-64)      │  (renders based on mode)         │  Panel     │
│              │                                  │ (w-80)     │
│              │  • PREVIEW: Real page.client     │            │
│  • Home      │  • CODE: File explorer + editor  │ Share or   │
│  • Chats     │  • DESIGN: Design tokens        │ Settings   │
│  • Design    │  • DATABASE: Schema viewer       │            │
│  • Docs      │                                  │            │
│              │                                  │            │
│  ┌────────┐  │                                  │            │
│  │ Pinned │  │                                  │            │
│  │ Chats  │  │                                  │            │
│  └────────┘  │                                  │            │
│              │                                  │            │
│  ┌────────┐  │                                  │            │
│  │ Recent │  │                                  │            │
│  │ Chats  │  │                                  │            │
│  └────────┘  │                                  │            │
│              │                                  │            │
│  Settings ▼  │                                  │            │
│              │                                  │            │
└──────────────┴──────────────────────────────────┴────────────┘
```

## Component Hierarchy

```
EnhancedPage (wrapper with layout)
├── Sidebar (navigation + chat list)
├── Top Navigation Bar (mode switcher + actions)
├── Main Content Area (dynamic based on mode)
│   ├── PREVIEW: PageClient (real streaming engine)
│   ├── CODE: ModeCode
│   │   ├── FileExplorer (tree view)
│   │   └── Code Editor (editor area)
│   ├── DESIGN: ModeDesign
│   │   ├── Design Canvas (preview)
│   │   └── Design Panel (tokens editor)
│   └── DATABASE: ModeDatabase
│       ├── Table List (sidebar)
│       └── Schema Inspector (main area)
└── Right Panel (toggleable)
    ├── SharePanel
    └── SettingsPanel
```

## Data Flow

```
User Input
    ↓
┌─────────────────────────────────────┐
│  Enhanced Page (Client Component)   │
├─────────────────────────────────────┤
│ State:                              │
│ - currentMode: 'preview|code|...'   │
│ - rightPanel: 'share|settings'|null │
└─────────────────────────────────────┘
    │
    ├─→ ModeSwitcher (onClick)
    │   └─→ setCurrentMode()
    │       └─→ Re-render appropriate mode
    │
    ├─→ ShareButton/SettingsButton
    │   └─→ setRightPanel()
    │       └─→ Toggle SharePanel or SettingsPanel
    │
    └─→ Server Actions (files.ts, integrations.ts)
        └─→ Prisma database operations
```

## File Organization

```
app/(main)/chats/[id]/
├── page.tsx                          # Server component: Fetches data
├── page.client.tsx                   # Real production engine (700+ lines)
└── [Other components referenced]

components/chats/
├── enhanced-page.tsx                 # Main layout wrapper
├── mode-switcher.tsx                 # Mode selection buttons
├── sidebar.tsx                       # Left navigation
│
├── mode-code.tsx                     # CODE mode (file tree + editor)
├── file-explorer.tsx                 # File tree component
│
├── mode-design.tsx                   # DESIGN mode (tokens editor)
│
├── mode-database.tsx                 # DATABASE mode (schema viewer)
│
├── share-panel.tsx                   # Share & collaboration panel
├── settings-panel.tsx                # Settings & integrations panel
│
└── [Legacy mock components removed]

app/(main)/
├── actions.ts                        # Chat/project CRUD (TODO: move to new split)
├── actions/
│   ├── files.ts                      # File operations
│   └── integrations.ts               # Integration management
│
└── [Other routes]

lib/
├── db.ts                             # Prisma singleton
└── auth.ts                           # Auth stub
```

## Mode System

### PREVIEW Mode
```
Displays: Real PageClient component
Contains:
  - Live chat streaming
  - File preview
  - Download & publish buttons
  - Error handling
  - Auto-fix suggestions
Data: Fetched from PageClient chat context
State: Managed in PageClient
```

### CODE Mode
```
Displays: File explorer + Code editor
Tree Structure:
  ├── src/
  │   ├── app.tsx
  │   ├── components/
  │   │   ├── Button.tsx
  │   │   └── Card.tsx
  │   └── styles/
  │       └── globals.css
  ├── package.json
  └── README.md

Data Flow:
  1. FileExplorer searches/filters files
  2. Click file → Show content in editor
  3. Edit content → (TODO: save to Prisma)
```

### DESIGN Mode
```
Displays: Design tokens editor + canvas
Left Panel (Editor):
  - Colors tab: Primary, secondary, accent, etc.
  - Typography tab: Font families, sizes, weights
  - Spacing tab: Scale from xs to xl
  - Radius tab: Border radius values

Right Canvas (Preview):
  - Live rendering of token values
  - Color swatches
  - Typography specimens
  - Spacing scale visualization
```

### DATABASE Mode
```
Displays: Schema explorer
Left Panel (Tables):
  - List of all tables
  - Search/filter
  - Click to select

Right Panel (Schema):
  - Selected table properties
  - Columns: name, type, nullable, constraints
  - Relations: Foreign keys to other tables
  - Row counts (when connected)
```

## State Management

```
Client-Side (React Hooks):
├── currentMode: 'preview' | 'code' | 'design' | 'database'
├── rightPanel: null | 'share' | 'settings'
├── selectedPath: string (in CODE mode)
├── searchQuery: string (in various panels)
└── [Component-local state for tokens, env vars, etc.]

Server-Side (Database):
├── Chats (title, prompt, model, etc.)
├── Messages (streamed chat history)
├── ProjectFiles (actual file content)
├── EnvironmentVariables (env secrets)
└── Integrations (connection configs)
```

## Authentication & Authorization

```
Current: Stubbed
├── app/auth.ts returns null
└── (all auth checks commented out)

Future Implementation:
├── getSession() → Current user or null
├── Every action checks: if !userId → throw Unauthorized
├── Every mutation checks: if project.userId != userId → throw Forbidden
└── Every file operation checks: Ownership of parent project
```

## Integration Points

```
Real PageClient
└── (Streaming, file extraction, version management)

(To be wired)
├── FILE OPERATIONS
│   └── app/(main)/actions/files.ts
│       ├── createProjectFile
│       ├── updateProjectFile
│       ├── deleteProjectFile
│       └── listProjectFiles
│
├── INTEGRATIONS
│   └── app/(main)/actions/integrations.ts
│       ├── getIntegration
│       ├── connectIntegration
│       ├── disconnectIntegration
│       └── saveEnvVar
│
├── DATABASE QUERIES
│   └── Prisma operations
│       ├── Chat queries
│       ├── Message queries
│       ├── ProjectFile queries
│       └── Integration queries
│
└── EXTERNAL SERVICES
    ├── Together AI (streaming)
    ├── GitHub API (PR creation)
    ├── Vercel API (deployment)
    ├── Neon/Supabase (databases)
    └── Other integrations
```

## Performance Optimizations

```
Code Splitting:
├── Mode components lazy-loaded
├── Only active mode renders
└── Right panel doesn't affect main content

Caching:
├── Chat data cached on server
├── File content cached per chat
└── Design tokens in local state

Search:
├── File tree: Client-side filtering
├── Chat list: Client-side filtering
└── (No server round-trip for search)

Rendering:
├── Sidebar doesn't re-render with mode changes
├── Right panel doesn't re-render content
└── Component memoization for lists
```

## Browser DevTools

```
React DevTools:
├── <EnhancedPage>
│   ├── <Sidebar>
│   ├── [Navigation]
│   ├── [ModeCode|ModeDesign|ModeDatabase|PageClient]
│   └── [SharePanel|SettingsPanel]

Console:
└── (No errors if components properly wired)

Network:
├── GET /chats/[id] → Server response with chat data
├── POST /api/actions/* → Server actions
└── GET /api/preview → Preview data (when implemented)
```

## Future Enhancements

```
Short Term (Next Week):
├── Wire file operations to Prisma
├── Implement auth checks
├── Connect CODE mode to real files
└── Add terminal output to PREVIEW

Medium Term:
├── Integration OAuth flows
├── Design tokens → Preview application
├── Search & replace in CODE
├── Database query builder in DATABASE

Long Term:
├── Real-time collaboration (WebSockets)
├── Advanced code intelligence (LSP)
├── Full IDE experience
└── Multi-user project management
```

---

**Last Updated**: 2026-06-12  
**Status**: Production Foundation Complete  
**Next Step**: Database Wiring
