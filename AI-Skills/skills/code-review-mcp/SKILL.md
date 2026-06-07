---
name: code-review-mcp
description: >
  Aktiviere diesen Skill sobald der User über Code spricht — egal ob er plant,
  gerade schreibt oder fertig ist. Der MCP hat 25 Tools für Angular und .NET.
  Bei Code-Symbolen (Klasse, Methode, Property, Service, Route): zuerst
  index_project/find_in_index, Grep nur ergänzend. UI-Labels ohne Symbol:
  keine Landkarte. Trigger: Review, Analyse, Planung, Implementierung, Merge,
  index_project, find_in_index, Code-Landkarte, Validierung, API-Contract,
  compare_validation_rules, api-validation, DTO, DataAnnotations,
  find_api_callers, HTTP-Calls, format:compact.
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
| Tool-Liste, welches Tool, 25 Tools | Alle verfügbaren Tools (Übersicht & Parameter) | [references/op-tool-overview.md](references/op-tool-overview.md) |
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

## Opt-out

`kein code-review-mcp` → Skill nicht laden.
