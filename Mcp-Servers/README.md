# MCP-Server

Lokale [MCP](https://modelcontextprotocol.io)-Server (stdio), die Claude Code und anderen MCP-Clients zusätzliche Werkzeuge geben. Sie ergänzen die Plugins aus [`plugins/`](../plugins/README.md), zum Beispiel für Build, Test und Code-Analyse.

## Übersicht

| Server | Technik | Zweck |
|---|---|---|
| [`Build.Log.Filter.Mcp`](Build.Log.Filter.Mcp/README.md) | C# / .NET 9 | Reduziert Roh-Logs von Build- und Test-Tools auf Fehler, Warnungen, Zusammenfassungen und Stacktraces |
| [`Codebase.Analyzer.Mcp`](Codebase.Analyzer.Mcp/README.md) | TypeScript / Node | Statische Analyse und Index für Angular und .NET: Reviews, Komplexität, Dead Code, Testabdeckung |
| [`Dev.Mcp`](Dev.Mcp/README.md) | C# / .NET | Dateisuche und -änderung, Scaffolding, Build, Test und Lint für .NET und Angular |

## Gemeinsamkeiten

- Kommunikation über **stdin/stdout**, Logs gehen nach stderr.
- Jeder Server läuft lokal und wird im MCP-Client (zum Beispiel Claude Code oder Claude Desktop) als eigener Eintrag konfiguriert.
- Voraussetzungen, Start und Konfiguration stehen im README des jeweiligen Servers.
