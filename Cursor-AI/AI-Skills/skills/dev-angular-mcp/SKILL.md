---
name: dev-angular-mcp
description: >
  Kanon für MCP dev-angular-mcp: Angular-Scaffolding und Build/Test.
  Trigger: scaffold_angular_component, scaffold_angular_service, ng generate,
  neue Komponente, neuer Service, build_angular_project, test_angular_project,
  ng build, ng test, Angular bauen, Angular testen.
  Parameter project_root als /workspace/... Pfad (Volume-Mount).
  Nicht für Code-Lesen — dev-filesystem-mcp; nicht für Review — codebase-analyzer.
disable-model-invocation: true
---

# dev-angular-mcp

Kanonische Referenz für den MCP-Server **dev-angular-mcp** (Docker, Port 8092).

**Vor jedem Tool-Aufruf:** Schema unter `mcps/dev-angular-mcp/tools/<tool>.json` lesen.

## Voraussetzungen

- Volume-Mount: `${workspaceFolder}:/workspace` (read-write)
- `project_root` = **Container-Absolutpfad** `/workspace/...` zum Verzeichnis mit `angular.json`
- Kein Host-Pfad — immer `/workspace/...`

## Parameter (verbindlich)

| Parameter | Verwendung |
|-----------|------------|
| `project_root` | Container-Pfad zum Angular-Root (`angular.json`), z. B. `/workspace/src/frontend` |
| `name` | Komponenten-/Service-Name (kebab-case empfohlen) |
| `path` | Optional: ng `--path` (relativ zu `project_root`) |
| `configuration` | Optional: `--configuration` für Build (z. B. `production`) |
| `options` | Optional: CLI-Flags für Scaffolding oder Test |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `C:\Develop\...` oder `/home/user/...` | `/workspace/...` |
| `file_path` / `filePath` | `project_root` |
| Host-Absolutpfad | Container-Pfad unter `/workspace` |

## Tools

| Tool | Zweck |
|------|-------|
| `scaffold_angular_component` | `ng generate component` — Default `--standalone --skip-tests` |
| `scaffold_angular_service` | `ng generate service` — Default `--skip-tests` |
| `build_angular_project` | `ng build` — gibt `{success, errors[], warnings[], summary}` zurück |
| `test_angular_project` | `ng test --watch=false` — gibt `{success, errors[], summary}` zurück |

**Wichtig:** `build_angular_project` und `test_angular_project` filtern den rohen Konsolen-Output intern.
Agents erhalten ausschließlich strukturierte Daten (`errors[]`, `warnings[]`, `summary`) — niemals Raw-stdout/stderr.

## JSON-Beispiele

### scaffold_angular_component

```json
{
  "project_root": "/workspace/src/frontend",
  "name": "user-profile",
  "path": "src/app/users",
  "options": "--change-detection OnPush --style scss"
}
```

### scaffold_angular_service

```json
{
  "project_root": "/workspace/src/frontend",
  "name": "user",
  "path": "src/app/users"
}
```

### build_angular_project

```json
{
  "project_root": "/workspace/src/frontend",
  "configuration": "production"
}
```

### test_angular_project

```json
{
  "project_root": "/workspace/src/frontend"
}
```

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `project_root is required` | Key fehlt | `/workspace/...` Pfad setzen |
| `project_root does not exist` | Pfad falsch oder falsches Präfix | Pfad mit `/workspace/` beginnen lassen |
| Build/Test schlägt fehl | Fehler in `errors[]` | `errors[]`-Array auswerten |
| Invoke-Fehler ohne klare Meldung | Falscher Parameter-Key | Schema lesen |

## Abgrenzung

- **dev-filesystem-mcp:** Bestehenden Code lesen (`/project/...`)
- **build-log-filter:** Rohen Log-Output manuell filtern (Fallback)
- **Routing:** [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md)

## Log-UI

Port **8092** — `GET /api/calls`.

## Opt-out

`kein dev-angular-mcp`, `skip-dev-angular-mcp` → diesen Skill nicht laden.
