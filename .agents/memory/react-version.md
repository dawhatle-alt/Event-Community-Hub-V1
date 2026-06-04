---
name: React version in workspace
description: How React version is controlled in this pnpm monorepo and what to change when upgrading.
---

The React version is controlled in TWO places:

1. **`pnpm-workspace.yaml` catalog** — defines the "canonical" version (e.g. `react: 19.1.0`).
2. **Root `package.json` → `pnpm.overrides`** — a hard override that takes precedence over the catalog.

**Why:** When the overrides entry says `^18.3.1` but the catalog says `19.1.0`, pnpm installs 18.3.1. The override wins. Running `pnpm install --no-frozen-lockfile` won't help until the override is changed.

**How to apply:** To change the React version workspace-wide, update BOTH:
- `pnpm-workspace.yaml` → `catalog.react` and `catalog.react-dom`
- `package.json` → `pnpm.overrides.react` and `pnpm.overrides.react-dom`

Then run `pnpm install --no-frozen-lockfile`.
