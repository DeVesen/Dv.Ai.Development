---
name: dev-mcp
description: >
  Kanon für MCP dev-mcp: 39 Dev-Tools in einem stdio-Prozess —
  Filesystem (find_file, find_by_content, find_implementations, read_signatures_only, read_method, read_class_summary,
  read_file_raw, list_directory, find_test_pattern, read_lines, read_files_batch, read_component_bundle),
  Filesystem-Intelligence (find_angular_route, find_angular_guard, find_dotnet_endpoint, find_di_registration,
  read_related_files, update_imports, delete_file_safe),
  Git (git_changed_files, git_diff_summary),
  Patch/Write (apply_text_patch, replace_in_files, insert_member),
  Move/Rename (rename_file, rename_file_with_impact),
  .NET-Scaffolding (create_dotnet_solution, scaffold_dotnet_project, scaffold_dotnet_test_class, rename_file,
  create_directory_structure, build_dotnet_solution, test_dotnet_solution, scaffold_dto, scaffold_api_action),
  Angular (create_angular_project, scaffold_angular_component, scaffold_angular_service,
  scaffold_angular_directive, scaffold_spec_for, build_angular_project, test_angular_project),
  Utilities (slice_test_targets, read_related_files).
  Pfade: echte Windows-Absolutpfade (C:\...). Nicht für Index/Review/Metriken — codebase-analyzer.
when_to_use: >
  Aktiviere für: Dateien lesen/suchen (.cs/.ts), Angular oder .NET Scaffolding,
  ng build, ng test, dotnet build, dotnet test, Test anlegen (spec/Testklasse).
  build_dotnet_solution / test_dotnet_solution ersetzen Shell-dotnet-Kommandos vollständig.
  build_angular_project / test_angular_project ersetzen Shell-ng-Kommandos vollständig.
  Pfade immer als echte Windows-Absolutpfade (C:\Develop\...) — kein /project/, kein /workspace/.
  Bei MCP nicht erreichbar: BLOCKER melden, kein stiller Shell-Fallback.
  Nicht für Code-Review, Index, Metriken — codebase-analyzer.
---

## MCP-FIRST — Dateizugriff (Hard Gate)

**`Read`-, `Grep`- und `Glob`-Tool niemals verwenden** wenn dev-mcp verfügbar — auch nicht für "nur die erste Zeile", kleine Schnellzugriffe oder Nicht-Code-Dateien.

| Verboten | Richtig |
|----------|---------|
| `Read`-Tool auf beliebige Dateien | `read_file_raw` (dev-mcp) — für alle Dateitypen |
| `Read`-Tool auf `.cs`/`.ts` | `read_signatures_only` / `read_method` / `read_class_summary` (dev-mcp) |
| `Grep`-Tool für Symbole/Implementierungen | `find_by_content` / `find_implementations` (dev-mcp) |
| `Glob`-Tool für Dateimuster | `find_file` (dev-mcp) |
| `Bash ls` für Verzeichnisinhalt | `list_directory` (dev-mcp) |

> **Begründung:** dev-mcp hält alle Zugriffe in der MCP-Kette, erzwingt AllowedDirectories-Prüfung und liefert strukturierte Ausgabe. Native Tools (Read/Grep/Glob/Bash) umgehen diese Kette stillschweigend.

**Ausnahme:** Nur wenn dev-mcp nicht erreichbar → BLOCKER melden (siehe unten), nie stillschweigend auf native Tools ausweichen.

---

## MCP-FIRST — Build/Test (Hard Gate)

**`dotnet build` / `dotnet test` / `ng build` / `ng test` niemals als Shell-Kommando** wenn dev-mcp verfügbar.

| Verboten | Richtig |
|----------|---------|
| Shell: `dotnet build` | `build_dotnet_solution` (dev-mcp) |
| Shell: `dotnet test` | `test_dotnet_solution` (dev-mcp) |
| Shell: `ng build` | `build_angular_project` (dev-mcp) |
| Shell: `ng test` | `test_angular_project` (dev-mcp) |
| `build-log-filter` für MCP-gesteuerte Läufe | MCPs filtern intern — `errors[]` direkt auswerten |

**Hard Stop — MCP nicht erreichbar:**

> **`BLOCKER: dev-mcp nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Nutzer informieren (MCP aktiv? Exe unter `C:\Develop\.apps\dev-mcp\`?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Pfad-Kanon (Pflicht)

- Alle Pfade als **echte Windows-Absolutpfade**: `C:\Develop\MyProject\`
- **VERBOTEN:** `/project/`, `/workspace/`, relative Pfade ohne Laufwerk, `{parameter}`-Platzhalter
- Zugriff nur auf Verzeichnisse in `AllowedDirectories` (`appsettings.json` des Dienstes)
- `Path not allowed` = Pfad außerhalb AllowedDirectories → Nutzer muss Verzeichnis freigeben
- `File not found` = Pfad prüfen, kein Retry mit demselben Format

**Keine Docker-Volumes, kein Container-Pfad-Mapping** — dev-mcp läuft nativ als stdio-Prozess.

---

## MCP dev-mcp — Server und Tools

**Server:** `dev-mcp` (stdio, `C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`)
**Log-Viewer:** `http://localhost:5050/` (Port via `LOG_VIEWER_PORT` konfigurierbar)
**Sicherheit:** AllowedDirectories in `C:\Develop\.apps\dev-mcp\appsettings.json`

### Filesystem Read-Tools (11 Tools)

| Tool | Zweck |
|------|-------|
| `find_file` | Glob unter `root` (max 100 Ergebnisse) |
| `find_by_content` | Regex pro Zeile; **NEU:** `format` (full/compact/paths_only), `group_by_file` |
| `find_implementations` | Interface-Implementierungen (.cs Roslyn / .ts Regex) |
| `read_signatures_only` | Public API ohne Bodies (.cs/.ts) |
| `read_method` | Eine Methode/Funktion nach `method_name` (.cs/.ts) |
| `read_class_summary` | Klassenstruktur ohne Bodies (.cs/.ts) |
| `read_file_raw` | Roher Dateiinhalt für alle Dateitypen, optional `line_start`/`line_end` (max 2000 Zeilen) |
| `read_lines` | **NEU P0** — Zeilen mit `start_line`, `end_line`, `context_lines` (max 500 Zeilen); token-sparend |
| `read_files_batch` | **NEU P0** — Bis 25 Dateien in einem Call; `mode`: signatures/class_summary/method; Output: `[{filePath, content}]` |
| `list_directory` | Verzeichnisinhalt mit `depth` (1–5, default 1, max 500 Einträge) |
| `find_test_pattern` | Muster-Spec/Testklasse in Feature-Nähe — snippet 40 Zeilen, max 3 Treffer |

### Filesystem Intelligence-Tools (7 NEU, P1)

| Tool | Zweck |
|------|-------|
| `read_component_bundle` | Angular-Bundle: .ts + .html + .spec in einem Call; `template_mode`: summary/full; `include_styles`, `include_spec` |
| `read_related_files` | Verwandte Dateien auto-auflösen: `relation`: test/template/styles/module/all |
| `find_angular_route` | Route-Pfad → Component + Guards; max 20 Treffer |
| `find_angular_guard` | Guard-Name → Datei + canActivate-Kette; max 20 Treffer |
| `find_dotnet_endpoint` | Controller/Action/Route-Template → Methode + DTO; max 20 Treffer |
| `find_di_registration` | Service/Interface → Program.cs/Startup-Registrierung |
| `update_imports` | TypeScript `import from` oder C# `using` Pfad aktualisieren |

### Git-Tools (2 NEU, P0/P1)

| Tool | Zweck |
|------|-------|
| `git_changed_files` | **NEU P0** — `base`: staged/unstaged/all/branch:<name>/commit:<sha> → `[{path, status}]` |
| `git_diff_summary` | **NEU P1** — Hunk-Überschriften + max 3 Kontext-Zeilen pro Hunk; kompakter Diff |

### Patch/Write-Tools (3 NEU, P0/P2)

| Tool | Zweck |
|------|-------|
| `apply_text_patch` | **NEU P0** — Zeilenbereich oder Anker-basiert; `dry_run`, `run_compiler_gate`, `rollback_on_error` |
| `replace_in_files` | **NEU P2** — Batch-Replace mit `dry_run` + `confirm`-Gate; Preview vor Schreiben |
| `insert_member` | **NEU P2** — Method/Property/Field einfügen; `position`: end_of_class/after_member; .cs + .ts |

### Move/Rename-Tools (2)

| Tool | Zweck |
|------|-------|
| `rename_file` | Datei umbenennen/verschieben (bestehend) |
| `rename_file_with_impact` | **NEU P0** — Preview (execute=false): Impact-Analyse; Execute (execute=true): umbenennen |

### Utilities (2 NEU, P0/P2)

| Tool | Zweck |
|------|-------|
| `slice_test_targets` | **NEU P0** — Aus geänderten Dateien Test-Globs (Angular) und Filter (dotnet) ableiten |
| `delete_file_safe` | **NEU P2** — Referenzen prüfen, `dry_run`, `force`-Gate |

### .NET-Tools (9 Tools)

| Tool | Zweck |
|------|-------|
| `create_dotnet_solution` | `dotnet new sln` |
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` |
| `scaffold_dotnet_test_class` | Einzelne Testklassen-Datei in bestehendem Test-.csproj anlegen |
| `create_directory_structure` | Verzeichnisse/Dateien aus `paths_json` |
| `build_dotnet_solution` | `dotnet build` → `{success, errors[], warnings[], summary}` |
| `test_dotnet_solution` | `dotnet test` → `{success, errors[], summary}`; **NEU:** `filter`, `test_project_path` |
| `scaffold_dto` | **NEU P2** — DTO/Record aus Projekt-Konventionen ableiten |
| `scaffold_api_action` | **NEU P2** — Controller-Action mit Route-Template |
| `rename_file` | Datei umbenennen/verschieben |

### Angular-Tools (8 Tools)

| Tool | Zweck |
|------|-------|
| `create_angular_project` | `ng new` — Default: `--standalone --skip-tests --routing --style=scss` |
| `scaffold_angular_component` | `ng generate component` — nextSteps[] nach Scaffold; `include_tests=true` lässt Spec zu |
| `scaffold_angular_service` | `ng generate service` — nextSteps[]; `include_tests=true` |
| `scaffold_angular_directive` | `ng generate directive` — nextSteps[]; `include_tests=true` |
| `scaffold_spec_for` | Spec für .ts oder .cs; Angular (TestBed) + .NET (xUnit/NUnit) |
| `build_angular_project` | `ng build` → `{success, errors[], warnings[], summary}` |
| `test_angular_project` | `ng test --watch=false`; **NEU:** `include_patterns[]`, `test_name_pattern` |

> **Neue Spec — wann welches Tool?**
> - Neue Komponente/Service anlegen **und** Spec: `include_tests=true` an `scaffold_angular_*`
> - Spec für **bestehende** `.ts`: `scaffold_spec_for`
> - Spec für bestehende `.cs`: `scaffold_spec_for`

---

## Token-Sparende Patterns (NEU)

| Situation | Alt | Neu |
|-----------|-----|-----|
| 10 Dateien Signaturen lesen | 10× `read_signatures_only` | `read_files_batch(paths, "signatures")` |
| Angular-Komponente verstehen | 3–4 separate Reads | `read_component_bundle(componentPath)` |
| Post-Impl Änderungen ermitteln | `git status` (Shell) | `git_changed_files(repo, "unstaged")` |
| Test-Targets ableiten | manuell | `slice_test_targets(changedFiles, "auto")` |
| Datei patchen | Agent-Edit | `apply_text_patch(file, oldText, newText, runCompilerGate: true)` |

---

## Workflow: Test anlegen (verbindlich)

**Vollständiges Read der Produktionsdatei ist verboten** wenn `read_*`-Tools reichen. Shell-`ng test`/`dotnet test` ohne BLOCKER ist verboten.

### Angular-Spec anlegen

```
1. read_signatures_only         → API der Ziel-.ts verstehen (kein vollständiges Read)
2. find_test_pattern            → kind: "angular-spec", reference_file_path: <Ziel-.ts>
                                  → liefert Vorbilder, keine Suche nach der eigenen Spec
3. Eigene Spec vorhanden?
   - Nein (find_file liefert keinen Treffer für <name>.spec.ts):
       scaffold_spec_for        → project_root, source_file_path
   - Spec existiert bereits:
       read_file_raw auf bestehende Spec → dann Agent-Edit (kein scaffold)
4. Agent-Edit                   → Testinhalt nach Muster aus Schritt 2 einfügen
5. test_angular_project         → alle Specs laufen; Einzeldatei-Filter ist Test-Runner-abhängig
                                  (Karma: kein zuverlässiger CLI-Filter; Jest: options "--testPathPattern=<Name>")
```

### .NET-Testklasse anlegen

```
1. read_signatures_only / read_class_summary → API der Ziel-.cs verstehen (kein vollständiges Read)
2. find_test_pattern            → kind: "dotnet-test", reference_file_path: <Ziel-.cs>
3. Eigene Testklasse vorhanden?
   - Nein (find_file liefert keinen Treffer für <ClassName>.cs im Testprojekt):
       scaffold_dotnet_test_class → test_project_path, class_name
   - Testklasse existiert bereits:
       read_file_raw auf bestehende Datei → dann Agent-Edit (kein scaffold)
4. Agent-Edit                   → Tests nach Muster aus Schritt 2 einfügen
5. test_dotnet_solution         → options: "--filter FullyQualifiedName~<ClassName>"
```

---

## JSON-Rückgabe — Scaffolding-Tools

Scaffolding-Tools (`scaffold_spec_for`, `scaffold_dotnet_test_class`) liefern ein anderes Schema als Build/Test-Tools:

| Tool-Typ | Rückgabe-Schema |
|----------|----------------|
| Scaffolding (neu) | `{ success, createdFiles[], error }` — `error` ist ein String (nullable) |
| Build/Test | `{ success, errors[], warnings[], summary }` — `errors[]` ist ein Array |

**Agent-Hinweis:** Bei Scaffolding-Tools auf `error` (String) prüfen, nicht auf `errors[]`.

---

## Parameter (verbindlich)

### Filesystem

| Parameter | Tool | Verwendung |
|-----------|------|------------|
| `root` | `find_file`, `find_by_content`, `find_implementations`, `find_test_pattern` | Suchwurzel: `C:\Develop\MyProject` |
| `file_path` | `read_*` | Absolute Datei: `C:\Develop\MyProject\src\UserService.cs` |
| `pattern` | `find_file`, `find_by_content` | Glob oder Regex |
| `file_glob` | `find_by_content` | Optional: `*.cs` |
| `interface_name` | `find_implementations` | z. B. `IOrderService` |
| `method_name` | `read_method` | Methoden-/Funktionsname |
| `class_name` | `read_method`, `read_class_summary` | Optional, zur Disambiguierung |
| `max_results` | Such-Tools | Default 20, max 100 |
| `kind` | `find_test_pattern` | `angular-spec` oder `dotnet-test` |
| `reference_file_path` | `find_test_pattern` | Quelldatei für Näheranking — nur für Ranking, kein AllowedDirectories-Check (optional) |

### .NET

| Parameter | Tool | Verwendung |
|-----------|------|------------|
| `name` | `create_dotnet_solution`, `scaffold_dotnet_project` | Solution- oder Projektname |
| `output_path` | `create_dotnet_solution`, `scaffold_dotnet_project` | Zielverzeichnis: `C:\Develop\MyProject\src` |
| `template` | `scaffold_dotnet_project` | z. B. `classlib`, `webapi`, `console`, `xunit` |
| `solution_path` | `scaffold_dotnet_project` | Optional: `.sln` für `dotnet sln add` |
| `options` | `scaffold_dotnet_project`, `test_dotnet_solution` | Optional |
| `test_project_path` | `scaffold_dotnet_test_class` | Absoluter Pfad zu .csproj oder Projektverzeichnis |
| `class_name` | `scaffold_dotnet_test_class` | z. B. `SetupMeasurementDefinitionsTests` |
| `namespace` | `scaffold_dotnet_test_class` | Optional, wird aus Projekt + `relative_folder` abgeleitet |
| `relative_folder` | `scaffold_dotnet_test_class` | Optional: `Entities/Setup` relativ zum Testprojekt |
| `test_framework` | `scaffold_dotnet_test_class` | Optional: `nunit` \| `xunit` \| `mstest` — auto-detect aus .csproj |
| `old_path` | `rename_file` | Quelldatei: `C:\Develop\...\OldName.cs` |
| `new_path` | `rename_file` | Zieldatei: `C:\Develop\...\NewName.cs` |
| `base_path` | `create_directory_structure` | Basis: `C:\Develop\MyProject\src` |
| `paths_json` | `create_directory_structure` | JSON-Array: `["Api","Domain/Entities","Infra/.gitkeep"]` |
| `path` | `build_dotnet_solution`, `test_dotnet_solution` | Absoluter Pfad zu .sln/.csproj/Verzeichnis |
| `configuration` | `build_dotnet_solution` | Optional: `Release` / `Debug` |
| `filter` | `test_dotnet_solution` | Optional: `"FullyQualifiedName~MyService"` |
| `test_project_path` | `test_dotnet_solution` | Optional: Pfad zu spez. Test-.csproj |
| `output_path` | `scaffold_dto` | Verzeichnis für die neue .cs Datei |
| `class_name` | `scaffold_dto` | Record-/Klassenname, z. B. `CreateUserRequest` |
| `namespace` | `scaffold_dto` | C#-Namespace |
| `properties` | `scaffold_dto` | JSON-Array: `[{"name":"Id","type":"int","required":true}]` |
| `class_type` | `scaffold_dto` | `"record"` (default) oder `"class"` |
| `controller_file_path` | `scaffold_api_action` | Absoluter Pfad zur Controller-.cs |
| `http_method` | `scaffold_api_action` | `GET\|POST\|PUT\|PATCH\|DELETE` |
| `route_template` | `scaffold_api_action` | z. B. `"{id}"` oder leer für Root-Route |
| `action_name` | `scaffold_api_action` | C#-Methodenname, z. B. `GetById` |
| `request_dto` | `scaffold_api_action` | Optional: Typ für `[FromBody]`-Parameter |
| `response_dto` | `scaffold_api_action` | Optional: Typ für `ActionResult<T>` |

### Angular

| Parameter | Tool | Verwendung |
|-----------|------|------------|
| `parent_directory` | `create_angular_project` | Elternverzeichnis: `C:\Develop\MyProject` |
| `project_root` | alle anderen Angular-Tools | Angular-Root (angular.json): `C:\Develop\MyProject\src\frontend` |
| `name` | alle | Projekt-/Komponenten-/Service-/Direktiven-Name (kebab-case) |
| `path` | Scaffolding außer create/spec | Optional: ng `--path`, relativ zu project_root |
| `source_file_path` | `scaffold_spec_for` | Absoluter oder project_root-relativer Pfad zur Quelldatei |
| `force` | `scaffold_spec_for` | Optional: `true` überschreibt bestehende Spec (default false) |
| `include_tests` | `scaffold_angular_component/service/directive` | Optional: `true` generiert Spec via ng generate (default false) |
| `configuration` | `build_angular_project` | Optional: z. B. `production` |
| `options` | alle | Optional: überschreiben alle Defaults |

---

## JSON-Beispiele

### find_test_pattern — Angular

```json
{
  "root": "C:\\Develop\\MyProject\\src\\frontend\\src\\app\\services",
  "kind": "angular-spec",
  "reference_file_path": "C:\\Develop\\MyProject\\src\\frontend\\src\\app\\services\\user.service.ts",
  "max_results": 3
}
```

### scaffold_spec_for (Angular)

```json
{
  "project_root": "C:\\Develop\\MyProject\\src\\frontend",
  "source_file_path": "C:\\Develop\\MyProject\\src\\frontend\\src\\app\\auth\\auth.service.ts"
}
```

### scaffold_spec_for (.NET — Testklasse für bestehende .cs)

```json
{
  "project_root": "C:\\Develop\\MyProject\\src\\backend",
  "source_file_path": "C:\\Develop\\MyProject\\src\\backend\\MyApp\\Services\\UserService.cs"
}
```

### scaffold_dto

```json
{
  "output_path": "C:\\Develop\\MyProject\\src\\backend\\MyApp\\Contracts",
  "class_name": "CreateUserRequest",
  "namespace": "MyApp.Contracts",
  "properties": "[{\"name\":\"Name\",\"type\":\"string\",\"required\":true},{\"name\":\"Email\",\"type\":\"string\",\"required\":true},{\"name\":\"Age\",\"type\":\"int\",\"required\":false}]",
  "class_type": "record"
}
```

### scaffold_api_action

```json
{
  "controller_file_path": "C:\\Develop\\MyProject\\src\\backend\\MyApp\\Controllers\\UsersController.cs",
  "http_method": "POST",
  "route_template": "",
  "action_name": "CreateUser",
  "request_dto": "CreateUserRequest",
  "response_dto": "UserDto"
}
```

### find_test_pattern — .NET

```json
{
  "root": "C:\\Develop\\MyProject\\src\\backend\\MyApp.Tests",
  "kind": "dotnet-test",
  "reference_file_path": "C:\\Develop\\MyProject\\src\\backend\\MyApp\\Entities\\Setup\\MeasurementDefinition.cs",
  "max_results": 3
}
```

### scaffold_dotnet_test_class

```json
{
  "test_project_path": "C:\\Develop\\MyProject\\src\\backend\\MyApp.Tests\\MyApp.Tests.csproj",
  "class_name": "SetupMeasurementDefinitionsTests",
  "relative_folder": "Entities/Setup"
}
```

### scaffold_angular_component (mit Spec via include_tests)

```json
{
  "project_root": "C:\\Develop\\MyProject\\src\\frontend",
  "name": "user-profile",
  "path": "src/app/users",
  "include_tests": true
}
```

### find_file (Spec-Existenz prüfen)

```json
{
  "root": "C:\\Develop\\MyProject\\src\\frontend\\src\\app\\services",
  "pattern": "user.service.spec.ts"
}
```

### find_by_content

```json
{
  "root": "C:\\Develop\\MyProject\\src\\backend",
  "pattern": "interface IOrderService",
  "file_glob": "*.cs",
  "max_results": 20
}
```

### scaffold_dotnet_project

```json
{
  "template": "webapi",
  "name": "UserService.Api",
  "output_path": "C:\\Develop\\MyProject\\src\\backend\\UserService.Api",
  "solution_path": "C:\\Develop\\MyProject\\src\\backend\\MyApp.sln",
  "options": "--framework net9.0"
}
```

### build_angular_project

```json
{
  "project_root": "C:\\Develop\\MyProject\\src\\frontend",
  "configuration": "production"
}
```

---

## Build/Test-Ergebnis auswerten

MCP liefert strukturierte Daten — direkt auswerten:

- `success: true` → Build/Test erfolgreich
- `errors[]` → Fehler mit Datei, Zeile, Meldung (Build/Test-Tools)
- `error` → Fehlerstring (Scaffolding-Tools: `scaffold_spec_for`, `scaffold_dotnet_test_class`)
- `warnings[]` → Warnungen
- `summary` → Kurzübersicht

**Compliance-Nachweis im Abschlussbericht:**
```
Build/Test: MCP-Tool build_dotnet_solution OK (success=true, 0 errors)
MCP-Build/Test eingehalten: ja
```

---

## Scout-Fallback (Index-Miss)

Nach leerem `find_in_index` (codebase-analyzer) — **Pflicht-Zweitstrategie:**

1. `find_by_content` (Regex, optional `file_glob`) oder `find_file` (Glob unter `root`)
2. Bei Treffer: `read_class_summary` / `read_signatures_only`

Nicht sofort natives Grep — MCP-Kette zuerst.

---

## Routing: Welcher Bereich wann?

| Aufgabe | Tool |
|---------|------|
| Beliebige Datei **lesen** (auch einzelne Zeilen, .json, .md, .html, .scss, …) | `read_file_raw` (dev-mcp) — **niemals `Read`-Tool** |
| `.cs`/`.ts` strukturiert lesen (Public API) | `read_signatures_only` (dev-mcp) |
| Methode/Funktion **lesen** | `read_method` (dev-mcp) |
| Klassen-Struktur **lesen** | `read_class_summary` (dev-mcp) |
| Verzeichnis **erkunden** | `list_directory` (dev-mcp) — **niemals `Bash ls` oder `Glob`** |
| Dateien nach Muster **suchen** | `find_file` (dev-mcp) — **niemals `Glob`-Tool** |
| Inhalt per Regex **suchen** | `find_by_content` (dev-mcp) — **niemals `Grep`-Tool** |
| Interface-Implementierungen **finden** | `find_implementations` (dev-mcp) |
| Muster-Spec/Testklasse **finden** | `find_test_pattern` (dev-mcp) — **vor** manuellem Read |
| Spec/Testklassen-Existenz **prüfen** | `find_file` (dev-mcp) |
| Angular-Spec **anlegen** (bestehende .ts) | `scaffold_spec_for` (dev-mcp) |
| Angular-Komponente/Service **erzeugen** | `scaffold_angular_*` |
| Angular **bauen** (`ng build`) | `build_angular_project` |
| Angular **testen** (`ng test`) | `test_angular_project` |
| .NET-Testklasse **anlegen** | `scaffold_dotnet_test_class` (dev-mcp) |
| .NET-Projekt anlegen | `create_dotnet_solution` + `scaffold_dotnet_project` |
| .NET **bauen** (`dotnet build`) | `build_dotnet_solution` |
| .NET **testen** (`dotnet test`) | `test_dotnet_solution` |
| Code **reviewen**, **indexieren**, Komplexität | **codebase-analyzer** |

---

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `Path not allowed` | Pfad außerhalb AllowedDirectories | AllowedDirectories in appsettings.json ergänzen |
| `File not found: C:\...` | Pfad falsch oder Datei fehlt | Pfad prüfen |
| `file_path is required` | Key fehlt | `file_path` setzen |
| `Source file not found` | `scaffold_spec_for` / `rename_file` Quelle fehlt | Quellpfad prüfen |
| `Spec file already exists` | Spec existiert bereits | `force: true` oder `read_file_raw` + Agent-Edit |
| `Test class file already exists` | Testklasse existiert bereits | `read_file_raw` auf bestehende Datei → Agent-Edit |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| Scaffolding-Fehler | Fehler in `error` (String) | `error`-Feld auswerten (kein Array) |
| MCP nicht in Tool-Liste | exe nicht gestartet / claude.json falsch | BLOCKER melden |

---

## Abgrenzung

- **codebase-analyzer:** Index, Review, Metriken, AST-Analyse, `detect_untested_public_api` — separater MCP (TypeScript)
- **build-log-filter:** Rohen Log filtern — nur für `ng serve`/`npm start` oder Shell-Fallback nach BLOCKER
- Kein `/project/`-Prefix, kein `/workspace/`-Prefix — dev-mcp läuft nativ, kein Docker

Log-Viewer: `http://localhost:5050/` — `GET /api/calls` (max 200 Einträge, nach Source filterbar)

## Deployment-Hinweis

Nach Code-Änderungen an `Mcp-Servers/Dev.Mcp/`:

```
dotnet publish Dev.Mcp/Dev.Mcp.csproj -c Release -r win-x64 --self-contained true -o "C:\Develop\.apps\dev-mcp\"
```

**Voraussetzung:** laufenden dev-mcp-Prozess stoppen (Claude Code neu starten) — die EXE ist im laufenden Betrieb gesperrt.
Staging-Verzeichnis: `C:\Develop\.apps\dev-mcp-staging\` (Build-Artefakt bereit, wartet auf Neustart).

## Open Points (Backlog)

| REQ | Priorität | Status | Beschreibung |
|-----|-----------|--------|--------------|
| REQ-G01 | P1 | ⏳ Offen | LSP-Integration (ts-lsp, cs-lsp) als separates MCP-Paket |
| REQ-E02 | P3 | ⏳ Offen | `move_symbol` (Symbol in andere Datei/Namespace verschieben) |
| REQ-F04 | P3 | ⏳ Offen | `index_solution` Bug-Fix für bestimmte `.sln`-Dateien |

## Opt-out

`kein dev-mcp`, `skip-dev-mcp` → diesen Skill nicht laden.
