---
name: angular-developer-extension
description: >
  Portable layout und Konventionen für Angular-Apps (src/app-Struktur, Feature-Facades, Smart vs Dumb).
  Integrierte Test-Policy und Signal-Architektur für Feature Services.
  Stacks auf angular-developer; ersetzt nicht den Vendor-Baseline für Language-Level-Guidance.
  Trigger: angular-developer-extension, angular architecture, project structure after angular-developer,
  feature facade, smart vs dumb, ng generate path, extension architecture skill,
  pages folder, page component, PageComponent, route entry point, lazy loadComponent, feature pages,
  showcase feature, demo feature, section component,
  unit test, integration test, TestBed, component.spec.ts, HttpTestingController, Router test,
  Signal test, Harness, flaky test, ng test,
  signal architecture, feature facade state, BehaviorSubject migration, RxJS boundary,
  toSignal, toObservable, facade readonly API,
  @Input migration, @Output migration, ngIf migration, ngFor migration, ngSwitch migration.
---

## Skill-Verbund

Dieser Skill wird immer zusammen mit `angular-developer` geladen. Ladereihenfolge:
1. `angular-developer` (Language-Level-Guidance — Signals, DI, Forms, Routing, CLI)
2. **Dieser Skill** (Projektstruktur, Test-Policy, Signal-Architektur, Migrationen)

**LAC-Override:** Projektspezifische `AGENTS.md` überschreibt Vendor-Skill-Regeln (z. B. abweichende Ordnerstruktur, UI-Lib-Vorgaben).

## Voraussetzungen

- Projektverzeichnis bekannt (Wurzelpfad des Code-Repositories)
- Repository-Agentenübersicht (`AGENTS.md`) — falls vorhanden, lesen
- Immer zuerst `angular-developer` laden (Language-Level-Guidance).
- Version prüfen: `package.json` → `@angular/core` vor API-Empfehlungen.

## Repo-Layout

| Pfad | Inhalt |
|------|--------|
| `src/app/components/[name]/` | Shared/Dumb — 4 Dateien: `.ts .html .scss .spec.ts` |
| `src/app/features/[feature]/pages/[route-name]-page/` | Routete Page-Komponente (`*PageComponent`) — Lazy Route-Einstiegspunkt |
| `src/app/features/[feature]/components/[name]/` | Nicht-routete Feature-Bausteine (Sections, Dialoge) |
| `src/app/features/[feature]/` | Feature-Root: Facade, `models/`, `[f].constants.ts`, opt. `services/`, `rules/`, `pipes/` |
| `src/app/models/` | Cross-Feature Models |
| `src/app/services/` | Global Singleton Services |

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Projektstruktur, Feature anlegen, Smart/Dumb, Naming, Tooling, Extraktion | Projektstruktur & Konventionen | [references/op-layout.md](references/op-layout.md) |
| unit test, integration test, TestBed, spec.ts, flaky test, ng test | Test-Policy | [references/op-testing.md](references/op-testing.md) |
| signal architecture, feature facade state, BehaviorSubject migration, RxJS boundary | Signal-Architektur | [references/op-signal-architecture.md](references/op-signal-architecture.md) |
| @Input migration, @Output migration, ngIf, ngFor, ngSwitch, legacy → modern | Migration | [references/op-migration.md](references/op-migration.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Datei |
|-------|-------|
| Test-Policy (vollständig) | [references/testing.md](references/testing.md) |
| Signal-Architektur (vollständig) | [references/signal-architecture.md](references/signal-architecture.md) |
| Migration Snippets Index | [references/migration-examples.md](references/migration-examples.md) |
| Component API (delegiert) | [references/component-api.md](references/component-api.md) |
| DI (delegiert) | [references/dependency-injection.md](references/dependency-injection.md) |
| Routing (delegiert) | [references/routing.md](references/routing.md) |
| Forms (delegiert) | [references/forms.md](references/forms.md) |
| Accessibility (delegiert) | [references/accessibility.md](references/accessibility.md) |
| Allgemeiner Fallback | [references/angular-general-fallback.md](references/angular-general-fallback.md) |

## Opt-out

`no angular-developer-extension` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
