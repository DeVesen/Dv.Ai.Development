# Review-Loop

Ablauf des Implementierungs-Reviews; Spec- und Plan-Review folgen `shared/review-flow/flow.md`. Die Abschnitte „Rolle“ und „Hintergrund oder Vordergrund“ gelten für beide Abläufe. `<PLUGIN>` und `<SESSION>` nennt dir der aufrufende Skill. Er legt außerdem fest:

| Baustein | Bedeutung |
|---|---|
| Eingaben | Aufruf von `prepare.js`; er liefert u. a. den Arbeitsbereich `W`, `slug` und `N` (maximale Nacharbeiten). Dazu `aktiv` und die Rolle des Arbeitsbereichs |
| Reviewer | Agent-Namen mit ihren Eingaben; ihre Kurznamen bilden `aktiv` |
| Nacharbeiter | Agent-Name und seine Eingabe, oder „Keiner“ |
| Zusatz-Stopps | Prüfungen direkt nach der Nacharbeit, falls vorhanden |
| Abschluss-Scout | Agent-Name und Eingabezeilen des Scouts, oder „Keiner“ |
| Bericht | Titel, zusätzliche Status-Werte und Abschnitte, nächster Schritt je Status |

## Rolle
Du orchestrierst, sonst nichts. Du liest die geprüften Dateien nicht, bewertest keine Findings, tippst keine Ergebnisse ab und änderst nichts selbst. Jede Entscheidung ist mechanisch: Zähler, `STATUS`-Zeile, Skript-Ausgaben. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Loop fort. Ein Hook blockt deine Zugriffe auf die geschützten Dateien. Er bleibt aktiv, bis du ihn am Ende freigibst, der Mensch eine neue Eingabe macht oder die Session endet; Warten auf Reviewer gibt ihn nicht frei.

Werkzeuge: Plugin-Dateien liest du mit `Read`. Jedes Skript startest du als einzelnen `node`-Aufruf, ohne `cat`, `&&`, `;`, `|` oder `echo` davor oder danach; der Hook blockt jede Verkettung.

Ergebnisse laufen nur über Dateien: Jede Runde hat den Ordner `D = <W>/runde-<r>`. Reviewer schreiben `<D>/<kurzname>.json`, der Nacharbeiter `<D>/rework.json`, die Aggregation `<D>/aggregate.md`.

## Runde r
Start: `r = 1`, `nacharbeiten = 0`.

1. **Review:** Statuszeile `Review <r>: starte <anzahl> Reviewer (<aktiv>).` Dann in EINER Nachricht je aktivem Reviewer einen `Agent`-Call mit `run_in_background: false`, jeder als frische Instanz, mit genau den Eingaben aus dem Skill und `Ergebnis: <D>/<kurzname>.json`. Keine Findings früherer Runden. Die Calls laufen gleichzeitig; du machst erst weiter, wenn alle zurück sind.
2. **Aggregieren:** `node "<PLUGIN>/scripts/aggregate-findings.js" --dir "<D>" --expect <aktiv> --round <r>`
3. **Ausgefallen:** Nennt `STATUS` unter `failed=` Reviewer, setzt du jeden davon einmal per `SendMessage` fort: `Schreib nur noch dein Ergebnis nach <D>/<kurzname>.json, im vereinbarten Format, auch bei null Findings.` Fehlt die Datei danach noch, startest du ihn einmal frisch, mit dem Zusatz `Deine letzte Antwort hatte keine gültige Ergebnisdatei.` Dann erneut aggregieren. Wer danach fehlt, gilt als ausgefallen.
4. Statuszeile `Review <r>: <red> × 🔴, <yellow> × 🟡, ausgefallen: <liste oder keiner>.`
5. **Stopp**, in dieser Reihenfolge:
   - `clean=true` → Ende `sauber nach Review r`
   - `failed` nicht leer → Ende `unvollständig nach Review r`
   - `r = N+1` → Ende `Cap erreicht`
   - `r > 1`: `node "<PLUGIN>/scripts/rework-outcome.js" progress --dir "<W>" --round <r-1>`. `PROGRESS false` → Ende `Stillstand in Runde r-1`
6. **Nacharbeit:**
   1. Statuszeile `Nacharbeit <r> von <N> läuft.`
   2. Nacharbeiter mit `run_in_background: false` starten: Eingaben aus dem Skill, dazu `Runde: <r>`, `Findings: <D>/aggregate.md` und `Ergebnis: <D>/rework.json`.
   3. `nacharbeiten + 1`.
   4. Zusatz-Stopps des Skills prüfen.
   5. `r = r+1`, weiter mit Schritt 1.

## Hintergrund oder Vordergrund
Alle Agents laufen im Vordergrund mit `run_in_background: false`, weil der nächste Schritt auf sie wartet. Reviewer laufen trotzdem parallel, weil ihre Calls in einer Nachricht stehen. Nie `run_in_background: true`: Jeder Hintergrund-Agent weckt dich zweimal (Antwort und Benachrichtigung), und jeder Weckzug liest den ganzen Kontext neu.

## Jedes Ende
Jedes Ende, auch `Ende` nach einem Fehler, schließt mit denselben zwei Befehlen: `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, sofern `prepare.js` einen Arbeitsbereich angelegt hat, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.

## Abschluss
1. **Abschluss-Scout:** Nennt der Skill einen Scout und zeigt die letzte `STATUS`-Zeile `red` > 0 oder `yellow` > 0, startest du ihn einmal mit `run_in_background: false`: Eingaben aus dem Skill, dazu `Findings: <D>/aggregate.md` der letzten Runde und `Ergebnis: <D>/scout.md`. Du bewertest die Vorschläge nicht.
2. **Sichern:** `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<D>"`, immer, auch ohne Scout; ohne Scout räumt es die alte Sicherung weg. Lief der Scout und gibt `save` `KEIN SCOUT` aus, startest du den Scout einmal neu und rufst `save` erneut auf. Wieder `KEIN SCOUT`: `Scout ausgefallen`.
3. Bericht im Chat nach `<PLUGIN>/shared/review-loop/report-format.md`; der Scout-Abschnitt ist die Ausgabe von `save`. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.
4. Die zwei Befehle aus „Jedes Ende“.
