# dv-plugin-druckerei

Baut Claude-Code-Plugins aus Quellen, statt sie von Hand zu schreiben. Menschen pflegen Regeln, Abläufe, Textbausteine, Skills und Agents jeweils einmal unter `src/` eines Projekts; die Druckerei prüft alles, setzt daraus das Plugin zusammen und schreibt es nach `dist/`. Ein Projekt ist ein Ordner mit `druckerei.yaml`.

## Skills

| Skill | Wofür | Aufruf |
|---|---|---|
| `plugin-druckerei` | Neues Projekt anlegen, am Projekt weiterarbeiten, neue Inhalte einem Baustein zuordnen oder aufteilen, bestehendes Plugin übernehmen | Claude zieht ihn selbst |
| `try-deploy` | Alles prüfen wie ein Deploy, ohne etwas zu ändern; Probleme gesammelt angehen | Claude zieht ihn selbst |
| `deploy` | Fertiges Plugin mit neuer Version nach `dist/`, nur wenn der Try-Deploy grün ist | nur der Mensch |

## Befehl `druckerei`

Liegt in `bin/` und läuft im Bash-Tool (Windows: `druckerei.cmd`). Braucht Python 3.10+ mit `pip install pyyaml jinja2 jsonschema`.

| Befehl | macht |
|---|---|
| `druckerei neu <ordner> --name <plugin> --owner <name>` | neues Projekt mit erstem Skill |
| `druckerei neu <ordner> --aus <plugin-ordner>` | neues Projekt aus einem bestehenden Plugin, wortgleich übernommen |
| `druckerei uebernehmen <plugin-ordner>` | bestehendes Plugin in ein vorhandenes Projekt übernehmen |
| `druckerei vorlage [<art>]` | Gerüst eines Bausteins mit allen Pflichtfeldern |
| `druckerei pruefen [--schnell]` | Try-Deploy: Druck in einen Temp-Ordner, alle Prüfungen, `claude plugin validate`, Tests |
| `druckerei deploy --stufe patch\|minor\|major [--plugin <name>]` | Version erhöhen, nach `dist/` drucken, erneut prüfen; bei Rot alles zurück |
| `druckerei abnehmen` | gewollte Abweichungen vom Bestand ins Änderungsprotokoll übernehmen |
| `druckerei status` | Plugins, Versionen, Abgleich |

## Sensoren

- Edit und Write in die gedruckte Ausgabe (`dist/`) eines Projekts werden blockiert.
- Nach jedem Edit in `src/` läuft die Schnellprüfung; Fehler gehen mit Datei und Zeile an Claude zurück.

Beide greifen nur in Ordnern mit `druckerei.yaml`.

## Einrichten

```text
/plugin install dv-plugin-druckerei@dv-ai-development
```

Danach `pip install pyyaml jinja2 jsonschema` und im gewünschten Ordner `druckerei neu …`.
