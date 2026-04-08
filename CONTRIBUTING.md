# Contributing to Mongonaut

Thanks for your interest in contributing to Mongonaut! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm (comes with Node.js)
- A MongoDB instance for testing (local or remote)

## Local Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/mongonaut.git
   cd mongonaut
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Code Style

This project uses **ESLint** for linting and **Prettier** for formatting.

- **Lint:** `npm run lint` (check) / `npm run lint:fix` (auto-fix)
- **Format:** `npm run format:check` (check) / `npm run format` (auto-fix)

Please ensure your code passes both before submitting a PR.

## Testing

Run the test suite with:

```bash
npm run test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

## Type Checking

```bash
npm run typecheck
```

## Pull Request Process

1. Create a feature branch from `master`:
   ```bash
   git checkout -b my-feature
   ```

2. Make your changes, ensuring:
   - `npm run typecheck` passes
   - `npm run lint` passes
   - `npm run test` passes

3. Push your branch and open a PR against `master`.

4. Fill out the PR template with a description, type of change, and testing details.

5. A maintainer will review your PR. CI checks must pass before merging.

## Architecture Overview

Mongonaut is an Electron app with a React renderer. For a detailed overview of the architecture, project structure, and coding patterns, see [CLAUDE.md](./CLAUDE.md).

Key points:
- MongoDB connections live in the **main process** only — never import `mongodb` in renderer code
- Renderer communicates with main via **typed IPC channels**
- All destructive operations require a **confirmation dialog**

## Questions?

Open an issue if you have questions or run into problems. We're happy to help!
