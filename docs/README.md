# docs

Dokumentation für Skills, MCP-Server und Enforcement-Referenzen.

---

## Struktur

```
docs/
├── mcp/                        MCP-Server-Referenzen
│   ├── build-log-filter.md
│   ├── codebase-analyzer.md
│   └── dev-mcp.md
├── skills/                     Skill-Dokumentation (Verwendung + Sub-Agents)
│   ├── feature-delivery.md
│   ├── acceptance-design.md
│   ├── codebase-analyzer.md
│   ├── build-log-filter.md
│   ├── dev-tooling-mcp.md
│   ├── angular-developer.md
│   ├── ado.md
│   ├── utility-skills.md
│   └── angular-material-v22-components.md
├── silent-shortcut-prevention.md   Enforcement: MCP-First-Policy, Anti-Shortcuts
└── output-style-enforcement.md     Enforcement: Agent-Output-Stil
```

---

## Skills

| Dokument | Skills |
|----------|--------|
| [`skills/feature-delivery.md`](./skills/feature-delivery.md) | feature-delivery (Orchestrator: Planung + Implementierung + Review-on-Demand) |
| [`skills/acceptance-design.md`](./skills/acceptance-design.md) | acceptance-design |
| [`skills/codebase-analyzer.md`](./skills/codebase-analyzer.md) | codebase-analyzer |
| [`skills/build-log-filter.md`](./skills/build-log-filter.md) | build-log-filter |
| [`skills/dev-tooling-mcp.md`](./skills/dev-tooling-mcp.md) | dev-tooling-mcp, dev-filesystem-mcp, dev-angular-mcp, dev-dotnet-mcp |
| [`skills/angular-developer.md`](./skills/angular-developer.md) | angular-developer, angular-new-app, angular-material |
| [`skills/ado.md`](./skills/ado.md) | ado + ado-agents |
| [`skills/utility-skills.md`](./skills/utility-skills.md) | delivery-inspection, skill-creator, conversation-insights, describe-as, commit-message, caveman, backend-ef-migrations |

---

## MCP-Server

| Dokument | MCP-Server |
|----------|-----------|
| [`mcp/build-log-filter.md`](./mcp/build-log-filter.md) | Build.Log.Filter.Mcp — Build-/Test-Log-Verdichtung |
| [`mcp/codebase-analyzer.md`](./mcp/codebase-analyzer.md) | Codebase.Analyzer.Mcp — statische Analyse, 31 Tools |
| [`mcp/dev-mcp.md`](./mcp/dev-mcp.md) | Dev.Mcp — vereinheitlichtes stdio-Tooling: Filesystem + .NET + Angular + Git + Patch (49 Tools) |

---

## Enforcement

| Dokument | Inhalt |
|----------|--------|
| [`silent-shortcut-prevention.md`](./silent-shortcut-prevention.md) | MCP-First-Policy, Anti-Shortcut-Regeln |
| [`output-style-enforcement.md`](./output-style-enforcement.md) | Agent-Output-Stil-Kanon |
