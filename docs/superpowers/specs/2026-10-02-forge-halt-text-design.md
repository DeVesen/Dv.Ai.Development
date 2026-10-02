# dv-forge TP-B: Klartext-Fragen beim Anhalten (Spec-Review)

**Plugin:** `plugins/forge` (dv-forge)
**Teil von:** Wunsch „Lesbare Review-Ausgabe und garantierte Ausgabe im Chat". TP-B ist der zweite von drei Teilen (TP-A Stop-Hook, TP-C Abschlussbericht und Folgebefehl).
**Voraussetzung:** TP-A ist zusammengeführt (`pause --show`, `Stop`-Hook, Vorrang-Satz in `flow.md`). TP-B ändert den Inhalt des Textes, den TP-A absichert, nicht den Hook.
**Status:** Design mit dem Menschen abgestimmt am 2026-10-02.

## 1. Problem

Hält ein Spec-Review für Fragen an, sieht der Mensch heute `**Frage n — <Regel>**`, die Frage, die Stellen als Kürzel (`AC-07`), Unterfälle und eine Empfehlung ohne Grund. Das Ergebnis von Runde 1 (was korrigiert wurde, was nur Hinweis ist) erscheint erst im Abschlussbericht, also nach der Antwort. Der Mensch muss Fragen beantworten, ohne den Anlass und die Folgen zu kennen.

## 2. Ziel und Abgrenzung

Der Text beim Anhalten zeigt zuerst das Ergebnis von Runde 1 in Klartext, dann je Frage Anlass, Blickwinkel, Optionen mit Folge und eine Empfehlung mit Grund. Kürzel und Dateistellen kommen im sichtbaren Text nicht vor; das prüft ein Skript.

**Nur `spec-review`.** Nur dieser Ablauf hält an (`mustBundle`: `spec-review`, Runde 1). Plan-Review stellt dem Menschen nie Fragen.

Nicht Teil von TP-B: Abschlussbericht, Folgebefehl `alle`, Scout-Felder und Klartext-Prüfung für `plan-review` und `implementation-review` (TP-C). Review-Logik (Farben, Stopps) bleibt unverändert.

## 3. Abgestimmtes Beispiel (Aufbau verbindlich, Inhalt nur Beispiel)

```markdown
## Spec-Review · Runde 1 · Zugriff mit dem Access-Token
**Ergebnis:** 3 × 🔴 · 2 × 🟡 · 2 Fragen brauchen dich

### Schon korrigiert (nichts zu tun)
- 🔴 **Anmeldestatus und Browser-Tests** · Blickwinkel: Vollständigkeit, Klarheit, Fachbegriffe
  Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist, wenn es kein
  ID-Token mehr gibt. Beides steht jetzt als prüfbare Vorgabe in der Spec.

### Nur zur Kenntnis (nicht bearbeitet)
- 🟡 **Antwort bei fremdem Token** · Blickwinkel: Klarheit
  Offen war, ob das Backend bei einem Token einer anderen Anwendung mit „nicht angemeldet“ (401)
  oder „nicht erlaubt“ (403) antwortet.

### Frage 1 von 2 · Token-Format im Produktivsystem  (betrifft: Prüfung des Tokens)
**Warum gefragt** (Blickwinkel: Widerspruchsfreiheit): Alle Messungen stammen vom Testsystem. …
- **a)** Erst umsetzen, wenn jemand im Produktivsystem gemessen hat. Folge: sicher, die Umsetzung wartet.
- **b)** Sofort umsetzen und das Risiko akzeptieren. Folge: schnell, im Produktivsystem kann es scheitern.
**Empfehlung: a**, weil ein Fehler sonst erst im Betrieb auffiele und alle Nutzer träfe.

**Antwort:** `1a, 2a` · „später“ lässt eine Frage offen.
**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.
```

## 4. Anforderungen

### 4.1 Klartext-Prüfung (`scripts/lib/plain-text.js`, neu)

`plainProblem(text)` liefert `null` oder einen kurzen Grund. Ein Text ist ungültig, wenn er
- ein Kürzel enthält: `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>` als Wort, `F · ` oder `W · ` als Wortanfang,
- länger als 400 Zeichen ist,
- leer ist (nur Leerraum).

Der Grund nennt das Muster bzw. die Länge. Jedes Klartextfeld in 4.3 und 4.4 läuft hindurch. Ein Verstoß ergibt `NACHARBEIT ungültig: <feld>: <grund>` bzw. `SCOUT ungültig: <gruppe>: <feld>: <grund>`; die vorhandene Nachfordern-Mechanik (`attempt`) greift.

### 4.2 Blickwinkel (`scripts/lib/reviewer-names.js`, neu)

`reviewerLabel(name)` liefert den Klartext-Namen eines Reviewer-Kurznamens:

| Ablauf | Kurzname → Anzeige |
|---|---|
| spec-review | completeness → Vollständigkeit; consistency → Widerspruchsfreiheit; feasibility → Machbarkeit; clarity → Klarheit; profiles → Fachbegriffe |
| plan-review | coverage → Abdeckung der Spec; feasibility → Reihenfolge und Machbarkeit; architecture → Architektur; risks → Risiken; buildability → Umsetzbarkeit |
| implementation-review | acceptance → Abnahmekriterien; plan-fidelity → Treue zum Plan; design → Aufbau; tests → Tests; risks → Risiken |
| Skript-Prüfung | `skript` und `skript:<prüfung>` → Skript-Prüfung |

Die Kurznamen `feasibility` und `risks` kommen in mehreren Abläufen vor. Die Funktion bekommt deshalb den Ablauf mit: `reviewerLabel(review, name)` mit `review` ∈ `spec-review | plan-review | implementation-review`. Ein unbekannter Name liefert den Namen selbst. TP-B nutzt nur `spec-review`; die übrigen Einträge stehen für TP-C bereit. Ein Test prüft, dass zu jedem Reviewer-Agent (`agents/<ablauf>-<kurzname>.md` ohne `scout`, `rework`, `verifier`) ein Eintrag existiert.

### 4.3 Scout (nur `spec-review`)

- Die Gruppe in `scout.md` bekommt direkt unter der Überschrift `### <Stufe> <Stelle>` zwei Zeilen: `Titel: <2 bis 6 Wörter>` und `Beschreibung: <Text>`. Danach folgen Vorschläge und die Zeile `**Bevorzugt: …**` wie bisher. `parseScout` überliest die beiden Zeilen, solange kein Vorschlag offen ist; sein Verhalten ändert sich nicht.
- Ein neuer Leser `scoutTexts(lines)` (in `scripts/lib/scout-check.js` oder einer Lib daneben) liefert je Gruppe `{ severity, location, title, description }`.
- `review-flow.js scout-check` bekommt `--review <rolle>`. Bei `spec-review` müssen alle Gruppen beide Felder haben; `title` hat 2 bis 6 Wörter, beide laufen durch `plainProblem`. Bei anderen Rollen prüft `scout-check` wie bisher. Ohne `--review` gilt das alte Verhalten.
- `agents/spec-review-scout.md` beschreibt die Felder und die Klartext-Regeln (keine Kürzel, keine Dateistellen, ≤ 400 Zeichen, Titel 2 bis 6 Wörter) und zeigt sie im Ausgabe-Beispiel.
- `shared/review-flow/flow.md`, Abschnitt „Scout": Der Aufruf lautet `node "<PLUGIN>/scripts/review-flow.js" scout-check --review <rolle> --dir "<D>"`.

### 4.4 Nacharbeit (nur `spec-rework`)

`rework.json`:
- `results[]` mit `status: "changed"` bekommt `change` (Pflicht, Klartext): was sich in der Spec geändert hat.
- `results[]` mit `status: "unchanged"` behält `reason`; `reason` läuft ebenfalls durch `plainProblem`, weil es im Text erscheint.
- `questions[]` hat künftig:

| Feld | Inhalt | Prüfung |
|---|---|---|
| `title` | Titel der Frage | Klartext |
| `affects` | „betrifft: …" ohne das Wort „betrifft" | Klartext |
| `why` | Warum gefragt | Klartext |
| `reviewers[]` | Kurznamen der Reviewer, die den Anlass fanden | je Eintrag bekannt (4.2) |
| `options[]` | `{ label, text, consequence }`, 2 bis 4 Einträge, Labels `a`, `b`, … lückenlos ab `a` | `text` und `consequence` Klartext |
| `recommendation` | ein `label` | muss in `options` vorkommen |
| `reason` | Grund der Empfehlung | Klartext |
| `places[]` | Stellen mit Frage | intern, nicht angezeigt, nicht geprüft; Abdeckungsprüfung (`bundleProblem`) bleibt |

- `rule`, `question` und `cases` entfallen. Enthält `rework.json` ein `cases`-Feld, lautet die Meldung `NACHARBEIT ungültig: rework.json im alten Format (cases); Lauf neu starten`.
- `agents/spec-rework.md` beschreibt die neuen Felder (Abschnitt „Fragen bündeln", Ausgabe-Beispiel) und die Klartext-Regeln. Der Plan-Nacharbeiter (`plan-rework.md`) bleibt unverändert.

### 4.5 Anhalten-Text (`scripts/lib/halt-text.js`, neu; ersetzt `renderQuestions`)

`renderHalt(data)` erzeugt den Text nach dem Beispiel in Abschnitt 3. Eingaben liest `rework-check` aus dem Arbeitsbereich: `einstufung.json` (Gruppen mit Farbe und Reviewern), `scout.md` (Titel, Beschreibung), `rework.json` (Ausgänge und gebündelte Fragen), die Spec (Thema).

Aufbau in dieser Reihenfolge:
1. `## Spec-Review · Runde 1 · <Thema>` und `**Ergebnis:** <r> × 🔴 · <y> × 🟡 · <q> Fragen brauchen dich`. `<Thema>` ist die erste Überschrift der ersten Ebene (`# …`) der Spec; fehlt sie, entfällt ` · <Thema>`. `<r>` und `<y>` zählen die Gruppen aus `einstufung.json`, `<q>` die gebündelten Fragen. Ist ein Zähler 0, entfällt sein Teil.
2. `### Schon korrigiert (nichts zu tun)`: je 🔴-Gruppe mit Ausgang `changed`: `- 🔴 **<Titel>** · Blickwinkel: <Namen>`, darunter die Scout-Beschreibung und die Zeile `Änderung: <change>`. Der Abschnitt entfällt ohne Einträge.
3. `### Nur zur Kenntnis (nicht bearbeitet)`: je 🟡-Gruppe `- 🟡 **<Titel>** · Blickwinkel: <Namen>` mit der Beschreibung; je 🔴-Gruppe mit Ausgang `unchanged` (auch wenn ein bindender Eintrag des Menschen die Änderung ausschließt) `- 🔴 **<Titel>** · Blickwinkel: <Namen>`, Beschreibung und `Grund: <reason>`. Der Abschnitt entfällt ohne Einträge. 🟢-Gruppen erscheinen nicht.
4. Je gebündelter Frage: `### Frage <n> von <m> · <title>  (betrifft: <affects>)`, `**Warum gefragt** (Blickwinkel: <Namen der reviewers>): <why>`, je Option `- **<label>)** <text> Folge: <consequence>`, `**Empfehlung: <label>**, <reason>`. Die Ausgabe der Option steht auf einer Zeile (Zeilenumbrüche im Text werden zu Leerzeichen).
5. Fuß: `**Antwort:** \`1<rec1>, 2<rec2>, …\` · „später“ lässt eine Frage offen.` (die Empfehlungen der Fragen in Reihenfolge) und `**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.`

Titel und Beschreibung einer Gruppe stammen aus `scout.md`. Fehlt die Gruppe dort (Scout ausgefallen), steht als Titel die Stelle der Gruppe, als Beschreibung die auf 400 Zeichen gekürzte Konsequenz des ersten Findings plus ` (ohne Scout-Beschreibung)`; die Klartext-Regel gilt für diesen Rückfall nicht.

`rework-check` schreibt den Text nach `<W>/runde-1/fragen.md` (Dateiname unverändert, TP-A zeigt auf diese Datei) und gibt ihn nach `=== FRAGEN ===` aus. Das Ablauf-Markdown (`flow.md`, Abschnitt „Anhalten", Schritt 1) verlangt die Zeile `Antworte im Chat; …` nicht mehr, weil sie im Fuß steht.

Anker für den Stop-Hook (TP-A): `## Spec-Review · …` und jede Zeile `### Frage n von m …`, außerdem die Abschnittsüberschriften `###`. Der Hook ändert sich nicht.

## 5. Abnahmekriterien

1. `plainProblem` weist `AC-07`, `Task 3`, `R5`, `F · x`, `W · x`, leeren Text und Text über 400 Zeichen ab; „Anmeldestatus und Browser-Tests" nimmt es an.
2. `reviewerLabel('spec-review', 'clarity')` liefert `Klarheit`; `skript:foo` liefert `Skript-Prüfung`; jeder Reviewer-Agent hat einen Eintrag.
3. `scout-check --review spec-review` weist eine Gruppe ohne `Titel`, mit 1 oder 7 Wörtern im Titel, ohne `Beschreibung`, mit Kürzel oder mit Beschreibung über 400 Zeichen ab (`SCOUT ungültig: …`) und nimmt eine vollständige Datei an. Ohne `--review` oder mit `plan-review` bleibt das Verhalten unverändert.
4. `parseScout` liefert für eine Scout-Datei mit `Titel:`/`Beschreibung:`-Zeilen dieselben Vorschläge und denselben bevorzugten Vorschlag wie ohne diese Zeilen.
5. `rework-check` weist bei `spec-review` ab: `changed` ohne `change`, `change`/`title`/`affects`/`why`/`reason`/`text`/`consequence` mit Kürzel oder Überlänge, unbekannte `reviewers`, `recommendation` ohne passende Option, weniger als 2 oder mehr als 4 Optionen, nicht lückenlose Labels, ein altes `cases`-Feld (eigene Meldung).
6. `rework-check` nimmt ein gültiges Ergebnis an, schreibt `fragen.md` im neuen Aufbau und gibt es nach `=== FRAGEN ===` aus.
7. Der Text enthält vor der ersten Frage „Schon korrigiert" und „Nur zur Kenntnis" mit Blickwinkel und Beschreibung; jede Frage hat „Warum gefragt" mit Blickwinkel, Optionen mit „Folge:" und „Empfehlung: <label>, <Grund>".
8. Im Text kommen keine Kürzel aus 4.1 vor; er enthält keine Spec-Stellen, die nicht in Titel, Beschreibung oder Änderung stehen.
9. Fällt der Scout aus, erscheint der Rückfalltext mit „(ohne Scout-Beschreibung)".
10. `flow.md` verlangt `scout-check --review <rolle> --dir "<D>"` und nicht mehr die Zeile „Antworte im Chat; …".
11. Die Review-Logik (`review-flow.js rate`, `checklist`, `verify`) und der Plan-Review laufen unverändert; die bisherigen Tests laufen grün, soweit sie nicht das alte Format prüfen.

## 6. Tests

| Test | Inhalt |
|---|---|
| `tests/plain-text.test.js` (neu) | Kriterium 1 |
| `tests/reviewer-names.test.js` (neu) | Kriterium 2 |
| `tests/halt-text.test.js` (neu) | Kriterien 7 bis 9, Zähler, Entfall leerer Abschnitte, Fuß mit Empfehlungen |
| `tests/review-questions.test.js` | neue Feldprüfung (`bundleShapeProblem`), Abdeckung (`bundleProblem`) bleibt |
| `tests/review-flow-rework.test.js` | Kriterien 5 und 6 |
| `tests/review-attempts.test.js` / Scout-Test | Kriterium 3 und 4 (am vorhandenen `scout-check`-Test) |
| `tests/agents.test.js` | `spec-review-scout` und `spec-rework` nennen die neuen Felder; Beispiel-JSON ist gültig |
| `tests/review-flow-doc.test.js` | Kriterium 10 |

## 7. Risiken

- **Mehr Pflichtfelder:** Scout und Nacharbeiter bekommen längere Prompts und mehr Nachforderungen; die Klartext-Prüfung lässt sie nacharbeiten, kostet aber Versuche (`attempt`-Grenze existiert).
- **Alte Arbeitsbereiche:** ein halber Lauf mit altem `rework.json` scheitert laut (4.4), nie stumm.
- **Klartext ist nur Muster-Prüfung:** Kürzel in anderer Schreibweise (`ac 7`, `Aufgabe 3`) fängt sie nicht. Das akzeptiert der Plan; die Agent-Regeln tragen den Rest.
