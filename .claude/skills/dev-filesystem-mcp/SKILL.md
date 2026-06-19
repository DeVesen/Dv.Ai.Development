---
name: dev-filesystem-mcp
description: >
  VERALTET — dieser MCP ist in dev-mcp integriert. Lade stattdessen den dev-mcp Skill.
  Trigger wie bisher: find_file, find_by_content, find_implementations, read_signatures_only,
  read_method, read_class_summary, Datei/Klasse/Methode lesen/suchen.
when_to_use: >
  Dieser Skill ist veraltet. Lade stattdessen: dev-mcp (alle 18 Tools in einem stdio-Prozess).
  Die Filesystem-Tools (find_file, find_by_content, find_implementations, read_signatures_only,
  read_method, read_class_summary) sind identisch in dev-mcp verfügbar.
  Wichtige Änderung: Pfade sind jetzt Windows-Absolutpfade (C:\...), NICHT /project/...
---

> **VERALTET** — `dev-filesystem-mcp` (Docker) wurde in **`dev-mcp`** (stdio, native exe) integriert.

Lade den Skill **`dev-mcp`** — alle Filesystem-Tools sind dort identisch verfügbar.

**Wichtige Änderung gegenüber altem dev-filesystem-mcp:**
- Pfade: `C:\Develop\MyProject\...` statt `/project/...`
- Kein Docker, kein Volume-Mount
- Server: stdio (`C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`)

Vollständiger Kanon: `.claude/skills/dev-mcp/SKILL.md`
