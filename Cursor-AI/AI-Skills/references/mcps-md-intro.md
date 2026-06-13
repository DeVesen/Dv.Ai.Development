# Projekt MCPs

Verfügbare MCP-Server in diesem Projekt.
Agents wählen situativ — kein festes Ablaufschema außer in Scout-Phasen.
Scout-Phasen (repo-check, Code-Landkarte, plan-agent-scout): Kette gemäß skills/repo-scout-protocol/SKILL.md.
Fallback wenn kein MCP verfügbar oder Fehler: Read/Grep mit Begründung (nach Scout-Kette).
**Ausnahme:** Build-/Test-Diagnose im Scope von `build-log-filter` — kein Read/Grep-Fallback; Hard Stop gemäß `rules/build-log-filter.mdc`.

## MCPs

