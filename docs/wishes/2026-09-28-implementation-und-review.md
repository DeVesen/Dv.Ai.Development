# Erfahrungsbericht Umsetzung eines kleinen Frontend-Plans mit anschließendem Implementierungs-Review

**Lauf:** `/dv-forge:implementation` (Controller mit Umsetzer-, Task-Review- und Final-Review-Agents) für einen Plan mit 2 Tasks, danach `/dv-forge:implementation-review` (5 parallele Reviewer + Scout), danach eine Nachbesserung auf Zuruf des Menschen („Scout-Vorschlag 1 für alle drei Findings“). Session-Modell claude-opus-5-5, Subagents sonnet/haiku/opus, 2026-09-28.
**Ergebnis:** Änderung umgesetzt (1 Zeile Produktionscode verschoben, 8 neue Tests), beide Task-Reviews und das Final-Review ohne 🔴, Implementierungs-Review mit 3 × 🔴 (davon 2 nicht zum Diff gehörend), 1 Nachbesserungs-Commit. Dauer 43 min, Eingaben des Menschen 9 (davon 4 echte Eingaben, der Rest Hintergrund-Benachrichtigungen), Tokens neu 119k Hauptsession und ~710k Subagents (9550k inkl. Cache).

## Zahlen
- Dauer: 43 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 9 · API-Anfragen: 42 · Zusammenfassungen: 0
- Tokens Hauptsession: 119k neu gelesen, 5280k aus dem Cache, 24k Ausgabe
- Tokens Subagents: 9550k in 12 Agents
- Tool-Aufrufe: Bash 19, Agent 12, Read 3, PowerShell 1, Write 1
- Skills: -
- Tool-Fehler: 1, davon blockiert oder verweigert: 1 · direkt wiederholte gleiche Aufrufe: 0

Subagents nach Tokens gesamt / neu: Fix shared test helper (implementer, sonnet) 3475k / 114k, 37 Tools, 7 min · Task 2 (implementer, haiku) 2054k / 84k, 6 min · Task 1 (implementer, sonnet) 1457k / 93k, 3 Fehler, 6 min · Review tests (sonnet) 646k / 105k, 7 min · Task 2 Review 370k / 43k · Review acceptance 303k / 38k · Scout 280k / 44k · Final-Review (opus) 279k / 49k · Review design 216k / 34k · Review plan-fidelity 194k / 41k · Task 1 Review 165k / 39k · Review risks 111k / 26k.

Tool-Fehler der Hauptsession:
- Bash: PreToolUse:Bash hook error: dv-forge:implementation-review läuft: Der Orchestrator liest weder Code noch Plan oder Spec.

Größte Tool-Ergebnisse: 9k Tokens (Read der ausgelagerten Ausgabe von plan-tasks/Spec/Plan), 4 × 7k Tokens (Read derselben großen Spec-Datei im Worktree).

Mehrfach gelesene Dateien:
- 11× parameter-table.service.spec.ts
- 7× parameter-table.service.ts
- 5× search-results-grid.component.spec.ts
- 5× review-ed31b22..ded44dc.diff
- 4× Plan, 4× Spec, 4× Umsetzungsbericht
- 3× parameters-page.component.spec.ts
- 2× task-1-brief.md, 2× task-2-brief.md

Wiederkehrende Shell-Befehle: 15× node, 13× grep, 5× git log, 5× find, 4× cat, 4× git add.

## MCP-Nutzung

Quelle: Session-Protokoll f030ede5 · Hauptagent + 12 SubAgent(s) · 200 Tool-Aufrufe, davon 3 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | genutzt | 3 | – | – | test_angular_project (3) | dv-forge:implementation-implementer (2), dv-forge:implementation-review-tests (1) |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Read | 61 | 2 | 1 | implementer (21), task-reviewer (7), scout (6), acceptance (6), final-reviewer (5), design (4), tests (4), Hauptagent (3), plan-fidelity (3), risks (2) |
| Bash | 51 | 3 | 1 | implementer (27), Hauptagent (19), task-reviewer (4), final-reviewer (1) |
| Grep | 24 | – | – | scout (5), implementer (4), acceptance (4), task-reviewer (4), design (3), final-reviewer (3), plan-fidelity (1) |
| Edit | 13 | – | – | implementer (13) |
| Write | 10 | – | – | implementer (4), Hauptagent (1), 5 Reviewer je 1 |
| PowerShell | 8 | – | – | implementer (7), Hauptagent (1) |
| Glob | 3 | – | – | scout (3) |

Shell-Fallback-Kandidaten: 0.

**Relevanz:**
- dev-mcp: gebraucht, aber als Umweg: der Plan schrieb für Tests das Skript `dv-forge: angular-test` vor, drei Agents nahmen stattdessen `test_angular_project` (siehe Reibung 3).
- codebase-analyzer: verzichtbar in dieser Session. Die Änderung betraf eine Zeile, die Agents fanden alles mit Grep.
- browser-inspector: hätte genützt. Das Final-Review nannte als offenen Punkt, die Header-Ausrichtung der verschobenen Spalte „einmal visuell prüfen“, und kein Agent hat das getan.
- microsoft-learn: verzichtbar in dieser Session, es gab keinen .NET-Anteil.

## Positiv

1. **Plan mit vollständigem Code machte die Umsetzung konfliktfrei.** Beide Tasks liefen ohne Fix-Runde durch: Task-Reviews 0 × 🔴 und 0 × 🟡, das Final-Review mit „Übergabe: ja“. Task 2 lief auf dem kleinsten Modell (haiku), weil der Plan jeden Test wörtlich vorgab.
2. **Ledger und Übergaben über Dateien hielten den Hauptkontext klein.** Die Hauptsession las nur 119k Tokens neu, obwohl 12 Subagents liefen. Es gab keine Zusammenfassung des Kontexts.
3. **Reviewer prüften die zurückgestellten Punkte gegen und meldeten sie nicht doppelt.** Alle fünf Reviewer werteten die Datei mit den offenen Punkten aus der Umsetzung aus und meldeten die dort begründeten Punkte nicht erneut, z. B. risks: „nachvollziehbar begründet … daher nicht erneut gemeldet“.

## Reibung

1. **Test-Reviewer meldete fremde Timeouts als rot, obwohl die Suite kurz vorher grün war.**
   *Situation:* Der Umsetzer des zweiten Tasks hatte die komplette Frontend-Testsuite mit 1545 Tests grün gemeldet. Danach kam nur noch ein Doku-Commit. Der Test-Reviewer des Implementierungs-Reviews ließ dieselbe Suite erneut laufen, gleichzeitig mit vier anderen Reviewern, und bekam 3 rote Tests mit „Test timed out in 5000ms“. Alle drei lagen in Dateien außerhalb des Diffs. Er meldete zwei davon als 🔴, weil sein Auftrag verlangt, „jeder rote Test ist red an der Stelle seiner Testdatei“. Der Scout empfahl dann für beide „Nicht ändern“.
   *Kosten:* 2 von 3 🔴 ohne Handlungsbedarf, Status „geprüft, 3 × 🔴 offen“ statt nahezu sauber. Scout-Lauf mit 44k Tokens, und der Mensch muss die Findings lesen und einordnen.
   *Ursache:* Der Reviewer unterscheidet nicht zwischen einem roten Test im geprüften Bereich und einem Timeout in einer fremden Datei. Er lässt fremde rote Tests auch nicht einzeln nachlaufen. Dass der parallele Lauf mit fünf Reviewern die Timeouts auslöst · Eindruck.
   *Besser gewesen:* 1. Nur die Specs aus dem Paket laufen lassen. 2. Den Gesamtlauf nur, wenn seit dem letzten grünen Gesamtlauf Code geändert wurde. 3. Rote Dateien außerhalb des Diffs einzeln wiederholen und nur melden, wenn sie auch einzeln rot sind, sonst als 🟢 „flaky im Gesamtlauf“ vermerken.
   *Vorschlag:* Den Agent so ändern, dass er rote Tests außerhalb des Diffs einzeln verifiziert und nur reproduzierbar rote als 🔴 meldet.
   *Ziel:* Agent · `dv-forge:implementation-review-tests` (Reviewer, der die Testsuite einmal laufen lässt und die Tests des Bereichs bewertet)
   *Im Projekt:* `experiment-dashboard-page.component.spec.ts` („creates and loads experiments on init“) und `experiment-task.component.spec.ts` („should create“), beide mit Timeout. Task 2 meldete vorher „1545 Tests (145 Test Files) — alle grün“.

2. **Plan schrieb das Kopieren eines vorhandenen Test-Helfers vor, erst das Review nach der Umsetzung fand die Doppelung.**
   *Situation:* Der Plan verlangte eine Hilfsfunktion für Tests wörtlich neu anzulegen, „Muster aus“ einer anderen Spec-Datei, in der dieselbe Funktion schon existierte. Umsetzer, beide Task-Reviews und das Final-Review übernahmen das, weil es plangetreu war. Erst der Design-Reviewer im Implementierungs-Review meldete die Doppelung als 🔴. Danach war eine eigene Nachbesserung nötig.
   *Kosten:* Teuerster Subagent der Session, 3475k Tokens gesamt, 114k neu, 37 Tool-Aufrufe, 7 min. Dazu 1 Eingabe des Menschen.
   *Ursache:* Das Plan-Review prüft nicht, ob der Plan vorhandene Logik kopiert, statt sie wiederzuverwenden. Die Reviewer innerhalb der Umsetzung prüfen gegen den Plan und stellen ihn nicht infrage.
   *Besser gewesen:* Schon im Plan die vorhandene Funktion in eine gemeinsame Test-Hilfsdatei ziehen, als eigener kleiner Schritt in Task 1.
   *Vorschlag:* Der Architektur-Reviewer des Plan-Reviews soll bei jedem Code-Block im Plan, der „Muster aus <Datei>“ nennt oder eine gleichnamige Funktion anlegt, nach vorhandenen Gegenstücken suchen.
   *Ziel:* Agent · `dv-forge:plan-review-architecture` (prüft einen Plan auf Passung zur vorhandenen Architektur und zu den Mustern)
   *Im Projekt:* `withoutAngularComponents` in `parameter-table.service.spec.ts`, Original in `search-results-grid.component.spec.ts:170-191`. Die Nachbesserung ist Commit `e3c113b6` mit der neuen Datei `shared/testing/ag-grid-column-defs.testing.ts`.

3. **Vorgeschriebener Testweg wurde von drei Agents umgangen.**
   *Situation:* Plan und Projektregeln schreiben für Tests das Skript `dv-forge: angular-test` vor und verbieten einen „stillen Fallback“. Zwei Umsetzer und der Test-Reviewer nutzten stattdessen das MCP-Tool `test_angular_project` des Servers dev-mcp (liest, patcht und testet Dateien). Einer begründete das mit „entspricht dv-forge: angular-test“.
   *Kosten:* 3 Aufrufe außerhalb des Vorgabewegs. Die Ergebnisse sind nicht vergleichbar, falls das Skript anders filtert oder anders parallelisiert · Eindruck.
   *Ursache:* Kein Hook blockt das MCP-Testtool, wenn ein dv-forge-Skript vorgeschrieben ist. Die Agent-Anweisung ist zu weich.
   *Besser gewesen:* Das Skript über Bash aufrufen, wie in den Schritten des Plans angegeben.
   *Vorschlag:* Einen PreToolUse-Hook für `mcp__dev-mcp__test_angular_project` und `test_dotnet_solution`, wenn die Projekt-`CLAUDE.md` unter „Test:“ ein dv-forge-Skript nennt.
   *Ziel:* Hook · `neu:` Hook · test-weg-guard
   *Im Projekt:* `CLAUDE.md`, Abschnitt dv-forge: „Test: dv-forge: angular-test --root src/frontend“. Test-Konvention 9.

4. **Orchestrator-Hook blockte das Lesen der eigenen Anleitung.**
   *Situation:* Der Skill für das Implementierungs-Review sagt „Lies loop.md und folge ihm“. Der erste Aufruf verkettete `cat <loop.md>` mit dem Start-Skript in einem Bash-Befehl. Der Hook `guard-orchestrator.js` (verhindert, dass der Orchestrator Code, Plan oder Spec liest) blockte das: „Erlaubt sind: ein einzelner Aufruf node … und das Lesen von Plugin-Dateien.“
   *Kosten:* 1 blockierter Aufruf, 1 zusätzliche Runde.
   *Ursache:* Der Skill sagt nicht, dass Plugin-Dateien mit dem Read-Tool zu lesen sind und dass Bash nur einzelne `node`-Aufrufe erlaubt.
   *Besser gewesen:* `loop.md` mit Read lesen und `prepare.js` als einzelnen Bash-Aufruf starten.
   *Vorschlag:* Im Skill beim Start einen Satz ergänzen: „Plugin-Dateien mit Read, Skripte als einzelner `node`-Aufruf ohne Verkettung.“
   *Ziel:* Skill · `dv-forge:implementation-review`
   *Im Projekt:* –

5. **Nachbesserung nach dem Review lief ohne Prozess und ohne Re-Review.**
   *Situation:* Nach dem Review wählte der Mensch „Scout-Vorschlag 1 für alle drei Findings“. Einen Skill dafür gibt es nicht. Der Controller schrieb den Auftrag selbst, startete einen Umsetzer und übergab ohne Re-Review. Der Umsetzer nutzte dabei den falschen Testweg (siehe Punkt 3).
   *Kosten:* Handarbeit im Hauptkontext. Das Ergebnis ist ungeprüft bis zum nächsten vollen Implementierungs-Review, das wieder 5 Reviewer kostet (~1,9M Tokens gesamt in dieser Session).
   *Ursache:* Die Kette endet mit „gewählte Änderungen selbst beauftragen“. Einen Baustein von der Auswahl eines Scout-Vorschlags bis zum Fix mit Re-Review gibt es nicht.
   *Besser gewesen:* Aus Findings-Datei und gewählter Vorschlagsnummer automatisch einen Brief bauen, dann Umsetzer, dann `implementation-re-reviewer` nur auf das Fix-Diff.
   *Vorschlag:* Ein Skill, der Scout-Vorschläge nach Nummer umsetzt und das Fix-Diff re-reviewt.
   *Ziel:* Skill · `neu:` Skill · review-vorschlaege-umsetzen
   *Im Projekt:* Brief im Scratchpad `307623-fix-brief.md`, Commit `e3c113b6`.

## Sparpotenzial

1. **Jeder fertige Hintergrund-Reviewer weckte die teure Hauptsession zweimal.**
   *Situation:* Die fünf Reviewer liefen im Hintergrund. Jeder meldete sich zweimal, einmal mit seinem Bericht und einmal mit einer Fertig-Benachrichtigung. Die Hauptsession, das größte Modell, antwortete jedes Mal mit „warte weiter“. Das sind 10 Runden ohne Arbeit. Die Session zählt deshalb 9 „Eingaben des Menschen“ bei nur 4 echten.
   *Ersparnis:* ~10 API-Anfragen, jede liest den ganzen Hauptkontext aus dem Cache (~120k), also ~1,2M Cache-Tokens pro Review-Runde · Eindruck.
   *Besser gewesen:* Alle fünf Reviewer in einer Nachricht parallel im Vordergrund starten (`run_in_background: false`). Dann wacht die Hauptsession nur einmal auf, wenn alle fertig sind.
   *Vorschlag:* Im gemeinsamen Review-Ablauf parallele Reviewer im Vordergrund starten, oder ein Skript bzw. einen Workflow, der auf alle Ergebnisdateien wartet.
   *Ziel:* Skill · `dv-forge` shared `review-loop/loop.md` (gemeinsamer Ablauf aller Review-Orchestratoren)
   *Im Projekt:* 5 Reviewer in `.forge/review/…/runde-1`.

2. **Kleine Nachbesserung auf mittlerem Modell kostete am meisten.**
   *Situation:* Die Nachbesserung zog eine Funktion aus zwei Testdateien in eine gemeinsame Datei, 3 Dateien und 36 Zeilen. Sie lief auf sonnet mit 37 Tool-Aufrufen und 3475k Tokens gesamt. Das ist mehr als beide Plan-Tasks zusammen ohne Reviews. Die größte Testdatei wurde über alle Agents 11× gelesen.
   *Ersparnis:* ~60 % der Fix-Tokens, wenn der Brief Zeilenbereiche und den Zielcode vorgibt und haiku reicht · Eindruck.
   *Besser gewesen:* Im Brief den Zielinhalt der neuen Datei und die genauen Zeilen der zu löschenden Blöcke mitgeben, dann haiku. Lesen per Zeilenbereich (`read_lines`) statt ganzer Datei.
   *Vorschlag:* Der Brief-Baustein aus Reibung 5 soll Zeilenanker aus dem Finding übernehmen und das Modell nach `model-selection.md` wählen.
   *Ziel:* Skill · `neu:` Skill · review-vorschlaege-umsetzen
   *Im Projekt:* `parameter-table.service.spec.ts` (über 1500 Zeilen), 11× gelesen.

3. **Gesamtlauf der Testsuite im Review ohne neue Information.**
   *Situation:* Die komplette Frontend-Suite lief in Task 2 grün. Seitdem kam nur ein Doku-Commit. Der Test-Reviewer ließ sie trotzdem erneut komplett laufen.
   *Ersparnis:* ~7 min und ~100k neue Tokens des Test-Reviewers, dazu die 2 Schein-🔴 aus Reibung 1.
   *Besser gewesen:* Den Stand des letzten grünen Gesamtlaufs, also Commit und Ergebnis, im Umsetzungsbericht ablegen. Der Reviewer lässt nur laufen, wenn sich seitdem Code geändert hat, sonst nur die Specs aus dem Paket.
   *Vorschlag:* Umsetzung schreibt `letzter-gesamtlauf: <commit> <n>/<n> grün` in den archivierten Bericht, der Test-Reviewer liest das.
   *Ziel:* Agent · `dv-forge:implementation-review-tests`
   *Im Projekt:* Task 2 auf `3e661903`, Review auf `ded44dc4` (nur `docs/plans/…-umsetzung.md` neu).

## Neue Ideen

- **test-weg-guard** (`neu:` Hook): blockt MCP-Testtools, wenn das Projekt ein dv-forge-Testskript vorschreibt; sichtbar an Reibung 3.
- **review-vorschlaege-umsetzen** (`neu:` Skill): setzt gewählte Scout-Vorschläge aus der Findings-Datei als Brief mit Zeilenankern um und re-reviewt nur das Fix-Diff; sichtbar an Reibung 5 und Sparpotenzial 2.
- **worktree-node-modules** (`neu:` Skript-Option in `work.js`): legt bei gleichem Lockfile die Junction auf die Abhängigkeiten des Haupt-Checkouts automatisch an und löst sie vor dem Entfernen des Worktrees. Heute steht das als Handarbeit in einer Memory-Notiz und wurde in dieser Session manuell per PowerShell gemacht.

## Kleinigkeiten

- Das Skript `work.js` erzeugte den Branch-Namen `feature/<nr>-<datum>-<nr>-<slug>`, weil der Slug Datum und Workitem-Nummer schon enthält. Workitem-Nummer doppelt, Abweichung vom Plan; im Ledger als Urteil festgehalten.
- Der erste Rot-Lauf des Task-1-Umsetzers brach mit einem Worker-Timeout ab und wurde einmal wiederholt (3 Tool-Fehler des Agents).
- Offener Punkt „Header-Ausrichtung visuell prüfen“ blieb ohne Agent; ein Browser-Blick über browser-inspector wäre billig gewesen.
