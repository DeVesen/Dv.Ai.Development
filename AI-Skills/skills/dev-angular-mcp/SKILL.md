---
name: dev-angular-mcp
description: >
  Kanon für MCP dev-angular-mcp: Angular-Scaffolding via ng generate.
  Trigger: scaffold_angular_component, scaffold_angular_service, ng generate,
  neue Komponente, neuer Service. Parameter project_root als Host-Absolutpfad.
  Nicht für Code-Lesen — dev-filesystem-mcp; nicht für Review — codebase-analyzer.
disable-model-invocation: true
---

# dev-angular-mcp

Kanonische Referenz für den MCP-Server **dev-angular-mcp** (Docker, Port 8092).

**Vor jedem Tool-Aufruf:** Schema unter `mcps/dev-angular-mcp/tools/<tool>.json` lesen.

## Voraussetzungen

- **Kein** Volume-Mount — der Server schreibt direkt aufs Host-Dateisystem
- `project_root` = **Host-Absolutpfad** zum Verzeichnis mit `angular.json`
- Optional `path` = relativer `--path` für `ng generate` (z. B. `src/app/users`)

## Parameter (verbindlich)

| Parameter | Verwendung |
|-----------|------------|
| `project_root` | Host-Absolutpfad zum Angular-Root (`angular.json`) |
| `name` | Komponenten-/Service-Name (kebab-case empfohlen) |
| `path` | Optional: ng `--path` (relativ zu `project_root`) |
| `options` | Optional: CLI-Flags (ersetzen Defaults) |

### Nicht verwenden

| Falsch | Richtig |
|--------|---------|
| `/project/...` | Host-Absolutpfad für `project_root` |
| `file_path` / `filePath` | `project_root` (filesystem/codebase-Konventionen) |

## Tools

| Tool | Default-Verhalten |
|------|-------------------|
| `scaffold_angular_component` | `ng generate component` — Default `--standalone --skip-tests` |
| `scaffold_angular_service` | `ng generate service` — Default `--skip-tests` |

## JSON-Beispiele

### scaffold_angular_component

```json
{
  "project_root": "C:\\Develop\\MyApp\\src\\frontend",
  "name": "user-profile",
  "path": "src/app/users",
  "options": "--change-detection OnPush --style scss"
}
```

### scaffold_angular_service

```json
{
  "project_root": "C:\\Develop\\MyApp\\src\\frontend",
  "name": "user",
  "path": "src/app/users"
}
```

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| `project_root is required` | Key fehlt | Host-Absolutpfad setzen |
| `project_root does not exist` | Pfad falsch oder nicht gemountet | Pfad zum `angular.json`-Verzeichnis prüfen |
| Invoke-Fehler ohne klare Meldung | Falscher Parameter-Key | Schema lesen |

## Abgrenzung

- **dev-filesystem-mcp:** Bestehenden Code lesen (`/project/...`)
- **Routing:** [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md)

## Log-UI

Port **8092** — `GET /api/calls`.

## Opt-out

`kein dev-angular-mcp`, `skip-dev-angular-mcp` → diesen Skill nicht laden.
