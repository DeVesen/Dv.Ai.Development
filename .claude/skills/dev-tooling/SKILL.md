---
name: dev-tooling
description: >
  MCP-Gateway fuer alle drei Dev-MCPs: dev-mcp (49 Tools: Dateien, Build, Test, Scaffolding,
  Git, Patch), codebase-analyzer (43 Tools: Index, Review, Analyse, Symbol-Suche, Domain-Finder),
  build-log-filter (Shell-Logs: ng serve, npm start, Shell-Fallback).
  Laedt den richtigen Detail-Skill je nach Aufgabe. Routing-Trigger: welcher MCP wann,
  dev-mcp vs codebase-analyzer, routing zwischen MCPs, dev-tooling, MCP-Einstieg,
  welches MCP-Tool, MCP-Auswahl.
when_to_use: >
  Aktiviere als ersten Einstieg fuer alle Dev-Tooling-Fragen: Dateien lesen/suchen,
  Build, Test, Scaffolding, Code-Review, Analyse, Metriken, Shell-Logs.
  Routing-Einstieg wenn unklar ist welcher MCP zu verwenden ist.
  Delegate dann an den passenden Detail-Skill: dev-mcp, codebase-analyzer oder build-log-filter.
---

# dev-tooling — MCP-Gateway

Drei MCP-Server, klare Verantwortlichkeiten. Dieser Skill routet zur richtigen Stelle.

---

## Routing-Tabelle

| Aufgabe | MCP | Detail-Skill |
|---------|-----|--------------|
| Datei lesen (`.ts`, `.cs`, `.json`, `.md`, …) | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Dateien nach Muster / Inhalt suchen | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Interface-Implementierungen finden | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Angular-Komponente / Service erzeugen | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Angular bauen (`ng build`) | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Angular testen (`ng test`) | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| .NET bauen (`dotnet build`) | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| .NET testen (`dotnet test`) | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| npm-Script ausfuehren | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Datei patchen / Batch-Ersetzung | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Git-Aenderungen / Rename mit Impact | dev-mcp | [dev-mcp](../dev-mcp/SKILL.md) |
| Code reviewen | codebase-analyzer | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| Projekt indexieren / Symbol suchen | codebase-analyzer | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| Metriken (Komplexitaet, Duplikate, Coverage) | codebase-analyzer | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| Ungetestete public API aufdecken | codebase-analyzer | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| FE↔BE API-Contract pruefen | codebase-analyzer | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| Composite-Analyse (Scout, Slice-Impact) | codebase-analyzer | [codebase-analyzer](../codebase-analyzer/SKILL.md) |
| `ng serve` / `npm start` (Dev-Server) | build-log-filter | [build-log-filter](../build-log-filter/SKILL.md) |
| Shell-Fallback nach BLOCKER-Freigabe | build-log-filter | [build-log-filter](../build-log-filter/SKILL.md) |

**Faustregel:** Lesen · Schreiben · Bauen → `dev-mcp`. Analysieren · Reviewen · Indexieren → `codebase-analyzer`. Shell-Logs → `build-log-filter`.

---

## Detail-Skills

| MCP-Server | Skill | Zweck |
|-----------|-------|-------|
| `dev-mcp` (stdio, `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`) | [dev-mcp](../dev-mcp/SKILL.md) | 49 Tools: Filesystem, Build, Test, Scaffolding, Git, Patch |
| `codebase-analyzer` (Node stdio, Port 5052) | [codebase-analyzer](../codebase-analyzer/SKILL.md) | 43 Tools: Index, Review, Analyse, Domain-Finder, Composite |
| `build-log-filter` (Docker, Port 8089) | [build-log-filter](../build-log-filter/SKILL.md) | Shell-Logs verdichten: ng serve, Shell-Fallback |

Bei tiefer Arbeit mit einem MCP → zugehoerigen Detail-Skill vollstaendig laden.

---

## Hard Stop

Wenn ein benoetigter MCP nicht erreichbar ist:
- **`BLOCKER: [mcp-name] nicht erreichbar`** melden
- Kein stiller Shell-Fallback ohne explizite Nutzerfreigabe
- Erst nach Freigabe: build-log-filter als Shell-Fallback-Route

*Enforcement: `docs/silent-shortcut-prevention.md`*
