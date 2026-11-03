---
name: grill
description: Grills a written spec.md once more for edge cases, contradictions and gaps, without asking again what its decisions already answer. Use when a spec exists and should be stress-tested before its review.
argument-hint: <spec.md>
disable-model-invocation: true
---
<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/grill.yaml -->

# Grill

`$ARGUMENTS`: `<spec.md>` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du prüfst eine geschriebene Spec nur auf Grenzfälle, Widersprüche und Lücken. Du entwirfst nichts Neues, schreibst keinen Plan und keinen Code.

## Eingang und Artefakt

- Eingang: `spec.md`; das erste Argument ist der Pfad zu `spec.md`, alle anderen Artefakte liegen im selben Ordner.
- Artefakt: `docs/forge/<datum>-<slug>/spec.md`
- Gate: Frontier leer; jede Änderung nach Bestätigung geschrieben; jede neue Entscheidung steht als W-Eintrag in der Spec.
- Hook: `scripts/gate-grill.sh` blockiert `/angular:grill` mit Exit-Code 2, wenn ein Pflichtartefakt fehlt (R-050).

## Ablauf

1. **Lesen:** Fehlt die Spec, meldest du „Spec nicht gefunden: <pfad>“ und endest. (→ R-050) Die Rahmenfrage entfällt.
2. **Beantwortet:** Jeder W-Eintrag unter `## Entscheidungen` ist beantwortet. (→ R-014)
3. **Frontier:** nur Grenzfälle (leere, doppelte oder fehlende Werte, Abbruch, Fehlerpfad, gleichzeitige Aktionen), Widersprüche zwischen Abschnitten, Akzeptanzkriterien und W-Einträgen, und Lücken (Vorgabe ohne Akzeptanzkriterium, Akzeptanzkriterium ohne Vorgabe, Begriff ohne Bedeutung). Zeilen mit Tag `ungeklärt` gehören dazu, der Abbruch-Abschnitt nicht. Nummern ab Q1, je Runde die komplette Frontier. (→ R-020) (→ R-021)
4. **Änderung:** Ändert eine Antwort die Spec, legst du je Stelle Abschnitt, Vorher und Nachher wörtlich vor und schreibst erst nach Bestätigung; der Kopf bleibt unverändert. (→ R-003)
5. **Entscheidung:** Jede neue Entscheidung steht im selben bestätigten Schreibschritt als `- **W · <Kurztitel>** · Aussage — <Antwort>` unter `## Entscheidungen`; eine selbst entschiedene trägt ihren Beleg-Tag. (→ R-002)
6. **Ende:** Liste der geänderten Stellen und der neuen W-Einträge, oder „Keine Änderung.“ (→ R-004)

## Grill-Mechanik

Quelle: `forge/skills/spec-whiteboarding/references/grill-rounds.md`. Eine Grill-Runde ist eine Nachricht mit der kompletten Frontier. Danach antwortet der Mensch frei in Text, kein Auswahl-Dialog wie `AskUserQuestion`.

Format je Frage:

```
❓ **Q<n>** - **<Titel>**: <Frage, mit Optionen falls vorhanden>

➡️ <Empfehlung> · <Beleg-Tag> — <Grund>
```

1. Die Nummern laufen über alle Runden fort.
2. Optionen stehen knapp in der Frage. TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Die Quelle sagt „falls sinnvoll“ und nennt kein Kriterium.
3. Eine unverändert offene Frage aus früherer Runde wiederholst du verkürzt als `Q<n> <Titel> — <Empfehlung>`; ausgeschrieben nur, wenn sich die Lage geändert hat.
4. Ändert der Mensch den Umfang, stellst du die Frontier komplett neu auf; jede ersetzte Frage steht als `Q<n> entfällt, ersetzt durch Q<m>`.
5. Genau eine Empfehlung pro Frage, der Grund ausgeschrieben. Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung, etwa „Vermutung: kleinster Scope“.
6. Was du selbst entscheidest, steht im Block `Selbst entschieden` vor der ersten Frage, nicht als Frage: `- <Kurztitel>: <Entscheidung> · <Beleg-Tag> — <Grund>`.
7. Fakten und selbst Entschiedenes sind keine Fragen. Schließt ein bekannter Fakt Optionen aus, bietest du sie nicht an.
8. Beantwortet der Mensch eine Frage nicht eindeutig, fragst du in einem Satz nach, bevor du einen W-Eintrag buchst.

## Regeln

- **R-050 · Pflichtartefakte vor dem Start.** Eine Etappe startet nur, wenn ihre Pflichtartefakte vorliegen; das prüft ihr Gate. Fehlt eines, meldest du „<Artefakt> nicht gefunden: <pfad>“ und endest. *Warum:* Jede Etappe arbeitet auf dem Artefakt ihrer Vorgänger; Grill und Plan-Writing enden in dv-forge bei fehlender Spec mit „Spec nicht gefunden“.
- **R-001 · Belegpflicht.** Jede Aussage, Empfehlung und Option trägt einen Beleg-Tag. Bei `ungeklärt` fragst du, statt zu raten. *Warum:* Eine Vermutung bleibt eine Frage, auch wenn sie naheliegt; eine eigene Entscheidung braucht einen Beleg-Tag außer `ungeklärt`.
- **R-002 · 85-%-Regel.** Lässt sich eine Antwort mit mindestens 85 % Gewissheit und einem Beleg-Tag außer `ungeklärt` aus den zugelassenen Quellen ableiten, entscheidest du selbst und fragst nicht, auch nicht als Bestätigung. Selbst Entschiedenes steht im Block `Selbst entschieden` vor den Fragen der Runde, eine Zeile je Punkt. Unter 85 % fragst du, mit genau einer Empfehlung. *Warum:* Eine Frage stellst du nur mit konkretem Nutzen. Widerspricht der Mensch einem selbst entschiedenen Punkt in seiner nächsten Antwort nicht, wird er ein W-Eintrag; widerspricht er, wird er eine Frage der nächsten Runde.
- **R-003 · Freigaben beim Menschen.** Freigaben bleiben beim Menschen, die Bestätigung von Entwurf, Titel und Slug, das Schreiben jeder Änderung, Commit und Abbruch. Eine Änderung legst du je Stelle als Abschnitt, Vorher und Nachher vor und schreibst sie erst nach ausdrücklicher Bestätigung genau dieser Änderung. *Warum:* TODO(forge/shared/dialog-rules.md): Die Quelle legt die Freigaben fest (85-%-Regel 5), nennt aber keinen Grund.
- **R-004 · Ende ohne nächsten Schritt.** Am Ende steht nur das Ergebnis der Etappe, wie ihr Ablauf es nennt. Kein Befehl, kein Hinweis auf einen nächsten Schritt, kein Commit, kein automatischer Start. *Warum:* Über den Fortgang entscheidet nicht die Etappe; in dv-forge entscheidet ihn die Leit-Session mit dem Menschen.
- **R-014 · W-Einträge sind bindend.** Jede Entscheidung des Menschen steht als `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` unter `## Entscheidungen`. Ein W-Eintrag ist beantwortet und bindend; du fragst nicht erneut danach, auch nicht anders formuliert oder als Bestätigung. *Warum:* W-Einträge sind die bindenden Entscheidungen des Menschen; ein W-Eintrag ist deshalb nie selbst ein Finding.
- **R-020 · Komplette Frontier.** Jede Grill-Runde enthält die komplette Frontier auf einmal, nicht nur die wichtigste Frage. Hängt eine Antwort von einer anderen offenen Frage derselben Runde ab, gehört sie in eine spätere Runde. Die Runden enden erst, wenn die Frontier leer ist, einschließlich aller Zweige der Akzeptanzkriterien. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Die Quelle begründet nur die Verschiebung abhängiger Fragen, nicht die komplette Frontier.
- **R-021 · Verhalten belegen.** Eine Frage oder Option, die bestehendes Verhalten voraussetzt (Sortieren, Filtern, Export und Ähnliches), stellst du nur mit Beleg an der konkreten Stelle (Datei:Zeile). Fehlt der Beleg oder darfst du nicht suchen, lässt du sie weg oder fragst „Gibt es das heute?“ mit Tag `ungeklärt`. *Warum:* Ein Modul-Import oder eine Fähigkeit des Frameworks belegt nur, was möglich wäre, nicht was es heute gibt.
- **R-022 · Keine bedingte Empfehlung.** Eine Empfehlung hängt nie an einer ungeprüften Bedingung („falls …, sonst …“). Du prüfst die Bedingung vorher und empfiehlst eindeutig; lässt sie sich nicht prüfen, ist sie eine eigene Frage, die abhängige folgt später. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Belegregel 2 nennt keinen Grund.
- **R-023 · Kein neues Verhalten.** Ein Verhalten, das weder im Auftrag noch im Bestand steht und kein Grenzfall des beauftragten Verhaltens ist, führst du nicht als Option ein. Legt der Auftrag es nahe, fragst du, ob es dazugehört, mit der Empfehlung „nicht in diese Story“. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Belegregel 3 nennt keinen Grund.
- **R-024 · Abbruch erst nach zweiter Ablehnung.** „Reicht jetzt“ ist noch kein Abbruch. Du nennst die offenen Zweige und bietest genau einmal eine verdichtete Abschlussrunde an; erst die zweite, informierte Ablehnung ist ein Abbruch. Offene Punkte stehen dann im Abbruch-Abschnitt mit Tag `ungeklärt`, nie als W-Eintrag. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Die Abbruch-Regel nennt keinen Grund.

## Beispiele

Beispiele stehen in [references/beispiele.md](references/beispiele.md); sie sind keine Pflicht.
