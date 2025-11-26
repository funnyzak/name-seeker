# Repository Guidelines

## Project Structure & Module Organization

NameSeeker pairs a React/Vite UI with a Rust Tauri host. Keep UI modules in `src/`: entry code in `main.tsx`, feature logic inside `components/`, `services/`, `hooks/`, `i18n/`, `utils/`, and imported media under `assets/`. Tauri commands, provider datasets, and packaging artifacts live in `src-tauri/` (`src/`, `data/`, `icons/`, `tauri.conf.json`). Reusable automation belongs in `scripts/`; run `scripts/update-version.sh` whenever you change versions and mirror structural shifts in both README files.

## Build, Test, and Development Commands

- `npm run dev` – React-only Vite server; fastest hot-reload loop.
- `npm run tauri:dev` – full desktop shell plus Rust commands for integration debugging.
- `npm run build` / `npm run tauri:build` – emit production web assets or cross-platform installers.
- `npm run type-check`, `npm run lint`, `npm run format:check` – mandatory before any PR; `npm run pre-commit:check` chains them.
- `npm run lint:fix`, `npm run format` – preferred auto-fix path prior to staging.

## Coding Style & Naming Conventions

Target Node 20+, TS strict mode, and 2-space indentation. Use `PascalCase` components, `camelCase` hooks/utilities (`useSearchJob`), and uppercase constants only when sharing provider metadata. Keep side effects in hooks, remote calls in `services/`, and routing/layout logic inside `App.tsx`. ESLint + Prettier are the single source of truth; justify any disable directives inline. Inject secrets or hostnames via environment variables consumed by Vite or defined in the matching `src-tauri` config block.

## Testing Guidelines

Current guardrails are static analysis plus manual desktop runs. Before a PR, finish `npm run type-check`, `npm run lint`, and a `npm run tauri:dev` smoke test. When introducing automated coverage, colocate `*.test.ts(x)` or use `src/test/` and execute with Vitest (`vitest run`) once it is added to `devDependencies`. Prioritize username validation, provider matching, export formatting, and Rust commands that touch filesystem outputs.

## Commit & Pull Request Guidelines

Follow Conventional Commits (see `docs: README`), e.g., `feat: add provider filter` or `fix: sanitize export paths`. PRs need a concise summary, linked issue, UI captures when applicable, and a list of executed commands. Re-run `npm run pre-commit:check` after review changes and update any impacted docs (README files, this guide, release notes) in the same branch.

## Security & Configuration Tips

Never hard-code keys, WhatsMyName overrides, or signing assets. Load them through `.env` files (gitignored) or CI secrets referenced by Vite and `tauri.conf.json`. Audit new dependencies for MIT-compatible licenses, and document reusable scripts here to keep the documentation index dependable.
