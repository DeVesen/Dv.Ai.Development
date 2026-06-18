---
name: dev-mcp
description: >
  Kanon für MCP dev-mcp: alle 18 Dev-Tools in einem stdio-Prozess —
  Filesystem (find_file, find_by_content, find_implementations, read_signatures_only, read_method, read_class_summary),
  .NET-Scaffolding (create_dotnet_solution, scaffold_dotnet_project, rename_file, create_directory_structure,
  build_dotnet_solution, test_dotnet_solution),
  Angular (create_angular_project, scaffold_angular_component, scaffold_angular_service,
  scaffold_angular_directive, build_angular_project, test_angular_project).
  Pfade: echte Windows-Absolutpfade (C:\...). Nicht für Index/Review/Metriken — codebase-analyzer.
when_to_use: >
  Aktiviere für: Dateien lesen/suchen (.cs/.ts), Angular oder .NET Scaffolding,
  ng build, ng test, dotnet build, dotnet test.
  build_dotnet_solution / test_dotnet_solution ersetzen Shell-dotnet-Kommandos vollständig.
  build_angular_project / test_angular_project ersetzen Shell-ng-Kommandos vollständig.
  Pfade immer als echte Windows-Absolutpfade (C:\Develop\...) — kein /project/, kein /workspace/.
  Bei MCP nicht erreichbar: BLOCKER melden, kein stiller Shell-Fallback.
  Nicht für Code-Review, Index, Metriken — codebase-analyzer.
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

### Filesystem-Tools (read-only, lesen/suchen)

| Tool | Zweck |
|------|-------|
| `find_file` | Glob unter `root` (max 100 Ergebnisse) |
| `find_by_content` | Regex pro Zeile, optional `file_glob` |
| `find_implementations` | Interface-Implementierungen (.cs Roslyn / .ts Regex) |
| `read_signatures_only` | Public API ohne Bodies |
| `read_method` | Eine Methode/Funktion nach `method_name` |
| `read_class_summary` | Klassenstruktur ohne Bodies |

### .NET-Tools (Scaffolding + Build/Test)

| Tool | Zweck |
|------|-------|
| `create_dotnet_solution` | `dotnet new sln` |
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` |
| `rename_file` | Datei umbenennen/verschieben |
| `create_directory_structure` | Verzeichnisse/Dateien aus `paths_json` |
| `build_dotnet_solution` | `dotnet build` → `{success, errors[], warnings[], summary}` |
| `test_dotnet_solution` | `dotnet test` → `{success, errors[], summary}` |

### Angular-Tools (Scaffolding + Build/Test)

| Tool | Zweck |
|------|-------|
| `create_angular_project` | `ng new` — Default: `--standalone --skip-tests --routing --style=scss` |
| `scaffold_angular_component` | `ng generate component` — Default: `--standalone --skip-tests` |
| `scaffold_angular_service` | `ng generate service` — Default: `--skip-tests` |
| `scaffold_angular_directive` | `ng generate directive` — Default: `--standalone --skip-tests` |
| `build_angular_project` | `ng build` → `{success, errors[], warnings[], summary}` |
| `test_angular_project` | `ng test --watch=false` → `{success, errors[], summary}` |

---

## Parameter (verbindlich)

### Filesystem

| Parameter | Tool | Verwendung |
|-----------|------|------------|
| `root` | `find_file`, `find_by_content`, `find_implementations` | Suchwurzel: `C:\Develop\MyProject` |
| `file_path` | `read_*` | Absolute Datei: `C:\Develop\MyProject\src\UserService.cs` |
| `pattern` | `find_file`, `find_by_content` | Glob oder Regex |
| `file_glob` | `find_by_content` | Optional: `*.cs` |
| `interface_name` | `find_implementations` | z. B. `IOrderService` |
| `method_name` | `read_method` | Methoden-/Funktionsname |
| `class_name` | `read_method`, `read_class_summary` | Optional, zur Disambiguierung |
| `max_results` | Such-Tools | Default 20, max 100 |

### .NET

| Parameter | Tool | Verwendung |
|-----------|------|------------|
| `name` | `create_dotnet_solution`, `scaffold_dotnet_project` | Solution- oder Projektname |
| `output_path` | `create_dotnet_solution`, `scaffold_dotnet_project` | Zielverzeichnis: `C:\Develop\MyProject\src` |
| `template` | `scaffold_dotnet_project` | z. B. `classlib`, `webapi`, `console`, `xunit` |
| `solution_path` | `scaffold_dotnet_project` | Optional: `.sln` für `dotnet sln add` |
| `options` | `scaffold_dotnet_project` | Optional: z. B. `--framework net9.0` |
| `old_path` | `rename_file` | Quelldatei: `C:\Develop\...\OldName.cs` |
| `new_path` | `rename_file` | Zieldatei: `C:\Develop\...\NewName.cs` |
| `base_path` | `create_directory_structure` | Basis: `C:\Develop\MyProject\src` |
| `paths_json` | `create_directory_structure` | JSON-Array: `["Api","Domain/Entities","Infra/.gitkeep"]` |
| `path` | `build_dotnet_solution`, `test_dotnet_solution` | Absoluter Pfad zu .sln/.csproj/Verzeichnis |
| `configuration` | `build_dotnet_solution` | Optional: `Release` / `Debug` |

### Angular

| Parameter | Tool | Verwendung |
|-----------|------|------------|
| `parent_directory` | `create_angular_project` | Elternverzeichnis: `C:\Develop\MyProject` |
| `project_root` | alle anderen Angular-Tools | Angular-Root (angular.json): `C:\Develop\MyProject\src\frontend` |
| `name` | alle | Projekt-/Komponenten-/Service-/Direktiven-Name (kebab-case) |
| `path` | Scaffolding außer create | Optional: ng `--path`, relativ zu project_root |
| `configuration` | `build_angular_project` | Optional: z. B. `production` |
| `options` | alle | Optional: überschreiben alle Defaults |

---

## JSON-Beispiele

### find_file

```json
{
  "root": "C:\\Develop\\MyProject\\src\\backend",
  "pattern": "**/*Repository.cs",
  "max_results": 20
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

### read_signatures_only

```json
{
  "file_path": "C:\\Develop\\MyProject\\src\\backend\\UserService.cs"
}
```

### read_method

```json
{
  "file_path": "C:\\Develop\\MyProject\\src\\backend\\UserService.cs",
  "method_name": "GetUserAsync"
}
```

### create_dotnet_solution

```json
{
  "name": "MyApp",
  "output_path": "C:\\Develop\\MyProject\\src\\backend"
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

### build_dotnet_solution

```json
{
  "path": "C:\\Develop\\MyProject\\src\\backend\\MyApp.sln",
  "configuration": "Release"
}
```

### create_angular_project

```json
{
  "parent_directory": "C:\\Develop\\MyProject",
  "name": "my-app"
}
```

### scaffold_angular_component

```json
{
  "project_root": "C:\\Develop\\MyProject\\src\\frontend",
  "name": "user-profile",
  "path": "src/app/users"
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
- `errors[]` → Fehler mit Datei, Zeile, Meldung
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
| Datei/Klasse/Methode **lesen** (token-sparend) | `read_*` / `find_*` (Filesystem-Gruppe) |
| Interface-Implementierungen **finden** | `find_implementations` |
| Angular-Komponente/Service **erzeugen** | `scaffold_angular_*` |
| Angular **bauen** (`ng build`) | `build_angular_project` |
| Angular **testen** (`ng test`) | `test_angular_project` |
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
| `Source file not found` | `rename_file` Quelle fehlt | Quellpfad prüfen |
| `Destination already exists` | `rename_file` Ziel belegt | Zieldatei löschen oder anderen Namen wählen |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| MCP nicht in Tool-Liste | exe nicht gestartet / claude.json falsch | BLOCKER melden |

---

## Abgrenzung

- **codebase-analyzer:** Index, Review, Metriken, AST-Analyse — separater MCP (TypeScript)
- **build-log-filter:** Rohen Log filtern — nur für `ng serve`/`npm start` oder Shell-Fallback nach BLOCKER
- Kein `/project/`-Prefix, kein `/workspace/`-Prefix — dev-mcp läuft nativ, kein Docker

Log-Viewer: `http://localhost:5050/` — `GET /api/calls` (max 200 Einträge, nach Source filterbar)

## Opt-out

`kein dev-mcp`, `skip-dev-mcp` → diesen Skill nicht laden.
