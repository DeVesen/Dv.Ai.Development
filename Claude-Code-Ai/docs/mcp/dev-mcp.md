# MCP: dev-mcp

**Dev.WindowsService.Mcp** — Alle 18 Dev-Tools in einem nativen stdio-Prozess.
Kombiniert Filesystem-Lesen/Suchen, .NET-Scaffolding/Build/Test und Angular-Scaffolding/Build/Test.

> **Agent-Kanon (Pflicht):** [`.claude/skills/dev-mcp/SKILL.md`](../../.claude/skills/dev-mcp/SKILL.md)
> Bei Widersprüchen zwischen dieser Doku und dem Skill gilt der Skill.

---

## Überblick

| Eigenschaft | Wert |
|-------------|------|
| Transport | stdio (Claude Code startet als Child-Prozess) |
| Exe | `C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe` |
| Log-Viewer | `http://localhost:5050/` (Port via `LOG_VIEWER_PORT`) |
| Config | `C:\Develop\.apps\dev-mcp\appsettings.json` |
| Pfad-Format | Windows-Absolutpfade: `C:\Develop\...` |
| Sicherheit | `AllowedDirectories` in `appsettings.json` |

---

## Tools (18 gesamt)

### Filesystem (lesen/suchen — read-only)

| Tool | Beschreibung |
|------|-------------|
| `find_file` | Glob unter `root`, max 100 Ergebnisse |
| `find_by_content` | Regex pro Zeile, optional `file_glob` |
| `find_implementations` | Interface-Implementierungen (.cs Roslyn / .ts Regex) |
| `read_signatures_only` | Public API ohne Bodies (~90% weniger Tokens) |
| `read_method` | Einzelne Methode/Funktion nach `method_name` |
| `read_class_summary` | Klassenstruktur ohne Bodies |

### .NET (Scaffolding + Build/Test)

| Tool | Beschreibung |
|------|-------------|
| `create_dotnet_solution` | `dotnet new sln` |
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` |
| `rename_file` | Datei umbenennen/verschieben |
| `create_directory_structure` | Verzeichnisse/Dateien aus `paths_json` |
| `build_dotnet_solution` | `dotnet build` → `{success, errors[], warnings[], summary}` |
| `test_dotnet_solution` | `dotnet test` → `{success, errors[], summary}` |

### Angular (Scaffolding + Build/Test)

| Tool | Beschreibung |
|------|-------------|
| `create_angular_project` | `ng new` — Default: `--standalone --skip-tests --routing --style=scss` |
| `scaffold_angular_component` | `ng generate component` — Default: `--standalone --skip-tests` |
| `scaffold_angular_service` | `ng generate service` — Default: `--skip-tests` |
| `scaffold_angular_directive` | `ng generate directive` — Default: `--standalone --skip-tests` |
| `build_angular_project` | `ng build` → `{success, errors[], warnings[], summary}` |
| `test_angular_project` | `ng test --watch=false` → `{success, errors[], summary}` |

---

## Konfiguration (claude.json)

```json
{
  "mcpServers": {
    "dev-mcp": {
      "type": "stdio",
      "command": "C:\\Develop\\.apps\\dev-mcp\\Dev.WindowsService.Mcp.exe",
      "env": {
        "LOG_VIEWER_PORT": "5050"
      }
    }
  }
}
```

---

## AllowedDirectories

Konfiguriert in `C:\Develop\.apps\dev-mcp\appsettings.json`:

```json
{
  "McpService": {
    "AllowedDirectories": [
      "C:\\Develop",
      "C:\\Users\\S.Reichert\\Documents"
    ]
  }
}
```

Pfade außerhalb liefern `Path not allowed` — dann `AllowedDirectories` ergänzen und Dienst neu starten.

---

## Log-Viewer

`http://localhost:5050/` — Letzte 200 Tool-Calls mit:
- Source-Tag: filesystem (grün) / dotnet (lila) / angular (rot)
- Filter-Buttons: All / .NET / Angular / Filesystem
- `DELETE /api/calls` — alle löschen
- `DELETE /api/calls/{id}` — einzelnen Eintrag löschen

---

## Ablösung der alten Docker-MCPs

| Alt (Docker) | Neu (stdio) | Pfad-Änderung |
|-------------|-------------|---------------|
| dev-filesystem-mcp (Port 8091) | dev-mcp | `/project/...` → `C:\...` |
| dev-dotnet-mcp (Port 8093) | dev-mcp | `/workspace/...` → `C:\...` |
| dev-angular-mcp (Port 8092) | dev-mcp | `/workspace/...` → `C:\...` |
