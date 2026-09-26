---
name: finish-work
description: Use when a dv-forge implementation is done and reviewed and the work should be closed — before leaving or removing a worktree or calling a feature branch finished.
disable-model-invocation: true
---

# Arbeit abschließen

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du stellst sicher, dass alles committet ist und alle Prüfungen grün sind. Erst dann räumst du einen Worktree weg. Der Branch bleibt immer. Kein Merge, kein Push, kein Branch löschen.

## Ablauf
1. `node "<PLUGIN>/scripts/work.js" check`. Exit ungleich 0: Meldung wörtlich ausgeben, Ende. Du committest, verwirfst und stashst nichts; das entscheidet der Mensch.
2. Prüfungen: `node "<PLUGIN>/scripts/forge-config.js" get <Schlüssel>` für `Build`, `Test` und `Lint`. Jeden nicht leeren Wert im Ordner `<R>` ausführen, als Befehl oder als genanntes Tool; leere überspringst du. Sind alle drei leer, fragst du einmal, was laufen soll.
3. Ein Lauf rot: Befund melden, Ende. Nichts aufräumen.
4. Nach der Ausgabe von Schritt 1 handeln:

| Ausgabe | Tun |
|---|---|
| `modus=vor-ort` | Melden: alles committet und grün, Branch `<branch>` bleibt ausgecheckt. Ende. |
| `modus=worktree` | `cd "<haupt>"`, dann `node "<PLUGIN>/scripts/work.js" remove "<R>"`. Melden: Worktree `<entfernt>` entfernt, Branch `<branch>` steht auf `<commit>`, weiter im Haupt-Checkout `<haupt>`. |

`remove` bricht ab, wenn noch etwas offen ist oder der Branch nicht auf dem letzten Commit steht. Dann Meldung wörtlich ausgeben, Ende.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Offene Datei schnell selbst committen | Melden. Der Mensch entscheidet. |
| Roter Test „gehört nicht zu uns“ | Rot ist rot. Stopp, nichts aufräumen. |
| `git worktree remove --force` | Nie. Nur `work.js remove`. |
| Aus dem Worktree heraus entfernen | Erst `cd "<haupt>"`, dann `remove "<R>"`. |
