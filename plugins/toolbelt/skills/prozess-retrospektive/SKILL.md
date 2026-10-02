---
name: prozess-retrospektive
description: Use when the human types /dv-toolbelt:prozess-retrospektive to turn how a session went into an experience report with improvements for plugins, skills, hooks, scripts, MCP servers, CLAUDE.md and the way of working. Auslöser sind die Wörter Prozess-Retrospektive, Erfahrungsbericht, Sitzungsrückblick, session retrospective und lessons learned.
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js" *) Edit(~/.dv-toolbelt/retro/*)
---

# Prozess-Retrospektive

Du deckst Lücken der Session auf, in allem, was mitlief: Plugins, Skills, Hooks, Skripte, MCP-Server, `CLAUDE.md` und die Arbeitsweise selbst. Zwei Richtungen: **Wo hakte es?** und **Was kostete mehr als nötig?** Wiederkehrende oder unnötige Läufe sind ein Befund, wiederkehrende Handarbeit ein Kandidat für etwas Neues. Jeder Befund ist so geschrieben, dass ihn jemand ohne jede Kenntnis des Projekts versteht.

## Fakten dieser Session

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot --lenient`

## Berichtsformat (aus `references/report-format.md`)

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`

## Ablauf
1. **Fakten prüfen.** Alle Zahlen oben stammen aus dem Skript; du schreibst keine ab und schätzt keine. Steht dort „Fakten nicht verfügbar“, nennst du den Grund und hörst auf. Steht unter `ARGUMENTS` eine andere Protokolldatei (`--file <pfad>`), ein Ausschnitt (`--since-command <befehl>`) oder eine Liste erwarteter MCP-Server (`--expect <server,...>`), holst du die Fakten einmal neu: `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot <Argumente>`. Stammt die Datei aus einem anderen Projekt, hängst du `--cwd <projektordner>` an.
2. **Nachlesen.** Stellen, auf die die Fakten zeigen, liest du über die Zeitleiste nach, nie per Textsuche im Protokoll: `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" --session ${CLAUDE_SESSION_ID} --entry <n>` zeigt Eintrag `<n>` mit seinen Nachbarn; ohne `--entry` kommt die Zeitleiste stückweise.
3. **Urteilen.** Die Messwert-Signale deuten die „Hinweise zu den Signalen“ oben. Diese fünf Urteils-Signale beurteilst du selbst: Rückfrage oder Korrektur durch den Menschen · Skill geladen, aber nicht befolgt · Ergebnis erzeugt, aber nie genutzt · teures Modell oder breiter Lauf, wo ein schmaler reicht · Mensch wartet auf etwas, das parallel laufen könnte. Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt.
4. **Entwurf schreiben.** Ein `Write` an den Pfad aus der Zeile `Entwurf:` oben, im Berichtsformat. „Zahlen“ und „MCP-Nutzung“ lässt du weg; die setzt das Skript ein.
5. **Bericht erzeugen.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --session ${CLAUDE_SESSION_ID} --topic <thema>`, das Thema aus Kleinbuchstaben, Ziffern und Bindestrichen. Meldet es Verstöße, korrigierst du den Entwurf und rufst es erneut auf.
6. **Im Chat** gibst du die Kurzfassung des Skripts wieder. Nicht committen, erst fragen. Nach dem Ja fragst du den Menschen nach Commit-Konvention und Workitem-Kennung und committest erst, wenn beides geklärt ist.

## Wunschliste
Mehrere Berichte führst du zusammen, nachdem `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js"` die Befunde nach Ziel vorsortiert und die MCP-Relevanz gezählt hat.