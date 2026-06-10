# Agents

Projekt-Agentenindex. Abschnitt **Agent-Compliance** wird bei AI-Skills Install/Update automatisch gepflegt (Marker-Block).

---

## Workspace parameters

| Parameter | Value |
|-----------|-------|
| `{workspace-root}` | `.` |
| `{code-root}` | {code-root} |
| `{frontend-path}` | {frontend-path} |
| `{backend-path}` | {backend-path} |

Weitere deployte Referenzen: `{verification-commands}`, `{mcp-project-paths}`, `{agent-compliance}`.

---

<!-- ai-skills:agent-compliance:start -->
<!-- Inhalt wird von update-cursor-skills.ps1 aus agents-compliance.snippet.md gesetzt -->
<!-- ai-skills:agent-compliance:end -->

---

## Skills & Agents (projektspezifisch ergänzen)

| Trigger / Rolle | Skill / Agent |
|-----------------|---------------|
| `plane`, Planung | planning-workflow |
| `implementiere`, Umsetzung | implementation-workflow |
| Build/Test | build-log-filter + `{verification-commands}` |
