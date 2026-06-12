# Mcp-Servers

MCP-Server-Implementierungen für Angular- und .NET-Entwicklung. Alle Server laufen als **Docker-Container** und sprechen das [Model Context Protocol](https://modelcontextprotocol.io) über stdio.

---

## Übersicht

```
Mcp-Servers/
├── Build.Log.Filter.Mcp/    → Build-/Test-Output komprimieren
├── Codebase.Analyzer.Mcp/   → Statische Code-Analyse & Reviews
├── Dev.Filesystem.Mcp/      → Token-effizientes Datei-Lesen
├── Dev.Angular.Mcp/         → Angular-Scaffolding + Build + Test
└── Dev.Dotnet.Mcp/          → .NET-Scaffolding + Build + Test
```

---

## Server im Detail

### `build-log-filter` — Build.Log.Filter.Mcp

**Stack:** C# / .NET 9 · **Log-Port:** 8089 · **Volume-Mount:** ❌ nicht erforderlich · **autoApprove:** ❌ (Bestätigung erforderlich)

Reduziert rohe Build- und Test-Ausgaben auf das Wesentliche: Fehler, Warnungen, Zusammenfassungen und Stacktraces. Unterstützt Einzel- und Streaming-Verarbeitung.

| Tool | Beschreibung |
|------|-------------|
| `filter_output` | Kompletten Log filtern (bis 5 Mio. Zeichen) |
| `filter_output_stream` | Chunk-weises Streaming mit Session-ID |

**Unterstützte Tool-Typen:** `DotnetBuild`, `DotnetTest`, `NgBuild`, `NgTest`, `Jest`, `Vitest`, `NodeGeneric`

```jsonc
// mcp.json
"build-log-filter": {
  "command": "docker",
  "args": ["run", "-i", "--rm", "-p", "127.0.0.1:8089:8089", "devesen/build-log-filter-mcp:latest"],
  "transport": "stdio"
}
```

➡️ Details: [`docs/mcp/build-log-filter.md`](../docs/mcp/build-log-filter.md)

---

### `codebase-analyzer` — Codebase.Analyzer.Mcp

**Stack:** Node.js / TypeScript · **Log-Port:** 8090 · **Volume-Mount:** ✅ **erforderlich** · **Kein API-Key erforderlich** (rein statische AST-Analyse)

> Das Projekt-Verzeichnis muss als `/workspace` gemountet werden. Der Server liest Dateien direkt über das Dateisystem und analysiert sie per AST (ts-morph für TypeScript/Angular, Roslyn für C#/.NET) — ohne externe LLM-Aufrufe.

Vollständige statische Code-Analyse für Angular und .NET/C#: SOLID, Security, Performance, Architektur, AST, Symbol-Suche, Refactoring-Safety und automatische Komplexitätsmessung.

| Kategorie | .NET / C# | Angular / TypeScript |
|-----------|-----------|----------------------|
| SOLID & Clean Code | ✅ | ✅ |
| Security | ✅ SQL Injection, Secrets, CORS | ✅ XSS, innerHTML, Token Storage |
| Performance | ✅ N+1, IQueryable, Caching | ✅ OnPush, Signals, trackBy |
| Angular Best Practices | — | ✅ Signals, inject(), @if/@for |

**Wichtige Tools:**

| Tool | Beschreibung |
|------|-------------|
| `review_file` | Einzelne Datei reviewen |
| `review_code` | Code-String reviewen (Copy-Paste) |
| `review_git_diff` | Alle geänderten Dateien im Git-Diff |
| `review_files_batch` | Mehrere Dateien auf einmal |
| `index_project` | Projekt indizieren (Symbol-Suche) |
| `find_symbol_references` | Alle Referenzen eines Symbols finden |
| `analyze_complexity` | Zyklomatische Komplexität messen |
| `detect_god_classes` | God-Classes & Aufspaltungs-Vorschläge |
| `analyze_advanced_all` | Vollständige Analyse (Nullability, DIP, etc.) |

```jsonc
// mcp.json — Volume-Mount auf Workspace-Root!
"codebase-analyzer": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-v", "${workspaceFolder}:/workspace:ro",
    "devesen/codebase-analyzer-mcp:latest"
  ]
}
```

➡️ Details: [`docs/mcp/codebase-analyzer.md`](../docs/mcp/codebase-analyzer.md)

---

### `dev-filesystem-mcp` — Dev.Filesystem.Mcp

**Stack:** C# / .NET · **Port:** 8091 · **Volume-Mount:** ✅ **erforderlich**

> Das Projekt-Verzeichnis muss als `/project` gemountet werden.

Token-effizientes Lesen und Suchen in `.cs`- und `.ts`-Dateien. Liefert gezielt Signaturen, Methoden oder Klassen-Zusammenfassungen — statt ganze Dateien zu lesen.

| Tool | Beschreibung |
|------|-------------|
| `find_file` | Dateien per Glob-Pattern suchen |
| `find_by_content` | Regex-Suche im Dateiinhalt |
| `find_implementations` | Alle Implementierungen eines Interfaces/Types |
| `read_signatures_only` | Nur Public API einer Datei lesen |
| `read_method` | Einzelne Methode lesen |
| `read_class_summary` | Klassen-Übersicht (Properties + Signaturen) |

```jsonc
// mcp.json — Volume-Mount + PROJECT_ROOT env!
"dev-filesystem-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-v", "${workspaceFolder}:/project:ro",
    "-e", "PROJECT_ROOT=/project",
    "devesen/dev-filesystem-mcp:latest"
  ]
}
```

➡️ Details: [`docs/mcp/dev-filesystem.md`](../docs/mcp/dev-filesystem.md)

---

### `dev-angular-mcp` — Dev.Angular.Mcp

**Stack:** C# / .NET · **Log-Port:** 8092 · **Volume-Mount:** ✅ **erforderlich** — `${workspaceFolder}:/workspace`

Angular-Scaffolding via `ng generate` sowie Build und Test via `ng build` / `ng test`. Das Projekt-Verzeichnis wird als `/workspace` gemountet — alle Pfade im Container beginnen mit `/workspace/...`.

**Internes Output-Filtering:** `build_angular_project` und `test_angular_project` führen `ng` als Subprocess aus. Die rohe stdout/stderr verlässt den Server nie — der Agent erhält ausschließlich ein strukturiertes JSON-Ergebnis (`success`, `errors[]`, `warnings[]`, `summary`, `exitCode`).

| Tool | Beschreibung |
|------|-------------|
| `scaffold_angular_component` | Standalone-Komponente via `ng generate` |
| `scaffold_angular_service` | Service via `ng generate` |
| `build_angular_project` | `ng build` — strukturiertes Ergebnis |
| `test_angular_project` | `ng test --watch=false` — strukturiertes Ergebnis |

```jsonc
// mcp.json
"dev-angular-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8092:8092",
    "-v", "${workspaceFolder}:/workspace",
    "devesen/dev-angular-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "scaffold_angular_component",
    "scaffold_angular_service",
    "build_angular_project",
    "test_angular_project"
  ]
}
```

➡️ Details: [`docs/mcp/dev-angular.md`](../docs/mcp/dev-angular.md)

---

### `dev-dotnet-mcp` — Dev.Dotnet.Mcp

**Stack:** C# / .NET · **Log-Port:** 8093 · **Volume-Mount:** ✅ **erforderlich** — `${workspaceFolder}:/workspace`

.NET-Scaffolding via `dotnet new`, JSON-basierte Verzeichnisstruktur-Generierung sowie Build und Test via `dotnet build` / `dotnet test`. Das Projekt-Verzeichnis wird als `/workspace` gemountet — alle Pfade im Container beginnen mit `/workspace/...`.

**Internes Output-Filtering:** `build_dotnet_solution` und `test_dotnet_solution` führen `dotnet` als Subprocess aus. Die rohe stdout/stderr verlässt den Server nie — der Agent erhält ausschließlich ein strukturiertes JSON-Ergebnis (`success`, `errors[]`, `warnings[]`, `summary`, `exitCode`).

| Tool | Beschreibung |
|------|-------------|
| `scaffold_dotnet_project` | Projekt via `dotnet new` anlegen + optional `dotnet sln add` |
| `create_directory_structure` | Verzeichnis-Baum aus JSON generieren |
| `build_dotnet_solution` | `dotnet build` — strukturiertes Ergebnis |
| `test_dotnet_solution` | `dotnet test` — strukturiertes Ergebnis |

```jsonc
// mcp.json
"dev-dotnet-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8093:8093",
    "-v", "${workspaceFolder}:/workspace",
    "devesen/dev-dotnet-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "scaffold_dotnet_project",
    "create_directory_structure",
    "build_dotnet_solution",
    "test_dotnet_solution"
  ]
}
```

➡️ Details: [`docs/mcp/dev-dotnet.md`](../docs/mcp/dev-dotnet.md)

---

## Volume-Mount Übersicht

| Server | Mount erforderlich | Mount-Pfad | Env-Variable |
|--------|-------------------|------------|--------------|
| `build-log-filter` | ❌ | — | — |
| `codebase-analyzer` | ✅ | `-v ${workspaceFolder}:/workspace:ro` | — |
| `dev-filesystem-mcp` | ✅ | `-v ${workspaceFolder}:/project:ro` | `PROJECT_ROOT=/project` |
| `dev-angular-mcp` | ✅ | `-v ${workspaceFolder}:/workspace` | — |
| `dev-dotnet-mcp` | ✅ | `-v ${workspaceFolder}:/workspace` | — |

---

## Ports — Hinweis

Alle Server verwenden **stdio** als MCP-Transport (kein TCP). Die `-p`-Flags in `mcp.json` binden einen internen **HTTP-Log-Viewer** — ein Diagnose-Endpoint, über den Tool-Aufrufe im Browser eingesehen werden können. Für den normalen Betrieb ist der Port irrelevant.

---

## Alle Server starten (docker-compose)

Für lokale Entwicklung: jeder Server-Ordner enthält ein `docker-compose.yml` zum Bauen und Starten des jeweiligen Containers.

```bash
# Im jeweiligen Server-Verzeichnis
docker compose up --build
```
