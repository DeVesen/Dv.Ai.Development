# Prüfkatalog

Je Ziel listest du alle Artefakte und prüfst jedes nach den Teilen A bis D. Jeder Befund nennt `datei:zeile`, Konsequenz und Vorschlag und trägt eine Einstufung nach Konsequenz: 🔴 blockt, 🟡 ist ein Hinweis, 🟢 hat keine Konsequenz und bekommt keinen Task.

## A – Ebenen

- **Frontmatter:** Name, Beschreibung mit Triggern, Werkzeugfreigabe, Aufrufsperre, Argument-Hinweis; in Agents die Modellangabe.
- **Aufrufzeilen in Skills:** Existiert das Skript? Kennt es die Parameter? Sind Pfade gequotet?
- **Platzhalter und Namen:** Jede Benennung ist an genau einer Stelle definiert und überall gleich geschrieben.
- **Rückgabeformate:** Stimmt der Skill-Text mit dem überein, was Skript und Hook erzwingen?
- **Hooks und Guards:** fail-open oder fail-closed; welche Fälle sie fangen und welche nicht.
- **Tests:** Je Regel ein Test, der Wortlaut oder Verhalten festnagelt; alte Wortlaute sind per Suche verboten.
- **Typografie:** keine typografischen Anführungszeichen in Agent-Dateien.

## B – Kettenkarte

- Jede Übergabe Parent → Child → Parent: Format hin, Format zurück, wer es liest, welcher Hook es prüft; Bewertung ✅, ⚠️ oder ❌.
- Rückmeldekette: Kommt das Ergebnis mechanisch beim Aufrufer an (Datei, Statuszeile, Turn-Ende), oder ist es nur per Doku versprochen?
- Die Karte steht unter `## Kettenkarte` im Befundbericht.

## C – Soll-Abgleich

- Soll sind die Rückmeldungen `R-nn` und die Regeln, die der Mensch im Aufruf nennt.
- Vorhandene Specs oder Pläne im Repo zählen nicht als Soll, außer der Mensch nennt sie.
- Je Soll-Punkt: erfüllt, teilweise oder nicht, mit `datei:zeile`.

## D – Querschnitt

- Zahlen und Grenzwerte stehen an genau einer Stelle, sonst Befund.
- Doku (README, Referenzen) prüfst du gegen das Verhalten der Skripte.
- Datei-Überschneidung zwischen Tasks derselben Welle blockiert; über Wellen hinweg ist sie nur ein 🟡-Hinweis. Beides meldet `harness.js pruefe`.
