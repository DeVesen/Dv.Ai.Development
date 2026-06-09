# MCP: dev-filesystem-mcp

**Dev.Filesystem.Mcp** — Token-effizientes Lesen und Suchen in `.cs`- und `.ts`-Dateien.

| Eigenschaft | Wert |
|-------------|------|
| Stack | C# / .NET |
| Transport | stdio |
| Docker-Port | 8091 |
| Volume-Mount | ✅ **erforderlich** (`-v ${workspaceFolder}:/project:ro -e PROJECT_ROOT=/project`) |
| Image | `devesen/dev-filesystem-mcp:latest` |

> **Volume-Mount ist Pflicht.** Das Projekt-Verzeichnis muss als `/project` gemountet und `PROJECT_ROOT=/project` als Umgebungsvariable gesetzt werden.

---

## Was macht dieser Server?

Statt ganze Dateien zu lesen (token-intensiv), liefert `dev-filesystem-mcp` **genau das, was gebraucht wird**: nur Signaturen, nur eine Methode, nur die Klassen-Übersicht. Optimiert für `.cs`- und `.ts`-Dateien.

```
Ohne MCP:  Read("UserService.cs") → 400 Zeilen → 2.000 Token
Mit MCP:   read_signatures_only("UserService.cs") → 15 Zeilen → 80 Token
```

---

## Wann bevorzugen?

| Situation | Tool |
|-----------|------|
| Konkrete Datei/Klasse bekannt | `read_signatures_only`, `read_class_summary` |
| Public API einer Klasse prüfen | `read_signatures_only` |
| Alle Implementierungen eines Interfaces finden | `find_implementations` |
| Datei per Name suchen | `find_file` |
| Inhalt durchsuchen (Regex) | `find_by_content` |
| Einzelne Methode lesen | `read_method` |

---

## Tools

### `find_file`

Sucht Dateien per Glob-Pattern im Projekt.

```
find_file(pattern: "**/*Service.cs")
find_file(pattern: "src/app/**/*.component.ts")
```

---

### `find_by_content`

Regex-Suche im Dateiinhalt. Gibt Dateinamen und Treffer-Zeilen zurück.

```
find_by_content(pattern: "interface IUserRepository", fileType: "cs")
find_by_content(pattern: "@Injectable", fileType: "ts")
```

---

### `find_implementations`

Findet alle Klassen/Komponenten, die ein Interface oder einen abstrakten Typ implementieren.

```
find_implementations(typeName: "IUserRepository")
find_implementations(typeName: "BaseComponent")
```

---

### `read_signatures_only`

Liest nur die Public API einer Datei: Klassen-Deklaration, Properties, Methoden-Signaturen — ohne Implementierung.

```
read_signatures_only(filePath: "src/UserService.cs")
```

**Output (Beispiel):**
```
public class UserService : IUserService
  + GetUserAsync(id: Guid): Task<UserDto>
  + UpdateUserAsync(id: Guid, dto: UpdateUserDto): Task
  - _context: AppDbContext
```

---

### `read_method`

Liest eine einzelne Methode vollständig (inkl. Implementierung).

```
read_method(filePath: "src/UserService.cs", methodName: "GetUserAsync")
```

---

### `read_class_summary`

Liefert eine Übersicht einer Klasse: Properties, Methoden-Signaturen und Abhängigkeiten — ohne Methoden-Bodies.

```
read_class_summary(filePath: "src/UserService.cs")
```

---

## Konfiguration (mcp.json)

```jsonc
"dev-filesystem-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8091:8091",
    "-v", "${workspaceFolder}:/project:ro",
    "-e", "PROJECT_ROOT=/project",
    "devesen/dev-filesystem-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "find_file",
    "find_by_content",
    "find_implementations",
    "read_signatures_only",
    "read_method",
    "read_class_summary"
  ]
}
```

---

## Abgrenzung zu codebase-analyzer

| | `dev-filesystem-mcp` | `codebase-analyzer` |
|--|---------------------|---------------------|
| **Stärke** | Gezieltes token-effizientes Lesen | Tiefe Analyse, Reviews, AST |
| **Bereich bekannt?** | ✅ Ideal | Überdimensioniert |
| **Unbekanntes Terrain** | Eingeschränkt | ✅ Ideal (Index + Symbol-Suche) |
| **Code-Review** | ❌ | ✅ |
| **Token-Verbrauch** | Sehr niedrig | Höher |
