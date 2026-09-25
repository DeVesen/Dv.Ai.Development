# Findings-Format

Jeder Reviewer beendet seine Antwort mit genau einem JSON-Block. Nach dem Block folgt kein Text.

```json
{
  "reviewer": "<completeness|consistency|feasibility|clarity|profiles>",
  "findings": [
    {
      "location": "AC-07",
      "quote": "wörtliches Zitat aus der Spec",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `AC-<Zahl>` oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor.
- `quote`: wörtlich aus der Spec. Bei Befunden aus der Quelle der Anfrage mit Präfix `Quelle: `.
- `severity`: `red` | `yellow` | `green`, siehe `severity-rules.md`.
- Keine Findings: `"findings": []`.
- Alle Felder sind Strings und Pflicht. Ein Block, der davon abweicht, gilt als ungültig. Der Reviewer wird dann einmal neu gestartet.
