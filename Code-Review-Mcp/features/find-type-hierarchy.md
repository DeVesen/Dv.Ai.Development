# Feature: find_type_hierarchy

## Was es verbessert

`analyze_type_graph` liefert den Gesamtgraphen — zu viel Rauschen für eine gezielte Frage.  
Dieses Feature beantwortet: „Was erbt von X?" und „Von wem erbt X?" — schnell, für ein konkretes Symbol.

**Scout**: wenn eine Basisklasse oder ein Interface geändert wird, sind alle Ableitungen/Implementierungen automatisch im Scope.  
**Planner**: Scope-Kalkulation für Interface-Änderungen wird belegt statt geschätzt.  
**BoyScoutRule**: beim Anfassen einer abstrakten Klasse → sofort sehen ob Subklassen betroffen sind.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
find_type_hierarchy(typeName, type, filePath?, direction: "up"|"down"|"both")
```

`up` = Basistypen-Kette, `down` = alle ableitenden Klassen + Interface-Implementierungen.  
Rückgabe: `{ up: [TypeInfo], down: [TypeInfo] }` mit Datei + Zeile je Typ.

---

## MCP-Umsetzung

**Angular (ts-morph):**  
Klasse finden via `project.getSourceFiles()` → `getClass(typeName)`.  
- `up`: `cls.getBaseClass()` rekursiv + `cls.getImplements()`  
- `down`: alle Source-Files scannen auf `extends TargetClass` / `implements TargetInterface`  
Implementierung in `src/analyzers/ts-morph-analyzer.ts`.

**dotnet (Roslyn):**  
- `up`: `symbol.BaseType` rekursiv + `symbol.Interfaces`  
- `down`: `SymbolFinder.FindImplementationsAsync` + `SymbolFinder.FindDerivedClassesAsync`  
Neues Script `roslyn-analyzer/roslyn-hierarchy.csx`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "find_type_hierarchy",
  inputSchema: {
    typeName: string,
    type: "angular"|"dotnet"|"auto",
    filePath?: string,
    direction?: "up"|"down"|"both"  // default: "both"
  }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — Kategorie ② Projekt-Index & Navigation:  
Neuer Eintrag `find_type_hierarchy`.

**op-code-map.md** — Entscheidungsbaum, neuer Eintrag:  
| „Interface oder Basisklasse wird geändert" | `find_type_hierarchy(direction: "down")` | alle Implementierungen als Scope-Liste |

**plan-agent-scout.md** — Schritt 2:  
Wenn `find_in_index`-Treffer ein Interface oder eine abstrakte Klasse ist → `find_type_hierarchy(direction: "down")` → alle Ableitungen in Abschnitt 3 (Entry Points) ergänzen.

**plan-agent-topic-planner.md** — Mandatory MCP steps:  
Wenn Interface im Topic-Scope → `find_type_hierarchy` vor Schritt-Planung um vollständigen Implementor-Scope zu kennen.
