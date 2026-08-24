---
name: angular-cli
description: Use when running Angular CLI commands directly — ng generate/add/update/serve/build/test/deploy, dev-server proxy config, or the official `@angular/cli mcp` server. Not for projects with their own build/scaffold MCP tooling — check the project's conventions first; a shell `ng build`/`ng generate` may be explicitly forbidden there in favor of an MCP wrapper.
---

# Angular CLI

**Before using any command here:** check whether the project has its own build/test/scaffold MCP tooling that replaces the Angular CLI shell commands. If so, that tooling wins — don't fall back to raw `ng` commands.

## Dependencies

`ng add` over `npm install` for Angular libraries — it also runs init schematics (configures `angular.json`, updates root providers):

```bash
ng add @angular/material
```

Update app + deps (also runs code migrations):

```bash
ng update @angular/core@<version> @angular/cli@<version>
```

## Generating code

| Target | Command | Notes |
|---|---|---|
| Component | `ng g c path/to/name` | `-s`/`-t` for inline style/template |
| Service | `ng g s path/to/name` | `@Injectable({providedIn: 'root'})` |
| Directive | `ng g d path/to/name` | |
| Pipe | `ng g p path/to/name` | |
| Guard | `ng g g path/to/name` | functional route guard |
| Environments | `ng g environments` | scaffolds `src/environments/`, updates `angular.json` |

No command generates a single route entry — generate the component, then add it to the `Routes` array manually.

## Dev server & proxying

```bash
ng serve
```

Proxy `/api` to a local backend: `src/proxy.conf.json` (`{ "/api/**": {"target": "http://localhost:3000", "secure": false} }`), then reference it from `angular.json`'s `serve.options.proxyConfig`.

## Building

```bash
ng build
```

Uses `@angular/build:application` (esbuild). Defaults to production config (AOT, minify, tree-shake). Target a config: `ng build --configuration=staging`.

## Testing

`ng test` (unit, via the configured runner — **Vitest is the default for new v21 projects**, replacing Karma), `ng e2e` (prompts to install a framework if none configured).

Migrating an existing Karma/Jasmine project to Vitest: see skill `angular-migration`.

## Deployment

Add a deploy builder first, then `ng deploy` (e.g. `ng add @angular/fire` then `ng deploy`).

## Official `@angular/cli mcp` server

Distinct from any project-specific MCP wrapper — this is Angular's own MCP server for IDE/agent integration (`npx @angular/cli mcp`). Tools, per-IDE config (Cursor/VS Code/Gemini CLI/Antigravity), and flags (`--read-only`, `--local-only`, `--experimental-tool`): [references/mcp-server.md](references/mcp-server.md).
