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
find_type_hierarchy(projectPath, typeName, type, filePath?, direction: "up"|"down"|"both")
```

`up` = Basistypen-Kette (fern→nah zur Ankerklasse), `down` = alle ableitenden Klassen + Interface-Implementierungen/-Erweiterungen.  
Rückgabe: `{ up: [TypeInfo], down: [TypeInfo] }` mit `name`, `file`, `line`, `kind` je Typ.

---

## MCP-Umsetzung

**Angular (ts-morph):**  
Neue Funktion `findTypeHierarchy(rootPath, typeName, filePath?, direction)` in `src/features/ts-type-hierarchy.ts` (projektweite Tools wie `findSymbolReferences` in `ts-advanced-features.ts`, nicht im single-file `ts-morph-analyzer.ts`). Ankert auf Klassen- und Interface-Deklarationen (`collectTypeAnchors`-Muster). `up`: `getExtends()`/`getImplements()` rekursiv mit `visited`-Set; `down`: alle Projekt-SourceFiles auf `extends`/`implements`/`interface extends`. Cap 400 via `PROJECT_FILE_CAP`.

**dotnet (Roslyn):**  
Neues Script `roslyn-analyzer/roslyn-hierarchy.csx` baut wie `roslyn-references.csx` eine `CSharpCompilation` über gewalkte `.cs`-Dateien (**kein** `SymbolFinder`/Workspaces). `up`: `BaseType`-Kette + Interfaces je Ebene; `down`: `DerivedFrom` bzw. `AllInterfaces`. Aufruf über `src/features/dotnet-hierarchy-runner.ts` (`spawnSync dotnet script`, PascalCase→camelCase).

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "find_type_hierarchy",
  inputSchema: {
    projectPath: string,
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
Wenn `find_in_index`-Treffer ein Interface oder eine abstrakte Klasse ist → `find_type_hierarchy(direction: "down")` → alle Ableitungen in Abschnitt 2 (Entry Points) ergänzen.

**plan-agent-topic-planner.md** — Mandatory MCP steps:  
Wenn Interface im Topic-Scope → `find_type_hierarchy` vor Schritt-Planung um vollständigen Implementor-Scope zu kennen.

---

## Limitationen

- **Datei-Cap (400):** Angular (tsconfig- und Walk-Pfad) und .NET (`.Take(400)`) verarbeiten höchstens 400 Dateien. Bei Cap: `capReached` + Warnung `⚠️ Datei-Limit (400) erreicht` im Tool-Output.
- **`.spec.ts` / Test-CS ausgeschlossen:** Konsistent mit `find_symbol_references` — Spec-Dateien erscheinen nicht im `down`-Scan.
- **Angular `down` ohne tsconfig:** Fallback auf Expression-Text; gleichnamige `extends`-Texte können False-Positives liefern.
- **Angular Interface-Implementierung:** `down` prüft direkte `implements` und `interface extends` — transitive Interface-Vererbung bei Klassen nur indirekt (über direktes `implements`).
- **.NET `down`:** Nutzt `AllInterfaces` — transitive Interface-Implementierungen werden erfasst.
- **.NET `up` bei externen Basen:** NuGet-/Projekt-Basistypen außerhalb der TPA-Compilation erscheinen als `{ name, file: "", line: 0 }` oder fehlen — Kette kann unvollständig sein.
- **.NET nur im Container:** `dotnet-hierarchy-runner.ts` nutzt `/app/roslyn-analyzer/roslyn-hierarchy.csx` — läuft im Docker-Image, lokal nur via `dotnet script` (Test-Harness).
- **BE-Tests lokal:** Ohne `dotnet-script` werden BE-Assertions übersprungen; `SKIP_BE_ASSERTIONS=1` für reine FE-Läufe.

## Abgrenzung

- `analyze_type_graph` — Gesamtgraph, Zyklen, Layer-Violations
- `find_type_hierarchy` — gezielte 1-Symbol-Abfrage
- `find_symbol_references` — Call-Sites, nicht Vererbung
