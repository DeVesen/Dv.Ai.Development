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
1. Alle public Klassen-Member (Methoden/Properties/Get-Set-Accessoren) aus `path` extrahieren — get+set gleichen Namens werden zu einem Symbol dedupliziert  
2. Spec-Dateien (`*.spec.ts`/`*.test.ts`) im **gleichen oder einem beliebigen übergeordneten** Verzeichnis sammeln  
3. **Import-Gate:** eine Klasse gilt als getestet, wenn IRGENDEIN Spec-File sie tatsächlich importiert (`import … { Klasse } … from …`). `reason="no_test_file"` nur, wenn KEIN Spec-File die Klasse importiert. Andernfalls pro Member prüfen, ob er in einem importierenden Spec als Aufruf/Member-Access/String-Literal vorkommt → sonst `no_reference_found`  
Heuristik, kein Compiler-Check — explizit als solche kommuniziert.  
Implementierung in `src/features/ts-advanced-features.ts` (`detectUntestedPublicApi`).

**dotnet (Roslyn) — Variante B (syntaktische Heuristik):**  
1. Alle `public` Member aus Nicht-Test-Dateien extrahieren — `class`, `record` (inkl. positionaler Properties) und `struct`  
2. Test-Dateien per Namens-Heuristik identifizieren — geprüft wird **nur der Dateiname** (`Test`/`Spec` enthalten bzw. `*Tests.cs`/`*Test.cs`/`*Spec.cs`), **nicht** der absolute Pfad (sonst würde ein übergeordneter Ordner wie `Acme.Tests` alle Dateien als Test markieren). Bei `depth=file` wird bis zur Solution-Wurzel (nächste `.sln` aufwärts) gesucht; die gescannte Quelldatei selbst wird nie als Testdatei gewertet  
3. **Klasse→Testdatei-Zuordnung (`no_test_file`-Mechanik):** eine Testdatei gilt als zur Klasse `Foo` gehörig, wenn ihr Dateiname-Stem `Foo`/`FooTests`/`FooTest`/`FooSpec`/`FooSpecs` ist **oder** ihr Code `Foo` per Wortgrenze referenziert. `no_test_file` = KEINE Testdatei ist der Klasse zugeordnet  
4. Pro public Symbol: **Wortgrenzen-Textabgleich** ausschließlich gegen die der Klasse **zugeordneten** Testdateien (MemberAccess-Namen + `\bName\b`-Match, keine Contains-Substring-Treffer) → sonst `no_reference_found`  
Roslyn dient **ausschließlich zum Parsen** des Syntaxbaums — es gibt **keine** semantische Referenzauflösung.  
Neues Script `roslyn-analyzer/roslyn-test-coverage-static.csx`.

> **Limitation — verbleibende Heuristik-Divergenz Angular vs. .NET:** Beide Stacks
> skopieren die Member-Prüfung pro Klasse (Angular via echtem Import-Gate: nur Specs,
> die die Klasse importieren; .NET via Dateiname-Stem/Wortgrenzen-Zuordnung). Da .NET
> **kein** echtes Import-System wie TS-Imports kennt, bleibt die .NET-Zuordnung
> prinzipiell **lockerer/heuristischer** als das TS-Import-Gate — eine bewusst in Kauf
> genommene Rest-Asymmetrie ohne Build/Test-Run.

> **Hinweis — nicht umgesetzt:** Eine semantisch präzise Variante via
> `SymbolFinder.FindReferencesAsync` (echte Referenzauflösung gegen kompilierte
> Test-Assemblies) wäre genauer, ist aber bewusst NICHT implementiert: sie
> erfordert eine vollständige Compilation/MSBuild-Auflösung und damit deutlich
> mehr Laufzeit/Abhängigkeiten. Die syntaktische Variante B bleibt ein
> leichtgewichtiger Proxy ohne Build/Test-Run.

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

**implement-review-pessimist-agent.md** — MCP-first Prüfungen:  
`detect_untested_public_api` ist dort als **erster** Pessimist-Check verdrahtet (vor `analyze_refactoring_safety` / `find_symbol_references`), um ungetestete öffentliche API nach jeder Implementierungsiteration aufzudecken — und dient bei fehlendem Coverage-Report als leichtgewichtiger Proxy für `analyze_coverage`. (Der ursprünglich hier genannte `plan-agent-pessimist.md` existiert nicht mehr; die Prüfung ist phasen-korrekt in der Nach-Implementierungs-Rolle realisiert.)

**op-phasen.md** — Phase „Nach Implementierung":  
`detect_untested_public_api` als erster Check vor `analyze_test_quality`.
