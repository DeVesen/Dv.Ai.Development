# MCP: codebase-analyzer

**Codebase.Analyzer.Mcp** — Automatisierte Code-Reviews und statische Analyse für Angular und .NET/C#.

> **Agent-Kanon:** [`skills/codebase-analyzer/SKILL.md`](../.claude/skills/codebase-analyzer/SKILL.md) — Pfade `/workspace/...`, Parameter `projectPath`/`filePath`, Tool-Operationen.

| Eigenschaft | Wert |
|-------------|------|
| Stack | Node.js / TypeScript |
| Transport | stdio |
| Log-Port | 8090 (interner HTTP-Log-Viewer, nicht MCP-Transport) |
| Volume-Mount | ✅ **erforderlich** (`-v ${workspaceFolder}:/workspace:ro`) |
| API-Key | ❌ nicht erforderlich (rein statische AST-Analyse) |
| Image | `devesen/codebase-analyzer-mcp:latest` |

> **Volume-Mount ist Pflicht.** Der Server liest Projektdateien direkt über das Dateisystem für die AST-Analyse.

---

## Was macht dieser Server?

Rein **statische** Code-Analyse für Angular und .NET/C# — ohne LLM-Aufrufe, ohne API-Keys. Die Intelligenz liegt im Claude-Client (Claude Code / Cursor), der Server liefert strukturierte AST-Metadaten:

```
                    ┌──────────────────────────────────────┐
                    │          codebase-analyzer            │
                    │                                      │
  Review-Request ──▶│  ┌──────────────┐  ┌─────────────┐  │──▶ Strukturiertes
                    │  │  ts-morph    │  │   Roslyn    │  │    JSON-Ergebnis
                    │  │  (Angular/   │  │  (.NET/C#   │  │    (Findings,
                    │  │  TypeScript) │  │   Analyse)  │  │     Metriken, AST)
                    │  └──────────────┘  └─────────────┘  │
                    └──────────────────────────────────────┘
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

#### `review_with_index`
Reviewt eine Datei unter Einbeziehung des Projekt-Index (Symbol-Kontext).

---

### Index & Symbol-Suche

#### `index_project`
Indiziert das Projekt für schnelle Symbol-Suche.

> **Hinweis:** Der Index liegt im laufenden Container-Speicher. Mit `--rm` wird er beim Container-Stop gelöscht. Nach jedem Session-Neustart muss `index_project` erneut aufgerufen werden.

#### `index_solution`
Indiziert eine .NET-Solution (`.sln`-Datei) inklusive aller Projekte.

#### `find_in_index`
Sucht im bereits aufgebauten Index (schnell, kein Dateisystem-Scan).

#### `find_symbol_references`
Findet alle Referenzen eines Symbols im gesamten Projekt.

#### `find_type_hierarchy`
Zeigt Vererbungshierarchie und Interface-Implementierungen.

#### `find_api_callers`
Findet alle Aufrufer einer bestimmten API oder Methode.

---

### Komplexitäts- & Qualitätsanalyse

| Tool | Beschreibung |
|------|-------------|
| `analyze_complexity` | Zyklomatische Komplexität von Klassen und Methoden |
| `detect_god_classes` | God-Classes identifizieren |
| `suggest_class_splits` | Konkrete Aufspaltungsvorschläge für eine Klasse |
| `analyze_maintainability_index` | Wartbarkeitsindex nach MI-Formel |
| `analyze_dead_code` | Unerreichbaren/ungenutzten Code finden |
| `analyze_duplicates` | Code-Duplikate erkennen |

---

### Statische Analyse (erweitert)

| Tool | Beschreibung |
|------|-------------|
| `analyze_ast_only` | Reine AST-Analyse ohne Review-Logik |
| `analyze_nullability` | Nullable-Reference-Analyse (.NET) |
| `analyze_refactoring_safety` | Sicherheit einer geplanten Refaktorierung prüfen |
| `analyze_dataflow` | Datenfluss-Analyse |
| `analyze_type_graph` | Typ-Abhängigkeitsgraph |
| `analyze_control_flow` | Kontrollfluss-Analyse |
| `analyze_method_extraction_candidates` | Methoden die extrahiert werden könnten |
| `generate_auto_fixes` | Automatisch behebbare Findings anwenden |
| `compare_validation_rules` | Validierungsregeln zwischen Klassen vergleichen |

---

### Test-Analyse

| Tool | Beschreibung |
|------|-------------|
| `analyze_coverage` | Test-Coverage-Analyse |
| `analyze_test_quality` | Qualität der Tests prüfen |
| `detect_untested_public_api` | Ungetestete Public-API-Endpunkte finden |
| `analyze_test_health` | Gesamtgesundheit der Test-Suite |

---

### Vollständige Analyse

#### `analyze_advanced_all`
Führt alle erweiterten Analysen in einem Aufruf aus: Nullability, DIP-Verletzungen, ungetestete APIs, Methodenextraktion, Dead Code, Duplikate.

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

## Konfiguration (.mcp.json)

```jsonc
"codebase-analyzer": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-p", "127.0.0.1:8090:8090",   // Log-Viewer (Diagnose)
    "-v", "${workspaceFolder}:/workspace:ro",
    "devesen/codebase-analyzer-mcp:latest"
  ],
  "transport": "stdio",
  "autoApprove": [
    "review_file", "review_code", "review_git_diff", "review_files_batch",
    "review_with_index", "analyze_ast_only", "compare_validation_rules",
    "find_api_callers", "index_project", "index_solution", "find_in_index",
    "find_symbol_references", "find_type_hierarchy", "detect_god_classes",
    "analyze_complexity", "analyze_method_extraction_candidates",
    "analyze_dead_code", "analyze_nullability", "analyze_duplicates",
    "analyze_refactoring_safety", "generate_auto_fixes", "analyze_dataflow",
    "analyze_advanced_all", "suggest_class_splits", "analyze_maintainability_index",
    "analyze_type_graph", "analyze_control_flow", "analyze_coverage",
    "analyze_test_quality", "detect_untested_public_api", "analyze_test_health"
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
