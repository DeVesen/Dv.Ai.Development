---
name: try-deploy
description: Use when the sources of a Plugin-Druckerei project changed and the whole project should be checked like a recompile before anything is delivered - printing into a temporary folder, all checks, claude plugin validate and the plugin tests, then a list of contradictions and problems to work through. Triggers are try deploy, try-deploy, recompile, prüf das Plugin, passt alles, Probedruck.
---

# Try-Deploy

Druckt das ganze Projekt in einen Temp-Ordner und prüft alles, wie ein Deploy es täte. Im Projekt ändert sich dabei nichts: keine Version, kein `dist/`, kein Commit.

## Ablauf
1. `druckerei pruefen` im Projekt (Ordner mit `druckerei.yaml`; sonst `--projekt <ordner>`).
2. Lies die Ausgabe in dieser Reihenfolge:
   - **Fehler** (`FEHLER <datei>:<zeile>: …`) mit der Stufe, in der der Druck abbrach. Nur die erste Stufe mit Fehlern ist aussagekräftig; spätere Stufen liefen nicht.
   - **TÜV:** je Plugin bestanden oder durchgefallen, mit den Hinweisen von `claude plugin validate`.
   - **Probeläufe:** bestandene und fehlgeschlagene Tests je Plugin.
   - **Warnungen:** offene Begründungen, Stil-Altlasten im Modus `lint: bestand`, Reviewer mit schreibenden Werkzeugen.
   - **Gegenüber dist/:** wie viele Dateien ein Deploy ändern würde.
3. Berichte in dieser Form, nichts davor:
   ```
   Try-Deploy: <ok | fehlgeschlagen in Stufe …>
   Fehler: <n> · TÜV: <bestanden/durchgefallen> · Tests: <bestanden/fehlgeschlagen> · Warnungen: <n> · Deploy würde <n> Dateien ändern
   ```
   Danach je Problem eine Zeile: Datei:Zeile, was nicht passt, ein Vorschlag zur Behebung in den Quellen.
4. Gibt es Probleme, legst du die Vorschläge **in einer Runde** vor, je Punkt genau eine Empfehlung mit Grund. Bei einem Widerspruch zwischen zwei Quellen nennst du beide Stellen und empfiehlst, welche gilt. Was ein Baustein ist und wohin eine Änderung gehört: Skill `plugin-druckerei`.
5. Nach der Antwort änderst du nur `src/`, nie `dist/`, und startest `druckerei pruefen` erneut, bis es grün ist oder der Mensch aufhört.

## Grenzen
- Warnungen blockieren keinen Deploy; Fehler, ein durchgefallener TÜV und rote Tests schon.
- Ein Verweis auf etwas, das es nicht gibt, ist immer ein Fehler, auch bei `lint: bestand`. Du schlägst nie vor, ihn zur Warnung herabzustufen; Vorschlag ist der richtige Pfad oder das Streichen des Verweises.
- Fehlt die claude CLI oder node, meldet der Try-Deploy den Schritt als übersprungen; das ist kein Grün für diesen Schritt.
- `druckerei pruefen --schnell` druckt und prüft nur, ohne TÜV und Tests; der Sensor nutzt es nach jeder Änderung.
