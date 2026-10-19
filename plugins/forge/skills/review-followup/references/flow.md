# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `original`, `offen`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht. Bei Spec und Plan gilt: `<DOC>` ist `<S>` bei `original=spec-review` und `<P>` bei `original=plan-review`; `<FLAGS>` = `--review <original> --dir "<W>" --doc "<DOC>" --quelle nacharbeit`, bei `plan-review` dazu `--spec "<S>"`. Nachfordern und den Scout führst du aus wie in `<PLUGIN>/shared/review-flow/flow.md`, Abschnitte Nachfordern und Scout.

Meldet `attempt` für `nacharbeit` oder `nachprüfer` `AUSGEFALLEN`, geht es statt mit dem Abschnitt Ende von `flow.md` mit Schritt 5 der Nachprüfung (`report`) weiter, danach Schritt 6 ohne `save` und ohne `drop`.

## Umsetzen

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" snapshot --dir "<W>" --doc "<DOC>"`. Die Zeile `EINTRAG R<n>` nennt die Kennung der Einträge.
2. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, dazu `Eintrag: R<n>`, `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
3. `node "<PLUGIN>/scripts/review-flow.js" rework-check <FLAGS>`. `NACHARBEIT ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`, dann Schritt 3.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise; weiter mit Schritt 3 der Nachprüfung (`--ohne blockiert`).

## Nachprüfung

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <FLAGS>`. Bei `plan-review` danach die Skript-Prüfungen: `node "<PLUGIN>/scripts/review-flow.js" script-checks <FLAGS> --runde runde-2`.
2. `NACHPRUEFER ja`: Nachprüfer des Original-Skills mit dessen Eingabezeilen, dazu `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/nachpruefung.json`. Kein Reviewer läuft.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <FLAGS>`. `NACHPRUEFUNG ungültig: <grund>`: nachfordern mit Instanz `nachprüfer`, dann Schritt 3.
4. `WEITER scout=hinweise`: Scout des Original-Skills mit `D = <W>/runde-2` und Instanz `scout-nachpruefung`.
5. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)" --artefakt "<artefakt>"`. Die Zeile `ENDE <status>` ist der Status; der Text nach `=== BERICHT ===` ist der Bericht.
6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit Schritt 3 der Nachprüfung (`--ohne keine-aenderung`).
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. Berichtsdaten und Sicherung: `node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" --bericht "<BD>" <<'ANTWORT'`, darunter die Antwort des Re-Reviewers unverändert, dann eine Zeile `ANTWORT`. `<BD>` ist der Wert nach `--bericht` aus `$ARGUMENTS`, sonst `<W>/bericht-followup.json`. Ohne Nach-Review statt der Antwort `--ohne blockiert` bzw. `--ohne keine-aenderung`, ohne Heredoc. Die Zeile `BEHALTEN <x>` der Ausgabe entscheidet über die Sicherung: `keine` → `node "<PLUGIN>/scripts/followup.js" drop review <slug>`; Nummern → `node "<PLUGIN>/scripts/followup.js" keep review <slug> <nummern>`, die Sicherung behält dann nur nicht gewählte und nicht bestätigte Gruppen; `unveraendert` → nichts, es bleibt die alte Sicherung. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen`; sonst `offen nach Nach-Review`. Der Re-Reviewer urteilt je Gruppe; `offen nach Nach-Review` gilt auch, wenn eine gewählte Gruppe nicht `behoben` ist oder ein neues 🔴 gemeldet wird. Es ist die Zeile `ENDE <status>` der Ausgabe von Schritt 3.

## Bericht
- Spec und Plan: der Text nach `=== BERICHT ===` unverändert.
- Implementierung: nach `<PLUGIN>/shared/review-loop/report-format.md` mit `**Reviews:** 1 · **Nacharbeiten:** 1`, ohne Nach-Review `**Reviews:** 0 · **Nacharbeiten:** 1`; `### Letztes Review` ist die Antwort des Re-Reviewers unverändert; dazu `### Umgesetzt` mit je `WAHL`-Zeile einem Punkt `- <WAHL>`.
Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht. Bei Spec und Plan liegt der Teil aus `report` in `<W>/abschluss/bericht.md` und wird vor dem Freigeben mit `guard-orchestrator.js show` vorgemerkt; bei der Implementierung gibt es keine Berichtsdatei, dort gilt nur der Satz.

## Eingebetteter Lauf
Nennt `$ARGUMENTS` `--bericht <BD>`, zeigt der aufrufende Orchestrator am Ende selbst einen Bericht. Dann gilt statt der Abschnitte Bericht und Nächster Schritt:
- Spec und Plan: `report` (Nachprüfung, Schritt 5) bekommt zusätzlich `--bericht "<BD>"`; die Ausgabe sind vier Zeilen `ENDE <status>`, `ERGEBNIS <ergebnis>`, `FOLLOWUP <ja|nein>` und `BERICHT <BD>`. Auch nach `AUSGEFALLEN`.
- Implementierung: Schritt 3 der Nachprüfung läuft mit dem `<BD>` aus `$ARGUMENTS`. Die Ausgabe hat die vier Zeilen und dazu `BEHALTEN <x>`; `FOLLOWUP ja` heißt, die Sicherung behält Vorschläge, die `review-followup <P> alle` erreicht.
- In Schritt 6 entfällt `show`. Im Chat nur die eine Zeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <BD>`; keine Commit-Prüfung, keine Frage, nichts weiter.

## Nächster Schritt
Bei Spec und Plan steht der nächste Schritt im Bericht; nur beim Plan kommt die Commit-Prüfung dazu, und nur unter der Bedingung der nächsten Zeile. Die übrigen Zeilen gelten für die Implementierung.
- `original=plan-review`, Status `sauber …` und der Berichtstext nach `=== BERICHT ===` hat die Ergebnis-Zeile `✅ Bereit zur Umsetzung` und keinen Abschnitt `### Noch offen · Hindernis`: nach dem Freigeben des Guards `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: beide sind committet, keine Frage. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Bei Nein oder ohne Antwort: kein Commit. Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben. Steht im Bericht `⛔ Noch nicht bereit` oder `### Noch offen · Hindernis`: keine Commit-Prüfung und keine Frage.
- `sauber nach Nach-Review`, `offen` leer: `Alles sauber. Arbeit abschließen mit:` und darunter in einem Code-Block `/dv-forge:finish-work`.
- `sauber …` mit `offen` nicht leer: `Noch nicht umgesetzt: /dv-forge:review-followup <artefakt> alle.`
- Implementierung `offen nach Nach-Review` mit `BEHALTEN <nummern>`: `Noch nicht umgesetzt: /dv-forge:review-followup <artefakt> alle.`
- Implementierung offen, `keine Änderung` oder `blockiert`: `/dv-forge:implementation-review <P> erneut.`
- `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
- Implementierung mit Ketten-Eintrag: `node "<PLUGIN>/scripts/chain.js" lookup --stage implementation --plan "<P>"`. Gibt die Ausgabe `worktree=<R>` und `branch=<b>` aus (nicht `KEIN EINTRAG`), steht in jedem der Fälle oben die Zeile `Worktree bleibt: <R>` vor und die Zeile ``Nicht gepusht: `git push -u origin <b>` `` nach dem Text des nächsten Schritts. Bei `sauber …`, auch mit `offen` nicht leer, lautet der Abschluss-Schritt `Arbeit abschließen (nur manuell, in <R>):` mit `/dv-forge:finish-work` im Code-Block; das Angebot `Noch nicht umgesetzt: …` bleibt daneben stehen.
