---
name: dev-angular-mcp
description: >
  VERALTET — dieser MCP ist in dev-mcp integriert. Lade stattdessen den dev-mcp Skill.
  Trigger wie bisher: create_angular_project, ng new, scaffold_angular_component,
  scaffold_angular_service, scaffold_angular_directive, ng generate,
  build_angular_project, test_angular_project, ng build, ng test.
when_to_use: >
  Dieser Skill ist veraltet. Lade stattdessen: dev-mcp (alle 18 Tools in einem stdio-Prozess).
  Die Angular-Tools sind identisch in dev-mcp verfügbar.
  Wichtige Änderung: Pfade sind jetzt Windows-Absolutpfade (C:\...), NICHT /workspace/...
---

> **VERALTET** — `dev-angular-mcp` (Docker) wurde in **`dev-mcp`** (stdio, native exe) integriert.

Lade den Skill **`dev-mcp`** — alle Angular-Tools sind dort identisch verfügbar.

**Wichtige Änderung gegenüber altem dev-angular-mcp:**
- Pfade: `C:\Develop\MyProject\...` statt `/workspace/...`
- Kein Docker, kein Volume-Mount
- Server: stdio (`C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`)

Vollständiger Kanon: `.claude/skills/dev-mcp/SKILL.md`
