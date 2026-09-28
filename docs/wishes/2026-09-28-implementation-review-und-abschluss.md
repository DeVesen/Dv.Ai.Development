# Erfahrungsbericht Implementierungs-Review mit anschließendem Abschluss der Arbeit

**Lauf:** `/dv-forge:implementation-review` (Orchestrator mit 5 parallelen Reviewer-Agents und Abschluss-Scout), danach `/dv-forge:finish-work`. Plugins dv-forge 0.7.0, dev-mcp. Session-Modell claude-opus-5-5, Reviewer auf claude-sonnet-5. Datum 2026-09-28.
**Ergebnis:** Review sauber nach Runde 1 (0 × 🔴, 1 × 🟡). Der Abschluss brach ab, weil die Testsuite wegen fehlender Node-Pakete nicht startete. Dauer 14 min, Eingaben des Menschen 9, Tokens neu 72k Hauptsession und 272k Subagents (2303k gesamt inkl. Cache).

## Zahlen
- Dauer: 14 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 9 · API-Anfragen: 28 · Zusammenfassungen: 0
- Tokens Hauptsession: 72k neu gelesen, 2687k aus dem Cache, 11k Ausgabe
- Tokens Subagents: 2303k in 6 Agents
- Tool-Aufrufe: Bash 15, Agent 6, AskUserQuestion 1, ToolSearch 1, mcp__dev-mcp__build_angular_project 1, mcp__dev-mcp__test_angular_project 1
- Skills: -
- Tool-Fehler: 3, davon blockiert oder verweigert: 1 · direkt wiederholte gleiche Aufrufe: 0

Subagents (nach Tokens): Review tests 1318k (104k neu, 15 Tools, 4 min) · Review acceptance 325k (40k neu) · Review design 180k (27k neu) · Review plan fidelity 166k (41k neu) · Scout 163k (34k neu, Opus) · Review risks 151k (26k neu).

Größte Tool-Ergebnisse:
- 7k Tokens · Read Plan (3×, je Reviewer)
- 6k Tokens · Read Review-Paket-Diff

Mehrfach gelesene Dateien:
- 5× Review-Paket-Diff
- 4× Umsetzungsbericht
- 3× Plan
- 3× Spec

Wiederkehrende Shell-Befehle (ab 3×):
- 10× node
- 4× ls

## MCP-Nutzung

Quelle: `C:\Users\S.Reichert\.claude\projects\C--Develop-Trumpf-LacAtlas-main--claude-worktrees-score-comment-column-position-1a897f\bb871831-2f35-4073-bb81-20746119e85a.jsonl` · Hauptagent + 6 SubAgent(s) · 83 Tool-Aufrufe, davon 4 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | genutzt | 4 | – | 1 | test_angular_project (3), build_angular_project (1) | Hauptagent (2), dv-forge:implementation-review-tests (2) |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Read | 20 | 1 | – | scout (6), tests (4), design (3), plan-fidelity (3), acceptance (2), risks (2) |
| Bash | 18 | 3 | – | Hauptagent (15), tests (3) |
| Grep | 16 | – | – | acceptance (7), design (2), scout (2), risks (2), tests (2), plan-fidelity (1) |
| Write | 5 | – | – | je Reviewer 1 |
| Glob | 4 | – | – | design (2), scout (2) |
| PowerShell | 1 | – | – | tests (1) |

### Shell-Fallback-Kandidaten (1)

- Hauptagent: `cd "<Worktree>/src/frontend" && npx ng test --watch=false ...`

**Relevanz:**
- dev-mcp: gebraucht — Build und Testsuite liefen darüber; die Fehlermeldung beim zweiten Testlauf war aber zu dünn, um die Ursache zu erkennen (siehe Reibung 1).
- codebase-analyzer: verzichtbar in dieser Session — Diff aus einer verschobenen Zeile plus Tests, Grep reichte den Reviewern.

## Positiv

1. **Parallele Reviewer mit Datei-Übergabe hielten den Hauptkontext klein.** Fünf Reviewer liefen gleichzeitig im Hintergrund, das Aggregations-Skript fasste ihre Ergebnisdateien zu einer `STATUS`-Zeile zusammen. Hauptsession nur 72k neue Tokens für den ganzen Loop, Review fertig in rund 5 min.
2. **Zurückgestellte Punkte wurden nicht erneut gemeldet.** Alle fünf Reviewer bekamen den Umsetzungsbericht als „Zurückgestellt“ und meldeten dort schon bewertete Punkte nicht nochmal — ein einziges 🟡, keine zweite Runde.

## Reibung

1. **Node-Pakete des Haupt-Checkouts verschwanden zwischen Review und Abschluss, Abschluss abgebrochen.**
   *Situation:* Der Worktree hat keine eigenen Node-Pakete. Der Test-Reviewer legte deshalb eine Junction auf den Paketordner des Haupt-Checkouts an; die Suite lief damit grün (1545 Tests). Sieben Minuten später startete `finish-work` dieselbe Suite erneut über das Test-Tool des MCP-Servers `dev-mcp` (führt Build/Test/Lint für Angular-Projekte aus). Der Aufruf endete mit Exit 1; die Rückgabe listete nur Warnungen („MaxListenersExceededWarning“, Hinweis auf einen veralteten Builder) und `no tests`, nicht die Ursache. Erst ein direkter Shell-Aufruf zeigte: `Could not find the '@angular/build:unit-test' builder's node package.` — der Paketordner im Haupt-Checkout war leer oder fehlte.
   *Kosten:* 1 abgebrochener Abschluss, 1 Testlauf (~65 s) ohne Ergebnis, 3 Diagnose-Aufrufe; der Mensch muss Pakete neu installieren und `finish-work` erneut starten.
   *Ursache:* Die Junction macht den Worktree abhängig von einem fremden, veränderlichen Ordner. Was ihn geleert hat, ist in der Session nicht sichtbar (vermutlich ein paralleler Lauf im Haupt-Checkout · Eindruck). Dazu reicht `test_angular_project` Warnungen als „errors“ durch und verschluckt die eigentliche Startfehler-Zeile.
   *Besser gewesen:* 1. Vor dem Testlauf in `finish-work` prüfen, ob der Paketordner existiert und den Test-Builder enthält. 2. Fehlt er: sofort mit „Pakete fehlen, `npm ci` ausführen“ stoppen, ohne Testlauf.
   *Vorschlag:* Vorab-Check „Node-Pakete vorhanden“ als Skript, das Test-Reviewer und `finish-work` vor jedem Frontend-Testlauf aufrufen. Zusätzlich im MCP-Tool die erste `Error:`-Zeile immer in `errors` durchreichen und Warnungen getrennt ausweisen.
   *Ziel:* Skript · `neu:` Skript · `check-node-modules` (Aufruf aus `dv-forge:finish-work` und Agent `dv-forge:implementation-review-tests`); zweitrangig MCP · `dev-mcp` (`test_angular_project`)
   *Im Projekt:* Junction `<Worktree>/src/frontend/node_modules -> C:/Develop/Trumpf-LacAtlas-main/src/frontend/node_modules`, angelegt 08:02 vom tests-Reviewer; um 08:12 `ls .../node_modules/@angular/build` → „No such file or directory“. Passt zur Memory „Worktree node_modules-Junction“.

2. **Build-/Test-Befehle im Worktree unbekannt, weil die Projekt-Anleitung nur lokal im Haupt-Checkout liegt.**
   *Situation:* `finish-work` liest Build-, Test- und Lint-Befehl aus der Projekt-Anleitung. Im Worktree kamen alle drei leer zurück, obwohl die Anleitung im Haupt-Checkout Build und Test nennt. Die Anleitung ist absichtlich nicht versioniert und fehlt daher in jedem Worktree. Der Agent musste den Menschen fragen, was laufen soll.
   *Kosten:* 1 Rückfrage an den Menschen (~12 s Wartezeit), Gefahr falscher Befehle.
   *Ursache:* Das Konfig-Skript sucht nur im aktuellen Ordner, nicht im Haupt-Checkout, zu dem der Worktree gehört.
   *Besser gewesen:* Das Skript kennt den Haupt-Checkout bereits (`work.js check` meldete `haupt=`); dort nachlesen und die gefundenen Befehle ohne Rückfrage ausführen.
   *Vorschlag:* `forge-config.js get` fällt bei fehlender Anleitung im Worktree auf die Anleitung des Haupt-Checkouts zurück und meldet das in einer Zeile.
   *Ziel:* Skript · `forge-config.js` (dv-forge, liest Projekt-Einstellungen aus der Anleitung)
   *Im Projekt:* `CLAUDE.md` gitignored (Memory „CLAUDE.md nur lokal“), Abschnitt `## dv-forge` mit `Build: … angular-build --root src/frontend` und `Test: … angular-test --root src/frontend`. Frage: „Build, Test und Lint sind in der forge-config leer. Was soll vor dem Aufräumen des Worktrees laufen?“

3. **Nach dem MCP-Fehler Ausweichen auf direkten Shell-Testlauf.**
   *Situation:* Nach dem unklaren Fehlschlag des Test-Tools rief der Agent `npx ng test` direkt in der Shell auf. Die Projekt-Anleitung verbietet einen stillen Ausweg auf direkte Testaufrufe, wenn ein Test-Werkzeug vorgeschrieben ist.
   *Kosten:* 1 Regelverstoß, ~24 s; brachte aber die entscheidende Fehlerzeile.
   *Ursache:* Das vorgeschriebene Werkzeug lieferte keine brauchbare Diagnose (Reibung 1), die Regel nennt keinen erlaubten Diagnoseweg.
   *Besser gewesen:* Den Fehlschlag mit der dünnen MCP-Meldung melden und fragen, ob ein direkter Diagnoselauf erlaubt ist — oder, mit dem Check aus Reibung 1, gar nicht erst testen.
   *Vorschlag:* In der Regel einen erlaubten Diagnoseweg nennen: nur angekündigt, nur zur Fehlerdiagnose, Ergebnis zählt nie als grün.
   *Ziel:* CLAUDE.md · Abschnitt Test-Konventionen, Punkt 9
   *Im Projekt:* `npx ng test --watch=false 2>&1 | grep -vE "MaxListeners|trace-warnings" | tail -40`.

4. **Plan-Abweichung erst im Review sichtbar, weil der Umsetzungsbericht vor dem letzten Commit geschrieben wurde.**
   *Situation:* Der Umsetzungsbericht deckt die Commits bis zum vorletzten ab. Danach kam noch ein Refactor-Commit, der einen Test-Helfer in eine neue geteilte Datei auslagerte. Der Plan-Treue-Reviewer meldete das als 🟡, der Scout empfahl, genau diese Lücke im Bericht nachzutragen.
   *Kosten:* 1 🟡-Finding, 1 Scout-Lauf (163k Tokens, 34k neu, Opus) für ein reines Doku-Problem.
   *Ursache:* Nach dem Abschlussbericht der Umsetzung wurde weitergearbeitet, ohne Bereich, Commit-Liste und Urteile nachzuziehen.
   *Besser gewesen:* Den Refactor als Urteil in den Bericht schreiben und den Bereich bis HEAD aktualisieren, bevor das Review startet.
   *Vorschlag:* `prepare.js implementation-review` vergleicht den im Bericht genannten Endcommit mit HEAD und warnt, wenn Commits fehlen.
   *Ziel:* Skript · `prepare.js` (dv-forge, stellt die Eingaben für den Review-Loop zusammen)
   *Im Projekt:* Bericht `…-umsetzung.md` nennt „ed31b22c..3e661903“, HEAD war `e3c113b6 refactor(experiment-wizard#307623): Share withoutAngularComponents test helper`.

## Sparpotenzial

1. **Komplette Testsuite zweimal ohne Code-Änderung dazwischen.**
   *Situation:* Der Test-Reviewer ließ die ganze Suite (145 Dateien, 1545 Tests, ~70 s) laufen. Sieben Minuten später startete `finish-work` dieselbe Suite auf demselben Commit erneut; der Agent merkte das in seiner Rückfrage selbst an („Der tests-Reviewer hat sie eben schon grün gesehen“).
   *Ersparnis:* ~1 min Laufzeit und einige k Tokens je Session; hier hätte es zusätzlich den Abbruch vermieden.
   *Besser gewesen:* 1. Review schreibt „Suite grün auf Commit X“ in eine Datei. 2. `finish-work` liest sie und überspringt den Testlauf, wenn HEAD = X und der Arbeitsbaum sauber ist.
   *Vorschlag:* Grüne Prüfläufe mit Commit-Hash protokollieren und in `finish-work` wiederverwenden.
   *Ziel:* Skill · `dv-forge:finish-work` (zusammen mit Agent `dv-forge:implementation-review-tests`)
   *Im Projekt:* HEAD `e3c113b6` in beiden Läufen.

2. **Dieselben Eingabedateien von jedem Reviewer einzeln gelesen.**
   *Situation:* Das Review-Paket wurde 5×, der Umsetzungsbericht 4×, Plan und Spec je 3× vollständig gelesen (je ~6–7k Tokens).
   *Ersparnis:* grob 20–30k neue Tokens je Review-Runde · Eindruck.
   *Besser gewesen:* Jeder Reviewer liest nur, was sein Auftrag braucht; vom Umsetzungsbericht nur den Abschnitt „Zurückgestellt“.
   *Vorschlag:* `prepare.js` schreibt den Zurückgestellt-Abschnitt als eigene kleine Datei `Z`, statt auf den ganzen Umsetzungsbericht zu zeigen.
   *Ziel:* Skript · `prepare.js`
   *Im Projekt:* `Z=…/2026-09-28-307623-score-comment-column-position-umsetzung.md`.

## Neue Ideen

- **check-node-modules** (`neu:` Skript): prüft vor jedem Frontend-Testlauf, ob die Node-Pakete samt Test-Builder vorhanden sind und ob eine Junction auf ein gültiges Ziel zeigt; sichtbar an Reibung 1.

## Kleinigkeiten

- Orchestrator hängte `; echo "EXIT=$?"` an den `prepare.js`-Aufruf, der Hook blockte die Verkettung — 1 verlorener Aufruf.
- Retrospektive wurde in der Review-Session abgelehnt und in neuer Session gestartet; `session-facts.js` griff dort zuerst die neue, fast leere Session und brauchte `--file`.
