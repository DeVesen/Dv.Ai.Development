# Feature-First Layout & Konventionen

Ordnerstruktur, Component-Typen, Feature-Facade-Regeln, Import-Grenzen, Naming, Extraktion, Tooling.

---

## Guidance-Priorität

1. Existierende Implementierungsmuster im Zielprojekt.
2. Projektregeln — `AGENTS.md`, projekt-lokale Skills.
3. Language-Level-Guidance — Components, Signals, Forms, DI, Routing, CLI: [../../SKILL.md](../../SKILL.md).
4. **Dieses Dokument** — Struktur, Import-Grenzen, Facade-Regeln, Smart/Dumb, Naming.
5. Offizieller Angular Style Guide (angular.dev/style-guide).

**Projekt-Overrides:** Repo-Regeln (Tailwind-Verbot, Pflicht-UI-Lib, abweichende Ordnernamen wie `shared/ui`) ranken über Vendor-Skill. `pages/` ist eine empfohlene Konvention, kein Pflichtordner.

---

## Projektstruktur

```
src/app/
  components/               ← Shared/Dumb (standalone) — Rolle: "shared/ui"
    [component-name]/       ← 4 Dateien: .ts .html .scss .spec.ts
  features/                 ← Features (standalone)
    [feature-name]/
      [feature-name].routes.ts         ← Feature-Routen (sobald >1 Route)
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
  services/                 ← Global Singleton Services — Rolle: "core"
```

> `pages/` und `components/` sind Geschwister unter dem Feature-Root — nicht `components/pages/`.

**Rollen-Mapping zur verbreiteten `core/`-`shared/`-Konvention:** dieses Layout nutzt `src/app/services/` in der Rolle von `core/` und `src/app/components/` in der Rolle von `shared/ui`. Fremde Artikel/Skills, die `core/` bzw. `shared/` sagen, meinen diese beiden Ordner. Nicht zusätzlich anlegen — sonst existieren zwei Ablagen für denselben Zweck.

---

## Import-Grenzen (harte Regel)

Erlaubte Richtung — jeder Pfeil einseitig:

```
features/[a]  →  components/ , models/ , services/
features/[a]  ✗  features/[b]
components/   ✗  features/*
services/     ✗  features/*
```

**Begründung — messbar:** Features werden lazy geladen. Ein Import über die Grenze zieht das fremde Chunk in den eigenen Bundle; der Lazy-Split ist damit aufgehoben, unabhängig davon wie zustandslos das Importierte ist. „Reine Funktion, kein State" ist eine Aussage über Laufzeitverhalten und beantwortet die Frage nach dem Modul-Graph nicht.

**Begründung — strukturell:** ein Feature muss löschbar sein, ohne dass ein anderes bricht. Sobald `features/a` aus `features/b` importiert, sind beide ein Feature — nur mit falschen Ordnernamen.

**Cross-Feature-Bedarf auflösen** — in dieser Reihenfolge:
1. Gemeinsamer State/Logik → Global Service nach `src/app/services/` (`providedIn: 'root'`).
2. Gemeinsames Model → `src/app/models/`.
3. Gemeinsame UI → `src/app/components/` (erst ab Nutzung durch **≥2 Features**).
4. Reine Navigation → Route-Link statt Import.

Direktes Inject eines Feature-A-Service in eine Feature-B-Komponente ist eine dokumentationspflichtige Ausnahme, kein Normalfall.

**Enforcement:** Prosa-Regeln zerfallen. Sobald das Projekt >3 Features hat, Grenze maschinell prüfen — `eslint-plugin-boundaries` (Element-Typen `feature`/`shared`/`core` + `allow`-Matrix) oder bei Nx-Repos `@nx/enforce-module-boundaries` mit Tags. Ohne Linter-Regel gilt die Grenze als unbelegt.

### Ausreden

| Ausrede | Realität |
|---------|----------|
| „Nutzt nur den vorhandenen Import, keine neue Kopplungskante" | Die Kante existiert schon; du erhöhst ihre Nutzung. Jede weitere Stelle macht das spätere Auflösen teurer — genau die Kosten, mit denen du das Verschieben gerade ablehnst. |
| „Reine Funktion, kein State — der Lead hat abgesegnet" | Zustandslosigkeit betrifft die Laufzeit. Der Bundle zieht das fremde Chunk trotzdem. Eine Freigabe ändert den Modul-Graph nicht. |
| „Struktur fasst man 30 Minuten vor der Demo nicht an" | Dann fasst man auch das Feature nicht an, das darauf aufbaut. Neue Nutzung der Verletzung ist keine Nicht-Änderung. |
| „Entscheidung ist getroffen, ich habe keinen Befund der sie kippt" | Der Befund ist der Bundle-Split. Der lag vor der Entscheidung vor und wurde nicht geprüft. |
| „Verschieben kostet drei Aufrufstellen plus Specs" | Verschieben einer Funktion ohne Signaturänderung ist mechanisch. Die Kosten steigen mit jeder Zeile, die du stattdessen ergänzt. |
| „Ich mache es sichtbar und dokumentiere es als Ticket" | Ein Ticket ist keine Grenze. Ohne Linter-Regel wird es zur Konvention durch Gewohnheit. |

### Red Flags — Stopp

- Neue Zeile nutzt einen bestehenden `features/[anderes]`-Import
- Begründung stützt sich auf Zustandslosigkeit oder Reinheit statt auf den Modul-Graph
- Frist oder Freigabe steht im Zentrum der Begründung
- „Provisorium", „nach der Demo", „eigenes Ticket"

**Alle bedeuten:** verschieben, nicht ergänzen. Ziel nach der Reihenfolge unter *Cross-Feature-Bedarf auflösen*.

---

## Path-Aliase

Tiefe relative Pfade (`../../../components/...`) verstecken Grenzverletzungen. In `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@app/*":        ["app/*"],
      "@features/*":   ["app/features/*"],
      "@components/*": ["app/components/*"],
      "@services/*":   ["app/services/*"],
      "@models/*":     ["app/models/*"]
    }
  }
}
```

Regel: **Aliase über Feature-Grenzen hinweg, relative Pfade innerhalb eines Features.** Ein `@features/...`-Import in einer Feature-Datei ist damit sofort als Grenzverletzung sichtbar.

**Barrel-Dateien (`index.ts`):** nur an Feature- und Shared-Grenzen, nie innerhalb eines Features. Interne Barrels erzeugen Zyklen und blockieren Tree-Shaking.

---

## Routing pro Feature

Ab der zweiten Route eines Features: eigene `[feature].routes.ts` statt Einträge in `app.routes.ts`.

```ts
// features/article-overview/article-overview.routes.ts
import { Routes } from '@angular/router';

export const ARTICLE_OVERVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/list-page/list-page').then(m => m.ListPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detail-page/detail-page').then(m => m.DetailPage),
  },
];
```

```ts
// app.routes.ts
{
  path: 'articles',
  loadChildren: () => import('@features/article-overview/article-overview.routes')
    .then(m => m.ARTICLE_OVERVIEW_ROUTES),
}
```

`app.routes.ts` kennt damit nur Feature-Einstiegspunkte, keine internen Pfade. Bei genau einer Route bleibt `loadComponent` direkt in `app.routes.ts` — kein Routes-File auf Vorrat.

**Gilt auch ohne Präzedenzfall im Repo.** Guidance-Priorität 1 („existierende Implementierungsmuster") greift hier *nicht*: die Regel ist additiv — sie ändert nichts an bestehenden Features und erzwingt keinen repo-weiten Umbau. „Kein anderes Feature hat ein Routes-File" ist deshalb kein Gegenargument, sondern der Normalzustand beim Einführen der Konvention. Bestandsfeatures bleiben unangetastet, bis sie selbst eine zweite Route bekommen.

Priorität 1 sticht diesen Abschnitt nur, wenn das Projekt eine *gegenteilige* Regel dokumentiert hat — etwa eine `AGENTS.md`, die zentrale Routen vorschreibt. Das Fehlen eines Musters ist kein Muster.

Details → [define-routes.md](define-routes.md), [loading-strategies.md](loading-strategies.md).

---

## Component-Typen

### Shared / Dumb
- Wiederverwendbar über Features hinweg; **kein** Service-Inject.
- Kommunikation **nur** via `input()`/`output()`.
- In `src/app/components/` — erst nach Nutzung durch **≥2 Features**.

### Smart
- ≥1 injizierter Service; nur im Feature-Kontext.
- Unter `features/[feature]/components/[name]/`.

### Page
- Route-Einstiegspunkt; entspricht einer **Smart-Shell** (Navigation, Layout, Orchestrierung).
- Kein Ersatz für die Facade — delegiert Logik an `[feature].service.ts`.
- Ordner: `features/[feature]/pages/[route-name]-page/`; Selector: `app-[feature]-page`.
- Bindet nicht-routete Bausteine aus `../components/` ein; kein direkter API-Call (durch Facade).

### `components/` unter Feature (nicht-routete Bausteine)
- Zweck: Sections, Sub-Views, Dialoge — von der Page oder anderen Smart-Komponenten eingebunden.
- Keine Route auf `components/`-Einträge.
- Import-Richtung: `Page → ../components/...`; Sections → Feature-Root-Shared (`../../[feature].constants`, `@use '../../[feature]-section'`).

> `standalone: true` nicht setzen — ab v19 Default.

---

## Features

**Facade-Naming:** Ordner kebab-case (z. B. `article-overview`) → Service PascalCase + `Service` (`ArticleOverviewService`). Abweichung nur mit dokumentiertem Grund.

**Regeln:**
- API-Calls **durch Facade** (Smart-Components rufen `*-api.service.ts` nicht direkt).
- State via Facade / readonly API — [signal-architecture.md](signal-architecture.md).
- Alle Feature-lokalen Komponenten unter `pages/[route-name]-page/` (routet) oder `components/[name]/` (nicht routet); jeweils 4 Dateien.
- Feature-Root erlaubte Artefakte ohne Service: `[feature].routes.ts`, `[feature].constants.ts`, `[feature]-section.scss`, `models/*.model.ts`. Keine Komponenten-Klasse am Root.

**CLI** (aus `src/app/`):
- Page: `ng generate component features/[feature]/pages/[name]-page`
- Component: `ng generate component features/[feature]/components/[name]`

---

## Feature Checklist (neues Feature)

1. `models/`-Datei anlegen.
2. Facade `[feature-name].service.ts` anlegen (entfällt beim Showcase-Feature).
3. Route vorhanden? → **Page-Komponente** unter `pages/[route-name]-page/`; ab 2 Routen `[feature].routes.ts` + `loadChildren`, sonst `loadComponent` in `app.routes.ts`.
4. Nicht-routete UI-Bausteine unter `components/[name]/` (Sections, Dialoge).
5. `services/api`, `state`, `rules`, `pipes`, `styles` nur wenn Feature-Root unübersichtlich wird.
6. Feature-Service-Scope: `providedIn: 'root'` (Singleton) oder Route-`providers: []` (State-Reset bei Navigation).
7. Import-Grenzen prüfen: kein Import aus `features/[anderes]`.

---

## Models

- Feature-spezifisch: `src/app/features/[feature]/models/` — ein File pro Model.
- Cross-Feature: `src/app/models/` (z. B. `PagedResult<T>`).

---

## Naming (versionsabhängig)

**Angular-Version zuerst prüfen** — `package.json` → `@angular/core`. Der offizielle Style Guide hat das Datei-Suffix mit v20 fallen gelassen.

| Element | `< v20` | `≥ v20` |
|---------|---------|---------|
| Component-Dateien | `article-overview.component.ts/.html/.scss` | `article-overview.ts/.html/.scss` |
| Component-Spec | `article-overview.component.spec.ts` | `article-overview.spec.ts` |
| Service-Datei | `article-overview.service.ts` | `article-overview.service.ts` |
| Page-Datei | `list-page.component.ts` | `list-page.ts` |

Unverändert in beiden Versionen:

| Element | Convention | Beispiel |
|---------|-----------|---------|
| Dateinamen | kebab-case, Wörter mit `-` getrennt | `article-overview.ts` |
| Klassen | PascalCase | `ArticleOverviewComponent` |
| Feature Services | Feature-Prefix | `ArticleOverviewService` |
| Global Services | Deskriptiv ohne Prefix | `AuthService` |
| Spec-Ablage | neben dem Code, nie `tests/`-Sammelordner | `article-overview.spec.ts` |

**Bestandsschutz:** in einem Projekt gilt **ein** Schema. Ein v20-Upgrade löst keine Umbenennung des Bestands aus — neue Dateien folgen dem im Projekt vorherrschenden Schema, bis eine bewusste Sammelmigration beschlossen wird. Zulässige Endzustände sind genau zwei: alles alt oder alles neu. Die Sammelmigration ist ein eigener Commit, der ausschließlich Renames enthält.

**Enforcement statt Prosa.** Unter v20 generiert `ng generate component` ohne Suffix — in einem Bestandsprojekt also gegen das Schema. Die Konvention gehört deshalb in `angular.json`, nicht in eine Team-Absprache:

```jsonc
{
  "schematics": {
    "@schematics/angular:component": { "type": "component" },
    "@schematics/angular:directive": { "type": "directive" }
  }
}
```

Einzelfall ohne Konfiguration: `ng generate component <pfad> --type=component`. Für Projekte auf dem neuen Schema entfällt beides — der v20-Default passt dann bereits.

**Ausreden zum Schema-Wechsel:**

| Ausrede | Realität |
|---------|----------|
| „Gemischtes Naming ist der vorgesehene Übergangszustand" | Im Style Guide nicht belegt. Die einzige Konsistenz-Aussage dort betrifft die *einzelne Datei* („prioritize maintaining consistency within a file"). Ein projektweiter Mischzustand hat keine Quelle. |
| „Der Architekt/Kollege hat es angesagt" | Eine Chat-Nachricht ist kein durchsetzbarer Konventions-Ort. Umsetzung heißt `angular.json` plus Sammelmigration — sonst ist es eine Ausnahme, kein Wechsel. |
| „Die CLI generiert das schon so" | CLI-Defaults gelten leeren Projekten. Im Bestand kostet gemischtes Naming dauerhaft mehr als einmal `type` zu setzen. |
| „Neue Dateien im Zielzustand, Bestand später" | „Später" ist der Mischzustand. Wer den Wechsel will, macht ihn jetzt vollständig oder legt die neue Datei im Bestandsschema an. |

**Wenn du gemischt anlegst, sag es.** Das Artefakt allein ist wertlos, solange nicht dokumentiert ist, ab welchem Stichtag welches Schema gilt — sonst rät die nächste Person.

**Offene Abweichung:** der offizielle Style Guide entfernt ab v20 auch das **Klassen**-Suffix (`ArticleOverview` statt `ArticleOverviewComponent`). Diese Konvention hält am Klassen-Suffix fest, weil `ArticleOverview` in Imports nicht mehr von Model/Service unterscheidbar ist. Projektentscheidung — bei Übernahme des offiziellen Schemas hier ändern.

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

## Anti-Patterns

| Anti-Pattern | Warum | Stattdessen |
|--------------|-------|-------------|
| Top-Level `directives/`, `pipes/`, `guards/` als Sammelordner | Gruppierung nach Dateityp statt Feature; Änderung an einem Feature streut über 5 Ordner | Feature-lokal ablegen; global nur bei Nutzung durch ≥2 Features |
| Alles nach `components/` | Shared-Ordner wächst zum zweiten Feature-Ordner | ≥2-Feature-Regel durchsetzen |
| Service in jedem Feature dupliziert | zwei Wahrheiten für denselben State | ein Global Service in `services/` |
| Barrel je Unterordner | Import-Zyklen, kein Tree-Shaking | Barrel nur an Feature-/Shared-Grenze |
| Feature importiert Feature | Features nicht mehr einzeln löschbar | siehe [Import-Grenzen](#import-grenzen-harte-regel) |

---

## Migration: Layer-First → Feature-First

Ausgangslage: Top-Level `components/`, `services/`, `models/`, `pipes/` mit allem darin.

Reihenfolge — jeder Schritt einzeln baubar und committebar, **kein** Big-Bang:

1. **Feature-Schnitt festlegen** entlang der Routen in `app.routes.ts`. Eine Route-Gruppe = ein Feature-Kandidat. Kein Schnitt entlang technischer Schichten.
2. **Skelett anlegen:** `features/[name]/` je Kandidat, noch leer.
3. **Pro Feature verschieben** — ausschließlich Dateien, die nur dieses Feature nutzt. Verschieben via `git mv` (dev-mcp), damit die History erhalten bleibt. Nach jedem Feature: `build_angular_project`.
4. **Rest bleibt liegen.** Was von ≥2 Features genutzt wird, verbleibt in `components/` / `services/` / `models/` — das ist das Zielbild, kein Restposten.
5. **Path-Aliase einführen**, sobald das erste Feature steht. Danach relative Cross-Feature-Pfade suchen — jeder `../../features/` ist eine Grenzverletzung.
6. **Facade nachziehen:** `[feature].service.ts` anlegen, direkte API-Calls aus Komponenten dorthin verlagern ([signal-architecture.md](signal-architecture.md)).
7. **Routen splitten:** `[feature].routes.ts` + `loadChildren`.
8. **ESLint-Boundary aktivieren** — erst zum Schluss, sonst blockiert die Regel die Zwischenzustände.

**Abbruchkriterium pro Schritt:** Build rot oder Tests rot → zurück, nicht weiterschieben. Datei-Umbenennung (Suffix-Schema) **nicht** mit der Struktur-Migration mischen — zwei Diffs, zwei Commits.

---

## Tooling

- Scaffold via `ng generate`, dann Dateien zu Feature-/Components-Struktur verschieben.
- Nach substantiellen Edits: `build_angular_project` via dev-mcp ausführen und Compile-Fehler beheben.
