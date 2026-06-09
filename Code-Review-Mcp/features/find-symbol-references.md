# Feature: find_symbol_references

## Was es verbessert

`analyze_refactoring_safety` liefert bisher nur eine Zahl: „14 Stellen verwenden diesen Service."  
Dieses Feature liefert die exakte Liste: Datei, Zeile, Methodenkontext — für jede Aufrufstelle eines benannten Symbols.

**Scout** kann damit Refactoring-Risiken belegen statt schätzen (Deliverable-Abschnitt 7 wird konkret).  
**BoyScoutRule**: beim Durchgehen einer Datei sofort sichtbar, welche anderen Stellen eine Änderung zieht.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
find_symbol_references(projectPath, symbolName, type, filePath?)
```

Rückgabe: `[{ file, line, surroundingMethod, snippet }]` — geordnet nach Datei.

---

## MCP-Umsetzung

**Angular (ts-morph):**  
Neue Funktion `findSymbolReferences(rootPath, symbolName, filePath?)` in `src/features/ts-advanced-features.ts` (nicht im single-file `ts-morph-analyzer.ts`). Ankert auf realen Deklarationen (`getClass`/`getFunction`/`getVariableDeclaration`/`getInterface`/`getEnum` + `getClasses().getMethod()/getProperty()/getGetAccessor()/getSetAccessor()`). `findReferences()` **nur** wenn am Root eine `tsconfig.json` existiert (type-aware), sonst Identifier-Text-Match-Fallback nach `analyzeRefactoringSafety`-Muster. Deklarationsknoten ausgeschlossen, dedupe `file:line:col`, Forward-Slashes, sortiert file→line.

**dotnet (Roslyn):**  
Neues Script `roslyn-analyzer/roslyn-references.csx` baut wie `dotnet-indexer.csx` eine `CSharpCompilation` über die gewalkten `.cs`-Dateien (kein `SymbolFinder`/`index_solution`/Workspaces — existiert nicht). Die Compilation referenziert **alle Trusted-Platform-Assemblies**, daher ist **`GetSymbolInfo`/`SymbolEqualityComparer` der PRIMÄRE Filter**: Kandidaten werden per `Identifier.Text == symbolName` über `IdentifierNameSyntax` vorgefiltert (MemberAccess-Namen sind selbst `IdentifierNameSyntax`) und anschließend semantisch gegen die Anker-Deklaration verifiziert. Der reine **Namensmatch greift nur als FALLBACK**, wenn ein Referenz-Symbol nicht auflösbar ist (`GetSymbolInfo` liefert `null`). Aufruf über `src/features/dotnet-references-runner.ts` (`spawnSync dotnet script`, PascalCase→camelCase). JSON `{ References:[{File,Line,SurroundingMethod,Snippet}], CapReached, Error? }`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "find_symbol_references",
  inputSchema: { projectPath: string, symbolName: string, type: "angular"|"dotnet"|"auto", filePath?: string }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — Kategorie ② Projekt-Index & Navigation:  
Neuer Eintrag `find_symbol_references` mit kurzem Was-es-tut.

**op-code-map.md** — Entscheidungsbaum Zeile „Methode, Funktion, Property … (Name bekannt)":  
`find_in_index` für Container → `find_symbol_references` für Aufrufstellen (statt Grep).

**plan-agent-scout.md** — Schritt 2B:  
Nach `analyze_refactoring_safety` bei Urgency ≥ medium → `find_symbol_references` auf das betroffene Symbol → Ergebnis in Abschnitt 7 (Refactoring-Risiken) als Call-Site-Liste.

**SKILL.md (code-review-mcp)** — BoyScoutRule-Abschnitt (neu):  
Bei `review_file` mit public-Methoden die geändert werden sollen → `find_symbol_references` nachschalten.

---

## Limitationen

- **Datei-Cap (400) auf allen Pfaden:** Sowohl der type-aware Angular-Pfad (`new Project({ tsConfigFilePath })`) als auch der Text-Match-Fallback und der .NET-Pfad (`.Take(400)`) verarbeiten höchstens 400 Dateien. Greift der Cap, wird eine Truncation-Warnung bis in den Tool-Output durchgereicht (`⚠️ Datei-Limit (400) erreicht — Liste evtl. unvollständig`); die Trefferliste kann dann unvollständig sein.
- **.NET-Genauigkeit (Reichweite der Semantik):** Die Roslyn-Compilation referenziert alle Trusted-Platform-Assemblies (`AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")`), daher löst `GetSymbolInfo`/`SymbolEqualityComparer` als **primärer** Filter echte Symbole auf. Diese semantische Disambiguierung greift aber **nur, wenn (a) eine Anker-Deklaration des Symbols gefunden wurde und (b) das Referenz-Symbol in-source oder über die BCL/Runtime auflösbar ist**. TPA referenziert ausschließlich BCL/Runtime, **nicht die NuGet-Abhängigkeiten des Zielprojekts** — für externe Typen kann `GetSymbolInfo` weiterhin `null` liefern. In diesem Fall (sowie bei unaufgelösten Generics) greift der Namensmatch als **Fallback**; gleichnamige fremde Symbole sind dort nicht disambiguiert (mögliche False-Positives).
- **Symbol ohne auflösbare Deklaration (beide Stacks):** Findet keiner der Pfade eine Anker-Deklaration (z.B. extern definiertes oder nicht im Scan enthaltenes Symbol), liefern **beide** Stacks bewusst die reinen Namens-/Text-Matches statt einer leeren Liste — Zweck ist das Auffinden von Usages, auch für nicht-deklarierte Symbole. Diese Treffer sind weniger präzise und können gleichnamige fremde Symbole enthalten. Da `declPositions` ohne Anker leer bleibt, wird in diesem reinen Textmatch nichts als Deklaration ausgeschlossen — ist die Deklaration zwar im Scan enthalten, aber von `collectAnchors` nicht als Anker-Form erkannt (z.B. Type-Alias, Namespace, Parameter, Enum-Member, lokale Variable), kann daher auch die **Deklarationsstelle selbst** als Treffer erscheinen. (Genuin externe Symbole haben gar keine Deklaration im Scan.) Der **.NET-Namensmatch-Fallback** ist isoliert betrachtet (ohne greifende semantische Verifikation) ebenfalls weniger präzise.
- **Genauigkeit Angular type-aware vs. Fallback:** Existiert am Root eine `tsconfig.json`, nutzt der Angular-Pfad `findReferences()` (type-aware, präzise). Fehlt sie — oder findet der type-aware Pfad keine Anker — greift der Identifier-Text-Match (siehe vorigen Punkt); gleichnamige Symbole können dann mitgezählt werden.
- **Nur `.ts` / `.cs`:** HTML-Template-Bindings werden **nicht** erfasst — nur TypeScript- bzw. C#-Quellcode. Referenzen ausschließlich im Template (`{{ symbol }}`, `(click)="symbol()"`) erscheinen nicht in der Liste.
- **.NET nur im Container lauffähig:** `dotnet-references-runner.ts` ruft das Script unter dem festen Container-Pfad `/app/roslyn-analyzer/roslyn-references.csx` auf — der .NET-Pfad läuft nur im Docker-Image, nicht lokal.

## Abgrenzung

Ersetzt nicht `analyze_refactoring_safety` (der bleibt für Risikoabschätzung mit Score).  
Ist die Detailstufe danach: „hier sind die konkreten Stellen."
