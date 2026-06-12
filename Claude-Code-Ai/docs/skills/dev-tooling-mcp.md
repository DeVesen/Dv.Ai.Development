# Dev-Tooling MCP Skills

Drei spezialisierte MCP-Skills für Dateizugriff, Angular-Entwicklung und .NET-Entwicklung. `dev-tooling-mcp` ist der Router — er leitet zur richtigen Implementierung weiter.

---

## dev-tooling-mcp (Router)

**Trigger:** unklar welcher Dev-MCP, `*.cs`/`*.ts` Signaturen lesen, `read_signatures_only`, welcher MCP für Scaffolding  
**Nicht für:** `codebase-analyzer` (Index/Review) oder `build-log-filter` (Log-Filterung)

| Aufgabe | MCP |
|---------|-----|
| Datei lesen, Signaturen extrahieren | `dev-filesystem-mcp` |
| Angular-Scaffolding, Build, Test | `dev-angular-mcp` |
| .NET-Scaffolding, Build, Test | `dev-dotnet-mcp` |

---

## dev-filesystem-mcp

**Trigger:** Datei lesen, Klasse/Methode verstehen, `.cs`/`.ts` Signaturen, `read_signatures_only`  
**MCP-Server:** `dev-filesystem-mcp` (Port 8091, Volume `-v ${workspaceFolder}:/project:ro -e PROJECT_ROOT=/project`)

Token-effizientes Lesen: `read_signatures_only` gibt nur Signaturen ohne Body zurück.

| Tool | Wann |
|------|------|
| `read_file` | Datei vollständig lesen |
| `read_signatures_only` | Nur Klassen-/Methoden-Signaturen |
| `find_files` | Dateien nach Muster suchen |
| `list_directory` | Verzeichnis-Inhalt |

**Pfad-Präfix:** `/project/...`

> Details: [`docs/mcp/dev-filesystem.md`](../mcp/dev-filesystem.md)

---

## dev-angular-mcp

**Trigger:** Angular-Scaffolding, `ng generate`, `ng build`, `ng test`, `scaffold_angular`  
**MCP-Server:** `dev-angular-mcp` (Port 8092, Volume `-v ${workspaceFolder}:/workspace`)

**Hard Gate:** `ng build` und `ng test` **immer** über diesen MCP — niemals als Shell-Befehl.

| Tool | Wann |
|------|------|
| `scaffold_angular` | `ng generate component/service/...` |
| `run_build` | `ng build` |
| `run_tests` | `ng test` |
| `run_serve` | `ng serve` (selten — meist `ng serve` via Shell + build-log-filter) |

**Pfad-Präfix:** `/workspace/...`

> Details: [`docs/mcp/dev-angular.md`](../mcp/dev-angular.md)

---

## dev-dotnet-mcp

**Trigger:** .NET-Scaffolding, `dotnet new`, `dotnet build`, `dotnet test`, `scaffold_dotnet`  
**MCP-Server:** `dev-dotnet-mcp` (Port 8093, Volume `-v ${workspaceFolder}:/workspace`)

**Hard Gate:** `dotnet build` und `dotnet test` **immer** über diesen MCP — niemals als Shell-Befehl.

| Tool | Wann |
|------|------|
| `scaffold_dotnet` | `dotnet new controller/service/...` |
| `run_build` | `dotnet build` |
| `run_tests` | `dotnet test` |

**Pfad-Präfix:** `/workspace/...`

> Details: [`docs/mcp/dev-dotnet.md`](../mcp/dev-dotnet.md)

---

## Zusammenspiel mit anderen Skills

- **Log-Filterung (Shell-Fallback):** [`build-log-filter`](./build-log-filter.md)
- **Code-Analyse und Review:** [`codebase-analyzer`](./codebase-analyzer.md)
- **Angular-Entwicklung:** [`angular-developer`](./angular-developer.md)
