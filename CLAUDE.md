# Mongonaut — Claude Code Guide

## Tech Stack
- **Electron + electron-vite** for desktop app (main/preload/renderer architecture)
- **React 18 + TypeScript** for UI
- **Tailwind CSS v4** for styling (using `@import 'tailwindcss'` syntax, class-based dark mode)
- **Zustand** for state management (stores in `src/renderer/src/stores/`)
- **Radix UI** for accessible primitives (dialogs, menus, tooltips, switches, etc.)
- **Monaco Editor** for query editing (`@monaco-editor/react`)
- **AG Grid** for tabular results (`ag-grid-react`)
- **react-arborist** for the database/collection tree
- **MongoDB Node.js Driver** for database connectivity (main process only)
- **electron-store** for persistent settings (window state, connections, query history)
- **Vitest** for unit testing

## Key Architecture Patterns

### IPC-Only MongoDB Access
MongoDB connections live exclusively in the main process. The renderer communicates via typed IPC channels defined in `src/shared/ipc-channels.ts`. Never import `mongodb` in renderer code.

### Preload Bridge
`src/preload/index.ts` exposes a typed `window.api` object. Type declarations in `src/renderer/src/env.d.ts`. All renderer-to-main communication goes through this bridge.

### BSON Serialization
MongoDB documents must be serialized before crossing the IPC boundary. Convert ObjectId, Date, etc. to plain JSON in the main process before sending to renderer. Uses `safe-bson.ts` with EJSON relaxed mode.

### Query Parsing (No eval)
`QueryExecutor.parseQuery()` converts user query text into structured objects. Supports `db.collection.find({})`, implicit find (`{field: value}`), implicit aggregate (`[{$match: {}}]`), and chained methods (`.sort().limit()`). The `safeParseJSON()` method handles MongoDB shell syntax: unquoted keys, single quotes, BSON constructors (ObjectId, ISODate, NumberLong), and trailing commas. Never use `eval()` or `vm.runInNewContext()`.

### Confirmation Dialogs
All destructive operations (delete document, drop collection) must show a Radix AlertDialog confirmation before executing.

### Theme System
Class-based dark/light mode via Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))`. Theme state lives in `theme-store.ts` (Zustand + localStorage). The store applies `dark`/`light` class on `<html>` and sets `color-scheme`. Monaco Editor syncs via `mongodb-dark`/`mongodb-light` themes. AG Grid syncs via `themeQuartz.withParams()` variants.

### Error Boundaries
React error boundaries wrap major layout sections (Sidebar, Editor, Results) in `AppShell`. Each boundary shows a retry button and logs errors to console.

### Keyboard Shortcuts
Global shortcuts handled in `useKeyboardShortcuts` hook. Monaco-specific shortcuts (Ctrl+Enter for execute, Ctrl+Shift+Enter for explain) registered via `editor.addAction()`. The hook checks `target.closest('.monaco-editor')` to avoid conflicts.

### Export Functionality
Results export uses browser Blob + `URL.createObjectURL` for file download (no Electron dialog needed). CSV export flattens nested objects with dot notation and handles EJSON types. JSON export uses pretty-printed format.

## Project Structure
```
src/
├── main/
│   ├── index.ts                    # Electron main process entry (window state persistence via electron-store)
│   ├── lib/
│   │   └── safe-bson.ts            # BSON serialization via EJSON (relaxed Extended JSON)
│   ├── services/
│   │   ├── connection-manager.ts   # MongoDB connection singleton
│   │   ├── query-executor.ts       # Query parsing & execution (find/aggregate/countDocuments/distinct)
│   │   ├── schema-sampler.ts       # Schema sampling & caching
│   │   └── query-history.ts        # Query history persistence via electron-store
│   └── ipc/
│       ├── connection.ipc.ts       # Connection IPC handlers
│       ├── database.ipc.ts         # Database/collection IPC handlers
│       ├── document.ipc.ts         # Document CRUD IPC handlers (update/delete/insert)
│       ├── query.ipc.ts            # Query execution & explain IPC handlers
│       ├── schema.ipc.ts           # Schema sampling IPC handler
│       └── history.ipc.ts          # Query history IPC handlers
├── preload/index.ts                # Context bridge with typed API
├── shared/
│   ├── ipc-channels.ts             # IPC channel constants
│   └── types.ts                    # Shared TypeScript interfaces
└── renderer/src/
    ├── main.tsx                    # React entry point
    ├── App.tsx                     # Root with ErrorBoundary, keyboard shortcuts, theme init
    ├── assets/main.css             # Tailwind v4 with class-based dark mode custom variant
    ├── components/
    │   ├── AppShell.tsx            # Main layout with resizable panels, ErrorBoundary sections
    │   ├── Sidebar.tsx             # Left panel: connections + database tree + history
    │   ├── StatusBar.tsx           # Bottom bar: connection info + theme toggle
    │   ├── ErrorBoundary.tsx       # React error boundary with retry
    │   └── KeyboardShortcutsDialog.tsx  # Shortcuts reference (? key)
    ├── hooks/
    │   └── useKeyboardShortcuts.ts # Global keyboard shortcuts
    ├── stores/
    │   ├── connection-store.ts     # Connection state
    │   ├── editor-store.ts         # Tabs + query text
    │   ├── browser-store.ts        # Database/collection tree
    │   ├── results-store.ts        # Query results
    │   ├── schema-store.ts         # Schema sampling
    │   ├── document-store.ts       # Document editor state
    │   ├── history-store.ts        # Query history
    │   └── theme-store.ts          # Dark/light theme (localStorage persisted)
    └── features/
        ├── connection/             # ConnectionDialog, ConnectionList
        ├── browser/                # DatabaseTree, context menus, stats dialog
        ├── editor/                 # EditorPanel, EditorTabs, QueryToolbar, QueryEditor
        │   └── monaco-mongodb/     # Language registration, completion, hover, diagnostics, tokenizer, themes
        ├── document-editor/        # DocumentEditorPanel, TreeEditor, JsonDocumentEditor, confirmation dialogs
        ├── results/                # ResultsPanel (with JSON/CSV export), TableView (AG Grid), JsonView (tree)
        └── history/                # HistoryPanel with search, context menu
tests/
├── query-executor.test.ts         # safeParseJSON tests (20 cases)
├── safe-bson.test.ts              # BSON serialization round-trip tests
├── schema-sampler.test.ts         # Schema field extraction, types, frequency, caching
└── query-history.test.ts          # History add, prepend, max entries, delete
```

## Commands
- `npm run dev` — Start dev server with HMR
- `npm run build` — Production build
- `npm run build:win` — Build + package for Windows (NSIS installer)
- `npm run build:mac` — Build + package for macOS (DMG)
- `npm run build:linux` — Build + package for Linux (AppImage + deb)
- `npm run typecheck` — Run TypeScript type checking
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Run ESLint with auto-fix
- `npm run format` — Format code with Prettier
- `npm run format:check` — Check formatting without writing
- `npm run test` — Run unit tests (Vitest)
- `npm run test:watch` — Run tests in watch mode

## Styling Conventions
- Dark/light theme with class-based switching (`dark:` prefix for dark variants)
- Dark: zinc-900 bg, zinc-800 panels, zinc-700 borders, blue-500 accents
- Light: white bg, gray-50 panels, gray-200 borders, blue-500 accents
- Tailwind utility classes; avoid inline styles except for dynamic values (resize handles)
- Use `clsx` for conditional class composition
- Theme toggle in StatusBar (Sun/Moon icon)
