# MongoViewer — Claude Code Guide

## Tech Stack
- **Electron + electron-vite** for desktop app (main/preload/renderer architecture)
- **React 18 + TypeScript** for UI
- **Tailwind CSS v4** for styling (using `@import 'tailwindcss'` syntax)
- **Zustand** for state management (stores in `src/renderer/src/stores/`)
- **Radix UI** for accessible primitives (dialogs, menus, tooltips, etc.)
- **Monaco Editor** for query editing (`@monaco-editor/react`)
- **AG Grid** for tabular results (`ag-grid-react`)
- **react-arborist** for the database/collection tree
- **MongoDB Node.js Driver** for database connectivity (main process only)

## Key Architecture Patterns

### IPC-Only MongoDB Access
MongoDB connections live exclusively in the main process. The renderer communicates via typed IPC channels defined in `src/shared/ipc-channels.ts`. Never import `mongodb` in renderer code.

### Preload Bridge
`src/preload/index.ts` exposes a typed `window.api` object. Type declarations in `src/renderer/src/env.d.ts`. All renderer↔main communication goes through this bridge.

### BSON Serialization
MongoDB documents must be serialized before crossing the IPC boundary. Convert ObjectId, Date, etc. to plain JSON in the main process before sending to renderer.

### Confirmation Dialogs
All destructive operations (delete document, drop collection) must show a Radix AlertDialog confirmation before executing.

## Project Structure
```
src/
├── main/index.ts          # Electron main process entry
├── preload/index.ts       # Context bridge with typed API
├── shared/
│   ├── ipc-channels.ts    # IPC channel constants
│   └── types.ts           # Shared TypeScript interfaces
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx        # React entry point
        ├── App.tsx
        ├── components/     # UI components
        ├── stores/         # Zustand stores
        └── assets/         # CSS
```

## Commands
- `npm run dev` — Start dev server with HMR
- `npm run build` — Production build
- `npm run typecheck` — Run TypeScript type checking

## Styling Conventions
- Dark theme (zinc-900 bg, zinc-800 panels, zinc-700 borders, blue-500 accents)
- Tailwind utility classes; avoid inline styles except for dynamic values (resize handles)
- Use `clsx` for conditional class composition
