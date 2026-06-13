# MCP: build-log-filter

**Build.Log.Filter.Mcp** — Reduziert rohe Build- und Test-Ausgaben auf das Wesentliche.

> **Agent-Kanon:** [`skills/build-log-filter/SKILL.md`](../.claude/skills/build-log-filter/SKILL.md) — Tools, `tool_type`-Mapping, JSON. **Verifikations-Prozess:** Rule `build-log-filter.mdc` (nicht im Skill).

| Eigenschaft | Wert |
|-------------|------|
| Stack | C# / .NET 9 |
| Transport | stdio |
| Log-Port | 8089 (interner HTTP-Log-Viewer, nicht MCP-Transport) |
| Volume-Mount | ❌ nicht erforderlich |
| autoApprove | ❌ (alle Tool-Aufrufe erfordern Bestätigung) |
| Image | `devesen/build-log-filter-mcp:latest` |

---

## Was macht dieser Server?

Build- und Test-Tools produzieren oft hunderte Zeilen Output — der überwiegende Teil davon ist irrelevant. `build-log-filter` filtert diesen Roh-Output **rein lokal** (kein LLM-Aufruf, kein API-Key) und liefert nur:

- ❌ **Fehler** (Compile-Fehler, Test-Failures)
- ⚠️ **Warnungen**
- 📋 **Zusammenfassungen** (z.B. `Build succeeded. 0 Error(s), 2 Warning(s)`)
- 🔍 **Stacktraces** bei Exceptions

Das spart Token und macht den Output für den AI-Agent direkt verwertbar.

---

## Unterstützte Tool-Typen

| `tool_type` | Beschreibung |
|-------------|-------------|
| `DotnetBuild` | `dotnet build` Ausgabe |
| `DotnetTest` | `dotnet test` Ausgabe |
| `NgBuild` | `ng build` Ausgabe |
| `NgTest` | `ng test` Ausgabe |
| `Jest` | Jest Test-Runner |
| `Vitest` | Vitest Test-Runner |
| `NodeGeneric` | Generische Node.js Ausgabe |

---

## Tools

### `filter_output`

Filtert einen kompletten Log auf einmal.

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `raw` | string | Der komplette Log-Output |
| `tool_type` | string | Typ des Build-/Test-Tools (s.o.) |
| `output_format` | string | `text` (Standard) oder `json` |

**Limits:** Maximal 5.000.000 Zeichen pro Aufruf.

---

### `filter_output_stream`

Verarbeitet Log-Output chunk-weise während er noch produziert wird.

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `chunk` | string | Nächster Log-Chunk |
| `tool_type` | string | Typ des Build-/Test-Tools |
| `output_format` | string | `text` oder `json` |
| `session_id` | string | Feste ID für den gesamten Stream |
| `is_final` | boolean | `true` beim letzten Chunk |

**Wichtig:** Dieselbe `session_id` für alle Chunks eines Streams verwenden. Bei `is_final: true` wird die Session geschlossen und der letzte Chunk auch ohne abschließendes `\n` geflusht. Die Rückgabe ist die **kumulierte** Filterung des gesamten Buffers.

**Limits:** Maximal 256.000 Zeichen pro Chunk, Session-Puffer bis 5 Mio. Zeichen, TTL 30 Minuten, max. 1024 parallele Sessions.

---

## Beispiel-Output (`json`-Format)

```json
{
  "errors": [
    {
      "file": "src/app/user.service.ts",
      "line": 42,
      "message": "Property 'name' does not exist on type 'User'"
    }
  ],
  "warnings": [
    {
      "file": "src/app/app.component.ts",
      "line": 15,
      "message": "Variable 'x' is declared but never used"
    }
  ],
  "summary": "Build failed: 1 error, 1 warning",
  "stacktraces": []
}
```

---

## Konfiguration (mcp.json)

```jsonc
"build-log-filter": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8089:8089",   // Log-Viewer (Diagnose, optional)
    "devesen/build-log-filter-mcp:latest"
  ],
  "transport": "stdio"
  // Kein autoApprove — Tool-Aufrufe erfordern Bestätigung
}
```

---

## Lokal bauen & starten

```bash
# Aus dem Quellcode (im Mcp-Servers/Build.Log.Filter.Mcp/ Verzeichnis)
dotnet run --project Build.Log.Filter.Mcp

# Docker-Image bauen
docker build -t build-log-filter-mcp .
docker run -i --rm build-log-filter-mcp
```

---

## Architektur

```
Build.Log.Filter.Mcp/
├── Filtering/    → Parser für die verschiedenen Tool-Typen
├── Streaming/    → Session-Management für chunk-weises Streaming
└── Tools/        → MCP-Tool-Definitionen
```

HTTP/SSE-Transport ist nicht enthalten — der Server kommuniziert ausschließlich über stdio.
