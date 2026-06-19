---
name: dev-dotnet-mcp
description: >
  VERALTET — dieser MCP ist in dev-mcp integriert. Lade stattdessen den dev-mcp Skill.
  Trigger wie bisher: create_dotnet_solution, scaffold_dotnet_project, rename_file,
  create_directory_structure, build_dotnet_solution, test_dotnet_solution,
  dotnet new, dotnet build, dotnet test, .NET bauen/testen.
when_to_use: >
  Dieser Skill ist veraltet. Lade stattdessen: dev-mcp (alle 18 Tools in einem stdio-Prozess).
  Die .NET-Tools sind identisch in dev-mcp verfügbar.
  Wichtige Änderung: Pfade sind jetzt Windows-Absolutpfade (C:\...), NICHT /workspace/...
---

> **VERALTET** — `dev-dotnet-mcp` (Docker) wurde in **`dev-mcp`** (stdio, native exe) integriert.

Lade den Skill **`dev-mcp`** — alle .NET-Tools sind dort identisch verfügbar.

**Wichtige Änderung gegenüber altem dev-dotnet-mcp:**
- Pfade: `C:\Develop\MyProject\...` statt `/workspace/...`
- Kein Docker, kein Volume-Mount
- Server: stdio (`C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`)

Vollständiger Kanon: `.claude/skills/dev-mcp/SKILL.md`
