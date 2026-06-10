# Operation: Tooling

**Trigger-Keywords:** `CLI`, `ng generate`, `ng serve`, `ng build`, `migration`, `schematic`, `MCP`, `Angular MCP`, `modernisierung`, `update`

## Relevante Referenzen

| Thema | Datei |
|-------|-------|
| CLI: Apps, Generate, Serve, Build | [cli.md](cli.md) |
| Modernisierungs-Migrationen | [migrations.md](migrations.md) |
| Angular MCP Server | [mcp.md](mcp.md) |

## Dev Angular MCP

Wenn `dev-angular-mcp` konfiguriert ist, **bevorzuge MCP-Scaffolding** vor manuellem `ng generate`:

| Aktion | MCP-Tool | Fallback |
|--------|----------|---------|
| Neue Komponente | `scaffold_angular_component` | `ng generate component` |
| Neuer Service | `scaffold_angular_service` | `ng generate service` |

| Parameter | Wert |
|-----------|------|
| `project_root` | Host-Absolutpfad zum Angular-Root (`angular.json`) |
| `name` | kebab-case empfohlen |
| `path` | optional, z. B. `src/app/shared` |
| `options` | ersetzt Defaults komplett; Default Component: `--standalone --skip-tests`; Default Service: `--skip-tests` |

Output: JSON mit `success`, `createdFiles[]`, `exitCode`, `error`.  
Nach dem Scaffolding: erstellte Dateien lesen und projektspezifisch anpassen.

> **Abgrenzung:** `@angular/cli mcp` (siehe [mcp.md](mcp.md)) ist der offizielle Angular-Dokumentations-MCP — **dev-angular-mcp** führt `ng generate` auf dem Host aus.

Kanon: [dev-angular-mcp/SKILL.md](../../dev-angular-mcp/SKILL.md) · Router: [dev-tooling-mcp/SKILL.md](../../dev-tooling-mcp/SKILL.md)
