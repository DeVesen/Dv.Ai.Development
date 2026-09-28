# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `original`, `offen`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht.

## Umsetzen

### Spec und Plan
1. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, ohne `Runde:` und `Findings:`, dazu `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
2. Zusatz-Stopps des Original-Skills mit `--dir "<W>/nacharbeit"` statt `--dir "<W>/runde-<r>"`: Fragen bzw. Spec-Rückfragen sammeln wie dort. `OUTCOME all-red-escalated=true`: kein Nach-Review, Status `Rückfrage offen`.
3. Bei `original=plan-review` und `A`: `node "<PLUGIN>/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"`, damit das Nach-Review die Anker des geänderten Plans sieht.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise.

## Nach-Review

### Spec und Plan
1. `D = <W>/runde-1`. Schritte 1 bis 4 aus `loop.md` mit `r = 1` und genau den Reviewern aus `aktiv`, jeder mit seinen Eingabezeilen aus dem Original-Skill; die Aggregation mit `--expect <aktiv> --round 1`.
2. Danach Abschluss-Schritte 1 und 2 aus `loop.md`: Scout bei `red` > 0 oder `yellow` > 0, dann `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<D>"`. Die Ausgabe ist der Scout-Abschnitt des Berichts. Lief kein Scout und ist `offen` nicht leer, entfällt `save`: Dann bleibt die alte Sicherung, und die Gruppen aus `offen` bleiben mit ihren Nummern wählbar.
3. Status: `clean=true` und `offen` leer → `sauber nach Nach-Review`; `clean=true` und `offen` nicht leer → `sauber nach Nach-Review, Gruppen <offen> nicht gewählt`; ausgefallene Reviewer → `unvollständig nach Nach-Review, ausgefallen: <liste>`; sonst `k × 🔴 offen nach Nach-Review`.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit dem Bericht.
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. Ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop review <slug>`. Sonst bleibt die alte Sicherung. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, Gruppen <offen> nicht gewählt`; sonst `offen nach Nach-Review`.

## Bericht
- `**Reviews:** 1 · **Nacharbeiten:** 1`; ohne Nach-Review `**Reviews:** 0 · **Nacharbeiten:** 1`.
- `### Letztes Review`: bei Spec und Plan der Abschnitt der Aggregation wie in `report-format.md`; bei der Implementierung die Antwort des Re-Reviewers unverändert.
- Zusatz-Abschnitt `### Umgesetzt`: je `WAHL`-Zeile ein Punkt `- <WAHL>`.
- Fragen bzw. Spec-Rückfragen als Zusatz-Abschnitt wie im Original-Skill.

## Nächster Schritt
- `sauber nach Nach-Review`: der Text des Original-Skills für `sauber`, bei Plan einschließlich der Commit-Prüfung.
- `…, Gruppen <offen> nicht gewählt`: `Gruppen <offen> noch nicht umgesetzt: /dv-forge:review-followup <artefakt> <g>:<n|b>,… mit den bisherigen Nummern.`
- `Rückfrage offen`: der Text des Original-Skills für Fragen bzw. Spec-Rückfragen.
- Spec oder Plan offen: `Noch offen. Scout-Vorschläge oben lesen, dann /dv-forge:review-followup <artefakt> <auswahl> oder das volle Review erneut.` War `offen` nicht leer, fehlen diese Gruppen in der neuen Sicherung; dann zusätzlich `Nicht gewählte Gruppen findet nur das volle Review erneut.`
- Implementierung offen, `keine Änderung` oder `blockiert`: `/dv-forge:implementation-review <P> erneut.`
- `unvollständig`: `Ausgefallene Reviewer: <liste>. Den Skill in einer frischen Session erneut starten.`
