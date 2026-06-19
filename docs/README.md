# docs

Dokumentation für Skills, MCP-Server und Enforcement-Referenzen.

---

## Struktur

```
docs/
├── mcp/                        MCP-Server-Referenzen
│   ├── build-log-filter.md
│   ├── codebase-analyzer.md
│   ├── dev-filesystem.md
│   ├── dev-angular.md
│   ├── dev-dotnet.md
│   └── scout-fallback-chain.md
├── skills/                     Skill-Dokumentation (Verwendung + Sub-Agents)
│   ├── planning-workflow.md
│   ├── implementation-workflow.md
│   ├── buddy-agent.md
│   ├── repo-scout-protocol.md
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
| [`skills/planning-workflow.md`](./skills/planning-workflow.md) | planning-workflow + 10 Plan-Agents |
| [`skills/implementation-workflow.md`](./skills/implementation-workflow.md) | implementation-workflow + 8 Implement-Agents |
| [`skills/buddy-agent.md`](./skills/buddy-agent.md) | buddy-agent |
| [`skills/repo-scout-protocol.md`](./skills/repo-scout-protocol.md) | repo-scout-protocol |
| [`skills/codebase-analyzer.md`](./skills/codebase-analyzer.md) | codebase-analyzer |
| [`skills/build-log-filter.md`](./skills/build-log-filter.md) | build-log-filter |
| [`skills/dev-tooling-mcp.md`](./skills/dev-tooling-mcp.md) | dev-tooling-mcp, dev-filesystem-mcp, dev-angular-mcp, dev-dotnet-mcp |
| [`skills/angular-developer.md`](./skills/angular-developer.md) | angular-developer, angular-developer-extension, angular-new-app, angular-refactor, angular-material, angular-material-custom-input, angular-cache-busting |
| [`skills/ado.md`](./skills/ado.md) | ado + ado-agents |
| [`skills/utility-skills.md`](./skills/utility-skills.md) | work-review, work-review-iterative, skill-creator, conversation-insights, describe-as, commit-message, caveman, backend-ef-migrations |

---

## MCP-Server

| Dokument | MCP-Server |
|----------|-----------|
| [`mcp/build-log-filter.md`](./mcp/build-log-filter.md) | Build.Log.Filter.Mcp — Build-/Test-Log-Verdichtung |
| [`mcp/codebase-analyzer.md`](./mcp/codebase-analyzer.md) | Codebase.Analyzer.Mcp — statische Analyse, 31 Tools |
| [`mcp/dev-filesystem.md`](./mcp/dev-filesystem.md) | Dev.Filesystem.Mcp — token-effizientes Lesen |
| [`mcp/dev-angular.md`](./mcp/dev-angular.md) | Dev.Angular.Mcp — Angular-Scaffolding + Build/Test |
| [`mcp/dev-dotnet.md`](./mcp/dev-dotnet.md) | Dev.Dotnet.Mcp — .NET-Scaffolding + Build/Test |
| [`mcp/scout-fallback-chain.md`](./mcp/scout-fallback-chain.md) | Scout-MCP-Fallback-Kette |

---

## Enforcement

| Dokument | Inhalt |
|----------|--------|
| [`silent-shortcut-prevention.md`](./silent-shortcut-prevention.md) | MCP-First-Policy, Anti-Shortcut-Regeln |
| [`output-style-enforcement.md`](./output-style-enforcement.md) | Agent-Output-Stil-Kanon |
