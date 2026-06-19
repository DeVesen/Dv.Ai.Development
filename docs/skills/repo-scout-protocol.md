# Repo Scout Protocol

Verbindliche MCP-Recherche-Kette für Read-only-Erkundungen: Code-Landkarten, `repo-check`-Phasen und `plan-agent-scout`-Läufe. Verhindert vorzeitigen Grep-Fallback — erst MCP vollständig durchlaufen, dann Grep.

**Trigger:** `repo-check`, `buddy repo-check`, `Code-Scout`, `Code-Landkarte`, `plan-agent-scout`  
**Opt-out:** `ohne repo-scout-protocol`

---

## MCP-Routing-Matrix

| Situation | Erster MCP | Fallback |
|-----------|-----------|---------|
| Unbekanntes Symbol / Klasse / Methode | `codebase-analyzer` → `index_project` / `find_in_index` | `dev-filesystem-mcp` |
| Bekanntes Symbol, Pfad unbekannt | `dev-filesystem-mcp` | Grep |
| Bekannter Pfad | `dev-filesystem-mcp` → `read_file` | Read |
| Workflow-Artefakte (Skills/Agents/Packages) | Glob/Read direkt | — |
| `find_in_index` liefert leer | `dev-filesystem-mcp` → `find_files` | Grep |

**Pfad-Präfixe:**
- `codebase-analyzer` → `/workspace/...`
- `dev-filesystem-mcp` → `/project/...`

---

## Scout-Protokoll-Tabelle

Jeder Scout dokumentiert seine Erkenntnisse in einer Tabelle:

| Bereich | Pfad | Relevante Symbole | Nachbarschaft |
|---------|------|-------------------|---------------|
| … | … | … | … |

---

## Hard-Stop-Regeln

- Kein Grep **bevor** die MCP-Sequenz vollständig abgearbeitet ist
- Grep nur nach MCP-BLOCKER (MCP nicht erreichbar) oder nach vollständigem MCP-Durchlauf
- Schema des MCP-Tools vor dem Aufruf lesen (`codebase-analyzer` hat 31 Tools)

---

## Zusammenspiel mit anderen Skills

- **MCP-Details:** [`codebase-analyzer`](./codebase-analyzer.md), [`dev-tooling-mcp`](./dev-tooling-mcp.md)
- **Fallback-Kette:** [`docs/mcp/scout-fallback-chain.md`](../mcp/scout-fallback-chain.md)
- **Eingebettet in:** [`planning-workflow`](./planning-workflow.md) (Phase 3), [`buddy-agent`](./buddy-agent.md) (repo-check)
