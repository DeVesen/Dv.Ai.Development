# Build.Log.Filter.Mcp — MCP Output-Filter (C# / .NET 9)

Lokaler **MCP-Server** (stdio), der Roh-Ausgaben von Build- und Test-Tools auf **Fehler, Warnungen, Zusammenfassungen und Stacktraces** reduziert. Optional **JSON** statt Text.

## Voraussetzungen

- [.NET 9 SDK](https://dotnet.microsoft.com/download)

## Lokal starten

```bash
dotnet run --project Build.Log.Filter.Mcp
```

Der Prozess bleibt offen und spricht MCP über **stdin/stdout**; Logs gehen nach **stderr**.

## Cursor einbinden

Beispielkonfiguration: [.cursor/mcp.json](.cursor/mcp.json) (Pfade sind relativ zum **Workspace-Root**).

```json
{
  "mcpServers": {
    "Build.Log.Filter.Mcp": {
      "command": "dotnet",
      "args": ["run", "--project", "Build.Log.Filter.Mcp/Build.Log.Filter.Mcp.csproj"]
    }
  }
}
```

Für stabilere Starts kannst du stattdessen `dotnet publish` nutzen und `dotnet` mit Pfad zur gebauten DLL verwenden.

### Tools

| Tool | Beschreibung |
|------|----------------|
| `filter_output` | `raw` (kompletter Log), `tool_type`, `output_format` (`text` oder `json`) |
| `filter_output_stream` | `chunk`, `tool_type`, `output_format`, `session_id`, `is_final` |

**tool_type:** `DotnetBuild`, `DotnetTest`, `NgBuild`, `NgTest`, `Jest`, `Vitest`, `NodeGeneric`

**Streaming:** Pro Log-Stream eine feste `session_id` verwenden; am Ende **`is_final: true`** setzen, damit die letzte Zeile ohne `\n` geflusht und die Session geschlossen wird. Rückgabe ist die **kumulierte** Filterung aller bisher vollständigen Zeilen (wie ein erneuter Vollfilter-Lauf auf dem Buffer).

## Docker

Image bauen und ausführen — für stdio **interaktiv** (`-i`), sonst kann der Client nicht schreiben:

```bash
docker build -t Build.Log.Filter.Mcp-mcp .
docker run -i --rm Build.Log.Filter.Mcp-mcp
```

Mit Compose ist `stdin_open: true` gesetzt (siehe [docker-compose.yml](docker-compose.yml)).

**Abhängigkeiten:** Das Projekt targetet `net9.0`, nutzt aber `Microsoft.Extensions.Hosting` in Version **10.x**. Das passt zu **ModelContextProtocol**, das `Microsoft.Extensions.*` und `System.Text.Json` **10.x** transitiv mitbringt — ein Downgrade der Hosting-Pakete auf 9.x würde gegen diese Kette arbeiten und ist nicht empfehlenswert.

## Tests

```bash
dotnet test
```

## Limits (Default)

- Maximale Roh-Eingabe `filter_output`: 5.000.000 Zeichen  
- Maximale Chunk-Größe `filter_output_stream`: 256.000 Zeichen  
- Session-Puffer: 5.000.000 Zeichen, TTL 30 Minuten, max. 1024 gleichzeitige Sessions  

Anpassung: `FilterLimits` in [Program.cs](Build.Log.Filter.Mcp/Program.cs) registrieren.

## Architektur

- Parser unter `Build.Log.Filter.Mcp/Filtering/`  
- Streaming unter `Build.Log.Filter.Mcp/Streaming/`  
- MCP-Tools unter `Build.Log.Filter.Mcp/Tools/`  

HTTP/SSE-Transport ist **nicht** enthalten (kann später mit `ModelContextProtocol.AspNetCore` ergänzt werden).
