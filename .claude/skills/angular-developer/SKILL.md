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
---

## Skill-Verbund

Bei Angular-Arbeit immer zusätzlich laden:
- **angular-developer-extension** (immer — Projektstruktur, Test-Policy, Signal-Architektur, Migration)
- **angular-new-app** (nur bei neuem Projekt / `ng new` / Greenfield-Scaffolding)
- **angular-new-app-extension** (nur zusammen mit angular-new-app, für Decision Gate + Plan-Orchestrierung)
- **angular-cache-busting** (nur bei Cache-Konfiguration, `outputHashing`, stale `index.html`)

> **Projektspezifischer Override:** Regeln aus `./AGENTS.md` (z. B. Tailwind-Verbot, Styleguide in `./.skills`) überschreiben diesen Skill dort, wo sie anderes nahelegen.

> **Opt-out:** `ohne die Angular Skills` → alle Angular-Pflicht-Skills nicht laden.

---

## Voraussetzungen

1. **Angular-Version** vor Antwort prüfen — Best Practices variieren stark zwischen Majors.
2. Angular Style Guide + Best Practices für Wartbarkeit/Performance einhalten.
3. Nach Code-Generierung Build via **dev-angular-mcp** ausführen (siehe Build/Test-Sektion unten).
4. `scaffold_angular_component` / `scaffold_angular_service` via **dev-angular-mcp** bevorzugen (Token-effizient, Conventions eingebaut) — siehe [references/op-tooling.md](references/op-tooling.md).

## Build/Test via MCP (Pflicht)

| Aktion | MCP-Tool | VERBOTEN |
|--------|----------|---------|
| Build | `build_angular_project` (dev-angular-mcp) | Shell `ng build` |
| Test | `test_angular_project` (dev-angular-mcp) | Shell `ng test` |

`build_angular_project` und `test_angular_project` filtern Konsolenausgabe intern — der LLM erhält ausschließlich `errors[]`, `warnings[]`, `summary`. Kein build-log-filter für diese Aufrufe.

**Hard Stop wenn MCP nicht erreichbar:** `BLOCKER: dev-angular-mcp nicht erreichbar` — kein Shell-Fallback ohne explizite Nutzerfreigabe.

Referenz: `docs/mcp-dev-angular.md` (vollständige Tool-Dokumentation)

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

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
