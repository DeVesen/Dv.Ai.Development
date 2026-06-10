# Projekt MCPs

> **Router** — situative Auswahl. **Kanon** (Tools, Parameter, JSON): jeweiliger Skill unter `.cursor/skills/<name>/SKILL.md`.

Verfügbare MCP-Server in diesem Projekt.
Agents wählen situativ — kein festes Ablaufschema.
Fallback wenn kein MCP verfügbar oder Fehler: Read/Grep mit Begründung.

Dev-Tooling-Routing (filesystem / angular / dotnet): `dev-tooling-mcp/SKILL.md`.

## MCPs

build-log-filter
  Stärken: Build- und Test-Output komprimieren und filtern
  Bevorzugt wenn: Build-Log analysieren · Test-Ergebnis auswerten
  Skill: .cursor/skills/build-log-filter/SKILL.md · Prozess: rules/build-log-filter.mdc

codebase-analyzer
  Stärken: Indexierung, Symbol-Suche, Komplexitätsanalyse, Architektur-Überblick, Refactoring-Safety, Code-Review
  Bevorzugt wenn: Bereich/Symbol unbekannt · Abhängigkeiten analysieren · Code reviewen · Komplexität messen
  Skill: .cursor/skills/codebase-analyzer/SKILL.md
  Mount: /workspace · Parameter: projectPath, filePath

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

dev-filesystem-mcp
  Stärken: Gezieltes Klassen-Lesen, Signaturen, Interface-Implementierungen — token-effizient
  Bevorzugt wenn: konkrete Datei/Klasse bekannt · Public API prüfen · alle Implementierungen eines Interfaces finden
  Skill: .cursor/skills/dev-filesystem-mcp/SKILL.md
  Mount: /project · Parameter: file_path, root (nicht path/filePath)
