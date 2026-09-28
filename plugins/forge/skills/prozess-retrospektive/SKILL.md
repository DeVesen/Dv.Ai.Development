---
name: prozess-retrospektive
description: Use when a session is ending or finished and the way it went — rounds, token use, blocked or failed tool calls, misunderstandings, interventions by the human, repeated or needless runs, work that could have been cheaper or faster — should be turned into improvements for plugins, skills, CLAUDE.md, hooks, scripts or MCP servers, existing or new. Triggers "retrospektive", "session review", "prozess analyse", "harness verbessern", "was koennen wir verbessern", "wie lief das", "learnings". Never auto-triggers. Opt-out kein-retrospektive.
---

# Prozess-Retrospektive

Du deckst **Lücken** der Session auf, nicht nur in dv-forge, sondern in allem, was mitlief: Plugins, Skills, Hooks, Skripte, MCP-Server, `CLAUDE.md` und die Arbeitsweise selbst. Zwei Richtungen: **Wo hakte es?** (Reibung, Blocker, Missverständnisse) und **Was kostete mehr als nötig?** (wiederkehrende oder unnötige Läufe, die Tokens und damit Geld verbrennen). Neben Verbesserungen am Bestehenden suchst du Ideen für etwas, das es noch nicht gibt.

Ergebnis ist ein Erfahrungsbericht als Datei. Jeder Befund ist so geschrieben, dass ihn jemand ohne jede Kenntnis des Projekts versteht und weitergeben kann. Jede Aussage stützt sich auf eine Zahl oder ein Zitat aus der Session; alles andere kennzeichnest du als `Eindruck`.

## Ablauf
1. **Fakten holen:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --expect dev-mcp,codebase-analyzer` im Projektordner. Es liest das Protokoll dieser Session: Dauer, Eingaben des Menschen, Tokens je Session und Subagent, Tool-Aufrufe, Tool-Fehler, blockierte Aufrufe, Wiederholungen, Skills, Zusammenfassungen, gemessene MCP-Nutzung und Sparpotenzial. Eine andere Session statt `--session` mit `--file <pfad>`. Nur einen Teil der Session mit `--since-command <skill>`: ab dessen letztem Aufruf, mit `--occurrence <n>` ab dem n-ten, jeweils bis vor den nächsten. Die Zahlen kommen aus dem Skript, nicht aus deinem Gedächtnis; den Verlauf liest du nur an den Stellen nach, auf die sie zeigen.
   Liegt der Cache der Hauptsession je API-Anfrage über rund 200k Tokens, empfiehlst du, die Retrospektive in einer frischen Session zu wiederholen, mit `--file <pfad>` aus der Zeile `Quelle:`; das spart dort jede Anfrage den alten Verlauf.
   Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt; ein Exit-Code ungleich 0 bei grünem Lauf zählt nicht. Laufen noch Subagents, wartest du auf sie oder vermerkst sie als offen.
2. **Lücken finden:** Leg die Fakten neben den Verlauf und such die Signale aus `references/signals.md`. Je Stelle: was passiert ist, was es gekostet hat, welche Ursache und was in genau diesem Fall besser gewesen wäre. Frag bei jeder Handarbeit, die sich wiederholt oder deterministisch ist: Was könnte das künftig übernehmen, auch wenn es das noch nicht gibt?
3. **Ziel bestimmen:** Jeder Vorschlag bekommt genau ein Ziel: Plugin, Skill, Agent, `CLAUDE.md`, Hook, Skript oder MCP-Server, mit Namen, falls es ihn gibt, oder `neu:` mit Arbeitsname. Was nur einmal passiert ist und keine Regel braucht, kommt ohne `Ziel:` unter Kleinigkeiten.
4. **Schreiben:** Denselben Aufruf wie in Schritt 1 mit `--skeleton docs/wishes/<YYYY-MM-DD>-<thema>.md` wiederholen; meldet er, die Datei existiere, hängst du `-2` an. Dann die Platzhalter nach `references/report-format.md` per `Edit` füllen. Nicht committen, erst fragen. Nach dem Ja committest du nach `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer, zu der die Session gehört; ist die Workitem-Nummer unklar, fragst du vor dem Commit.
5. **Im Chat:** nur Pfad, Zahl der Befunde, die drei teuersten Reibungspunkte und die drei größten Einsparungen in je einem Satz.

## Häufige Fehler
Vor dem Schreiben und vor dem Speichern: `references/common-mistakes.md`.
