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
cp -r plugin-compiler /tmp/pc-break && cd /tmp/pc-break
sed -i 's/R-045, R-014, R-015/R-045, R-999, R-015/' src/phases/plan.yaml
python3 tools/build.py; echo "exit $?"
```

Zeilen bei gefalteten Blöcken (`>-`): Die Meldung nennt die erste Zeile des Blocks, weil YAML den Block zu einer Zeile zusammenzieht.
