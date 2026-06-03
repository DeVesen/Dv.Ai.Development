# Operation: Projektstruktur & Konventionen

Steuert Ordnerstruktur, Component-Typen, Feature-Facade-Regeln, Models, Naming, Extraktion und Tooling für Angular-Projekte.

**Auch laden:** [../../angular-developer/SKILL.md](../../angular-developer/SKILL.md) für Language-Level-Guidance (Components, DI, Routing, CLI).

---

## Guidance-Priorität

1. Existierende Implementierungsmuster im Zielprojekt.
2. Projektregeln — `{agent-index}`, projekt-lokale Skills.
3. [Angular Developer](../../angular-developer/SKILL.md) — Components, Signals, Forms, DI, Routing, Tests, CLI.
4. **Dieses Skill** — Ordnerstruktur, Feature-Facade-Regeln, Smart/Dumb, Naming, Test-Policy ([testing.md](testing.md)), Signal-Architektur ([signal-architecture.md](signal-architecture.md)).
5. [angular-general-fallback.md](angular-general-fallback.md) — nur Pointer.
6. Offizielle Angular-Doku.

**Projekt-Overrides:** Repo-Regeln (Tailwind-Verbot, Pflicht-UI-Lib) ranken über Vendor-Skill.

---

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

---

## Component-Typen

### Shared / Dumb
- Wiederverwendbar über Features hinweg; **kein** Service-Inject.
- Kommunikation **nur** via `input()`/`output()`.
- `standalone: true`; in `src/app/components/` — erst nach Nutzung durch **≥2 Features**.

### Smart
- ≥1 injizierter Service; nur im Feature-Kontext.
- `standalone: true`; unter `features/[feature]/components/[name]/`.

---

## Features

**Facade-Naming:** Ordner kebab-case (z. B. `article-overview`) → Service PascalCase + `Service` (`ArticleOverviewService`). Abweichung nur mit dokumentiertem Grund.

**Regeln:**
- API-Calls **durch Facade** (Smart-Components rufen `*-api.service.ts` nicht direkt).
- State via Facade / readonly API — [signal-architecture.md](signal-architecture.md).
- Alle Feature-lokalen Komponenten unter `components/[name]/` (4 Dateien). Feature-Root enthält nur Facade, `models/`, optionale `services/`, `rules/`, `pipes/`, `styles/`.
- CLI: `ng generate component [feature]/components/[name]` aus `src/app/features/`.

**Cross-Feature-Kommunikation:** Global Service in `src/app/services/` (`providedIn: 'root'`) oder direktes Inject von Feature-A-Service in Feature-B-Komponente (Fall-zu-Fall-Entscheidung).

---

## Feature Checklist (neue Feature)

1. Erste Komponente: Name + Ort unter `components/[name]/` (Ordner anlegen).
2. `models/`-Datei anlegen.
3. Facade `[feature-name].service.ts` anlegen; `services/api`, `state`, `rules`, `pipes`, `styles` wenn Root unübersichtlich.
4. Route vorhanden? → **Lazy Loading** (default) + Initial-Data (Component/Service on activate, `ResolveFn`, `CanActivate`).
5. Feature-Service-Scope: `providedIn: 'root'` (Singleton) oder Route-`providers: []` (State-Reset bei Navigation).

---

## Models

- Feature-spezifisch: `src/app/features/[feature]/models/` — ein File pro Model.
- Cross-Feature: `src/app/models/` (z. B. `PagedResult<T>`).

---

## Naming

| Element | Convention | Beispiel |
|---------|-----------|---------|
| Dateinamen | kebab-case | `article-overview.component.ts` |
| Klassen | PascalCase | `ArticleOverviewComponent` |
| Feature Services | Feature-Prefix | `ArticleOverviewService` |
| Global Services | Deskriptiv ohne Prefix | `AuthService` |
| Datei-Suffix | immer | `.component.ts`, `.service.ts` |

---

## Komponenten-Größe & Extraktion

HTML > 80 Zeilen → Aufteilung prüfen. Muster die Extraktion rechtfertigen:
1. Wiederholungen/Listen → Container + Element
2. Klare UI-Abschnitte (Header, Sidebar, Footer) → je eigene Komponente
3. Modals/Dialogs → eigene Komponente
4. Formular-Abschnitte → je eigene Komponente
5. Cards → eigene Komponente
6. `@if`-Block THEN/ELSE wenn **>10 Zeilen** → eigene Komponente
7. `@for`-Body wenn **>10 Zeilen** → eigene Komponente

---

## Tooling

- Scaffold via `ng generate`, dann Dateien zu Feature-/Components-Struktur verschieben.
- Nach substantiellen Edits: `ng build` ausführen und Compile-Fehler beheben.
