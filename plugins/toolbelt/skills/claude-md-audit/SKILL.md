---
name: claude-md-audit
description: Use when a CLAUDE.md is to be reviewed, shortened, cleaned up or extended, or when a new rule is supposed to go into it. Auslöser sind CLAUDE.md prüfen, CLAUDE.md kürzen, CLAUDE.md aufräumen, CLAUDE.md erweitern, Regel in die CLAUDE.md, CLAUDE.md zu lang sowie audit CLAUDE.md und trim CLAUDE.md.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" *)
---

# CLAUDE.md prüfen

Ausgabe Deutsch, knapp, als Liste. Prüfen und Umbau gemeinsam mit dem Menschen; nie still umschreiben, nie committen.

## Leitbild

- Die CLAUDE.md ist ein gesetztes Rahmenkorn für Agenten und Subagenten, kein Dokument. Leser ist Claude, nicht der Mensch.
- Wenig Zeichen sind wenig Token, bei bestem Nutzen.
- Ausführliches gehört in einen Skill oder eine Referenzdatei; in der CLAUDE.md steht nur der Zeiger darauf.
- Ein Eintrag ist ein kurzer Punkt im Stil einer Checkliste: Imperativ, Fragmente erlaubt.

## Skript-Aufrufe

- Pfade (`<datei>`, `<pfad>`, `<backup>`) gibst du in einfachen Anführungszeichen weiter, wie unten gezeigt; so bleibt ein Pfad mit Leerzeichen in Git Bash und PowerShell ein Wort.
- Enthält ein Pfad `'`, bittest du den Menschen um einen Pfad ohne dieses Zeichen (etwa eine Kopie der Datei an einem anderen Ort) und rufst das Skript erst danach auf.

## Geschützte Blöcke

- Geschützt ist nur, was der Mensch nennt: je Block ein Start-Text und ein End-Text (Marker). Ohne Nennung rätst du keine Blöcke.
- Die Zeilen von Start bis Ende, Marker eingeschlossen, änderst du nicht, auch nicht bei Pauschalfreigabe („alle ok“). Ein Befund darin ist ein Vorschlag an den Besitzer des Blocks, kein Edit.
- Marker gibst du in einfachen Anführungszeichen weiter. Enthält ein Marker `'`, `"`, `$` oder einen Backtick, bittest du den Menschen um einen Marker ohne diese Zeichen und rufst das Skript erst danach auf.
- Vor dem Umbau: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" blocks hash '<datei>' --start '<start>' --end '<ende>'`; die Zeile `Hashes:` merkst du dir (bei `Blöcke: 0` entfällt die Prüfung), ohne Backup merkst du dir zusätzlich den Wortlaut jedes Blocks.
- Nach dem Umbau: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" blocks verify '<datei>' --start '<start>' --end '<ende>' --hashes '<wert>'`. Endet der Aufruf mit Fehler, meldest du das sofort. Mit Backup stellst du die Zeilen der betroffenen Blöcke aus dem Backup wieder her. Ohne Backup stellst du sie aus dem gemerkten Wortlaut wieder her und zeigst dem Menschen das Ergebnis; danach prüfst du erneut mit `blocks verify`.

## Ablauf

1. **Ziel und Backup.** Prüfziel ist der Pfad, den der Mensch nennt; ohne Angabe die CLAUDE.md im Wurzelordner des Projekts. Bevor du etwas prüfst oder änderst, fragst du: „Backup anlegen? Wohin?“
   - Ja ohne Pfad: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" backup '<datei>'`; das Backup liegt im temporären Ordner des Systems, und du nennst dem Menschen den Pfad aus der Ausgabe `Backup: <pfad>`.
   - Ja mit Pfad: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" backup '<datei>' --to '<pfad>'`.
   - Nein: kein Backup und am Ende kein Diff.

   Danach rufst du `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" size '<datei>'` auf und merkst dir die Zeichenzahl.
2. **Prüfen.** Du bewertest jeden Eintrag nach den Kriterien unten. Edit-Befunde nennst du als Liste, höchstens fünf je Nachricht, die wichtigsten zuerst; den Rest nur als Anzahl („3 weitere Befunde offen“), nie als Aufzählung. Befunde in geschützten Blöcken stehen in einer eigenen Zeile „Vorschlag an den Besitzer“.
3. **Befund melden.** Je Befund: Zitat, Problem, Vorschlag (neuer Wortlaut, Ziel-Skill oder Löschen). Der Mensch entscheidet.
4. **Umbauen.** Nach der Freigabe änderst du nur freigegebene Stellen. Danach prüfst du die geschützten Blöcke (siehe oben), rufst `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" size '<datei>'` erneut auf und nennst beide Zeichenzahlen.
5. **Zeigen.** Mit Backup zeigst du die Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" diff '<backup>' '<datei>'`. Ohne Backup bleiben nur die zwei Zeichenzahlen.

## Kriterien

- **Länge:** Satz mit Nebensatz, Begründung oder Beispiel: auf die Kernaussage kürzen.
- **Dokument statt Rahmenkorn:** mehr als drei Zeilen zu einem Thema: in einen Skill auslagern, Zeiger lassen.
- **Doppelung:** dieselbe Aussage an zwei Orten, auch gegen Skill oder geschützten Block: auf eine Stelle bringen.
- **Widerspruch:** Regel gegen Regel oder gegen einen geschützten Block: melden, nie raten.
- **Ableitbar:** Claude sieht es selbst (Dateistruktur, Standardverhalten): streichen.
- **Krücke für alte Modelle:** Streng-Formeln („nie“, „genau so“) ohne konkreten Fehlerfall: entschärfen oder streichen.
- **Mehrdeutig:** zwei Lesarten möglich oder ein Platzhalter, den kein Werkzeug kennt: eindeutig machen.
- **Für Menschen geschrieben:** Erklärung, Höflichkeit, Überschrift ohne Nutzen: streichen.
- **Trigger fehlt:** Regel gilt nur in einer Situation, nennt sie aber nicht: Auslöser voranstellen.

## Neue Regel aufnehmen

1. Gehört sie in die CLAUDE.md? Nur wenn jeder Agent sie in jeder Session braucht. Sonst gehört sie in einen Skill oder eine Referenzdatei.
2. Steht sie schon, auch sinngemäß? Dann änderst du den Eintrag, du hängst nichts an.
3. Widerspricht sie einem Eintrag? Erst klären, dann schreiben.
4. Formuliere sie als ein kurzer Punkt unter einem vorhandenen Abschnitt; den Wortlaut lässt du vom Menschen bestätigen.

## Fehler

| Fehler | Richtig |
|---|---|
| Befunde und Umbau in einem Zug | Erst die Liste, der Mensch entscheidet, dann der Umbau |
| Geschützten Block „mitoptimieren“ | Nur als Vorschlag an den Besitzer melden |
| Neuer Abschnitt für eine Einzelregel | In einen passenden Abschnitt einreihen |
| Prosa durch Prosa ersetzen | Punkt, Imperativ, Fragment |
| Weitere Befunde als zweite Liste anhängen | Nur die Anzahl nennen |
