# Projekt MCPs

> **Router** — situative Auswahl. **Kanon** (Tools, Parameter, JSON): jeweiliger Skill unter `.cursor/skills/<name>/SKILL.md`.

Verfügbare MCP-Server in diesem Projekt.
Agents wählen situativ — kein festes Ablaufschema außer in **Scout-Phasen**.
**Scout-Phasen** (repo-check, Code-Landkarte, plan-agent-scout): verbindliche **MCP-Sequenz** gemäß `skills/repo-scout-protocol/SKILL.md` (nicht ein MCP → sofort Grep). Menschen-Doku: `docs/mcp-scout-fallback-chain.md`.
Read/Grep nur nach ausgeschöpfter Scout-Kette oder MCP-BLOCKER — mit Scout-Protokoll-Tabelle.

Dev-Tooling-Routing (filesystem / angular / dotnet): `dev-tooling-mcp/SKILL.md`.

## MCPs

codebase-analyzer
  Stärken: Indexierung, Symbol-Suche, Komplexitätsanalyse, Architektur-Überblick, Refactoring-Safety, Code-Review
  Bevorzugt wenn: Bereich/Symbol unbekannt · Abhängigkeiten analysieren · Code reviewen · Komplexität messen
  Skill: .cursor/skills/codebase-analyzer/SKILL.md
  Mount: /workspace · Parameter: projectPath, filePath

dev-filesystem-mcp
  Stärken: Gezieltes Klassen-Lesen, Signaturen, Interface-Implementierungen — token-effizient
  Bevorzugt wenn: konkrete Datei/Klasse bekannt · Public API prüfen · alle Implementierungen eines Interfaces finden
  Skill: .cursor/skills/dev-filesystem-mcp/SKILL.md
  Mount: /project · Parameter: file_path, root (nicht path/filePath)

dev-angular-mcp
  Stärken: Angular-Komponenten und Services scaffolden
  Bevorzugt wenn: neue Komponente oder Service erstellen
  Skill: .cursor/skills/dev-angular-mcp/SKILL.md
  Kein Mount · Parameter: project_root (Host-Absolut)

dev-dotnet-mcp
  Stärken: .NET Projekte und Verzeichnisstrukturen scaffolden
  Bevorzugt wenn: neues .NET-Projekt erstellen · Verzeichnisstruktur anlegen
  Skill: .cursor/skills/dev-dotnet-mcp/SKILL.md
  Kein Mount · Parameter: output_path, base_path (Host-Absolut)

build-log-filter
  Stärken: Build- und Test-Output komprimieren und filtern
  Bevorzugt wenn: Build-Log analysieren · Test-Ergebnis auswerten
  Skill: .cursor/skills/build-log-filter/SKILL.md · Prozess: rules/build-log-filter.mdc
