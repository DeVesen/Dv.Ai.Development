# Feature: detect_untested_public_api

## Was es verbessert

`analyze_coverage` benötigt einen fertigen Coverage-Report (lcov.info / coverage.cobertura.xml).  
Dieses Feature braucht keinen Test-Run: es scannt statisch, welche public-Methoden und -Properties keine erkennbare Test-Referenz haben — via Namensmatch und Import-Analyse gegen Spec/Test-Dateien.

**BoyScoutRule Post-Implementation**: nach jeder Implementierung sofort sichtbar, welche neuen public API-Punkte ungetestet sind — ohne CI-Lauf.  
**Pessimist (Phase 5)**: greift wenn kein Coverage-Report vorliegt, als leichtgewichtiger Proxy.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
detect_untested_public_api(path, type, depth: "file"|"project")
```

Rückgabe: `[{ symbol, file, line, reason: "no_test_file"|"no_reference_found" }]`

---

## MCP-Umsetzung

**Angular (ts-morph):**  
1. Alle exportierten Klassen/Methoden/Properties aus `path` extrahieren  
2. Spec-Dateien (`*.spec.ts`) im gleichen oder übergeordneten Verzeichnis suchen  
3. Pro public Symbol: prüfen ob Klassenname in einem Spec-File importiert wird und ob Methodenname als String-Literal oder direkter Aufruf vorkommt  
Heuristik, kein Compiler-Check — explizit als solche kommunizieren.  
Implementierung in `src/features/ts-advanced-features.ts` (neue Methode).

**dotnet (Roslyn):**  
1. Alle `public` Member aus Nicht-Test-Projekten extrahieren  
2. Test-Assemblies identifizieren (via `[TestClass]`, `[Fact]`, `[Test]`-Attribute)  
3. Pro public Symbol: `SymbolFinder.FindReferencesAsync` auf Test-Assemblies beschränken  
Neues Script `roslyn-analyzer/roslyn-test-coverage-static.csx`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "detect_untested_public_api",
  inputSchema: {
    path: string,               // filePath oder projectPath
    type: "angular"|"dotnet"|"auto",
    depth?: "file"|"project"   // default: "file"
  }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — Kategorie ⑥ Test-Qualität & Coverage:  
Neuer Eintrag `detect_untested_public_api` mit Hinweis „kein Test-Run nötig, Heuristik".

**SKILL.md (code-review-mcp)** — neuer BoyScoutRule-Abschnitt:  
Nach Implementierung: `detect_untested_public_api` auf alle neu erstellten/geänderten Dateien → kompaktes Summary „X ungetestete public API-Punkte" mit Datei + Zeile.

**plan-agent-pessimist.md** — Optional MCP checks:  
Wenn kein Coverage-Report verfügbar → `detect_untested_public_api(projectPath, depth: "project")` als Proxy für `analyze_coverage`.

**op-phasen.md** — Phase „Nach Implementierung":  
`detect_untested_public_api` als erster Check vor `analyze_test_quality`.
