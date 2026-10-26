---
name: finish-work
description: Use when a dv-forge implementation is done and reviewed and the work should be closed — before leaving or removing a worktree or calling a feature branch finished. Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.
---

# Arbeit abschließen

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du stellst sicher, dass alles committet ist und alle Prüfungen grün sind. Erst dann räumst du einen Worktree weg. Der Branch bleibt immer. Kein Merge, kein Push, kein Branch löschen.

## Ablauf
1. `node "<PLUGIN>/scripts/work.js" check`. Exit ungleich 0: Meldung wörtlich ausgeben, Ende. Du committest, verwirfst und stashst nichts; das entscheidet der Mensch. Zeilen `vorbestand=<Datei>` sind Dateien, die schon beim Start offen waren; nenne sie getrennt in der Meldung, sie brechen nichts ab.
2. Prüfungen: `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>" --seit-gruen "<Umsetzungsbericht>"`; der Umsetzungsbericht ist `umsetzung.md` neben dem Plan (bei `<name>.md` `<name>-umsetzung.md`), fehlt er, entfällt `--seit-gruen`. Das Skript führt `Build`, `Test` und `Lint` aus den Projekt-Einstellungen aus und überspringt `Test` nach einem grünen Gesamtlauf, wenn seither nur Doku geändert ist. Die Zeilen `LAUF` und `UEBERSPRUNGEN` nennst du.
3. Nach `PRUEFUNG ergebnis=…`:
   - `rot`: Befund mit dem Teil nach `=== AUSGABE` melden, Ende. Nichts aufräumen. Nennt das Ledger den Test unter `Basis rot:`, sagst du das dazu; der Mensch entscheidet.
   - `docker`: Tests sind nur rot, weil Docker fehlt. Melden, Ende; der Mensch entscheidet.
   - `keine`: Nichts konfiguriert. Einmal fragen, was laufen soll.
   - `gruen` mit `offen` > 0: Die Läufe haben Dateien erzeugt oder geändert. `git status --porcelain` melden, Ende.
   - `gruen` mit `offen=0`: weiter.
4. Nach der Ausgabe von Schritt 1 handeln:

| Ausgabe | Tun |
|---|---|
| `modus=vor-ort` | Melden: alles committet und grün, Branch `<branch>` bleibt ausgecheckt. Weiter mit 5. |
| `modus=worktree` | `cd "<haupt>"`, dann `node "<PLUGIN>/scripts/work.js" remove "<R>"`. Melden: Worktree `<entfernt>` entfernt, Branch `<branch>` steht auf `<commit>`, weiter im Haupt-Checkout `<haupt>`. Weiter mit 5. |

`remove` bricht ab, wenn noch etwas offen ist oder der Branch nicht auf dem letzten Commit steht. Dann Meldung wörtlich ausgeben, Ende.

5. Nur nach erfolgreichem Ende beider Fälle den Ketten-Eintrag der Umsetzung entfernen, im Haupt-Checkout: `node "<PLUGIN>/scripts/chain.js" remove --worktree "<R>"`, bei `modus=worktree` mit dem entfernten Pfad. Die Ausgabe zeigst du nicht. Brach ein Schritt ab, bleibt der Eintrag.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Offene Datei schnell selbst committen | Melden. Der Mensch entscheidet. |
| Roter Test „gehört nicht zu uns“ | Rot ist rot. Stopp, nichts aufräumen. |
| Prüfungen selbst ausführen und „grün“ melden | Nur `verify-run.js`; das Ergebnis steht in `PRUEFUNG`. |
| `git worktree remove --force` | Nie. Nur `work.js remove`. |
| Aus dem Worktree heraus entfernen | Erst `cd "<haupt>"`, dann `remove "<R>"`. |
