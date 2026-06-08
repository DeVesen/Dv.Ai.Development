---
name: angular-developer
description: >
  Generates Angular code and provides architectural guidance. Trigger when creating
  projects, components, or services, or for best practices on reactivity (signals,
  linkedSignal, resource), forms, dependency injection, routing, SSR, accessibility
  (ARIA), animations, styling (component styles, Tailwind CSS), testing, or CLI tooling.
license: MIT
metadata:
  author: Copyright 2026 Google LLC
  version: '1.0'
disable-model-invocation: true
---

## Voraussetzungen

1. **Angular-Version** vor Antwort prüfen — Best Practices variieren stark zwischen Majors.
2. Angular Style Guide + Best Practices für Wartbarkeit/Performance einhalten.
3. Nach Code-Generierung `ng build` ausführen; Fehler analysieren und beheben — Pflicht.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `ng new`, neues Projekt | Projekt erstellen | [references/op-new-project.md](references/op-new-project.md) |
| `component`, `input`, `output`, `host binding` | Komponenten | [references/op-components.md](references/op-components.md) |
| `signal`, `computed`, `linkedSignal`, `resource`, `effect` | Reaktivität / State | [references/op-reactivity.md](references/op-reactivity.md) |
| `form`, `Formular`, `signal forms`, `reactive forms` | Formulare | [references/op-forms.md](references/op-forms.md) |
| `inject`, `DI`, `service`, `provider`, `InjectionToken` | Dependency Injection | [references/op-di.md](references/op-di.md) |
| `ARIA`, `accessibility`, `a11y` | Accessibility | [references/op-accessibility.md](references/op-accessibility.md) |
| `route`, `router`, `guard`, `lazy loading`, `SSR` | Routing | [references/op-routing.md](references/op-routing.md) |
| `style`, `CSS`, `Tailwind`, `animation` | Styling & Animations | [references/op-styling.md](references/op-styling.md) |
| `test`, `Vitest`, `TestBed`, `Cypress`, `E2E` | Testing | [references/op-testing.md](references/op-testing.md) |
| `CLI`, `ng generate`, `migration`, `MCP` | Tooling | [references/op-tooling.md](references/op-tooling.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Opt-out

`no-angular-developer` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
