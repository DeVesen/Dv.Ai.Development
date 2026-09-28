# Erfahrungsbericht Prozess-Retrospektive einer Review-Session

**Lauf:** Prüfung eines einzelnen Durchlaufs von `/dv-forge:prozess-retrospektive`, dem Skill, der aus dem Protokoll einer Session einen Erfahrungsbericht schreibt. Geprüft wurde nur dieser Durchlauf, nicht das Plan-Review davor, das er ausgewertet hat. Session-Modell claude-opus-5-5, 2026-09-28. Weil das Skript `session-facts.js` (liest das Session-Protokoll und fasst Tokens, Tool-Aufrufe und Fehler zusammen) immer die ganze Session auswertet, wurde das Protokoll von Hand auf den Retro-Abschnitt (Zeilen 149–178) zugeschnitten und das Skript mit `--file` auf diesen Ausschnitt gestartet.
**Ergebnis:** Der Durchlauf hat einen Bericht mit 6 Befunden geschrieben (`docs/wishes/2026-09-28-plan-review-loop-2.md`), billig und fehlerfrei. Inhaltlich enthält er aber eine falsche Aussage über das Regelwerk, eine falsch eingeordnete Beobachtung und kleine Abweichungen vom Format. Dauer 1 min, Eingaben des Menschen 1, Tokens neu 16k Hauptsession und 0k Subagents.

## Zahlen
- Dauer: 1 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 1 · API-Anfragen: 3 · Zusammenfassungen: 0
- Tokens Hauptsession: 16k neu gelesen, 315k aus dem Cache, 7k Ausgabe
- Tokens Subagents: 0k in 0 Agents
- Tool-Aufrufe: Bash 1, Write 1
- Skills: -
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Größte Tool-Ergebnisse:
- 3k Tokens · Bash `node session-facts.js …` (Fakten und beide Referenzdateien in einem Aufruf)
- 0k Tokens · Write des Berichts

Mehrfach gelesene Dateien: keine
Wiederkehrende Shell-Befehle (ab 3×): keine

Nachgemessen je API-Anfrage: Der Write-Zug erzeugte 5794 Ausgabe-Tokens, davon 460 Denk-Tokens. Das ist fast die ganze Ausgabe des Laufs.

## MCP-Nutzung
Quelle: zugeschnittener Protokoll-Ausschnitt `retro-slice.jsonl` · Hauptagent + 0 SubAgent(s) · 2 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Bash | 1 | – | – | Hauptagent (1) |
| Write | 1 | – | – | Hauptagent (1) |

Shell-Fallback-Kandidaten: 0.

**Relevanz:**
- dev-mcp: verzichtbar in dieser Session (1 Skriptaufruf, 1 Datei geschrieben, nichts gesucht).
- codebase-analyzer: verzichtbar in dieser Session (Retrospektive wertet ein Protokoll aus, keinen Code).
- browser-inspector: verzichtbar in dieser Session.
- microsoft-learn: verzichtbar in dieser Session.

## Positiv

1. **Fakten und Regeln in einem Aufruf geholt.** Skript, Signal-Liste und Berichtsformat kamen mit einem einzigen Shell-Aufruf (3k Tokens) in den Kontext. Dazu 1 Write, 0 Fehler, 1 min, 16k neue Tokens. Dieses Muster sollte bleiben.
2. **Zahlen aus dem Skript übernommen, nicht geschätzt.** Alle Kopfzahlen des Berichts (7 min, 58k/1304k, 12× Plan gelesen, 3239k beim größten Subagent) stimmen mit der Skriptausgabe überein.

## Reibung

1. **Vorschlag widerspricht einer festen Regel im Regelwerk, und der Bericht behauptet das Gegenteil.**
   *Situation:* Unter Sparpotenzial schlug der Bericht vor, die Reviewer im Vordergrund parallel zu starten, und schrieb dazu: „der Loop-Text erlaubt das“. Der gemeinsame Ablauf der Review-Orchestratoren sagt aber wörtlich: „Reviewer laufen parallel im Hintergrund.“ Die Datei war nie gegengelesen worden, die Aussage kam aus dem Gedächtnis.
   *Kosten:* 1 falscher Satz, der bei Weitergabe zu einer Änderung gegen die Absicht der Autoren führen kann. Die Prüfung, die das aufgedeckt hat, kostete 1 grep.
   *Ursache:* Der Skill verlangt Belege für Zahlen, aber nicht für Aussagen über Regeln anderer Werkzeuge.
   *Besser gewesen:* Vor dem Satz die Regeldatei per grep nach „Hintergrund“ durchsuchen. Dann den Vorschlag als Regeländerung formulieren („Regel X ändern, weil …“), nicht als erlaubte Variante.
   *Vorschlag:* In „Häufige Fehler“ des Skills eine Zeile ergänzen: „Aussage über eine Regel eines anderen Werkzeugs aus dem Gedächtnis → Regeltext zitieren oder `Eindruck`“.
   *Ziel:* Skill · `dv-forge:prozess-retrospektive`
   *Im Projekt:* `docs/wishes/2026-09-28-plan-review-loop-2.md`, Sparpotenzial 3; Regel in `shared/review-loop/loop.md:39`.

2. **Das Fakten-Skript kann nicht auf einen Teil der Session eingeschränkt werden.**
   *Situation:* Der Mensch wollte nur den Retro-Durchlauf prüfen lassen. `session-facts.js` kennt nur `--file`, `--cwd` und `--expect`. Deshalb musste das Protokoll von Hand zerlegt werden: Zeilen suchen, Zeilentypen auflisten, Ausschnitt herausschneiden.
   *Kosten:* 4 zusätzliche Shell-Aufrufe und rund 2 min bei dieser Prüfung. Ohne Zuschnitt hätte das Skript die ganze Session mit 6522k Subagent-Tokens gezählt, die mit dem Retro-Lauf nichts zu tun haben.
   *Ursache:* Das Skript nimmt an, dass eine Session genau einen Arbeitsgang enthält.
   *Besser gewesen:* `node session-facts.js --since-command <Skillname>` (oder `--from <Zeitstempel> --to <Zeitstempel>`) in einem Aufruf.
   *Vorschlag:* Option zum Zuschnitt nach Skill-Aufruf oder Zeitraum. Die Eingaben dann nur innerhalb des Ausschnitts zählen.
   *Ziel:* Skript · `session-facts.js`
   *Im Projekt:* Ausschnitt Zeilen 149–178 des Protokolls `163f8a35-….jsonl`.

3. **Wiederkehrender Zählfehler als Kleinigkeit abgelegt statt als Befund mit Ziel.**
   *Situation:* Der Bericht merkte richtig an, dass das Fakten-Skript Agent-Rückmeldungen und Hintergrund-Benachrichtigungen als „Eingaben des Menschen“ zählt (7 statt 2). Er legte das unter Kleinigkeiten ab. Laut Skill gehört dorthin nur, was einmal passiert und keine Regel braucht. Ein Zählfehler im Skript tritt aber in jeder Session mit Hintergrund-Agents wieder auf.
   *Kosten:* Der Fehler hat kein `Ziel:` und fällt beim späteren Zusammenführen der Wunschliste leicht heraus · Eindruck.
   *Ursache:* Einordnung nach gefühlter Größe statt nach Wiederholung.
   *Besser gewesen:* Als Reibung aufnehmen, mit Ziel Skript `session-facts.js`: Nachrichten mit Agent-Rahmen oder Task-Benachrichtigung nicht als menschliche Eingabe zählen.
   *Vorschlag:* In der Regel des Berichtsformats klarstellen: „Fehler in einem Werkzeug ist nie eine Kleinigkeit, sondern bekommt ein Ziel“.
   *Ziel:* Skill · `dv-forge:prozess-retrospektive` (`references/report-format.md`)
   *Im Projekt:* Kleinigkeit 1 in `docs/wishes/2026-09-28-plan-review-loop-2.md`.

## Sparpotenzial

1. **Fast die ganze Ausgabe steckt im einen Write-Zug.**
   *Situation:* Von 7k Ausgabe-Tokens entfielen 5794 auf das Schreiben der Berichtsdatei. Ein großer Teil davon waren die Blöcke „Zahlen“ und „MCP-Nutzung“, die das Format unverändert aus der Skriptausgabe verlangt. Das Modell tippte sie ab.
   *Ersparnis:* grob 1,5–2k Ausgabe-Tokens je Retrospektive · Eindruck. Außerdem fallen die Abschreibfehler weg, siehe Kleinigkeiten.
   *Besser gewesen:* Das Skript schreibt die Blöcke „Zahlen“ und „MCP-Nutzung“ direkt als Markdown-Gerüst in die Zieldatei. Das Modell ergänzt nur Relevanz, Positiv, Reibung, Sparpotenzial und Ideen.
   *Vorschlag:* Option `--skeleton <Zieldatei>` für `session-facts.js`, die den deterministischen Teil des Berichts vorab schreibt.
   *Ziel:* Skript · `session-facts.js`
   *Im Projekt:* –

## Neue Ideen

- keine; beide Vorschläge betreffen das bestehende Skript `session-facts.js` (Zuschnitt, Gerüst).

## Kleinigkeiten

- Der MCP-Block war nicht „unverändert“: die Quelle war gekürzt und die Write-Zeile zu „je Reviewer 1“ zusammengefasst. Das ist ein Formatverstoß, der sich mit dem Gerüst-Vorschlag erledigt.
- Die Aussage „Spec und Plan schon committet“ kam aus dem Git-Schnappschuss vom Sessionstart, nicht aus einer Prüfung. Jetzt nachgeprüft: stimmt, beide Dateien sind ohne lokale Änderung.
