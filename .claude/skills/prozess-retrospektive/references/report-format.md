# Erfahrungsbericht

Gleiches Format wie die bisherigen Berichte unter `docs/wishes/`, damit mehrere Berichte später zu einer Wunschliste zusammengeführt werden können.

```markdown
# Erfahrungsbericht <Thema der Session>

**Lauf:** <was gemacht wurde, welche Skills und Plugins, Session-Modell, Datum>
**Ergebnis:** <was herauskam>. Dauer <min>, Eingaben des Menschen <n>, Tokens neu <k> Hauptsession und <k> Subagents.

## Zahlen
<die Zeilen oben aus session-facts.js, unverändert, ohne Tabellen>

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
   *Ziel:* <Plugin | Skill | Agent | CLAUDE.md | Hook | MCP> · `<datei>` oder `Ziel offen`

## Kleinigkeiten

- <Einzeiler>
```

Regeln:
- Sortiert nach Kosten: teuerster Reibungspunkt zuerst.
- Eine Aussage ohne Zahl oder Zitat trägt am Ende ` · Eindruck`.
- Kein Wunsch ohne `Ziel:`-Zeile.
- Die Relevanz-Sätze sammeln sich über mehrere Berichte; erst dann wird ein MCP gestrichen, nicht nach einer Session.
