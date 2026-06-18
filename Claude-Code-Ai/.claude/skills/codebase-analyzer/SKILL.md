---
name: codebase-analyzer
description: >
  Aktiviere diesen Skill sobald der User über Code spricht — egal ob er plant,
  gerade schreibt oder fertig ist. Der MCP hat 31 Tools für Angular und .NET.
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

- Alle codebase-analyzer-Pfade mit `/workspace/` Prefix
- dev-filesystem-mcp nutzt `/project/` Prefix
- **VERBOTEN:** `C:\`, Windows-Pfade, relative Pfade, `{parameter}`-Platzhalter als MCP-Argument
- `Path not found: /app/...` oder `File not found: /app/...` = Pfadformat-Fehler, kein Retry — Format korrigieren

| MCP | Parameter-Präfix | Beispiel |
|-----|------------------|----------|
| codebase-analyzer | `/workspace/` | `/workspace/src/frontend` |
| dev-mcp | Windows-Absolutpfad | `C:\Develop\MyProject\src\backend` |

**Quelle für konkrete Container-Pfade:** `mcp-project-paths.md` (deployed in target project as `.cursor/references/mcp-project-paths.md`)
- Host-Pfade aus `skill-params.json` **nicht** unverändert an MCP übergeben
- `./AGENTS.md` optional — bei Widerspruch gilt mcp-project-paths.md

**Backend Multi-.csproj:**
- Primär: mehrere `index_project` auf `.csproj`-Verzeichnisse (Routing-Tabelle in mcp-project-paths.md)
- `index_solution`: nur wenn mcp-project-paths.md `index_solution: allowed` — sonst Known Issue

**VERBOTEN als MCP-Argument:** Windows-Pfade, Pfade ohne `/workspace/` (codebase-analyzer), `{frontend-path}`, `{backend-path}`.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## MCP codebase-analyzer — Server und Tools

**Server:** `codebase-analyzer` (Docker, Port 8090)
**Volume-Mount:** `-v ${workspaceFolder}:/workspace:ro` (read-only)
**Kein** `-w`-Flag setzen — MCP-Server läuft in `/app`, nicht im gemounteten Verzeichnis.

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
| `index_project` | Projekt indexieren |
| `index_solution` | .NET Solution indexieren |
| `find_in_index` | Symbol im Index suchen |
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
| `detect_untested_public_api` | Ungetestete public API (Heuristik) |
| `analyze_test_health` | Gesamtbild Coverage + Qualität |
| `suggest_boyscout_actions` | Boy-Scout-Checks gebündelt |
| `analyze_compiler_diagnostics` | Compiler-Check (Roslyn / TypeScript) |

---

## PLANUNG — Vorgehen

**Symbol-Bezug (Klasse, Methode, Property, Service, Route):** Grep nicht zuerst — zuerst `index_project` auf dem **richtigen** MCP-`projectPath`, dann `find_in_index`. Grep nur für Caller, String-Literale, Routes.
**Kein Index** bei reinem UI-Wortschatz (Button-Label, sichtbares Feld) ohne genanntes Symbol.

Vollständige Recherche-Reihenfolge: [references/op-code-map.md](references/op-code-map.md)

**Schritt 1** — Immer zuerst. MCP-Parameter: **Container-Pfade** mit `/workspace/` — Literale aus **mcp-project-paths.md**.

```
// Angular FE:
index_project(projectPath: "<Literal aus mcp-project-paths.md>", type: "angular")
// .NET — Routing-Tabelle in mcp-project-paths.md:
index_project(projectPath: "<mcp-be-* oder mcp-backend-path>", type: "dotnet")
// Multi-.csproj: mehrere index_project — index_solution nur wenn mcp-project-paths index_solution: allowed
```

Zeige kompakt: was gibt es, was sind die größten Abhängigkeiten, gibt es Warnungen?

**Schritt 2** — Bei konkreter Klasse/Service:
```
find_in_index(projectPath: "/workspace/src/frontend", type: "angular", query: "<Name>")
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
analyze_compiler_diagnostics(path: "/workspace/.../my.service.ts", type: "auto", severity: "error")
// bzw. Projekt-/Modul-Wurzel (MCP container path):
analyze_compiler_diagnostics(path: "/workspace/src/backend/<projekt>", type: "auto", severity: "error")
```
Bei Compiler-Errors: **`critical`** — keine weiteren Nach-Implementierungs-Checks bis clean.

**Schritt 1** — Ungetestete public API aufdecken (Heuristik, kein Test-Run):
```
// FE-Einzeldatei direkt nach der Implementierung:
detect_untested_public_api(path: "/workspace/.../my.service.ts", type: "auto", depth: "file")
// .NET bzw. ganzes Feature/Modul: .csproj-Verzeichnis (MCP container path):
detect_untested_public_api(path: "/workspace/src/backend/<projekt>", type: "auto", depth: "project")
```

**Schritt 2** — Test-Qualität prüfen (kein Test-Run nötig):
```
analyze_test_quality(projectPath: "...", type: "...")
```

**Schritt 3** — Coverage auswerten (nur wenn Test-Run bereits gelaufen):
```
analyze_coverage(projectPath: "...", type: "...")
```
Erst ausführen nach: `ng test --code-coverage` oder `dotnet test --collect:"XPlat Code Coverage"`

**Schritt 4** — Gesamtbild Coverage + Qualität:
```
analyze_test_health(projectPath: "...", type: "...")
```

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
  "filePaths": ["/workspace/src/Controllers/ExperimentController.cs", "/workspace/src/DTOs/CreateExperimentRequest.cs"],
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
- `projectPath` — Projekt-Wurzel (`/workspace/...`)
- `symbolName` — Name des Symbols
- `type` — `"angular"` | `"dotnet"` | `"auto"` (Default `auto`)
- `filePath` (optional) — verankert die Deklaration

**Output:** Markdown-Tabelle `| File | Line | Method | Snippet |` + Raw JSON (bis 500 Einträge). Cap-Warnung bei >400 Dateien.

---

## Boy-Scout-Rule: God-Class-Wachstum (`detect_god_classes`)

Nach Implementierung eines Slices: `detect_god_classes(projectPath, top: 3)` aufrufen. Wenn eine **neu erstellte oder stark erweiterte Klasse** in den Top-3 erscheint → als **`warning`** ausgeben und `suggest_class_splits` empfehlen.

---

## Known MCP limitations

| Thema | Verhalten | Workaround |
|-------|-----------|------------|
| `index_solution` auf manche `.sln` | `No projects found in solution` | Mehrere `index_project`; Routing in mcp-project-paths.md |
| Angular Guards | Oft **nicht** im Angular-Index | `find_by_content` / Grep auf `*.guard.ts` |
| `index_project` auf Verzeichnis mit `.sln` | Hinweis „use index_solution" | mcp-project-paths.md prüfen — bei `disabled` direkt `.csproj` indexieren |

Details: [references/op-code-map.md](references/op-code-map.md) (Index-Abdeckung, Hard Gate).

---

## Operationen

| Trigger | Operation | Referenz |
|---------|-----------|----------|
| Tool-Liste, welches Tool, 31 Tools | Alle verfügbaren Tools | [references/op-tool-overview.md](references/op-tool-overview.md) |
| Code-Landkarte, Symbol suchen, Recherche-Reihenfolge | Code-Landkarte & Recherche-Reihenfolge | [references/op-code-map.md](references/op-code-map.md) |
| Planung, Implementierung, Merge, Review-Phase | Die drei Review-Phasen | [references/op-phasen.md](references/op-phasen.md) |
| Validierung, API-Contract, DTO, FE↔BE-Abgleich | Validierungs- & Contract-Reviews | Abschnitt oben |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

---

## Recap nach Verwendung (Pflicht)

Nach **jeder** Verwendung dieses Skills — egal wie klein — **muss** der Agent am Ende seiner Antwort einen kurzen Recap ausgeben:

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

**Faustregel: Lesen → dev-mcp (`C:\...`). Analysieren → codebase-analyzer (`/workspace/...`).**

---

## Immer

- Alltagssprache — Fachbegriffe nur wenn nötig, dann in einem Satz erklären
- Fixes immer als konkretes Codebeispiel zeigen, nicht nur beschreiben
- Kein Build nötig erwähnen wenn der User fragt ob er erst bauen muss
- Coverage-Tools immer mit dem Hinweis versehen dass zuerst ein Test-Run nötig ist

Weiterführende Dokumentation: `docs/mcp/codebase-analyzer.md`

## Opt-out

`kein codebase-analyzer` → Skill nicht laden.
