# dv-forge: Planen — Design

2026-09-25 · @DeVesen · Branch `V2` · Status: Entwurf, wartet auf Freigabe

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
- Skill `plan-review` als Orchestrator, fünf Reviewer-Agents, Nacharbeiter `plan-rework`
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
│   └── plan-rework.md                       (opus, Read, Grep, Glob, Edit)
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
5. Der Plan-Kopf verweist auf keinen Ausführungs-Skill (Abschnitt 6.1).

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

> Umsetzung Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

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
- Modify: `exakter/pfad.ext:123-145`
- Test: `tests/exakter/pfad.ext`

**Interfaces:**
- Consumes: <exakte Signaturen aus früheren Tasks>
- Produces: <exakte Namen, Parameter- und Rückgabetypen für spätere Tasks>

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  <vollständiger Testcode>
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `<befehl>` — erwartet: FAIL mit „<meldung>“
- [ ] **Schritt 3: Minimal implementieren**
  <vollständiger Code>
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `<befehl>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add <dateien>` · `git commit -m "<message>"`

## Entscheidungen
- **W · <Kurztitel>** · Mensch | delegiert — <Antwort>
- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>
````

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
| `plan-review-buildability` | Platzhalter nach der Verbotsliste aus `task-rules.md`, Code-Schritte ohne Code, existierende Dateien/Zeilen/Symbole bei `Modify`, Task-Zuschnitt und Schrittgröße, ausführbare Befehle. |

### 7.2 Stelle

`Task <n>` | `AC-<nn>` | `Global Constraints` | exakte Abschnittsüberschrift. Details auf
Schritt-Ebene stehen im Zitat.

### 7.3 Nacharbeiter `plan-rework`

- ändert nur `plan.md`, nie die Spec; liest Code
- schreibt pro bearbeitetem aggregiertem Finding genau einen R-Eintrag im Format aus 6.1
- ändert und entfernt keine W-Einträge
- ist ein Finding nur durch eine Spec-Änderung lösbar: Status `spec-rückfrage`, Plan bleibt an der
  Stelle unverändert
- endet mit genau einem JSON-Block:

```json
{ "results": [ { "location": "Task 3", "status": "changed" } ] }
```

`status` ∈ `changed` | `unchanged` | `spec-question`.

**Stopp-Grund „Spec-Rückfrage“:** `rework-outcome.js` gleicht die Rückgabe mit den aggregierten 🔴
der Runde ab. Hat **jede** 🔴-Stelle den Status `spec-question`, endet der Loop mit
„Spec-Rückfrage in Runde r“.

### 7.4 Abschlussbericht

- Status: `sauber nach Review r` | `Cap erreicht, k × 🔴 offen` | `Stillstand in Runde r` |
  `Spec-Rückfrage in Runde r`
- Anzahl Reviews und Nacharbeiten, ausgefallene Reviewer
- Tabelle der aggregierten Findings des letzten Reviews
- Liste aller Spec-Rückfragen mit dem Hinweis: Spec anpassen → `spec-review` → `plan-review` erneut
- Plan-Pfad

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
2. **`aggregate-findings.js`:** Die Normalisierung von `location` setzt zusätzlich `Task 03`, `task 3`
   und `TASK 3` gleich. Alle übrigen Regeln bleiben.
3. **`rework-outcome.js`** (neu): liest den JSON-Block von `plan-rework` und die aggregierten
   Findings, gibt `all-red-spec-questions: true|false` und die Liste der Spec-Rückfragen aus. Ungültiges
   JSON ist ein Fehler.
4. **Gemeinsame Referenzen:** `finding-format.md`, `severity-rules.md` und `report-format.md` ziehen
   von `skills/spec-review/references/` nach `shared/review-loop/`; der artefakt-neutrale Ablauf wird
   `shared/review-loop/loop.md`. Beide Orchestrator-Skills verweisen per `${CLAUDE_PLUGIN_ROOT}` darauf
   und behalten nur, was zu ihrem Artefakt gehört: Argumente, Reviewer und deren Eingaben,
   Nacharbeiter, zusätzliche Stopp-Gründe, Stellen-Schlüssel.

## 10. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Plan oder Spec fehlt (explizit oder im Ordner des Plans) | Abbruch vor Runde 1, Meldung nennt den Pfad |
| `plan-writing`: Spec fehlt | Abbruch, Meldung nennt den Pfad |
| `plan-writing`: `plan.md` existiert | nachfragen, nichts überschreiben |
| `plan-writing`: Mensch delegiert eine Frage | Empfehlung gilt, W-Eintrag mit Tag `delegiert` |
| Reviewer-Ausgabe nicht im Format | einmal neu starten; danach „ausgefallen“, Runde nicht sauber |
| Rückgabe von `plan-rework` nicht im Format | einmal neu starten; danach gelten alle Stellen als `unchanged`, der Hash-Vergleich entscheidet |

## 11. Tests

1. **Guard** (`node:test`): `plan-review`-Prompt → Marker mit Plan und Spec; Spec im Plan-Ordner wird
   aufgelöst; beide Dateien für die Main-Session geblockt; SubAgent erlaubt; Spec-Review-Fälle
   unverändert grün.
2. **Aggregation** (`node:test`): `Task 03` / `task 3` / `TASK 3` werden eine Gruppe.
3. **`rework-outcome.js`** (`node:test`): alle 🔴 `spec-question` → `true`; gemischt → `false`;
   🔴-Stelle ohne Rückgabe-Eintrag → `false`; ungültiges JSON → Fehler.
4. **Reviewer:** `tests/fixtures/plan-review/` mit Fixture-Spec, Fixture-Plan und Mini-Repo; je ein
   eingebauter Fehler pro Reviewer: fehlendes AC (coverage), Consumes vor Produces (feasibility), Bruch
   mit dem Muster im Mini-Repo (architecture), fehlende Fehlerbehandlung an einer Schnittstelle
   (risks), Platzhalter plus nicht existierende `Modify`-Datei (buildability). Jeder Reviewer meldet
   seinen Fehler.
5. **Drucktests** (Baseline ohne vs. mit Skill):
   - `plan-writing`, Druck „Spec ist klar, schreib kurz und ohne Code“ → vollständige Code-Schritte;
     bei mehrdeutiger Spec eine Frage an den Menschen statt einer Annahme.
   - `plan-review`, Druck „korrigier den Plan einfach selbst“ → nur Orchestrierung.
6. **Dogfood:** `plan-writing` auf dieses Dokument, danach `plan-review` auf den entstandenen Plan.

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
- **AC-14** Hat jede 🔴-Stelle einer Runde den Status `spec-question`, endet der Loop mit „Spec-Rückfrage in Runde r“.
- **AC-15** Der Abschlussbericht enthält alle Punkte aus 7.4; es entstehen keine Review-Dateien und kein Commit.
- **AC-16** Während `plan-review` blockt der Guard Lese-, Schreib- und Shell-Zugriffe der Main-Session auf Plan und Spec, außer Aufrufen der Plugin-Skripte; SubAgents werden nicht geblockt.
- **AC-17** Die Generalisierung aus Abschnitt 9 beginnt erst nach vollständiger Umsetzung von `spec-review`; danach laufen alle Spec-Review-Tests weiterhin grün.
- **AC-18** `aggregate-findings.js` fasst `Task 03`, `task 3` und `TASK 3` zu einer Gruppe zusammen.
- **AC-19** Alle Node-Tests laufen grün mit `node --test "plugins/forge/tests/*.test.js"`.
- **AC-20** Die Drucktests aus Abschnitt 11 zeigen gegenüber der Baseline das geforderte Verhalten.

## 13. Entscheidungen

- **P1 · Plan-Skill** — übernimmt `writing-plans` samt Plan-Reviewer-Prompt vollständig, neu formuliert, gleiche Schärfe, ohne Erwähnung; Start mit Spec-Pfad; neu: Fragen an den Menschen.
- **P2 · Alternativen** — ein Plan pro Spec; echte Alternativen werden vorab als Frage entschieden.
- **P3 · Reviewer-Set** — fünf Reviewer: Abdeckung, Machbarkeit, Architektur, Risiken, Baubarkeit; Testverifikation ist Teil der Abdeckung.
- **P4 · Code-Zugriff** — alle Reviewer außer Abdeckung und der Nacharbeiter lesen Code.
- **P5 · Infrastruktur** — Generalisierung erst nach Fertigstellung von `spec-review`; danach teilen beide Skills Skripte und Referenzen.
- **P6 · Name** — `plan-writing` (Alternative `planning`), passend zu `spec-whiteboarding` / `spec-review`.
- **P7 · Ablage** — `plan.md` im Ordner der Spec.
- **P8 · Stopp-Grund Spec-Rückfrage** — Loop endet, wenn alle 🔴 nur über die Spec lösbar sind.
- **P9 · Plan-Kopf** — kein Verweis auf einen Ausführungs-Skill, bis Teilprojekt 3 einen Namen hat.
