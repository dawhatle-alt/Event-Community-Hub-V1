---
name: Expo React Compiler compatibility
description: expo-router v6 requires React 19; the React Compiler causes bundle failures with React 18.
---

**Rule:** expo-router v6 (Expo SDK 53+) calls `React.use()` which is React 19-only. Running with React 18 causes a runtime crash: `(0, react_1.use) is not a function`.

**Why:** expo-router v6 migrated to React 19 APIs. The workspace was originally pinned to React 18 via `pnpm.overrides` in root `package.json`. That override must be updated to `19.1.0`.

**React Compiler:** `babel-preset-expo` in Expo 53 enables the React Compiler by default. If React 18 is installed, it fails with `Unable to resolve "react/compiler-runtime"`. Fix: set `reactCompiler: false` in `babel.config.js` under the `babel-preset-expo` options. Alternatively, upgrade to React 19 (which is the correct fix).

**How to apply:** For this project, React 19.1.0 is now the correct version. The `babel.config.js` has `reactCompiler: false` as a belt-and-suspenders guard. Do not re-enable the React Compiler unless React 19 is confirmed installed.
