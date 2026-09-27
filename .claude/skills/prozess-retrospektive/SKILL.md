---
name: prozess-retrospektive
description: Use when a session is ending or finished and the way it went — rounds, token use, blocked or failed tool calls, misunderstandings, interventions by the human — should be turned into improvements for plugins, skills, CLAUDE.md, hooks or MCP servers. Triggers "retrospektive", "session review", "prozess analyse", "harness verbessern", "was koennen wir verbessern", "wie lief das", "learnings". Never auto-triggers. Opt-out kein-retrospektive.
---

# Prozess-Retrospektive

Du bewertest, **wie** die Session lief, nicht was geliefert wurde. Ergebnis ist ein Erfahrungsbericht als Datei, aus dem später eine Wunschliste entsteht. Jede Aussage stützt sich auf eine Zahl oder ein Zitat aus der Session; alles andere kennzeichnest du als `Eindruck`.

## Ablauf
1. **Fakten holen:** `node "<skill-ordner>/scripts/session-facts.js" --expect dev-mcp,codebase-analyzer,build-log-filter` im Projektordner. Es liest das Protokoll der neuesten Session: Dauer, Eingaben des Menschen, Tokens je Session und Subagent, Tool-Aufrufe, Tool-Fehler, blockierte Aufrufe, Wiederholungen, Skills, Zusammenfassungen. Dazu die gemessene MCP-Nutzung: Aufrufe je MCP-Server und nativem Tool samt Agent, erwartete oder verfügbare, aber ungenutzte Server, Shell-Fallback-Kandidaten. Eine andere Session mit `--file <pfad>`.
   Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt; ein Exit-Code ungleich 0 bei grünem Lauf zählt nicht. Laufen noch Subagents, wartest du auf sie oder vermerkst sie als offen.
2. **Reibung finden:** Leg die Fakten neben den Verlauf und such die Stellen aus der Tabelle unten. Je Stelle: was passiert ist, was es gekostet hat (Tokens, Runden, Minuten, Rückfragen), welche Ursache.
3. **Ziel bestimmen:** Jeder Wunsch bekommt genau ein Ziel: Plugin, Skill, Agent, `CLAUDE.md`, Hook oder MCP-Server, mit Datei, falls bekannt. Was nur einmal passiert ist und keine Regel braucht, kommt ohne `Ziel:` unter Kleinigkeiten.
4. **Schreiben:** nach `references/report-format.md` als `docs/wishes/<YYYY-MM-DD>-<thema>.md`. Existiert die Datei, hängst du `-2` an. Nicht committen, erst fragen.
5. **Im Chat:** nur Pfad, Zahl der Wünsche und die drei teuersten Reibungspunkte in je einem Satz.

## Wonach du suchst
| Signal | Typische Ursache |
|---|---|
| Subagent mit vielen neuen Tokens für kleine Aufgabe | zu breiter Auftrag, falsches Modell, fehlende Vorauswahl |
| Tool-Fehler oder blockierter Aufruf, danach Umweg | Hook zu streng, Regel fehlt im Skill, falsches Werkzeug |
| gleicher Aufruf direkt wiederholt | unklares Ergebnis, fehlende Prüfung |
| Rückfrage oder Korrektur durch den Menschen | Missverständnis, fehlende Vorgabe in `CLAUDE.md` oder Skill |
| MCP erwartet, aber 0 Aufrufe | für diese Arbeit verzichtbar oder übersehen; im Bericht je MCP entscheiden |
| Shell-Fallback-Kandidat (`dotnet`, `ng`, `npm` über Bash) | MCP-First umgangen: Hook fehlt, Skill-Regel zu weich oder MCP nicht erreichbar |
| Zusammenfassung des Kontexts | zu viel Text im Hauptkontext statt in Dateien |
| Skill geladen, aber nicht befolgt | Regel zu weich, Form passt nicht zum Fehler |

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Aus dem Gedächtnis schätzen | Zahlen aus `session-facts.js` |
| Alles loben | Positiv nur, was sich lohnt beizubehalten |
| Wunsch ohne Ziel-Datei | Ziel benennen oder `Ziel offen` schreiben |
| Bericht nur im Chat | Datei schreiben; der Chat bekommt die Kurzfassung |
