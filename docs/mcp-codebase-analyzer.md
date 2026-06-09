# MCP: codebase-analyzer

**Codebase.Analyzer.Mcp** — Automatisierte Code-Reviews und statische Analyse für Angular und .NET/C#.

| Eigenschaft | Wert |
|-------------|------|
| Stack | Node.js / TypeScript |
| Transport | stdio |
| Docker-Port | 8090 |
| Volume-Mount | ✅ **erforderlich** (`-v ${workspaceFolder}:/workspace:ro`) |
| Image | `devesen/codebase-analyzer-mcp:latest` |

> **Volume-Mount ist Pflicht.** Der Server analysiert Dateien direkt auf dem Dateisystem. Ohne Mount kann er keine Projektdateien lesen.

---

## Was macht dieser Server?

Vollständige statische Code-Analyse und automatisierte Reviews für Angular- und .NET/C#-Projekte:

```
                    ┌─────────────────────────────────┐
                    │       codebase-analyzer          │
                    │                                  │
  Review-Request ──▶│  ┌──────────┐  ┌─────────────┐  │──▶ Review-Report
                    │  │  AST /   │  │   Claude    │  │    (JSON: score,
                    │  │  Index   │  │   AI Model  │  │     issues,
                    │  └──────────┘  └─────────────┘  │     quickWins)
                    └─────────────────────────────────┘
```

---

## Feature-Übersicht

| Kategorie | .NET / C# | Angular / TypeScript |
|-----------|-----------|----------------------|
| **SOLID & Clean Code** | ✅ SRP, DI, Naming, Async | ✅ Lean Components, Services |
| **Security** | ✅ SQL Injection, Secrets, CORS, Auth | ✅ XSS, innerHTML, Token Storage |
| **Performance** | ✅ N+1, IQueryable, Caching | ✅ OnPush, Signals, trackBy, LazyLoad |
| **Angular Best Practices** | — | ✅ Signals, inject(), @if/@for, Standalone |

---

## Focus Areas

| Wert | Beschreibung |
|------|-------------|
| `solid` | SOLID-Prinzipien, Clean Code, Naming, Struktur |
| `security` | SQL Injection, XSS, Secrets, Auth, CORS |
| `performance` | N+1, Caching, Signals, OnPush, LazyLoading |
| `angular-best-practices` | Signals, inject(), @if/@for, Standalone Components |
| `api-validation` | API-Eingabevalidierung, DTO-Validierung |

---

## Tools

### Review-Tools

#### `review_file`
Reviewt eine einzelne Datei anhand ihres Pfades.

```
review_file(
  filePath: "src/app/user/user.service.ts",
  focusAreas: ["solid", "security", "performance"]
)
```

#### `review_code`
Reviewt Code direkt als String (Copy-Paste — kein Dateisystem-Zugriff nötig).

```
review_code(
  code: "public class UserController { ... }",
  filename: "UserController.cs",
  focusAreas: ["security", "solid"]
)
```

#### `review_git_diff`
Reviewt alle geänderten Dateien im aktuellen Git-Diff.

```
review_git_diff(
  repoPath: "/workspace",
  staged: false,
  focusAreas: ["solid", "security", "performance"]
)
```

> `staged: true` → nur der Staging-Bereich (`git diff --cached`)
> `staged: false` → alle unstaged Änderungen

#### `review_files_batch`
Reviewt mehrere Dateien auf einmal.

```
review_files_batch(
  filePaths: ["src/UserService.cs", "src/app/user/user.component.ts"],
  focusAreas: ["security", "performance"]
)
```

---

### Index & Symbol-Suche

#### `index_project`
Indiziert das Projekt für schnelle Symbol-Suche (einmalig ausführen, dann gecacht).

#### `find_symbol_references`
Findet alle Referenzen eines Symbols im gesamten Projekt.

#### `find_type_hierarchy`
Zeigt Vererbungshierarchie und Interface-Implementierungen.

---

### Komplexitäts-Analyse

#### `analyze_complexity`
Misst zyklomatische Komplexität von Klassen und Methoden.

#### `detect_god_classes`
Identifiziert God-Classes und schlägt Aufspaltungen vor.

#### `suggest_class_splits`
Konkrete Aufspaltungsvorschläge für eine spezifische Klasse.

---

### Erweiterte Analyse

#### `analyze_advanced_all`
Vollständige Analyse: Nullability, DIP-Verletzungen, ungetestete APIs, Methodenextraktion.

---

## Beispiel-Output

```json
{
  "summary": "Service hat solide Struktur, aber kritische Security-Issues beim DB-Zugriff.",
  "score": 5,
  "issues": [
    {
      "severity": "critical",
      "category": "security",
      "line": 42,
      "title": "SQL Injection Risiko",
      "description": "String-Interpolation in SQL-Query erlaubt Injection-Angriffe.",
      "fix": "Verwende parameterisierte Queries: WHERE Id = @id"
    },
    {
      "severity": "warning",
      "category": "performance",
      "line": 67,
      "title": "N+1 Query Problem",
      "description": "Users werden in einer Schleife einzeln geladen statt per Include.",
      "fix": "_context.Users.Include(u => u.Orders).ToListAsync()"
    }
  ],
  "positives": [
    "Konsequente Verwendung von async/await",
    "Dependency Injection korrekt eingesetzt"
  ],
  "quickWins": [
    "SQL Injection auf Zeile 42 sofort fixen",
    "Include() für Orders hinzufügen"
  ]
}
```

---

## Severity Levels

| Level | Bedeutung |
|-------|-----------|
| `critical` | Sofort fixen — Security-Lücke oder schwerer Bug |
| `warning` | Wichtige Verbesserung — Performance oder Wartbarkeit |
| `suggestion` | Nice-to-have — Best Practice, Lesbarkeit |

---

## Konfiguration (mcp.json)

```jsonc
"codebase-analyzer": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8090:8090",
    "-v", "${workspaceFolder}:/workspace:ro",
    "devesen/codebase-analyzer-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "review_file", "review_code", "review_git_diff", "review_files_batch",
    "index_project", "find_symbol_references", "find_type_hierarchy",
    "analyze_complexity", "detect_god_classes", "analyze_advanced_all"
  ]
}
```

---

## Lokal bauen & starten

```bash
# Im Mcp-Servers/Codebase.Analyzer.Mcp/ Verzeichnis
npm install
npm run build

# Docker
docker build -t codebase-analyzer-mcp .
docker run -i --rm -v /path/to/project:/workspace:ro codebase-analyzer-mcp
```
