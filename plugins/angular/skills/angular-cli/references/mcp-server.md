# Angular CLI MCP Server

The Angular CLI includes an MCP server enabling AI assistants (Cursor, Gemini CLI, JetBrains AI, etc.) to interact with the Angular CLI directly — project analysis, guided migrations, running builds/tests.

## Default tools

| Name | Description |
|---|---|
| `ai_tutor` | Interactive AI-powered Angular tutor. |
| `get_best_practices` | Angular Best Practices Guide (standalone components, typed forms, etc.). |
| `list_projects` | Lists apps/libraries in the workspace via `angular.json`. |
| `onpush_zoneless_migration` | Analyzes code, plans a migration to `OnPush` (zoneless prerequisite). |
| `search_documentation` | Searches https://angular.dev. |

## Experimental tools (need `--experimental-tool`/`-E`)

| Name | Description |
|---|---|
| `build` | One-off `ng build`. |
| `devserver.start` / `devserver.stop` | Async dev server control. |
| `devserver.wait_for_build` | Logs of the most recent build in a running dev server. |
| `e2e` | Runs E2E tests. |
| `test` | Runs unit tests. |

## Configuration

Run via `npx @angular/cli mcp` from your host environment's MCP config.

**Antigravity** (`.antigravity/mcp.json`), **Gemini CLI** (`.gemini/settings.json`), **Cursor** (`.cursor/mcp.json`, or `~/.cursor/mcp.json` globally) — same shape:

```json
{ "mcpServers": { "angular-cli": { "command": "npx", "args": ["-y", "@angular/cli", "mcp"] } } }
```

**VS Code** (`.vscode/mcp.json`):

```json
{ "servers": { "angular-cli": { "command": "npx", "args": ["-y", "@angular/cli", "mcp"] } } }
```

## Command options

- `--read-only` — only tools that don't modify the project.
- `--local-only` — only tools that don't need internet access.
- `--experimental-tool`/`-E` — enable a specific experimental tool (repeatable): `-E build -E test`.

```json
"args": ["-y", "@angular/cli", "mcp", "--read-only", "-E", "build", "-E", "test"]
```
