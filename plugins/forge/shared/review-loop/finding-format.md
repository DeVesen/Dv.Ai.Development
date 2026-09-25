# Findings-Format

Jeder Reviewer beendet seine Antwort mit genau einem JSON-Block. Nach dem Block folgt kein Text.

```json
{
  "reviewer": "<Kurzname des Reviewers>",
  "findings": [
    {
      "location": "AC-07",
      "quote": "wörtliches Zitat aus dem geprüften Dokument",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: ein Stellen-Schlüssel des Skills — `AC-<Zahl>`, `Task <n>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor. Details auf Schritt-Ebene gehören in `quote`.
- `quote`: wörtlich aus dem geprüften Dokument. Bei Befunden aus einer Zusatzquelle mit Präfix `Quelle: `.
- `severity`: `red` | `yellow` | `green`, siehe `severity-rules.md`.
- Keine Findings: `"findings": []`.
- Alle Felder sind Strings und Pflicht. Ein Block, der davon abweicht, gilt als ungültig. Der Reviewer wird dann einmal neu gestartet.
