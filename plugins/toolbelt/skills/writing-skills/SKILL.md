---
name: writing-skills
description: Use when a new skill is to be created, an existing skill changed, or a skill checked before it is rolled out. Auslöser sind Skill schreiben, Skill erstellen, Skill ändern, Skill testen, Skill prüfen, SKILL.md validieren sowie write a skill, edit a skill und validate a skill.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" *)
---

# Skills schreiben

Ein Skill ist eine Anleitung für einen Agenten. Du schreibst ihn so, wie du Code schreibst: erst der Test, dann das Minimum, dann die Politur.

## Erst der Test

Ob eine Anleitung wirkt, weißt du erst, wenn du einen Agenten ohne sie hast scheitern sehen. Der Test eines Skills ist deshalb ein Szenario, das ein Subagent bearbeitet. „Fehlschlag“ heißt: Er macht genau den Fehler, den der Skill verhindern soll. Ein Skill ohne beobachteten Fehlschlag ist eine Vermutung, und Vermutungen sind Ballast im Kontext.

## Wann ein Skill sich lohnt

- Die Technik war dir nicht von selbst klar.
- Du brauchst sie in mehreren Projekten wieder.
- Sie gilt breit, nicht nur für ein Projekt.

Kein Skill ist richtig für Einmal-Lösungen, für Standardwissen, das anderswo gut dokumentiert ist, und für Regeln eines einzelnen Projekts; die gehören in dessen CLAUDE.md. Was sich mechanisch prüfen lässt, gehört in ein Skript; der Skill hält nur Urteile.

## Ablauf

1. **Beobachten (rot).** Lass das Szenario ohne Skill laufen und halte wörtlich fest, was der Agent tut und womit er es begründet. Wie du Szenarien baust, steht in `references/testing-with-subagents.md`.
2. **Schreiben (grün).** Schreibe nur, was diese Fehlschläge behebt. Keine Vorsorge für Fälle, die du nicht beobachtet hast.
3. **Prüfen.** Lass dieselben Szenarien mit dem Skill laufen. Befolgt der Agent ihn jetzt?
4. **Lücken schließen.** Fällt dem Agenten eine neue Ausrede ein, trägst du sie ein und wiederholst Schritt 3, bis nichts Neues kommt.

Eine kleine Ergänzung ist keine Ausnahme: Auch jede Änderung an einem bestehenden Skill läuft durch diesen Ablauf. Vor dem Ändern kopierst du den Skill-Ordner als Snapshot und lässt die Szenarien gegen Snapshot und neue Fassung laufen; der Snapshot ist dein Vergleich. Schreiben alle Testläufe dasselbe Hilfsskript neu, nimmst du es in den Skill auf und rufst es dort auf.

## Aufbau einer SKILL.md

Der Kopf braucht `name` (Kleinbuchstaben, Ziffern, Bindestriche, höchstens 64 Zeichen) und `description` (höchstens 1024 Zeichen). Der Rumpf nennt den Kerngedanken, den Ablauf, eine Kurzreferenz und typische Fehler.

### Die Beschreibung nennt nur den Auslöser

Sie beginnt mit „Use when“ und beschreibt Situationen und Symptome. Sie fasst den Ablauf nicht zusammen. Der Grund: Steht der Ablauf in der Beschreibung, folgt der Agent der Kurzfassung und liest den Skill nicht.

- Schlecht: „Use when executing plans, dispatches a subagent per task with a review in between“
- Gut: „Use when executing implementation plans with independent tasks in the current session“

Schreibe in der dritten Person, nutze Stichwörter, die ein Agent wirklich sucht (Fehlermeldungen, Symptome, Synonyme), und nenne Auslöser auf Deutsch und Englisch. In einer einzeiligen Beschreibung bricht ein Doppelpunkt mit folgendem Leerzeichen das YAML; schreibe stattdessen „sind“ oder „sowie“.

## Auffindbar und schlank

- Der Name sagt, was der Skill tut, zuerst die Tätigkeit: `writing-skills`, nicht `skill-guide`.
- Häufig geladene Skills bleiben kurz, als Richtwert unter 500 Wörter im Rumpf, ständig geladene noch kürzer.
- Ausführliches wandert nach `references/`; im Rumpf steht der Dateiname und wann man ihn liest. Kein Zwangsladen per `@`-Pfad.
- Ein gutes Beispiel schlägt viele mittelmäßige. Ein Flussdiagramm gibt es nur, wenn eine Entscheidung nicht offensichtlich ist.
- Skripte rufst du im Text über ihren Interpreter auf, zum Beispiel `node scripts/werkzeug.js`, nie über den bloßen Pfad.

## Passende Form je Fehlerart

| Beobachteter Fehler | Passende Form |
|---|---|
| Agent umgeht eine Regel unter Druck | Verbot mit Tabelle der Ausreden und Liste der Warnzeichen, siehe `references/persuasion-principles.md` |
| Agent folgt dem Skill, die Ausgabe hat die falsche Form | Positive Vorgabe: die Teile der Ausgabe in ihrer Reihenfolge nennen |
| Agent lässt einen Pflichtteil weg | Pflichtfeld in der Vorlage |
| Verhalten hängt von einer Bedingung ab | Bedingung an einem beobachtbaren Merkmal |

Hänge keinen Einschränkungs-Nebensatz an („außer wenn es wichtig ist“); er öffnet die Verhandlung. Eine echte Ausnahme bekommt eine eigene Bedingung.

## Prüfen vor dem Ausrollen

1. Kopf validieren: `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" <skill-ordner>`. Fehler beenden den Aufruf mit Exit-Code ungleich 0 (Name, Länge, Pflichtfelder, mehrere `SKILL.md`), Warnungen nicht (unbekannte Schlüssel, `<` oder `>` in der Beschreibung).
2. Beschreibung auf Treffsicherheit testen: `references/trigger-eval.md`.
3. Erst dann committen.

## Typische Fehler

| Fehler | Richtig |
|---|---|
| Skill schreiben und danach testen | Erst das Szenario ohne Skill beobachten |
| Beschreibung erzählt den Ablauf | Nur den Auslöser nennen |
| Mehrere Skills am Stück ohne Test | Jeden Skill einzeln bis grün |
| Beispiele in fünf Sprachen | Ein vollständiges, echtes Beispiel |
| Erzählung „so haben wir es einmal gelöst“ | Wiederverwendbare Technik |
