# Schulnetz+

Firefox WebExtension that improves selected Schulnetz pages with a cleaner UI and practical tools.

## Features

- Grades page enhancements (`pageid=21311`)
  - Grade color highlighting
  - Summary bar (average, plus points, counts above/below 4.0)
  - Per-course include/exclude toggle for average calculation
  - Export grades as JSON (download or clipboard)
- Accounting page enhancements (`pageid=21411`)
  - Visual polish for tables and rows
  - Transaction summary (count, income, expenses, current balance)
  - Positive/negative value highlighting
- Navigation behavior tuning
  - Drawer open/close policy depending on page and screen size
  - Menu link page-id remapping for selected entries
- Popup UI (React)
  - Context-aware actions
  - Global “Schönere Ansicht” toggle persisted via extension storage

## Tech Stack

- TypeScript
- React (popup UI)
- Vite (build)
- Tailwind CSS
- Firefox `web-ext` tooling (via `pnpm dlx`)

## Requirements

- Node.js (LTS recommended)
- pnpm
- Firefox (for loading/testing the extension)

## Setup

Install dependencies:

```bash
pnpm install
```

## Development

Watch build:

```bash
pnpm dev
```

This writes extension output to `dist/`.

## Build

Create a production build:

```bash
pnpm build
```

## Package `.xpi`

Build and create an unsigned XPI in project root:

```bash
pnpm xpi
```

## Versioning

Version is defined in `package.json` and synced automatically before `dev`, `build`, and packaging.

Sync targets:

- `public/manifest.json`
- `src/version.ts`

Sync script:

```bash
pnpm sync:version
```

## Load in Firefox (temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `dist/manifest.json`

## Project Structure

```text
public/                 # extension manifest, popup shell, static assets
src/
  content.ts            # main content script router + nav logic
  popup.tsx             # popup app
  pages/
    grades/             # grade page extraction + UI enhancements
    accounting/         # accounting page UI enhancements
scripts/
  sync-version.ts       # keeps manifest/version.ts in sync with package.json
```
