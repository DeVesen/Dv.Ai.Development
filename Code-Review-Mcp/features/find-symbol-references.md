# Feature: find_symbol_references

## Was es verbessert

`analyze_refactoring_safety` liefert bisher nur eine Zahl: „14 Stellen verwenden diesen Service."  
Dieses Feature liefert die exakte Liste: Datei, Zeile, Methodenkontext — für jede Aufrufstelle eines benannten Symbols.

**Scout** kann damit Refactoring-Risiken belegen statt schätzen (Deliverable-Abschnitt 8 wird konkret).  
**BoyScoutRule**: beim Durchgehen einer Datei sofort sichtbar, welche anderen Stellen eine Änderung zieht.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
find_symbol_references(symbolName, type, filePath?)
```

Rückgabe: `[{ file, line, surroundingMethod, snippet }]` — geordnet nach Datei.

---

## MCP-Umsetzung

**Angular (ts-morph):**  
`project.getSourceFiles()` → für jede Datei `node.findReferences()` auf dem Symbol-Node.  
Implementierung in `src/analyzers/ts-morph-analyzer.ts` als neue Methode `findSymbolReferences`.

**dotnet (Roslyn):**  
`SymbolFinder.FindReferencesAsync(symbol, solution)` — benötigt geladene Solution (siehe `index_solution`-Feature).  
Fallback auf Projekt-Scope wenn keine Solution: `SymbolFinder.FindReferencesAsync(symbol, project.Solution)`.  
Neues Script `roslyn-analyzer/roslyn-references.csx`, aufgerufen über bestehenden `roslyn-runner.ts`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "find_symbol_references",
  inputSchema: { symbolName: string, type: "angular"|"dotnet"|"auto", filePath?: string }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — Kategorie ② Projekt-Index & Navigation:  
Neuer Eintrag `find_symbol_references` mit kurzem Was-es-tut.

**op-code-map.md** — Entscheidungsbaum Zeile „Methode, Funktion, Property … (Name bekannt)":  
`find_in_index` für Container → `find_symbol_references` für Aufrufstellen (statt Grep).

**plan-agent-scout.md** — Schritt 2B:  
Nach `analyze_refactoring_safety` bei Urgency ≥ medium → `find_symbol_references` auf das betroffene Symbol → Ergebnis in Abschnitt 8 (Refactoring-Risiken) als Call-Site-Liste.

**SKILL.md (code-review-mcp)** — BoyScoutRule-Abschnitt (neu):  
Bei `review_file` mit public-Methoden die geändert werden sollen → `find_symbol_references` nachschalten.

---

## Abgrenzung

Ersetzt nicht `analyze_refactoring_safety` (der bleibt für Risikoabschätzung mit Score).  
Ist die Detailstufe danach: „hier sind die konkreten Stellen."
