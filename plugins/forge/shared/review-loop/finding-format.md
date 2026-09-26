# Findings-Format

Jeder Reviewer schreibt sein Ergebnis als JSON-Datei an den Pfad aus `Ergebnis:`, als letzte Aktion, auch bei null Findings. Der Dateiname ist sein Kurzname.

```json
{
  "reviewer": "<Kurzname des Reviewers>",
  "summary": "Prüfumfang in einem Satz",
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
- `summary`: was geprüft wurde, z. B. `32 Profile im Index, 5 gelesen, Ist-Stand gedeckt, 0 Findings`.
- Keine Findings: `"findings": []`.
- Alle Felder sind Strings und Pflicht. Eine Datei, die davon abweicht oder deren `reviewer` nicht zum Dateinamen passt, gilt als ungültig.
- Fehlt die Datei am Ende, schickt ein Hook den Reviewer einmal zurück. Danach fordert der Orchestrator sie per `SendMessage` nach.
