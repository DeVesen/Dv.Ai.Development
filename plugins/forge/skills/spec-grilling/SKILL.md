---
name: spec-grilling
description: Use when a written dv-forge spec.md should be grilled once more for edge cases, contradictions and gaps before its review, without asking again what its decisions already answer. Auslöser sind Spec grillen, Grenzfälle der Spec prüfen, Lücken und Widersprüche in der Spec finden sowie grill the spec und stress-test a written spec. Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.
argument-hint: <spec.md>
---

# Spec grillen

`$ARGUMENTS`: `<S>` Spec, `--debug` ist kein Argument. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Du prüfst eine geschriebene Spec nur auf Grenzfälle, Widersprüche und Lücken. Du entwirfst nichts Neues, schreibst keinen Plan und keinen Code.

## Ablauf
1. **Lesen:** `<S>` fehlt → „Spec nicht gefunden: <S>“, Ende. Lies `<S>`, dann aus `<PLUGIN>/skills/spec-whiteboarding/references/` die Dateien `grill-rounds.md`, `ac-rules.md` und `spec-format.md`, dazu `<PLUGIN>/shared/dialog-rules.md`. Aus `grill-rounds.md` gelten Rundenformat und Abbruch-Regel; die Rahmenfragen entfallen.
2. **Beantwortet:** Jeder W-Eintrag unter `## Entscheidungen` ist beantwortet. Eine Frage, die ein W-Eintrag beantwortet, stellst du nicht, auch nicht anders formuliert oder als Bestätigung.
3. **Frontier:** nur
   - Grenzfälle: leere, doppelte oder fehlende Werte, Abbruch, Fehlerpfad, gleichzeitige Aktionen
   - Widersprüche zwischen Abschnitten, Akzeptanzkriterien und W-Einträgen
   - Lücken: Vorgabe ohne Akzeptanzkriterium, Akzeptanzkriterium ohne Vorgabe, Begriff ohne Bedeutung

   Zeilen mit Tag `ungeklärt` gehören zur Frontier, der Abbruch-Abschnitt nicht. Fragen im Rundenformat aus `grill-rounds.md`, Nummern ab Q1, je Runde die komplette Frontier; nach jeder Antwort neu berechnen. Ist sie leer, weiter mit 6.
4. **Änderung:** Ändert eine Antwort die Spec, legst du je Stelle Abschnitt, Vorher und Nachher wörtlich vor. Du schreibst erst nach ausdrücklicher Bestätigung („ja“ oder gleichwertig zu genau dieser Änderung); bis dahin bleibt die Datei unverändert. Neue Zeilen folgen `spec-format.md`, der Kopf bleibt unverändert. Nach dem Schreiben `node "<PLUGIN>/scripts/spec-lint.js" "<S>"`; jeden `FEHLER` behebst du wie eine Änderung.
5. **Entscheidung:** Jede neue Entscheidung des Menschen steht im selben bestätigten Schreibschritt als `- **W · <Kurztitel>** · Aussage — <Antwort>` unter `## Entscheidungen`; eine selbst entschiedene trägt ihren Beleg-Tag statt `Aussage`.
6. **Ende:** Liste der geänderten Stellen und der neuen W-Einträge, oder „Keine Änderung.“. Kein Commit, kein automatischer Start.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Zur Sicherheit frag ich das Format nochmal.“ | Ein W-Eintrag ist beantwortet. |
| „Kleine Korrektur, die schreib ich direkt.“ | Erst Vorher/Nachher, dann Bestätigung. |
| „Die Spec könnte noch eine Funktion mehr haben.“ | Nur Grenzfälle, Widersprüche, Lücken. |
| „Die Entscheidung merke ich mir.“ | W-Eintrag unter `## Entscheidungen`. |
| „Die Spec sagt es fast, ich frag trotzdem.“ | Mit Beleg und mindestens 85 %: `Selbst entschieden`. |
