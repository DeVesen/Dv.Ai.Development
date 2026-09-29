# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `original`, `offen`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht. Bei Spec und Plan gilt: `<DOC>` ist `<S>` bei `original=spec-review` und `<P>` bei `original=plan-review`; `<FLAGS>` = `--review <original> --dir "<W>" --doc "<DOC>" --quelle nacharbeit`, bei `plan-review` dazu `--spec "<S>"`. Nachfordern und den Scout führst du aus wie in `<PLUGIN>/shared/review-flow/flow.md`, Abschnitte Nachfordern und Scout.

## Umsetzen

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" snapshot --dir "<W>" --doc "<DOC>"`. Die Zeile `EINTRAG R<n>` nennt die Kennung der Einträge.
2. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, dazu `Eintrag: R<n>`, `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
3. `node "<PLUGIN>/scripts/review-flow.js" rework-check <FLAGS>`. `NACHARBEIT ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`, dann Schritt 3.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise.

## Nachprüfung

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <FLAGS>`. Bei `plan-review` danach die Skript-Prüfungen: `node "<PLUGIN>/scripts/review-flow.js" script-checks <FLAGS> --runde runde-2`.
2. `NACHPRUEFER ja`: Nachprüfer des Original-Skills mit dessen Eingabezeilen, dazu `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/nachpruefung.json`. Kein Reviewer läuft.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <FLAGS>`. `NACHPRUEFUNG ungültig: <grund>`: nachfordern mit Instanz `nachprüfer`, dann Schritt 3.
4. `WEITER scout=hinweise`: Scout des Original-Skills mit `D = <W>/runde-2` und Instanz `scout-nachpruefung`.
5. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)" --artefakt "<artefakt>"`. Die Zeile `ENDE <status>` ist der Status; der Text nach `=== BERICHT ===` ist der Bericht.
6. Sicherung: Lief ein Scout, `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe ist der Scout-Abschnitt des Berichts. Lief keiner und ist `offen` nicht leer, entfällt `save`: Dann bleibt die alte Sicherung, und die Gruppen aus `offen` bleiben mit ihren Nummern wählbar. Lief keiner und ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop <rolle> <slug>`.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit dem Bericht.
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. Ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop review <slug>`. Sonst bleibt die alte Sicherung. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, Gruppen <offen> nicht gewählt`; sonst `offen nach Nach-Review`.

## Bericht
- Spec und Plan: der Bericht aus `report`, dann `### Hinweise des Orchestrators`, falls vorhanden, dann `### Umgesetzt` mit je `WAHL`-Zeile einem Punkt `- <WAHL>`, dann der Scout-Abschnitt aus Schritt 6.
- Implementierung: nach `<PLUGIN>/shared/review-loop/report-format.md` mit `**Reviews:** 1 · **Nacharbeiten:** 1`, ohne Nach-Review `**Reviews:** 0 · **Nacharbeiten:** 1`; `### Letztes Review` ist die Antwort des Re-Reviewers unverändert; dazu `### Umgesetzt` wie oben.

## Nächster Schritt
- `sauber nach Nachprüfung` oder `sauber nach Nach-Review`, `offen` leer: der Text des Original-Skills für `sauber`, bei Plan einschließlich der Commit-Prüfung.
- `sauber …` mit `offen` nicht leer: `Gruppen <offen> noch nicht umgesetzt: /dv-forge:review-followup <artefakt> <g>:<n|b>,… mit den bisherigen Nummern.`
- `Fragen offen`: der Text des Original-Skills für `Fragen offen`.
- `nicht bereit, …`: `Noch offen. Scout-Vorschläge oben lesen, dann /dv-forge:review-followup <artefakt> <auswahl> oder das volle Review erneut.` War `offen` nicht leer und lief ein Scout, zusätzlich `Nicht gewählte Gruppen findet nur das volle Review erneut.`
- Implementierung offen, `keine Änderung` oder `blockiert`: `/dv-forge:implementation-review <P> erneut.`
- `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
