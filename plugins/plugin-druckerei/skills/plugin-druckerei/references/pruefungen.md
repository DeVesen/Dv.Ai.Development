# Was die Druckerei prüft

Der Druck läuft in festen Stufen. Findet eine Stufe einen Fehler, bricht der Druck ab, nennt Datei und Zeile und schreibt nichts. Warnungen halten den Druck nicht an.

| Stufe | prüft | typische Meldung | Abhilfe |
|---|---|---|---|
| Laden | YAML lesbar, Deckblatt vorhanden | `YAML ungültig: mapping values are not allowed here` | Wert mit `: ` in Anführungszeichen setzen |
| Schema | jedes Pflichtfeld, erlaubte Werte | `Schema component-skill: frontmatter: 'description' is a required property` | Feld nach `druckerei vorlage <art>` ergänzen |
| IDs | jede Regel-ID, jeder Skill- und Agent-Name nur einmal | `Regel „R-401“ doppelt (zuerst in …)` | nächste freie Nummer nehmen |
| Referenzen | Regeln, Etappen, Artefakte, Bausteine existieren | `Regel R-999 nicht gefunden` | Tippfehler beheben oder Baustein anlegen |
| Reihenfolge | Etappen ohne Kreis | `Zyklus in der Reihenfolge: a -> b -> a` | `after` korrigieren |
| Glossar | nur bekannte Fachbegriffe, keine verbotenen Wörter | `„Phase“ ist laut Glossar zu vermeiden` | Begriff aus dem Wörterbuch nehmen |
| Regeln und Hooks | `enforced_by` und Hook-Skripte existieren | `Hook SubagentStop: scripts/x.js gibt es nicht` | Skript als Asset ablegen oder Namen korrigieren |
| Partials | jeder eingesetzte Baustein existiert | `Partial „w-eintraege“ nicht gefunden` | Baustein anlegen oder Namen korrigieren |
| Verweise | `<plugin>:<name>`, `scripts/…`, `shared/…`, `references/…`, `templates/…` lösen sich auf; `references/…` auch im Skill, den der Absatz nennt (`` `anderer-skill` → `references/x.md` ``) | `Verweis dv-x:pruefer: weder Skill noch Agent` | Namen oder Pfad korrigieren |
| Etappen-Kette | Skills, Folge-Etappen, Haltepunkte bekannt | `Skill planung gibt es nicht` | Kette oder Skill anpassen |
| Lint | Markdown-Links `[…](pfad)` zeigen relativ zur Datei auf eine gedruckte Datei (`..` erlaubt, nicht aus dem Plugin heraus); Kopfzeile, Name, description mit „Use when“, unter 500 Zeilen, Beiblätter eine Ebene, keine Großbuchstaben-Befehle ohne Grund | `Verweis auf references/x.md: skills/a/references/references/x.md wird nicht erzeugt` | Pfad korrigieren; Stil: Text der Quelle anpassen |
| Abgleich mit dem Bestand | nur bei `equivalent_to`: jede Abweichung steht im Änderungsprotokoll, Siegel stimmt | `weicht vom abgenommenen Stand ab … dann druckerei abnehmen` | Änderung prüfen; gewollt → `druckerei abnehmen`, sonst zurücknehmen |

**Verweise auf etwas, das es nicht gibt, sind immer Fehler**, auch bei `lint: bestand`: Ein solcher Verweis lässt den Agent raten, was gemeint war. Mit `lint: bestand` sind nur Stilfunde Warnungen statt Fehler (Beiblatt verweist weiter, SKILL.md zu lang, description ohne „Use when“, Großbuchstaben ohne Grund).

Nicht geprüft werden Links in Codeblöcken (```): Das sind Vorlagen und Beispiele, deren Links erst am Zielort gelten, z. B. eine Memory-Datei, die ein Skill zur Laufzeit anlegt.

## Nach dem Druck (nur Try-Deploy und Deploy)
- **TÜV:** `claude plugin validate --strict` für Marketplace und jedes Plugin; bei `lint: bestand` ohne `--strict`, die strengen Hinweise erscheinen dann als Warnung. Fehlt die claude CLI, wird der Schritt übersprungen und gemeldet.
- **Probeläufe:** Tests der Plugins (`tests/*.test.js` mit node, `tests/test_*.py` mit unittest) laufen gegen das gedruckte Plugin.
- **Gegenüber dist/:** Wie viele Dateien ein Deploy ändern würde.
