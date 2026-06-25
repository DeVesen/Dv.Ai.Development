# Operation: Projektstruktur & Konventionen

Steuert Ordnerstruktur, Component-Typen, Feature-Facade-Regeln, Models, Naming, Extraktion und Tooling für Angular-Projekte.

---

## Guidance-Priorität

1. Existierende Implementierungsmuster im Zielprojekt.
2. Projektregeln — `AGENTS.md`, projekt-lokale Skills.
3. Language-Level-Guidance — Components, Signals, Forms, DI, Routing, CLI: [../SKILL.md](../SKILL.md).
4. **Dieses Dokument** — Ordnerstruktur, Feature-Facade-Regeln, Smart/Dumb, Naming, Test-Policy ([testing.md](testing.md)), Signal-Architektur ([signal-architecture.md](signal-architecture.md)).
5. Offizielle Angular-Doku.

**Projekt-Overrides:** Repo-Regeln (Tailwind-Verbot, Pflicht-UI-Lib, abweichende Ordnernamen wie `shared/ui`) ranken über Vendor-Skill. `pages/` ist eine empfohlene Konvention, kein Pflichtordner.

---

## Projektstruktur

```
src/app/
  components/               ← Shared/Dumb (standalone)
    [component-name]/       ← 4 Dateien: .ts .html .scss .spec.ts
  features/                 ← Features (standalone)
    [feature-name]/
      [feature-name].service.ts        ← Primäre Feature-Facade (optional bei Showcase)
      [feature-name].service.spec.ts
      pages/                           ← Routete Einstiegspunkte (empfohlen)
        [route-name]-page/             ← 4 Dateien: .ts .html .scss .spec.ts
      components/[component-name]/     ← Nicht-routete Bausteine; 4 Dateien je Komponente
      models/*.model.ts
      [feature-name].constants.ts      ← optional, Feature-lokale Konstanten
      [feature-name]-section.scss      ← optional, gemeinsames SCSS-Partial
      services/api/*-api.service.ts    ← optional
      services/state/*-state.service.ts ← optional
      rules/*.rules.ts                 ← optional, pure functions
      pipes/                           ← optional
      styles/                          ← optional
  models/                   ← Cross-Feature Models
  services/                 ← Global Singleton Services
```

> `pages/` und `components/` sind Geschwister unter dem Feature-Root — nicht `components/pages/`.

---

## Component-Typen

### Shared / Dumb
- Wiederverwendbar über Features hinweg; **kein** Service-Inject.
- Kommunikation **nur** via `input()`/`output()`.
- `standalone: true`; in `src/app/components/` — erst nach Nutzung durch **≥2 Features**.

### Smart
- ≥1 injizierter Service; nur im Feature-Kontext.
- `standalone: true`; unter `features/[feature]/components/[name]/`.

### Page
- Route-Einstiegspunkt; entspricht einer **Smart-Shell** (Navigation, Layout, Orchestrierung).
- Kein Ersatz für die Facade — delegiert Logik an `[feature].service.ts`.
- Ordner: `features/[feature]/pages/[route-name]-page/`; Klasse: `*PageComponent`; Selector: `app-[feature]-page`.
- Lazy-Import in `app.routes.ts` (oder `[feature]-routes.ts`):
  ```ts
  loadComponent: () => import('./features/[feature]/pages/[route-name]-page/[route-name]-page.component')
    .then(m => m.[RouteName]PageComponent)
  ```
- Bindet nicht-routete Bausteine aus `../components/` ein; kein direkter API-Call (durch Facade).

### `components/` unter Feature (nicht-routete Bausteine)
- Zweck: Sections, Sub-Views, Dialoge — von der Page oder anderen Smart-Komponenten eingebunden.
- Keine Route auf `components/`-Einträge.
- Import-Richtung: `Page → ../components/...`; Sections → Feature-Root-Shared (`../../[feature].constants`, `@use '../../[feature]-section'`).

---

## Features

**Facade-Naming:** Ordner kebab-case (z. B. `article-overview`) → Service PascalCase + `Service` (`ArticleOverviewService`). Abweichung nur mit dokumentiertem Grund.

**Regeln:**
- API-Calls **durch Facade** (Smart-Components rufen `*-api.service.ts` nicht direkt).
- State via Facade / readonly API — [signal-architecture.md](signal-architecture.md).
- Alle Feature-lokalen Komponenten unter `pages/[route-name]-page/` (routet) oder `components/[name]/` (nicht routet); jeweils 4 Dateien.
- Feature-Root erlaubte Artefakte ohne Service: `[feature].constants.ts`, `[feature]-section.scss`, `models/*.model.ts`. Keine `.component.ts` am Root.
- CLI:
  - Page: `ng generate component features/[feature]/pages/[name]-page` (aus `src/app/`)
  - Component: `ng generate component features/[feature]/components/[name]` (aus `src/app/`)

**Cross-Feature-Kommunikation:** Global Service in `src/app/services/` (`providedIn: 'root'`) oder direktes Inject von Feature-A-Service in Feature-B-Komponente (Fall-zu-Fall-Entscheidung).

---

## Feature Checklist (neue Feature)

1. `models/`-Datei anlegen.
2. Facade `[feature-name].service.ts` anlegen (entfällt beim Showcase-Feature).
3. Route vorhanden? → **Page-Komponente** unter `pages/[route-name]-page/` anlegen; Lazy `loadComponent` in `app.routes.ts` eintragen.
4. Nicht-routete UI-Bausteine unter `components/[name]/` (Sections, Dialoge).
5. `services/api`, `state`, `rules`, `pipes`, `styles` nur wenn Feature-Root unübersichtlich wird.
6. Feature-Service-Scope: `providedIn: 'root'` (Singleton) oder Route-`providers: []` (State-Reset bei Navigation).

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

## Sonderfall: Showcase / Demo-Feature

Ein Feature ohne Backend-API oder State-Facade (z. B. UI-Komponentengalerie, Style-Guide-Demo):

- Keine `[feature].service.ts` nötig.
- Struktur: eine Page (`pages/showcase-page/`) + viele kleine Demo-Sections unter `components/[widget]-section/`.
- Navigation innerhalb der Page per Fragment-Link (`routerLink="." [fragment]="..."`) statt eigener Routen.
- Extraktionsregel: HTML-Section > 30 Zeilen → eigene `*-section`-Komponente unter `components/[widget]-section/`.

---

## Tooling

- Scaffold via `ng generate`, dann Dateien zu Feature-/Components-Struktur verschieben.
- Nach substantiellen Edits: `build_angular_project` via dev-mcp ausführen und Compile-Fehler beheben.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*
