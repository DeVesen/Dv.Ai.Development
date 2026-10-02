# Dv.Ai.Development

Werkzeugkasten für KI-gestützte Softwareentwicklung mit [Claude Code](https://claude.com/claude-code): **Plugins** (Skills, Agents, Hooks) und **MCP-Server**, die zusammen einen durchgängigen Workflow von der Idee bis zur geprüften Umsetzung abdecken, für .NET und Angular.

## Inhalt

| Verzeichnis | Was drin ist |
|---|---|
| [`plugins/`](plugins/README.md) | Claude-Code-Plugins: Workflow (`dv-forge`), Stack-Wissen (`dv-dotnet`, `dv-angular`), Design-Prinzipien (`dv-craft`), Projektwissen (`dv-working-capturing`), Projektstart (`dv-kickoff`), Werkzeuge (`dv-toolbelt`) |
| [`Mcp-Servers/`](Mcp-Servers/README.md) | Lokale MCP-Server: Build-/Test-Log-Filter, Code-Analyse, Dateisystem- und Toolchain-Zugriff |

## Plugins im Überblick

| Plugin | Zweck |
|---|---|
| [`dv-forge`](plugins/forge/README.md) | Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops |
| [`dv-dotnet`](plugins/dotnet/README.md) | .NET-Skills: Toolchain, EF-Migrations, xUnit-Konventionen |
| [`dv-angular`](plugins/angular/README.md) | Angular-Skills: Komponenten, Signals, Routing, Forms, Testing, Toolchain |
| [`dv-craft`](plugins/craft/README.md) | Software-Design-Skills: Clean Code, Architekturstile, Modulith, Testing |
| [`dv-working-capturing`](plugins/working-capturing/README.md) | Projektwissen festhalten: Glossar, Modul- und Feature-Profile |
| [`dv-kickoff`](plugins/kickoff/README.md) | Projekt-Kickoff: Brief, Architekturentwurf, Orientierung für Agenten |
| [`dv-toolbelt`](plugins/toolbelt/README.md) | Werkzeug-Skills: CLAUDE.md prüfen, Skills schreiben und validieren, Prozess-Retrospektive |

## MCP-Server im Überblick

| Server | Zweck |
|---|---|
| [`Build.Log.Filter.Mcp`](Mcp-Servers/Build.Log.Filter.Mcp/README.md) | Reduziert Build- und Test-Logs auf Fehler, Warnungen und Zusammenfassungen (.NET) |
| [`Codebase.Analyzer.Mcp`](Mcp-Servers/Codebase.Analyzer.Mcp/README.md) | Statische Code-Analyse und Index für Angular und .NET (TypeScript) |
| [`Dev.Mcp`](Mcp-Servers/Dev.Mcp/README.md) | Dateisuche, Patches, Scaffolding sowie Build, Test und Lint für .NET und Angular (.NET) |

## Plugins installieren

Dieses Repository ist ein Claude-Code-Marketplace. In Claude Code:

```text
/plugin marketplace add DeVesen/Dv.Ai.Development
/plugin install dv-forge@dv-ai-development
```

Der Plugin-Name im Install-Befehl entspricht dem Namen aus der Tabelle oben, zum Beispiel `dv-dotnet@dv-ai-development`. Der Marketplace selbst ist in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) beschrieben.

## MCP-Server einrichten

Jeder Server hat ein eigenes README mit Voraussetzungen, Start und Client-Konfiguration. Nachschlagen im jeweiligen Unterordner von [`Mcp-Servers/`](Mcp-Servers/README.md).
