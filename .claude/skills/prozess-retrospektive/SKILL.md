---
name: prozess-retrospektive
description: Use when a session is ending or finished and the way it went — rounds, token use, blocked or failed tool calls, misunderstandings, interventions by the human, work that could have been cheaper or faster — should be turned into improvements for plugins, skills, CLAUDE.md, hooks, scripts or MCP servers, existing or new. Triggers "retrospektive", "session review", "prozess analyse", "harness verbessern", "was koennen wir verbessern", "wie lief das", "learnings". Never auto-triggers. Opt-out kein-retrospektive.
---

# Prozess-Retrospektive

Du bewertest, **wie** die Session lief, nicht was geliefert wurde, aus zwei Richtungen: **Wo hakte es?** und **Wo lassen sich Zeit, Tokens und Geld sparen?** Das gilt für Bestehendes ebenso wie für Arbeit, für die es noch kein Skript, keinen Skill, Hook oder MCP gibt. Ergebnis ist ein Erfahrungsbericht als Datei, aus dem später eine Wunschliste entsteht. Jede Aussage stützt sich auf eine Zahl oder ein Zitat aus der Session; alles andere kennzeichnest du als `Eindruck`.

## Ablauf
1. **Fakten holen:** `node "<skill-ordner>/scripts/session-facts.js" --expect dev-mcp,codebase-analyzer,build-log-filter` im Projektordner. Es liest das Protokoll der neuesten Session: Dauer, Eingaben des Menschen, Tokens je Session und Subagent, Tool-Aufrufe, Tool-Fehler, blockierte Aufrufe, Wiederholungen, Skills, Zusammenfassungen. Dazu die gemessene MCP-Nutzung: Aufrufe je MCP-Server und nativem Tool samt Agent, erwartete oder verfügbare, aber ungenutzte Server, Shell-Fallback-Kandidaten. Eine andere Session mit `--file <pfad>`.
   Dazu das Sparpotenzial: größte Tool-Ergebnisse, mehrfach gelesene Dateien, wiederkehrende Shell-Befehle.
   Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt; ein Exit-Code ungleich 0 bei grünem Lauf zählt nicht. Laufen noch Subagents, wartest du auf sie oder vermerkst sie als offen.
2. **Reibung und Sparpotenzial finden:** Leg die Fakten neben den Verlauf und such die Signale aus `references/signals.md`. Je Stelle: was passiert ist, was es gekostet hat (Tokens, Runden, Minuten, Rückfragen), welche Ursache. Frag bei jeder Handarbeit, die sich wiederholt oder deterministisch ist: Was könnte das künftig übernehmen, auch wenn es das noch nicht gibt?
3. **Ziel bestimmen:** Jeder Wunsch bekommt genau ein Ziel: Plugin, Skill, Agent, `CLAUDE.md`, Hook, Skript oder MCP-Server, mit Datei, falls bekannt, oder `neu:` mit Arbeitsname. Was nur einmal passiert ist und keine Regel braucht, kommt ohne `Ziel:` unter Kleinigkeiten.
4. **Schreiben:** nach `references/report-format.md` als `docs/wishes/<YYYY-MM-DD>-<thema>.md`. Existiert die Datei, hängst du `-2` an. Nicht committen, erst fragen.
5. **Im Chat:** nur Pfad, Zahl der Wünsche, die drei teuersten Reibungspunkte und die drei größten Einsparungen in je einem Satz.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Aus dem Gedächtnis schätzen | Zahlen aus `session-facts.js` |
| Alles loben | Positiv nur, was sich lohnt beizubehalten |
| Wunsch ohne Ziel-Datei | Ziel benennen oder `Ziel offen` schreiben |
| Bericht nur im Chat | Datei schreiben; der Chat bekommt die Kurzfassung |
| Nur Fehler suchen | Auch teure, aber fehlerfreie Arbeit ist ein Befund |
| Nur Bestehendes verbessern | Wiederkehrende Handarbeit als `neu:` vorschlagen |
