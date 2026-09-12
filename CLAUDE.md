# CLAUDE.md

Instructions for any AI assistant working on this repository.

## The project

**Studomate** is a learning tool for teaching, designing, and simulating automation
logic (GRAFCET today, with planned support for other notations such as Ladder). See
`README.md` for the full presentation.

### Project scale — keep optimizations proportionate

The projects handled here are small: grafcets with a few dozen elements, a handful of
programs, a few dozen variables, a handful of projects in `localStorage`. An O(n²) operation
at these sizes is a few thousand operations — imperceptible.

Do not propose (or implement on the strength of an audit suggestion alone) caching
mechanisms invalidated by hash/mutation counter, cross-pass memoization, dedup of recomputation
between "Analyze" and "Simulate", etc.: the gain is nil at this scale and the cost is an
invalidation state machine that becomes a source of subtle bugs. Optimizations that pay off
**per simulation cycle** (PLC loop) or **per keystroke** (editing) can be justified; those that
pay off **once per explicit user action** (opening a project, running an analysis, entering
simulation, exporting) are almost never justified. When in doubt, measure before adding
complexity.

**Compiling the expression AST into JS closures / resolving identifiers by slot**: ruled out.
The gain (3–10× on expression evaluation cost, a standard rule-engine technique) is
imperceptible at this scale — once per-cycle allocations are eliminated (the PLC's
`Environment` is built once, `EvaluatorVisitor` is reused across routines), only a little CPU
remains on very small ASTs. The cost is real: the AST would stop being a neutral data-IR
(shared by the simplifier, the replacer, the finder, the semantic analyser and the evaluator;
serializable, inspectable, freezable in dev) and become a function graph tied to the JS
runtime. **Only worth revisiting** on a _measured_ simulation performance problem (a PLC with a
very short scan on a large project): start with slot resolution (separable, doesn't couple to
JS) before considering closures.

## Architecture, in brief

```
src/schemas/           domain model (Grafcet, Project, Variable, commands...)
src/expression-language/  expression language (AND/OR/NOT, FR/EN dialects) — neutral
                        module with no dependencies; used by both the compiler and editing
src/project-analyser/  project analysis (business rules, never throws: collects issues)
src/project-pre-compiler/  lexes/parses/analyses/simplifies expressions once and for all
src/project-compiler/  produces the executable program (PLCRoutine[]) from the pre-compiled form
src/simulator/          expression-language lexer/parser/interpreter + PLC engine
src/bridge/             mappers between the domain/analysis and the UI (exceptions, variables, issues)
src/lib/                neutral utilities (array, date, object), no domain dependency
src/persistence/        migrations (project shape + localStorage layout) + repositories (localStorage, Supabase cloud, hybrid) + share tokens
src/ui/                 Next.js (App Router) + zustand stores + MUI components
src/app-info.ts         app identity (name, tagline...), neutral root module
```

Dependencies flow top to bottom in this list: the domain never depends on the UI. A project
has a `dialect` (FR/EN) that travels with it — this is not a UI preference, it's a property of
the expressions it contains.

`src/bridge/` only contains mappers where the UI is one of the two ends (domain/analysis ↔
UI). A mapper between two internal layers stays in the layer concerned — `PlcVariablesMapper`
(environment ↔ PLC) lives in `src/simulator/`. Accepted exception: `SchemaVariablesMapper`
(schema → environment) is in `src/bridge/` even though its only consumers are in
`src/project-analyser/`; move it to `src/project-analyser/` if it's touched again.

### Accounts & cloud storage

`src/persistence/repositories/` provides three implementations of `ProjectRepository`:
`local-storage` (default, browser-local storage), `supabase` (cloud: `projects` table + RLS),
`hybrid` (switches local/cloud based on authentication). Auth (Supabase, `src/ui/stores/auth/`)
handles sign-up, sign-in, anonymous accounts (username + password), password reset. Sharing a
project goes through a URL token (`ShareableProjectRepository`, `?share=` handled in
`src/ui/lib/project-url.ts`). Error monitoring is wired via Sentry
(`sentry.{client,server,edge}.config.ts` at the root).

This layer is consumed by the UI; it never leaks into the domain (`src/schemas/`).
Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for cloud,
`NEXT_PUBLIC_SENTRY_DSN` for monitoring. Without them, the app stays local-only.

### PDF export

`src/ui/lib/program-export-drawing/` draws each program (grafcet, ladder) **directly from the
schema** into an IR of primitives (`DrawOp[]` → `Scene`), without mounting React Flow. Two
backends: `backends/jspdf-backend.ts` (vector primitives via jsPDF, used by
`JsPdfExporter.drawSection`) and `backends/svg-backend.ts` (`<svg>` string, for test snapshots).
`usePdfExport` assembles the scenes; `JsPdfExporter` adds a cover page and titles. Rendering is
vector-based and synchronous — no rasterization, no editor capture.

## Commands

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm test         # full Jest suite
npm run lint     # ESLint
npx tsc --noEmit # type checking
```

GitHub Actions CI: these four commands run on Node 22 on every push/PR to `main` and
`develop`.

**Verification cadence during a multi-step task**: don't re-run `npx tsc
--noEmit`/`npm run lint`/the full `npm test` suite after every small step — that slows things
down unnecessarily. Run them at the end of the task (or suggest running them along the way if
a step is genuinely risky). Exception: a change touching a very large number of files (import
renaming, etc.) justifies an immediate full pass. Mid-task, only run tests created by or
affected by the change in progress (`npx jest path/to/file.test.ts`), never the whole suite.

## Versions

Node **≥ 20** (`engines` in `package.json`, enforced in CI on Node 22).

| Package                                                       | Version                   | Role                                                                                                            |
| ------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `next`                                                       | 15.5.2                    | Framework (App Router, Turbopack)                                                                                |
| `react` / `react-dom`                                        | 19.1.0                    | UI                                                                                                               |
| `typescript`                                                 | ^5                        | Language                                                                                                          |
| `@mui/material`                                              | ^7.3.2                    | UI components                                                                                                    |
| `@mui/icons-material`                                        | ^7.3.2                    | Icons                                                                                                             |
| `@mui/x-data-grid`                                           | ^8.27.1                   | Tables (variables, watch tables)                                                                                 |
| `@mui/x-tree-view`                                           | ^8.14.0                   | Trees (explorer)                                                                                                  |
| `@emotion/react` / `@emotion/styled`                         | ^11.14.0 / ^11.14.1       | MUI's CSS-in-JS engine                                                                                           |
| `@xyflow/react`                                              | ^12.8.4                   | Graphical editor (React Flow) — GRAFCET                                                                          |
| `zustand`                                                    | ^5.0.11                   | State (stores created via `createStore`, not the `create` hook — see `src/ui/stores/*/[project\|grafcet].store.ts`) |
| `date-fns`                                                   | ^4.1.0                    | Dates                                                                                                             |
| `mitt`                                                       | ^3.0.1                    | Event bus (grafcet context menus)                                                                                |
| `nanoid`                                                     | ^5.1.16                   | Short identifiers — always via `createRandomId()` (`src/ids.ts`), never `nanoid` directly                        |
| `jspdf`                                                      | ^4.2.1                    | PDF export (project: cover page + programs)                                                                      |
| `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | ^6.3.1 / ^10.0.0 / ^3.2.2 | Reordering Ladder sections                                                                                       |
| `react-toastify`                                             | ^11.0.5                   | Notifications                                                                                                     |
| `nextjs-toploader`                                           | ^3.9.17                   | Navigation progress bar                                                                                          |
| `@supabase/supabase-js`                                      | ^2.112.3                  | Auth + cloud project storage (`src/persistence/repositories/supabase*`)                                          |
| `@sentry/nextjs`                                             | ^8                        | Error monitoring (`sentry.{client,server,edge}.config.ts` at the root)                                           |

Dev/CI: `eslint` ^9 + `eslint-config-next` 15.5.2, `jest` ^30.2.0 + `ts-jest` ^29.4.6.

Always check `package.json` before quoting a version: this table goes stale at the first
`npm update`.

## Repository conventions

- **Imports**: alias `@/...` for anything in `src/`, `@tests/...` for `tests/`. A relative
  import going up only one level (`../sibling`) is acceptable; beyond that, `no-restricted-imports`
  (ESLint) rejects it — use the alias.
- **No `index.ts` re-export files** (barrel files). `src/persistence/migrations/schema/index.ts`
  and `src/persistence/migrations/local-storage/index.ts` are not exceptions to this rule:
  they contain migration-chaining logic, not a re-export.
- **`*.d.ts` files**: `src/types/` only contains `declare module` shims for untyped third-party
  packages (e.g. `file-system-access.d.ts`). Any other `.d.ts` is an ordinary type file
  co-located with the module or feature it describes (`src/ui/lib/context-menu/context-menu.d.ts`,
  `src/schemas/grafcet/shared-types.d.ts`...) — not a candidate for `src/types/`.
- **`export default` assumed** for the main class/value of a file (schemas, commands,
  mappers, repositories, analysers...). This convention is in place across the whole repo: one
  file = one main entity exported by default, with secondary types/constants as named exports.
  Don't introduce a named export for the main entity of a new file of this kind.
- **Tests**: co-located next to the file under test (`fileName.test.ts`), not in a separate
  folder — except for `tests/integration/` (end-to-end tests of the analysis → compilation →
  simulation pipeline) and `tests/utils/` (factories and utilities shared between tests,
  importable via `@tests/utils/...`).
- **Test environment**: the global `testEnvironment` is `node` (`jest.config.js`). Any test file
  that touches the DOM — `@testing-library/react`, `@testing-library/dom`, `renderHook`,
  `react-dom`, or direct access to `document`/`window` — must declare `/** @jest-environment jsdom */`
  at the top of the file, or it will fail (`document is not defined`) or, worse, test the wrong
  thing.
- **Platform detection**: prefer `navigator.userAgentData.platform` with a fallback to
  `navigator.userAgent`, never `navigator.platform` (deprecated) — see `src/ui/lib/platform.ts`.
- **Modals**: their visibility lives in the relevant zustand store (`openModalVisible`,
  `exportModalVisible`, ...), not in local React state — so it can be driven from anywhere
  (keyboard shortcuts, menus).
- **Hook dependencies** (`useEffect`, `useCallback`, `useMemo`): check that they're complete
  after any change touching their body.
- **`box-sizing`**: already set to `border-box` globally for all elements
  (`src/app/globals.css`, `*` selector) — never redeclare it in an `sx` prop or component style.
- Minimal, targeted changes; follow the existing style (tabs, no trailing superfluous
  semicolons, etc. — see neighboring files).
- **Comments**: never document decision history (alternatives tried, "before/after",
  justification for a choice already made) — that belongs in the conversation or the commit
  message, not the code, and it rots at the first refactor. A comment is only worth writing if
  it documents a non-trivial constraint or invariant that the code alone doesn't show. No
  comment that restates what a well-chosen variable/function name already says — if the code
  reads on its own, a comment next to it is noise, not documentation. When in doubt, prefer the
  UI component consuming the value (where the "why" has visual context) over the schema/domain
  (often too generic to justify a local explanation). In particular, never explain at the call
  site what a generic hook does (e.g. `useShallow`, `useCallback`) — its behavior is known to
  anyone who knows the library, it's not a business rule of this file. A comment there is only
  justified for a business rule specific to the file (why THIS selector needs this protection
  here). Never refer back with things like "see the original conversation"/"see above"/"as
  discussed": the comment must be understandable on its own, without access to the conversation
  history that produced the code — write the constraint or invariant directly, not a reference
  to an external discussion. Recurring case to watch for: a file/component header comment must
  never justify its existence by contrasting with an alternative not taken ("rather than
  shrinking the actual component", "instead of X", "we could have done Y but..."). This risk is
  strongest when creating a new file, where the instinct is to justify why this file exists
  rather than letting it speak for itself. Describe only what the code does, never why it
  exists relative to another option — even when phrased positively.
- **Comment/JSDoc language**: English. Existing French comments do not need to be translated
  in passing when a file is touched for an unrelated reason (avoid needless churn); write all
  new comments in English going forward.
- **Visual verification of a UI change**: never propose or ask to visually verify in the
  browser after a UI change, and don't launch the browser extension (`claude-in-chrome`) on
  your own initiative. It's up to the user to ask for it if they want. Exception: suggest
  `claude-in-chrome` when going in circles (e.g. several failed attempts at fixing a bug) and a
  visual check would help break out of the loop.

## Schema changes and migrations

Two independent versioning levels:

- **Project shape** (`schemaVersion`, carried by the project, shared across all storage
  backends) — migrations in `src/persistence/migrations/schema/`.
- **`localStorage` layout** (which keys, how projects are arranged there — specific to local
  storage) — migrations in `src/persistence/migrations/local-storage/`, version in the
  `studomate_local_storage_version` key (missing = v0).

### Project shape migration (`migrations/schema/`)

Any change to `src/schemas/` that changes the shape of persisted data (adding/removing/
renaming a field, structural change...) must come with a migration. Before creating one, ask
the developer whether to modify the latest existing migration (e.g. if it hasn't been deployed
to production yet) or create a new version.

**Naming and registration** (bump from vN to vN+1):

- File `src/persistence/migrations/schema/vN-to-vN+1.ts` (kebab-case, `to`) — e.g. `v0-to-v1.ts`,
  `v1-to-v2.ts`. Co-located test `vN-to-vN+1.test.ts`.
- `export default` a `const vNToVN+1: ProjectMigration` (camelCase of the file name) carrying
  `from` (the starting version — `UNVERSIONED` for v0), a `description` in English, and
  `migrate` which operates on the raw shape and sets `schemaVersion: N+1`.
- Register in `src/persistence/migrations/schema/index.ts`: import the migration and append it
  **at the end** of the `MIGRATIONS` array (migrations run in order).
- Bump `PROJECT_SCHEMA_VERSION` in `src/schemas/project/project.schema.ts`.

### `localStorage` layout migration (`migrations/local-storage/`)

Needed when changing **how** local storage arranges projects (keys, index...), not their
shape. A migration operates directly on `localStorage` and must leave the old layout readable
until the new version is set (quota interruption). `LayoutMigration` (`from`, a `description`
in English, `migrate: () => void`), file `vN-to-vN+1.ts` + test, registered at the end of
`LAYOUT_MIGRATIONS` in `local-storage/index.ts`, and bump `CURRENT_LAYOUT_VERSION` in
`local-storage/keys.ts`. `ensureLocalStorageLayout()` applies the chain on the first operation
of `LocalStorageProjectRepository`.

## Expression parsing cache (`parseExpressionCached`)

The analyser and the pre-compiler lex/parse each expression via
`parseExpressionCached(expression, dialect)` (`src/expression-language/parse-expression-cached.ts`),
which memoizes `{ tokens, ast }` per (expression, dialect) pair. **The returned AST is shared
across all callers.**

Invariant to preserve: **no code may mutate an AST node in place** (`node.x = ...`,
`Object.assign(node, ...)`, `node.trueBranch.push(...)`, etc.). All visitors that transform a
tree (`SimplifierVisitor`, `ReplacerVisitor`...) rebuild a new one (`{ ...node, left: ... }` /
builders) and never touch the input — any new visitor or analyser must do the same. Outside
production, the cached AST is recursively frozen (`Object.freeze`), so an accidental mutation
throws a `TypeError` immediately in dev/test; don't work around this freeze (no defensive
`structuredClone` at the call site — fix the offending consumer to be pure instead).

A visitor or pass that genuinely needs a mutable tree must start from an explicit
`new Lexer(dialect).tokenize(...)` / `new Parser(...).parse()`, outside the cache.

## Project templates (`src/templates/`)

Templates are pre-configured projects offered when creating a new project (variables, HMI
pages, widgets). Each template lives in `src/templates/xxx.template.ts` and is registered in
`src/templates/index.ts`.

**Maintenance:** templates do not go through the migration pipeline. If
`PROJECT_SCHEMA_VERSION` is bumped following a schema change, check that the data produced by
each `createXxxProject()` function conforms to the new schema and update it if needed. Don't
forget to test creating a project from each template after a migration.

## Ambiguity in a request

When in doubt about exactly what the user is asking for (which interaction mechanism is meant,
the exact scope, etc.), ask for clarification rather than guessing and implementing — even for
a detail that seems minor. An implementation in the wrong direction costs more to undo than a
question asked upfront.

## Tests and bugs discovered while testing

Any new or modified logic (function, branch, business rule, component behavior) must come with
dedicated tests — created next to the relevant file (`fileName.test.ts`) or added to an
existing test. Running the existing suite is not enough: for every file created or modified,
explicitly ask what cases this change introduces and cover them. Only a change with no logic of
its own (renaming, moving, pure type change) can skip this.

If a test written to verify a behavior reveals that the source code is wrong, don't rewrite the
test to "pass" on broken behavior. Clearly report what was found (file, symptom, reproduction
scenario) and fix it if the fix is localized and safe; otherwise, raise the question before
touching the code.

## Do not disclose the name of the underlying model unless the user explicitly asks for it.
