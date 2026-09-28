# Erfahrungsbericht Prozess-Retrospektive am Ende einer langen Session (Selbstprüfung des Retro-Laufs)

**Lauf:** Prüfung nur des ersten `/dv-forge:prozess-retrospektive`-Durchlaufs dieser Session (Skill, der aus einem Session-Protokoll einen Erfahrungsbericht schreibt), inklusive des anschließenden Commits auf Zuruf; die vorherige Planungsarbeit ist ausgeklammert. Modell claude-opus-5-5, 2026-09-28.
**Ergebnis:** Ein Bericht mit 5 Befunden, geschrieben in einem Durchgang, danach committet. Dauer 15 min (inkl. Wartezeit auf den Menschen), Eingaben des Menschen 2, Tokens neu 16k Hauptsession und 0k Subagents.

**Abgrenzung:** Das Fakten-Skript `session-facts.js` (liest ein Session-Protokoll und zählt Tokens, Tool-Aufrufe, Fehler) kennt keinen Zeitraum-Filter. Für diesen Bericht wurden die Protokollzeilen 372–415 (vom ersten Retro-Befehl bis vor die Nachricht, die diese Prüfung anstieß) in eine Kopie geschnitten und das Skript mit `--file` darauf ausgeführt.

## Zahlen
- Dauer: 15 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 2 · API-Anfragen: 5 · Zusammenfassungen: 0
- Tokens Hauptsession: 16k neu gelesen, 1315k aus dem Cache, 8k Ausgabe
- Tokens Subagents: 0k in 0 Agents
- Tool-Aufrufe: Bash 2, Write 1
- Skills: -
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):
- 3k Tokens · Bash P="/c/Users/S.Reichert/.claude/plugins/cache/dv-ai-development/dv-forge/0.7.0"; 
- 0k Tokens · Bash git add docs/wishes/2026-09-28-plan-writing-fullstack.md && git commit -m "docs(
- 0k Tokens · Write C:\Develop\Trumpf-LacAtlas-main\docs\wishes\2026-09-28-plan-writing-fullstack.md

Mehrfach gelesene Dateien:
- keine

Wiederkehrende Shell-Befehle (ab 3×):
- keine

## MCP-Nutzung

Quelle: `C:\Users\S6939~1.REI\AppData\Local\Temp\claude\C--Develop-Trumpf-LacAtlas-main\c6076fad-a8d0-4201-ab91-04d73c718c50\scratchpad\retro-slice.jsonl` · Hauptagent + 0 SubAgent(s) · 3 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Bash | 2 | – | – | Hauptagent (2) |
| Write | 1 | – | – | Hauptagent (1) |

### Shell-Fallback-Kandidaten (0)

Keine Shell-Aufrufe von dotnet, ng, npm, npx, pnpm, yarn oder git mv.

**Relevanz:**
- dev-mcp: verzichtbar in dieser Session (ein Skript-Aufruf und ein Datei-Schreiben; nichts zu suchen oder zu patchen).
- codebase-analyzer: verzichtbar in dieser Session (Bericht über den Ablauf, kein Code).
- browser-inspector: verzichtbar in dieser Session.
- microsoft-learn: verzichtbar in dieser Session.

## Positiv

1. **Fakten und beide Referenzdokumente in einem einzigen Shell-Aufruf.** Skript-Lauf, Signal-Tabelle, Berichtsformat und Liste bestehender Berichte kamen in 1 Aufruf (3k Tokens); der ganze Retro-Lauf brauchte 3 Tool-Aufrufe und 5 API-Anfragen.
2. **Bericht in einem Durchgang ohne Nacharbeit.** 1 `Write`, keine Korrektur, kein erneutes Lesen; die im Bericht genannte Zahl „5 Unterbrechungen“ hielt der Nachprüfung stand (5 Protokollzeilen vom Typ `silent_turn_reminder`).

## Reibung

1. **Zahlen im Bericht stammten teils aus dem Gedächtnis statt aus dem Skript.**
   *Situation:* Der erste Bericht nannte „Arbeitsverzeichnis wanderte rund zehnmal mit“ und „rund 12 der 17 Minuten ohne Fortschritt“. Keine der beiden Zahlen liefert `session-facts.js`. Die Nachprüfung im Protokoll ergab 24 Zeilen mit einem Verzeichniswechsel-Hinweis statt „rund zehn“; die Minutenzahl ist gar nicht belegbar und war nur bei der zweiten als `Eindruck` markiert.
   *Kosten:* 1 falsche Zahl im Bericht, 2 zusätzliche Aufrufe bei dieser Nachprüfung.
   *Ursache:* Der Skill zählt nur die Signale, die das Skript misst; Zeitpunkte von Harness-Hinweisen (etwa „der Mensch hat lange nichts gehört“) oder Verzeichniswechsel misst es nicht, also schätzte der Agent.
   *Besser gewesen:* 1. Vor dem Schreiben jede Zahl, die nicht im Skript-Ausgang steht, per `grep -c` im Protokoll zählen. 2. Was sich nicht zählen lässt, weglassen oder als `Eindruck` markieren.
   *Vorschlag:* Das Skript zählt zusätzlich Harness-Hinweise nach Art (Stille-Hinweis, Verzeichniswechsel, Kontext-Warnungen) und die längste Strecke ohne Text an den Menschen in Minuten.
   *Ziel:* Skript · `session-facts.js`
   *Im Projekt:* Protokolltyp `attachment` / `silent_turn_reminder`; Verzeichniswechsel als „Environment update · Primary working directory“.

2. **Commit ohne die vorgeschriebene Commit-Konvention und mit eigenmächtig gewählter Workitem-Nummer.**
   *Situation:* Die Projekt-Anweisungen verweisen für Commits auf den Skill `commit-message` (legt das Format `type(scope#nummer)` und die Nummernwahl fest). Beim Commit des Berichts lief dieser Skill nicht (Skills im Abschnitt: 0). Der Agent wählte den Platzhalter „ausdrücklich ungeplant“ selbst, obwohl die Session zu einem echten Workitem gehörte, und bot die Änderung erst im Nachhinein an.
   *Kosten:* 0 direkte Kosten; Risiko einer falschen Zuordnung in der Historie, die nur per Umschreiben korrigierbar ist · Eindruck.
   *Ursache:* „commit den Bericht“ klang wie ein einfacher Befehl; der Skill-Aufruf vor dem Commit ist in den Projekt-Anweisungen nur als Konfigurationszeile genannt, nicht als Pflicht.
   *Besser gewesen:* 1. Skill `commit-message` laden. 2. Bei unklarer Nummer (echtes Workitem vs. Platzhalter) vor dem Commit einmal fragen.
   *Vorschlag:* Im Retro-Skill Schritt 4 um „beim Commit: Nummer der Session übernehmen oder fragen“ ergänzen; alternativ ein Hook, der vor `git commit` prüft, ob `commit-message` in der Session geladen wurde.
   *Ziel:* Skill · `dv-forge:prozess-retrospektive`
   *Im Projekt:* Commit `b7d3b754` mit `docs(wishes#000000)`, Session gehörte zu `#307326`; `CLAUDE.md`-Zeile „Commit-Konvention: commit-message“.

3. **Berichtsformat widerspricht sich bei „Zahlen unverändert“.**
   *Situation:* Das Berichtsformat verlangt, die Skript-Zeilen „unverändert“ zu übernehmen, und zugleich, außerhalb von *Im Projekt:* keine Projektnamen zu nennen. Die Skript-Zeilen enthalten Dateipfade und Befehle mit Projektnamen. Der Agent ersetzte sie im ersten Bericht durch Platzhalter und brach damit „unverändert“.
   *Kosten:* 1 Regelbruch je Bericht; spätere Zusammenführung mehrerer Berichte findet uneinheitliche Zahlen-Abschnitte vor · Eindruck.
   *Ursache:* Zwei Regeln im selben Referenzdokument ohne Vorrang.
   *Besser gewesen:* Zahlen-Abschnitt unverändert lassen und ihn ausdrücklich als Rohdaten kennzeichnen, die von der Außenstehenden-Regel ausgenommen sind.
   *Vorschlag:* Im Berichtsformat festlegen, dass „Zahlen“ und „MCP-Nutzung“ Rohdaten sind und von der Anonymisierung ausgenommen, oder dass das Skript selbst eine anonymisierte Ausgabe erzeugt.
   *Ziel:* Skill · `dv-forge:prozess-retrospektive` (Referenz `report-format.md`)
   *Im Projekt:* erster Bericht `docs/wishes/2026-09-28-plan-writing-fullstack.md`, Abschnitt „Zahlen“, Zeilen unter „Größte Tool-Ergebnisse“.

4. **Kein Zeitraum-Filter im Fakten-Skript, Teil-Retro nur per Handschnitt möglich.**
   *Situation:* Die Bitte, nur den Retro-Durchlauf zu prüfen, ließ sich mit dem Skript nicht direkt erfüllen; es liest immer die ganze Session. Der Agent schrieb ein Einmal-Skript, das die Protokollzeilen zwischen zwei Befehlen herausschneidet, und ließ das Fakten-Skript auf die Kopie laufen.
   *Kosten:* 2 zusätzliche Aufrufe (Optionen suchen, Protokoll schneiden), rund 1 min.
   *Ursache:* Das Skript kennt nur `--file`, `--cwd`, `--expect`.
   *Besser gewesen:* Ein Aufruf mit Filter, etwa „ab dem letzten Aufruf von Skill X“.
   *Vorschlag:* Optionen `--from-command <name>` und `--until-command <name>` (oder `--from-line`/`--to-line`) im Fakten-Skript.
   *Ziel:* Skript · `session-facts.js`
   *Im Projekt:* Schnitt über `/dv-forge:prozess-retrospektive` bis zur Nachricht „nur den … Durchlauf zu prüfen“, Zeilen 372–415 von 437.

## Sparpotenzial

1. **Retro am Ende einer langen Session liest bei jeder Anfrage den ganzen Planungs-Kontext mit.**
   *Situation:* 5 API-Anfragen lasen 1.315k Tokens aus dem Cache, also rund 263k je Anfrage, obwohl der Retro-Lauf selbst nur 16k neue Tokens brauchte. Der Großteil ist der Verlauf der vorherigen Arbeit.
   *Ersparnis:* In einer frischen Session mit `--file` auf das alte Protokoll wären es grob 30–60k Kontext je Anfrage, also etwa 1.000k Cache-Tokens weniger je Retro · Eindruck; dafür fehlt dort das Gedächtnis an den Verlauf, der dann gezielt aus dem Protokoll nachgelesen werden müsste.
   *Besser gewesen:* Bei Sessions über etwa 200k Kontext den Retro in einer frischen Session mit `--file <protokoll>` laufen lassen und nur die Stellen nachlesen, auf die die Zahlen zeigen.
   *Vorschlag:* Der Skill empfiehlt ab einer Kontextgröße den Lauf in frischer Session und nennt den fertigen Aufruf mit Protokollpfad.
   *Ziel:* Skill · `dv-forge:prozess-retrospektive`
   *Im Projekt:* Protokoll `c6076fad-a8d0-4201-ab91-04d73c718c50.jsonl`, 437 Zeilen.

## Neue Ideen

- Keine neue Art Werkzeug; alle Vorschläge betreffen bestehende Skills und Skripte.

## Kleinigkeiten

- Die Dauer von 15 min enthält die Wartezeit, bis der Mensch „commit den Bericht“ schrieb; die aktive Arbeitszeit des Retro-Laufs ist kürzer, das Skript trennt beides nicht.
- Die Chat-Kurzfassung nannte „Größte Reibungspunkte: 1. … 2. Weitere Reibung gab es nicht“ — eine Liste mit einem Leerpunkt statt eines Satzes.
