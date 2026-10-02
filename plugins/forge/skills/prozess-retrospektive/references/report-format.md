# Erfahrungsbericht

Gleiches Format wie die bisherigen Berichte unter `docs/wishes/`, damit mehrere Berichte später zu einer Wunschliste zusammengeführt werden können.

Du schreibst nur den **Entwurf**. `retro-report.js` prüft ihn und setzt daraus den Bericht zusammen: Modell, Skills, Datum und Kennzahlen in den Kopf, „Zahlen“ und „MCP-Nutzung“ aus dem Snapshot, danach deine Abschnitte. Diese Rohdaten tippst du nie ab.

## Entwurf

```markdown
# Erfahrungsbericht <Art der Arbeit, allgemein>

**Lauf:** <was gemacht wurde, welche Skills und Plugins>
**Ergebnis:** <was herauskam>

**Relevanz:**
- <erwartetes MCP>: gebraucht · verzichtbar in dieser Session · hätte genützt, weil <Beleg>

## Positiv

1. **<Kurzbefund>.** <was gut lief, mit Beleg>

## Reibung

1. **<Kurzbefund, allgemein>.**
   *Situation:* <was passiert ist, für Außenstehende erzählt, mit Zahl oder Zitat>
   *Kosten:* <Tokens, Minuten, Runden, Rückfragen: mit Zahl oder am Ende ` · Eindruck`>
   *Ursache:* <warum>
   *Besser gewesen:* <das Vorgehen, das in genau diesem Fall schneller, billiger oder richtig gewesen wäre, als Schritte>
   *Vorschlag:* <was sich dauerhaft ändern soll, damit es nicht wieder passiert>
   *Ziel:* <Art> · `<Name>` | <Art> · neu: <Arbeitsname> | Ziel offen
   *Im Projekt:* <Dateien, Klassen, Fachbegriffe und wörtliche Zitate dieses Projekts, in einer Zeile>

## Sparpotenzial

1. **<Kurzbefund, allgemein>.**
   *Situation:* <welcher Lauf wiederkehrend oder unnötig war, für Außenstehende erzählt, mit Zahl>
   *Ersparnis:* <geschätzt je Session: Tokens, Minuten, Runden; mit Zahl oder am Ende ` · Eindruck`>
   *Besser gewesen:* <wie es in genau diesem Fall billiger gegangen wäre, als Schritte>
   *Vorschlag:* <was das künftig übernimmt>
   *Ziel:* <Art> · `<Name>` | <Art> · neu: <Arbeitsname> | Ziel offen
   *Im Projekt:* <Dateien, Klassen, Fachbegriffe und wörtliche Zitate dieses Projekts, in einer Zeile>

## Neue Ideen

- **<Arbeitsname>** (`neu:` <Art>): <welche Lücke es schließt, an welchem Befund oben sie sichtbar wurde>

## Kleinigkeiten

- <Einzeiler>
```

`<Art>` ist Plugin, Skill, Agent, CLAUDE.md, Hook, Skript oder MCP. Der Kurzbefund ist der fett gesetzte Titel; die Kurzfassung im Chat zeigt ihn. Hat ein Abschnitt keinen Befund, steht dort ein Satz wie „Keine nennenswerten Punkte.“

## Was das Skript prüft

Solange einer dieser Verstöße besteht, schreibt es keinen Bericht und nennt jeden einzeln:
- ein Pflichtabschnitt oder Pflichtfeld fehlt: Titel, **Lauf:**, **Ergebnis:**, **Relevanz:**, die fünf Abschnitte, die Felder jedes Befunds unter Reibung und Sparpotenzial;
- eine Ziel-Zeile folgt keiner der drei Formen;
- *Kosten:* oder *Ersparnis:* trägt weder Zahl noch ` · Eindruck`;
- für ein erwartetes MCP fehlt die Relevanz-Zeile;
- ein Dateiname des Projekts steht außerhalb von *Im Projekt:*;
- ein Zitat unter *Im Projekt:* steht nicht wörtlich im Protokoll.

Jedes `neu:`-Ziel steht im Bericht genau einmal unter „Neue Ideen“; fehlt es dort, ergänzt es das Skript.

## Für Außenstehende schreiben

Ein Befund aus Kurzbefund, *Situation*, *Kosten* oder *Ersparnis*, *Ursache*, *Besser gewesen* und *Vorschlag* muss für jemanden verständlich sein, der das Projekt nie gesehen hat. Er soll ihn ohne Rückfrage weitergeben können.

- Projektdinge stehen dort als ihre **Rolle**: „eine Frontend-Komponente“, „ein Fachbegriff der Anwender, der im Code anders heißt“, „die komplette Testsuite mit rund 1.200 Tests“.
- Werkzeuge nennst du beim **Namen**, beim ersten Auftreten mit einem Halbsatz, was sie tun: „der Hook `guard-orchestrator.js`, der Testaufrufe außerhalb des vorgesehenen Skripts blockiert“. Das gilt für Skills, Agents, Hooks, Skripte und MCP-Server.
- Zitate aus der Session bekommen statt Projektbegriffen Platzhalter in eckigen Klammern: „Nein, [Fachbegriff] heißt im Code [Name A], nicht [Name B]“. Das wörtliche Zitat steht unter *Im Projekt:*.
- Befehle behalten Werkzeug und Optionen, Projektnamen werden Platzhalter: `dotnet build <Solution>`, `docker logs --tail 200 <Container>`.
- Dateien, Klassen, Container, Solutions und Fachbegriffe des Projekts stehen nur unter *Im Projekt:*. Das gilt auch für „Neue Ideen“.
- Vor dem Speichern gehst du jeden Befund durch: Steht außerhalb von *Im Projekt:* ein Name, den nur dieses Projekt kennt, ersetzt du ihn durch seine Rolle oder einen Platzhalter.
- „Zahlen“ und „MCP-Nutzung“ sind davon ausgenommen: Sie sind Rohdaten aus dem Skript und bleiben wörtlich, auch mit Pfaden und Projektnamen.

Beispiel:

```markdown
1. **Fachbegriff falsch auf den Code abgebildet, ganze Runde verloren.**
   *Situation:* Der Mensch nannte einen Bildschirm mit dem Wort, das die Anwender dafür benutzen. Im Code heißt er anders, und ein Bildschirm mit ähnlichem Namen existiert. Der Agent änderte den falschen, ließ die komplette Testsuite laufen, dann korrigierte der Mensch: „Nein, [Fachbegriff] ist [Bildschirm A], nicht [Bildschirm B].“
   *Kosten:* 1 Rückfrage, 1 volle Testsuite (6 min, ~38k Tokens).
   *Ursache:* Keine Zuordnung von Fachbegriff zu Code, der Agent riet nach Namensähnlichkeit.
   *Besser gewesen:* Vor der ersten Änderung beide Kandidaten nennen und fragen, welcher gemeint ist; eine Rückfrage kostet Sekunden.
   *Vorschlag:* Ein Glossar Fachbegriff → Code, das der Agent vor der Suche liest.
   *Ziel:* Skill · `dv-working-capturing:glossary` (hält Fachbegriffe und ihren Ort im Code fest)
   *Im Projekt:* „Schichtbuch“ = `ShiftLogComponent`, verwechselt mit `LacOverviewComponent`. Zitat: „Nein, Schichtbuch ist die ShiftLogComponent, nicht die LAC-Übersicht.“
```

## Regeln
- Sortiert nach Kosten: teuerster Reibungspunkt zuerst, größte Einsparung zuerst.
- Ein Punkt steht entweder unter Reibung (etwas hakte) oder unter Sparpotenzial (lief, aber zu teuer), nicht in beiden.
- Eine Aussage ohne Zahl oder Zitat trägt am Ende ` · Eindruck`. Eine Zahl, die das Skript nicht liefert, schätzt du nicht.
- Die Regel eines anderen Werkzeugs gibst du nie aus dem Gedächtnis wieder: Regeltext mit `datei:zeile` zitieren oder ` · Eindruck`. Ein Vorschlag dagegen ist eine Regeländerung, keine erlaubte Variante.
- Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit: Er tritt bei jedem Lauf wieder auf und bekommt einen Befund mit `Ziel:`.
- Kein Befund ohne *Besser gewesen:* und ohne `Ziel:`-Zeile. `neu:` heißt: Das gibt es noch nicht, es lohnt sich, darüber nachzudenken.
- Positiv steht nur, was sich lohnt beizubehalten. Auch teure, aber fehlerfreie Läufe sind ein Befund.
- Maßstab für Sparpotenzial: Spart es Zeit, Tokens oder Geld, ohne dass der Ersatz teurer ist? Einen Betrag nennst du nur mit bekanntem Preis.
- Die Relevanz-Sätze sammeln sich über mehrere Berichte; erst dann wird ein MCP gestrichen, nicht nach einer Session.
