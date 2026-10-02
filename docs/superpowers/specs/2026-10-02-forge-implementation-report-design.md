# dv-forge TP-C2: Abschlussbericht des Implementierungs-Reviews

**Plugin:** `plugins/forge` (dv-forge)
**Teil von:** Wunsch „Lesbare Review-Ausgabe und garantierte Ausgabe im Chat". TP-C2 ist der vierte und letzte Teil (TP-A Stop-Hook, TP-B Anhalten-Format, TP-C1 Bericht für Spec und Plan, TP-C2 dieser Teil).
**Voraussetzung:** TP-A, TP-B und TP-C1 sind zusammengeführt. TP-C2 nutzt `plain-text.js`, `reviewer-names.js` (Einträge für `implementation-review` stehen dort), `scoutTexts`/`scoutBlocks`/`scout-check`, `bericht.md` samt `show` und `guard-orchestrator.js`.
**Status:** Design mit dem Menschen abgestimmt am 2026-10-02.

## 1. Problem

Der Bericht des Implementierungs-Reviews entsteht im Orchestrator aus der Konsolenausgabe von `aggregate-findings.js`: Tabelle mit Dateistellen und Kürzeln, Scout-Abschnitt wörtlich, ein Nächster-Schritt-Text mit Auswahl-Hinweis `1:2,3:1`. Der Orchestrator darf im geschützten Repo nichts lesen oder schreiben; der Bericht liegt in keiner Datei, der Stop-Hook aus TP-A kann ihn nicht absichern. Der Scout schreibt nur technische Vorschläge. Nach einem Followup der Implementierung bleiben bereits umgesetzte Gruppen in der Sicherung und würden von `alle` erneut gewählt.

## 2. Ziel und Abgrenzung

Der Bericht des Implementierungs-Reviews kommt aus einem Skript, ist Klartext ohne Kürzel und Dateistellen, liegt in `abschluss/bericht.md` und ist über TP-A abgesichert. Nach einem Followup der Implementierung enthält die Sicherung nur noch offene Gruppen.

Nicht Teil von TP-C2: ein Skript-Bericht für das Followup der Implementierung (sein Bericht nach `shared/review-loop/report-format.md` bleibt), Nachforderungs-Hinweise (der Implementierungs-Loop führt keine `versuche.json`), die Review-Logik von `aggregate-findings.js` (Einstufung, Gruppen, Konsolenausgabe).

## 3. Abgestimmtes Beispiel (Aufbau verbindlich, Inhalt nur Beispiel)

```markdown
## Implementierungs-Review · Ergebnis · Bestellsumme berechnen
**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen
Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung.

### Was geprüft wurde
- Bereich: `a1b2c3d..HEAD`
- 14 geänderte Dateien, davon 6 Tests
- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken

### Gefunden
- Abnahmekriterien: 0 Hindernisse, 0 Hinweise
- Treue zum Plan: 0 Hindernisse, 0 Hinweise
- Aufbau: 0 Hindernisse, 1 Hinweis
- Tests: 0 Hindernisse, 0 Hinweise
- Risiken: 0 Hindernisse, 0 Hinweise

### Noch offen · kein Hindernis für das Abschließen
- 🟡 **Rundung der Summe** · aus: Aufbau
  Die Rundung steht an zwei Stellen und kann auseinanderlaufen.
  Vorschlag (empfohlen): die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.

### Hinweise zum Ablauf
- Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.

### Wie es weitergeht
1. Den Hinweis einarbeiten lassen (optional):
   `/dv-forge:review-followup docs/forge/x/plan.md alle`
2. Arbeit abschließen:
   `/dv-forge:finish-work`
```

## 4. Anforderungen

### 4.1 Strukturierte Ergebnisse (`aggregate-findings.js`)

Mit `--dir <D>` schreibt `aggregate-findings.js` zusätzlich `<D>/ergebnis.json`:

```json
{
  "reviewers": ["acceptance", "design"],
  "failed": ["risks"],
  "counts": { "red": 0, "yellow": 1, "green": 0 },
  "groups": [
    { "location": "src/round.js", "severity": "yellow", "reviewers": ["design"],
      "items": [{ "reviewer": "design", "severity": "yellow", "location": "src/round.js:12", "quote": "…", "consequence": "…", "rationale": "…" }] }
  ]
}
```

`reviewers` sind die gelieferten, `failed` die ausgefallenen Reviewer. Die Konsolenausgabe und `aggregate.md` bleiben byte-gleich.

### 4.2 Scout (nur Implementierung)

- `agents/implementation-review-scout.md` schreibt je 🔴/🟡-Gruppe direkt unter der Überschrift `Titel: <2 bis 6 Wörter>`, `Beschreibung: <was das Problem ist>`, `Empfehlung: <Klartext>`: Klartext für einen Menschen, der den Code nicht vor sich hat, ohne Kürzel (`AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `), ohne Dateipfade, jede Zeile höchstens 400 Zeichen. Die Empfehlung nennt den bevorzugten Vorschlag mit kurzem Grund.
- `review-flow.js scout-check --review implementation-review --dir <D>` prüft wie bei Spec und Plan (TP-C1). Die erwarteten Gruppen sind die 🔴/🟡-Gruppen von `<D>/aggregate.md`, weil es keine `scout-eingabe.md` gibt (`parseRework` auf die Zeilen nach `=== REWORK ===`, ohne 🟢).

### 4.3 Hinweise der Vorbereitung

`prepare.js implementation-review` schreibt `<W>/hinweise.json` (JSON-Liste). Die Warnung zu Commits nach dem Umsetzungsbericht (`WARN`-Zeile bleibt) wird zu:
- `Nach dem Umsetzungsbericht (Stand <x>) gibt es weitere Commits: <commits>. Sie fehlen in den Urteilen der Umsetzung.`
- bei nicht prüfbarem Stand: `Der Stand <x> des Umsetzungsberichts ließ sich nicht prüfen (<grund>). Ob Commits nach dem Bericht fehlen, ist unbekannt.`

Ohne Warnung ist die Liste leer.

### 4.4 Skript `scripts/implementation-report.js` (neu)

Aufruf: `node implementation-report.js --dir <D> --workspace <W> --plan <P> --bereich <B> --paket <K>` (alle Pflicht; `<D>` ist der Ordner der letzten Runde, `<K>` die Paketdatei).

Es liest `<D>/ergebnis.json`, `<D>/scout.md` (nur wenn offene Gruppen existieren), `<W>/hinweise.json` (fehlt: leere Liste), den Plan (erste `# `-Überschrift) und das Paket. Es schreibt `<W>/abschluss/aggregate.md` und `<W>/abschluss/scout.md` mit **nur den 🔴/🟡-Gruppen** (aggregate im Format `### <icon> <stelle> (<reviewer>)` mit Finding-Zeilen, Scout-Blöcke der offenen Gruppen) sowie `<W>/abschluss/bericht.md`, und gibt `ENDE <status>`, `=== BERICHT ===` und den Text aus. `<W>/abschluss` wird zuvor geleert.

Status (unverändert): `unvollständig nach Review 1, ausgefallen: <liste>` bei ausgefallenen Reviewern; sonst `sauber nach Review 1` ohne 🔴; sonst `geprüft, k × 🔴 offen` mit `k` = Zahl der 🔴-Gruppen. Ein Fehler (fehlende `ergebnis.json`) endet mit Exit 1 und `dv-forge implementation-report: <grund>`.

Der Scout gilt als gültig, wenn `checkScout(<D>, 'implementation-review')` `SCOUT ok` liefert. Bei offenen Gruppen ohne gültigen Scout: Rückfalltexte (Titel = Stelle, Beschreibung = gekürzte Konsequenz des ersten Findings plus ` (ohne Scout-Beschreibung)`, keine Vorschlagszeile) und der Hinweis `Der Scout hat keine gültigen Vorschläge geliefert; Beschreibungen stammen aus den Prüfergebnissen.`; `abschluss/scout.md` entfällt dann.

### 4.5 Bericht

Abschnitte in dieser Reihenfolge; ein Abschnitt ohne Einträge entfällt, außer Kopf und „Wie es weitergeht":

1. **Kopf:** `## Implementierungs-Review · Ergebnis · <Thema>` (Thema: erste `# `-Überschrift des Plans, sonst entfällt ` · <Thema>`).
2. **Ergebnis-Zeile:** `✅ Bereit zum Abschließen` (plus ` · <n> kleine Hinweise offen`, `1 kleiner Hinweis`), `⛔ Noch nicht bereit · <k> Hindernisse offen` (`1 Hindernis`), `⚠️ Unvollständig · <Blickwinkel> ausgefallen`.
3. **Ablauf-Zeile:** `Ablauf: Prüfung aus <Zahlwort> Blickwinkeln, keine Überarbeitung.` (Zahl = gelieferte plus ausgefallene Reviewer; Zahlwörter wie in TP-C1; bei 1 „aus einem Blickwinkel").
4. **`### Was geprüft wurde`:** `- Bereich: \`<B>..HEAD\``; `- <d> geänderte Dateien, davon <t> Tests` (näherungsweise aus dem Abschnitt `## Dateien` des Pakets: Zeilen mit ` | `; Test-Dateien nach Pfad-Muster `tests/`, `test/`, `__tests__/`, `.test.`, `.spec.` oder Dateiname endet auf `Test`/`Tests`/`test`/`tests` vor der Endung); `- Blickwinkel: <Namen>` (Anzeigenamen über `reviewerLabel('implementation-review', …)`, gelieferte und ausgefallene).
5. **`### Gefunden`:** je Blickwinkel `- <Name>: <r> Hindernisse, <y> Hinweise` (`1 Hindernis`, `1 Hinweis`, `keine Hindernisse`/`keine Hinweise` bleiben mit Zahl 0 ausgeschrieben als `0 Hindernisse`), ausgefallene `- <Name>: ausgefallen`. Zählt Findings (nicht Gruppen) der Stufen rot/gelb je Reviewer.
6. **`### Noch offen · Hindernis`** und **`### Noch offen · kein Hindernis für das Abschließen`:** wie in TP-C1 (`- <🔴|🟡> **<Titel>** · aus: <Blickwinkel>`, Beschreibung, `Vorschlag (empfohlen): <Empfehlung>`).
7. **`### Hinweise zum Ablauf`:** Texte aus `hinweise.json`; je ausgefallenem Reviewer `Der Prüfer für <Blickwinkel> ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.`; der Scout-Hinweis aus 4.4.
8. **`### Wie es weitergeht`** mit `<P>` = `--plan`:

| Status | Schritte |
|---|---|
| `sauber`, keine 🟡 | 1. Arbeit abschließen: `/dv-forge:finish-work` |
| `sauber`, <n> 🟡 | 1. Den Hinweis / die <n> Hinweise einarbeiten lassen (optional): `/dv-forge:review-followup <P> alle` 2. Arbeit abschließen: `/dv-forge:finish-work` |
| `geprüft, k × 🔴` | 1. Das Hindernis / die <k> Hindernisse einarbeiten lassen (oder selbst beheben): `/dv-forge:review-followup <P> alle` 2. Danach erneut prüfen: `/dv-forge:implementation-review <P>` |
| `unvollständig` | 1. Den Lauf in einer frischen Session erneut starten: `/dv-forge:implementation-review <P>` |

Der Renderer ist eine reine Funktion `renderImplementationReport(input)` in `scripts/lib/implementation-report-text.js` und nutzt die Hilfsfunktionen aus `report-text.js` (TP-C1), die dafür exportiert werden.

### 4.6 Ablauf und Guard

- `scripts/guard-orchestrator.js`: `implementation-report.js` kommt in `ALLOWED_SCRIPTS`, damit der Orchestrator es aufrufen darf.
- `shared/review-loop/loop.md`, „Abschluss", gilt nur für den Implementierungs-Review und lautet danach: (1) Abschluss-Scout wie bisher; danach `review-flow.js scout-check --review implementation-review --dir "<D>"`; `SCOUT ungültig: <grund>`: einmal neu starten mit dem Zusatz `Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>`, danach weiter (das Skript behandelt einen weiter ungültigen Scout). (2) `node "<PLUGIN>/scripts/implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"`. (3) `followup.js save <rolle> <slug> "<W>/abschluss"`, die Ausgabe wird nicht gezeigt. (4) Bericht im Chat: der Text nach `=== BERICHT ===` unverändert, nichts committen, Vorrang-Satz (TP-A). (5) `guard-orchestrator.js show <SESSION> --file "<W>/abschluss/bericht.md"`, dann die zwei Befehle aus „Jedes Ende".
- `skills/implementation-review/SKILL.md`: Der Abschnitt „Bericht" nennt nur Titel und Artefakt und dass das Skript den Rest liefert; `Auswahl-Hinweis` und `Nächster Schritt` entfallen; die Zeile zu `WARN` in „Eingaben" nennt, dass der Bericht die Hinweise enthält. `<B>` und `<K>` stammen aus `prepare.js`.
- `shared/review-loop/report-format.md` bleibt für das Followup der Implementierung unverändert.

### 4.7 Followup der Implementierung: `alle` und offene Gruppen

- `followup.js keep <rolle> <slug> <nummern>` schreibt die Sicherung neu und behält nur die Gruppen mit den genannten Nummern (kommagetrennt, Nummern der aktuellen Sicherung): `aggregate.md` mit den Gruppen, `scout.md` mit deren Scout-Blöcken, `meta.json` unverändert. Ohne Nummern oder bei Nummern ohne passende Gruppe räumt es die Sicherung weg wie `drop`. Ungültige Nummern oder fehlende Sicherung: Exit 1 mit Meldung.
- `skills/review-followup/references/flow.md`, Abschnitt Nachprüfung/Implementierung Schritt 3: `Ist offen leer: followup.js drop review <slug>. Sonst, wenn das Urteil alle behoben, keine neuen 🔴 lautet: followup.js keep review <slug> <offen>. Sonst bleibt die alte Sicherung.` Der Abschnitt „Nächster Schritt" der Datei nennt für die Implementierung `/dv-forge:review-followup <artefakt> alle` statt `<g>:<n|b>,… mit den bisherigen Nummern`.
- Der Bericht des Followups der Implementierung bleibt (`report-format.md`).

## 5. Abnahmekriterien

1. `aggregate-findings.js --dir` schreibt `ergebnis.json` im Format aus 4.1; Konsolenausgabe und `aggregate.md` sind unverändert.
2. `scout-check --review implementation-review` weist Gruppen ohne `Titel`, `Beschreibung`, `Empfehlung`, mit Kürzel, Überlänge oder falscher Wortzahl ab und nimmt vollständige Dateien an; die erwarteten Gruppen sind die 🔴/🟡 aus `aggregate.md`.
3. `prepare.js implementation-review` schreibt `hinweise.json` (leer oder mit den Klartext-Sätzen aus 4.3).
4. `implementation-report.js` erzeugt für `sauber`, `geprüft` und `unvollständig` Kopf, Ergebnis-Zeile, Ablauf-Zeile und Abschnitte in der Reihenfolge aus 4.5; `abschluss/aggregate.md` und `scout.md` enthalten nur 🔴/🟡-Gruppen; die ausgegebene Statuszeile ist `ENDE <status>` wie bisher.
5. Im Bericht kommen weder Dateistellen noch Kürzel (`AC-nn`, `Task n`, …) noch Tabellen vor, außer in Rückfalltexten und im Bereich `` `<B>..HEAD` ``.
6. Ein ungültiger oder fehlender Scout lässt das Skript nicht scheitern: Rückfalltexte plus Hinweis, keine `abschluss/scout.md`.
7. „Gefunden" zählt Findings je Blickwinkel; ausgefallene Reviewer stehen als „ausgefallen".
8. `loop.md`, `SKILL.md` des Implementierungs-Reviews enthalten die Schritte aus 4.6 (Skript-Aufruf, `save` ohne Anzeige, `show`) und keinen Auswahl-Hinweis mehr; `guard-orchestrator.js` erlaubt `implementation-report.js`.
9. `followup.js keep` lässt nur die genannten Gruppen samt Scout-Blöcken in der Sicherung; `alle` wählt danach nur diese.
10. Alle bisherigen Tests laufen grün, soweit sie nicht das alte Berichtsformat des Implementierungs-Reviews prüfen.

## 6. Tests

| Test | Inhalt |
|---|---|
| `tests/aggregate-file.test.js` | `ergebnis.json`, byte-gleiche Konsole und `aggregate.md` |
| `tests/review-flow-round-one.test.js` oder neues `tests/implementation-scout-check.test.js` | Kriterium 2 |
| `tests/prepare.test.js` | `hinweise.json` beider Fälle |
| `tests/implementation-report-text.test.js` (neu) | Renderer: Layout, Ergebnis-Zeilen, Singular/Plural, Wie-es-weitergeht |
| `tests/implementation-report.test.js` (neu) | Skript Ende-zu-Ende: Status, Dateien, Filter, Rückfall, Test-Zählung, Fehlerfall |
| `tests/followup.test.js` | `keep` |
| `tests/guard-orchestrator.test.js`, `tests/guard-implementation-review.test.js` | Skript erlaubt |
| `tests/implementation-review-skill.test.js`, `tests/review-loop.test.js`, `tests/review-followup-skill.test.js` | neue Ablauftexte, `alle` im Followup-Text |
| `tests/agents.test.js` | `implementation-review-scout` nennt die drei Felder |

## 7. Risiken

- **Test-Zählung ist eine Näherung** (Pfad-Muster, von `git diff --stat` gekürzte Pfade). Der Bericht nennt sie so (`davon 6 Tests`), ohne Anspruch auf Genauigkeit.
- **Reviewer-Zusammenfassungen** (`summary`) erscheinen nicht, weil sie keine Klartext-Garantie haben; sie bleiben in `aggregate.md`.
- **Keine Nachforderungs-Hinweise:** Ein neu gestarteter Reviewer fällt im Bericht nicht auf; nur Ausfälle erscheinen.
- **`keep`** ändert eine bestehende Sicherung; es greift nur, wenn das Urteil des Re-Reviewers sauber ist. Bei offenem Urteil bleibt die Sicherung wie bisher, und `alle` wählt auch bereits angefasste Gruppen erneut; das ist beabsichtigt, denn sie sind nicht erledigt.
