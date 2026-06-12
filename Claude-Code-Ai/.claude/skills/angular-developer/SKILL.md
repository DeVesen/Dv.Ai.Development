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
- `angular-developer-extension` (immer — Projektstruktur, Test-Policy, Signal-Architektur)
- `angular-new-app` + `angular-new-app-extension` (nur bei neuem Projekt / `ng new`)
- `angular-cache-busting` (nur bei Cache-Konfiguration / Browser-Cache-Problemen nach Deploy)

**LAC-Override:** Projektspezifische `AGENTS.md` im Ziel-Repository (z. B. Tailwind-Verbot, Pflicht-UI-Lib, Styleguide) überschreiben diese Skill-Regeln dort, wo Vendor-Skills anderes nahelegen.

**Opt-out:** `ohne die Angular Skills` → dieser Skill-Verbund wird nicht geladen.

## Voraussetzungen

1. **Angular-Version** vor Antwort prüfen — Best Practices variieren stark zwischen Majors.
2. Angular Style Guide + Best Practices für Wartbarkeit/Performance einhalten.
3. Nach Code-Generierung Build via **dev-angular-mcp** ausführen — **kein** direkter Shell-Aufruf `ng build`. Kanon: [references/op-tooling.md](references/op-tooling.md).
4. `scaffold_angular_component` / `scaffold_angular_service` via **dev-angular-mcp** bevorzugen (Token-effizient, Conventions eingebaut) — siehe [references/op-tooling.md](references/op-tooling.md).

## Build/Test via MCP (Pflicht)

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` (dev-angular-mcp) |
| Shell: `ng test` | `test_angular_project` (dev-angular-mcp) |
| build-log-filter für diese Kommandos | MCPs filtern intern — `errors[]` direkt auswerten |

**Hard Stop — MCP nicht erreichbar:** `BLOCKER: dev-angular-mcp nicht erreichbar`
- Kein stiller Fallback auf Shell
- Nutzer informieren; erst nach **expliziter Freigabe**: Shell-Fallback

Referenz: `docs/mcp/dev-angular.md`

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
