---
name: code-review-mcp
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
disable-model-invocation: true
---

# Code-Review-MCP

## Voraussetzungen

- MCP `code-review-mcp` muss in `.cursor/mcp.json` konfiguriert sein (Docker-Image).
- **Volume-Mount ist Pflicht** für alle dateibasierten Tools: `-v ${workspaceFolder}:/workspace:ro`
  - Host-Workspace → `/workspace` im Container (read-only)
  - Kein `-w`-Flag setzen — MCP-Server läuft in `/app`, nicht im gemounteten Verzeichnis
- `projectPath` und `type` (`angular` | `dotnet` | `auto`) pro Aufruf angeben.
- Coverage-Tools (`analyze_coverage`, `analyze_test_health`) benötigen vorherigen Test-Run.

## Pfadregel (verbindlich)

Alle dateibezogenen Parameter (`filePath`, `filePaths`, `projectPath`) verwenden **Container-Pfade**:

| Format | Korrekt | Falsch |
|--------|---------|--------|
| `projectPath` | `/workspace/src/frontend` | `C:\Develop\...\frontend` |
| `filePath` | `/workspace/src/frontend/app/my.component.ts` | `src/frontend/app/my.component.ts` |

**Fehlerdiagnose:** `File not found: /app/...` oder `Path not found: /app/...` = falsches Pfadformat (Windows-Pfad oder IDE-relativer Pfad statt `/workspace/...`), nicht defekte MCP-Verbindung.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Tool-Liste, welches Tool, 31 Tools | Alle verfügbaren Tools (Übersicht & Parameter) | [references/op-tool-overview.md](references/op-tool-overview.md) |
| Code-Landkarte, Symbol suchen, index_project, find_in_index, Recherche-Reihenfolge | Code-Landkarte & verbindliche Recherche-Reihenfolge | [references/op-code-map.md](references/op-code-map.md) |
| Planung, Implementierung, Merge, Review-Phase, Sprint-End, Release | Die drei Review-Phasen (Planung / Implementierung / Nach-Implementierung) | [references/op-phasen.md](references/op-phasen.md) |
| Validierung, API-Contract, DTO, DataAnnotations, FE↔BE-Abgleich | Validierungs- & Contract-Reviews | Abschnitt unten |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Validierungs- & Contract-Reviews

### Neuer focusArea: `api-validation`

Verwende `focusAreas: ["api-validation"]` bei `review_file`, `review_files_batch` oder `review_code` für .NET-Dateien wenn du prüfen willst ob:
- Controller-Endpunkte (POST/PUT/PATCH) DTOs mit DataAnnotations erwarten
- DTOs/Records Properties ohne `[Required]`, `[StringLength]`, `[MaxLength]` etc. haben
- Die Anzahl unvalidierter Schreibendpunkte im Summary sichtbar ist

**Wichtig:** Ab v2.1 werden `record`-Typen (positional und explicit) vollständig analysiert inkl. aller Property-Annotations — zuvor wurden sie als `0 Klassen` gemeldet.

**Beispiel-Aufruf:**
```json
{
  "tool": "review_files_batch",
  "filePaths": ["/workspace/src/Controllers/ExperimentController.cs", "/workspace/src/DTOs/CreateExperimentRequest.cs"],
  "focusAreas": ["api-validation"]
}
```

**Was du im Output siehst:**
- `API Validation Issues`: pro Controller-Methode welche DTOs unvalidiert sind
- `Record/Class — Properties`: für jede DTO-Klasse welche Properties Annotations haben und welche nicht
- Summary-Finding: `„X POST/PUT/PATCH Endpoints, Y mit DTO-Parametern"`

### Neues Tool: `compare_validation_rules`

Vergleicht Angular Reactive Form Validators mit .NET DTO DataAnnotations und liefert eine **Delta-Matrix**.

**Parameter:**
- `angularFormFile` — Pfad zur Angular-Komponente/Formular-Datei (`.ts`)
- `dotnetDtoFile` — Pfad zur .NET DTO/Request-Klasse (`.cs`)

**Was erkannt wird (Angular):** `Validators.required`, `Validators.maxLength(n)`, `Validators.minLength(n)`, `Validators.email`, `Validators.pattern(...)`, `Validators.min(n)`, `Validators.max(n)` in `FormBuilder.group()` und `new FormControl()`

**Was erkannt wird (.NET):** `[Required]`, `[StringLength(n)]`, `[MaxLength(n)]`, `[MinLength(n)]`, `[Range(n,m)]`, `[RegularExpression(...)]`, `[EmailAddress]`, `[Phone]`, `[Url]`

**Status-Werte in der Matrix:**
| Status | Bedeutung |
|--------|-----------|
| ✅ ok | Beide Seiten haben identische Constraints |
| ⚠️ missing-be | FE erzwingt Validierung, BE hat keine DataAnnotation |
| ⚠️ missing-fe | BE hat Annotation, FE hat keinen Validator |
| ❌ conflict | Beide haben Constraints, aber unterschiedliche Werte (z.B. FE maxLength:50, BE maxLength:100) |

**Beispiel-Aufruf:**
```json
{
  "tool": "compare_validation_rules",
  "angularFormFile": "/workspace/src/frontend/experiments/experiment-form.component.ts",
  "dotnetDtoFile": "/workspace/src/backend/DTOs/CreateOrUpdateExperimentRequest.cs"
}
```

### Compact-Format für große Batch-Reviews

Alle Review-Tools (`review_file`, `review_code`, `review_git_diff`, `review_files_batch`) unterstützen ab v2.2 den Parameter `format: "compact"` (Default: `"full"`).

- **`"full"`** — vollständiges Output inkl. `## Raw AST` JSON-Block (für tiefe Analyse)
- **`"compact"`** — kein Raw AST, Properties als 1-Zeilen-Summary, API Validation Issues immer vollständig

**Bei `review_files_batch` mit `format: "compact"`** wird zusätzlich eine **Endpoint-Inventar-Tabelle** an den Anfang gestellt:
```
| Controller | Method | Verb | DTO Type | Validation |
| ExperimentController | Create | POST | CreateRequest | ⚠️ check |
```
→ Ideal für Planungs-Inventare mit 5–20 Dateien (reduziert Output von ~90 KB auf ~5 KB).

### Neues Tool: `find_api_callers`

Scannt eine Angular `.ts`-Datei nach allen HttpClient-Aufrufen und zeigt welche Klasse/Methode welchen Endpoint aufruft.

**Parameter:**
- `filePath` — Pfad zur Angular-Service/Component-Datei
- `endpointPattern` (optional) — Filter-String für URL-Pattern (z.B. `"experiments"`, `"search"`)

**Erkannte HTTP-Methoden:** GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

**Beispiel-Aufruf:**
```json
{
  "tool": "find_api_callers",
  "filePath": "/workspace/src/frontend/experiments/experiment.service.ts",
  "endpointPattern": "search"
}
```

**Output:** Markdown-Tabelle mit Klasse, Methode, HTTP-Verb, URL-Pattern, Zeilennummer + Raw JSON

### Workflow für API-Contract-Reviews

1. **Projektübersicht:** `index_project` (dotnet) → Controller-Landschaft, alle POST/PUT-Endpunkte identifizieren
2. **Validierungs-Findings:** `review_files_batch` mit `focusAreas: ["api-validation"]` und `format: "compact"` auf Controller + DTOs → Endpoint-Inventar + Issues ohne Output-Explosion
3. **FE-Zuordnung:** `find_api_callers` auf Angular-Services → welche Komponente ruft welchen Endpoint
4. **FE↔BE-Abgleich:** `compare_validation_rules` für jedes Formular/DTO-Paar → Delta-Matrix
5. **Optional:** `analyze_type_graph` um zu sehen ob Gateway-Controller nur Proxy ist (dann Validierung im eigentlichen Service prüfen)

**Hinweis zu `[FromQuery]`/`[FromRoute]`:** Ab v2.2 werden Parameter mit diesen Binding-Attributen nicht mehr als "unvalidated-parameter" gemeldet (kein false positive für POST-Endpunkte die nur Query-String-Parameter erwarten).

## BoyScoutRule — Post-Implementation (Orchestrator: `suggest_boyscout_actions`)

Nach jeder abgeschlossenen Implementierung (nach jedem Slice-Abschluss im [Implementation Workflow](../implementation-workflow/SKILL.md)) — **ein** MCP-Call statt fünf Einzelchecks:

**Tool:** `suggest_boyscout_actions`

**Parameter:**
- `filePaths` — alle geänderten Quelldateien (`.ts` / `.cs`)
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`)
- `maxPerFile` — Max. priorisierte Findings pro Datei (Default `5`)

**Ablauf intern:** Compiler-Gate (`analyze_compiler_diagnostics`) zuerst → bei Errors nur `critical`-Compiler-Findings, Rest übersprungen → sonst Nullability, Dead Code, Complexity (CC≥10), ungetestete public API, Extraktionskandidaten (CC≥10).

**Output:** Kompakte Markdown-Liste pro Datei (`critical` → `warning` → `suggestion`). Top-Findings direkt ausgeben — keine Schwelle nötig.

**Opt-out:** `kein boyscout`, `skip boyscout`

Einzel-Tools unten bleiben für gezielte Tiefe (Symbol-Referenzen, Vererbungs-Scope, God-Class-Scan).

## Boy-Scout-Rule (Nach-Implementierung): Compiler-Check zuerst (`analyze_compiler_diagnostics`)

Nach jeder abgeschlossenen Implementierung — **als allerersten** Nach-Implementierungs-Check `analyze_compiler_diagnostics` auf alle geänderten Dateien bzw. den Feature-Scope ausführen. Echter Compiler (Roslyn / TypeScript) — keine Heuristik.

**Tool:** `analyze_compiler_diagnostics`

**Parameter:**
- `path` — geänderte Datei oder Projekt-/Modul-Wurzel
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`)
- `severity` — `"error"` (Default) \| `"warning"` \| `"all"`

**Bei Compiler-Errors:** Ausgabe als **`critical`** markieren — **keine weiteren** BoyScout-Checks (`detect_untested_public_api`, `analyze_method_extraction_candidates` usw.) bis der Scope fehlerfrei kompiliert.

**Bei 0 Errors:** Weiter mit den übrigen BoyScout-Checks (ungetestete API, Extraktionskandidaten, …).

## Boy-Scout-Rule (Nach-Implementierung): ungetestete public API

Nach erfolgreichem Compiler-Check — bevor das Feature als „fertig" gilt — `detect_untested_public_api` ausführen (Heuristik, **kein** Test-Run). Es deckt neu hinzugekommene oder geänderte public-Symbole (Methoden, Properties, Get/Set-Accessoren) auf, für die keine Test-Referenz erkennbar ist.

**Tool:** `detect_untested_public_api`

**Parameter:**
- `path` — Datei (`depth: "file"`) oder Verzeichnis-Root (`depth: "project"`)
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`)
- `depth` — `"file"` (nur die übergebene Datei) \| `"project"` (Verzeichnis, mit Datei-Cap)

**`reason` ist stack-spezifisch:**
| reason | Angular | .NET |
|--------|---------|------|
| `no_test_file` | keine `*.spec.ts`/`*.test.ts` im gleichen oder einem übergeordneten Verzeichnis importiert die Klasse | keine zugeordnete Test-Datei für die Klasse |
| `no_reference_found` | Spec existiert, Symbol aber weder per Import noch als Call/String referenziert | Test-Datei existiert, Symbol aber nicht referenziert |

**Summary-Format (verbindlich):** Nach dem Lauf ein kompaktes Summary ausgeben — zuerst die Gesamtzahl fett, dann eine Zeile pro Fund:

```
**X ungetestete public API-Punkte**
- Datei:Zeile — symbol (reason)
- Datei:Zeile — symbol (reason)
```

Bei `0` Funden: „**0 ungetestete public API-Punkte** — alle neuen/geänderten public-Symbole haben eine erkennbare Test-Referenz." Bei vielen Funden auf die geänderten Dateien fokussieren.

**Einordnung:** Reiner statischer Proxy. Ersetzt **keinen** echten Coverage-Report (`analyze_coverage`) und keine Test-Qualitätsbewertung (`analyze_test_quality`) — er zeigt nur Lücken auf, die anschließend gezielt geschlossen oder mit echten Tests/Coverage verifiziert werden.

## Boy-Scout-Rule: Aufrufstellen vor Änderung (`find_symbol_references`)

Wenn beim Durchgehen oder Review einer Datei eine **public** Methode/Property/Funktion geändert oder umbenannt werden soll: `find_symbol_references` auf das Symbol nachschalten, um sofort **alle konkreten Aufrufstellen** (Datei/Zeile/umgebende Methode) zu sehen, die die Änderung zieht — statt nur die Zahl aus `analyze_refactoring_safety`. Detailstufe **nach** der Risikoabschätzung: dort der Score, hier die exakten Stellen.

**Tool:** `find_symbol_references`

**Parameter:**
- `projectPath` — Projekt-Wurzel (`/workspace/...`)
- `symbolName` — Name des Symbols (Methode, Funktion, Property, Klasse …)
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`)
- `filePath` (optional) — verankert die Deklaration und disambiguiert gleichnamige Symbole

**Output:** Markdown-Tabelle `| File | Line | Method | Snippet |` (gruppiert nach Datei, bis 50 Zeilen) + Raw JSON (bis 500 Einträge). Leere Treffermenge → Klartext-Hinweis. Angular via ts-morph, .NET via Roslyn-Compilation. Bei >400 Dateien greift der Datei-Cap und der Output erhält einen `⚠️ Datei-Limit (400) erreicht`-Hinweis.

**Beispiel-Aufruf:**
```json
{
  "tool": "find_symbol_references",
  "projectPath": "/workspace/src/frontend",
  "symbolName": "loadExperiments",
  "type": "angular",
  "filePath": "/workspace/src/frontend/experiments/experiment.service.ts"
}
```

**Beispiel-Output:**
```
# References to `loadExperiments` (angular)
**3 reference(s)** across 2 file(s)

| File | Line | Method | Snippet |
|------|------|--------|---------|
| `experiments/experiment-list.component.ts` | 42 | `ngOnInit` | this.service.loadExperiments(); |
| `experiments/experiment-list.component.ts` | 88 | `refresh` | this.service.loadExperiments(); |
| `experiments/experiment.facade.ts` | 17 | `init` | return this.service.loadExperiments(); |
```

> **Hinweis:** Der reale Output enthält zusätzlich zur Tabelle einen `## Raw JSON`-Block (bis 500 Einträge) mit den vollständigen Referenz-Objekten — für programmatische Weiterverarbeitung.

## Boy-Scout-Rule: Extract-Method-Hinweise nach Implementierung (`analyze_method_extraction_candidates`)

Nach Implementierung oder beim Anfassen einer Datei: auf **alle geänderten** `.ts`/`.cs`-Dateien `analyze_method_extraction_candidates` aufrufen. Liefert für lange/komplexe Methoden konkrete Extraktionskandidaten (Zeilenbereich, Parameter-Heuristik, Namensvorschlag) — direkt umsetzbarer Refactoring-Hinweis ohne separaten Review.

**Tool:** `analyze_method_extraction_candidates`

**Parameter:**
- `filePath` — einzelne Quelldatei (`/workspace/...`)
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`, erkennt an Endung)
- `thresholds` (optional) — `{ minLines?: number, minCC?: number }` (Defaults 20 / 8)

**Wann:** Post-Implementation auf geänderte Dateien; Scout-Hotspots bei CC≥10; Follow-up wenn `review_file` CC-Warnungen meldet.

## Boy-Scout-Rule: Vererbungs-Scope vor Interface-/Basisklassen-Änderung (`find_type_hierarchy`)

Wenn eine **Basisklasse** (insbesondere `abstract`) oder ein **Interface** geändert wird: `find_type_hierarchy` mit `direction: "down"` nachschalten, um sofort alle **Ableitungen und Implementierungen** als Scope-Liste zu sehen — statt den Gesamtgraphen via `analyze_type_graph` zu durchsuchen.

**Tool:** `find_type_hierarchy`

**Parameter:**
- `projectPath` — Projekt-Wurzel (`/workspace/...`)
- `typeName` — Klassen- oder Interface-Name
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`)
- `filePath` (optional) — verankert den Typ und disambiguiert gleichnamige Deklarationen
- `direction` — `"up"` (Basiskette) \| `"down"` (Ableitungen/Implementierungen) \| `"both"` (Default)

**Output:** Markdown-Abschnitte `## Up (base chain & interfaces)` / `## Down (derived & implementations)` mit Tabelle `| Name | Kind | File | Line |` + Raw JSON. Cap-Warnung bei >400 Dateien.

**Beispiel-Aufruf:**
```json
{
  "tool": "find_type_hierarchy",
  "projectPath": "/workspace/src/backend",
  "typeName": "IOrderService",
  "type": "dotnet",
  "direction": "down"
}
```

## Boy-Scout-Rule: God-Class-Wachstum nach Implementierung (`detect_god_classes`)

Nach Implementierung eines Slices: `detect_god_classes(projectPath, top: 3)` auf dem betroffenen Stack aufrufen. Wenn eine **neu erstellte oder stark erweiterte Klasse** in den Top-3 erscheint → als **`warning`** ausgeben und `suggest_class_splits` auf die betroffene Klasse empfehlen.

**Tool:** `detect_god_classes`

**Parameter:**
- `projectPath` — Projekt-Wurzel (`/workspace/...`)
- `type` — `"angular"` \| `"dotnet"` \| `"auto"` (Default `auto`)
- `top` — Anzahl der schlimmsten Kandidaten (Default `10`; Post-Implementation: `3`)

**Wann:** Nach Implementierung; Scout Phase 3 bei Scope > 3 Dateien (`top: 5`).

## Recap nach Verwendung (Pflicht)

Nach **jeder** Verwendung dieses Skills — egal wie klein oder groß — **muss** der Agent am Ende seiner Antwort einen kurzen Recap ausgeben. Dieser dient als Feedback für das Entwicklerteam des `code-review-mcp`-Umfelds (MCP-Server, Skills, Rules).

**Format (im Chat, kein Datei-Write):**

```
---
## code-review-mcp Recap

### Was hat gut funktioniert
- …

### Was könnte besser sein / Verbesserungsvorschläge
- …

### Bewertung
MCP-Nutzbarkeit: X/5 | Tool-Qualität: X/5 | Pfad-/Konfig-Aufwand: X/5
---
```

**Regeln:**
- **Fachlich und sachlich** — keine Höflichkeitsfloskeln, keine Lobpreisung.
- **Konkret:** Tool-Namen, genaue Fehlermeldungen, unerwartetes Verhalten, fehlende Features — direkte Hinweise für das Entwicklerteam.
- **Kurz:** max. 10 Bullets gesamt; Fokus auf Auffälligkeiten, nicht auf Selbstverständliches.
- **Immer ausgeben** — auch wenn alles reibungslos lief (dann kurz „keine Auffälligkeiten" + Bestätigung).

## Abgrenzung zu dev-filesystem-mcp

| Aufgabe | Empfohlener MCP |
|---------|----------------|
| Eine Methode / eine Klasse lesen | dev-filesystem-mcp |
| Datei nach Name oder Inhalt suchen | dev-filesystem-mcp |
| Interface-Implementierungen finden | dev-filesystem-mcp |
| Komplexität, Refactoring-Safety | code-review-mcp |
| Symbol-Index über ganzen Stack | code-review-mcp |
| Build-Output analysieren | code-review-mcp / genericRTK |
| Nullability, Duplikate, Coverage | code-review-mcp |

**Faustregel: Lesen → dev-filesystem-mcp (`/project`). Analysieren → code-review-mcp (`/workspace`).**

## Opt-out

`kein code-review-mcp` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
