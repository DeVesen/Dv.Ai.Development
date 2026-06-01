---
name: angular-developer-extension
description: >
  Portable layout and conventions for Angular apps (`src/app` structure, feature facades, smart vs dumb).
  Integrated project test policy ([references/testing.md](references/testing.md)) and signal architecture for feature services
  ([references/signal-architecture.md](references/signal-architecture.md)): facade state ownership, readonly public API,
  no effect-only sync between signals, one Observable→signal boundary, BehaviorSubject migration hints;
  vendor APIs remain in angular-developer.
  Use AFTER [angular-developer](../angular-developer/SKILL.md) when generic Angular APIs apply.
  Load when placing files (features/, components/, models/), feature facades, smart vs dumb extraction, migrations in references/migration-*.md.
  Test triggers (also load angular-developer for TestBed/snippets): unit test, integration test, TestBed,
  component.spec.ts, HttpTestingController, Router test, Signal test, Harness, flaky test, ng test.
  Signal architecture triggers (also load angular-developer for signal/effect APIs): signal architecture,
  feature facade state, BehaviorSubject migration, RxJS boundary, toSignal, toObservable, facade readonly API.
  Triggers: angular-developer-extension, angular architecture, project structure after angular-developer,
  feature facade, smart vs dumb, ng generate path, extension architecture skill.
  For language-level Angular (signals, forms, DI, routing) and generic test/signal mechanics: load angular-developer first.
---

## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{code-root}` | Wurzelpfad des Code-Repositories (z. B. `my-project/`) |
| `{agent-index}` | Datei mit der Repository-Agentenübersicht (z. B. `AGENTS.md`) |

# Angular Developer Extension (layout & conventions)

This skill **specializes layout, repository conventions, test policy, and feature-service signal architecture** on top of **[Angular Developer](../angular-developer/SKILL.md)**. It does **not** replace the vendor baseline for language-level Angular guidance.

## Guidance precedence

Use the most specific reliable guidance available:

1. **Existing implementation patterns** in the target project area.
2. **Project rules** — repository conventions, `{agent-index}` or equivalent agent docs **if present**, and project-local skills (workspace skills commonly under `.cursor/skills/`, app/repo skills often under `{code-root}/.skills/` or as documented by the team).
3. **[Angular Developer](../angular-developer/SKILL.md)** (Google upstream) and [`angular-developer/references/`](../angular-developer/references/) — **generic** Angular: components, signals, forms, DI, routing, SSR, testing fundamentals, CLI. **Load this first** when the task is about APIs, syntax, or framework behavior (unless steps 1–2 already decide).
4. **This skill** — folder structure, feature facade rules, smart/dumb policy, naming tables, component extraction heuristics, integrated **frontend test policy** ([references/testing.md](references/testing.md)), and **signal architecture** for feature facades ([references/signal-architecture.md](references/signal-architecture.md)); stubs under `references/` delegate to the vendor skill where generic technique would duplicate.
5. **[General Angular fallback](references/angular-general-fallback.md)** — pointer layer only; prefer `angular-developer` for substance.
6. **Official Angular documentation** when still needed.

Always confirm the project **Angular version** (`package.json`, `@angular/core`) before APIs that vary by major version — see also [Angular Developer](../angular-developer/SKILL.md).

---

## Vendor baseline (do not duplicate here)

Use **[`angular-developer`](../angular-developer/SKILL.md)** and these references (load as needed):

| Topic | Reference under `angular-developer/references/` |
|--------|--------------------------------------------------|
| Components, `@if`/`@for`/`@switch` | [components.md](../angular-developer/references/components.md) |
| Signal `input()` / model inputs | [inputs.md](../angular-developer/references/inputs.md) |
| `output()` | [outputs.md](../angular-developer/references/outputs.md) |
| Host bindings | [host-elements.md](../angular-developer/references/host-elements.md) |
| Signals, `computed`, `linkedSignal`, `resource`, `effect` | [signals-overview.md](../angular-developer/references/signals-overview.md), [linked-signal.md](../angular-developer/references/linked-signal.md), [resource.md](../angular-developer/references/resource.md), [effects.md](../angular-developer/references/effects.md) |
| Forms | [signal-forms.md](../angular-developer/references/signal-forms.md), [reactive-forms.md](../angular-developer/references/reactive-forms.md), [template-driven-forms.md](../angular-developer/references/template-driven-forms.md) |
| DI | [di-fundamentals.md](../angular-developer/references/di-fundamentals.md), [creating-services.md](../angular-developer/references/creating-services.md), [defining-providers.md](../angular-developer/references/defining-providers.md), [injection-context.md](../angular-developer/references/injection-context.md), [hierarchical-injectors.md](../angular-developer/references/hierarchical-injectors.md) |
| Routing | [define-routes.md](../angular-developer/references/define-routes.md), [loading-strategies.md](../angular-developer/references/loading-strategies.md), [route-guards.md](../angular-developer/references/route-guards.md), [data-resolvers.md](../angular-developer/references/data-resolvers.md), … |
| ARIA / headless widgets | [angular-aria.md](../angular-developer/references/angular-aria.md) |
| Tests (TestBed, Vitest, harness) | [testing-fundamentals.md](../angular-developer/references/testing-fundamentals.md), [component-harnesses.md](../angular-developer/references/component-harnesses.md), [router-testing.md](../angular-developer/references/router-testing.md) |
| CLI / build | [cli.md](../angular-developer/references/cli.md) |

**Project overrides:** If the repository documents stricter rules (e.g. forbidding Tailwind, mandatory UI library), those **outrank** the generic vendor skill — including [`tailwind-css.md`](../angular-developer/references/tailwind-css.md) when the project forbids Tailwind.

### Extension-only reference entries (stubs + migrations)

These files under `references/` either **delegate** to `angular-developer` or hold **short migration** snippets:

- [component-api.md](references/component-api.md) — pointer
- [routing.md](references/routing.md) — pointer + lazy-loading default reminder for this layout
- [dependency-injection.md](references/dependency-injection.md) — pointer
- [forms.md](references/forms.md) — pointer
- [testing.md](references/testing.md) — integrated project test policy (unit vs integration, refactor stance; vendor links for mechanics)
- [signal-architecture.md](references/signal-architecture.md) — feature-service signal architecture (state owner, readonly API, RxJS boundary)
- [accessibility.md](references/accessibility.md) — pointer
- [angular-general-fallback.md](references/angular-general-fallback.md) — pointer
- [Migration snippets](references/migration-examples.md) — legacy → modern quick refs

---

## Project Structure

```
src/app/
  components/               ← Shared/Dumb Components (standalone)
    [component-name]/
      *.component.ts
      *.component.html
      *.component.scss
      *.component.spec.ts

  features/                 ← Features (standalone)
    [feature-name]/
      [feature-name].service.ts   ← Primary feature facade (see Features section)
      [feature-name].service.spec.ts
      components/             ← All feature-local components (Smart and Dumb that belong only to this feature)
        [component-name]/
          *.component.ts
          *.component.html
          *.component.scss
          *.component.spec.ts
      models/
        *.model.ts
      services/             ← Optional: internal injectables (larger features)
        api/
          *-api.service.ts
        state/
          *-state.service.ts
      rules/                ← Optional: pure functions (*.rules.ts, *.rule.ts) + *.spec.ts
      pipes/                ← Optional: feature-local pipes
      styles/               ← Optional: shared SCSS partials for the feature

  models/                   ← Cross-feature Models
    *.model.ts

  services/                 ← Global Singleton Services
    *.service.ts
```

---

## File Structure per Component

Every component always consists of **four separate files**:
- `*.component.ts` – Logic
- `*.component.html` – Template
- `*.component.scss` – Styles
- `*.component.spec.ts` – Tests

---

## Component Types

### Shared / Dumb Components
- Reusable across multiple features
- **No** service injection
- Communication **exclusively** via signal inputs/outputs: `input()` and `output()` (see [inputs.md](../angular-developer/references/inputs.md) / [outputs.md](../angular-developer/references/outputs.md))
- Must be **`standalone: true`**
- Belong in `src/app/components/[component-name]/`
- Only moved there once used by **at least two features** – unless explicitly instructed otherwise

### Smart Components
- Have at least one injected service
- Exist only within the context of a feature
- Are **`standalone: true`**
- Live under `src/app/features/[feature-name]/components/[component-name]/`
- Example: Feature "Article Overview" → Smart Component "Article Table" at `features/article-overview/components/article-table/`

---

## Features

A feature consists of:
- A **primary Feature Service (facade)** at the feature root — see naming below
- At least one component (Smart or Dumb) under **`components/[component-name]/`**, all **`standalone: true`**
- A `models/` subdirectory for feature-specific models

**Facade naming (default):** The feature folder uses **kebab-case** (e.g. `article-overview`). The main injectable is **`[feature-name].service.ts`** with class **`FeatureNameService`**: convert the folder name to PascalCase and append `Service` (e.g. `article-overview` → `ArticleOverviewService`). Deviations are allowed only with a documented reason (e.g. avoiding collision with a backend type name). Example documented deviation: folder `billing` uses **`invoice-search.service.ts`** / **`InvoiceSearchService`** instead of `BillingService` when the facade’s responsibility is narrower than the folder name.

**Internal layout (when the feature grows): Keep the feature root uncluttered by grouping:**
- HTTP / API wrappers → `services/api/` (e.g. `*-api.service.ts`)
- Feature-internal state services → `services/state/`
- Pure, testable rules → `rules/`
- Feature-local pipes → `pipes/`
- Shared SCSS partials → `styles/`

**Rules:**
- API calls from the UI go **through the feature facade** (or through services that the facade composes) — smart components should not call `*-api.service.ts` directly unless the team explicitly allows it for a special case
- State exposed to the UI is surfaced via the facade or readonly APIs as per [signal architecture](references/signal-architecture.md)
- **All feature-local components** live under **`components/[component-name]/`** (four files each). The feature root holds only the facade, `models/`, and the optional `services/`, `rules/`, `pipes/`, `styles/` folders — not loose `*.component.*` files.
- Path: `src/app/features/[feature-name]/`
- **Angular CLI:** generate with an explicit path, e.g. `ng generate component [feature-name]/components/[component-name]` from `src/app/features/` (or `--path=src/app/features/[feature-name]/components/[component-name]` from the project root), so new components land under `components/` by default.

**Feature examples (illustrative):** `shell-sidebar`, `shell-header`, `article-overview`, `dashboard`, `home`

### Cross-Feature Communication
- Via a global service under `src/app/services/` → always `providedIn: 'root'`
- Alternative: A feature component from Feature B can directly inject the service of Feature A when used inside a page of Feature A → **case-by-case decision**

---

## Feature Checklist (when creating a new feature)

Ask the following questions when setting up a new feature:

1. **First component** – name and location under `components/[component-name]/` (create the `components/` folder if it does not exist yet)
2. **Model file** – create under `models/`
3. **Feature facade** – create as `[feature-name].service.ts` / `FeatureNameService` at the feature root; add `services/api`, `services/state`, `rules`, `pipes`, or `styles` when the number of files at the root becomes hard to navigate
4. **Is the feature opened via a route?**
   - If yes → **Lazy Loading** is the default (see [loading-strategies.md](../angular-developer/references/loading-strategies.md))
   - If yes → **Initial data**: load in the component / Feature Service on activate, or use a **`ResolveFn`** / **`CanActivate`** (or other functional guards) when data or permission must be ready before the route is shown
   - **Guards**: `CanActivate`, `CanMatch`, etc. — required for auth, roles, or feature flags?
   - **Resolvers**: pre-fetch route data where it prevents flicker or duplicate requests
   - **Route vs root providers**: should the Feature Service live on the route (`providers: []`) so state resets on navigation away, or stay `providedIn: 'root'`? (ties to item 5)
5. **How is the Feature Service provided?**
   - `providedIn: 'root'` → Singleton, persists across route changes, can load data early
   - Scoped (e.g. via route `providers: []`) → State is reset when leaving the route

---

## Models

### Feature-specific Models
- Located under `src/app/features/[feature-name]/models/`
- One file per model, e.g. `article.model.ts`, `article-status.model.ts`
- Contains interfaces, types and enums of the feature

### Cross-feature Models
- Located under `src/app/models/`
- Example: `paged-result.model.ts` with generic `PagedResult<T>`

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| File names | `kebab-case` | `article-overview.component.ts` |
| Class names | `PascalCase` | `ArticleOverviewComponent` |
| Feature Services | Feature name as prefix | `ArticleOverviewService` |
| Global Services | Descriptive name, no prefix | `AuthService`, `UserService` |
| File suffix | always include | `.component.ts`, `.service.ts`, `.model.ts` |

---

## Component Size & Extraction

At **HTML > 80 lines** → evaluate whether the component should be split.

### Patterns that justify extraction into a sub-component:

1. **Repetitions / Lists** – identical elements repeating → Container + Element component
2. **Clearly separated UI sections** – e.g. Header, Sidebar, Content, Footer → each its own component
3. **Modals / Dialogs / Overlays** – if inline in the template → own component
4. **Forms** – sections like Personal Data, Address, Payment → each its own component
5. **Cards** – card layout with title, body, footer → own component
6. **Conditional blocks (`@if`)** – only the THEN or ELSE branch, and only if that branch is **> 10 lines** → own component
7. **Loop blocks (`@for`)** – the loop body content, if it is **> 10 lines** → own component

---

## Project code policy (shortcut)

Everything in **[Angular Developer](../angular-developer/SKILL.md)** applies unless **project-level rules** or **this layout skill** say otherwise.

- **Version:** Read **`@angular/core`** (and related packages) in `package.json`. Prefer modern control flow and signal-based public APIs for **new and touched** code when the version supports them; do not introduce legacy template APIs in new code where avoidable. Details: vendor skill + [migration-examples.md](references/migration-examples.md).
- **Styling / UI:** Follow the **target project’s** design system and CSS/SCSS conventions. If agent docs or team rules forbid a tool (e.g. Tailwind), follow those over vendor references such as `tailwind-css.md`.
- **Migration snippets** for `*ngIf`/`@if`, `@for`/`track`, inputs/outputs: [references/migration-examples.md](references/migration-examples.md).

---

## Testing

- Every component keeps **`*.component.spec.ts`** per [File Structure](#file-structure-per-component).
- Project **test policy** (unit vs integration, public API focus, refactor-time rules, flake avoidance): **[references/testing.md](references/testing.md)**.
- Generic techniques (TestBed, HTTP testing, harnesses, router harness): **[Angular Developer](../angular-developer/SKILL.md)** and [testing-fundamentals.md](../angular-developer/references/testing-fundamentals.md), [component-harnesses.md](../angular-developer/references/component-harnesses.md), [router-testing.md](../angular-developer/references/router-testing.md).

---

## Tooling

- **Scaffold** with `ng generate`, then **move/split** files to match this skill (`features/` vs `components/`, four files per component) — see [cli.md](../angular-developer/references/cli.md).
- After substantive edits, run the **project build** (`ng build` or repo-documented command) and fix compile errors.
- ESLint / Prettier: follow the **repository’s** existing setup; the vendor CLI reference describes options, not every repo’s exact config.

```bash
# Example only — only if the project does not already include these:
npm install --save-dev prettier prettier-plugin-organize-imports
```

---

## Additional pointers

For **signal architecture** in feature services (state ownership, readonly API, RxJS boundaries): **[references/signal-architecture.md](references/signal-architecture.md)**.
