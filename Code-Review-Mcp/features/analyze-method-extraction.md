# Feature: analyze_method_extraction_candidates

## Was es verbessert

`analyze_complexity` sagt: „Methode X hat CC 14."  
Dieses Feature sagt: „Methode X hat CC 14 — hier sind die 3 logischen Blöcke, die du herausziehen kannst, mit Vorschlägen für Namen und Parameter."

Nicht nur Messung — sondern direkt umsetzbarer Refactoring-Hinweis.  
**BoyScoutRule**: beim Anfassen einer Datei sofort handhabbare Extraktionskandidaten sehen.  
**Scout Phase 3**: Hotspot-Sektion (Abschnitt 6) erhält konkrete Extraktionsvorschläge statt bloßer Metriken.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
analyze_method_extraction_candidates(filePath, type, thresholds?)
```

Default-Schwellwerte: `minLines: 20`, `minCC: 8`.  
Rückgabe pro Kandidat:
```json
{
  "method": "ProcessOrder",
  "lines": 67,
  "cyclomaticComplexity": 14,
  "candidates": [
    { "suggestedName": "validateOrderItems", "startLine": 12, "endLine": 28, "parameters": ["order", "items"] },
    { "suggestedName": "applyDiscountRules",  "startLine": 30, "endLine": 51, "parameters": ["order", "discountConfig"] }
  ]
}
```

---

## MCP-Umsetzung

**Algorithmus (beide Stacks):**  
1. Methode per AST einlesen, CC und LOC messen  
2. Blank-Line-Cluster und einzeilige Kommentarblöcke als logische Grenzen erkennen  
3. Kontrollfluss-Blöcke (`if`-Zweige, `for`-Schleifen) mit eigenem lokalen State als Extraktionskandidaten markieren  
4. Lokale Variablen die nur im Kandidaten-Block genutzt werden → Parameter-Liste  
5. Namensvorschlag: Kommentar über Block → camelCase; sonst führendes Verb aus erstem Statement

**Angular (ts-morph):**  
Implementierung in `src/features/ts-advanced-features.ts` (neue Methode `findExtractionCandidates`).

**dotnet (Roslyn):**  
Neues Script `roslyn-analyzer/roslyn-extraction.csx` — nutzt `SyntaxWalker` für Block-Traversal.  
Aufgerufen über `src/analyzers/roslyn-runner.ts`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "analyze_method_extraction_candidates",
  inputSchema: {
    filePath: string,
    type: "angular"|"dotnet"|"auto",
    thresholds?: { minLines?: number, minCC?: number }
  }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — Kategorie ③ Erweiterte Code-Analyse:  
Neuer Eintrag nach `analyze_complexity`.

**plan-agent-scout.md** — Schritt 2A (Komplexitäts-Check):  
Bei CC ≥ 10 oder Method-LOC ≥ 30 in Scope-Dateien → `analyze_method_extraction_candidates` nachschalten → Kandidaten in Abschnitt 6 (Komplexitäts-Hotspots) ergänzen.

**SKILL.md (code-review-mcp)** — BoyScoutRule Post-Implementation:  
`analyze_method_extraction_candidates` auf alle geänderten Dateien → wenn Kandidaten vorhanden: als Sofort-Vorschlag ausgeben (kein separater Review nötig).

**op-phasen.md** — Phase IMPLEMENTIERUNG:  
Ergänzung: bei Dateien mit CC-Warnungen aus `review_file` → `analyze_method_extraction_candidates` als Follow-up.
