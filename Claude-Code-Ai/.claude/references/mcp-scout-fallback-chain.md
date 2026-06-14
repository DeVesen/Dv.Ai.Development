# MCP Scout-Fallback-Kette (Verweis)

**Agent-Kanon:** [repo-scout-protocol/SKILL.md](../skills/repo-scout-protocol/SKILL.md)  
**Menschen-Doku:** [docs/mcp-scout-fallback-chain.md](../../docs/mcp-scout-fallback-chain.md)

Diese Datei ist ein **Alias** — die verbindliche Logik (Routing-Matrix, Hard Rules, Scout-Protokoll-Tabelle) steht im Skill **repo-scout-protocol**. Nicht hier duplizieren.

**Kurzfassung:** Aus Kontext eine **MCP-Sequenz** bauen (typisch codebase-analyzer → dev-filesystem-mcp), vollständig abarbeiten; natives Read/Grep erst nach ausgeschöpfter Kette oder MCP-BLOCKER.

**MCP-Tool-Übersicht:**
- codebase-analyzer (Port 8090, `/workspace/` Prefix): index_project, find_in_index, review_*, analyze_*
- dev-filesystem-mcp (Port 8091, `/project/` Prefix): find_file, find_by_content, find_implementations, read_signatures_only, read_method, read_class_summary

Vollständige Dokumentation: `docs/mcp-codebase-analyzer.md`, `docs/mcp-dev-filesystem.md`
