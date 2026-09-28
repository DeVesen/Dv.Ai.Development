# Erfahrungsbericht Spec aus Bestand erarbeiten, reviewen und committen

**Lauf:** Kleine UI-Änderung (Standardposition einer Tabellenspalte verschieben) über `dv-forge:spec-whiteboarding-with-docs` (lädt `dv-forge:spec-whiteboarding` und `dv-forge:domain-modeling`), danach `dv-forge:spec-review` mit 5 Reviewer-Agents und Scout, dann manuelles Einarbeiten der Scout-Vorschläge und Commit über den Skill `commit-message`. Abschließend diese Retrospektive. Session-Modell claude-opus-5-5, Reviewer auf claude-sonnet-5, 2026-09-28.
**Ergebnis:** Verankerte Spec mit 10 ACs, im ersten Review sauber (0 🔴, 2 🟡), Scout-Vorschläge eingearbeitet, committet. Dauer 44 min, Eingaben des Menschen 14 (davon 6 echte, der Rest Subagent-Rückmeldungen), Tokens neu 122k Hauptsession und 521k gesamt / ca. 139k neu in 6 Subagents.

## Zahlen
- Dauer: 44 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 14 · API-Anfragen: 39 · Zusammenfassungen: 0
- Tokens Hauptsession: 122k neu gelesen, 4665k aus dem Cache, 23k Ausgabe
- Tokens Subagents: 521k in 6 Agents
- Tool-Aufrufe: Bash 19, Agent 6, Edit 5, Skill 3, mcp__visualize__read_me 1, mcp__visualize__show_widget 1, Write 1, ToolSearch 1, mcp__codebase-analyzer__review_git_diff 1
- Skills: dv-forge:spec-whiteboarding 1, dv-forge:domain-modeling 1, commit-message 1
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0
- Subagents: Spec profiles review r1 (sonnet) 157k/45k neu · Spec review scout proposals (opus) 136k/22k neu · clarity 65k/22k · feasibility 57k/18k · completeness 53k/16k · consistency 53k/16k

Größte Tool-Ergebnisse:
- 10k Tokens · Read eines Feature-Profils (Profil-Reviewer)
- 3k Tokens · Bash-Lesen der Spaltendefinitionen
- 3k Tokens · Bash `session-facts.js` plus Referenzen
- 2k Tokens · Bash Skill-Referenzen lesen
- 2k Tokens · Read eines zweiten Feature-Profils

Mehrfach gelesene Dateien:
- 6× die Spec (je Reviewer/Scout einmal)
- 2× Glossar-Datei Frontend-Begriffe

Wiederkehrende Shell-Befehle (ab 3×): keine

## MCP-Nutzung

Quelle: Session-Protokoll dieser Session · Hauptagent + 6 SubAgent(s) · 68 Tool-Aufrufe, davon 3 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| visualize | genutzt | 2 | – | – | read_me (1), show_widget (1) | Hauptagent (2) |
| codebase-analyzer | genutzt | 1 | – | – | review_git_diff (1) | Hauptagent (1) |
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

**Relevanz:**
- codebase-analyzer: in dieser Session verzichtbar. Der einzige Aufruf lief auf einen reinen Markdown-Diff und meldete „No .NET or Angular files found in the diff.“
- dev-mcp: verzichtbar. 19 Bash-Aufrufe mit `grep`/`sed`/`git log --grep` fanden die Stelle direkt, ohne Fehler.
- browser-inspector: verzichtbar. In der Spec-Phase läuft keine UI-Prüfung.
- microsoft-learn: verzichtbar. Es wurde keine .NET-API berührt.

## Positiv

1. **Faktensuche vor der ersten Frage hat eine ganze Runde gespart.** Aus der Git-Historie (`git log --grep=<Workitem>`, 12 Treffer) und dem Code kamen Ort, Position und das Verhalten gespeicherter Ansichten, bevor der Mensch gefragt wurde. Der Mensch beantwortete alle 4 Fragen und die Rahmenfrage in einer Zeile; die Frontier war nach 1 Runde leer.
2. **Die Spec war nach 1 Review sauber.** 0 🔴, 4 von 5 Reviewern ohne Findings, keine Nacharbeit nötig.
3. **Fremde Änderungen im Arbeitsverzeichnis wurden nicht mitcommittet.** 10 fremde Löschungen und 1 neue Datei blieben bewusst unstaged; der Commit enthielt nur die Spec.

## Reibung

1. **Retrospektiv-Skript liest standardmäßig die falsche Session.**
   *Situation:* Das Skript `session-facts.js`, das Zahlen aus dem Session-Protokoll zieht, nahm ohne Parameter „die neueste Session“. Das war eine parallel laufende, andere Session (14 min, 6 Eingaben, ganz andere Skills) statt der eigenen (44 min, 14 Eingaben). Erst am Missverhältnis der Skill-Liste fiel es auf.
   *Kosten:* 1 zusätzlicher Skriptlauf (~3k Tokens). Ohne das Auffallen wäre ein falscher Bericht entstanden.
   *Ursache:* „Neueste Datei im Projektordner“ ist bei parallelen Sessions im selben Projekt mehrdeutig.
   *Besser gewesen:* Die Session-ID von Anfang an mitgeben, wie es `dv-forge:spec-review` mit `<SESSION>` bereits tut.
   *Vorschlag:* Der Skill setzt die aktuelle Session-ID in den Aufruf ein (`--file <protokoll der Session>` oder `--session <id>`). Ohne Parameter warnt das Skript, wenn mehrere Protokolle in den letzten Minuten geschrieben wurden.
   *Ziel:* Skript · `dv-forge/scripts/session-facts.js` (liest Session-Fakten für die Retrospektive)
   *Im Projekt:* falsch gelesen: `681be172-…`, richtig: `93d0022f-…`.

2. **„Sauber“ mit offenen 🟡 führt zu manueller Nacharbeit außerhalb des Review-Loops.**
   *Situation:* Der Spec-Review endete „sauber nach Review 1“ mit 2 🟡. Der Scout lieferte fertige Formulierungen. Weil 🟡 keine Nacharbeit auslöst, musste der Mensch eigens anweisen: „Scout-Vorschläge 1 übernehmen, dann committen“. Der Hauptagent übertrug die Texte dann per Hand, ohne erneutes Review.
   *Kosten:* 1 Eingabe des Menschen, 5 Edits im Hauptkontext, keine Prüfung der Änderung.
   *Ursache:* Der Review-Loop kennt für 🟡 nur „berichten“, kein „auf Wunsch übernehmen“.
   *Besser gewesen:* Der Bericht bietet „bevorzugte Scout-Vorschläge übernehmen“ als nächsten Schritt an, und der Nacharbeiter setzt sie um und trägt die Entscheidung ein, wie bei 🔴.
   *Vorschlag:* Option im Abschlussbericht plus Modus für den Nacharbeiter-Agent „nur bevorzugte Scout-Vorschläge“, optional mit einem schmalen Kontroll-Review.
   *Ziel:* Skill · `dv-forge:spec-review` (Orchestrator) und Agent · `dv-forge:spec-rework`

3. **Pflicht-Skizze kostete mehr, als sie brachte.**
   *Situation:* Der Whiteboarding-Skill verlangt eine Skizze über das Visualisierungs-Tool ab zwei Varianten. Dessen Anleitung (`read_me`) lieferte 63k Zeichen, überschritt das Limit und landete in einer Datei, die per `grep` nach CSS-Variablen durchsucht werden musste. Das Ergebnis war eine Reihe beschrifteter Kästchen, die auch als Textzeile verständlich gewesen wäre.
   *Kosten:* 3 Aufrufe (read_me, grep, show_widget), ca. 3–4k Tokens · Eindruck.
   *Ursache:* Die Regel knüpft die Skizze an die Zahl der Varianten, nicht an den Nutzen. Die Tool-Anleitung ist für kleine Skizzen zu groß.
   *Besser gewesen:* Die aktuelle Spaltenreihenfolge als eine Textzeile mit Pfeilen zeigen.
   *Vorschlag:* Skizze nur, wenn Abläufe oder Verzweigungen dargestellt werden. Eine reine Reihenfolge oder Liste bleibt Text. Falls Skizze, nur das nötige Modul laden.
   *Ziel:* Skill · `dv-forge:spec-whiteboarding`

4. **Unklar, ob ein Spec-Commit unter die Worktree-Pflicht fällt.**
   *Situation:* Die Projektregeln verlangen bei bekannter Workitem-Nummer einen eigenen Branch plus Worktree. Die Spec entstand laut Skill „vor Ort“ auf dem Integrationsbranch. Beim Commit musste der Agent anhand eines früheren Commits ableiten, dass Specs dort direkt committet werden.
   *Kosten:* keine Rückfrage, aber eine Ermessensentscheidung ohne Regel · Eindruck.
   *Ursache:* Die Worktree-Regel in `CLAUDE.md` unterscheidet nicht zwischen Doku (Spec/Plan) und Code.
   *Besser gewesen:* Eine ausdrückliche Regel „Specs und Pläne dürfen direkt auf dem Integrationsbranch committet werden“.
   *Vorschlag:* Einen Satz in der Worktree-Regel ergänzen.
   *Ziel:* CLAUDE.md · Projekt-`CLAUDE.md`, Abschnitt „Worktree-Pflicht“
   *Im Projekt:* Branch `dev2`; Präzedenz `b8f8e496 docs(business-partner#275856)`.

## Sparpotenzial

1. **Jede Hintergrund-Rückmeldung weckt den Hauptagenten mit vollem Kontext.**
   *Situation:* 5 Reviewer liefen im Hintergrund. Jede Fertig-Meldung und jede Task-Benachrichtigung löste einen eigenen Turn des Hauptagenten aus, der nur „warte auf die übrigen“ antwortete. Das Protokoll zählt 14 Eingaben, davon 6 echte vom Menschen.
   *Ersparnis:* rund 8 Turns mit je ca. 120k Cache-Lesen, also ungefähr 1M der 4665k Cache-Tokens je Review-Lauf · Eindruck (Aufteilung pro Turn nicht gemessen).
   *Besser gewesen:* Die 5 Reviewer in einer Nachricht parallel im Vordergrund starten (`run_in_background: false`). Der Hauptagent wartet dann einmal und aggregiert direkt.
   *Vorschlag:* Im gemeinsamen Review-Loop die Reviewer parallel im Vordergrund starten, wenn der Orchestrator ohnehin nichts anderes tut. Alternativ die Warte-Turns unterdrücken.
   *Ziel:* Skill · `dv-forge` `shared/review-loop/loop.md` (gemeinsamer Ablauf aller Review-Orchestratoren)

2. **Volle Reviewer-Besetzung für eine 39-Zeilen-Spec.**
   *Situation:* 5 Reviewer und 1 Scout verbrauchten 521k Tokens gesamt (ca. 139k neu) für eine Spec mit 39 Zeilen. 4 der 5 Reviewer fanden nichts. Der Profil-Reviewer war mit 157k gesamt am teuersten, auch weil er ein ganzes Feature-Profil (10k Tokens) las.
   *Ersparnis:* grob 200–300k Tokens je Lauf bei kleinen Specs · Eindruck.
   *Besser gewesen:* Unterhalb einer Größengrenze (z. B. ≤ 12 ACs, nur geänderte Standardwerte) einen kombinierten Reviewer für Vollständigkeit, Konsistenz und Machbarkeit nutzen. Klarheit und Profile laufen separat weiter.
   *Vorschlag:* `prepare.js` misst die Spec-Größe und schlägt eine schlanke Besetzung vor. Der Profil-Reviewer liest nur die relevanten Abschnitte eines Profils statt ganzer Dateien.
   *Ziel:* Skript · `dv-forge/scripts/prepare.js` und Agent · `dv-forge:spec-review-profiles`

3. **Scout auf dem teuersten Modell.**
   *Situation:* Der Scout lief auf claude-opus-5-5 (136k gesamt, 22k neu) für 2 gelbe Formulierungsfragen. Die Reviewer liefen auf claude-sonnet-5.
   *Ersparnis:* ein Modellsprung beim Scout je Lauf; Betrag ohne Preisliste nicht bezifferbar · Eindruck.
   *Besser gewesen:* Der Scout auf demselben Modell wie die Reviewer.
   *Vorschlag:* `model: sonnet` im Frontmatter des Scout-Agents, Opus nur bei 🔴.
   *Ziel:* Agent · `dv-forge:spec-review-scout`

4. **Auto-Code-Review auf reinen Doku-Diff.**
   *Situation:* Der Commit-Skill verlangt vor jedem Commit ein automatisches Code-Review über den MCP-Server `codebase-analyzer`, der Angular/.NET-Diffs prüft. Der Diff enthielt nur eine Markdown-Datei. Nötig waren ToolSearch plus Review-Aufruf, mit dem Ergebnis „No .NET or Angular files found in the diff.“
   *Ersparnis:* 2 Aufrufe und ein Turn je Doku-Commit · Eindruck.
   *Besser gewesen:* `git diff --staged --name-only` prüfen; nur `.md`-Dateien, also Review überspringen.
   *Vorschlag:* Im Skill Schritt 1.5 nur ausführen, wenn der Staged-Diff Code-Dateien enthält.
   *Ziel:* Skill · `commit-message` (projektlokaler Format-Geber für Commits)
   *Im Projekt:* `.claude/skills/commit-message`

## Neue Ideen

- keine; alle Vorschläge betreffen bestehende Werkzeuge.

## Kleinigkeiten

- Das Plugin wechselte während der Session von Version 0.6.1 (Spec-Skills) auf 0.7.0 (Retrospektive). Das war ohne Folgen, wäre bei geänderten Referenzen aber verwirrend.
- `prepare.js` warnte zu „gleichnamigen Profilen an mehreren Orten“ für jede `feature.md`/`module.md` in eigenen Ordnern. Das ist ein Fehlalarm bei der üblichen Ordner-je-Profil-Struktur.
