# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `original`, `offen`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht. Bei Spec und Plan gilt: `<DOC>` ist `<S>` bei `original=spec-review` und `<P>` bei `original=plan-review`; `<FLAGS>` = `--review <original> --dir "<W>" --doc "<DOC>" --quelle nacharbeit`, bei `plan-review` dazu `--spec "<S>"`. Nachfordern und den Scout führst du aus wie in `<PLUGIN>/shared/review-flow/flow.md`, Abschnitte Nachfordern und Scout.

Meldet `attempt` für `nacharbeit` oder `nachprüfer` `AUSGEFALLEN`, geht es statt mit dem Abschnitt Ende von `flow.md` mit Schritt 5 von „Nachprüfung · Spec und Plan“ (`report`) weiter, danach mit dessen Schritt 6 ohne `save` und ohne `drop`.

## Umsetzen

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" snapshot --dir "<W>" --doc "<DOC>"`. Die Zeile `EINTRAG R<n>` nennt die Kennung der Einträge.
2. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, dazu `Eintrag: R<n>`, `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
3. `node "<PLUGIN>/scripts/review-flow.js" rework-check <FLAGS>`. `NACHARBEIT ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`, dann Schritt 3.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise; weiter mit Schritt 3 von „Nachprüfung · Implementierung“ (`--ohne blockiert`).

## Nachprüfung

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <FLAGS>`. Bei `plan-review` danach die Skript-Prüfungen: `node "<PLUGIN>/scripts/review-flow.js" script-checks <FLAGS> --runde runde-2`.
2. `NACHPRUEFER ja`: Nachprüfer des Original-Skills mit dessen Eingabezeilen, dazu `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/nachpruefung.json`. Kein Reviewer läuft.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <FLAGS>`. `NACHPRUEFUNG ungültig: <grund>`: nachfordern mit Instanz `nachprüfer`, dann Schritt 3.
4. `WEITER scout=<s>`: Ist `s` nicht `keiner`, läuft der Scout des Original-Skills mit `D = <W>/runde-2` und Instanz `scout-nachpruefung` (bei `rot-und-gelb` auch für nicht erledigte und neue 🔴).
5. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)" --artefakt "<artefakt>"`. Die Ausgabe hat zwei Zeilen: `ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat. Bericht und Bericht-Daten liegen in der Ablage der Etappe; `prepare.js` hat sie im Arbeitsbereich festgelegt.
6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit Schritt 3 dieses Abschnitts (`--ohne keine-aenderung`).
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. Bericht und Sicherung: `node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" <<'ANTWORT'`, darunter die Antwort des Re-Reviewers unverändert, dann eine Zeile `ANTWORT`. Die Ausgabe hat die Zeilen `ENDE <status>`, `STATUSZEILE <Review-Statuszeile>` und `BEHALTEN <x>`. Ohne Nach-Review statt der Antwort `--ohne blockiert` bzw. `--ohne keine-aenderung`, ohne Heredoc; bei `blockiert` dazu `--hinweis "<Rückgabe des Implementers in einer Zeile>"`. Die Zeile `BEHALTEN <x>` der Ausgabe entscheidet über die Sicherung: `keine` → `node "<PLUGIN>/scripts/followup.js" drop review <slug>`; Nummern → `node "<PLUGIN>/scripts/followup.js" keep review <slug> <nummern>`, die Sicherung behält dann nur nicht gewählte und nicht bestätigte Gruppen; `unveraendert` → nichts, es bleibt die alte Sicherung. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen`; sonst `offen nach Nach-Review`. Der Re-Reviewer urteilt je Gruppe; `offen nach Nach-Review` gilt auch, wenn eine gewählte Gruppe nicht `behoben` ist oder ein neues 🔴 gemeldet wird. Es ist die Zeile `ENDE <status>` der Ausgabe von Schritt 3.

## Ende
Im Chat steht als letzte Handlung genau die Review-Statuszeile, der Text nach `STATUSZEILE ` unverändert, nichts davor oder danach: kein Bericht, kein Hinweis, keine Frage. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diese Zeile.
