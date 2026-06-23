
Wir arbeiten an einem Angular-Architektur-Prüf-Tool als zukünftige Erweiterung
des dev-mcp (Dev.WindowsService.Mcp).

## Kontext

Im Rahmen des [SKILL-NAME]-Features (Orchestrator-Skill für Feature-Umsetzung
in .NET + Angular) haben wir Gate-2 (Statische Analyse) designed. Für .NET
nutzen wir ArchUnitNET — das prüft kompilierte Assemblies via Reflection.
Für Angular nutzen wir eslint-plugin-boundaries — das prüft nur Import-Statements.

## Die Lücke

eslint-plugin-boundaries kann NICHT prüfen:
- Ob eine Klasse namens *ApiService wirklich im richtigen Ordner liegt
  (z. B. core/api/) — Naming + Placement
- Ob ein *ApiService ausschließlich HttpClient injiziert
  (kein Business-Logic-Schmuggel)
- Ob HttpClient direkt in einem Feature-Service injiziert wird
  (statt einen ApiService zu nutzen)

## Architektur-Vision (Zonierung)

src/app/
├── core/
│   └── api/          ← ApiServices (nur HttpClient, keine Logik)
├── shared/
│   ├── components/   ← Dumb/Presentational Components
│   ├── pipes/
│   └── utils/
└── features/
    └── <feature>/
        ├── pages/       ← Smart/Container Components
        ├── components/  ← Feature-spezifische Dumb Components
        └── services/    ← Feature-Services (nutzen ApiServices, kein HttpClient direkt)

## Geplantes Tool: analyze_angular_architecture

Neues dev-mcp-Tool (Erweiterung, separates Feature):

Input:  projectPath (Windows-Absolutpfad)
Output: {
  misplaced: [{ class, path, expectedZone }],
  httpInFeatureService: [{ class, path }],  // HttpClient direkt injiziert
  namingViolations: [{ file, issue }]       // *ApiService-Suffix aber kein HTTP
}

Ausgabe token-optimiert (maschinen-dicht, gerade noch menschenlesbar).

## Aufgabe

Design + Umsetzung dieses Tools in Dev.WindowsService.Mcp
(C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.WindowsService.Mcp\).
Pfade immer als Windows-Absolutpfade. Kein Docker-Prefix.

Vor Implementierung: Repo-Struktur des MCP-Servers lesen und verstehen
wie bestehende Tools (z. B. lint_angular_project) aufgebaut sind.