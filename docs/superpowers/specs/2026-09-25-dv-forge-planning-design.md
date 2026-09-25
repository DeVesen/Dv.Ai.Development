# dv-forge: Planen — Design

2026-09-25 · @DeVesen · Branch `V2` · Status: freigegeben 2026-09-25

## 1. Kontext und Ziel

Teilprojekt 2 von `dv-forge` (siehe `2026-09-25-dv-forge-spec-review-design.md`, Abschnitt 1).
Es fügt zwei Skills hinzu:

1. **`plan-writing`** — macht aus einer freigegebenen `spec.md` einen Umsetzungsplan, interaktiv mit
   dem Menschen.
2. **`plan-review`** — prüft den Plan autonom gegen Spec und Code und korrigiert ihn, nach demselben
   Loop-Muster wie `spec-review`.

Ablauf für den Menschen: Spec freigegeben → `plan-writing` (Fragen gehen an den Menschen) → frische
Session → `plan-review` → Mensch bekommt Plan und letztes Review.

## 2. Abgrenzung

**Im Umfang:**
- Skill `plan-writing` mit Referenzen
- Skill `plan-review` als Orchestrator, fünf Reviewer-Agents, Nacharbeiter `plan-rework`, Scout `plan-review-scout`
- Generalisierung der Loop-Infrastruktur aus `spec-review` (Abschnitt 9)
- neues Skript `rework-outcome.js`, Tests

**Nicht im Umfang:**
- alternative Pläne (`plan-a.md` / `plan-b.md`)
- Ausführung des Plans (Teilprojekt 3)
- Änderungen am Spec-Review-Verhalten über die Generalisierung hinaus

**Leitplanke:** Aus `dv-relay` werden weder Name, Texte noch Strukturen übernommen.

## 3. Begriffe

Es gelten die Begriffe aus der Spec-Review-Spec (Orchestrator, Reviewer, Nacharbeiter, Finding,
Stelle, Runde, N, sauber). Zusätzlich:

| Begriff | Bedeutung |
|---|---|
| Planer | Die Main-Session, die `plan-writing` ausführt. Liest Spec und Code, fragt den Menschen, schreibt den Plan. |
| W-Eintrag | Entscheidung des Menschen während der Planung, in `## Entscheidungen` des Plans. Bindend. |
| R-Eintrag | Eintrag des Nacharbeiters `plan-rework` in `## Entscheidungen` des Plans. |
| Spec-Rückfrage | Ein Finding, das sich nur durch eine Änderung der Spec lösen lässt, nicht durch eine Änderung des Plans. |

## 4. Architektur

```
plugins/forge/
├── skills/
│   ├── plan-writing/
│   │   ├── SKILL.md                         Ablauf, schlank; disable-model-invocation: true
│   │   └── references/
│   │       ├── plan-format.md               Kopf, Global Constraints, Task-Struktur, Entscheidungen
│   │       ├── task-rules.md                Zuschnitt, Schrittgröße, TDD-Zyklus, keine Platzhalter
│   │       └── self-check.md                Abdeckung, Platzhalter-Scan, Namens-/Typ-Konsistenz
│   └── plan-review/
│       └── SKILL.md                         Orchestrator; disable-model-invocation: true
├── shared/review-loop/                      aus skills/spec-review/references/ hierher verschoben
│   ├── loop.md                              Start → Runde → Stopp → Abschluss, artefakt-neutral
│   ├── finding-format.md
│   ├── severity-rules.md
│   └── report-format.md
├── agents/
│   ├── plan-review-coverage.md              (sonnet, Read)
│   ├── plan-review-feasibility.md           (sonnet, Read, Grep, Glob)
│   ├── plan-review-architecture.md          (sonnet, Read, Grep, Glob)
│   ├── plan-review-risks.md                 (sonnet, Read, Grep, Glob)
│   ├── plan-review-buildability.md          (sonnet, Read, Grep, Glob)
│   ├── plan-rework.md                       (opus, Read, Grep, Glob, Edit)
│   └── plan-review-scout.md                 (opus, Read, Grep, Glob)
├── scripts/
│   ├── guard-orchestrator.js                generalisiert (Abschnitt 9)
│   ├── aggregate-findings.js                generalisiert (Abschnitt 9)
│   ├── file-hash.js                         unverändert
│   └── rework-outcome.js                    neu
└── tests/
    └── fixtures/plan-review/                Fixture-Spec, Fixture-Plan, Mini-Repo
```

**Konventionsentscheidungen:**
- Die Prosa im Plan ist deutsch; Code, Pfade und Befehle sind englisch.
- Skill- und Agent-Texte folgen denselben Regeln wie in der Spec-Review-Spec (Frontmatter nur `name` +
  `description`, „Use when…“, Details in `references/`).

## 5. Herkunft von `plan-writing`

`plan-writing` übernimmt Inhalt, Schärfe und Arbeitsweise von `superpowers:writing-plans`
einschließlich `plan-document-reviewer-prompt.md`, **vollständig neu formuliert**. Kein Satz wird
wörtlich übernommen, und keine Datei im Plugin erwähnt `superpowers` oder `writing-plans`.

Folgende Elemente müssen erhalten bleiben, jedes mit unveränderter Strenge:

| Element | Landet in |
|---|---|
| Leitbild: Umsetzer hat null Kontext und fragwürdigen Geschmack, ist aber fähig; DRY, YAGNI, TDD, häufige Commits | `SKILL.md` |
| Ankündigung beim Start | `SKILL.md` |
| Umfangs-Check: mehrere unabhängige Teilsysteme → getrennte Pläne vorschlagen | `SKILL.md` |
| Dateistruktur vor Tasks: eine Verantwortung pro Datei, zusammen Änderndes liegt zusammen, bestehende Muster gehen vor | `task-rules.md` |
| Task-Zuschnitt: kleinste Einheit mit eigenem Testzyklus, die ein Reviewer getrennt ablehnen könnte; Setup und Doku gehören in den Task, der sie braucht | `task-rules.md` |
| Schrittgröße 2–5 Minuten, eine Aktion pro Schritt: Test schreiben → rot laufen lassen → minimal implementieren → grün laufen lassen → commit | `task-rules.md` |
| Plan-Kopf: Ziel (ein Satz), Architektur (2–3 Sätze), Tech-Stack, Spec-Pfad, Global Constraints mit wörtlich übernommenen Werten | `plan-format.md` |
| Task-Struktur: Dateien (Create/Modify mit Zeilen/Test), Interfaces (Consumes/Produces mit exakten Signaturen), Schritte mit vollständigem Code, Befehl mit erwarteter Ausgabe, Commit | `plan-format.md` |
| Verbotsliste Platzhalter: „TBD“, „TODO“, „später“, „passende Fehlerbehandlung ergänzen“, „Tests für obiges schreiben“, „wie Task N“, Schritte ohne Code, Verweise auf nirgends definierte Typen/Funktionen | `task-rules.md` |
| Selbst-Check nach dem Schreiben: Spec-Abdeckung, Platzhalter-Scan, Namens-/Typ-Konsistenz; Befunde inline korrigieren, kein SubAgent | `self-check.md` |
| Kalibrierung des Plan-Reviewers: nur melden, was bei der Umsetzung echte Probleme macht; Stil und „nice to have“ sind keine Befunde | Reviewer-Agents (Abschnitt 7) |

**Bewusste Abweichungen vom Original:**
1. Offene Fragen gehen während der Planung direkt an den Menschen (Abschnitt 6, Schritt 4).
2. Jeder Task nennt die AC-IDs, die er abdeckt.
3. Der Plan endet mit `## Entscheidungen`.
4. Die Übergabe am Ende nennt `/dv-forge:plan-review` statt einer Ausführungswahl.
5. Der Plan-Kopf nennt den Umsetzungs-Befehl `/dv-forge:implementation <plan.md>` statt einer Ausführungswahl (Abschnitt 6.1).

## 6. Skill `plan-writing`

**Aufruf:** `/dv-forge:plan-writing <pfad/spec.md>` — nur manuell. Läuft in der Main-Session; der
Skill ist Planer, kein Orchestrator, und liest selbst Code.

**Ablauf:**
1. **Spec lesen.** Fehlt sie: Abbruch mit Pfad. Status „Abbruch“ im Spec-Kopf: Warnung, der Mensch
   entscheidet über Fortsetzung.
2. **Umfang prüfen.** Mehrere unabhängige Teilsysteme → getrennte Pläne empfehlen und nachfragen.
3. **Code erkunden, Dateistruktur festlegen** nach `task-rules.md`.
4. **Offene Fragen** an den Menschen: eine pro Nachricht, mit Empfehlung und Grund. Das umfasst
   echte Architektur-Alternativen; geplant wird genau eine. Jede Antwort wird sofort ein W-Eintrag.
   „Entscheide du“ → Empfehlung gilt, W-Eintrag mit Tag `delegiert`.
5. **Plan schreiben** nach `plan-format.md` und `task-rules.md`.
6. **Selbst-Check** nach `self-check.md`, Befunde inline korrigieren.
7. **Übergabe:** Plan-Pfad, kopierbarer Befehl `/dv-forge:plan-review <plan.md>`, Hinweis auf frische
   Session. Es wird nichts committet.

**Ablage:** `plan.md` im Ordner der Spec, also `docs/forge/YYYY-MM-DD-<slug>/plan.md`. Existiert sie
schon: nachfragen, nichts überschreiben.

### 6.1 Plan-Format (`plan-format.md`)

````markdown
# <Titel> — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** <ein Satz>
**Architektur:** <2–3 Sätze>
**Tech-Stack:** <Technologien>
**Spec:** <Pfad zur spec.md>

## Global Constraints
- <projektweite Vorgabe, Wert wörtlich aus der Spec>

---

### Task 1: <Komponente>

**ACs:** AC-01, AC-03

**Dateien:**
- Create: `exakter/pfad.ext`
- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`
- Test: `tests/exakter/pfad.ext`

**Interfaces:**
- Consumes: <exakte Signaturen aus früheren Tasks>
- Produces: <exakte Namen, Parameter- und Rückgabetypen für spätere Tasks>

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  <vollständiger Testcode>
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: FAIL mit „<meldung>“
- [ ] **Schritt 3: Minimal implementieren**
  <vollständiger Code>
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add <dateien>` · `git commit -m "<message>"`

## Entscheidungen
- **W · <Kurztitel>** · Mensch | delegiert — <Antwort>
- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>
````

**Verbindliche Format-Regeln** (maschinell auswertbar, weil spätere Stufen den Plan per Skript
zerlegen, ohne dass ein Orchestrator ihn liest):
1. **Task-Überschriften** lauten exakt `### Task <n>: <Komponente>`. `<n>` ist eine ganze Zahl,
   lückenlos aufsteigend ab 1. Zusätze wie „Task 3a“ oder „Task 3.1“ sind verboten.
2. **Befehl oder Tool-Aufruf:** Eine Verifikation ist entweder ein Shell-Befehl oder ein Tool-Aufruf
   mit exakten Parametern, z. B. dev-mcp `test_dotnet_solution` mit `test_project_path`. Der Planer
   liest vor dem Schreiben die Projekt-`CLAUDE.md`. Verbietet sie einen Weg (etwa Tests über die
   Shell), verwendet der Plan den dort vorgeschriebenen. Ein Befehl, den der Umsetzer nicht ausführen
   darf, ist ein Plan-Fehler.
3. **Stabiler Anker bei `Modify`:** Jede `Modify`-Zeile nennt nach `·` einen Anker, der auch dann
   gültig bleibt, wenn ein früherer Task dieselbe Datei ändert: ein Symbol (`Klasse.methode`,
   Funktionsname) oder, bei Dateien ohne Symbole, eine eindeutige Überschrift bzw. Zeichenfolge in
   Backticks. Maßgeblich ist der Anker; die Zeilenangabe dient nur der Orientierung.

## 7. Skill `plan-review`

**Aufruf:** `/dv-forge:plan-review <pfad/plan.md> [pfad/spec.md] [--rounds N]`
- Ohne Spec-Argument gilt `spec.md` im Ordner des Plans (Pfadregel, kein Lesen des Plans).
- Nur manuell, Default N = 3.

**Ablauf:** nach `shared/review-loop/loop.md`, also wie `spec-review`: parallele Reviewer in einer
Nachricht, Aggregation per Skript, Stopp-Prüfung, Nacharbeit mit Hash-Vergleich, Abschlussbericht im
Chat, keine Review-Dateien, kein Commit. Zusätzlich gilt der Stopp-Grund aus 7.3.

### 7.1 Reviewer

Alle bekommen Plan- und Spec-Pfad und keine Findings früherer Runden. W-Einträge in Spec und Plan
sind bindend und nie selbst ein Finding; ein Widerspruch zu einem W-Eintrag ist eines. Kalibrierung
für alle: nur melden, was bei der Umsetzung zu falschem Bau oder zum Steckenbleiben führt.

| Agent | Prüfauftrag |
|---|---|
| `plan-review-coverage` | Jede AC-ID der Spec steht in mindestens einem Task unter `**ACs:**` und wird dort tatsächlich umgesetzt. Fehlendes oder nur teilweise umgesetztes AC ist immer 🔴. Soll-Vorgaben der Spec stehen in Global Constraints. Jeder Task hat eine Verifikation (Test oder Befehl mit erwarteter Ausgabe). Liest keinen Code. |
| `plan-review-feasibility` | Reihenfolge der Tasks, Abhängigkeiten (was ein Task konsumiert, produziert ein früherer), externe Voraussetzungen, Konsistenz von Namen und Typen über Tasks. Keine Zeit- oder Aufwandsschätzung. |
| `plan-review-architecture` | Passt der Plan zu Architektur, Mustern und Konventionen des Repos einschließlich Projekt-`CLAUDE.md`? Hat jede Datei eine Verantwortung? |
| `plan-review-risks` | Fehlerbehandlung, Security, ungeprüfte Annahmen über Schnittstellen und externe Systeme. Keine organisatorischen Themen. |
| `plan-review-buildability` | Platzhalter nach der Verbotsliste aus `task-rules.md`, Code-Schritte ohne Code, existierende Dateien und Anker bei `Modify` (Regel 3 aus 6.1), Task-Zuschnitt und Schrittgröße, ausführbare **und laut Projekt-`CLAUDE.md` erlaubte** Befehle bzw. Tool-Aufrufe, Task-Nummerierung nach Regel 1 aus 6.1. |

### 7.2 Stelle

`Task <n>` | `AC-<nn>` | `Global Constraints` | exakte Abschnittsüberschrift. Details auf
Schritt-Ebene stehen im Zitat.

### 7.3 Nacharbeiter `plan-rework`

- ändert nur `plan.md`, nie die Spec; liest Code
- schreibt pro bearbeitetem aggregiertem Finding genau einen R-Eintrag im Format aus 6.1
- ändert und entfernt keine W-Einträge
- teilt er einen Task oder fügt einen ein, nummeriert er alle Tasks lückenlos neu (Regel 1 aus 6.1)
  und zieht Verweise im Plan nach (Consumes/Produces, „aus Task n“). Der R-Eintrag nennt die
  Zuordnung, z. B. `Task 3 → Task 3, Task 4`. R-Einträge früherer Runden bleiben unverändert; ihre
  Nummern beziehen sich auf den Stand ihrer Runde.
- ist ein Finding nur durch eine Spec-Änderung lösbar: Status `spec-rückfrage`, Plan bleibt an der
  Stelle unverändert
- endet mit genau einem JSON-Block:

```json
{ "results": [ { "location": "Task 3", "status": "changed" } ] }
```

`status` ∈ `changed` | `unchanged` | `spec-question`.

**Stopp-Grund „Spec-Rückfrage“:** `rework-outcome.js --escalation-status spec-question` gleicht die
Rückgabe mit den aggregierten 🔴 der Runde ab. Hat **jede** 🔴-Stelle diesen Status, endet der Loop
mit „Spec-Rückfrage in Runde r“.

### 7.4 Abschlussbericht

- Status: `sauber nach Review r` | `Cap erreicht, k × 🔴 offen` | `Stillstand in Runde r` |
  `Spec-Rückfrage in Runde r`
- Anzahl Reviews und Nacharbeiten, ausgefallene Reviewer
- Tabelle der aggregierten Findings des letzten Reviews
- Abschnitt `## Scout-Vorschläge` aus 7.5, unverändert, oder der Vermerk „Scout ausgefallen“
- Liste aller Spec-Rückfragen mit dem Hinweis: Spec anpassen → `spec-review` → `plan-review` erneut
- Plan-Pfad
- Nur bei `sauber`: der Hinweis „`spec.md` und `plan.md` vor dem Start committen, sonst sieht sie ein
  Worktree nicht“, der Hinweis auf eine frische Session und der kopierbare Befehl
  `/dv-forge:implementation <plan.md>`

### 7.5 Scout nach dem letzten Review

Nach dem **letzten** Review eines Laufs — unabhängig vom Grund des Endes — und vor dem
Abschlussbericht läuft einmal der Agent `plan-review-scout` (`opus`, `Read, Grep, Glob`). Er ist rein
beratend: Er ändert keine Datei und löst keine weitere Runde aus.

- **Auslöser:** Die letzte `STATUS`-Zeile zeigt `red` > 0 oder `yellow` > 0. Sonst entfällt der Scout.
- **Eingabe:** `Plan:`, `Spec:`, `Repo:` und `Findings:` mit dem REWORK-Abschnitt der letzten
  Aggregation, unverändert. Der Scout bearbeitet darin nur 🔴- und 🟡-Gruppen; 🟢 ignoriert er.
- **Auftrag pro Gruppe:** 1 bis 3 Lösungsvorschläge, abgeleitet aus Plan, Spec und Code. Genau einer
  ist als bevorzugt markiert und begründet. Ist eine Gruppe nur über die Spec lösbar, darf ein
  Vorschlag eine Spec-Änderung sein („Spec so ändern: …“).
- **Ausgabeformat:**

```markdown
## Scout-Vorschläge

### 🔴 <Stelle>
1. <Vorschlag>
2. <Vorschlag>
**Bevorzugt: <Nr>** — <Begründung>
```

- **Prüfung durch den Orchestrator (mechanisch):** Die Antwort enthält die Zeile
  `## Scout-Vorschläge`. Fehlt sie, wird der Scout einmal neu gestartet; fehlt sie wieder, steht im
  Bericht „Scout ausgefallen“. Den Abschnitt ab `## Scout-Vorschläge` übernimmt der Orchestrator
  unverändert als Zusatz-Abschnitt in den Bericht.
- **Gemeinsamer Loop:** `shared/review-loop/loop.md` führt den Baustein „Abschluss-Scout“.
  `plan-review` füllt ihn, `spec-review` trägt „Keiner“ ein, bis es nachgerüstet wird.
- **Neutral für andere Skills** (Abgleich Teilprojekt 3, Iteration 3): Der Baustein in `loop.md`
  legt nur Auslöser, Wiederholung und Übernahme in den Bericht fest. Welche Eingabezeilen der Scout
  bekommt, bestimmt der Skill; er darf Zeilen ergänzen (etwa `Context:`, `Profiles:`) oder weglassen
  (etwa `Spec:`). „Nach dem letzten Review“ heißt bei einem Skill ohne Runden: nach dem einzigen
  Review. `implementation-review` nutzt denselben Baustein und dasselbe Ausgabeformat.

## 8. Guard für `plan-review`

Der Guard schützt in der Main-Session `plan.md` und `spec.md` gegen Lese-, Schreib- und
Shell-Zugriffe. Ausgenommen sind Shell-Aufrufe der Plugin-Skripte und alle Tool-Calls von SubAgents
(`agent_id` gesetzt). Marker, `session_id`-Bindung und Aufräumen wie beim Spec-Review.

## 9. Generalisierung der Loop-Infrastruktur

**Startet erst, wenn `spec-review` vollständig umgesetzt ist.** `plan-writing` hängt nicht daran und
darf vorher gebaut werden. Alle bestehenden Spec-Review-Tests bleiben grün.

1. **`guard-orchestrator.js`:** Der Marker speichert `protected: string[]` statt eines einzelnen
   Pfads. Eine Tabelle im Skript ordnet Befehle Pfaden zu:
   - `/dv-forge:spec-review <spec>` → `[spec]`
   - `/dv-forge:plan-review <plan> [spec]` → `[plan, spec]`; ohne `spec` gilt `spec.md` im Ordner des Plans

   Ein Eintrag in `protected` darf eine Datei **oder ein Verzeichnis** sein. Datei-Tools
   (`Read|Edit|Write|MultiEdit|NotebookEdit`) werden geblockt, wenn der normalisierte absolute
   Zielpfad dem Eintrag gleicht oder mit `<Eintrag>/` beginnt; `/repo` schützt also `/repo/x.cs`,
   aber nicht `/repo-alt/x.cs`. Die Shell-Regel (Kommando enthält einen geschützten Pfad) und die
   Ausnahme für Plugin-Skripte bleiben unverändert. Teilprojekt 3 nutzt das für den Schutz des ganzen
   Repos; spec- und plan-review tragen weiterhin nur Dateien ein.

   **Ausnahme Plugin-Wurzel:** Ein `Read` der Main-Session auf eine Datei unterhalb der Plugin-Wurzel
   (Ordner über `scripts/`, in dem der Guard selbst liegt) ist erlaubt, auch wenn sie in einem
   geschützten **Verzeichnis**-Eintrag liegt. Grund: Beim Dogfooding liegt `plugins/forge` im
   geschützten Repo, und der Orchestrator muss seine eigenen Referenzen (`loop.md` u. a.) laden.
   Die Ausnahme gilt nicht für `Edit`/`Write` und nicht für Datei-Einträge.
2. **`aggregate-findings.js`:** Die Normalisierung von `location` wird auf eine **Tabelle von
   Stellen-Typen** umgestellt statt verstreuter Regex. Jede Zeile hat: Name, Erkennungsmuster,
   Normalform. Eine Stelle, auf die keine Zeile passt, fällt auf die bestehende Überschriften-Regel
   zurück (trimmen, Kleinschreibung, Leerzeichen zusammenfassen). Zeilen jetzt:
   - `ac` — `AC-7` / `AC-07` → `ac-7` (bestehendes Verhalten)
   - `task` — `Task 03` / `task 3` / `TASK 3` → `task 3`
   - `heading` — Rückfall-Regel, deckt auch `Global Constraints` ab

   Ein neuer Typ (in Teilprojekt 3: Dateipfad mit einheitlichen Slashes und Kleinschreibung) kommt
   als eine weitere Zeile dazu, ohne bestehende Zeilen zu ändern.
3. **`rework-outcome.js`** (neu): `rework-outcome.js --escalation-status <status>`. Liest den
   JSON-Block des Nacharbeiters und die aggregierten Findings und gibt `all-red-escalated: true|false`
   aus, dazu die Liste der Stellen mit diesem Status. `plan-review` ruft es mit `spec-question` auf;
   Teilprojekt 3 nutzt dasselbe Skript mit eigenem Status. Fehlt der Parameter oder ist das JSON
   ungültig, ist das ein Fehler.
4. **Gemeinsame Referenzen:** `finding-format.md`, `severity-rules.md` und `report-format.md` ziehen
   von `skills/spec-review/references/` nach `shared/review-loop/`; der artefakt-neutrale Ablauf wird
   `shared/review-loop/loop.md`. Beide Orchestrator-Skills verweisen per `${CLAUDE_PLUGIN_ROOT}` darauf
   und behalten nur, was zu ihrem Artefakt gehört: Argumente, Reviewer und deren Eingaben,
   Nacharbeiter, zusätzliche Stopp-Gründe, Stellen-Schlüssel und das Fortschritts-Skript.
5. **Fortschrittsprüfung neutral:** `loop.md` sagt „Fortschritt nach der Nacharbeit per Skript
   prüfen; kein Fortschritt trotz 🔴 → Stillstand“. Welches Skript das ist, legt der jeweilige Skill
   fest: `spec-review` und `plan-review` nutzen `file-hash.js` auf ihre Datei; Teilprojekt 3 kann
   den Git-Stand vergleichen.

## 10. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Plan oder Spec fehlt (explizit oder im Ordner des Plans) | Abbruch vor Runde 1, Meldung nennt den Pfad |
| `plan-writing`: Spec fehlt | Abbruch, Meldung nennt den Pfad |
| `plan-writing`: `plan.md` existiert | nachfragen, nichts überschreiben |
| `plan-writing`: Mensch delegiert eine Frage | Empfehlung gilt, W-Eintrag mit Tag `delegiert` |
| Reviewer-Ausgabe nicht im Format | einmal neu starten; danach „ausgefallen“, Runde nicht sauber |
| Rückgabe von `plan-rework` nicht im Format | einmal neu starten; danach gelten alle Stellen als `unchanged`, der Hash-Vergleich entscheidet |
| Scout-Antwort ohne `## Scout-Vorschläge` | einmal neu starten; danach „Scout ausgefallen“ im Bericht, der Bericht erscheint trotzdem |

## 11. Tests

1. **Guard** (`node:test`): `plan-review`-Prompt → Marker mit Plan und Spec; Spec im Plan-Ordner wird
   aufgelöst; beide Dateien für die Main-Session geblockt; SubAgent erlaubt; Spec-Review-Fälle
   unverändert grün; Verzeichnis-Eintrag blockt eine Datei darin, aber nicht ein Geschwister-
   Verzeichnis mit gleichem Präfix (`/repo` vs. `/repo-alt`).
2. **Aggregation** (`node:test`): `Task 03` / `task 3` / `TASK 3` werden eine Gruppe; bestehende
   `ac`- und Überschriften-Fälle bleiben grün; ein Test-Stellen-Typ, der nur in der Test-Tabelle
   ergänzt wird, wirkt ohne Änderung an anderen Zeilen.
3. **`rework-outcome.js`** (`node:test`): mit `--escalation-status spec-question`: alle 🔴 mit diesem
   Status → `true`; gemischt → `false`; 🔴-Stelle ohne Rückgabe-Eintrag → `false`; anderer Statuswert
   als Parameter wird genauso ausgewertet; fehlender Parameter → Fehler; ungültiges JSON → Fehler.
4. **Reviewer:** `tests/fixtures/plan-review/` mit Fixture-Spec, Fixture-Plan und Mini-Repo; je ein
   eingebauter Fehler pro Reviewer: fehlendes AC (coverage), Consumes vor Produces (feasibility), Bruch
   mit dem Muster im Mini-Repo (architecture), fehlende Fehlerbehandlung an einer Schnittstelle
   (risks), Platzhalter plus nicht existierende `Modify`-Datei plus `Task 3a` plus Shell-Testbefehl,
   den die Mini-Repo-`CLAUDE.md` verbietet (buildability). Jeder Reviewer meldet seinen Fehler.
5. **Drucktests** (Baseline ohne vs. mit Skill):
   - `plan-writing`, Druck „Spec ist klar, schreib kurz und ohne Code“ → vollständige Code-Schritte;
     bei mehrdeutiger Spec eine Frage an den Menschen statt einer Annahme.
   - `plan-review`, Druck „korrigier den Plan einfach selbst“ → nur Orchestrierung.
6. **Scout:** mit der Aggregation der Reviewer-Fixtures aus Punkt 4 als Eingabe; pro 🔴/🟡-Gruppe 1–3
   Vorschläge und genau eine Zeile „Bevorzugt“, keine 🟢-Gruppe, keine geänderte Datei.
7. **Dogfood:** `plan-writing` auf dieses Dokument, danach `plan-review` auf den entstandenen Plan.

## 12. Akzeptanzkriterien

- **AC-01** `plan-writing` und `plan-review` starten nur per manuellem Aufruf.
- **AC-02** Keine Datei im Plugin erwähnt `superpowers` oder `writing-plans`, und kein Satz ist wörtlich aus `writing-plans` oder `plan-document-reviewer-prompt.md` übernommen.
- **AC-03** Jedes Element der Tabelle in Abschnitt 5 findet sich in der dort genannten Datei.
- **AC-04** `plan-writing` stellt offene Fragen einzeln mit Empfehlung; jede Antwort steht als W-Eintrag in `## Entscheidungen` des Plans, delegierte mit Tag `delegiert`.
- **AC-05** `plan-writing` schreibt genau einen Plan als `plan.md` im Ordner der Spec und überschreibt keine bestehende `plan.md`.
- **AC-06** Der geschriebene Plan folgt Abschnitt 6.1; jeder Task nennt seine AC-IDs.
- **AC-07** `plan-writing` endet mit Plan-Pfad, kopierbarem `/dv-forge:plan-review`-Befehl und Hinweis auf frische Session; es committet nichts.
- **AC-08** Ohne Spec-Argument verwendet `plan-review` die `spec.md` im Ordner des Plans.
- **AC-09** Pro Review startet `plan-review` alle fünf Reviewer in einer Nachricht; keiner erhält Findings früherer Runden.
- **AC-10** `plan-review-coverage` hat nur das Tool `Read`; die anderen vier Reviewer und `plan-rework` haben `Read`, `Grep`, `Glob`, `plan-rework` zusätzlich `Edit`.
- **AC-11** Ein fehlendes oder nur teilweise umgesetztes AC wird immer als 🔴 gemeldet.
- **AC-12** `plan-rework` ändert nie die Spec und nie einen W-Eintrag.
- **AC-13** `plan-rework` schreibt pro bearbeitetem aggregiertem Finding genau einen R-Eintrag und endet mit genau einem JSON-Block im Format aus 7.3.
- **AC-14** Hat jede 🔴-Stelle einer Runde den Status `spec-question`, endet der Loop mit „Spec-Rückfrage in Runde r“; ermittelt wird das durch `rework-outcome.js --escalation-status spec-question`.
- **AC-15** Der Abschlussbericht enthält alle Punkte aus 7.4; es entstehen keine Review-Dateien und kein Commit.
- **AC-16** Während `plan-review` blockt der Guard Lese-, Schreib- und Shell-Zugriffe der Main-Session auf Plan und Spec, außer Aufrufen der Plugin-Skripte; SubAgents werden nicht geblockt.
- **AC-17** Die Generalisierung aus Abschnitt 9 beginnt erst nach vollständiger Umsetzung von `spec-review`; danach laufen alle Spec-Review-Tests weiterhin grün.
- **AC-18** `aggregate-findings.js` normalisiert Stellen über eine Tabelle von Stellen-Typen und fasst `Task 03`, `task 3` und `TASK 3` zu einer Gruppe zusammen; ein neuer Typ braucht nur eine neue Tabellenzeile.
- **AC-19** Alle Node-Tests laufen grün mit `node --test "plugins/forge/tests/*.test.js"`.
- **AC-20** Die Drucktests aus Abschnitt 11 zeigen gegenüber der Baseline das geforderte Verhalten.
- **AC-21** Jede Task-Überschrift im Plan lautet `### Task <n>: <Komponente>` mit ganzzahligem `<n>`, lückenlos ab 1.
- **AC-22** Teilt oder ergänzt `plan-rework` einen Task, ist die Nummerierung danach wieder lückenlos, Verweise im Plan zeigen auf die neuen Nummern, und der R-Eintrag nennt die Zuordnung alt → neu.
- **AC-23** Jede Verifikation im Plan ist ein Shell-Befehl oder ein Tool-Aufruf mit exakten Parametern und verstößt nicht gegen die Projekt-`CLAUDE.md`.
- **AC-24** `rework-outcome.js` erwartet den Eskalations-Status als Parameter `--escalation-status`; ohne Parameter bricht es mit Fehler ab.
- **AC-25** `shared/review-loop/loop.md` nennt kein konkretes Fortschritts-Skript; jeder Orchestrator-Skill legt seines selbst fest.
- **AC-26** Jede `Modify`-Zeile im Plan nennt einen stabilen Anker nach Regel 3 aus 6.1.
- **AC-27** Ein Verzeichnis-Eintrag in `protected` blockt Datei-Tools auf jede Datei darunter, aber keine Datei in einem Geschwister-Verzeichnis mit gleichem Namenspräfix.
- **AC-28** Nach dem letzten Review eines `plan-review`-Laufs startet genau dann einmal `plan-review-scout`, wenn die letzte `STATUS`-Zeile `red` > 0 oder `yellow` > 0 zeigt.
- **AC-29** `plan-review-scout` hat `model: opus` und die Tools `Read`, `Grep`, `Glob`; er ändert keine Datei.
- **AC-30** Die Scout-Antwort enthält pro 🔴- und 🟡-Gruppe 1 bis 3 nummerierte Vorschläge und genau eine Zeile `**Bevorzugt: <Nr>** — <Begründung>`; 🟢-Gruppen erscheinen nicht.
- **AC-31** Der Abschlussbericht enthält den Scout-Abschnitt unverändert oder den Vermerk „Scout ausgefallen“; `shared/review-loop/loop.md` führt den Baustein „Abschluss-Scout“, `spec-review` trägt „Keiner“ ein.
- **AC-32** Endet `plan-review` sauber, nennt der Bericht den Commit-Hinweis für `spec.md` und `plan.md`, den Hinweis auf eine frische Session und den kopierbaren Befehl `/dv-forge:implementation <plan.md>`; der Plan-Kopf nennt denselben Befehl.
- **AC-33** Ein `Read` der Main-Session unterhalb der Plugin-Wurzel wird bei einem Verzeichnis-Eintrag nicht geblockt; `Edit` dort und `Read` auf einen Datei-Eintrag unterhalb der Plugin-Wurzel werden geblockt.

## 13. Entscheidungen

- **P1 · Plan-Skill** — übernimmt `writing-plans` samt Plan-Reviewer-Prompt vollständig, neu formuliert, gleiche Schärfe, ohne Erwähnung; Start mit Spec-Pfad; neu: Fragen an den Menschen.
- **P2 · Alternativen** — ein Plan pro Spec; echte Alternativen werden vorab als Frage entschieden.
- **P3 · Reviewer-Set** — fünf Reviewer: Abdeckung, Machbarkeit, Architektur, Risiken, Baubarkeit; Testverifikation ist Teil der Abdeckung.
- **P4 · Code-Zugriff** — alle Reviewer außer Abdeckung und der Nacharbeiter lesen Code.
- **P5 · Infrastruktur** — Generalisierung erst nach Fertigstellung von `spec-review`; danach teilen beide Skills Skripte und Referenzen.
- **P6 · Name** — `plan-writing` (Alternative `planning`), passend zu `spec-whiteboarding` / `spec-review`.
- **P7 · Ablage** — `plan.md` im Ordner der Spec.
- **P8 · Stopp-Grund Spec-Rückfrage** — Loop endet, wenn alle 🔴 nur über die Spec lösbar sind.
- **P9 · Plan-Kopf** — nennt `/dv-forge:implementation <plan.md>` als Umsetzungs-Befehl (Name von Teilprojekt 3 festgelegt, Abgleich Iteration 2).
- **P10 · Task-Nummern** — verbindlich ganzzahlig und lückenlos; `plan-rework` nummeriert neu statt „3a“. Grund: Teilprojekt 3 zerlegt den Plan per Skript, und `Task n` muss als Stelle eindeutig bleiben.
- **P11 · Fortschrittsprüfung** — `loop.md` neutral, Skript pro Skill; Teilprojekt 3 vergleicht den Git-Stand statt einer Datei.
- **P12 · Stellen-Typen** — Tabelle statt verstreuter Regex; der Typ Dateipfad kommt in Teilprojekt 3 als eine weitere Zeile, nicht schon jetzt (YAGNI).
- **P13 · Eskalations-Status** — `rework-outcome.js` parametrisiert statt einer Kopie pro Stufe.
- **P14 · Tool-Aufrufe** — eine Verifikation darf ein Tool-Aufruf sein; die Projekt-`CLAUDE.md` bestimmt, welcher Weg erlaubt ist.
- **P15 · Anker bei Modify** — Zeilen veralten bei sequentieller Umsetzung; ein Symbol- oder Text-Anker bleibt gültig (Abgleich mit Teilprojekt 3, Iteration 1).
- **P16 · Verzeichnisse im Guard** — `protected` erlaubt Verzeichnisse mit Präfix-Match an Pfadgrenzen, weil der Orchestrator in Teilprojekt 3 auch keinen Code lesen darf (Abgleich mit Teilprojekt 3, Iteration 1).
- **P17 · Scout** — nach dem letzten Review liefert `plan-review-scout` pro 🔴/🟡-Finding 1–3 Vorschläge mit begründetem Favoriten, rein beratend. Nur in `plan-review`; `spec-review` wird nach seiner Umsetzung nachgerüstet, Teilprojekt 3 hat einen eigenen Scout.
- **P18 · Smoke-Test** — wird nach dem Dogfood-Lauf eingetragen.
- **P19 · Abgleich Teilprojekt 3, Iteration 2** — TP3 heißt `/dv-forge:implementation` (Umsetzung) und `/dv-forge:implementation-review` (Review ohne Loop, mit Scout). Übernommen: Umsetzungs-Befehl im Plan-Kopf (P9), Übergabe bei sauberem Plan-Review (AC-32), Leseausnahme für die Plugin-Wurzel im Guard (AC-33). `--escalation-status` bleibt parametrisiert, obwohl TP3 ihn nicht nutzt — kostet nichts und hält `rework-outcome.js` artefakt-neutral. Die Guard-Zeile für `implementation-review` und den Stellen-Typ Dateipfad baut TP3.
- **P20 · Formatfehler des Nacharbeiters** — Statt Neustart (§10) fordert `plan-review` den Nacharbeiter einmal per `SendMessage` auf, nur seinen JSON-Block nachzuliefern; ein Neustart würde R-Einträge doppeln und den Plan erneut ändern. Bleibt das Format falsch, gelten alle Stellen als `unchanged`.
- **P21 · Scout in spec-review** — `spec-review` ist nachgerüstet (Spec-Review-Design B18) und nennt unter „Abschluss-Scout“ `dv-forge:spec-review-scout` statt „Keiner“; AC-31 gilt damit in dieser Form.
