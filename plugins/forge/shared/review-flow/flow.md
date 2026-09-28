# Review-Ablauf (Spec und Plan)

Gemeinsamer Ablauf von `spec-review` und `plan-review`: Runde 1 sucht, Runde 2 prüft nur nach, es gibt höchstens eine Nacharbeit. `<PLUGIN>` und `<SESSION>` nennt dir der Skill. Er legt außerdem fest: Eingaben (Aufruf von `prepare.js`, liefert `W`, `slug`, `aktiv`), Reviewer, Nacharbeiter, Nachprüfer, Scout, `<art>` (`spec-review` oder `plan-review`), `<DOK>` (das geprüfte Dokument), `<Titel>`, `<rolle>` und den nächsten Schritt je Status.

## Rolle
Du orchestrierst, sonst nichts. Du liest die geprüften Dateien nicht, bewertest keine Findings, tippst keine Ergebnisse ab und änderst nichts selbst. Jede Entscheidung folgt aus einer Skript-Ausgabe. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Ablauf fort. Ein Hook blockt deine Zugriffe auf die geschützten Dateien.

Plugin-Dateien liest du mit `Read`. Jedes Skript startest du als einzelnen `node`-Aufruf, ohne `cat`, `&&`, `;`, `|` oder `echo` davor oder danach. Alle Agents laufen mit `run_in_background: false`; die Reviewer von Runde 1 startest du in EINER Nachricht.

`ausgefallen` ist zu Beginn leer.

## Ausfall
Meldet ein Skript eine Instanz als ungültig (`ausgefallen=` in `RUNDE1`, `ungueltig` bei den anderen Befehlen), gilt:
1. Du forderst sie genau einmal per `SendMessage` nach: `Schreib nur noch dein Ergebnis nach <pfad>, im vereinbarten Format. Fehler: <ERROR-Zeilen>`. Dann rufst du das Skript erneut auf.
2. Wieder ungültig: Du startest sie genau einmal als frische Instanz mit denselben Eingaben und dem Zusatz `Deine letzte Antwort hatte kein gültiges Ergebnis: <ERROR-Zeilen>`. Dann das Skript erneut.
3. Wieder ungültig: Sie ist ausgefallen. Beim Reviewer, bei der Nacharbeit und beim Nachprüfer kommt ihr Name in `ausgefallen`: der Kurzname des Reviewers, `nacharbeit` oder `nachprüfer`. Weiter mit „Abschluss“. Fällt der `scout` aus, bleibt `ausgefallen` unverändert: Der Lauf geht ohne seine Vorschläge weiter, die Nacharbeit bekommt dann nur die Findings, und unter den Hinweisen des Orchestrators steht `Scout ausgefallen`.

Für die Nacharbeit gilt dieses Budget einmal für die ganze Nacharbeit, über das Bündeln vor dem Anhalten und das Eintragen nach der Antwort zusammen. Fällt ein Reviewer in Runde 1 aus, endet der Lauf sofort. Fällt die Nacharbeit aus, endet der Lauf sofort; die Nachprüfung läuft dann nicht.

## Runde 1
1. Statuszeile `Runde 1: starte <anzahl> Reviewer (<aktiv>).` Dann je Reviewer ein `Agent`-Call mit den Eingaben aus dem Skill und `Ergebnis: <W>/runde-1/<kurzname>.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" round1 <art> "<DOK>" "<W>" <aktiv>`
3. Nennt `ausgefallen=` Reviewer: Ausfall-Regel je Reviewer, dann Schritt 2 erneut.
4. Statuszeile `Runde 1: <rot> × 🔴, <gelb> × 🟡, <fragen> offene Fragen.`
5. `NEXT scout=ja`: Scout mit den Eingaben aus dem Skill, `Findings: <W>/runde-1/scout-input.md` und `Ergebnis: <W>/runde-1/scout.md`; dann `node "<PLUGIN>/scripts/review-flow.js" scout-check "<W>" 1`. `SCOUT ungueltig`: Ausfall-Regel. Ist der Scout ausgefallen, weiter mit dem nächsten Schritt.
6. `nacharbeit=nein`: weiter mit „Abschluss“.

## Nacharbeit
1. Statuszeile `Nacharbeit läuft.` Nacharbeiter mit den Eingaben aus dem Skill, `Nacharbeit: <W>/runde-1/nacharbeit.md` und `Ergebnis: <W>/runde-1/rework.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" rework-check <art> "<DOK>" "<W>"`
   - `NACHARBEIT ungueltig`: Ausfall-Regel.
   - `NACHARBEIT buendelung`: Du forderst den Nacharbeiter einmal zur Korrektur auf: `Die Bündelung ist fehlerhaft: <ERROR-Zeilen>. Korrigiere nur "questions" in <W>/runde-1/rework.json.` Dann Schritt 2 erneut. Wieder `NACHARBEIT buendelung`: `nacharbeit` ist ausgefallen.
3. `anhalten=ja`: Du gibst den Abschnitt nach `=== FRAGEN ===` unverändert aus, rufst `node "<PLUGIN>/scripts/guard-orchestrator.js" pause <SESSION>` auf und beendest deine Antwort. Der Arbeitsbereich bleibt.
4. Antwortet der Mensch: Nacharbeiter im Antwort-Modus mit den Eingaben aus dem Skill, `Fragen: <W>/runde-1/fragen.md`, `Antworten: <Antwort des Menschen, wörtlich>` und `Ergebnis: <W>/runde-1/antworten.json`; dann `node "<PLUGIN>/scripts/review-flow.js" answers-check "<W>"`. `ANTWORTEN ungueltig`: Ausfall-Regel mit dem Restbudget der Nacharbeit.
5. Die Schritte des Skills unter „Nach der Nacharbeit“, falls vorhanden.

## Runde 2, Nachprüfung
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <art> "<DOK>" "<W>"`
2. `nachpruefer=ja`: Nachprüfer mit den Eingaben aus dem Skill, `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/verifier.json`. Kein Reviewer läuft ein zweites Mal. Bei `nachpruefer=nein` startest du keinen Nachprüfer.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <art> "<DOK>" "<W>"`. `NACHPRUEFUNG ungueltig`: Ausfall-Regel für den Nachprüfer.
4. Statuszeile `Nachprüfung: <offen> × 🔴 offen, <hinweise> neue Hinweise.`
5. `NEXT scout=ja`: Scout mit `Findings: <W>/runde-2/scout-input.md` und `Ergebnis: <W>/runde-2/scout.md`; dann `node "<PLUGIN>/scripts/review-flow.js" scout-check "<W>" 2`. `SCOUT ungueltig`: Ausfall-Regel. Ist der Scout ausgefallen, weiter mit dem nächsten Schritt.

Danach gibt es keine weitere Nacharbeit und keine weitere Runde.

## Abschluss
Jedes Ende, auch nach einem Ausfall, läuft hier durch.
1. `node "<PLUGIN>/scripts/review-flow.js" finish <art> "<DOK>" "<W>" --title "<Titel>"`, bei nicht leerem `ausgefallen` mit `--ausgefallen <namen, durch Komma getrennt>`.
2. `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/bericht"`
3. Bericht im Chat: der Abschnitt nach `=== BERICHT ===` unverändert; danach `### Hinweise des Orchestrators` mit jeder `WARN`-Zeile und jeder Nachforderung oder jedem Neustart, falls vorhanden; danach die Ausgabe von `save` ab `## Scout-Vorschläge`, bei `KEIN SCOUT` nichts; zuletzt `Nächster Schritt:` mit dem Text des Skills für den Status aus der Zeile `STATUS`. Nichts committen, außer der Skill sagt es.
4. `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.
