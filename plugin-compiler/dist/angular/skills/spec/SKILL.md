---
name: spec
description: Turns a request, idea or complaint into a confirmed spec.md through grill rounds until no open point is left, before any planning or code. Use when nothing is written down yet and acceptance criteria are vague or missing.
argument-hint: '[anliegen]'
disable-model-invocation: true
---
<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/spec.yaml -->

# Spec

`$ARGUMENTS`: `[anliegen]` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Mensch und Claude grillen ein Vorhaben, bis kein offener Punkt übrig ist. Ergebnis ist eine in sich abgeschlossene, funktionale Spec der Art `frei`, WAS statt WIE. Quelle ist nur, was der Mensch sagt und ausdrücklich übergibt; kein Suchen in Code, Git oder Historie, kein Plan und kein Code, bis die Spec geschrieben und bestätigt ist.

## Eingang und Artefakt

- Eingang: das Gespräch; kein Artefakt.
- Artefakt: `docs/forge/<datum>-<slug>/spec.md`
- Gate: Frontier leer; Inhalt, Titel und Slug ausdrücklich bestätigt; Datei am Zielpfad wortgleich mit dem Entwurf geschrieben.

## Ablauf

1. **Rahmenfrage:** Vor Runde 1 fragst du einmal nur nach der Workitem-Nummer, und nur wenn das Projekt Workitem-Nummern nutzt. Rahmenfragen sind keine W-Einträge; die Antwort kommt in den Kopf der Spec.
2. **Offene Punkte sammeln:** Was, Wie, Wo, Warum, Verhalten danach, Soll-Vorgaben, Akzeptanzkriterien. (→ R-011)
3. **Runden:** je Runde die komplette Frontier im Format der Grill-Mechanik unten. Antworten verbuchen, Frontier neu berechnen, bis sie leer ist. (→ R-020)
4. **Bestätigen:** Erst bei leerer Frontier Inhalt, Titel und Slug als vollständigen Entwurf vorlegen. Erst nach ausdrücklicher Bestätigung aller drei schreiben. (→ R-003)
5. **Zielpfad:** `docs/forge/<datum>-<slug>/spec.md`. Existiert der Ort bereits, fragst du nach. (→ R-015) TODO(forge/skills/spec-whiteboarding/SKILL.md): forge bestimmt den Pfad mit `spec-path.js` aus der Projekt-Einstellung `Spec-Ablage`.
6. **Schreiben:** ausschließlich als Datei am Zielpfad, im Format unten, `Art: frei`. Die Datei ist wortgleich mit dem bestätigten Entwurf, ausgenommen `Status` und `Basis`. Jede spätere Änderung legst du als Vorher/Nachher vor. (→ R-003)
7. **Ergebnis:** genau eine Angabe, der Pfad der Spec relativ zum Repo und der aktuelle Branch. (→ R-004)

## Format

```markdown
# <Titel>

Status: bestätigt am <YYYY-MM-DD>
Art: frei
Workitem: <Nummer>
Basis: <Commit-Kurzhash>

## Was, wie, wo, warum
<fachlich, kein Code>

## Theoretisches Verhalten nach Umsetzung
<was Anwender oder System danach tut>

## Soll-Vorgaben
<Randbedingungen>

## Akzeptanzkriterien
- **AC-01** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>. · <Beleg-Tag>

## Entscheidungen
- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>
```

- Jede inhaltliche Zeile trägt genau einen Beleg-Tag am Zeilenende nach ` · `; die Kopfzeilen tragen keinen.
- `Workitem` entfällt, wenn das Projekt keine Workitem-Nummern nutzt. `Basis` ist `git rev-parse --short HEAD` beim Schreiben.
- Nach echtem Abbruch lautet der Status `Status: Abbruch am <YYYY-MM-DD>, <k> Punkte offen`, und nach `## Entscheidungen`
  folgt `## Offen, bewusst nicht weiterverfolgt (Abbruch)` mit `- **<Kurztitel>** · ungeklärt — <was offen ist>`.

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

- **R-001 · Belegpflicht.** Jede Aussage, Empfehlung und Option trägt einen Beleg-Tag. Bei `ungeklärt` fragst du, statt zu raten. *Warum:* Eine Vermutung bleibt eine Frage, auch wenn sie naheliegt; eine eigene Entscheidung braucht einen Beleg-Tag außer `ungeklärt`.
- **R-002 · 85-%-Regel.** Lässt sich eine Antwort mit mindestens 85 % Gewissheit und einem Beleg-Tag außer `ungeklärt` aus den zugelassenen Quellen ableiten, entscheidest du selbst und fragst nicht, auch nicht als Bestätigung. Selbst Entschiedenes steht im Block `Selbst entschieden` vor den Fragen der Runde, eine Zeile je Punkt. Unter 85 % fragst du, mit genau einer Empfehlung. *Warum:* Eine Frage stellst du nur mit konkretem Nutzen. Widerspricht der Mensch einem selbst entschiedenen Punkt in seiner nächsten Antwort nicht, wird er ein W-Eintrag; widerspricht er, wird er eine Frage der nächsten Runde.
- **R-003 · Freigaben beim Menschen.** Freigaben bleiben beim Menschen, die Bestätigung von Entwurf, Titel und Slug, das Schreiben jeder Änderung, Commit und Abbruch. Eine Änderung legst du je Stelle als Abschnitt, Vorher und Nachher vor und schreibst sie erst nach ausdrücklicher Bestätigung genau dieser Änderung. *Warum:* TODO(forge/shared/dialog-rules.md): Die Quelle legt die Freigaben fest (85-%-Regel 5), nennt aber keinen Grund.
- **R-004 · Ende ohne nächsten Schritt.** Am Ende steht nur das Ergebnis der Etappe, wie ihr Ablauf es nennt. Kein Befehl, kein Hinweis auf einen nächsten Schritt, kein Commit, kein automatischer Start. *Warum:* Über den Fortgang entscheidet nicht die Etappe; in dv-forge entscheidet ihn die Leit-Session mit dem Menschen.
- **R-010 · WAS statt WIE.** Die Spec beschreibt beobachtbares Verhalten, keine Klassen, Dateipfade, Tabellen, Architektur oder technischen Schritte. *Warum:* Solche Details gehören in Plan und Umsetzung; der Plan entscheidet sie.
- **R-011 · Prüfbare Akzeptanzkriterien.** Jedes Akzeptanzkriterium hat die Form `- **AC-<NN>** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.` Verboten sind „funktioniert korrekt“, „ist möglich“, „sollte“, „idealerweise“ und Maßwörter ohne Maß wie „schnell“. Jedes beschriebene Verhalten hat mindestens ein AC. *Warum:* Ein AC ist nur prüfbar, wenn zwei Personen unabhängig voneinander zum selben Urteil „erfüllt“ oder „nicht erfüllt“ kommen.
- **R-012 · Lückenlose AC-IDs.** AC-IDs sind zweistellig und lückenlos ab `AC-01`, in der Reihenfolge des Auftretens. *Warum:* Plan und Reviewer verweisen auf ACs nur über ihre ID; jedes AC der Spec muss im Plan unter `**ACs:**` eines Tasks stehen.
- **R-013 · In sich abgeschlossen.** Die Spec enthält keine Links und keine Verweise auf Dateien, Tickets oder andere Dokumente; Inhalte aus Anhängen stehen zusammengefasst darin. Ausnahme ist nur der Kopf. *Warum:* Die Reviewer lesen nur die Spec, keine anderen Dateien und keinen Chatverlauf.
- **R-014 · W-Einträge sind bindend.** Jede Entscheidung des Menschen steht als `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` unter `## Entscheidungen`. Ein W-Eintrag ist beantwortet und bindend; du fragst nicht erneut danach, auch nicht anders formuliert oder als Bestätigung. *Warum:* W-Einträge sind die bindenden Entscheidungen des Menschen; ein W-Eintrag ist deshalb nie selbst ein Finding.
- **R-015 · Nie überschreiben.** Existiert das Ziel-Artefakt schon, fragst du nach und überschreibst es nicht. *Warum:* TODO(forge/skills/spec-whiteboarding/SKILL.md, forge/skills/plan-writing/SKILL.md): Beide sagen „nie überschreiben“, keiner nennt den Grund.
- **R-020 · Komplette Frontier.** Jede Grill-Runde enthält die komplette Frontier auf einmal, nicht nur die wichtigste Frage. Hängt eine Antwort von einer anderen offenen Frage derselben Runde ab, gehört sie in eine spätere Runde. Die Runden enden erst, wenn die Frontier leer ist, einschließlich aller Zweige der Akzeptanzkriterien. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Die Quelle begründet nur die Verschiebung abhängiger Fragen, nicht die komplette Frontier.
- **R-021 · Verhalten belegen.** Eine Frage oder Option, die bestehendes Verhalten voraussetzt (Sortieren, Filtern, Export und Ähnliches), stellst du nur mit Beleg an der konkreten Stelle (Datei:Zeile). Fehlt der Beleg oder darfst du nicht suchen, lässt du sie weg oder fragst „Gibt es das heute?“ mit Tag `ungeklärt`. *Warum:* Ein Modul-Import oder eine Fähigkeit des Frameworks belegt nur, was möglich wäre, nicht was es heute gibt.
- **R-022 · Keine bedingte Empfehlung.** Eine Empfehlung hängt nie an einer ungeprüften Bedingung („falls …, sonst …“). Du prüfst die Bedingung vorher und empfiehlst eindeutig; lässt sie sich nicht prüfen, ist sie eine eigene Frage, die abhängige folgt später. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Belegregel 2 nennt keinen Grund.
- **R-023 · Kein neues Verhalten.** Ein Verhalten, das weder im Auftrag noch im Bestand steht und kein Grenzfall des beauftragten Verhaltens ist, führst du nicht als Option ein. Legt der Auftrag es nahe, fragst du, ob es dazugehört, mit der Empfehlung „nicht in diese Story“. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Belegregel 3 nennt keinen Grund.
- **R-024 · Abbruch erst nach zweiter Ablehnung.** „Reicht jetzt“ ist noch kein Abbruch. Du nennst die offenen Zweige und bietest genau einmal eine verdichtete Abschlussrunde an; erst die zweite, informierte Ablehnung ist ein Abbruch. Offene Punkte stehen dann im Abbruch-Abschnitt mit Tag `ungeklärt`, nie als W-Eintrag. *Warum:* TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Die Abbruch-Regel nennt keinen Grund.

## Beispiele

Beispiele stehen in [references/beispiele.md](references/beispiele.md); sie sind keine Pflicht.
