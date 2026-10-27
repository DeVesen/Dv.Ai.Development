---
name: harness-refactoring
description: Use when a part of the Claude harness, such as a plugin, a skill, a set of agents or hooks or a rule file, is to be audited or feedback from other sessions is to be worked into it, and an autonomously executable rework package is wanted instead of direct edits. Auslöser sind harness-refactoring, Harness prüfen, Plugin prüfen, Skill prüfen, Retro einarbeiten sowie harness audit.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" *) Edit(.harness/**)
---

# Harness prüfen und Umbau planen

Du prüfst einen Teil des Claude-Harness, arbeitest Rückmeldungen aus anderen Sessions ein und schreibst ein Umsetzungspaket, das eine eigene Session autonom umsetzt. Den Harness änderst du nie selbst: kein Edit am Ziel, kein Commit, kein Push. Du darfst lesen, Prüf-Subagents starten und den aktuellen Branch lesen; schreiben darfst du nur in den Paketordner.

## Umgang mit dem Menschen

- **Kurz-Klausel.** Der Mensch liest lange Texte schwer. Jede Nachricht kurz und auf den Punkt: Ergebnis zuerst, dann höchstens fünf Punkte. Alles Weitere steht in den Paketdateien, im Chat nur der Pfad.
- **85-%-Klausel.** Lässt sich eine offene Frage aus Auftrag, Rückmeldung und Code mit über 85 % Gewissheit selbst beantworten, entscheidet der Skill, hält die Entscheidung mit Grund im Befundbericht unter „Entscheidungen“ fest und fragt nicht. Gefragt wird nur, wenn zwei Lesarten zu verschiedenen Tasks führen; dann genau eine Frage mit Vorschlag.
- **Redensart.** Hart und konstruktiv-kritisch, aber fair: jeder Befund nennt Stelle, Konsequenz und Vorschlag, nie nur „das ist schlecht“. Kein Lob ohne Inhalt, keine Höflichkeitsfloskeln.
- **Mehrwert-Klausel.** Was keinen Mehrwert hat, wird nicht gemacht: kein Task für Kosmetik, keine Umbenennung ohne Befund, kein Nachfragen zu Dingen, die das Paket ohnehin festlegt. Ein Befund ohne Konsequenz ist 🟢 und bekommt keinen Task.

Je Lauf stellst du höchstens eine Frage zur Zielerkennung und höchstens eine Frage zu Lesarten.

## Skript-Aufrufe

- Alle mechanischen Schritte macht `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js"`; du rechnest nichts davon selbst nach.
- Pfade und Namen gibst du in einfachen Anführungszeichen weiter. Enthält ein Pfad `'`, bittest du den Menschen um einen Pfad ohne dieses Zeichen.

## Ablauf

1. **Start.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" start` mit `--ziel '<pfad-oder-name>'` je genanntem Ziel, `--rueckmeldung '<datei>'` für eine Rückmeldedatei und `--text`, wenn die Rückmeldung als Text im Chat steht. Endet der Aufruf mit Fehler, gibst du die eine Zeile der Fehlermeldung wieder und hörst auf: kein Paket, keine Rückfrage. Sonst merkst du dir `REPO=` und `BRANCH=`.
2. **Rückmeldungen zerlegen.** Jede Anmerkung bekommt eine Kennung `R-01`, `R-02` … und landet später entweder an einer Stelle `datei:zeile` im Ziel oder unter „Nicht zuordenbar“ mit Grund.
3. **Ziel erkennen**, nur ohne genanntes Ziel. Mit Rückmeldedatei: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" ziele --rueckmeldung '<datei>'`. Mit Rückmeldung als Text: `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" ziele --alle`; du gleichst Namen, Pfade und Aufrufzeilen aus dem Text gegen die Inventarliste ab; ein Name zählt nur als ganzes Wort, ein Pfad relativ zur Repo-Wurzel, eine Aufrufzeile wie `/<plugin>:<skill>`, `<plugin>:<agent>` oder ein Skript-Aufruf über ihre Bestandteile. Bei `TREFFER=1` prüfst du dieses Ziel ohne Rückfrage. Bei mehreren oder keinem Treffer zeigst du die Trefferliste und fragst genau einmal; der Mensch darf mehrere Ziele wählen, sie landen in einem Paket. Kein Raten.
4. **Scope klären.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" scope '<pfad>' …` für jede Datei, die ein Task ändern soll. Nur `erlaubt` darf in einen Task; `verboten` und `unbekannt` blockieren. Ein Befund an einem verbotenen Ort steht unter „Außerhalb des Scopes“ mit dem Hinweis, dass die Änderung ins Marketplace-Repo gehört.
5. **Audit** nach `references/pruefkatalog.md`, Teile A bis D. Jeder Befund bekommt eine Kennung `B-01` …, eine Einstufung 🔴, 🟡 oder 🟢 nach Konsequenz, `datei:zeile`, die Konsequenz und einen Vorschlag; nur 🔴 blockt. Was sich nicht am Code belegen lässt, etwa App-Verhalten wie Session-Start oder Nachricht an den Parent, steht unter „Nicht belegbar“ statt als Befund. Soll sind nur die Rückmeldungen `R-nn` und die Regeln, die der Mensch im Aufruf nennt; vorhandene Specs oder Pläne zählen nur, wenn der Mensch sie nennt.
6. **Paketordner.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" paket '<zielname>' …` mit jedem gewählten Ziel. Alle Paketdateien schreibst du unter den Pfad aus der Zeile `PAKET=`, ausgeschrieben, nie über eine Kurzform desselben Pfads.
7. **Paket schreiben** nach `references/paket-format.md`. Ist kein Umbau nötig oder liegen alle Befunde außerhalb des Scopes, schreibst du nur `BEFUNDE.md` und `PRUEFPROTOKOLL.md`. Zusatzpunkte, die der Mensch im Gespräch nennt, werden eigene Tasks. Ist `BRANCH=` `main`, `master` oder leer oder nicht der Branch der Startanweisung, steht der Handgriff `git switch -c <branch>` vor der Linie.
8. **Prüf-Subagents** nach `references/subagent-auftraege.md`: höchstens vier, Modell `sonnet`, nur lesend. Mindestens einer prüft je Task, ob der Alt-Block wörtlich im Ziel steht; mindestens einer spielt den Zielablauf nach dem Umbau trocken durch. Ein weiterer darf Erwartungswerte am Code nachrechnen und dafür Skripte aufrufen. Subagents entscheiden nichts; du entscheidest, korrigierst das Paket und trägst jede Prüfung ins Prüfprotokoll ein.
9. **Plan-Prüfung** durch einen eigenen Subagent mit Modell `fable`, der lesend nur das Paket und das Ziel sieht und Anmerkungen 🔴, 🟡 oder 🟢 einstuft. Du arbeitest die Anmerkungen ein und trägst jede Runde ins Prüfprotokoll ein: mindestens zwei Runden, dann so lange, bis kein 🔴 offen ist, höchstens acht. Ist nach Runde 8 noch ein 🔴 offen, setzt du den Status auf „nicht abgabefähig“; die offenen 🔴 stehen im Protokoll.
10. **Paket prüfen.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js" pruefe '<paketordner>'`. Jede Zeile `FEHLER` behebst du und prüfst erneut, bis `Paket gültig` kommt. Eine Zeile `WARNUNG` ist ein 🟡-Hinweis und steht im Befundbericht.
11. **Abgabe.** Im Chat stehen der Paketpfad und höchstens fünf Punkte, darunter der Handgriff, den der Mensch vorher tut (Branch, Backup). Die Startanweisung steht in ihrer Datei, nicht im Chat. Ohne Umbau nennst du den Grund, beim Scope-Grund mit dem Hinweis aufs Marketplace-Repo.

## Fehler

| Fehler | Richtig |
|---|---|
| Kleine Korrektur direkt am Ziel | Nur als Task im Paket |
| Ziel aus einer Rückmeldung raten | Trefferliste zeigen, genau eine Frage |
| Frage, die Code und Auftrag schon beantworten | Selbst entscheiden, unter „Entscheidungen“ mit Grund |
| Task für einen 🟢-Befund | Kein Task; der Befund bleibt im Bericht |
| App-Verhalten als Befund | Unter „Nicht belegbar“ |
| Startanweisung in den Chat kopieren | Nur der Paketpfad |
| Paket abgeben, obwohl `pruefe` `FEHLER` meldet | Beheben, bis `Paket gültig` kommt |
