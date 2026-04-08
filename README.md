# MongoViewer

A lightweight MongoDB viewer built with Electron, React, and TypeScript. An alternative to Studio 3T for browsing and querying MongoDB databases.

## Tech Stack

- **Electron** — Desktop application shell
- **electron-vite** — Build tooling with HMR
- **React 18** + **TypeScript** — UI framework
- **Tailwind CSS v4** — Styling
- **Zustand** — State management
- **Radix UI** — Accessible UI primitives
- **Monaco Editor** — Query editor
- **AG Grid** — Results table
- **react-arborist** — Database/collection tree
- **MongoDB Node.js Driver** — Database connectivity

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── main/           # Electron main process
├── preload/        # Context bridge (IPC API)
├── shared/         # Types and IPC channel definitions
└── renderer/       # React application
    └── src/
        ├── components/   # UI components
        ├── stores/       # Zustand state stores
        └── assets/       # CSS and static assets
```

## Features

- Connect to MongoDB via URI or connection form
- Browse databases and collections in a tree view
- Write and execute MongoDB queries with Monaco Editor
- View results in table (AG Grid) or JSON format
- Document CRUD operations with confirmation dialogs
- Query history with search
- Schema sampling and analysis
- Dark theme by default
