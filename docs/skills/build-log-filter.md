# Build Log Filter

MCP-gestützte Verdichtung von Shell-Build-/Test-Logs auf Fehler und Warnings. Ausschließlich für `ng serve`, `npm start` und den Shell-Fallback nach expliziter BLOCKER-Freigabe.

**Trigger:** `ng serve`, `npm start`, Shell-Fallback nach BLOCKER-Freigabe  
**MCP-Server:** `build-log-filter` (Port 8089)

---

## Scope

| In Scope | Außerhalb Scope |
|----------|----------------|
| `ng serve` | `ng build` → `dev-angular-mcp` |
| `npm start` | `ng test` → `dev-angular-mcp` |
| Shell-Fallback (BLOCKER) | `dotnet build` → `dev-dotnet-mcp` |
| | `dotnet test` → `dev-dotnet-mcp` |

**Regel:** `ng build` / `ng test` / `dotnet build` / `dotnet test` laufen **immer via MCP** — build-log-filter nur im Shell-Fallback nach expliziter User-Freigabe.

---

## Tools

| Tool | Wann |
|------|------|
| `filter_output` | Einzel-Log synchron filtern |
| `filter_output_stream` | Gestreamten Output filtern |
| `analyze_build_output` | Strukturierte Fehler-/Warn-Analyse |

### tool_type-Mapping

| Befehl | tool_type |
|--------|-----------|
| `ng build` | `NgBuild` |
| `ng test` | `NgTest` |
| `ng serve` | `NgServe` |
| `dotnet build` | `DotnetBuild` |
| `dotnet test` | `DotnetTest` |

---

## Hard Stop bei MCP-Ausfall

Wenn `build-log-filter`-MCP nicht erreichbar:
1. User informieren (BLOCKER)
2. Auf Freigabe warten
3. Kein stilles Weiterlaufen mit ungefiltertem Output

---

## Zusammenspiel mit anderen Skills

- **Ersetzt durch:** [`dev-tooling-mcp`](./dev-tooling-mcp.md) für Build/Test
- **MCP-Details:** [`docs/mcp/build-log-filter.md`](../mcp/build-log-filter.md)
- **Eingebettet in:** [`implementation-workflow`](./implementation-workflow.md) (Shell-Fallback)
