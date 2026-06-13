---
name: dev-dotnet-mcp
description: >
  Kanon für MCP dev-dotnet-mcp: dotnet new, Verzeichnisstrukturen, Build und Test.
  Trigger: scaffold_dotnet_project, create_directory_structure, dotnet new,
  neues .NET-Projekt, Ordnerstruktur, build_dotnet_solution, test_dotnet_solution,
  dotnet build, dotnet test, .NET bauen, .NET testen.
  Parameter output_path, base_path, path als /workspace/... Pfade (Volume-Mount).
  Nicht für Code-Lesen — dev-filesystem-mcp.
when_to_use: >
  Aktiviere für .NET-Scaffolding (Projekte, Ordnerstrukturen) und .NET Build/Test via MCP.
  build_dotnet_solution und test_dotnet_solution ersetzen dotnet build / dotnet test als Shell-Kommandos
  vollständig — MCPs filtern intern und liefern errors[], warnings[], summary.
  Bei MCP nicht erreichbar: BLOCKER melden, kein stiller Shell-Fallback.
---

## MCP-FIRST — Build/Test (Hard Gate)

**`dotnet build` und `dotnet test` laufen via diesen MCP — niemals als Shell-Kommando wenn verfügbar.**

| Verboten | Richtig |
|----------|---------|
| Shell: `dotnet build` | `build_dotnet_solution` (dev-dotnet-mcp) |
| Shell: `dotnet test` | `test_dotnet_solution` (dev-dotnet-mcp) |
| `build-log-filter` für dotnet build / dotnet test wenn MCP verfügbar | MCPs filtern intern — `errors[]` direkt auswerten |

**Hard Stop — MCP nicht erreichbar:**

> **`BLOCKER: dev-dotnet-mcp nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Nutzer informieren (Docker? MCP aktiv? Image gebaut? Port 8093 erreichbar?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## MCP-Pfad-Kanon (Pflicht)

- Alle Pfade mit `/workspace/` Prefix — Container-Absolutpfade
- **VERBOTEN:** `C:\`, Host-Pfade, IDE-relative Pfade, `{parameter}`-Platzhalter
- `path does not exist` = falscher Pfad-Prefix → `/workspace/` setzen
- Mount: `${workspaceFolder}:/workspace` (read-write)

---

## MCP dev-dotnet-mcp — Server und Tools

**Server:** `dev-dotnet-mcp` (Docker, Port 8093)
**Volume-Mount:** `${workspaceFolder}:/workspace` (read-write)

| Tool | Zweck |
|------|-------|
| `scaffold_dotnet_project` | `dotnet new` + optional `dotnet sln add` |
| `create_directory_structure` | Verzeichnisse/Dateien aus `paths_json` |
| `build_dotnet_solution` | `dotnet build` — gibt `{success, errors[], warnings[], summary}` zurück |
| `test_dotnet_solution` | `dotnet test` — gibt `{success, errors[], summary}` zurück |

**Wichtig:** `build_dotnet_solution` und `test_dotnet_solution` filtern den rohen Konsolen-Output intern.
Agents erhalten ausschließlich strukturierte Daten (`errors[]`, `warnings[]`, `summary`) — niemals Raw-stdout/stderr.
**Kein** `build-log-filter` für diese Kommandos nötig oder erlaubt.

---

## Parameter (verbindlich)

| Parameter | Verwendung |
|-----------|------------|
| `output_path` | Zielverzeichnis für `dotnet new` (Container-Pfad `/workspace/...`) |
| `base_path` | Basis für `create_directory_structure` (Container-Pfad `/workspace/...`) |
| `path` | Solution/Projekt/Verzeichnis für Build oder Test (`/workspace/...`) |
| `template` | `dotnet new`-Template (z. B. `webapi`, `classlib`) |
| `name` | Projektname |
| `solution_path` | Optional: `.sln` für `dotnet sln add` (`/workspace/...`) |
| `configuration` | Optional: Build-Konfiguration (z. B. `Release`) |
| `options` | Optional: extra CLI-Flags |
| `paths_json` | JSON-Array relativer Pfade unter `base_path` |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `C:\Develop\...` oder `/home/user/...` | `/workspace/...` |
| `outputPath`, `rootPath` | `output_path`, `base_path` |
| `structure` (Objekt-Baum) | `paths_json` (String-Array) |
| Host-Absolutpfad | Container-Pfad unter `/workspace` |

---

## JSON-Beispiele

### scaffold_dotnet_project

```json
{
  "template": "webapi",
  "name": "UserService.Api",
  "output_path": "/workspace/src/backend/UserService.Api",
  "solution_path": "/workspace/src/backend/MyApp.sln",
  "options": "--framework net9.0"
}
```

### create_directory_structure

```json
{
  "base_path": "/workspace/src/backend/UserService",
  "paths_json": "[\"src/Api\", \"src/Domain/Entities\", \"src/Infrastructure/Persistence/.gitkeep\"]"
}
```

### build_dotnet_solution

```json
{
  "path": "/workspace/src/backend/MyApp.sln",
  "configuration": "Release"
}
```

### test_dotnet_solution

```json
{
  "path": "/workspace/src/backend/MyApp.sln"
}
```

---

## Build/Test-Ergebnis auswerten

MCPs liefern strukturierte Daten — direkt auswerten:

- `success: true` → Build/Test erfolgreich
- `errors[]` → Array der Fehler mit Datei, Zeile, Meldung
- `warnings[]` → Array der Warnungen
- `summary` → Kurzübersicht (Anzahl Tests, Build-Zeit etc.)

**Compliance-Nachweis im Abschlussbericht:**
```
Build/Test: MCP-Tool build_dotnet_solution OK (success=true, 0 errors)
MCP-Build/Test eingehalten: ja
```

---

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `output_path is required` / `base_path is required` | Key fehlt | Container-Pfad setzen |
| `path does not exist` | Pfad falsch oder falsches Präfix | Pfad mit `/workspace/` beginnen lassen |
| `Path outside base_path` | Pfad in `paths_json` ungültig | Relative Pfade unter `base_path` |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| Invoke-Fehler | Falscher Parameter-Key | Schema lesen, MCP-Deskriptor konsultieren |
| MCP nicht in Tool-Liste | Docker/MCP nicht aktiv | BLOCKER melden |

---

## Abgrenzung

- **dev-filesystem-mcp:** Bestehenden Code lesen (`/project/...`)
- **build-log-filter:** Rohen Log-Output filtern — nur für Shell-Fallback nach BLOCKER oder nicht-MCP-Scope
- **Routing:** dev-tooling-mcp Router-Skill

Log-UI: Port **8093** — `GET /api/calls`

Weiterführende Dokumentation: `docs/mcp-dev-dotnet.md`

dev-tooling-mcp Constraints für .NET:
- `dotnet build` / `dotnet test` immer via `build_dotnet_solution` / `test_dotnet_solution` wenn MCP verfügbar
- Kein `build-log-filter` für MCP-gesteuerte Läufe
- Shell-Fallback nur nach expliziter BLOCKER-Freigabe

## Opt-out

`kein dev-dotnet-mcp`, `skip-dev-dotnet-mcp` → diesen Skill nicht laden.
