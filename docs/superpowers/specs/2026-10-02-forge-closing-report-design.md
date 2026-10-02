# dv-forge TP-C1: Abschlussbericht für Spec-Review, Plan-Review und Review-Followup

**Plugin:** `plugins/forge` (dv-forge)
**Teil von:** Wunsch „Lesbare Review-Ausgabe und garantierte Ausgabe im Chat". TP-C1 ist der dritte von vier Teilen (TP-A Stop-Hook, TP-B Anhalten-Format, TP-C1 dieser Teil, TP-C2 Implementierungs-Review).
**Voraussetzung:** TP-A und TP-B sind zusammengeführt. TP-C1 nutzt `plain-text.js`, `reviewer-names.js`, die Scout-Zeilen `Titel:`/`Beschreibung:` und `bericht.md` samt `show` aus TP-A und TP-B.
**Status:** Design mit dem Menschen abgestimmt am 2026-10-02.

## 1. Problem

Der Abschlussbericht von Spec- und Plan-Review ist eine Tabelle mit fünf Spalten, Kürzeln (Kategorie, `AC-nn`, Gruppennummern) und gestapelten Sätzen. Er zeigt, was gefunden wurde, nicht, was sich im Dokument geändert hat. Scout-Vorschläge und der Auswahl-Hinweis `b` gelten auch für Gruppen, die schon korrigiert oder vom Menschen per Antwort entschieden sind: `writeClosing` sichert alle nicht-grünen Gruppen aus Runde 1 und Nachprüfung. Der Folgebefehl verlangt Gruppennummern, die der Bericht zeigen muss.

## 2. Ziel und Abgrenzung

Der Bericht aller Spec-/Plan-Abläufe ist Klartext ohne Kürzel: Was hat sich geändert, was hast du entschieden, was ist noch offen (mit genau einem empfohlenen Vorschlag), was lief nicht rund, wie geht es weiter. Ein Folgebefehl `alle` setzt alle offenen Punkte mit dem empfohlenen Vorschlag um.

Nicht Teil von TP-C1: `implementation-review` und das Followup der Implementierung (TP-C2), Review-Logik (Farben, Stopps, Status-Regeln in `review-flow.js`), Persönliche Nutzer-Hooks.

## 3. Abgestimmtes Beispiel (Aufbau verbindlich, Inhalt nur Beispiel)

```markdown
## Spec-Review · Ergebnis · Zugriff mit dem Access-Token
**Ergebnis:** ✅ Bereit zum Planen · 2 kleine Hinweise offen
Ablauf: Prüfung aus fünf Blickwinkeln, eine Überarbeitung, eine Nachprüfung.

### Was sich in der Spec geändert hat
- ✅ **Anmeldestatus und Browser-Tests** · gefunden aus: Vollständigkeit, Klarheit, Fachbegriffe
  Es fehlte, woran die App erkennt, dass jemand angemeldet ist. Beides ist jetzt als prüfbare Vorgabe ergänzt.
  Nachprüfung: bestätigt.
- ✅ **Token-Format im Produktivsystem** · gefunden aus: Widerspruchsfreiheit
  Nach deiner Antwort steht in der Spec, dass am Testsystem umgesetzt wird und die Messung als Risiko offen bleibt.
  Nachprüfung: bestätigt.

### Deine Entscheidungen
- **Token-Format im Produktivsystem:** sofort umsetzen, Risiko akzeptiert

### Noch offen · kein Hindernis für den Plan
- 🟡 **Antwort bei fremdem Token** · aus: Klarheit
  Offen ist, ob 401 („nicht angemeldet“) oder 403 („nicht erlaubt“) kommt.
  Vorschlag (empfohlen): immer 401, weil das Frontend nur danach eine Erneuerung startet.

### Hinweise zum Ablauf
- Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.

### Wie es weitergeht
1. Die 2 Hinweise einarbeiten lassen (optional):
   `/dv-forge:review-followup docs/specs/<name>.md alle`
2. Spec committen.
3. In einer frischen Session den Plan schreiben:
   `/dv-forge:plan-writing docs/specs/<name>.md`
```

## 4. Anforderungen

### 4.1 Neue Felder der Agent-Ergebnisse (Klartext, ≤ 400 Zeichen, ohne Kürzel nach `plain-text.js`)

| Quelle | Feld | Inhalt |
|---|---|---|
| Scout `spec-review` und `plan-review`, je Gruppe in `scout.md` | `Empfehlung:` | direkt unter `Beschreibung:`: Klartext zum bevorzugten Vorschlag mit kurzem Grund |
| Scout `plan-review`, je Gruppe | `Titel:`, `Beschreibung:` | wie in TP-B beim Spec-Scout (2 bis 6 Wörter; Klartext) |
| `antworten.json` (`spec-rework`), je Ergebnis mit `status: "answered"` | `decision`, `change` | gewählte Option in Klartext; was die Spec jetzt festlegt |
| `rework.json` (`spec-rework` und `plan-rework`), alle Quellen (Runde 1 und Folge-Modus) | `change` bei `changed`; `reason` bei `unchanged` | was sich geändert hat; Begründung |
| `rework.json` (`plan-rework`), `status: "spec-question"` | `reason` | die Rückfrage an den Menschen, in Klartext |

- `scout-check` verlangt `Titel`, `Beschreibung` und `Empfehlung` für `--review spec-review` und `--review plan-review` (TP-B: nur `spec-review`; Fehlermeldungen `SCOUT ungültig: <gruppe>: <feld>…` wie dort). Für andere Rollen bleibt das Verhalten unverändert. `scoutTexts` liefert zusätzlich `recommendation`; `parseScout` ändert sich nicht (die Zeile steht vor dem ersten Vorschlag).
- `rework-check` prüft die Klartextfelder der Tabelle für beide Reviews und beide Quellen. Das Ergebnis `answers-check` prüft `decision` und `change` bei jedem `answered`. Fehler lauten `NACHARBEIT ungültig: …` bzw. `ANTWORTEN ungültig: …`; die `attempt`-Mechanik fordert nach.
- Die Agent-Prompts `spec-review-scout`, `plan-review-scout`, `spec-rework`, `plan-rework` beschreiben die Felder, Klartext-Regeln und Ausgabe-Beispiele.
- `rate` schreibt zusätzlich `reviewers: [<kurznamen der erwarteten Reviewer>]` in `runde-1/einstufung.json`.

### 4.2 Hinweise zum Ablauf

`prepare.js` schreibt für `spec-review` und `plan-review` die Datei `<W>/hinweise.json` (JSON-Liste von Texten in Klartext mit Auswirkung). Die bisherigen `WARN`-Zeilen auf stdout bleiben unverändert. Die Texte:

| Anlass | Text |
|---|---|
| Profile mit gleichem Namen | `Mehrere Profile heißen gleich: <ursprüngliche Warnung>. Der Prüfer für Fachbegriffe kann dadurch ein falsches Profil lesen.` |
| `profiles nicht aktiv` (`--only`) | `Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen oder die Spec als frei gekennzeichnet ist. Diese Prüfung fehlt.` |
| Anker-Prüfung des Plans scheitert | `Die automatische Prüfung der Stellen im Plan ist fehlgeschlagen (<meldung>). Der Plan wurde ohne diese Prüfung bewertet.` |

Ohne Warnungen entsteht die Datei mit `[]`. Zusätzlich leitet `report` aus `versuche.json` und dem Ablauf ab (Anzeigenamen: Reviewer über `reviewerLabel`; `nacharbeit` → „Die Überarbeitung", `nachprüfer` → „Die Nachprüfung", `scout`/`scout-nachpruefung` → „Der Scout"):
- Instanz einmal nachgefordert: `<Name> hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt.`
- Instanz neu gestartet: `<Name> musste neu gestartet werden, weil die Antwort nicht gültig war.`
- Bündelung korrigiert: `Die Bündelung der Fragen musste korrigiert werden.`
- Instanz ausgefallen, mit Auswirkung: Reviewer `Dieser Blickwinkel fehlt in der Prüfung.`, Überarbeitung `Das Dokument wurde nicht überarbeitet.`, Nachprüfung `Die Korrekturen sind nicht nachgeprüft.`, Scout `Es gibt keine Lösungsvorschläge; Beschreibungen stammen aus den Prüfergebnissen.`

### 4.3 Bericht (`scripts/lib/report-text.js`, neu; ersetzt `renderReport` in `flow-report.js` und `renderTable` in `groups.js` für diesen Ablauf)

`report` (`review-flow.js report`) bleibt der Aufruf; die erste Ausgabezeile `ENDE <status>` bleibt unverändert (`flowStatus`), danach `=== BERICHT ===` und der neue Text. Der Text steht unverändert in `<W>/abschluss/bericht.md` (TP-A). Die Option `--artefakt` bleibt (Pfad für die Befehle unten).

Abschnitte in dieser Reihenfolge; ein Abschnitt ohne Einträge entfällt, außer Kopf und „Wie es weitergeht":

1. **Kopf:** `## <Titel> · Ergebnis · <Thema>` (`<Titel>` aus `--titel`, `<Thema>` erste `# `-Überschrift des Dokuments, sonst entfällt ` · <Thema>`).
2. **Ergebnis-Zeile** nach Status:
   - `sauber …`: `**Ergebnis:** ✅ <Bereit>` mit `<Bereit>` = `Bereit zum Planen` (spec-review) bzw. `Bereit zur Umsetzung` (plan-review); bei offenen 🟡 dazu ` · <n> kleine Hinweise offen` (`1 kleiner Hinweis offen`).
   - `nicht bereit, k × 🔴 offen`: `**Ergebnis:** ⛔ Noch nicht bereit · <k> Hindernisse offen` (`1 Hindernis offen`).
   - `Fragen offen`: `**Ergebnis:** ❓ <q> Fragen offen` (`1 Frage offen`).
   - `unvollständig, ausgefallen: …`: `**Ergebnis:** ⚠️ Unvollständig · <Namen> ausgefallen`.
3. **Ablauf-Zeile:** `Ablauf: Prüfung aus <Zahlwort> Blickwinkeln, <keine|eine> Überarbeitung, <keine|eine> Nachprüfung.` (Zahl aus `reviewers` in `einstufung.json`; Zahlwörter für 1 bis 6, sonst Ziffern). Im Followup: `Ablauf: <n> gewählte Vorschläge umgesetzt, <keine|eine> Nachprüfung.`
4. **`### Was sich in <der Spec|dem Plan> geändert hat`:**
   - je 🔴-Gruppe der Runde 1 mit Ausgang `changed`: `- <✅|⚠️> **<Titel>** · gefunden aus: <Blickwinkel>`, darunter die Scout-Beschreibung (Rückfall wie TP-B), `Änderung: <change>`, ggf. `Beleg: <evidence>`, `Nachprüfung: bestätigt.` (Urteil `erledigt`), `Nachprüfung: nicht erledigt.` (⚠️) oder `Nachprüfung: nicht erfolgt.` (kein Urteil);
   - je beantworteter Frage (Spec-Review): `- <✅|⚠️> **<Titel der Frage>** · gefunden aus: <Blickwinkel der Frage>`, darunter `change` aus `antworten.json`, `Nachprüfung: …` wie oben;
   - im Followup: je gewählter Gruppe `change` und `Gewählt: Vorschlag <n>`.
5. **`### Deine Entscheidungen`** (nicht im Followup): je beantworteter Frage `- **<Titel der Frage>:** <decision>`; mehrere beantwortete Stellen derselben gebündelten Frage mit gleicher Entscheidung erscheinen einmal.
6. **`### Offene Fragen`:** je unbeantworteter Frage `- **<Titel>** (betrifft: <affects>)` im Spec-Review (aus den gebündelten Fragen von `rework.json`, zugeordnet über `places`), im Plan-Review je Spec-Rückfrage `- **<place-Beschreibung>**: <reason>`. Eine Frage ohne Titel (Rückfall) zeigt den gekürzten Fragetext aus dem Dokument.
7. **`### Noch offen · Hindernis`** und **`### Noch offen · kein Hindernis für <den Plan|die Umsetzung>`:** je offene Gruppe (4.4) `- <🔴|🟡> **<Titel>** · aus: <Blickwinkel>`, darunter die Beschreibung und `Vorschlag (empfohlen): <Empfehlung>`. Fehlt der Scout-Text, gilt der Rückfall (Stelle, gekürzte Konsequenz, ohne Vorschlagszeile). 🔴 stehen unter „Hindernis", 🟡 unter „kein Hindernis".
8. **`### Hinweise zum Ablauf`:** die Texte aus 4.2.
9. **`### Wie es weitergeht`:** nummerierte Liste mit Befehlen in Code-Blöcken. Mit `<A>` = `--artefakt`, `<n>` = Zahl der offenen 🟡, `<k>` = offene 🔴:

| Status | Schritte (Spec-Review) | Schritte (Plan-Review) |
|---|---|---|
| `sauber`, keine 🟡 | 1. Spec committen. 2. Plan schreiben: `/dv-forge:plan-writing <A>` | 1. Spec und Plan committen (der Orchestrator fragt danach). 2. Umsetzen in einer frischen Session: `/dv-forge:implementation <A>` |
| `sauber`, <n> 🟡 | 1. Die <n> Hinweise einarbeiten lassen (optional): `/dv-forge:review-followup <A> alle`. Dann wie oben | wie links, mit Plan-Befehlen |
| `nicht bereit` | 1. Die <k> Hindernisse einarbeiten lassen: `/dv-forge:review-followup <A> alle`, oder das Dokument selbst anpassen. 2. Danach erneut prüfen: `/dv-forge:spec-review <A>` | dasselbe mit `/dv-forge:plan-review <A>` |
| `Fragen offen` | 1. Die Fragen beantworten, indem du die Prüfung erneut startest: `/dv-forge:spec-review <A>` | 1. Die Spec anpassen. 2. `/dv-forge:spec-review <Spec>`, dann `/dv-forge:plan-review <A>` erneut |
| `unvollständig` | 1. Den Lauf in einer frischen Session erneut starten: `/dv-forge:spec-review <A>` | dasselbe mit `/dv-forge:plan-review <A>` |

Im Followup gilt die Spalte des Original-Reviews; ist `offen` leer und der Status `sauber`, die Zeile `sauber`.

### 4.4 Nur offene Gruppen werden gesichert (`writeClosing`)

`abschluss/aggregate.md` und `abschluss/scout.md` (Eingabe von `followup.js save`) enthalten nur offene Gruppen:
- Runde 1: 🟡-Gruppen, über deren Stelle der Mensch nicht per Antwort entschieden hat (`antworten.json`, Status `answered`), und 🔴-Gruppen, deren Nachprüfung-Urteil `nicht erledigt` lautet.
- Nachprüfung (Runde 2): alle nicht-grünen Gruppen.
- Nicht offen: 🔴-Gruppen mit Urteil `erledigt`, Gruppen mit beantworteter Frage, 🟢-Gruppen.
- Ohne Nachprüfung (kein Urteil vorhanden, etwa nach Ausfall): alle 🔴 und 🟡 der Runde 1 außer beantworteten.
- Im Followup: die Gruppen aus `sicherung-vorher/` (4.6), die nicht gewählt wurden; die gewählten mit Urteil `nicht erledigt`; alle nicht-grünen Gruppen der Nachprüfung.
- Scout-Vorschläge einer Gruppe stehen nur in `scout.md`, wenn die Gruppe offen ist.

### 4.5 Folgebefehl

- `prepare.js review-followup <artefakt> alle` wählt alle gesicherten Gruppen mit ihrem bevorzugten Vorschlag. `b` ist ein Alias mit gleichem Verhalten. Die Formen `<n>` und `<g>:<n|b>,…` bleiben (Expertenform).
- Eine gesicherte Gruppe ohne bevorzugten Vorschlag lässt `alle`/`b` mit der bisherigen Meldung scheitern.
- Die Chat-Texte (Bericht, Skills) nennen nur `alle`; die Zeile `Auswahl: b = … 1:2,3:1 = …` entfällt aus `spec-review`, `plan-review` und `review-followup`.

### 4.6 Followup: Arbeitsbereich und Bericht

`prepare.js review-followup` schreibt zusätzlich:
- `<W>/sicherung-vorher/aggregate.md` und `scout.md`: Kopien der Sicherung, aus der gewählt wurde.
- `<W>/followup.json`: `{ gewaehlt: [{ nummer, stufe, stelle, vorschlag }], offen: [{ nummer, stufe, stelle }] }`.

Der Followup-`report` (Titel `Review-Followup (<original>)`) nutzt `followup.json`, `nacharbeit/rework.json` und `runde-2/einstufung.json`. Der Ablauf (`skills/review-followup/references/flow.md`, Nachprüfung Spec/Plan Schritt 6) sichert nach dem `report` immer mit `followup.js save <rolle> <slug> "<W>/abschluss"`; ist nichts mehr offen, räumt `save` die Sicherung weg (kein Scout-Abschnitt). Die Verzweigung „lief ein Scout / offen leer / drop" entfällt für Spec und Plan; die Ausgabe von `save` wird nicht mehr angezeigt.

### 4.7 Ablauftexte

- `shared/review-flow/flow.md`, „Ende": Schritt 3 lautet: Der Text nach `=== BERICHT ===` unverändert im Chat; nichts committen; Vorrang-Satz (TP-A). Die Zeilen zu `### Hinweise des Orchestrators`, Zusatz-Abschnitten, `save`-Ausgabe und `Nächster Schritt: <Text des Skills>` entfallen, weil der Bericht sie enthält. Schritt 2 (`save`) bleibt, sein Ergebnis wird nicht mehr im Chat gezeigt (bei `KEIN SCOUT` gilt weiter: kein Hinweis nötig).
- `skills/spec-review/SKILL.md`, `skills/plan-review/SKILL.md`: Abschnitt „Bericht" entfällt bis auf Titel und Artefakt und beim Plan-Review die Commit-Prüfung (Frage nach dem Freigeben, wie bisher); `Nächster Schritt` und `Auswahl-Hinweis` entfallen (der Bericht enthält sie).
- `skills/review-followup/SKILL.md` und `references/flow.md`: Bericht, `Nächster Schritt` und Auswahl-Text wie oben; `alle` im `argument-hint`.

## 5. Abnahmekriterien

1. Der Bericht eines Spec-Review und eines Plan-Review (Status je `sauber`, `nicht bereit`, `Fragen offen`, `unvollständig`) hat Kopf `## <Titel> · Ergebnis · <Thema>`, die passende Ergebnis-Zeile, die Ablauf-Zeile und die Abschnitte in der Reihenfolge aus 4.3; leere Abschnitte fehlen; „Wie es weitergeht" enthält die Befehle der Tabelle mit dem Pfad aus `--artefakt`.
2. Im Bericht kommen weder `AC-\d+`, `Task \d+`, `R\d+`, `F · `, `W · ` noch Kategorie-Namen, Gruppennummern oder Tabellen vor, außer in Fallback-Texten (Scout-Ausfall) und im Feld `Beleg:`.
3. „Was sich … geändert hat" nennt die Änderung (`change`) und das Urteil der Nachprüfung.
4. „Deine Entscheidungen" enthält je beantworteter Frage eine Zeile mit `decision`.
5. Eine bereits korrigierte (`erledigt`) oder per Antwort entschiedene Gruppe erscheint nicht unter „Noch offen" und nicht in `abschluss/scout.md`.
6. `prepare.js review-followup <artefakt> alle` wählt genau die gesicherten (offenen) Gruppen mit bevorzugtem Vorschlag; `b` verhält sich gleich; `1:2` bleibt gültig.
7. Nach einem Followup enthält die Sicherung nur noch offene Gruppen; sind keine offen, ist sie weg.
8. `scout-check --review plan-review` weist eine Gruppe ohne `Titel`, `Beschreibung` oder `Empfehlung` oder mit Kürzel ab; `implementation-review` bleibt unverändert.
9. `rework-check` und `answers-check` weisen Kürzel, Überlänge und fehlende Pflichtfelder aus 4.1 ab, auch im Folge-Modus und beim Plan-Review.
10. `report` schreibt `abschluss/bericht.md` mit dem Berichtstext; die Hinweise zum Ablauf nennen Warnungen aus `hinweise.json` und Nachforderungen aus `versuche.json` in Klartext mit Auswirkung.
11. `flow.md` (Ende), die Skills und `references/flow.md` enthalten keine Anweisung mehr, `Hinweise des Orchestrators`, `Nächster Schritt: <Text des Skills>` oder die `save`-Ausgabe anzuhängen.
12. Alle bisherigen Tests laufen grün, soweit sie nicht das alte Berichtsformat prüfen; die Review-Logik ist unverändert.

## 6. Tests

| Test | Inhalt |
|---|---|
| `tests/report-text.test.js` (neu) | Kopf, Ergebnis-Zeilen, Ablauf-Zeile, jeder Abschnitt, Fallbacks, Singular/Plural, Wie-es-weitergeht-Tabelle |
| `tests/review-flow-report.test.js` | Bericht für spec-review und plan-review (Regex auf Kopf und Abschnitte), `bericht.md`, Filter der gesicherten Gruppen, Hinweise aus `hinweise.json` und `versuche.json` |
| `tests/followup.test.js`, `tests/prepare.test.js` | `alle`, `b`-Alias, `sicherung-vorher/`, `followup.json` |
| `tests/review-followup-skill.test.js` | neuer Berichtsteil, `alle` im Hinweis |
| `tests/review-flow-round-one.test.js`, `tests/review-flow-rework.test.js` | `Empfehlung` und Plan-Scout bei `scout-check`, Klartext-Pflichten für Plan und Folge-Modus, `answers-check` |
| `tests/agents.test.js` | die vier Agent-Prompts nennen Felder und Klartext-Regeln |
| `tests/review-flow-doc.test.js`, `tests/plan-review-skill.test.js` | `flow.md`-Ende ohne Anhänge; Plan-Review-Skill ohne eigenen Nächsten Schritt, mit Commit-Prüfung |

## 7. Risiken

- **Mehr Pflichtfelder** für Scout (`Empfehlung`), Plan-Scout, Plan-Nacharbeit, Antworten: längere Prompts, mehr Nachforderungen. Die Klartext-Prüfung ist wie in TP-B eine Muster-Prüfung.
- **Alte Arbeitsbereiche** (`.forge/…`) mit altem `rework.json` oder ohne `hinweise.json`/`reviewers`: `report` scheitert mit klarer Meldung, nie mit falschem Text.
- **Commit-Frage des Plan-Reviews** bleibt im Skill, weil sie einen Dialog mit Git-Status braucht; der Bericht nennt nur den Schritt.
- **TP-C2** nutzt `report-text.js`, `hinweise.json` und die Klartext-Felder; die Bezeichnungen hier gelten dort weiter.
