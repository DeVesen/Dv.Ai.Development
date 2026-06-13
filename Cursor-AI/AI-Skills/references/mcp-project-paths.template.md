# MCP project paths (deployed — Kanon für Agents)

> **Single source of truth** für MCP `projectPath` / `solutionPath`. Wird bei Install/Update aus `skill-params.json` generiert; Routing-Tabelle **nach Deploy prüfen/anpassen** (Multi-.csproj).
> `./AGENTS.md` ist **nicht** erforderlich.

Mount: `${workspaceFolder}` → `/workspace:ro` (codebase-analyzer). Filesystem-MCP: `/project/...`.

---

## MCP container paths

| Platzhalter | Host path | MCP container path |
|-------------|-----------|-------------------|
| `{mcp-frontend-path}` | `{frontend-path}` | `{mcp-frontend-path}` |
| `{mcp-backend-path}` | `{backend-path}` | `{mcp-backend-path}` |
| `{mcp-backend-solution}` | — | `{mcp-backend-solution}` |

**index_solution:** `{index-solution-policy}` — bei `disabled`: Multi-`index_project` auf `.csproj`-Verzeichnisse (Known Issue: `No projects found in solution` im Container).

---

## Backend project routing

`find_in_index` / `index_project`: `projectPath` = MCP container path für die Domäne — **nicht** pauschal `{mcp-backend-path}`, wenn das Symbol in einem anderen `.csproj` liegt.

| Domäne / Symbole | MCP projectPath |
|------------------|-----------------|
| Angular Components, Services, Sidebar, Dashboard, Guards, Auth, Routes | `{mcp-frontend-path}` |
| .NET — Standard (Einzel-Backend oder unbekannt) | `{mcp-backend-path}` |

<!-- Multi-.csproj: Zeilen unten anpassen oder aus LAC-Beispiel übernehmen (nach Deploy committen) -->
<!-- LAC ATLAS Beispiel:
| Permissions, PermissionsProvider, UserContext, CanReadExperimentCheck | /workspace/lac-db/src/backend/LAC.Authorization |
| Gateway-Controller, ExperimentDataRedactor | /workspace/lac-db/src/backend/LAC.GatewayService |
| ExperimentController (Microservice) | /workspace/lac-db/src/backend/LAC.ExperimentService |
| UserModel, UserRole | /workspace/lac-db/src/backend/LAC.Core |
-->

---

## Ableitung (Fallback)

```
MCP projectPath = "/workspace/" + normalize({code-root}-relativer Pfad)
```

Host-Pfade stehen in `.cursor/skill-params.json`. Smoke-Tests: [mcp-smoke-test.md](./mcp-smoke-test.md).
