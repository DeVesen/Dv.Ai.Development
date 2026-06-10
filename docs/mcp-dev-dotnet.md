# MCP: dev-dotnet-mcp

**Dev.Dotnet.Mcp** — .NET-Scaffolding via `dotnet new` und JSON-basierte Verzeichnisstruktur-Generierung.

| Eigenschaft | Wert |
|-------------|------|
| Stack | C# / .NET |
| Transport | stdio |
| Log-Port | 8093 (interner HTTP-Log-Viewer, nicht MCP-Transport) |
| Volume-Mount | ❌ nicht erforderlich |
| Image | `devesen/dev-dotnet-mcp:latest` |

---

## Was macht dieser Server?

Generiert .NET-Projekte und Verzeichnisstrukturen nach Konvention. Der Agent übergibt **absolute Pfade** — der Server startet `dotnet new` als Subprocess und schreibt Dateien direkt aufs Host-Dateisystem. `create_directory_structure` nutzt `File.WriteAllText()` direkt auf dem übergebenen Pfad. Kein Volume-Mount nötig.

---

## Tools

### `scaffold_dotnet_project`

Erstellt ein neues .NET-Projekt via `dotnet new`.

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `template` | string | `webapi`, `classlib`, `console`, `xunit`, etc. |
| `name` | string | Projekt-Name |
| `outputPath` | string | Ziel-Verzeichnis |
| `framework` | string | Ziel-Framework (z.B. `net9.0`) |

**Beispiel:**
```
scaffold_dotnet_project(
  template: "webapi",
  name: "UserService.Api",
  outputPath: "src/",
  framework: "net9.0"
)
```

**Generierte Dateien:**
```
src/UserService.Api/
├── UserService.Api.csproj
├── Program.cs
├── Controllers/
└── Properties/
    └── launchSettings.json
```

---

### `create_directory_structure`

Erstellt eine Verzeichnis- und Dateistruktur aus einer JSON-Definition. Nützlich für das Anlegen von Projekt-Skeletten nach Architektur-Vorgaben.

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `rootPath` | string | Basis-Verzeichnis |
| `structure` | object | JSON-Baum mit Ordnern und Dateien |

**Beispiel:**
```json
{
  "rootPath": "src/UserService",
  "structure": {
    "Domain": {
      "Entities": ["User.cs", "UserRole.cs"],
      "Interfaces": ["IUserRepository.cs"]
    },
    "Application": {
      "Services": ["UserService.cs"],
      "DTOs": ["UserDto.cs", "CreateUserDto.cs"]
    },
    "Infrastructure": {
      "Persistence": ["AppDbContext.cs", "UserRepository.cs"]
    }
  }
}
```

---

## Konfiguration (mcp.json)

```jsonc
"dev-dotnet-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8093:8093",
    "devesen/dev-dotnet-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "scaffold_dotnet_project",
    "create_directory_structure"
  ]
}
```

---

## Lokal bauen & starten

```bash
# Im Mcp-Servers/Dev.Dotnet.Mcp/ Verzeichnis
dotnet run --project Dev.Dotnet.Mcp

# Docker
docker build -t dev-dotnet-mcp .
docker run -i --rm dev-dotnet-mcp
```
