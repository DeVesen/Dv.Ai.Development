# MCP: dev-angular-mcp

**Dev.Angular.Mcp** — Angular-Scaffolding via `ng generate` mit Projekt-Konventionen.

| Eigenschaft | Wert |
|-------------|------|
| Stack | C# / .NET |
| Transport | stdio |
| Log-Port | 8092 (interner HTTP-Log-Viewer, nicht MCP-Transport) |
| Volume-Mount | ❌ nicht erforderlich |
| Image | `devesen/dev-angular-mcp:latest` |

---

## Was macht dieser Server?

Generiert Angular-Artefakte (Komponenten, Services) via `ng generate`. Der Agent übergibt **absolute Pfade** als Parameter — der Server startet `ng generate` als Subprocess und schreibt die Dateien direkt ins Ziel-Verzeichnis auf dem Host-Dateisystem. Ein Volume-Mount ist nicht nötig, da kein Container-Dateisystem beteiligt ist.

```
Agent ──▶ scaffold_angular_component(name, path: "C:\project\src\app\users")
              │
              ▼
         [Container] startet: ng generate component user-profile --working-dir=C:\project\src\app\users
              │
              ▼
         Dateien direkt auf Host geschrieben:
         C:\project\src\app\users\user-profile\user-profile.component.ts
         C:\project\src\app\users\user-profile\user-profile.component.html
         ...
```

---

## Tools

### `scaffold_angular_component`

Generiert eine neue Standalone-Komponente.

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `name` | string | Komponenten-Name (z.B. `user-profile`) |
| `path` | string | Ziel-Verzeichnis (relativ zum Projekt-Root) |
| `standalone` | boolean | `true` für Standalone (Standard: `true`) |
| `changeDetection` | string | `OnPush` oder `Default` |
| `style` | string | `scss`, `css`, `none` |

**Beispiel:**
```
scaffold_angular_component(
  name: "user-profile",
  path: "src/app/users",
  standalone: true,
  changeDetection: "OnPush",
  style: "scss"
)
```

**Generierte Dateien:**
```
src/app/users/user-profile/
├── user-profile.component.ts
├── user-profile.component.html
├── user-profile.component.scss
└── user-profile.component.spec.ts
```

---

### `scaffold_angular_service`

Generiert einen neuen Service.

**Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `name` | string | Service-Name (z.B. `user`) |
| `path` | string | Ziel-Verzeichnis |

**Beispiel:**
```
scaffold_angular_service(
  name: "user",
  path: "src/app/users"
)
```

**Generierte Dateien:**
```
src/app/users/
├── user.service.ts
└── user.service.spec.ts
```

---

## Konfiguration (mcp.json)

```jsonc
"dev-angular-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8092:8092",
    "devesen/dev-angular-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "scaffold_angular_component",
    "scaffold_angular_service"
  ]
}
```

---

## Lokal bauen & starten

```bash
# Im Mcp-Servers/Dev.Angular.Mcp/ Verzeichnis
dotnet run --project Dev.Angular.Mcp

# Docker
docker build -t dev-angular-mcp .
docker run -i --rm dev-angular-mcp
```
