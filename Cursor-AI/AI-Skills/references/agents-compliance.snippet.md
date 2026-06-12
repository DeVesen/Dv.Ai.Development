## Agent-Compliance (AI-Skills — verbindlich)

> Kanon (deployt): [{agent-compliance}]({agent-compliance}) · Delegation: [subagent-delegation-boilerplate.md](.cursor/references/subagent-delegation-boilerplate.md)

**Gilt für Orchestrator und jeden Subagent:** Skills und Rules **vollständig laden und strikt einhalten** — nicht nur referenzieren.

| Pflicht | Kanon |
|---------|--------|
| Planung | `@.cursor/skills/planning-workflow` — Phase 1–6 |
| Umsetzung | `@.cursor/skills/implementation-workflow` — Hard Gate, Subagents, Review-Loop max. 3× |
| Build/Test-Logs | Rule `build-log-filter.mdc` — MCP **vor** jeder Diagnose/Freigabe |
| Repo-Scout | `repo-scout-protocol` |

**Orchestrator:** Vor **jeder** Subagent-Delegation den Block aus `subagent-delegation-boilerplate.md` + rollenspezifische `subagent-prompts.md`-Vorlage in den Task-Prompt. Subagent-Rückgaben ohne Compliance/Matrix (bei Build/Test) **ablehnen** und neu delegieren.

**Opt-out:** Nur bei explizitem User-Text (`ohne planning-workflow`, `ohne implementation-skill`, …).
