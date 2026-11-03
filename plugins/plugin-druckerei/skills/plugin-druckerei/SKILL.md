---
name: plugin-druckerei
description: Use when a Claude Code plugin is built from sources with the Plugin-Druckerei - creating a new plugin project, adding or changing a rule, stage, partial, skill, agent, command, hook or glossary term in an existing project, deciding which building block new content belongs to or whether it must be split, or taking over an existing plugin into a project. Triggers are Plugin-Druckerei, druckerei.yaml, Plugin-Projekt, neues Plugin, neue Regel, Baustein, Plugin übernehmen, recompile.
---

# Plugin-Druckerei

Ein Plugin wird nicht von Hand geschrieben, sondern aus **Quellen** gedruckt. Menschen pflegen jede Regel, jeden Ablauf und jeden Textbaustein genau einmal unter `src/`; die Druckerei prüft alles, setzt daraus Skills, Agents, Hooks und Befehle zusammen und schreibt das fertige Plugin nach `dist/`. Ein **Projekt** ist ein Ordner mit `druckerei.yaml`.

Der Befehl `druckerei` liegt im `bin/` dieses Plugins und läuft im Bash-Tool. Er braucht Python 3.10+ mit `pyyaml`, `jinja2`, `jsonschema`; fehlt etwas, nennt er den `pip install`-Befehl.

## Grundregeln
1. **Nur Quellen ändern.** Alles unter `dist/` ist gedruckt und wird überschrieben; ein Sensor blockiert Edit und Write dort. Gefundene Fehler behebst du in `src/`.
2. **Erst einordnen, dann schreiben.** Jede neue Anforderung ordnest du nach [references/einordnen.md](references/einordnen.md) einem Baustein zu, oder mehreren. Was ein Baustein ist und welche Felder er hat, steht in [references/bausteine.md](references/bausteine.md).
3. **Immer die Vorlage.** Neue Bausteine beginnst du mit `druckerei vorlage <art>` und füllst jedes Pflichtfeld. Kein Feld bleibt leer, keine Begründung wird erfunden: Kennt niemand das Warum einer Regel, fragst du den Menschen; sagt er, es sei offen, steht `TODO(<Quelle>)` darin, und der Druck meldet es als Warnung.
4. **Nach jeder Änderung prüfen.** Der Sensor startet nach jedem Edit in `src/` die Schnellprüfung. Meldet sie einen Fehler mit Datei und Zeile, behebst du ihn, bevor du weiterschreibst. Ohne Sensor: `druckerei pruefen --schnell`.
5. **Fragen gesammelt.** Offene Entscheidungen stellst du in einer Runde, je Frage genau eine Empfehlung mit Grund. Der Mensch antwortet mit „wie empfohlen“, korrigiert einzelne Punkte oder schreibt frei.
6. **Version nur über Deploy.** Die Version steht allein im Bestellschein; `druckerei deploy` erhöht sie. Du änderst sie nicht von Hand.

## Ablauf A: neues Plugin-Projekt
1. Frage in einer Runde: Name des Plugins (`dv-…`, Kleinbuchstaben), ein Satz, was es kann, Ordner des Projekts, Besitzer (wird `author`). Empfehlung für den Ordner: neben den übrigen Projekten.
2. `druckerei neu <ordner> --name <name> --beschreibung "<satz>" --owner <besitzer>`. Das Gerüst druckt sofort einmal zur Kontrolle.
3. Ersetze den Start-Skill durch den ersten echten Baustein (Ablauf B).
4. `druckerei pruefen` (Try-Deploy, siehe Skill `try-deploy`).

## Ablauf B: am bestehenden Projekt weiterarbeiten
1. `druckerei status`: Plugins, Versionen, ob ein Plugin noch mit seinem Bestand verglichen wird.
2. **Einordnen** nach [references/einordnen.md](references/einordnen.md). Ergebnis in einer Zeile je Teil vorlegen, z. B. „Regel R-061 (Kern, enforce: hook) + Hook-Eintrag + Zeile im Skill `plan`“. Muss etwas aufgeteilt werden, nennst du jeden Teil.
3. **Doppeltes vermeiden.** Vor einer neuen Regel, einem Baustein oder Begriff suchst du in `src/`, ob es ihn schon gibt (`grep -rn` nach Schlüsselwörtern). Gibt es ihn, erweiterst oder verweist du statt zu kopieren.
4. **Vorlage holen und füllen** (`druckerei vorlage regel|etappe|partial|skill|agent|referenz|befehl|geteilt|hook|begriff|regeldatei|etappen|aenderung|plugin`). IDs: die nächste freie Nummer im passenden Bereich (`grep -rhoE "R-[0-9]{3}" src | sort -u`).
5. **Verbinden:** Regel in die `rules:`-Liste der Etappe oder per `applies_to` im Bestellschein; Baustein mit `<<= partial('<name>') >>` einsetzen; Verweise auf Skills und Agents als `<plugin>:<name>`; Durchsetzung einer Regel per `enforce: hook|script` und `enforced_by`.
6. Schnellprüfung abwarten (Sensor) und Fehler beheben.
7. Wird das Plugin noch mit seinem Bestand verglichen (`equivalent_to`), trägst du jede geänderte Datei mit Befund-Nummer und Grund in `src/<plugin>/CHANGES.yaml` ein (`druckerei vorlage aenderung`). Ist die Änderung geprüft und gewollt: `druckerei abnehmen`.
8. Zum Schluss den Try-Deploy anbieten.

## Ablauf C: bestehendes Plugin übernehmen
1. Neues Projekt dafür: `druckerei neu <ordner> --aus <plugin-ordner> --owner <besitzer>`; in ein bestehendes Projekt: `druckerei uebernehmen <plugin-ordner>`.
2. Die Übernahme ist wortgleich: Jede Markdown-Datei bekommt ein Deckblatt, doppelte Absätze werden Bausteine, `hooks.json` wird zu Daten, alles andere liegt unter `assets/`. Der Probedruck vergleicht jede Datei mit dem Bestand.
3. Bausteine mit Namen wie `block-3` benennst du nach ihrem Inhalt um (Datei und jedes `partial('…')`).
4. Die Warnungen sind Altlasten des Bestands (`lint: bestand`). Arbeite sie mit dem Menschen ab: je Warnung Vorschlag und Empfehlung in einer Runde, Änderung nach Freigabe, Eintrag im Änderungsprotokoll.
5. Sind die Warnungen weg, stellst du `lint: streng` ein. Ab dann sind Stilfehler echte Fehler.
6. Soll das Projekt die einzige Quelle werden, entfernt der Mensch `equivalent_to` und `changelog` aus dem Bestellschein.

## Ablauf D und E: prüfen und ausliefern
- **Try-Deploy** (Skill `try-deploy`, Befehl `druckerei pruefen`): druckt in einen Temp-Ordner und prüft alles, ändert nichts.
- **Deploy** (Skill `deploy`, nur auf Wunsch des Menschen): Try-Deploy muss grün sein; dann neue Version, Druck nach `dist/`, Abnahme. Kein Commit, kein Push ohne Freigabe.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Der Fehler steht in `dist/`, ich korrigiere ihn dort.“ | Quelle in `src/` ändern; `dist/` wird überschrieben. |
| „Die Regel schreibe ich direkt in den Skill.“ | Regel als Baustein mit ID und Warum; der Skill verweist darauf. |
| „Das Warum denke ich mir aus.“ | Fragen; notfalls `TODO(<Quelle>)`. |
| „Zwei Aussagen, eine Regel spart Platz.“ | Eine Regel, eine prüfbare Aussage; sonst aufteilen. |
| „Den Absatz kopiere ich in den zweiten Agent.“ | Baustein in `partials/`, an beiden Stellen einsetzen. |
| „Version kurz hochsetzen.“ | Nur `druckerei deploy`. |
| „Schnellprüfung rot, ich mache erst weiter.“ | Erst beheben; Folgefehler verdecken sonst die Ursache. |
