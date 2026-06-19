---
name: codebase-analyzer
description: >
  Aktiviere diesen Skill sobald der User über Code spricht — egal ob er plant,
  gerade schreibt oder fertig ist. Der MCP hat 43 Tools für Angular und .NET.
  Bei Code-Symbolen (Klasse, Methode, Property, Service, Route): zuerst
  index_project/index_solution/find_in_index, Grep nur ergänzend. UI-Labels ohne Symbol:
  keine Landkarte. Trigger: Review, Analyse, Planung, Implementierung, Merge,
  index_project, index_solution, find_in_index, Code-Landkarte, Validierung, API-Contract,
  compare_validation_rules, api-validation, DTO, DataAnnotations,
  find_api_callers, HTTP-Calls, format:compact, analyze_compiler_diagnostics,
  Compiler-Fehler, Build-Fehler, detect_untested_public_api,
  ungetestete API, Test-Coverage-Proxy, find_symbol_references, Aufrufstellen,
  Call-Sites, analyze_method_extraction_candidates, Extract-Method, Refactoring-Hotspot,
  detect_god_classes, God Class, SRP, Single-Responsibility.
when_to_use: >
  Aktiviere sobald User über Code spricht — Planung, Implementierung, Nach-Implementierung,
  Review, Merge, Sprint-End. Bei Code-Symbolen (Klasse, Methode, Service, Route) immer
  index_project/find_in_index zuerst statt Grep. Nicht bei reinem UI-Wortschatz.
---

## Phase erkennen und MCP-First

Wenn ein User über Code spricht, erkenne die Phase und handle entsprechend.

**→ PLANUNG** wenn der User noch nicht angefangen hat zu schreiben:
Schlüsselwörter: "planen", "bauen wollen", "vorgehen", "API ändern", "Klasse erweitern", "wie soll ich…"

**→ IMPLEMENTIERUNG** wenn Code bereits existiert:
Schlüsselwörter: "schau an", "ist das okay", "vor dem Commit", "hier mein Code", "kann ich verbessern"

**→ NACH IMPLEMENTIERUNG** wenn Feature fertig ist und Tests laufen:
Schlüsselwörter: "Tests laufen", "Feature fertig", "vor dem Merge", "Sprint-End", "Release", "wie gut sind meine Tests"

---

## MCP-Pfad-Kanon (Pflicht)

- Alle codebase-analyzer-Pfade als **Windows-Absolutpfade** (`C:\...`) — kein `/workspace/` mehr
- dev-mcp nutzt ebenfalls Windows-Absolutpfade (`C:\...`)
- **VERBOTEN:** `/workspace/`-Pfade, relative Pfade, `{parameter}`-Platzhalter als MCP-Argument
- `Path not found: ...` = Pfadformat-Fehler, kein Retry — Format korrigieren

| MCP | Parameter-Format | Beispiel |
|-----|------------------|----------|
| codebase-analyzer | Windows-Absolutpfad | `C:\Develop\MyProject\src\frontend` |
| dev-mcp | Windows-Absolutpfad | `C:\Develop\MyProject\src\backend` |

**Quelle für konkrete Pfade:** `mcp-project-paths.md` (deployed in target project as `.cursor/references/mcp-project-paths.md`)
- Pfade aus `skill-params.json` direkt als Windows-Absolutpfad an MCP übergeben
- `./AGENTS.md` optional — bei Widerspruch gilt mcp-project-paths.md

**Backend Multi-.csproj:**
- Primär: mehrere `index_project` auf `.csproj`-Verzeichnisse (Routing-Tabelle in mcp-project-paths.md)
- `index_solution`: nur wenn mcp-project-paths.md `index_solution: allowed` — sonst Known Issue

**VERBOTEN als MCP-Argument:** `/workspace/`-Pfade, relative Pfade, `{frontend-path}`, `{backend-path}`.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## MCP codebase-analyzer — Server und Tools

**Server:** `codebase-analyzer` (Node stdio, Log-Viewer Port 5052)
**Transport:** stdio — kein Docker, kein Volume-Mount erforderlich.
**Pfade:** Windows-Absolutpfade (`C:\...`) — `path.resolve()` übernimmt Auflösung.

| Tool | Zweck |
|------|-------|
| `review_file` | Single-file Review |
| `review_code` | Code im Chat reviewen |
| `review_git_diff` | Vor dem Commit reviewen |
| `review_files_batch` | Mehrere Dateien auf einmal |
| `review_with_index` | Finaler Review mit vollem Projektkontext |
| `analyze_ast_only` | Nur AST-Analyse |
| `compare_validation_rules` | Angular ↔ .NET Validierungs-Delta |
| `find_api_callers` | HttpClient-Aufrufe in Angular-Service finden |
| `index_project` | Projekt indexieren (neu: `projects[]` für Batch mehrerer Pfade in einem Call) |
| `index_solution` | .NET Solution indexieren |
| `index_status` | **NEU** — Status aller gecachten Indizes: stale?, indexedAt, symbolCount |
| `find_in_index` | Symbol im Index suchen (neu: `format`: paths_only / compact / full) |
| `find_symbol_references` | Alle Aufrufstellen eines Symbols |
| `find_type_hierarchy` | Vererbungs-Scope |
| `detect_god_classes` | God-Class-Wachstum erkennen |
| `analyze_complexity` | Komplexitäts-Analyse |
| `analyze_method_extraction_candidates` | Extract-Method-Hinweise |
| `analyze_dead_code` | Dead Code nach Refactoring |
| `analyze_nullability` | Async/Nullable-Analyse |
| `analyze_duplicates` | Duplikate nach Feature-Freeze |
| `analyze_refactoring_safety` | Refactoring-Risiko |
| `generate_auto_fixes` | Auto-Fixes vorschlagen |
| `analyze_dataflow` | Datenfluss-Analyse |
| `analyze_advanced_all` | Vollständiger Projekt-Gesundheitsbericht |
| `suggest_class_splits` | Klassen-Splits vorschlagen |
| `analyze_maintainability_index` | Maintainability-Index |
| `analyze_type_graph` | Architektur-/Abhängigkeitsgraph |
| `analyze_control_flow` | Kontrollfluss-Analyse |
| `analyze_coverage` | Coverage auswerten (nach Test-Run) |
| `analyze_test_quality` | Test-Qualität prüfen |
| `detect_untested_public_api` | Ungetestete public API — Reason Codes: `no_test_file` / `rendered_not_asserted` / `rendered_and_asserted` / `no_reference_found` |
| `analyze_component_test_coverage` | **Neu v2.8** — Ein-Call Angular-Abdeckungsbericht: Stufe A/B/C, Konsumenten, Eltern-Spec-Matrix, Template-Szenarien |
| `analyze_test_health` | Gesamtbild Coverage + Qualität |
| `suggest_boyscout_actions` | Boy-Scout-Checks gebündelt |
| `analyze_compiler_diagnostics` | Compiler-Check (Roslyn / TypeScript) |
| `scout_symbol` | **COMPOSITE NEU** — Symbol suchen: Index → Filesystem-Fallback, format: paths_only/compact/full |
| `scout_scope` | **COMPOSITE NEU** — Batch-Scout: mehrere Repo-Fragen → Scout-Protokoll-Tabelle |
| `analyze_slice_impact` | **COMPOSITE NEU** — Post-Slice: Compiler + BoyScout + Untested + Refactoring in einem Call |
| `find_angular_route` | **NEU** — Route-Pfad → Component + Guards (Angular-Index + Filesystem-Fallback) |
| `find_angular_guard` | **NEU** — Guard-Name → Datei + canActivate-Kette |
| `find_dotnet_endpoint` | **NEU** — Controller/Action oder Route-Template → Methode + DTO |
| `find_di_registration` | **NEU** — Service/Interface → Program.cs/Startup-Registrierung |
| `analyze_planning_inventory` | **NEU** — Endpoint/Route/DTO-Inventar für Planungs-Phase |
| `trace_api_contract` | **NEU** — FE Service → BE Endpoint + Validierungs-Delta (1 Call) |
| `find_api_consumers` | **NEU** — BE Endpoint → alle FE-Call-Sites (Reverse zu find_api_callers) |

---

## PLANUNG — Vorgehen

**Symbol-Bezug (Klasse, Methode, Property, Service, Route):** Grep nicht zuerst — zuerst `index_project` auf dem **richtigen** MCP-`projectPath`, dann `find_in_index`. Grep nur für Caller, String-Literale, Routes.
**Kein Index** bei reinem UI-Wortschatz (Button-Label, sichtbares Feld) ohne genanntes Symbol.

Vollständige Recherche-Reihenfolge: [references/op-code-map.md](references/op-code-map.md)

**Schritt 1** — Immer zuerst. MCP-Parameter: **Windows-Absolutpfade** aus **mcp-project-paths.md**.

```
// Angular FE:
index_project(projectPath: "<Windows-Absolutpfad aus mcp-project-paths.md>", type: "angular")
// .NET — Routing-Tabelle in mcp-project-paths.md:
index_project(projectPath: "<Windows-Absolutpfad für mcp-be-* oder mcp-backend-path>", type: "dotnet")
// Multi-.csproj: mehrere index_project — index_solution nur wenn mcp-project-paths index_solution: allowed
```

Zeige kompakt: was gibt es, was sind die größten Abhängigkeiten, gibt es Warnungen?

**Schritt 2** — Bei konkreter Klasse/Service:
```
find_in_index(projectPath: "C:\Develop\MyProject\src\frontend", type: "angular", query: "<Name>")
```

**Schritt 3** — Wenn bestehende Klasse erweitert werden soll:
```
suggest_class_splits(projectPath: "...", type: "...", targetClass: "<Name>")
```
Urgency "high"/"critical" → Split empfehlen bevor das neue Feature kommt.

**Schritt 4** — Nur bei API-Änderungen:
```
analyze_refactoring_safety(projectPath: "...", type: "...", targetName: "<Methode>")
```

**Schritt 5** — Bei Architektur-/Abhängigkeitsfragen:
```
analyze_type_graph(projectPath: "...", type: "...")
```

**Ausgabe Planung:**
1. Kurze Zusammenfassung was der Index zeigt (2–3 Sätze)
2. Konkrete Empfehlung in 3–5 Punkten
3. Risiko-Hinweis wenn etwas die Planung wesentlich beeinflusst

---

## IMPLEMENTIERUNG — Vorgehen

**Schritt 1** — Je nach Eingabe:
- Dateipfad → `review_file(filePath: "...", focusAreas: ["solid","security","performance","angular-best-practices"])`
- Code im Chat → `review_code(code: "...", filename: "<Name>.cs oder .ts")`
- Vor dem Commit → `review_git_diff(repoPath: "...", staged: false)`
- Mehrere Dateien → `review_files_batch(filePaths: [...])`

**Schritt 2** — Zusatz wenn async/nullable Code dabei:
```
analyze_nullability(projectPath: "...", type: "...")
```

**Schritt 3** — Wenn Methoden komplex oder lang wirken:
```
analyze_complexity(projectPath: "...", type: "...")
```

**Schritt 4** — Wenn "was kann ich verbessern?" gefragt wird:
```
generate_auto_fixes(projectPath: "...", type: "...")
```

**Schritt 5** — Nach einem Refactoring:
```
analyze_dead_code(projectPath: "...", type: "...")
```

**Ausgabe Implementierung — immer dieses Format:**
```
Score: X/10

🔴 Kritisch (sofort fixen):
  - Zeile XX: [Problem] → [konkreter Fix mit Code]

🟠 Warnung:
  - Zeile XX: [Problem] → [Fix]

✅ Gut gemacht:
  - [Was positiv auffällt]

💡 Top 3 Sofortmaßnahmen:
  1. ...
  2. ...
  3. ...
```

---

## NACH IMPLEMENTIERUNG — Vorgehen

**Schritt 0** — Compiler-Check (echter Compiler, kein Shell-Build) — **allererster** Check:
```
analyze_compiler_diagnostics(path: "C:\Develop\MyProject\src\app\my.service.ts", type: "auto", severity: "error")
// bzw. Projekt-/Modul-Wurzel:
analyze_compiler_diagnostics(path: "C:\Develop\MyProject\src\backend\<projekt>", type: "auto", severity: "error")
```
Bei Compiler-Errors: **`critical`** — keine weiteren Nach-Implementierungs-Checks bis clean.

**Schritt 1** — Ungetestete public API aufdecken (Heuristik, kein Test-Run):
```
// FE-Einzeldatei direkt nach der Implementierung:
detect_untested_public_api(path: "C:\Develop\MyProject\src\app\my.service.ts", type: "auto", depth: "file")
// .NET bzw. ganzes Feature/Modul: .csproj-Verzeichnis:
detect_untested_public_api(path: "C:\Develop\MyProject\src\backend\<projekt>", type: "auto", depth: "project")
```

> ⚠️ **Controller-False-Positives:** `detect_untested_public_api` erkennt nur Unit-Test-Referenzen.
> Controller-Methoden die durch Integration- oder HTTP-Tests abgedeckt sind (z.B. `WebApplicationFactory`-Tests),
> werden als `no_reference_found` gemeldet — obwohl getestet.
> **Findings für Controller-Klassen immer manuell prüfen** ob ein Integrationstestprojekt existiert.

**Schritt 2** — Test-Qualität prüfen (kein Test-Run nötig):
```
analyze_test_quality(projectPath: "...", type: "...")
```

**Schritt 3** — Coverage auswerten:

> ⚠️ **`analyze_coverage` liest den zuletzt erzeugten Report** — nicht zwingend den für dein Zielprojekt.
> Bei Solution-weiten Repos liefert es oft einen veralteten, solution-weiten Bericht (tausende Zeilen, Grade F),
> der das Zielprojekt verzerrt oder gar nicht enthält.
> **Stattdessen: gezielten Test-Run + direktes Lesen der Cobertura-XML** (siehe Rezept unten).

```
analyze_coverage(projectPath: "<Testprojekt-Pfad>", type: "dotnet")
```
→ Meldet `"No coverage report found"` oder `lineCoverage: 0` ohne vorherigen Test-Run?  
**Dann automatisch Coverage-Run via dev-mcp** (siehe Coverage Auto-Run unten), danach erneut `analyze_coverage`.

**Schritt 4** — Gesamtbild Coverage + Qualität:
```
analyze_test_health(projectPath: "<Testprojekt-Pfad>", type: "dotnet")
```
→ Meldet `"No coverage report found"` oder Coverage `[F]` mit 0%?  
**Dann automatisch Coverage-Run via dev-mcp** (siehe Coverage Auto-Run unten), danach erneut `analyze_test_health`.

**Schritt 5** — Duplikate nach Feature-Freeze finden:
```
analyze_duplicates(projectPath: "...", type: "...")
```

**Schritt 6** — Finaler Review mit vollem Projektkontext vor dem Merge:
```
review_with_index(filePath: "...", projectPath: "...", type: "...")
```
oder für alle Feature-Dateien auf einmal:
```
review_files_batch(filePaths: [...])
```

**Schritt 7** — Vollständiger Projekt-Gesundheitsbericht (Sprint-End / Release):
```
analyze_advanced_all(projectPath: "...", type: "...")
```

**Ausgabe Nach-Implementierung:**
1. Test-Gesundheit: Score + die kritischsten Test-Probleme
2. Coverage: Grade A–F + welche Methoden gar nicht getestet sind
3. Code-Qualität: Duplikate und offene Review-Findings
4. Empfehlung: Was muss noch vor dem Merge behoben werden?

---

## Buddy-Agent — Phasen-Ausnahme

Wenn **buddy-agent** aktiv ist und die aktuelle Phase **intake**, **compress**, **diskussion** oder **plan-prompt** ist, diesen Skill **nicht** anwenden:

- Kein `index_project`, kein `find_in_index`, kein Grep als Ersatz
- Erkenntnisbedarf in intake/compress → `## Repo-Fragen` notieren
- Nur in **repo-check** gilt dieser Skill normal (MCP aktiv)

Phasen-State erkennbar an der Statuszeile `Phase: intake | compress | …` in Buddy-Antworten.

---

## Validierungs- & Contract-Reviews

### focusArea: `api-validation`

Verwende `focusAreas: ["api-validation"]` bei `review_file`, `review_files_batch` oder `review_code` für .NET-Dateien wenn du prüfen willst ob:
- Controller-Endpunkte (POST/PUT/PATCH) DTOs mit DataAnnotations erwarten
- DTOs/Records Properties ohne `[Required]`, `[StringLength]`, `[MaxLength]` etc. haben

**Beispiel-Aufruf:**
```json
{
  "tool": "review_files_batch",
  "filePaths": ["C:\\Develop\\MyProject\\src\\Controllers\\ExperimentController.cs", "C:\\Develop\\MyProject\\src\\DTOs\\CreateExperimentRequest.cs"],
  "focusAreas": ["api-validation"]
}
```

### Tool: `compare_validation_rules`

Vergleicht Angular Reactive Form Validators mit .NET DTO DataAnnotations und liefert eine **Delta-Matrix**.

**Parameter:**
- `angularFormFile` — Pfad zur Angular-Komponente/Formular-Datei (`.ts`)
- `dotnetDtoFile` — Pfad zur .NET DTO/Request-Klasse (`.cs`)

**Status-Werte:**
| Status | Bedeutung |
|--------|-----------|
| ✅ ok | Beide Seiten haben identische Constraints |
| ⚠️ missing-be | FE erzwingt Validierung, BE hat keine DataAnnotation |
| ⚠️ missing-fe | BE hat Annotation, FE hat keinen Validator |
| ❌ conflict | Beide haben Constraints, aber unterschiedliche Werte |

### Tool: `find_api_callers`

Scannt eine Angular `.ts`-Datei nach allen HttpClient-Aufrufen.

**Parameter:**
- `filePath` — Pfad zur Angular-Service/Component-Datei
- `endpointPattern` (optional) — Filter-String für URL-Pattern

**Output:** Markdown-Tabelle mit Klasse, Methode, HTTP-Verb, URL-Pattern, Zeilennummer + Raw JSON

### Compact-Format für große Batch-Reviews

Alle Review-Tools unterstützen `format: "compact"` (Default: `"full"`):
- **`"full"`** — vollständiges Output inkl. `## Raw AST` JSON-Block
- **`"compact"`** — kein Raw AST, Properties als 1-Zeilen-Summary; reduziert Output von ~90 KB auf ~5 KB

Bei `review_files_batch` mit `format: "compact"` wird zusätzlich eine **Endpoint-Inventar-Tabelle** an den Anfang gestellt — ideal für Planungs-Inventare mit 5–20 Dateien.

---

## Coverage gezielt — nur für ein Projekt (bevorzugter Weg)

`analyze_coverage` liest den zuletzt vorhandenen Report — bei Multi-Projekt-Solutions ist das oft ein veralteter solution-weiter Bericht. **Gezielter Weg:**

### .NET — gezielter Test-Run + direktes XML-Lesen

```
// 1. Nur das Testprojekt laufen lassen (kein solution-weiter Run)
test_dotnet_solution(
  path: "C:\Develop\MyProject\tests\MyLib.Tests.Unit\MyLib.Tests.Unit.csproj",
  options: "--collect:\"XPlat Code Coverage\" --results-directory ./TestResults"
)

// 2. Cobertura-XML direkt lesen — Pfad aus TestResults/<guid>/coverage.cobertura.xml
// Glob nach der frischen XML-Datei:
find_file(
  directory: "C:\Develop\MyProject\tests\MyLib.Tests.Unit\TestResults",
  pattern: "coverage.cobertura.xml"
)
// Dann: Read auf den gefundenen Pfad — kompakter, projektzentriert, kein solution-Rauschen
```

**Wann `analyze_coverage` dennoch nutzen:**
- Als schnelle Orientierung wenn du weißt dass ein frischer projektspezifischer Report existiert
- Immer den **Testprojekt-Pfad** übergeben — niemals den Solution-Root

**Doppelte Klasseneinträge im Cobertura-XML:** Compiler-generierte State-Machines (async/await) erzeugen mehrere Einträge pro Klasse. Beim manuellen Lesen: Einträge mit `<Klasse>d__<Zahl>` im Namen ignorieren — sie gehören zur gleichen Source-Klasse.

---

## Coverage Auto-Run

Wenn `analyze_coverage` oder `analyze_test_health` meldet:
- `"No coverage report found"`, oder
- `lineCoverage: 0` / Coverage-Grade `[F]` mit 0%

**→ Zuerst Tests mit Coverage über dev-mcp ausführen, dann Analyse wiederholen.**

### .NET

```
// dev-mcp: test_dotnet_solution mit Coverage-Flags
test_dotnet_solution(
  path: "<Windows-Absolutpfad zur .sln oder zum Testprojekt>",
  options: "--collect:\"XPlat Code Coverage\" --results-directory ./TestResults"
)
```

Nach erfolgreichem Run:
```
analyze_coverage(projectPath: "<Testprojekt-Pfad>", type: "dotnet")
// oder:
analyze_test_health(projectPath: "<Testprojekt-Pfad>", type: "dotnet")
```

### Angular

```
// dev-mcp: test_angular_project mit Coverage-Flag
test_angular_project(
  project_root: "<Windows-Absolutpfad>",
  options: "--code-coverage"
)
```

Nach erfolgreichem Run:
```
analyze_coverage(projectPath: "<Angular-Projektpfad>", type: "angular")
```

**Regeln:**
- Nie mehr als **einen** Coverage-Run pro Analyse-Session triggern
- Schlägt der Test-Run fehl → Fehler dem User melden, nicht neu versuchen
- Opt-out: `kein auto-coverage-run`

---

## BoyScoutRule — Post-Implementation

Nach jeder abgeschlossenen Implementierung — **ein** MCP-Call statt fünf Einzelchecks:

**Tool:** `suggest_boyscout_actions`

**Parameter:**
- `filePaths` — alle geänderten Quelldateien (`.ts` / `.cs`)
- `type` — `"angular"` | `"dotnet"` | `"auto"` (Default `auto`)
- `maxPerFile` — Max. priorisierte Findings pro Datei (Default `5`)

**Ablauf intern:** Compiler-Gate (`analyze_compiler_diagnostics`) zuerst → bei Errors nur `critical`-Compiler-Findings → sonst Nullability, Dead Code, Complexity (CC≥10), ungetestete public API, Extraktionskandidaten.

**Output:** Kompakte Markdown-Liste pro Datei (`critical` → `warning` → `suggestion`).

**Opt-out:** `kein boyscout`, `skip boyscout`

---

## Boy-Scout-Rule: Aufrufstellen vor Änderung (`find_symbol_references`)

Wenn eine **public** Methode/Property/Funktion geändert werden soll: `find_symbol_references` nachschalten.

**Parameter:**
- `projectPath` — Projekt-Wurzel (Windows-Absolutpfad `C:\...`)
- `symbolName` — Name des Symbols
- `type` — `"angular"` | `"dotnet"` | `"auto"` (Default `auto`)
- `filePath` (optional) — verankert die Deklaration

**Output:** Markdown-Tabelle `| File | Line | Method | Snippet |` + Raw JSON (bis 500 Einträge). Cap-Warnung bei >400 Dateien.

---

## Boy-Scout-Rule: God-Class-Wachstum (`detect_god_classes`)

Nach Implementierung eines Slices: `detect_god_classes(projectPath, top: 3)` aufrufen. Wenn eine **neu erstellte oder stark erweiterte Klasse** in den Top-3 erscheint → als **`warning`** ausgeben und `suggest_class_splits` empfehlen.

---

## Angular — Präsentationskomponenten & indirekte Abdeckung

`detect_untested_public_api` erkennt nur direkte Spec-Imports (Klasse erscheint in einer `import`-Anweisung einer Spec). Bei **dumb/presentational Components**, die ausschließlich in Eltern-Templates vorkommen (z. B. `<app-atlas-action-btn>`), greift diese Logik nicht — die Klasse wird nie direkt importiert.

**Dreistufige Abdeckungseinschätzung:**

| Stufe | Bedeutung | Erkennung |
|-------|-----------|-----------|
| **A — Dediziert** | Eigene `.spec.ts` importiert die Klasse und referenziert Symbole/DOM | `detect_untested_public_api` → kein Finding |
| **B — Indirekt gerendert** | Eltern-Spec rendert die Komponente (Import-Kette + Template), aber keine gezielten Assertions | `rendered_not_asserted` Reason-Code (MCP v2.7+) **oder** manuell (Rezept unten) |
| **C — Ungetestet** | Weder eigene noch indirekte Spec-Referenz | `no_test_file` Reason-Code |

> ⚠️ **`no_test_file` ≠ 0 % Abdeckung.** Wenn eine Präsentationskomponente nur in Eltern-Templates verwendet wird, ist Stufe B möglich — obwohl der MCP `no_test_file` meldet. Immer manuell nachprüfen (Rezept unten), bevor ein Befund als „komplett ungetestet" bewertet wird.

> ⚠️ **Stufe B ist keine echte Abdeckung.** Mitgerendert ≠ verhalten getestet. In Coverage-Zahlen (`ng test --code-coverage`) kann Stufe B auftauchen ohne jede Assertion auf Selector, Inputs, Outputs oder DOM.

### Rezept: Testabdeckung einer Angular-Komponente prüfen

**Schnellpfad — ein einziger MCP-Call:**

```
analyze_component_test_coverage(
  componentPath: "C:\...\atlas-action-btn.component.ts"
)
```

Liefert: Stufe A/B/C, Konsumenten-Tabelle, Eltern-Spec-Matrix (rendert/assertiert), Template-Szenarien.
**Ersetzt die bisherige 4-Schritt-Reihenfolge** in den meisten Fällen.

**Manuelle Fallback-Reihenfolge** (wenn `analyze_component_test_coverage` keinen Treffer liefert oder der Kontext es erfordert):

```
// 1. Heuristische Basis
detect_untested_public_api(
  path: "C:\...\atlas-action-btn.component.ts",
  type: "angular",
  depth: "file"
)
// → rendered_not_asserted (Stufe B) / rendered_and_asserted (Stufe A via Parent) /
//    no_test_file (Stufe C) / no_reference_found

// 2. Konsumenten + Spec-Referenzen
find_symbol_references(
  projectPath: "C:\...\src",
  symbolName: "AtlasActionBtnComponent",
  type: "angular",
  includeTestFiles: true        // Specs mit direktem Import separat ausgeben
)

// 3. Nur wenn Schritt 1+2 keinen Treffer: Selector-Grep
//    Grep: "app-atlas-action-btn" in **/*.spec.ts

// 4. Eltern-Specs lesen: TestBed.imports + Template + detectChanges + Assertions
```

**Coverage-Zahl nur nach echtem Test-Run:**
```
test_angular_project(project_root: "C:\...", options: "--code-coverage")
analyze_coverage(projectPath: "C:\...", type: "angular")
```
Hinweis: Stufe B kann in Coverage-Zahlen auftauchen, ohne Verhalten zu testen.

### Entscheidungsbaum: wann reicht ein MCP-Call?

```
analyze_component_test_coverage  ← Normalfall (Präsentationskomponenten, schnell)
    ↓ kein Treffer oder unklarer Parent
detect_untested_public_api (depth=file)
    ↓ rendered_not_asserted mit indirectSpecs-Hinweis
find_symbol_references (includeTestFiles=true)
    ↓ keine Spec-Imports sichtbar
Grep Selector in *.spec.ts  ← Pflicht wenn Child nur über Parent-Template gerendert
    ↓ Eltern-Spec gefunden
Eltern-Spec lesen (TestBed.imports + detectChanges + Assertions)
```

**Wenn manuelles Grep Pflicht ist:** Child-Komponente wird ausschließlich über die Parent-Template eingebunden und die Parent-Spec importiert den Parent ohne die Child-Klasse direkt zu erwähnen. Das ist der Blindspot der Import-Heuristik.

### Ausgabeformat „nur Abdeckung prüfen"

Wenn der User explizit nur die Abdeckung einer Komponente wissen will (kein Plan, keine Änderung):

```
## Testabdeckung: <KomponentenName>

**Dedizierte Tests:** ja / nein

**Indirekte Abdeckung:**
| Eltern-Spec | rendert? | assertiert? |
|-------------|----------|-------------|
| search-result-row-actions.spec.ts | ✅ ja | ❌ nein |

**Ungetestete Template-Szenarien:**
- [ ] @if badge sichtbar (badge > 0)
- [ ] [disabled] Zustand
- [ ] (click) Event ausgelöst
- [ ] [class.active] Klasse gesetzt

**Fazit:** <ein Satz — Stufe A/B/C + konkreter Handlungsbedarf>
```

---

## Known MCP limitations

| Thema | Verhalten | Workaround |
|-------|-----------|------------|
| `index_solution` auf manche `.sln` | `No projects found in solution` | Mehrere `index_project`; Routing in mcp-project-paths.md |
| Angular Guards | Oft **nicht** im Angular-Index | `find_by_content` / Grep auf `*.guard.ts` |
| `index_project` auf Verzeichnis mit `.sln` | Hinweis „use index_solution" | mcp-project-paths.md prüfen — bei `disabled` direkt `.csproj` indexieren |
| **`detect_untested_public_api` / `analyze_test_quality` auf .NET-Produktionsprojekt mit separatem Testprojekt** | `depth=project` findet keine Testdateien → alles `no_test_file`; `analyze_test_quality` meldet 0 Tests | Siehe Rezept unten |
| **`analyze_coverage` ohne vorherigen Test-Run** | Immer 0% — kein `coverage.cobertura.xml` vorhanden | **Auto-Run via dev-mcp** (siehe Coverage Auto-Run) |
| **`analyze_coverage` in Multi-Projekt-Solution** | Liest solution-weiten Stale-Report (tausende Zeilen, Grade F) — Zielprojekt verzerrt | Gezielten Test-Run auf Testprojekt-`.csproj` + Cobertura-XML direkt lesen (siehe Rezept oben) |
| **`detect_untested_public_api` bei Angular-Präsentationskomponenten** | Meldet `no_test_file` wenn keine Spec die Klasse direkt importiert. Transitive Erkennung (Parent-TestBed-Kette) funktioniert ab v2.8 — aber nur wenn die Spec die Parent-Klasse per TS-Import einbindet; rein template-basierte Einbindung ohne TS-Import kann nicht erkannt werden | `analyze_component_test_coverage` (vollständig) oder Grep Selector + Eltern-Spec lesen |
| **`analyze_component_test_coverage` — Child ohne TS-Import in Spec** | Wenn eine Spec den Parent über `imports: [ParentComponent]` in TestBed verwendet, aber ParentComponent selbst nicht in einer TS-`import`-Zeile steht (z.B. lazily loaded), kann der transitive Pfad fehlen | Selector-Grep + Eltern-Spec manuell lesen |
| **`detect_untested_public_api` bei Controllern** | Integration-/HTTP-Tests werden nicht erkannt → Controller-Methoden als `no_reference_found` gemeldet obwohl getestet | Findings für Controller-Klassen manuell verifizieren ob Integrationstestprojekt existiert |

Details: [references/op-code-map.md](references/op-code-map.md) (Index-Abdeckung, Hard Gate).

### Rezept: Separate .NET-Testprojekte (z.B. `tests/LAC.Tests.Unit.*`)

Repo-Muster: Produktionsprojekt und Testprojekt liegen in getrennten `.csproj`-Verzeichnissen.

```
MyLib/                              ← Produktionsprojekt (.csproj hier)
tests/MyLib.Tests.Unit/             ← Testprojekt (.csproj hier)
MyLib.sln                           ← Solution-Root
```

**Robuste Reihenfolge:**

```
// 1. Beide Projekte indexieren
index_project(projectPath: "C:\Develop\MyProject\MyLib", type: "dotnet")
index_project(projectPath: "C:\Develop\MyProject\tests\MyLib.Tests.Unit", type: "dotnet")

// 2. Test-Qualität: Testprojekt-Pfad übergeben
analyze_test_quality(projectPath: "C:\Develop\MyProject\tests\MyLib.Tests.Unit", type: "dotnet")
analyze_test_health(projectPath: "C:\Develop\MyProject\tests\MyLib.Tests.Unit", type: "dotnet")

// 3. Ungetestete API: depth=file auf konkrete Quelldateien ODER
//    depth=project auf das Produktionsprojekt (MCP sucht ab .sln-Root nach Testdateien)
detect_untested_public_api(path: "C:\Develop\MyProject\MyLib\Services\MyService.cs", type: "dotnet", depth: "file")
// alternativ:
detect_untested_public_api(path: "C:\Develop\MyProject\MyLib", type: "dotnet", depth: "project")

// 4. Coverage: erst dotnet test laufen lassen, dann:
analyze_coverage(projectPath: "C:\Develop\MyProject\tests\MyLib.Tests.Unit", type: "dotnet")
```

**Nie:** `analyze_test_health` / `analyze_test_quality` auf den Produktionsprojekt-Pfad — dort gibt es keine Testdateien.

---

## Operationen

| Trigger | Operation | Referenz |
|---------|-----------|----------|
| Tool-Liste, welches Tool, 43 Tools | Alle verfügbaren Tools | [references/op-tool-overview.md](references/op-tool-overview.md) |
| Code-Landkarte, Symbol suchen, Recherche-Reihenfolge | Code-Landkarte & Recherche-Reihenfolge | [references/op-code-map.md](references/op-code-map.md) |
| Planung, Implementierung, Merge, Review-Phase | Die drei Review-Phasen | [references/op-phasen.md](references/op-phasen.md) |
| Validierung, API-Contract, DTO, FE↔BE-Abgleich | Validierungs- & Contract-Reviews | Abschnitt oben |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

---

## Composite Tools — Token-sparende Ketten (NEU)

Mehrschrittiger Workflows können durch einen einzigen Composite-Call ersetzt werden:

| Szenario | Alt (mehrere Calls) | Neu (1 Call) |
|----------|---------------------|--------------|
| Symbol suchen (Index + Fallback) | index_project → find_in_index → find_by_content | `scout_symbol(query, projectPath, format: compact)` |
| Mehrere Repo-Fragen (Buddy Scout) | 3–5× scout_symbol | `scout_scope(questions[], format: scout_table)` |
| Post-Slice Review (Impl. Schritt 3) | compiler → boyscout → untested → refactoring | `analyze_slice_impact(changed_files[], format: compact)` |
| FE↔BE Vertrag | find_api_callers + manuell | `trace_api_contract(angular_service_path)` |
| Endpoint-Inventar (Planning) | review_files_batch full | `analyze_planning_inventory(file_paths[])` |

### scout_symbol — Format-Modi

| format | Inhalt | Typische Größe |
|--------|--------|----------------|
| `paths_only` | `[{name, filePath, line}]` | < 1 KB |
| `compact` | Name + Dateipfad + Zeile + 1-Zeiler-Summary + referencesCount | < 3 KB |
| `full` | Vollständige Signatur + Methoden-Liste | variabel |

Default: `compact`. Scout-Tabellen direkt aus `compact`-Output befüllbar.

### analyze_slice_impact — Reihenfolge

1. `analyze_compiler_diagnostics` (errors only) → bei Fehlern: restliche Schritte als `skipped`
2. `suggest_boyscout_actions` auf geänderte Produktionsdateien
3. `detect_untested_public_api` (depth: file) pro Produktionsdatei
4. `analyze_refactoring_safety` wenn public API geändert

Ein Call ersetzt 4+ separate MCP-Aufrufe in Implementation Schritt 3.

### index_status — Cache-Prüfung vor index_project

```
index_status()  →  { entries: [{ projectPath, type, indexedAt, expiresAt, symbolCount, stale }] }
```

Prüfe Cache-Status bevor du `index_project` erneut aufrufst — spart Indexierungszeit wenn stale=false.

### index_project Batch (projects[])

```
index_project(projects: ["C:\\...\\frontend", "C:\\...\\LAC.SearchService", "C:\\...\\LAC.Core"])
```

Indexiert mehrere Projekte in einem Call. Gibt Array von Status-Objekten zurück.

### Index-Disk-Persistence (REQ-F02)

Der Index-Registry (welche Projekte wann indexiert wurden) wird beim Indexieren automatisch auf Disk geschrieben:
`%LOCALAPPDATA%\codebase-analyzer\index-registry.json`

Nach MCP-Neustart: `index_status()` zeigt noch die letzten Index-Timestamps (stale=true nach 5min). Erneuter `index_project`-Call lädt den frischen Symbol-Index vom Disk-Cache falls die Datei noch jung genug ist.

> **Known Issue REQ-F04 (P3):** `index_solution` schlägt bei manchen `.sln`-Dateien mit "No projects found" fehl. Workaround: Mehrere `index_project`-Calls auf die einzelnen `.csproj`-Verzeichnisse.

---

## Recap nach Verwendung

**Recap-Block** nur wenn:
- Tool-Fehler, Limitationen oder unerwartetes Verhalten aufgetreten
- Expliziter Review-Auftrag (`codebase-analyzer recap`) oder mehrere MCP-Calls mit inhaltlichen Findings
- **Nicht** bei strategischen Fragen ohne Tool-Aufruf im selben Turn

**Kein Recap** bei:
- Einem einzelnen erfolgreichen MCP-Call mit Standard-Output
- Wenn der User explizit kein Recap will
- Reine Planung / Architektur-Diskussion ohne Tool-Aufruf

**Format bei vollem Recap:**

```
---
## codebase-analyzer Recap

### Was hat gut funktioniert
- …

### Was könnte besser sein / Verbesserungsvorschläge
- …

### Bewertung
MCP-Nutzbarkeit: X/5 | Tool-Qualität: X/5 | Pfad-/Konfig-Aufwand: X/5
---
```

**Regeln:**
- Fachlich und sachlich — keine Höflichkeitsfloskeln
- Konkret: Tool-Namen, genaue Fehlermeldungen, unerwartetes Verhalten
- Kurz: max. 10 Bullets gesamt; Fokus auf Auffälligkeiten

---

## Abgrenzung zu dev-mcp

| Aufgabe | Empfohlener MCP |
|---------|----------------|
| Eine Methode / eine Klasse lesen | dev-mcp |
| Datei nach Name oder Inhalt suchen | dev-mcp |
| Interface-Implementierungen finden | dev-mcp |
| Komplexität, Refactoring-Safety | codebase-analyzer |
| Symbol-Index über ganzen Stack | codebase-analyzer |
| Build-Output analysieren | codebase-analyzer / build-log-filter |
| Nullability, Duplikate, Coverage | codebase-analyzer |

**Faustregel: Lesen → dev-mcp (`C:\...`). Analysieren → codebase-analyzer (`C:\...`).**

---

## Immer

- Alltagssprache — Fachbegriffe nur wenn nötig, dann in einem Satz erklären
- Fixes immer als konkretes Codebeispiel zeigen, nicht nur beschreiben
- Kein Build nötig erwähnen wenn der User fragt ob er erst bauen muss
- Coverage-Tools immer mit dem Hinweis versehen dass zuerst ein Test-Run nötig ist

Weiterführende Dokumentation: `docs/mcp/codebase-analyzer.md`

## Opt-out

`kein codebase-analyzer` → Skill nicht laden.
