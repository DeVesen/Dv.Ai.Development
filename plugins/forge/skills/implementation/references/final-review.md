# Final-Review

1. Paket-Pfad = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" forge-base/<slug> HEAD "<W>"`.
2. `dv-forge:implementation-final-reviewer` mit `model: opus` und den Zeilen `Plan: <P>`, `Spec: <S>` (entfällt ohne Spec), `Paket:` und `Zurückgestellt:` mit allen `zurückgestellt`- und `geparkt`-Zeilen des Ledgers.
3. Keine 🔴 und kein Punkt unter `Zurückgestellt` mit `beheben`: `Final: sauber` ins Ledger, weiter zum Abschluss.
4. Sonst `FIX_BASE` = Ausgabe von `git rev-parse HEAD` und **ein** Fixer: `dv-forge:implementation-implementer` mit
   - `Brief:` Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`
   - `Bericht: <W>/final-report.md`
   - `Repo: <R>`
   - `Findings:` die vollständige Liste: alle 🔴 und alle Punkte mit `beheben`

   Nie ein Fixer pro Finding; jeder würde den Kontext neu aufbauen und die Suiten erneut laufen lassen.
5. **Ein** Re-Review: Paket-Pfad = Ausgabe von `review-package.js <FIX_BASE> HEAD "<W>"`, dann `dv-forge:implementation-re-reviewer` mit `Brief:`, `Findings:`, `Bericht:`, `Paket:`.
6. Was danach offen ist, beurteilst du wie am Breaker der Task-Schleife: parken mit Urteil oder, wenn es tragend ist, ein Urteil mit Folge. Eine zweite Welle gibt es nicht; offene tragende Punkte stehen im Abschlussbericht.
7. `Final: Fix-Welle (Commits <a7>..<b7>)` ins Ledger.
