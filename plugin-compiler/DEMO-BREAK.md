# Demo: absichtlich kaputter Verweis

Der Compiler bricht ab, bevor er etwas nach `dist/` schreibt, und nennt Datei und Zeile. Alle Ausgaben unten sind echte Läufe von `python3 tools/build.py` in einer Kopie von `plugin-compiler/` (so bleibt der Branch sauber).

## 1. Unbekannte Regel R-999

In `src/phases/plan.yaml`, Zeile 19, `R-014` durch `R-999` ersetzen:

```diff
-rules: [R-050, R-040, R-041, R-042, R-043, R-044, R-045, R-014, R-015, R-004]
+rules: [R-050, R-040, R-041, R-042, R-043, R-044, R-045, R-999, R-015, R-004]
```

```text
$ python3 tools/build.py
build: 1 Fehler in Stufe „Referenzen“, Abbruch.
FEHLER src/phases/plan.yaml:19: Regel R-999 nicht gefunden
$ echo $?
1
```

`dist/` bleibt unverändert, weil die Stufe „Schreiben“ nie erreicht wird.

## 2. Zyklus in der Reihenfolge

In `src/phases/spec.yaml` `after: []` durch `after: [plan-review]` ersetzen:

```text
build: 1 Fehler in Stufe „Reihenfolge“, Abbruch.
FEHLER src/phases/grill.yaml:3: Zyklus in der Reihenfolge: grill -> spec -> plan-review -> plan -> spec-review -> grill
```

## 3. Glossar

In `src/rules/grill.yaml` `[[Frontier]]` durch `[[Frontlinie]]` ersetzen und in `src/rules/dialog.yaml` „Jede Aussage dieser Phase“ schreiben:

```text
build: 2 Fehler in Stufe „Glossar“, Abbruch.
FEHLER src/rules/dialog.yaml:5: „Phase“ ist laut Glossar zu vermeiden; Begriff: „Etappe“
FEHLER src/rules/grill.yaml:6: Fachbegriff „Frontlinie“ steht nicht im Glossar (src/glossary.yaml)
```

## Selbst nachstellen

```bash
mkdir -p /tmp/pc-break && ln -s "$PWD/plugins" /tmp/pc-break/plugins && cp -r plugin-compiler /tmp/pc-break/
cd /tmp/pc-break/plugin-compiler
sed -i 's/R-045, R-014, R-015/R-045, R-999, R-015/' src/phases/plan.yaml
python3 tools/build.py; echo "exit $?"
```

Zeilen bei gefalteten Blöcken (`>-`): Die Meldung nennt die erste Zeile des Blocks, weil YAML den Block zu einer Zeile zusammenzieht.

# Demo: Brüche im vollständigen dv-forge

Echte Läufe in einer Kopie (`plugins/` daneben verlinkt). Jede Prüfung bricht vor dem Schreiben ab.

| Fall | Änderung | Meldung |
|---|---|---|
| A | `src/forge/etappen.yaml`: Etappe `planning` `modell: sonnet` statt `opus` | `FEHLER src/forge/etappen.yaml:39: planning.modell = 'sonnet', session-chain-brief.js sagt 'opus'` |
| B | `src/forge/skills/spec-review/SKILL.md`: Tippfehler `dv-forge:spec-review-clarty` | `FEHLER src/forge/skills/spec-review/SKILL.md:30: Verweis dv-forge:spec-review-clarty: weder Skill noch Agent` |
| C | `src/forge/partials/w-eintraege-plan.md` gelöscht | fünf Fehler, je Plan-Reviewer einer, z. B. `FEHLER src/forge/agents/plan-review-coverage.md:34: Partial „w-eintraege-plan“ nicht gefunden` |
| D | `src/plugins/forge.yaml`: Hook-Skript `agent-chek.js` | `FEHLER src/plugins/forge.yaml:33: Hook SubagentStop: scripts/agent-chek.js gibt es nicht` |
| E | `src/forge/partials/w-eintraege-spec.md`: „bindende“ gestrichen | fünf Fehler, z. B. `FEHLER forge/agents/spec-review-clarity.md:28: Abgleich: weicht ab. erzeugt '… sind Entsche', Bestand '… sind bindend'; nicht im Änderungsprotokoll` |
| F | `src/forge/rules/dialog.yaml`: zweimal `R-401` | `FEHLER src/forge/rules/dialog.yaml:15: Regel „R-401“ doppelt (zuerst in src/forge/rules/dialog.yaml:10)` |
| G | `src/forge/rules/orchestrator.yaml`: `Maximum Followup-Runden: 2` (die Datei steht wegen Befund B schon im Protokoll) | `FEHLER forge/shared/orchestrator-rules.md:1: Abgleich: weicht vom abgenommenen Stand im Änderungsprotokoll ab (3a7970d139b2a192 → 9081db8d58091642); Änderung prüfen, dann python3 tools/build.py --accept` |
| H | `src/forge/CHANGES.yaml`: `skills/init/SKILL.md` unter Befund 12 eingetragen, ohne dass sich die Datei ändert | `FEHLER src/forge/CHANGES.yaml:67: Befund 12: skills/init/SKILL.md steht im Änderungsprotokoll, weicht aber nicht vom Bestand ab` |

Fall E zeigt den Nutzen der Partials: Ein Absatz, der vorher in fünf Agents von Hand gleich gehalten werden musste, steht einmal in `partials/` und wirkt auf alle fünf.

Fall E, G und H zeigen den **Abgleich mit dem Bestand**: Jede Datei, die vom bisherigen `plugins/forge` abweicht, muss in `src/forge/CHANGES.yaml` unter einer Befund-Nummer stehen. Zusätzlich hält das Protokoll je geänderter Datei einen Fingerabdruck des abgenommenen Stands. Damit fällt auch eine zweite, ungewollte Änderung in einer Datei auf, die schon im Protokoll steht (Fall G). Eine gewollte Änderung übernimmt man bewusst mit `python3 tools/build.py --accept`.

Nachstellen:

```bash
mkdir -p /tmp/pc && ln -s "$PWD/plugins" /tmp/pc/plugins && cp -r plugin-compiler /tmp/pc/
cd /tmp/pc/plugin-compiler
sed -i '/id: planning/,/modell/s/modell: opus/modell: sonnet/' src/forge/etappen.yaml
python3 tools/build.py; echo "exit $?"
```
