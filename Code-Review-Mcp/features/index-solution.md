# Feature: index_solution

## Was es verbessert

`index_project` indexiert ein einzelnes Projekt (`src/frontend` oder `src/backend`).  
In Multi-Projekt-Solutions (z.B. `Api` + `Domain` + `Infrastructure` + `Contracts` als separate .csproj) findet `find_in_index` und `analyze_refactoring_safety` keine Caller die in einem anderen Projekt liegen.

Dieses Feature lädt eine `.sln`-Datei und indexiert alle enthaltenen Projekte gemeinsam in den bestehenden Cache.  
`find_in_index`, `find_symbol_references` und `analyze_refactoring_safety` arbeiten danach solution-weit.

**Scout**: cross-project Impact Assessment für Mono-Repos und mehrschichtige .NET-Architekturen.  
**Planner**: Topic-Grenzen zwischen Projekten werden sauber erkannt.

## Gilt für

- .NET: ✅
- Angular: ❌ (nicht anwendbar — Angular kennt keine .sln-Äquivalente)

## Ziel-Tool

```
index_solution(solutionPath, format: "llm"|"raw")
```

Rückgabe: kombinierter Index aller Projekte — gleiche Struktur wie `index_project`, mit zusätzlichem Feld `project` pro Symbol.  
Cache-Key: Hash des `.sln`-Pfads + Änderungszeit, TTL 5 min (identisch zu `index_project`).

---

## MCP-Umsetzung

**Roslyn MSBuildWorkspace:**
```csharp
var workspace = MSBuildWorkspace.Create();
var solution = await workspace.OpenSolutionAsync(solutionPath);
// alle solution.Projects iterieren, bestehender Indexer pro Projekt aufrufen
```
`dotnet-indexer.csx` erweitern: optionaler `solutionPath`-Modus der `solution.Projects` iteriert statt einem einzelnen Projekt.

**Projekt-Merge:** Ergebnisse aller Einzel-Projekt-Indizes zusammenführen, `project`-Feld pro Symbol ergänzen.

**Anpassung `src/indexers/dotnet-indexer-runner.ts`:**  
Neuer Eingabe-Parameter `solutionPath?: string` — wenn gesetzt: `index_solution`-Modus, sonst bisheriges Verhalten.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "index_solution",
  inputSchema: {
    solutionPath: string,   // /workspace/<path>/<name>.sln
    format?: "llm"|"raw"   // default: "llm"
  }
}
```

---

## Skills / Agents Erweiterung

**op-code-map.md** — Schritt 0 (Projektwurzel wählen), neuer Eintrag:

| Stack | `solutionPath` | Wann |
|-------|---------------|------|
| .NET Multi-Projekt | `/workspace/<name>.sln` | Wenn `index_project` Abhängigkeiten zu anderen Projekten zeigt |

**op-code-map.md** — Schritt 1 (Landkarte):  
Neuer Entscheidungspunkt: wenn `index_project`-Output enthält `"externalDependencies"` oder `"projectReferences"` → `index_solution` als Folgeaufruf.

**plan-agent-scout.md** — MCP-Werkzeugkette:  
Neuer bedingter Schritt vor Schritt 1: „Wenn `.sln`-Datei im `/workspace/` root → `index_solution` statt `index_project` für .NET-Stack."

**op-tool-overview.md** — Kategorie ② Projekt-Index & Navigation:  
Neuer Eintrag `index_solution` mit Hinweis `.NET only`.

---

## Voraussetzungen

- MSBuild muss im Docker-Image verfügbar sein (ist bereits via `.NET SDK` gegeben)
- Pfad-Konvention: `/workspace/<solution>.sln` (gleiche Volume-Mount-Regel wie alle anderen Tools)
- Größere Solutions (> 20 Projekte): Timeout erhöhen oder Projekt-Whitelist-Parameter ergänzen
