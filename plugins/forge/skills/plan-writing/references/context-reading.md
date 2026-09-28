# Kontext lesen

Gilt für Schritt 4 und 5 des Plan-Writings.

## Zwischenstände
Nach dem Lesen der Spec nennst du dem Menschen in einem Satz die Bereiche in der Reihenfolge, in der du sie liest, z. B. „Backend → Tabelle → Formular → Dashboard“. Danach kommt nach jedem Bereich ein Einzeiler: was gelesen, welche Stellen gefunden, was als Nächstes. Lange stille Leseketten gibt es nicht.

## Suchen und Lesen
1. Zuerst die Werkzeuge aus `node "<PLUGIN>/scripts/forge-config.js" get Suche`, etwa Symbolsuche und Verwendungen; danach die normale Suche.
2. Erst verorten, dann lesen: Symbole und Zeilen finden, danach alle nötigen Zeilenbereiche aller Dateien in einem parallelen Block lesen, nicht einzeln nacheinander.
3. Betrifft die Spec mehr als zwei Schichten (z. B. Backend, Tabelle, Formular), gibst du die Suche an einen Such-Agent mit `model: sonnet`. Auftrag: alle Stellen, die den betroffenen Wert lesen oder setzen, samt zugehörigen Tests. Rückgabe nur als Tabelle `Datei:Zeile, Rolle, betroffener Test`. Im eigenen Kontext liest du danach nur die Methoden, die sich ändern.

## Planungs-Skills
`forge-config.js get Planungs-Skills` liefert Einträge der Form `<skill>` oder `<skill> @<pfad>`. Ein Skill ohne `@` gilt immer und wird geladen. Ein Skill mit `@<pfad>` wird nur geladen, wenn eine Datei des Plans unter diesem Pfad liegt; sonst steht er unter `Global Constraints` als „nicht betroffen“. Die Dateiliste steht nach Schritt 4 fest, deshalb lädst du erst danach.
