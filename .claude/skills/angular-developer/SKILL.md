---
name: angular-developer
description: >
  Generates Angular code and provides architectural guidance. Trigger when creating
  projects, components, or services, or for best practices on reactivity (signals,
  linkedSignal, resource), forms, dependency injection, routing, SSR, accessibility
  (ARIA), animations, styling (component styles, Tailwind CSS), testing, or CLI tooling.
  Also covers: project structure (feature facades, smart/dumb, page components),
  test policy (unit vs integration), signal architecture (state ownership, RxJS boundaries),
  and migrations (legacy @Input/@Output/ngIf/ngFor/ngSwitch → modern syntax).
license: MIT
metadata:
  author: Copyright 2026 Google LLC
  version: '2.0'
---

## Voraussetzungen

1. **Angular-Version** vor Antwort prüfen — Best Practices variieren stark zwischen Majors.
2. Angular Style Guide + Best Practices für Wartbarkeit/Performance einhalten.
3. Build via **dev-mcp** ausführen — **kein** direkter Shell-Aufruf `ng build`.
4. `scaffold_angular_component` / `scaffold_angular_service` via **dev-mcp** bevorzugen.

## Build/Test via MCP (Pflicht)

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` (dev-mcp) |
| Shell: `ng test` | `test_angular_project` (dev-mcp) |

**Hard Stop — MCP nicht erreichbar:** `BLOCKER: dev-mcp nicht erreichbar`  
Kein stiller Fallback auf Shell — Nutzer informieren; erst nach expliziter Freigabe Shell-Fallback.

## Skill-Verbund

- `angular-new-app` + `angular-new-app-extension` (nur bei `ng new` / neuem Projekt)
- `angular-cache-busting` (nur bei Cache-Konfiguration nach Deploy)

**LAC-Override:** Projektspezifische `AGENTS.md` überschreibt diese Skill-Regeln (Tailwind-Verbot, Pflicht-UI-Lib, Styleguide).

**Opt-out:** `ohne angular-developer` → dieser Skill wird nicht geladen.

## Operationen

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

### Language & API

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
| `test`, `Vitest`, `TestBed`, `Cypress`, `E2E`, `flaky test` | Testing | [references/op-testing.md](references/op-testing.md) |
| `CLI`, `ng generate`, `migration`, `MCP` | Tooling | [references/op-tooling.md](references/op-tooling.md) |

### Architektur & Konventionen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Projektstruktur, Feature anlegen, Smart/Dumb, Page-Komponente, Naming | Projektstruktur | [references/op-layout.md](references/op-layout.md) |
| signal architecture, feature facade state, BehaviorSubject migration, RxJS boundary | Signal-Architektur | [references/op-signal-architecture.md](references/op-signal-architecture.md) |
| `@Input` migration, `@Output` migration, `ngIf`, `ngFor`, `ngSwitch`, legacy → modern | Migration | [references/op-migration.md](references/op-migration.md) |

## Opt-out

`no-angular-developer` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
