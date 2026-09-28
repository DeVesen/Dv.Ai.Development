# Erfahrungsbericht Plan-Review-Loop (sauber nach Runde 1)

**Lauf:** `/dv-forge:plan-review` auf einen fertigen Umsetzungsplan (8 Tasks, 19 Akzeptanzkriterien, Fullstack .NET + Angular). Orchestrator-Skill `dv-forge:plan-review` mit Review-Loop aus `shared/review-loop/loop.md`, 5 parallele Reviewer-Agents (coverage, feasibility, architecture, risks, buildability) auf claude-sonnet-5, Hauptsession claude-opus-5-5. Danach `/dv-forge:prozess-retrospektive`. 2026-09-28.
**Ergebnis:** Plan sauber nach Review 1, 0 Findings, 0 Nacharbeiten, kein Scout nötig. Dauer 7 min, Eingaben des Menschen 7 (davon 2 echte Befehle, Rest Agent-Meldungen), Tokens neu 58k Hauptsession und ~399k Subagents (6522k gesamt inkl. Cache).

## Zahlen
- Dauer: 7 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 7 · API-Anfragen: 15 · Zusammenfassungen: 0
- Tokens Hauptsession: 58k neu gelesen, 1304k aus dem Cache, 4k Ausgabe
- Tokens Subagents: 6522k in 5 Agents
- Tool-Aufrufe: Agent 5, Bash 4
- Skills: -
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Subagents (nach Tokens):
- Plan-Review buildability R1 · dv-forge:plan-review-buildability · claude-sonnet-5 · 3239k gesamt · 106k neu · 52 Tools · 0 Fehler · 5 min
- Plan-Review feasibility R1 · dv-forge:plan-review-feasibility · claude-sonnet-5 · 1550k gesamt · 87k neu · 32 Tools · 0 Fehler · 3 min
- Plan-Review risks R1 · dv-forge:plan-review-risks · claude-sonnet-5 · 790k gesamt · 72k neu · 14 Tools · 0 Fehler · 2 min
- Plan-Review architecture R1 · dv-forge:plan-review-architecture · claude-sonnet-5 · 705k gesamt · 70k neu · 17 Tools · 0 Fehler · 2 min
- Plan-Review coverage R1 · dv-forge:plan-review-coverage · claude-sonnet-5 · 236k gesamt · 64k neu · 5 Tools · 0 Fehler · 2 min

Größte Tool-Ergebnisse:
- 5× je 13k Tokens · Read des Plans (docs/plans/2026-09-28-307326-result-status-in-progress.md)

Mehrfach gelesene Dateien:
- 12× docs/plans/2026-09-28-307326-result-status-in-progress.md
- 10× src/frontend/src/app/features/experiment-wizard/parameters/parameters-page/parameters-page.component.ts
- 6× src/frontend/src/app/services/states/parameter-table.service.ts
- 5× docs/specs/2026-09-28-307326-result-status-in-progress.md
- 3× src/backend/LAC.Core/Enums/ResultStatus.cs
- 3× src/backend/LAC.ExperimentService/Services/ResultService.cs
- 3× src/backend/LAC.ExperimentService/Services/ResultStatusBackfillService.cs
- 3× docs/application/glossary/domain-terms.md
- 3× src/frontend/src/app/features/experiment-dashboard/components/experiment-dashboard-status-cell/experiment-dashboard-status-cell.component.scss
- 2× src/backend/tests/LAC.ExperimentService.Tests/Services/ResultStatusBackfillServiceTests.cs

Wiederkehrende Shell-Befehle (ab 3×):
- 3× node

## MCP-Nutzung
Quelle: Session-Protokoll 163f8a35-26e1-4362-99e2-fdc877ae66ec · Hauptagent + 5 SubAgent(s) · 129 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

Verfügbar, aber ungenutzt: 1a59c906-04da-521d-bda7-7f71b9f9e01c, 6f616b42-0ed8-571e-823f-ee4aca6b7ce9, ccd_connectors, ccd_directory, ccd_pr, ccd_session, ccd_session_mgmt, ccd_sidebar, ccd_view, ccd_window, claude-in-chrome, mcp-registry, plugin:context7:context7, plugin_context7_context7, scheduled-tasks, terminal

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Read | 66 | – | – | dv-forge:plan-review-buildability (28), dv-forge:plan-review-feasibility (21), dv-forge:plan-review-architecture (8), dv-forge:plan-review-risks (6), dv-forge:plan-review-coverage (3) |
| Grep | 41 | – | – | dv-forge:plan-review-buildability (20), dv-forge:plan-review-feasibility (9), dv-forge:plan-review-risks (6), dv-forge:plan-review-architecture (6) |
| Write | 5 | – | – | je Reviewer 1 |
| Bash | 4 | – | – | Hauptagent (4) |
| Glob | 3 | – | – | dv-forge:plan-review-buildability (2), dv-forge:plan-review-architecture (1) |

Shell-Fallback-Kandidaten: 0.

**Relevanz:**
- dev-mcp: hätte genützt, weil der Plan 12× komplett gelesen wurde (je 13k Tokens) und `read_lines` gezielt nur die Task-Abschnitte liefern könnte · Eindruck.
- codebase-analyzer: hätte genützt, weil buildability und feasibility zusammen 29 Grep-Aufrufe für Symbol-Existenz nutzten (Helper, Konstanten, Aufrufer); `find_symbol_references`/`find_in_index` beantwortet das direkt.
- browser-inspector: verzichtbar in dieser Session (reines Dokument-Review, keine UI).
- microsoft-learn: verzichtbar in dieser Session (keine API-Fragen offen).

## Positiv

1. **Parallele Reviewer, sauber in einer Runde.** 5 Reviewer liefen gleichzeitig im Hintergrund, 0 Tool-Fehler, 0 blockierte Aufrufe, Gesamtdauer 7 min, 0 Nacharbeiten. Die Aggregation per Skript `aggregate-findings.js` (fasst die JSON-Ergebnisse der Reviewer zusammen und entscheidet den Stopp) lieferte eine eindeutige `STATUS clean=true`-Zeile.
2. **Orchestrator bleibt schlank.** Hauptsession nur 58k neue Tokens und 4k Ausgabe; alle Ergebnisse liefen über Dateien, nicht über den Chat-Kontext.

## Reibung

1. **Commit-Frage nach sauberem Review, obwohl Spec und Plan schon committet sind.**
   *Situation:* Der Skill schreibt als nächsten Schritt fest „Soll ich Spec und Plan jetzt committen?“. Beide Dateien waren laut Git-Log bereits in eigenen Commits (vor dem Review angelegt). Der Orchestrator musste das als eigenen Hinweis ergänzen.
   *Kosten:* 1 potenziell leere Rückfrage an den Menschen; Risiko eines leeren oder doppelten Commits · Eindruck.
   *Ursache:* Der Bericht-Text ist statisch, prüft nicht, ob die Dateien Änderungen gegenüber `HEAD` haben.
   *Besser gewesen:* Vor der Frage `git status --porcelain <Spec> <Plan>` prüfen; bei leerer Ausgabe direkt zum Implementierungsbefehl übergehen.
   *Vorschlag:* `prepare.js` oder ein Abschluss-Skript gibt `DIRTY=<liste>` aus; der Skill fragt nur bei nicht leerer Liste nach dem Commit.
   *Ziel:* Skill · `dv-forge:plan-review` (Orchestrator für das Plan-Review)
   *Im Projekt:* Commits e758e1ec (Spec) und 5c740c02 (Plan) für Workitem 307326.

## Sparpotenzial

1. **Zwei Reviewer prüfen dieselben Code-Anker doppelt.**
   *Situation:* Der Reviewer für Baubarkeit (buildability, prüft Anker, Symbole, Importpfade) und der für Machbarkeit (feasibility, prüft Reihenfolge und Namen zwischen Tasks) haben laut eigenen Berichten fast dieselbe Dateiliste gelesen und dieselben Zitate „vorher“-Code gegen das Repo abgeglichen. Zusammen 84 Tool-Aufrufe, 193k neue Tokens, 4789k inkl. Cache — 73 % aller Subagent-Tokens, bei 0 Findings.
   *Ersparnis:* geschätzt 60–90k neue Tokens und ~1,5–2 Mio. Cache-Tokens je Plan-Review · Eindruck.
   *Besser gewesen:* Anker-Abgleich (Datei existiert, Zeilenbereich passt, Symbol vorhanden) nur einmal machen, das Ergebnis als Datei in den Arbeitsbereich legen, feasibility liest nur diese Datei und prüft die Task-Kette.
   *Vorschlag:* Deterministischen Anker-Check als Skript vorziehen (Modify-Anker, Dateipfade, zitierte Codeblöcke gegen Repo, Symbolnamen per Grep/Index) und dessen Ausgabe beiden Reviewern mitgeben; feasibility-Auftrag auf „Reihenfolge, Abhängigkeiten, Konsistenz zwischen Tasks“ zuschneiden.
   *Ziel:* Skript · `neu:` Skript · plan-anchor-check
   *Im Projekt:* Beide Berichte nennen ResultStatus.cs, ResultService.cs, ResultStatusBackfillService.cs, parameter-table.service.ts, parameters-page.component.ts, experiment-dashboard-*.

2. **Plan wird von jedem Reviewer mehrfach komplett gelesen.**
   *Situation:* Der Plan (~13k Tokens) wurde 12× gelesen, also im Schnitt 2,4× je Reviewer; die Spec 5×. Eine große Frontend-Komponente 10×.
   *Ersparnis:* ~90k Tokens Tool-Ergebnis je Lauf für die Wiederholungen (7 zusätzliche Plan-Reads × 13k) · Eindruck für die Folgekosten im Cache.
   *Besser gewesen:* Plan einmal lesen, danach nur gezielt Abschnitte per Zeilenbereich nachschlagen.
   *Vorschlag:* In den Reviewer-Agents die Regel „Plan einmal ganz lesen, danach nur Ausschnitte per Offset/Zeilenbereich“ ergänzen; optional liefert `prepare.js` eine Task-Inhaltsübersicht mit Zeilennummern.
   *Ziel:* Agent · `dv-forge:plan-review-buildability` (und die übrigen `plan-review-*`-Agents)
   *Im Projekt:* docs/plans/2026-09-28-307326-result-status-in-progress.md 12×, parameters-page.component.ts 10×.

3. **Hauptsession wacht bei jeder Reviewer-Meldung zweimal auf.**
   *Situation:* Jeder der 5 Reviewer erzeugt eine Rückmeldung und eine Abschluss-Benachrichtigung; der Orchestrator antwortet auf jede mit einer Statuszeile, ohne etwas zu tun. 10 Leerlauf-Züge, 1304k Cache-Tokens in der Hauptsession.
   *Ersparnis:* grob die Hälfte der Cache-Tokens der Hauptsession (~600k) · Eindruck.
   *Besser gewesen:* Einmal warten, bis alle Ergebnisdateien existieren, dann aggregieren.
   *Vorschlag:* Reviewer im Vordergrund parallel starten (eine Nachricht, mehrere Agent-Calls, `run_in_background: false`) oder ein Warte-Skript, das bis zu allen `<kurzname>.json` blockiert; der Loop-Text erlaubt das.
   *Ziel:* Skill · `dv-forge:plan-review` bzw. `shared/review-loop/loop.md` (gemeinsamer Ablauf aller Review-Orchestratoren)
   *Im Projekt:* –

## Neue Ideen

- **plan-anchor-check** (`neu:` Skript): prüft deterministisch alle Modify-Anker, Pfade und zitierten Codeblöcke eines Plans gegen das Repo und schreibt eine Ergebnisdatei; entlastet buildability und feasibility (Sparpotenzial 1).

## Kleinigkeiten

- `session-facts.js` zählt Agent-Rückmeldungen und Hintergrund-Benachrichtigungen als „Eingaben des Menschen“ (7 statt 2); verfälscht die Rückfrage-Statistik.
- buildability merkte an, dass die Global Constraints ein bereits vorhandenes Farb-Token als „neu“ bezeichnen; bewusst kein Finding, sprachliche Ungenauigkeit im Plan.
