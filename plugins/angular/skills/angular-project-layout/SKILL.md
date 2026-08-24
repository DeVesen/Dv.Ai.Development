---
name: angular-project-layout
description: Use when deciding where a new Angular file belongs — feature folder structure, smart vs. dumb vs. page component placement, facade-service naming, or when to extract a large template into its own component. Triggers on "where does this component go", new feature scaffolding, component-size/extraction questions, or a showcase/demo feature without a backend.
---

# Angular Project Layout

Opinionated feature-folder convention. Repo-local rules always win — a project's own `AGENTS.md`/`CLAUDE.md` or an established different layout overrides this skill; `pages/` here is a recommended convention, not a hard requirement.

## Folder structure

```
src/app/
  components/               ← shared/dumb (standalone)
    [component-name]/       ← 4 files: .ts .html .scss .spec.ts
  features/                 ← features (standalone)
    [feature-name]/
      [feature-name].service.ts        ← primary feature facade (optional for a showcase feature)
      [feature-name].service.spec.ts
      pages/                           ← routed entry points (recommended)
        [route-name]-page/             ← 4 files: .ts .html .scss .spec.ts
      components/[component-name]/     ← non-routed building blocks; 4 files each
      models/*.model.ts
      [feature-name].constants.ts      ← optional, feature-local constants
      [feature-name]-section.scss      ← optional, shared SCSS partial
      services/api/*-api.service.ts    ← optional
      services/state/*-state.service.ts ← optional
      rules/*.rules.ts                 ← optional, pure functions
      pipes/                           ← optional
      styles/                          ← optional
  models/                   ← cross-feature models
  services/                 ← global singleton services
```

`pages/` and `components/` are siblings under the feature root — not `components/pages/`.

## Component types

**Shared/dumb** — reusable across features; no service injection, `input()`/`output()` only. `standalone: true`; lives in `src/app/components/` — only promote it there once ≥2 features actually use it.

**Smart** — ≥1 injected service; feature-scoped only. `standalone: true`; under `features/[feature]/components/[name]/`.

**Page** — a route's entry point, a "smart shell" (navigation, layout, orchestration). Not a replacement for the facade — delegates logic to `[feature].service.ts`. Folder `features/[feature]/pages/[route-name]-page/`; class `*PageComponent`; selector `app-[feature]-page`. Lazy-imported in the routes file:

```ts
loadComponent: () => import('./features/[feature]/pages/[route-name]-page/[route-name]-page.component')
  .then(m => m.[RouteName]PageComponent)
```

Composes non-routed building blocks from `../components/`; no direct API calls (goes through the facade).

**`components/` under a feature (non-routed building blocks)** — sections, sub-views, dialogs used by the page or other smart components. Never routed. Import direction: page → `../components/...`; sections → feature-root-shared (`../../[feature].constants`, `@use '../../[feature]-section'`).

## Features

**Facade naming:** folder kebab-case (e.g. `article-overview`) → service PascalCase + `Service` (`ArticleOverviewService`). Deviate only with a documented reason.

**Rules:**
- API calls go **through the facade** — smart components never call `*-api.service.ts` directly.
- State exposed via the facade / a readonly API — see skill `angular-signal-architecture`.
- Every feature-local component lives under `pages/[route-name]-page/` (routed) or `components/[name]/` (not routed); 4 files each.
- Feature-root artifacts allowed without a service: `[feature].constants.ts`, `[feature]-section.scss`, `models/*.model.ts`. No `.component.ts` at the feature root.

**Cross-feature communication:** a global service in `src/app/services/` (`providedIn: 'root'`), or feature A's service injected directly into feature B's component — decide case by case.

## New feature checklist

1. Create the `models/` file.
2. Create the facade `[feature-name].service.ts` (skip for a showcase feature).
3. Has a route? → create the **page component** under `pages/[route-name]-page/`; add lazy `loadComponent` to the routes file.
4. Non-routed UI building blocks under `components/[name]/` (sections, dialogs).
5. `services/api`, `state`, `rules`, `pipes`, `styles` only once the feature root gets cluttered.
6. Feature-service scope: `providedIn: 'root'` (singleton) or route-level `providers: []` (state reset on navigation).

## Models

Feature-specific: `src/app/features/[feature]/models/` — one file per model. Cross-feature: `src/app/models/` (e.g. `PagedResult<T>`).

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| File names | kebab-case | `article-overview.component.ts` |
| Classes | PascalCase | `ArticleOverviewComponent` |
| Feature services | feature-prefixed | `ArticleOverviewService` |
| Global services | descriptive, no prefix | `AuthService` |
| File suffix | always | `.component.ts`, `.service.ts` |

## Component size & extraction

HTML > 80 lines → consider splitting. Patterns that justify extraction:

1. Repetition/lists → container + element.
2. Clear UI sections (header, sidebar, footer) → own component each.
3. Modals/dialogs → own component.
4. Form sections → own component each.
5. Cards → own component.
6. `@if` THEN/ELSE block > 10 lines → own component.
7. `@for` body > 10 lines → own component.

## Special case: showcase/demo feature

A feature with no backend API or state facade (e.g. a UI component gallery, style-guide demo):

- No `[feature].service.ts` needed.
- Structure: one page (`pages/showcase-page/`) + many small demo sections under `components/[widget]-section/`.
- Navigation within the page via fragment links (`routerLink="." [fragment]="..."`) instead of dedicated routes.
- Extraction rule: HTML section > 30 lines → its own `*-section` component under `components/[widget]-section/`.
