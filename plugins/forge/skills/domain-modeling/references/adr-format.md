# ADR-Format

## Wann anbieten

Nur wenn alle drei Kriterien zutreffen:
1. **Schwer umkehrbar** — ein späterer Rückbau kostet deutlich mehr als die Entscheidung jetzt.
2. **Ohne Kontext überraschend** — wer später nur das Ergebnis sieht, würde ohne Begründung anders entscheiden.
3. **Echter Trade-off** — es gab mindestens eine ernsthafte Alternative mit eigenen Vorteilen.

Fehlt eines, kein ADR. Ein ADR wird angeboten; geschrieben wird erst, wenn der Mensch zustimmt.

## Ablage

`docs/adr/NNNN-<slug>.md`. `NNNN` ist vierstellig und die nächste Nummer nach der höchsten vorhandenen, beim ersten ADR `0001`. `docs/adr/` wird erst beim ersten ADR angelegt.

## Format

```markdown
# ADR-<NNNN>: <Titel>

<YYYY-MM-DD> · Status: angenommen

## Kontext
## Entscheidung
## Verworfene Alternativen
## Folgen
```
