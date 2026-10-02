---
name: craft-angular-modulith-bridge
description: >
  Use when translating the craft-modulith-thinking business model into a concrete Angular
  structure — mapping departments onto `features/`, deciding what belongs in `core/`
  vs `shared/` vs a feature, how a feature's own files are laid out, or how cross-feature
  boundaries are enforced without a compiler (ESLint). Also when a frontend feature needs
  data owned by another department and it's unclear whether that's a direct import or a
  backend call.
  Technology bridge — requires `craft-modulith-thinking` for the vocabulary it translates.
  Triggers: @craft-angular-modulith-bridge, Feature-Struktur, Cross-Feature-Import, core vs
  shared, Modulith in Angular, Smart Component, Leaf Component.
  Background: setzt `craft-modulith-thinking` voraus; nutzt `craft-design-principles`
  (DDD-in-Angular-Tabelle) und `craft-architecture-styles` (Modulith-Regeln) als Vertiefung.
  Opt-out: ohne craft-angular-modulith-bridge.
---

# Angular-Brücke: Modulith-Denken in Angular

Übersetzt das Unternehmensbild aus `craft-modulith-thinking` in eine konkrete Angular-Struktur.
**Setzt den anderen Skill voraus.** Die Übersetzung von DDD-Begriffen auf Angular
(Domain Service, Repository, Integration-/Leaf-Component) steht bereits vollständig in
`craft-design-principles` → `references/ddd.md`, Abschnitt „DDD in Angular" — dieser Skill
wiederholt das nicht, sondern setzt eine Ebene höher an: beim Unternehmensbild.

Beantwortet wie `craft-modulith-thinking` und `craft-architecture-styles` die **Struktur-Frage**
(Feature-/Ordner-Zuschnitt). Was innerhalb einer Component oder eines Service passiert,
regelt `craft-design-principles` — unabhängig vom Feature-Zuschnitt.

---

## Grundriss

| Unternehmensbild | Angular |
|---|---|
| Unternehmen | eine Angular-Anwendung, ein Deployment |
| Abteilung | ein Feature-Bereich unter `features/<name>/` |
| Fachgruppe | Unterordner in `pages/`/`components/` — nur bei mehreren Fachgruppen |
| Anlaufstelle | `<name>-api.service.ts` |
| Zimmer | kein natives Sprachmittel in Angular — siehe unten |
| Aktenablage | lebt im Backend-Modul; das Feature hat höchstens Zwischenzustand, keine Quelle der Wahrheit |
| Konzern / Tochterunternehmen | getrennte Angular-Anwendungen (eigenes Repo, eigenes Deployment je Firma) — nichts verbindet sie im Code |

---

## Der große Unterschied zum Backend: keine Verbindungsstelle im Frontend

Im Unternehmensbild sitzt die Verbindungsstelle *über* den Abteilungen und verbindet sie.
Im Frontend gibt es diese Schicht **nicht** — und zwar bewusst nicht, nicht aus Vergessen.

Jedes Feature ist ein dünner Client **genau einer** Backend-Anlaufstelle. Braucht eine Seite
Daten aus mehreren Abteilungen — etwa ein Dashboard, das Profil- und Bestell-Daten
zusammen zeigt —, dann komponiert das **backendseitig** ein eigenes, dafür zuständiges Modul
(z. B. eine eigene Auswertungs-Abteilung mit eigenem Endpoint), nicht das Frontend durch
mehrere Api-Services gleichzeitig. Das Frontend-Feature für so ein Dashboard bleibt genauso
dünn wie jedes andere — ein `-api.service.ts`, ein Endpoint, keine eigene Komposition.

**Deshalb: Cross-Feature-Imports sind kein Sonderfall, den man abwägt — sie sind grundsätzlich
verboten.** Ein Feature importiert nie aus einem anderen Feature. Braucht es fremde Daten,
ist die Antwort immer „das gehört backendseitig komponiert", nie „dann importier ich kurz
den Api-Service von nebenan".

---

## Zimmer im Frontend: ESLint statt Compiler

.NET bekommt die Zimmer-Grenze vom Compiler geschenkt (`.csproj`-Referenzgrenze). TypeScript
hat dieses Mittel im Standard-Angular-Workspace nicht — ein Feature-Ordner ist kein eigenes
kompilierbares Zimmer, nur eine Ordnerkonvention. Die Grenze existiert trotzdem, nur anders
durchgesetzt: **ESLint statt Compiler.**

- Cross-Feature-Imports sind per Lint-Regel verboten (`eslint-plugin-boundaries` oder
  gleichwertig) — dieselbe Rolle wie NetArchTest in .NET, nur zur Lint-Zeit statt zur
  Kompilierzeit geprüft.
- `core/` und `shared/` importieren nie aus `features/` — die Abhängigkeitsrichtung bleibt
  einseitig, wie beim Hexagon.

Eine hart kompilierte Grenze (eigenes Nx-Library-Projekt mit TS-Project-References je Feature)
ist möglich, aber eine eigene, größere Werkzeug-Entscheidung — kein Default. Solange kein
zweites Team parallel an unterschiedlichen Features arbeitet und sich dabei blockiert, reicht
die Lint-Grenze.

---

## `core/` · `shared/` · `features/` — drei verschiedene Rollen

| Ordner | Rolle | Unternehmensbild-Entsprechung |
|---|---|---|
| `core/` | app-weite technische Singletons (Auth, Interceptor, Config) | SharedKernel — Plumbing, keine Fachlichkeit |
| `shared/` | wiederverwendbare, dumme UI-Komponenten | kein Äquivalent im Unternehmensbild — reine Präsentationswiederverwendung |
| `features/<name>/` | eine Abteilung | Abteilung |

`shared/` ist bewusst kein SharedKernel-Äquivalent, auch wenn der Name das nahelegt — es
transportiert keine Domänensprache, nur Render-Logik. Die eigentliche technische
Gemeinsamkeit sitzt in `core/`.

---

## Innerhalb eines Features

Beispielhaft, Namen frei gewählt:

```
features/<name>/
├── <name>.routes.ts
├── <name>-api.service.ts        ← Anlaufstelle / Registratur (HTTP, kein Fachwissen)
└── pages/
      └── <Name>Page.ts           ← Vorzimmer: Smart/Integration-Component, orchestriert nur
```

Bei mehreren Fachgruppen oder wiederverwendbaren Leaf-Teilen kommt `components/` dazu:

```
features/<name>/
├── <name>.routes.ts
├── <name>-api.service.ts
├── pages/
│     └── <Name>Page.ts
└── components/
      └── <ein Ordner/Datei je Leaf-Component oder Fachgruppen-Teilansicht>
```

**Sachbearbeiter-Logik** (Domain Service im Sinne von `ddd.md`) bleibt in einem eigenen
Angular-Service ohne HTTP und ohne State — niemals in der Page- oder Leaf-Component selbst.
Eine Page, die selbst rechnet statt zu delegieren, ist keine Integration-Component mehr,
sondern eine versteckte Fachabteilung ohne eigenen Namen.

Fachgruppen-Zwischenordner nur, wenn ein Feature wirklich mehrere hat — dieselbe gestufte
Entscheidung wie bei den Zimmern in .NET, nicht anders nur weil die Technik wechselt.

---

## Verweise

| Bereich | Datei/Skill |
|---|---|
| Das Unternehmensbild, das hier übersetzt wird | `craft-modulith-thinking` |
| DDD-Begriffe in Angular (Domain Service, Repository, Integration-/Leaf-Component) | `craft-design-principles/references/ddd.md` |
| Modulith-Regeln, geprüfte statt dokumentierte Grenze | `craft-architecture-styles/references/deployment.md` |
| Component-Hierarchie (IODA/IOSP) | `craft-design-principles` → Regel 5 |
| Durchgerechnetes Beispiel (BAR, 16 Features) | [references/bar-example.md](references/bar-example.md) |

---

## Opt-out

`ohne craft-angular-modulith-bridge` → Skill nicht laden.
