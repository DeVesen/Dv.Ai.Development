---
name: angular-developer
description: Generates Angular code and provides architectural guidance. Trigger when creating projects, components, or services, or for best practices on reactivity (signals, linkedSignal, resource), forms, dependency injection, routing, SSR, accessibility (ARIA), animations, styling (component styles, Tailwind CSS), testing, or CLI tooling.
license: MIT
metadata:
  author: Copyright 2026 Google LLC
  version: '1.0'
---

# Angular Developer Guidelines

1. **Angular-Version** vor Antwort prüfen — Best Practices variieren stark zwischen Majors. Bei neuem Projekt mit CLI keine Version angeben außer auf Nutzerwunsch.
2. Angular Style Guide + Best Practices für Wartbarkeit/Performance einhalten. Angular CLI für Scaffolding nutzen.
3. Nach Code-Generierung `ng build` ausführen; Fehler analysieren und beheben — Pflicht.

## Neue Projekte

Defaults bei fehlenden Vorgaben:
1. Neueste stabile Angular-Version.
2. Signal Forms für neue Formulare (Angular v21+) — [signal-forms.md](references/signal-forms.md).

**`ng new`-Ausführungsregel:**
- Nutzer nennt Version → `npx @angular/cli@<version> new <project-name>`
- Keine Version, CLI vorhanden (`ng version` OK) → `ng new <project-name>`
- Keine Version, CLI fehlt → `npx @angular/cli@latest new <project-name>`

## Referenzen nach Thema

### Komponenten
- Anatomie, Metadata, `@if`/`@for`/`@switch` → [components.md](references/components.md)
- Signal-Inputs, Transforms, Model-Inputs → [inputs.md](references/inputs.md)
- Signal-Outputs, Custom Events → [outputs.md](references/outputs.md)
- Host-Bindings → [host-elements.md](references/host-elements.md)

### Reaktivität / State
- `signal`, `computed`, `untracked` → [signals-overview.md](references/signals-overview.md)
- `linkedSignal` → [linked-signal.md](references/linked-signal.md)
- Async mit `resource` → [resource.md](references/resource.md)
- `effect`, `afterRenderEffect`, wann **nicht** nutzen → [effects.md](references/effects.md)

### Formulare
v21+, neue Formulare → Signal Forms; ältere Apps → bestehende Strategie beibehalten.
- Signal Forms → [signal-forms.md](references/signal-forms.md)
- Template-driven (einfach) → [template-driven-forms.md](references/template-driven-forms.md)
- Reactive (komplex) → [reactive-forms.md](references/reactive-forms.md)

### Dependency Injection
- Grundlagen, `inject()` → [di-fundamentals.md](references/di-fundamentals.md)
- Services, `providedIn: 'root'` → [creating-services.md](references/creating-services.md)
- `InjectionToken`, `useClass/Value/Factory` → [defining-providers.md](references/defining-providers.md)
- `inject()` Kontext, `runInInjectionContext` → [injection-context.md](references/injection-context.md)
- Hierarchical Injectors, Modifier → [hierarchical-injectors.md](references/hierarchical-injectors.md)

### Accessibility (ARIA)
- Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid → [angular-aria.md](references/angular-aria.md)

### Routing
- URL-Pfade, Wildcards, Redirects → [define-routes.md](references/define-routes.md)
- Eager vs. Lazy Loading → [loading-strategies.md](references/loading-strategies.md)
- `<router-outlet>`, Named Outlets → [show-routes-with-outlets.md](references/show-routes-with-outlets.md)
- `RouterLink`, programmatisch → [navigate-to-routes.md](references/navigate-to-routes.md)
- Guards (`CanActivate`, `CanMatch`) → [route-guards.md](references/route-guards.md)
- `ResolveFn` → [data-resolvers.md](references/data-resolvers.md)
- Navigation Events → [router-lifecycle.md](references/router-lifecycle.md)
- CSR/SSG/SSR+Hydration → [rendering-strategies.md](references/rendering-strategies.md)
- View Transitions API → [route-animations.md](references/route-animations.md)

### Styling & Animations
- Tailwind CSS Integration → [tailwind-css.md](references/tailwind-css.md)
- CSS-Animations vs. Legacy-DSL → [angular-animations.md](references/angular-animations.md)
- Component Styles + Encapsulation → [component-styling.md](references/component-styling.md)

### Testing
- Unit-Testing (Vitest), async, TestBed → [testing-fundamentals.md](references/testing-fundamentals.md)
- Component Harnesses → [component-harnesses.md](references/component-harnesses.md)
- `RouterTestingHarness` → [router-testing.md](references/router-testing.md)
- E2E mit Cypress → [e2e-testing.md](references/e2e-testing.md)

### Tooling
- CLI: Apps, Generate, Serve, Build → [cli.md](references/cli.md)
- Modernisierungs-Migrationen → [migrations.md](references/migrations.md)
- Angular MCP Server → [mcp.md](references/mcp.md)
