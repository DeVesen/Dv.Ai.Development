# Operation: Tooling

**Trigger-Keywords:** `CLI`, `ng generate`, `ng serve`, `ng build`, `migration`, `schematic`, `MCP`, `Angular MCP`, `modernisierung`, `update`

## Relevante Referenzen

| Thema | Datei |
|-------|-------|
| CLI: Apps, Generate, Serve, Build | [cli.md](cli.md) |
| Modernisierungs-Migrationen | [migrations.md](migrations.md) |
| Angular MCP Server | [mcp.md](mcp.md) |

## Dev Angular MCP

Wenn `dev-angular-mcp` konfiguriert ist, **immer MCP statt Shell** für Scaffolding und Build/Test:

### Scaffolding

| Aktion | MCP-Tool | VERBOTEN |
|--------|----------|---------|
| Neue Komponente | `scaffold_angular_component` | Shell `ng generate component` |
| Neuer Service | `scaffold_angular_service` | Shell `ng generate service` |

### Build und Test (MCP-Pflicht — Hard Gate)

| Aktion | MCP-Tool | VERBOTEN |
|--------|----------|---------|
| Build | `build_angular_project` | Shell `ng build` |
| Test | `test_angular_project` | Shell `ng test` |

`build_angular_project` und `test_angular_project` filtern die Konsolenausgabe intern — der LLM erhält ausschließlich `errors[]`, `warnings[]`, `summary`. **Kein build-log-filter** für diese Aufrufe.

**Hard Stop wenn MCP nicht erreichbar:** `BLOCKER: dev-angular-mcp nicht erreichbar` — kein Shell-Fallback ohne explizite Nutzerfreigabe.

### Parameter

| Parameter | Wert |
|-----------|------|
| `project_root` | Container-Pfad `/workspace/...` zum Angular-Root (`angular.json`) |
| `name` | kebab-case empfohlen (Scaffolding) |
| `path` | optional, z. B. `src/app/shared` (Scaffolding) |
| `configuration` | optional, z. B. `production` (Build) |
| `options` | optional CLI-Flags (Scaffolding) |

Output Scaffolding: JSON mit `success`, `createdFiles[]`, `exitCode`.
Output Build/Test: JSON mit `success`, `errors[]`, `warnings[]`, `summary`, `exitCode`.

Nach dem Scaffolding: erstellte Dateien lesen und projektspezifisch anpassen.

> **Abgrenzung:** `@angular/cli mcp` (siehe [mcp.md](mcp.md)) ist der offizielle Angular-Dokumentations-MCP — **dev-angular-mcp** führt `ng`-Kommandos im Container aus.

Kanon: [dev-angular-mcp/SKILL.md](../../dev-angular-mcp/SKILL.md) · Router: [dev-tooling-mcp/SKILL.md](../../dev-tooling-mcp/SKILL.md)
