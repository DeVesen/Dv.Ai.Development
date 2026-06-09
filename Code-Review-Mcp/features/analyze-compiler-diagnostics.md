# Feature: analyze_compiler_diagnostics

## Was es verbessert

Alle bisherigen Tools arbeiten mit statischer AST-Analyse und Heuristiken.  
Dieses Feature lässt den echten Roslyn-Compiler gegen ein Projekt laufen und liefert tatsächliche Build-Fehler und Warnings — nicht geschätzt, sondern compiler-verifiziert.

Unterschied zu `review_file`: `review_file` erkennt Muster. `analyze_compiler_diagnostics` erkennt was der Compiler auch erkennt — Type-Mismatches, fehlende Implementierungen, ungelöste Referenzen, Nullable-Violations (CS8600+).

**Post-Implementation BoyScoutRule**: nach Implementierung sofort sehen ob der Code überhaupt baut — ohne dass der Entwickler lokal bauen muss.  
**Scout Phase 3**: prüfen ob der aktuelle Stand der Codebasis clean ist bevor eine Änderung geplant wird.  
**Pessimist Phase 5**: Compiler-Fehler im Scope als harte Blocker melden.

## Gilt für

- .NET: ✅
- Angular: ✅ (TypeScript-Compiler via ts-morph Diagnostics API)

## Ziel-Tool

```
analyze_compiler_diagnostics(path, type, severity?: "error"|"warning"|"all")
```

Default: `severity: "error"`.  
Rückgabe: `[{ code, message, file, line, column, severity }]` — geordnet nach Severity, dann Datei.

---

## MCP-Umsetzung

**dotnet (Roslyn):**  
`MSBuildWorkspace.OpenProjectAsync(projectPath)` → `project.GetCompilationAsync()` → `compilation.GetDiagnostics()`.  
Kein `dotnet build` nötig — Roslyn-Compilation API liefert Diagnostics direkt ohne Filesystem-Output.  
Neues Script `roslyn-analyzer/roslyn-diagnostics.csx`.  
Aufgerufen über `src/analyzers/roslyn-runner.ts`.

**Angular (ts-morph):**  
`project.getPreEmitDiagnostics()` — liefert TypeScript-Compiler-Fehler und Warnings ohne Emit.  
Implementierung in `src/analyzers/ts-morph-analyzer.ts` als neue Methode `getCompilerDiagnostics`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "analyze_compiler_diagnostics",
  inputSchema: {
    path: string,                              // filePath oder projectPath
    type: "angular"|"dotnet"|"auto",
    severity?: "error"|"warning"|"all"        // default: "error"
  }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — neue Kategorie ⑦ Compiler & Build (oder Ergänzung zu ③):  
Eintrag `analyze_compiler_diagnostics` mit Hinweis „echter Compiler, keine Heuristik".

**plan-agent-scout.md** — vor Schritt 1 (optionaler Pre-Check):  
`analyze_compiler_diagnostics(projectPath, severity: "error")` vor `index_project` — wenn Fehler vorhanden → in Deliverable Abschnitt 4 (Risiken und Annahmen) als „Build-Fehler im Scope" melden, kein Blocker aber explizit sichtbar.

**plan-agent-pessimist.md** — Optionale MCP-Checks (neuer Schritt C):  
`analyze_compiler_diagnostics` auf Scout-Scope mit `severity: "error"` — Compiler-Fehler = harter Blocker im Pessimist-Report.

**SKILL.md (code-review-mcp)** — BoyScoutRule Post-Implementation:  
`analyze_compiler_diagnostics` als erster Check nach Implementierung — vor `suggest_boyscout_actions`.  
Bei Errors: Ausgabe als `critical`, keine weiteren BoyScout-Checks bis clean.
