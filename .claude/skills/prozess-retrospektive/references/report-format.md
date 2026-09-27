# Erfahrungsbericht

Gleiches Format wie die bisherigen Berichte unter `docs/wishes/`, damit mehrere Berichte später zu einer Wunschliste zusammengeführt werden können.

```markdown
# Erfahrungsbericht <Thema der Session>

**Lauf:** <was gemacht wurde, welche Skills und Plugins, Session-Modell, Datum>
**Ergebnis:** <was herauskam>. Dauer <min>, Eingaben des Menschen <n>, Tokens neu <k> Hauptsession und <k> Subagents.

## Zahlen
<die Zeilen oben aus session-facts.js, unverändert, ohne Tabellen, dazu die Listen aus „Sparpotenzial“>

## MCP-Nutzung
<Abschnitt „MCP-Nutzung (gemessen)" aus session-facts.js, unverändert mit Tabellen>

**Relevanz:** je erwartetem MCP ein Satz: gebraucht · verzichtbar in dieser Session · hätte genützt, weil <Beleg>

## Positiv

1. **<Kurzbefund>.** <was gut lief, mit Beleg>

## Negativ / Verbesserungswünsche

1. **<Kurzbefund>.**
   <was passiert ist, mit Zahl oder Zitat, und was es gekostet hat>
   *Ursache:* <warum>
   *Wunsch:* <was sich ändern soll>
   *Ziel:* <Plugin | Skill | Agent | CLAUDE.md | Hook | Skript | MCP> · `<datei>`, `neu:` <Art> · <Arbeitsname> oder `Ziel offen`

## Sparpotenzial

1. **<Kurzbefund>.**
   <was Zeit, Tokens oder Runden gekostet hat, mit Zahl aus „Sparpotenzial“ oder dem Verlauf>
   *Ersparnis:* <geschätzt je Session: Tokens, Minuten, Runden; Geld nur mit bekanntem Preis>
   *Idee:* <was das künftig übernimmt>
   *Ziel:* <Plugin | Skill | Agent | CLAUDE.md | Hook | Skript | MCP> · `<datei>` oder `neu:` <Art> · <Arbeitsname>

## Kleinigkeiten

- <Einzeiler>
```

Regeln:
- Sortiert nach Kosten: teuerster Reibungspunkt zuerst, größte Einsparung zuerst.
- Ein Punkt steht entweder unter Negativ (etwas hakte) oder unter Sparpotenzial (lief, aber zu teuer), nicht in beiden.
- Eine Aussage ohne Zahl oder Zitat trägt am Ende ` · Eindruck`.
- Kein Wunsch ohne `Ziel:`-Zeile. `neu:` heißt: Das gibt es noch nicht, es lohnt sich, darüber nachzudenken.
- Die Relevanz-Sätze sammeln sich über mehrere Berichte; erst dann wird ein MCP gestrichen, nicht nach einer Session.
