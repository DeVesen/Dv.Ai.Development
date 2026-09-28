# Erfahrungsbericht Plan-Review-Loop für einen kleinen Frontend-Plan

**Lauf:** Zwei Durchläufe `dv-forge:plan-review` (Orchestrator-Skill: startet fünf Reviewer-Subagents parallel, aggregiert ihre Findings per Skript, lässt einen Nacharbeiter den Plan korrigieren und zum Schluss einen Scout Lösungen vorschlagen). Dazwischen hat der Hauptagent die Scout-Vorschläge zweimal selbst eingearbeitet, danach lief der Commit über den Skill `commit-message`. Plugin dv-forge 0.6.1, im Lauf auf 0.7.0 gewechselt. Hauptsession claude-opus-5-5, Reviewer claude-sonnet-5, Nacharbeiter und Scout claude-opus-5-5. 2026-09-28.
**Ergebnis:** Der erste Durchlauf endete nach 2 Reviews und 1 Nacharbeit mit „Stillstand“ (1 × 🔴 offen). Der zweite war nach 1 Review sauber (1 × 🟡). Der Plan ist committet. Dauer 29 min, Eingaben des Menschen 5 (das Skript zählt 21), Tokens neu 167k Hauptsession und rund 8991k gesamt in 18 Subagents.

## Zahlen
- Dauer: 29 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 21 · API-Anfragen: 59 · Zusammenfassungen: 0
- Tokens Hauptsession: 167k neu gelesen, 8268k aus dem Cache, 27k Ausgabe
- Tokens Subagents: 8991k in 18 Agents
- Tool-Aufrufe: Agent 18, Bash 17, Edit 16, Read 2, Skill 1, ToolSearch 1, mcp__codebase-analyzer__review_git_diff 1
- Skills: commit-message 1
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Teuerste Subagents: buildability R1 (erster Durchlauf) 1834k gesamt / 79k neu / 40 Tools, buildability R2 1626k / 71k / 35 Tools, Nacharbeit 1009k / 66k / 35 Tools. Günstigster Reviewer: coverage mit 89k–99k / 4 Tools.

Größte Tool-Ergebnisse: 5 × rund 6k Tokens, jeweils `Read` auf die Plan-Datei.

Mehrfach gelesene Dateien:
- 28× Produktions-Service (Frontend)
- 22× zugehörige Spec-Testdatei
- 19× Plan
- 18× Spec
- 16× Komponenten-Testdatei
- 5× Komponente, 4× Popup-Komponente

Wiederkehrende Shell-Befehle: 5× node, 4× grep.

## MCP-Nutzung

Quelle: `C:\Users\S.Reichert\.claude\projects\C--Develop-Trumpf-LacAtlas-main\5d1d9d15-9a83-49cf-9781-0370f4564532.jsonl` · Hauptagent + 18 SubAgent(s) · 314 Tool-Aufrufe, davon 1 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| codebase-analyzer | genutzt | 1 | – | – | review_git_diff (1) | Hauptagent (1) |
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Read | 128 | 1 | 24 | dv-forge:plan-review-buildability (40), dv-forge:plan-review-feasibility (26), dv-forge:plan-review-risks (17), dv-forge:plan-rework (16), dv-forge:plan-review-architecture (11), dv-forge:plan-review-scout (10), dv-forge:plan-review-coverage (6), Hauptagent (2) |
| Grep | 81 | 4 | 1 | dv-forge:plan-review-buildability (36), dv-forge:plan-review-feasibility (16), dv-forge:plan-review-risks (12), dv-forge:plan-rework (9), dv-forge:plan-review-architecture (6), dv-forge:plan-review-scout (2) |
| Edit | 24 | – | – | Hauptagent (16), dv-forge:plan-rework (8) |
| Bash | 17 | – | – | Hauptagent (17) |
| Write | 16 | – | – | dv-forge:plan-review-buildability (3), dv-forge:plan-review-architecture (3), dv-forge:plan-review-coverage (3), dv-forge:plan-review-feasibility (3), dv-forge:plan-review-risks (3), dv-forge:plan-rework (1) |
| Glob | 8 | – | – | dv-forge:plan-review-buildability (7), dv-forge:plan-review-feasibility (1) |

### Shell-Fallback-Kandidaten (0)

Keine Shell-Aufrufe von dotnet, ng, npm, npx, pnpm, yarn oder git mv.

**Relevanz:**
- codebase-analyzer: in dieser Session verzichtbar. Der einzige Aufruf lief auf einen Diff, der nur aus Markdown bestand, und lieferte „No .NET or Angular files found in the diff.“
- dev-mcp: verzichtbar. Die Reviewer lesen gezielte Zeilenbereiche auch mit dem nativen `Read`, ohne Fehlschläge.
- browser-inspector: verzichtbar, es gab keine UI-Arbeit.
- microsoft-learn: verzichtbar, kein .NET im Plan.

## Positiv

1. **Ergebnisse laufen über Dateien, Aggregation per Skript.** Alle 15 Reviewer-Läufe schrieben ihre JSON-Datei beim ersten Versuch, `failed=-` in allen drei `STATUS`-Zeilen. Kein Nachfordern war nötig, und die Hauptsession hatte 0 Tool-Fehler.
2. **Scout-Vorschläge sind direkt übernehmbar.** Der Mensch übernahm dreimal den bevorzugten Vorschlag ohne Rückfrage („Übernimm die bevorzugten Scout-Vorschläge 1 und 1“, „Übernimm Scout-Vorschlag 1, dann committen“). Jeder Vorschlag enthielt Code, Zeilenanker und die nachzuziehenden Stellen. Das Einarbeiten kostete den Hauptagenten 16 Edits und keine Suche.
3. **Günstige Reviewer bleiben günstig.** coverage kam mit 4 Tool-Aufrufen und rund 30k neuen Tokens aus, architecture mit 7 bis 10. Dieser Zuschnitt lohnt sich.

## Reibung

1. **Nacharbeit schließt nur den genannten Teil eines Kriteriums, der nächste Reviewer findet den nächsten Teil, der Loop meldet Stillstand.**
   *Situation:* Ein Akzeptanzkriterium verlangte, dass ein Wert an vier Stellen der Oberfläche gleich erscheint. Der Coverage-Reviewer bemängelte in Runde 1 nur die fehlende Prüfung für Stelle 3. Der Nacharbeiter ergänzte genau diese Prüfung. In Runde 2 bemängelte ein frischer Coverage-Reviewer die fehlende Prüfung für Stelle 2, die in Runde 1 niemand genannt hatte. Das Skript `rework-outcome.js progress` (vergleicht die Findings zweier Runden) meldete `PROGRESS false`, weil wieder genau 1 × 🔴 an derselben Stelle offen war. Der Loop brach nach 1 von 3 möglichen Nacharbeiten ab.
   *Kosten:* 1 komplette Review-Runde (5 Reviewer, rund 2800k Tokens gesamt), 1 Nacharbeit (1009k), 1 Scout (212k), 1 Eingabe des Menschen und 1 kompletter zweiter Durchlauf mit 5 frischen Reviewern (rund 2900k gesamt), um die zweite Lücke zu schließen.
   *Ursache:* Der Reviewer prüft ein Kriterium mit mehreren Teilaussagen nicht Teil für Teil. Der Nacharbeiter behebt nur den Wortlaut des Findings und nicht das ganze Kriterium. Die Fortschrittsprüfung vergleicht die Stelle (Kriterium-ID) und nicht den Inhalt.
   *Besser gewesen:* In Runde 1 alle vier Stellen des Kriteriums einzeln gegen die genannten Tests abhaken. Der Nacharbeiter hätte dann beide fehlenden Prüfungen in einer Nacharbeit ergänzt, und Runde 2 wäre sauber gewesen.
   *Vorschlag:* (a) Der Coverage-Reviewer zerlegt jedes Kriterium in seine Teilaussagen und meldet je fehlender Teilaussage ein Finding. (b) Der Nacharbeiter prüft bei jedem Coverage-Finding das ganze Kriterium und nicht nur den zitierten Teil. (c) Die Fortschrittsprüfung wertet ein Finding an derselben Stelle mit anderem Inhalt als Fortschritt.
   *Ziel:* Agent · `dv-forge:plan-review-coverage` (prüft einen Plan gegen die Akzeptanzkriterien der Spec); zusätzlich `dv-forge:plan-rework` und Skript `rework-outcome.js`
   *Im Projekt:* AC-08 („ein Wert, Sync“: Comment-Spalte, Score-Popup, Result-Seite, Hover-Tooltip). R1 bemängelte den Tooltip, R2 das Popup (`ScoreCellEditorComponent`).

2. **Buildability-Reviewer prüft Werkzeug-Interna statt nur die Plan-Anker.**
   *Situation:* Der Reviewer, der prüfen soll, ob der Plan ohne Kontext abarbeitbar ist, war in beiden Durchläufen der teuerste Subagent. Er nutzte 40 bzw. 35 Tools, las unter anderem die Typdefinitionen einer Drittbibliothek in `node_modules` und die Testdatei des dv-forge-Testskripts, um die Befehlssyntax zu belegen. Ein dritter Lauf desselben Reviewers kam mit 14 Tools und 348k aus.
   *Kosten:* rund 3100k Tokens gesamt über die zwei teuren Läufe, etwa das Fünffache des günstigen Laufs. Dazu 5 min Wartezeit, die jeweils die ganze Runde aufhielten.
   *Ursache:* Der Auftrag grenzt nicht ein, was schon gesichert ist. Welche Testbefehle erlaubt sind, steht in der Projektkonfiguration, trotzdem leitet der Reviewer es aus dem Quellcode des Plugins ab. · Eindruck
   *Besser gewesen:* Die erlaubten Befehle aus `forge-config.js get Test` übernehmen und nur die Dateianker und Code-Blöcke des Plans gegen das Repo prüfen. Das hätte ungefähr die 14 Tools des günstigen Laufs gebraucht.
   *Vorschlag:* Der Orchestrator gibt dem Buildability-Reviewer die erlaubten Build-, Test- und Lint-Befehle als Eingabezeile mit. Der Agent-Prompt verbietet Recherchen in Plugin-Quellen und in `node_modules`, außer ein Plan-Schritt importiert etwas, das im Projektcode nirgends vorkommt.
   *Ziel:* Agent · `dv-forge:plan-review-buildability` (prüft Platzhalter, Anker, Befehle, Task-Zuschnitt)
   *Im Projekt:* Gelesen wurden `node_modules/ag-grid-community/dist/types/src/main.d.ts` und `toolchain-angular-test.test.js`.

3. **Scout-Vorschläge werden außerhalb des Loops eingearbeitet und landen ungeprüft im Commit.**
   *Situation:* Nach dem sauberen zweiten Durchlauf übernahm der Hauptagent den Scout-Vorschlag, einen Task in sieben Schritte aufzuteilen, und committete direkt. Diese Umstrukturierung hat kein Reviewer mehr gesehen.
   *Kosten:* 0 Tokens, dafür das Risiko eines ungeprüften Plans in der Umsetzung · Eindruck
   *Ursache:* Die Skill-Vorgabe „sauber → committen?“ rechnet nicht damit, dass zwischen Bericht und Commit noch geändert wird.
   *Besser gewesen:* Nach der Umstrukturierung einen einzigen Buildability-Reviewer auf den geänderten Task laufen lassen und erst dann committen.
   *Vorschlag:* Der Plan-Review-Skill bietet nach „sauber“ mit offenen 🟡 an, die Scout-Vorschläge durch den Nacharbeiter einarbeiten zu lassen, mit einem schmalen Nach-Review nur der betroffenen Reviewer.
   *Ziel:* Skill · `dv-forge:plan-review`
   *Im Projekt:* Commit `ed31b22c`, Entscheidungseintrag „R3 · Task 2“.

## Sparpotenzial

1. **Hauptsession wacht für jeden Reviewer zweimal auf.**
   *Situation:* Jeder Hintergrund-Subagent erzeugt eine Übergabe-Nachricht und eine Abschluss-Benachrichtigung. Der Orchestrator antwortet auf beide mit einem Satz („warte noch auf …“). Bei 15 Reviewern waren das rund 30 Züge ohne Arbeit, bei 59 API-Anfragen insgesamt.
   *Ersparnis:* Die Hauptsession las 8268k Tokens aus dem Cache. Etwa die Hälfte davon entfällt geschätzt auf diese Warte-Züge, also rund 4000k Cache-Tokens je Session. · Eindruck
   *Besser gewesen:* Die Reviewer starten und dann ein einziger Wartebefehl, der zurückkehrt, sobald alle erwarteten Ergebnisdateien existieren.
   *Vorschlag:* Ein Skript `wait-results.js --dir <D> --expect <liste> --timeout <s>`, das der Orchestrator über `Monitor` oder als Hintergrund-Bash startet. Der Loop reagiert dann nur noch auf dessen Ende.
   *Ziel:* Skript · `neu:` Skript · wait-results
   *Im Projekt:* `.forge/plan-review/<slug>/runde-<r>/*.json`

2. **Jeder Reviewer liest dieselben Dateien neu.**
   *Situation:* In beiden Durchläufen lasen 5 Reviewer, Nacharbeiter und Scout dieselben fünf Dateien jeweils selbst: Service 28×, Testdatei 22×, Plan 19×, Spec 18×, Komponenten-Test 16×. Alle Reviewer prüften erneut dieselben Zeilenanker. Fünf Berichte bestätigen wörtlich dasselbe, etwa „Zeilen 862-876 und 1301-1307 stimmen exakt“.
   *Ersparnis:* geschätzt 30 bis 40 % der rund 9000k Subagent-Tokens · Eindruck
   *Besser gewesen:* Vor Runde 1 eine Datei mit den Plan-Ankern samt Ausschnitten und „stimmt/stimmt nicht“ erzeugen, die alle Reviewer als Eingabe lesen.
   *Vorschlag:* Ein Skript, das alle `Datei:Zeile`-Anker eines Plans deterministisch extrahiert und die Ausschnitte in `<W>/anchors.md` schreibt. Die Reviewer bekommen diese Datei als zusätzliche Eingabe.
   *Ziel:* Skript · `neu:` Skript · plan-anchors
   *Im Projekt:* `parameter-table.service.ts`, `parameter-table.service.spec.ts`, `parameters-page.component.spec.ts`

3. **Zweiter Durchlauf startet alle fünf Reviewer, obwohl nur zwei Stellen geändert waren.**
   *Situation:* Nach dem Einarbeiten von zwei kleinen Scout-Vorschlägen (ein Test um drei Zeilen erweitert, ein Halbsatz in den Vorgaben) lief der komplette Loop neu. architecture, risks und feasibility meldeten wie zuvor 0 Findings.
   *Ersparnis:* rund 1400k Tokens gesamt (architecture 169k, risks 310k, feasibility 898k) und etwa 2 min.
   *Besser gewesen:* Nur coverage und buildability erneut laufen lassen, weil nur deren Findings betroffen waren.
   *Vorschlag:* `plan-review` akzeptiert `--only <reviewer>` bzw. wählt die Reviewer automatisch aus dem Diff seit dem letzten Review und den offenen Findings.
   *Ziel:* Skill · `dv-forge:plan-review`

4. **Automatisches Code-Review vor einem reinen Doku-Commit.**
   *Situation:* Der Skill `commit-message` (legt das Format der Commit-Nachricht fest und verlangt vorher ein Auto-Review) ließ `review_git_diff` auf einem Diff laufen, der nur aus einer Markdown-Datei bestand.
   *Ersparnis:* 1 ToolSearch und 1 MCP-Aufruf je Doku-Commit, gering.
   *Besser gewesen:* Bei einem Diff ohne Code-Dateien das Review überspringen.
   *Vorschlag:* Im Skill Schritt 1.5 auslassen, wenn `git diff --staged --name-only` keine Code-Endungen enthält.
   *Ziel:* Skill · `commit-message`

## Neue Ideen

- **wait-results** (`neu:` Skript): wartet blockierend auf alle Ergebnisdateien einer Review-Runde, damit die Hauptsession nicht für jeden Reviewer aufwacht (Sparpotenzial 1).
- **plan-anchors** (`neu:` Skript): extrahiert die Code-Anker eines Plans einmal je Runde in eine Datei für alle Reviewer (Sparpotenzial 2).

## Kleinigkeiten

- `session-facts.js` zählt 21 „Eingaben des Menschen“. Tatsächlich waren es 5, Übergaben von Subagents und Benachrichtigungen zählen offenbar mit.
- Das Plugin wechselte während der Session von 0.6.1 auf 0.7.0. Der zweite Aufruf nutzte 0.7.0, der Orchestrator musste `loop.md` und `report-format.md` neu lesen.
- Parallel aktive Stil-Hooks (Kurz-Stil, ADHD-Ausgaberegeln) stehen im Widerspruch zum Pflicht-Berichtsformat. `report-format.md` klärt den Vorrang ausdrücklich, das funktionierte.
