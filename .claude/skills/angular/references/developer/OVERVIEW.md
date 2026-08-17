
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

- `angular-new-app` (nur bei `ng new` / neuem Projekt)
- `angular-material` (bei Angular Material UI / mat-form-field)

**LAC-Override:** Projektspezifische `AGENTS.md` überschreibt diese Skill-Regeln (Tailwind-Verbot, Pflicht-UI-Lib, Styleguide).

**Opt-out:** `ohne angular-developer` → dieser Skill wird nicht geladen.

## Operationen

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

### Language & API

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `ng new`, neues Projekt | Projekt erstellen | [references/op-new-project.md](op-new-project.md) |
| `component`, `input`, `output`, `host binding` | Komponenten | [references/op-components.md](op-components.md) |
| `signal`, `computed`, `linkedSignal`, `resource`, `effect` | Reaktivität / State | [references/op-reactivity.md](op-reactivity.md) |
| `form`, `Formular`, `signal forms`, `reactive forms` | Formulare | [references/op-forms.md](op-forms.md) |
| `inject`, `DI`, `service`, `provider`, `InjectionToken` | Dependency Injection | [references/op-di.md](op-di.md) |
| `ARIA`, `accessibility`, `a11y` | Accessibility | [references/op-accessibility.md](op-accessibility.md) |
| `route`, `router`, `guard`, `lazy loading`, `SSR` | Routing | [references/op-routing.md](op-routing.md) |
| `style`, `CSS`, `Tailwind`, `animation` | Styling & Animations | [references/op-styling.md](op-styling.md) |
| `test`, `Vitest`, `TestBed`, `Cypress`, `E2E`, `flaky test` | Testing | [references/op-testing.md](op-testing.md) |
| `CLI`, `ng generate`, `migration`, `MCP` | Tooling | [references/op-tooling.md](op-tooling.md) |

### Architektur & Konventionen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Projektstruktur, Feature-First, Feature anlegen, Import-Grenzen, `core`/`shared`, Path-Alias, Barrel, Smart/Dumb, Page-Komponente, Naming, Datei-Suffix | Projektstruktur | [op-layout.md](op-layout.md) |
| signal architecture, feature facade state, BehaviorSubject migration, RxJS boundary | Signal-Architektur | [references/op-signal-architecture.md](op-signal-architecture.md) |
| `@Input` migration, `@Output` migration, `ngIf`, `ngFor`, `ngSwitch`, legacy → modern | Migration | [references/op-migration.md](op-migration.md) |

## Opt-out

`no-angular-developer` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
