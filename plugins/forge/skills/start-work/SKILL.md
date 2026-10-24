---
name: start-work
description: Use when work on a reviewed dv-forge plan should begin and the place for it is not prepared yet — before creating a branch, a worktree or touching code for that plan.
argument-hint: <plan.md> [spec.md]
---

# Arbeit starten

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du richtest nur den Ort der Umsetzung ein. Ob ein Worktree entsteht und wie der Branch heißt, entscheidet die Projekt-Einstellung, nie du. Du setzt nichts um.

## Ablauf
1. Erstes Wort von `$ARGUMENTS` = Plan-Pfad, optional zweites = Spec-Pfad. Weiterer Text ist Zusatz: nie in eine Kommandozeile. `node "<PLUGIN>/scripts/prepare.js" implementation $ARGUMENTS` mit nur den Pfaden. Exit ungleich 0: Meldung wörtlich ausgeben, Ende. Die Zeilen `<Name>=<Wert>` liefern `P`, `S` und `slug`.
2. `node "<PLUGIN>/scripts/work.js" start <slug> --spec "<S>" --plan "<P>"`. Exit ungleich 0: Meldung wörtlich ausgeben. Beginnt sie mit `Nicht committet:`, bietest du den Commit an und committest erst nach Ja; dann Schritt 2 wiederholen. Sonst Ende.
3. Nach der Ausgabe handeln:

| Ausgabe | Tun |
|---|---|
| `modus=worktree` | `cd "<R>"`. Melden: Worktree `<R>`, Branch `<branch>` und `aktion`: `angelegt` (neuer Branch), `angehaengt` (bestehender Branch) oder `fortgesetzt`. |
| `modus=vor-ort`, `standard=false` | Melden: Umsetzung auf Branch `<branch>` in `<R>`. |
| `modus=vor-ort`, `standard=true` | Einmal fragen, ob auf dem Standard-Branch gearbeitet wird. Bei Nein `node "<PLUGIN>/scripts/work.js" switch <vorschlag>`. |
| zusätzlich `drift=<datei>` | Plan-Dateien seit der Plan-Basis geändert: Dateien nennen, einmal fragen, ob trotzdem umgesetzt wird. |
| zusätzlich `workitem-konflikt=<nr>` | Branch nennt ein anderes Workitem als die Spec: nennen, einmal fragen, ob trotzdem umgesetzt wird. |

4. Übergabe als Code-Block: `/dv-forge:implementation <P>`, mit `<P>` relativ zur Projektwurzel. Bei `modus=worktree` folgt unter dem Code-Block die Zeile: `Session in <R> starten.`

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Branch-Namen selbst wählen | Den Namen liefert `work.js` aus `Branch-Schema`. |
| Worktree anlegen, obwohl die Einstellung `nein` sagt | Nur `work.js` legt Worktrees an. |
| Nicht committete Spec oder Plan still mitnehmen | Commit anbieten, erst nach Ja. Sonst fehlen sie im Worktree. |
| Nach dem Start schon Code schreiben | Umsetzen ist `/dv-forge:implementation`. |
