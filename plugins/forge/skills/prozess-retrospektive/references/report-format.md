# Erfahrungsbericht

Gleiches Format wie die bisherigen Berichte unter `docs/wishes/`, damit mehrere Berichte später zu einer Wunschliste zusammengeführt werden können.

```markdown
# Erfahrungsbericht <Art der Arbeit, allgemein>

**Lauf:** <was gemacht wurde, welche Skills und Plugins, Session-Modell, Datum>
**Ergebnis:** <was herauskam>. Dauer <min>, Eingaben des Menschen <n>, Tokens neu <k> Hauptsession und <k> Subagents.

## Zahlen
<die Zeilen oben aus session-facts.js, unverändert, ohne Tabellen, dazu die Listen aus „Sparpotenzial“>

## MCP-Nutzung
<Abschnitt „MCP-Nutzung (gemessen)“ aus session-facts.js, unverändert mit Tabellen>

**Relevanz:** je erwartetem MCP ein Satz: gebraucht · verzichtbar in dieser Session · hätte genützt, weil <Beleg>

## Positiv

1. **<Kurzbefund>.** <was gut lief, mit Beleg>

## Reibung

1. **<Kurzbefund, allgemein>.**
   *Situation:* <was passiert ist, für Außenstehende erzählt, mit Zahl oder Zitat>
   *Kosten:* <Tokens, Minuten, Runden, Rückfragen>
   *Ursache:* <warum>
   *Besser gewesen:* <das Vorgehen, das in genau diesem Fall schneller, billiger oder richtig gewesen wäre, als Schritte>
   *Vorschlag:* <was sich dauerhaft ändern soll, damit es nicht wieder passiert>
   *Ziel:* <Plugin | Skill | Agent | CLAUDE.md | Hook | Skript | MCP> · `<Name>` oder `neu:` <Art> · <Arbeitsname> oder `Ziel offen`
   *Im Projekt:* <Dateien, Klassen, Fachbegriffe dieses Projekts, nur für die eigene Nacharbeit>

## Sparpotenzial

1. **<Kurzbefund, allgemein>.**
   *Situation:* <welcher Lauf wiederkehrend oder unnötig war, für Außenstehende erzählt, mit Zahl>
   *Ersparnis:* <geschätzt je Session: Tokens, Minuten, Runden; Geld nur mit bekanntem Preis>
   *Besser gewesen:* <wie es in genau diesem Fall billiger gegangen wäre, als Schritte>
   *Vorschlag:* <was das künftig übernimmt>
   *Ziel:* <Plugin | Skill | Agent | CLAUDE.md | Hook | Skript | MCP> · `<Name>` oder `neu:` <Art> · <Arbeitsname>
   *Im Projekt:* <Dateien, Klassen, Fachbegriffe dieses Projekts, nur für die eigene Nacharbeit>

## Neue Ideen

- **<Arbeitsname>** (`neu:` <Art>): <welche Lücke es schließt, an welchem Befund oben sie sichtbar wurde>

## Kleinigkeiten

- <Einzeiler>
```

## Für Außenstehende schreiben

Ein Befund aus Kurzbefund, *Situation*, *Kosten* oder *Ersparnis*, *Ursache*, *Besser gewesen* und *Vorschlag* muss für jemanden verständlich sein, der das Projekt nie gesehen hat. Er soll ihn ohne Rückfrage weitergeben können.

- Projektdinge stehen dort als ihre **Rolle**: „eine Frontend-Komponente“, „ein Fachbegriff der Anwender, der im Code anders heißt“, „die komplette Testsuite mit rund 1.200 Tests“.
- Werkzeuge nennst du beim **Namen**, beim ersten Auftreten mit einem Halbsatz, was sie tun: „der Hook `guard-orchestrator.js`, der Testaufrufe außerhalb des vorgesehenen Skripts blockiert“. Das gilt für Skills, Agents, Hooks, Skripte und MCP-Server.
- Zitate aus der Session bekommen statt Projektbegriffen Platzhalter in eckigen Klammern: „Nein, [Fachbegriff] heißt im Code [Name A], nicht [Name B]“. Das wörtliche Zitat steht unter *Im Projekt:*.
- Befehle behalten Werkzeug und Optionen, Projektnamen werden Platzhalter: `dotnet build <Solution>`, `docker logs --tail 200 <Container>`.
- Dateien, Klassen, Container, Solutions und Fachbegriffe des Projekts stehen nur unter *Im Projekt:*. Das gilt auch für „Neue Ideen“.
- Vor dem Speichern gehst du jeden Befund durch: Steht außerhalb von *Im Projekt:* ein Name, den nur dieses Projekt kennt, ersetzt du ihn durch seine Rolle oder einen Platzhalter.

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
- Eine Aussage ohne Zahl oder Zitat trägt am Ende ` · Eindruck`.
- Kein Befund ohne *Besser gewesen:* und ohne `Ziel:`-Zeile. `neu:` heißt: Das gibt es noch nicht, es lohnt sich, darüber nachzudenken; jedes `neu:` steht zusätzlich unter „Neue Ideen“.
- Die Relevanz-Sätze sammeln sich über mehrere Berichte; erst dann wird ein MCP gestrichen, nicht nach einer Session.
