# Review-Loop

Gemeinsamer Ablauf aller dv-forge-Orchestrator-Skills. `<PLUGIN>` und `<SESSION>` nennt dir der aufrufende Skill. Er legt außerdem fest:

| Baustein | Bedeutung |
|---|---|
| Eingaben | Geprüfte Dateien, ihre Existenzprüfung, `N` (maximale Nacharbeiten) und `aktiv` |
| Reviewer | Agent-Namen mit ihren Eingaben; ihre Kurznamen bilden `aktiv` |
| Nacharbeiter | Agent-Name und seine Eingabe |
| Fortschritts-Skript | Aufruf, dessen Ausgabe vor und nach der Nacharbeit verglichen wird |
| Zusatz-Stopps | Prüfungen direkt nach der Nacharbeit, falls vorhanden |
| Abschluss-Scout | Agent-Name und Eingabezeilen des Scouts, oder „Keiner“. Der Skill wählt die Zeilen frei (ergänzen oder weglassen) |
| Bericht | Titel, zusätzliche Status-Werte und Abschnitte, nächster Schritt |

## Rolle
Du orchestrierst, sonst nichts. Du liest die geprüften Dateien nicht, bewertest keine Findings und änderst nichts selbst. Jede Entscheidung ist mechanisch: Zähler, `STATUS`-Zeile, Skript-Ausgaben. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Loop fort. Ein Hook blockt deine Zugriffe auf die geschützten Dateien.

## Runde r
Start: `r = 1`, `nacharbeiten = 0`.

1. **Review:** In EINER Nachricht je aktivem Reviewer einen `Agent`-Call mit `run_in_background: false`, jeder als frische Instanz, mit genau den Eingaben aus dem Skill und ohne Findings früherer Runden.
2. **Aggregieren:** Den letzten JSON-Block jedes Reviewers wörtlich übergeben, jeweils inklusive seiner ```json-Zeile und der schließenden ```-Zeile:
   ```bash
   node "<PLUGIN>/scripts/aggregate-findings.js" --expect <aktiv> <<'DV_FORGE_EOF'
   <JSON-Blöcke>
   DV_FORGE_EOF
   ```
3. Nennt `STATUS` unter `failed=` Reviewer: diese einmal neu starten, dann erneut aggregieren, mit allen Blöcken plus den neuen. Wer danach noch fehlt, gilt als ausgefallen.
4. **Stopp**, in dieser Reihenfolge:
   - `clean=true` → Ende „sauber nach Review r“
   - `r = N+1` → Ende „Cap erreicht“
   - `red=0` (nur Ausfall) → `r = r+1`, weiter mit Schritt 1 ohne Nacharbeit
5. **Nacharbeit:**
   1. Fortschritts-Skript des Skills ausführen, Ausgabe merken.
   2. Nacharbeiter mit `run_in_background: false` starten: Eingaben aus dem Skill, dazu `Runde: <r>`, `Findings:` und der REWORK-Abschnitt der Aggregation unverändert.
   3. `nacharbeiten + 1`.
   4. Zusatz-Stopps des Skills prüfen.
   5. Fortschritts-Skript erneut ausführen. Gleiche Ausgabe → Ende „Stillstand in Runde r“.
   6. `r = r+1`, weiter mit Schritt 1.

## Abschluss
1. **Abschluss-Scout** (nach dem letzten Review; bei einem Skill ohne Runden nach dem einzigen Review): Nennt der Skill einen Scout und zeigt die letzte `STATUS`-Zeile `red` > 0 oder `yellow` > 0, startest du ihn einmal mit `run_in_background: false`: Eingaben aus dem Skill, dazu `Findings:` und der REWORK-Abschnitt der letzten Aggregation unverändert. Enthält seine Antwort keine Zeile `## Scout-Vorschläge`, startest du ihn einmal neu. Fehlt sie wieder, gilt „Scout ausgefallen“. Du bewertest die Vorschläge nicht.
2. Bericht im Chat nach `<PLUGIN>/shared/review-loop/report-format.md`, mit dem REPORT-Abschnitt der letzten Aggregation, dem Scout-Abschnitt ab `## Scout-Vorschläge` unverändert (oder „Scout ausgefallen“) und den Angaben des Skills. Keine Dateien schreiben, nichts committen.
3. `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`
