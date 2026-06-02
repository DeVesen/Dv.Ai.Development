# code-review-mcp

Ein MCP-Server für automatisierte Code-Reviews von **Angular** und **.NET/C#** Projekten.  
Läuft als Docker-Container und integriert sich in Claude Desktop oder jeden MCP-kompatiblen Client.

---

## Features

| Kategorie | .NET / C# | Angular / TypeScript |
|-----------|-----------|----------------------|
| **SOLID & Clean Code** | ✅ SRP, DI, Naming, Async | ✅ Lean Components, Services |
| **Security** | ✅ SQL Injection, Secrets, CORS, Auth | ✅ XSS, innerHTML, Token Storage |
| **Performance** | ✅ N+1, IQueryable, Caching | ✅ OnPush, Signals, trackBy, LazyLoad |
| **Angular Best Practices** | – | ✅ Signals, inject(), @if/@for, Standalone |

---

## Voraussetzungen

- Docker Desktop installiert
- Anthropic API Key: https://console.anthropic.com

---

## Setup

### 1. Repository klonen & Image bauen

```bash
git clone <your-repo-url>
cd code-review-mcp
docker build -t code-review-mcp:latest .
```

### 2. Umgebungsvariable setzen

```bash
# Linux / macOS
export ANTHROPIC_API_KEY=sk-ant-...

# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. In Claude Desktop integrieren

Öffne die Claude Desktop Konfigurationsdatei:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Füge folgendes ein (Pfad zu deinem Projekt anpassen):

```json
{
  "mcpServers": {
    "code-review-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ANTHROPIC_API_KEY",
        "-v", "/absolute/path/to/your/project:/workspace:ro",
        "-w", "/workspace",
        "code-review-mcp:latest"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Claude Desktop neu starten → der MCP-Server ist verfügbar.

---

## Verfügbare Tools

### `review_file`
Reviewt eine einzelne Datei anhand ihres Pfades.

```
review_file(
  filePath: "src/app/user/user.service.ts",
  focusAreas: ["solid", "security", "performance", "angular-best-practices"]
)
```

### `review_code`
Reviewt Code direkt als String (Copy-Paste).

```
review_code(
  code: "public class UserController { ... }",
  filename: "UserController.cs",
  focusAreas: ["security", "solid"]
)
```

### `review_git_diff`
Reviewt alle geänderten Dateien im aktuellen Git-Diff.

```
review_git_diff(
  repoPath: "/workspace",
  staged: false,
  focusAreas: ["solid", "security", "performance", "angular-best-practices"]
)
```

> `staged: true` → nur der Staging-Bereich (git diff --cached)  
> `staged: false` → alle unstaged Änderungen

### `review_files_batch`
Reviewt mehrere Dateien auf einmal.

```
review_files_batch(
  filePaths: [
    "src/UserService.cs",
    "src/app/user/user.component.ts"
  ],
  focusAreas: ["security", "performance"]
)
```

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
    "Include() für Orders hinzufügen",
    "Magic String auf Zeile 89 als Konstante extrahieren"
  ]
}
```

---

## Focus Areas

| Wert | Beschreibung |
|------|-------------|
| `solid` | SOLID-Prinzipien, Clean Code, Naming, Struktur |
| `security` | SQL Injection, XSS, Secrets, Auth, CORS |
| `performance` | N+1, Caching, Signals, OnPush, LazyLoading |
| `angular-best-practices` | Signals, inject(), @if/@for, Standalone Components |

---

## Severity Levels

| Level | Bedeutung |
|-------|-----------|
| `critical` | Sofort fixen – Security-Lücke oder schwerer Bug |
| `warning` | Wichtige Verbesserung – Performance oder Wartbarkeit |
| `suggestion` | Nice-to-have – Best Practice, Lesbarkeit |
