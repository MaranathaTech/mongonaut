# Mongonaut

A lightweight MongoDB viewer built with Electron, React, and TypeScript. An alternative to Studio 3T for browsing and querying MongoDB databases.

## Tech Stack

- **Electron** — Desktop application shell
- **electron-vite** — Build tooling with HMR
- **React 18** + **TypeScript** — UI framework
- **Tailwind CSS v4** — Styling (class-based dark mode)
- **Zustand** — State management
- **Radix UI** — Accessible UI primitives
- **Monaco Editor** — Query editor with MongoDB syntax highlighting
- **AG Grid** — Results table with inline editing
- **react-arborist** — Database/collection tree
- **MongoDB Node.js Driver** — Database connectivity
- **Vitest** — Unit testing

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build          # Production build (electron-vite)
npm run build:linux    # Package for Linux (AppImage + deb)
npm run build:mac      # Package for macOS (DMG)
npm run build:win      # Package for Windows (NSIS installer)
```

Packaged installers are output to `dist/`.

## Test

```bash
npm run test
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── services/   # ConnectionManager, QueryExecutor, SchemaSampler
│   ├── ipc/        # IPC handlers (connection, database, query, document, schema, history)
│   └── lib/        # Utilities (safe-bson)
├── preload/        # Context bridge (IPC API)
├── shared/         # Types and IPC channel definitions
└── renderer/       # React application
    └── src/
        ├── components/   # Layout (AppShell, Sidebar, StatusBar, ErrorBoundary)
        ├── features/     # Feature modules (editor, results, browser, connection, history, document-editor)
        ├── stores/       # Zustand state stores
        ├── hooks/        # Custom hooks (keyboard shortcuts)
        └── assets/       # CSS
tests/              # Unit tests (Vitest)
```

## Features

- **Connection management** — Connect via URI or form with authentication support (SCRAM, X.509, TLS)
- **Database browser** — Tree view of databases and collections with context menus and stats
- **Query editor** — Monaco-based editor with MongoDB syntax highlighting, autocomplete, hover docs, and diagnostics
- **Query execution** — Supports `find`, `aggregate`, `countDocuments`, `distinct` with pagination
- **Results display** — Table view (AG Grid) and JSON tree view with expand/collapse
- **Document editing** — Full CRUD with tree and JSON editor modes, confirmation dialogs for all operations
- **Query history** — Auto-saved with search, context menus, and persistence
- **Schema sampling** — Automatic field detection for autocomplete from collection samples
- **Dark/Light theme** — Toggle between dark and light modes with persisted preference
- **Window state persistence** — Remembers window size, position, sidebar width, and editor/results split
- **Export** — Export results as JSON or CSV from the results toolbar
- **Error boundaries** — Graceful error handling with retry for each major panel
- **Keyboard shortcuts** — Comprehensive shortcuts (press `?` to view all)
- **Safe query parsing** — No `eval()` — parses MongoDB shell syntax safely with BSON constructor support

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Execute query |
| Ctrl+Shift+Enter | Explain query |
| Ctrl+Shift+F | Format query |
| Ctrl+N | New query tab |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+L | Open connection dialog |
| F5 | Refresh results |
| Escape | Close dialog/panel |
| ? | Show keyboard shortcuts |
