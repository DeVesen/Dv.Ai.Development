# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `original`, `offen`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht.

## Umsetzen

### Spec und Plan
`<DOK>` ist `<S>` bei `original=spec-review` und `<P>` bei `original=plan-review`.
1. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, dazu `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" followup-checklist <original> "<DOK>" "<W>"`. `PRUEFLISTE ungueltig`: Ausfall-Regel aus `<PLUGIN>/shared/review-flow/flow.md` für die Nacharbeit; ausgefallen: Status `unvollständig, ausgefallen: nacharbeit`, weiter mit dem Bericht.
3. Bei `original=plan-review` und `A`: `node "<PLUGIN>/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"`.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise.

## Nach-Review

### Spec und Plan
Kein Reviewer läuft. Die Nachprüfung folgt Runde 2 aus `<PLUGIN>/shared/review-flow/flow.md`:
1. `nachpruefer=ja`: der Nachprüfer des Original-Skills mit dessen Eingabezeilen, `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/verifier.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" verify <original> "<DOK>" "<W>"`. `NACHPRUEFUNG ungueltig`: Ausfall-Regel für den Nachprüfer.
3. `NEXT scout=ja`: der Scout des Original-Skills mit `Findings: <W>/runde-2/scout-input.md` und `Ergebnis: <W>/runde-2/scout.md`, dann `node "<PLUGIN>/scripts/review-flow.js" scout-check "<W>" 2`. `SCOUT ungueltig`: Ausfall-Regel aus `<PLUGIN>/shared/review-flow/flow.md`; ist der Scout ausgefallen, weiter ohne seine Vorschläge, in den Hinweisen steht `Scout ausgefallen`.
4. `node "<PLUGIN>/scripts/review-flow.js" finish <original> "<DOK>" "<W>" --title "Review-Followup (<original>)"`, bei Ausfällen mit `--ausgefallen <namen>`. Die Zeile `STATUS` ist der Status.
5. Sichern: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/bericht"`, außer `hinweise=0` und `offen` ist nicht leer: Dann bleibt die alte Sicherung, und die Gruppen aus `offen` bleiben mit ihren Nummern wählbar.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit dem Bericht.
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. Ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop review <slug>`. Sonst bleibt die alte Sicherung. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, Gruppen <offen> nicht gewählt`; sonst `offen nach Nach-Review`.

## Bericht
- Spec und Plan: der Abschnitt nach `=== BERICHT ===` aus `finish`, unverändert, danach die Ausgabe von `save` ab `## Scout-Vorschläge`. Implementierung: `**Reviews:** 1 · **Nacharbeiten:** 1`, ohne Nach-Review `**Reviews:** 0 · **Nacharbeiten:** 1`.
- Implementierung: `### Letztes Review` mit der Antwort des Re-Reviewers unverändert.
- Zusatz-Abschnitt `### Umgesetzt`: je `WAHL`-Zeile ein Punkt `- <WAHL>`.
- Fragen bzw. Spec-Rückfragen als Zusatz-Abschnitt wie im Original-Skill.

## Nächster Schritt
- Spec und Plan `sauber nach Nachprüfung` und `offen` leer: der Text des Original-Skills für `sauber …`, bei Plan einschließlich der Commit-Prüfung.
- Spec und Plan `sauber nach Nachprüfung` und `offen` nicht leer: `Gruppen <offen> nicht gewählt: /dv-forge:review-followup <artefakt> <g>:<n|b>,… mit den bisherigen Nummern.`
- Spec und Plan `Fragen offen`: der Text des Original-Skills für `Fragen offen`.
- Spec und Plan `nicht bereit …`: `Noch offen. Nachprüfung und Scout-Vorschläge oben lesen, dann /dv-forge:review-followup <artefakt> <auswahl> oder das volle Review erneut.` War `offen` nicht leer, zusätzlich `Nicht gewählte Gruppen findet nur das volle Review erneut.`
- Implementierung offen, `keine Änderung` oder `blockiert`: `/dv-forge:implementation-review <P> erneut.`
- `unvollständig`: `Ausgefallene Reviewer: <liste>. Den Skill in einer frischen Session erneut starten.`
