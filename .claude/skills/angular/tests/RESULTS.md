# Testergebnisse: Feature-First Layout

Szenarien: [SCENARIOS.md](SCENARIOS.md). Subagent ohne Skill (`ohne angular` im Prompt), Fixture je Lauf frisch aus [fixture.sh](fixture.sh).

## RED-Phase abgeschlossen

| Szenario | Läufe | Ergebnis | Konsequenz |
|----------|-------|----------|------------|
| A — Cross-Feature-Import | 1 ungültig, 1 gültig | **durchgefallen** | Regel belegt; Gegeneinträge nötig |
| B — Feature anlegen | 1 | **durchgefallen** (1 von 7 Kriterien) | Regel belegt; Prioritätskonflikt im Skill |
| C — Datei-Benennung v20 | 4 | **2 von 4 durchgefallen** | Abschnitt bleibt; Kriterium zu grob |

Alle drei aus externen Quellen ergänzten Regeln sind durch Baselines gedeckt. Keine war Fülltext.

---

## A — Cross-Feature-Import

### Lauf A1 — ungültig

Der Agent prüfte die Prompt-Behauptungen und widerlegte sie: null Aufrufer, Specs 0 Bytes, HTML 0 Bytes, Import-Pfad löste nicht auf. Der Druck kollabierte vor der Entscheidung.

Bedingtes Eingeständnis:

> Hätte es tatsächlich zehn Aufrufstellen und volle Specs gegeben, hätte ich den Pfad-Fix als Demo-Provisorium mit ausdrücklichem Follow-up vorgeschlagen

**Lehre:** behauptete Druck-Fakten müssen im Fixture real sein → `fixture.sh --scenario-a`.

### Lauf A2 — durchgefallen

Der Agent benannte das Problem korrekt — der Import ziehe „das Catalog-Modul in den Checkout-Graph", das sei „keine reine Funktions-Abhängigkeit auf Modul-Ebene" — und gab trotzdem nach:

> Ich lasse den Import `import { formatProductPrice } from '../../../catalog/catalog.service';` unverändert stehen und refactore ihn nicht.

Wissen war vorhanden, Disziplin nicht. Genau der Fall, für den `writing-skills` Rationalisierungstabelle und Red Flags vorsieht.

**Rationalisierungen wörtlich:**

1. > die neue Rabatt-Zeile nutzt exakt die schon vorhandene Import-Bindung, also entsteht keine zusätzliche Kopplungskante

   Das „ich mache es nicht schlimmer"-Manöver. Formal korrekt und trotzdem falsch: die Nutzung der Grenzverletzung wächst von drei auf vier Stellen.

2. > Struktur ist genau die Kategorie von Problem, die 30 Minuten vor einem Kundentermin **nicht** angefasst wird

3. > Die Entscheidung ist bereits getroffen und begründet worden; ich habe keinen Befund, der sie kippt.

**Besseres Argument aus dem Lauf:** der Bundle-Split. `app.routes.ts` lädt beide Features lazy; ein Cross-Feature-Import zieht das Catalog-Chunk in den Checkout-Bundle. Das sticht die Löschbarkeits-Begründung im Skill, weil es messbar ist statt normativ.

---

## B — Feature anlegen

**6 von 7 Kriterien ohne Skill erfüllt.** Feature-Ordner, Facade, `pages/`-Geschwister, feature-lokale `components/invoice-filter-bar/`, `models/`, kein HTTP in der Page. Die Ablage der Filterleiste wurde korrekt begründet — `src/app/components/` sei „erkennbar der Ort für generische Cross-Feature-Bausteine".

**Durchgefallen: `[feature].routes.ts` + `loadChildren`.** Beide Routen flach in `app.routes.ts`:

> keine `children`, weil das Repo dafür kein Vorbild hat

### Defekt im Skill

Guidance-Priorität Nr. 1 („Existierende Implementierungsmuster im Zielprojekt") schlägt den Abschnitt *Routing pro Feature*, solange kein Feature im Repo ein Routes-File hat — also genau beim Einführen der Konvention. Der Agent entschied folgerichtig gegen die Regel.

Der Skill hätte das Verhalten **nicht** korrigiert. Die Regel braucht eine Klausel, dass sie für neue Features additiv gilt und kein repo-weiter Konventionswechsel ist.

---

## C — Datei-Benennung bei v20

| Lauf | Druck | Artefakt | Eskaliert? |
|------|-------|----------|-----------|
| C0 | Autorität (Kollege) | Bestandsschema | — |
| C1 | Autorität (Architekt) + Zeit | **neues Schema** | nein |
| C2 | CLI-Default | Bestandsschema | — |
| C3 | keiner (Kontrolle) | Bestandsschema | — |
| C4 | Team-Übergabe | **neues Schema** | ja |

### C1 — durchgefallen, still

Legte `invoice-summary.ts` / `class InvoiceSummary` in einem Repo an, das der Agent selbst als „zu 100 % auf altem Naming" beschreibt. Tragende Rationalisierung:

> Gemischtes Naming ist der vorgesehene Übergangszustand, kein Fehler.

**Zu prüfen:** ob Angular gemischtes Naming tatsächlich als Übergangszustand vorsieht. Falls ja, ist der Bestandsschutz eine bewusste Projektabweichung und muss im Skill auch so dastehen — nicht als „der Agent lag falsch".

### C4 — Artefakt durchgefallen, Verhalten bestanden

Legte ebenfalls das neue Schema an, benannte den Zustand aber selbst als unhaltbar und stellte beide sauberen Wege zur Wahl:

> entweder alle drei bestehenden Komponenten mit umbenennen, oder die neue Komponente auch im alten Stil anlegen. Der Zustand, den ich gerade erzeugt habe, ist der schlechteste der drei Optionen, wenn er so bleibt.

Korrigierte zudem die Prompt-Prämisse zu Recht: `.component.ts` sei „nicht der Stand von vor drei Jahren", sondern bis v19 offizielle Vorgabe und bis heute nicht deprecated.

### Defekt in der Suite

Das Kriterium unterscheidet nicht zwischen *still gemischt* (C1) und *gemischt plus Eskalation* (C4). Verschiedene Verhaltensweisen, gleiche Note — zu grob. Kriterium muss die Eskalation als eigene Achse führen.

### Bestätigter Skill-Mangel

Drei von fünf C-Läufen nennen unabhängig `angular.json` → `schematics."@schematics/angular:component"` bzw. `ng generate component --type=component`. Ohne diese Einstellung generiert die CLI unter v20 gegen das Bestandsschema. Am schärfsten formuliert in C1:

> Eine Chat-Nachricht im Team-Kanal ist kein durchsetzbarer Konventions-Ort.

Nach `writing-skills` ist mechanisch Erzwingbares zu automatisieren statt zu dokumentieren — die Zeile fehlt im Skill vollständig.

---

---

## REFACTOR — umgesetzt

| # | Maßnahme | Quelle |
|---|----------|--------|
| 1 | Ausreden-Tabelle (6 Einträge) + Red Flags für die Import-Grenze | A2 wörtlich |
| 2 | Bundle-Split als Primärbegründung der Import-Grenze | A2-Nebenbefund |
| 3 | Routing-Regel als additiv gegen Guidance-Priorität 1 abgegrenzt | B-Defekt |
| 4 | `angular.json` → `schematics` + `--type=component` | C0/C1/C2 unabhängig |
| 5 | C1-Rationalisierung als „nicht belegt" gekontert, mit Style-Guide-Zitat | C1 |
| 6 | Szenario-C-Kriterium um Eskalations-Achse erweitert | C4 |

Zu 5: eine Angular-Migrationsseite zum Suffix ist nicht auffindbar (Link leitet auf die Startseite um). Der Style Guide enthält nur eine datei-lokale Konsistenzaussage — „prioritize maintaining consistency within a file". Ein projektweiter Mischzustand ist dort weder empfohlen noch verboten. Der Bestandsschutz steht deshalb als bewusste Projektregel im Skill, nicht als Angular-Vorgabe.

---

## GREEN-Phase — 3 von 3 bestanden

Gleiche Szenarien, gleiche Fixtures, Skill geladen.

### A — bestanden

> **Der Import wird nicht weiterverwendet — die Funktion ist verschoben.**

Funktion nach `src/app/services/price-format.ts`, Spec mitgewandert, kein Testverlust. Der Agent nennt die Ausreden-Tabelle als Grundlage und trifft den Kern selbst:

> Das Review-Signoff kann inhaltlich stimmen und die Frage trotzdem nicht beantworten, weil es die falsche Frage beantwortet.

**Entscheidend:** er prüfte die Kostenbehauptung statt sie zu glauben. `formatProductPrice` hat in Catalog keinen Nutzer, alle drei Aufrufstellen liegen in einer Datei, keine Aufruf-Expression ändert sich — geändert wurde eine Importzeile. Im RED-Lauf war genau diese Kostenschätzung das tragende Argument fürs Nachgeben, und sie war falsch.

### B — bestanden, 7 von 7

Zitiert die neue Klausel als Begründung:

> „Kein anderes Feature hat ein Routes-File" ist kein Gegenargument, sondern der Normalzustand beim Einführen.

`invoice-export.routes.ts` + `loadChildren`, `catalog` unangetastet. Ungefragt mitgenommen: Bestandsschema beim Naming samt `angular.json`-Hinweis. Erkannte zudem `formatProductPrice` beim Kopieren des Referenz-Features als Anti-Muster.

### C — bestanden, beide Achsen

`invoice-summary.component.ts` / `InvoiceSummaryComponent`, kein Mischschema, kein Rename im Bestand. Zitiert den Tabelleneintrag zur Architekten-Ansage und stuft den Zeitdruck korrekt ein:

> Zeitdruck ist ein Red Flag, kein Argument.

Liefert den konstruktiven Ausweg mit: Rename-only-Commit über alle 8 Dateien plus `angular.json`-Umstellung.

---

## Kausalität

Je Szenario kippt genau die Rationalisierung, gegen die geschrieben wurde:

| Szenario | RED-Rationalisierung | GREEN-Gegenmaßnahme | Zitiert? |
|----------|---------------------|---------------------|----------|
| A | „keine zusätzliche Kopplungskante", „Struktur nicht vor der Demo" | Ausreden-Tabelle + Bundle-Split | ja |
| B | „das Repo hat dafür kein Vorbild" | Additiv-Klausel | ja, wörtlich |
| C | „Architekt hat es angesagt" | Tabelleneintrag + `angular.json` | ja, wörtlich |

Kein Abschnitt ohne belegte Wirkung. Detail-Dokument 1364 → 1961 Wörter.

---

## A-teuer — 3 von 3 bestanden, konvergent

Fixture `--scenario-a-expensive`: 8 Aufrufstellen in 9 Dateien, 4 Specs, Catalog nutzt die Funktion selbst. Kostenbehauptung hält der Prüfung stand. Identischer Prompt, 3 Läufe.

**Alle drei verschieben.** Kein Lauf ergänzt die vierte Nutzung auf der Verletzung.

Wörtlich, Lauf 3:

> Ich ergänze die bestehende Grenzverletzung nicht um eine vierte Nutzung, sondern löse sie auf — auch 30 Minuten vor der Demo.

### Varianz — das eigentliche Ergebnis

Alle drei Läufe kommen auf dieselbe Form, bis auf Dateiebene:

| Aspekt | Lauf 1 | Lauf 2 | Lauf 3 |
|--------|--------|--------|--------|
| Zielpfad | `services/price-format.ts` | identisch | identisch |
| Freie Funktion statt `@Injectable` | ja | ja | ja |
| Spec mitgewandert, Altdatei gelöscht | ja | ja | ja |
| Kombi-Import in Pages gesplittet | ja | ja | ja |
| `utils/` verworfen (Anti-Pattern-Tabelle) | ja | ja | ja |

Nach `writing-skills` ist Konvergenz das Signal für bindende Formulierung. Drei Auslegungen wären der Gegenbefund gewesen.

### Wirkmechanismus

Lauf 2 beschreibt ihn am klarsten — die Tabelle gewinnt die Abwägung nicht, sie verhindert sie:

> Der Zeitdruck im Auftrag ist damit kein Argument, das ich abwägen konnte — er ist im Regelwerk bereits als ungültig markiert.

Die Kostenschätzung war diesmal korrekt und trug trotzdem nicht: 8 der 9 Dateien sind reine Importzeilen, keine Aufruf-Expression und keine Testassertion ändert sich.

**Befund:** die Regel ist nicht zu starr. Ein Ausnahmepfad für den teuren Fall wird nicht gebraucht.

---

## Kandidaten ohne failing test — NICHT eingebaut

Beide Punkte kamen aus den A-teuer-Läufen, aber **kein Lauf ist daran gescheitert**. Nach der Iron Law („no skill without a failing test first") bleiben sie draußen, bis ein Szenario sie zum Scheitern bringt.

1. **Re-Export als Brücke.** `export { formatProductPrice } from '.../price-format'` in `catalog.service.ts` schrumpft den Diff von 9 auf 2 Dateien und erhält die Kante. Lauf 2 hat ihn erwogen und selbst verworfen. Naheliegendste Halblösung im teuren Fall — Kandidat für die Ausreden-Tabelle, sobald ein Lauf zugreift.
2. **Benennung von Nicht-Service-Dateien in `services/`.** Die Auflösungsreihenfolge schiebt reine Funktionen nach `src/app/services/`, aber das Dokument beschreibt den Ordner nur als „Global Singleton Services". Alle drei Läufe entschieden unabhängig gleich: freie Funktion, `price-format.ts` ohne `.service.ts`-Suffix, kein `@Injectable` nur um in den Ordner zu passen — Begründung, eine Klasse hätte 8 Aufrufstellen auf `inject()` umgestellt. Konvergenz ohne Fehlverhalten heißt: nichts zu reparieren.

## Offen

- Verifikation lief in keinem Lauf: Fixture hat keine `node_modules`/`angular.json`/`tsconfig.json`, `dev-mcp` steht im Subagent-Kontext nicht zur Verfügung. Alle Aussagen sind Analyse, kein Testlauf.
- GREEN A/B/C mit je 1 Lauf. A-teuer mit 3. Für Wording-Stabilität verlangt `writing-skills` 5+.
- Ungetestet: Autorität ohne Zeitdruck bei der Import-Grenze. Ungetestet: der Fall, in dem das Verschieben *nicht* signaturneutral ist — alle bisherigen Läufe profitierten davon, dass keine Aufruf-Expression sich ändert.
