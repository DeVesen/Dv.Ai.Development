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
| `{code-root}` | Wurzelpfad des Code-Repositories |
| `{agent-index}` | Repository-Agentenübersicht |

# Angular Developer Extension (layout & conventions)

Spezialisiert **Layout, Konventionen, Test-Policy und Signal-Architektur** auf [Angular Developer](../angular-developer/SKILL.md). Ersetzt **nicht** den Vendor-Baseline für Language-Level-Guidance.

## Guidance-Priorität

1. Existierende Implementierungsmuster im Zielprojekt.
2. Projektregeln — `{agent-index}`, projekt-lokale Skills.
3. [Angular Developer](../angular-developer/SKILL.md) (Google upstream) — Components, Signals, Forms, DI, Routing, Tests, CLI.
4. **Dieses Skill** — Ordnerstruktur, Feature-Facade-Regeln, Smart/Dumb, Naming, Test-Policy ([references/testing.md](references/testing.md)), Signal-Architektur ([references/signal-architecture.md](references/signal-architecture.md)).
5. [angular-general-fallback.md](references/angular-general-fallback.md) — nur Pointer.
6. Offizielle Angular-Doku.

**Projekt-Overrides:** Repo-Regeln (Tailwind-Verbot, Pflicht-UI-Lib) ranken über Vendor-Skill.

## Vendor Baseline (nicht hier duplizieren)

Für Language-Level → [angular-developer](../angular-developer/SKILL.md) + References dort. Extension-eigene Reference-Stubs:

| Datei | Inhalt |
|-------|--------|
| [testing.md](references/testing.md) | Integrierter Projekt-Test-Policy |
| [signal-architecture.md](references/signal-architecture.md) | Feature-Service Signal-Architektur |
| [migration-examples.md](references/migration-examples.md) | Legacy → Modern Snippets |
| [component-api.md](references/component-api.md) u. a. | Pointer zu angular-developer |

## Projektstruktur

```
src/app/
  components/               ← Shared/Dumb (standalone)
    [component-name]/       ← 4 Dateien: .ts .html .scss .spec.ts
  features/                 ← Features (standalone)
    [feature-name]/
      [feature-name].service.ts    ← Primäre Feature-Facade
      [feature-name].service.spec.ts
      components/[component-name]/ ← 4 Dateien je Komponente
      models/*.model.ts
      services/api/*-api.service.ts      ← optional
      services/state/*-state.service.ts  ← optional
      rules/*.rules.ts                   ← optional, pure functions
      pipes/                             ← optional
      styles/                            ← optional
  models/                   ← Cross-Feature Models
  services/                 ← Global Singleton Services
```

## Component-Typen

### Shared / Dumb
- Wiederverwendbar über Features hinweg; **kein** Service-Inject.
- Kommunikation **nur** via `input()`/`output()`.
- `standalone: true`; in `src/app/components/` — erst nach Nutzung durch **≥2 Features**.

### Smart
- ≥1 injizierter Service; nur im Feature-Kontext.
- `standalone: true`; unter `features/[feature]/components/[name]/`.

## Features

**Facade-Naming:** Ordner kebab-case (z. B. `article-overview`) → Service PascalCase + `Service` (`ArticleOverviewService`). Abweichung nur mit dokumentiertem Grund.

**Regeln:**
- API-Calls **durch Facade** (Smart-Components rufen `*-api.service.ts` nicht direkt).
- State via Facade / readonly API — [signal-architecture.md](references/signal-architecture.md).
- Alle Feature-lokalen Komponenten unter `components/[name]/` (4 Dateien). Feature-Root enthält nur Facade, `models/`, optionale `services/`, `rules/`, `pipes/`, `styles/`.
- CLI: `ng generate component [feature]/components/[name]` aus `src/app/features/`.

**Cross-Feature-Kommunikation:** Global Service in `src/app/services/` (`providedIn: 'root'`) oder direktes Inject von Feature-A-Service in Feature-B-Komponente (Fall-zu-Fall-Entscheidung).

## Feature Checklist (neue Feature)

1. Erste Komponente: Name + Ort unter `components/[name]/` (Ordner anlegen).
2. `models/`-Datei anlegen.
3. Facade `[feature-name].service.ts` anlegen; `services/api`, `state`, `rules`, `pipes`, `styles` wenn Root unübersichtlich.
4. Route vorhanden? → **Lazy Loading** (default) + Initial-Data (Component/Service on activate, `ResolveFn`, `CanActivate`).
5. Feature-Service-Scope: `providedIn: 'root'` (Singleton) oder Route-`providers: []` (State-Reset bei Navigation).

## Models

- Feature-spezifisch: `src/app/features/[feature]/models/` — ein File pro Model.
- Cross-Feature: `src/app/models/` (z. B. `PagedResult<T>`).

## Naming

| Element | Convention | Beispiel |
|---------|-----------|---------|
| Dateinamen | kebab-case | `article-overview.component.ts` |
| Klassen | PascalCase | `ArticleOverviewComponent` |
| Feature Services | Feature-Prefix | `ArticleOverviewService` |
| Global Services | Deskriptiv ohne Prefix | `AuthService` |
| Datei-Suffix | immer | `.component.ts`, `.service.ts` |

## Komponenten-Größe & Extraktion

HTML > 80 Zeilen → Aufteilung prüfen. Muster die Extraktion rechtfertigen:
1. Wiederholungen/Listen → Container + Element
2. Klare UI-Abschnitte (Header, Sidebar, Footer) → je eigene Komponente
3. Modals/Dialogs → eigene Komponente
4. Formular-Abschnitte → je eigene Komponente
5. Cards → eigene Komponente
6. `@if`-Block THEN/ELSE wenn **>10 Zeilen** → eigene Komponente
7. `@for`-Body wenn **>10 Zeilen** → eigene Komponente

## Testing

- Jede Komponente: `*.component.spec.ts` (4-Datei-Regel).
- Test-Policy: [references/testing.md](references/testing.md).
- Mechanik (TestBed, HTTP, Harnesses): [Angular Developer](../angular-developer/SKILL.md).

## Tooling

- Scaffold via `ng generate`, dann Dateien zu Feature-/Components-Struktur verschieben.
- Nach substantiellen Edits: `ng build` ausführen und Compile-Fehler beheben.

## Signal-Architektur

→ [references/signal-architecture.md](references/signal-architecture.md) (State-Ownership, Readonly API, RxJS-Boundary).
