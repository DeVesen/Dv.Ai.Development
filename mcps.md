# Projekt MCPs

Verfügbare MCP-Server in diesem Projekt.
Agents wählen situativ — kein festes Ablaufschema.
Fallback wenn kein MCP verfügbar oder Fehler: Read/Grep mit Begründung.

## MCPs

codebase-analyzer
  Stärken: Indexierung, Symbol-Suche, Komplexitätsanalyse, Architektur-Überblick, Refactoring-Safety, Code-Review
  Bevorzugt wenn: Bereich/Symbol unbekannt · Abhängigkeiten analysieren · Code reviewen · Komplexität messen

dev-filesystem-mcp
  Stärken: Gezieltes Klassen-Lesen, Signaturen, Interface-Implementierungen — token-effizient
  Bevorzugt wenn: konkrete Datei/Klasse bekannt · Public API prüfen · alle Implementierungen eines Interfaces finden
