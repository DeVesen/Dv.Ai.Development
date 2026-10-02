# Review-Ablauf

Gemeinsamer Ablauf von Spec- und Plan-Review: Runde 1 sucht, danach gibt es höchstens eine Nacharbeit, Runde 2 prüft nur nach. Jede Entscheidung trifft `review-flow.js`; du führst aus, was seine Zeilen sagen. `<PLUGIN>` und `<SESSION>` nennt dir der aufrufende Skill. Er legt außerdem fest:

| Baustein | Bedeutung |
|---|---|
| Eingaben | Aufruf von `prepare.js`; er liefert u. a. `W`, `slug` und `aktiv`. Dazu das geprüfte Dokument `<DOC>` und die Rolle |
| Reviewer | Agent-Namen mit ihren Eingaben; ihre Kurznamen bilden `aktiv` |
| Beratend | Kurznamen beratender Reviewer oder „Keine“ |
| Skript-Prüfungen | Befehle, die `<D>/skript-pruefung.json` schreiben, etwa `node "<PLUGIN>/scripts/review-flow.js" script-checks <FLAGS> --runde <runde>` mit `<runde>` = `runde-1` bzw. `runde-2`, oder „Keine“ |
| Nacharbeiter | Agent-Name und seine Eingaben |
| Nachprüfer | Agent-Name und seine Eingaben |
| Scout | Agent-Name und seine Eingaben |
| Bericht | Titel und Artefakt |

`<FLAGS>` steht für `--review <rolle> --dir "<W>" --doc "<DOC>"`, im Plan-Review dazu `--spec "<S>"`.

## Rolle
Vor Runde 1 liest du `<PLUGIN>/shared/review-loop/loop.md`, Abschnitte „Rolle“ und „Hintergrund oder Vordergrund“. Deine Rolle, die Werkzeuge ohne Verkettung und die Regel für Agents im Vordergrund gelten hier unverändert; sie stehen nur dort. Davon abweichend gilt hier:
- Nach `pause` (siehe „Anhalten“) gibt die Antwort des Menschen den Hook nicht frei, erst seine Eingabe danach.
- Ergebnisse laufen nur über Dateien im Arbeitsbereich `W`.
- Endet ein Aufruf von `review-flow.js` mit Exit 1, gibst du seine Zeile `dv-forge review-flow: <grund>` unverändert aus und führst von „Ende“ nur Schritt 4 aus.

## Nachfordern
Liefert eine Instanz kein gültiges Ergebnis: `node "<PLUGIN>/scripts/review-flow.js" attempt --dir "<W>" --instanz <name>`. `<name>` ist der Kurzname des Reviewers, `nacharbeit`, `nachprüfer`, `scout` oder `scout-nachpruefung`.
- `NACHFORDERN`: per `SendMessage`: `Schreib nur noch dein Ergebnis nach <pfad>, im vereinbarten Format. Grund: <grund>`
- `NEUSTART`: eine frische Instanz mit denselben Eingaben und dem Zusatz `Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>`
- `AUSGEFALLEN`: Reviewer, Nacharbeit und Nachprüfer → „Ende“. Der Scout fällt ohne Folgen aus; der Lauf geht ohne seine Vorschläge weiter.

Danach wiederholst du den Prüfschritt, der das Ergebnis abgelehnt hat.

## Runde 1
`D = <W>/runde-1`.
1. Statuszeile `Runde 1: starte <anzahl> Reviewer (<aktiv>).` Dann in EINER Nachricht je aktivem Reviewer einen `Agent`-Call, jeder als frische Instanz, mit genau den Eingaben aus dem Skill und `Ergebnis: <D>/<kurzname>.json`. Danach die Skript-Prüfungen des Skills.
2. `node "<PLUGIN>/scripts/review-flow.js" rate <FLAGS> --expect <aktiv>`, bei beratenden Reviewern dazu `--beratend <kurznamen>`.
3. Je Zeile `FEHLT <name> — <grund>`: nachfordern, dann Schritt 2.
4. Statuszeile `Runde 1: <red> × 🔴, <yellow> × 🟡, <fragen> offene Fragen.`
5. Zeile `WEITER scout=<s> nacharbeit=<n>`: Ist `s` nicht `keiner`, läuft der Scout mit `D` und Instanz `scout`. Dann bei `n = nein` → „Ende“, sonst → „Nacharbeit“.

## Scout
1. Scout: Eingaben aus dem Skill, dazu `Findings: <D>/scout-eingabe.md` und `Ergebnis: <D>/scout.md`. Du bewertest die Vorschläge nicht.
2. `node "<PLUGIN>/scripts/review-flow.js" scout-check --review <rolle> --dir "<D>"`. `SCOUT ungültig: <grund>`: nachfordern, dann Schritt 2.

## Nacharbeit
Genau eine je Lauf.
1. `node "<PLUGIN>/scripts/review-flow.js" rework-input <FLAGS>`. Die Zeile `EINTRAG R<n>` nennt die Kennung der Einträge.
2. Statuszeile `Nacharbeit läuft.` Nacharbeiter: Eingaben aus dem Skill, dazu `Eintrag: R<n>`, `Findings: <W>/runde-1/nacharbeit-eingabe.md` und `Ergebnis: <W>/runde-1/rework.json`.
3. `node "<PLUGIN>/scripts/review-flow.js" rework-check <FLAGS>`:
   - `NACHARBEIT ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`, dann Schritt 3.
   - `BUENDELUNG fehlerhaft: <grund>`: `node "<PLUGIN>/scripts/review-flow.js" attempt --dir "<W>" --instanz nacharbeit --art buendelung`. `KORRIGIEREN`: per `SendMessage` `Deine Bündelung der Fragen ist fehlerhaft: <grund>. Korrigier questions in <W>/runde-1/rework.json.`, dann Schritt 3. `AUSGEFALLEN` → „Ende“.
   - `NACHARBEIT ok … anhalten=ja` → „Anhalten“.
   - `NACHARBEIT ok … anhalten=nein` → „Nachprüfung“.

## Anhalten
1. Gib den Text nach `=== FRAGEN ===` unverändert aus. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.
2. `node "<PLUGIN>/scripts/guard-orchestrator.js" pause <SESSION> --show "<W>/runde-1/fragen.md"`. Dann endet deine Antwort.
3. Nach der Antwort des Menschen: per `SendMessage` an den Nacharbeiter `Antworten des Menschen: <antwort wörtlich>` und `Ergebnis: <W>/runde-1/antworten.json`. Erreicht die Nachricht ihn nicht, gilt das als ungültiges Ergebnis.
4. `node "<PLUGIN>/scripts/review-flow.js" answers-check <FLAGS>`. `ANTWORTEN ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`; der Zähler gilt für die ganze Nacharbeit. Ein Neustart bekommt die Eingaben aus Schritt 2 der Nacharbeit ohne `Findings:`, dazu `Antworten des Menschen: <antwort wörtlich>` und `Ergebnis: <W>/runde-1/antworten.json`. Dann Schritt 4.
5. Weiter mit „Nachprüfung“.

## Nachprüfung
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <FLAGS>`. Statuszeile `Nachprüfung: <punkte> Punkte, <skript> Skript-Punkte, <bereiche> geänderte Bereiche.` Danach die Skript-Prüfungen des Skills mit `D = <W>/runde-2`.
2. `NACHPRUEFER ja`: Nachprüfer mit den Eingaben aus dem Skill, dazu `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/nachpruefung.json`. `NACHPRUEFER nein`: Er startet nicht. Kein Reviewer läuft ein zweites Mal.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <FLAGS>`. `NACHPRUEFUNG ungültig: <grund>`: nachfordern mit Instanz `nachprüfer`, dann Schritt 3.
4. `WEITER scout=hinweise`: Scout mit `D = <W>/runde-2` und Instanz `scout-nachpruefung`.
5. Weiter mit „Ende“. Es gibt keine weitere Nacharbeit und keine weitere Runde.

## Ende
Jedes Ende, auch nach einem Ausfall:
1. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "<Titel>" --artefakt "<Artefakt>"`. Die Zeile `ENDE <status>` wählt den nächsten Schritt.
2. `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`.
3. Bericht im Chat: der Text nach `=== BERICHT ===` unverändert. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.
4. Nur wenn `report` ohne Exit 1 lief: `node "<PLUGIN>/scripts/guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"`. Dann `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.
