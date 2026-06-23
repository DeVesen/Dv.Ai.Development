# Umsetzungs-Auftrag — Strang 2: dev-mcp Tools (`run_inspectcode`, `lint_angular_project`)

> **Source-of-Truth:** [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md), v.a. **§9 (Quality Gates)** und **§10 (dev-mcp Erweiterungen)**. Zuerst lesen.

## Kontext

`feature-delivery` (Orchestrator-Skill, §1 des Handoff-Docs) braucht für sein **Gate 2 (statische Analyse)** zwei neue dev-mcp-Tools. Diese liefern token-optimierte, strukturierte Befunde statt roher CLI-Ausgabe.

Repo: `C:\Develop\Dv.Ai.Development`. Branch: `claude/skill-x-agent-framework-xj2zi3` (nicht wechseln/mergen).

> **Pfad-Hinweis (kritisch):** Der Ordner `Mcp-Servers\Dev.WindowsService.Mcp\` ist ein veralteter Rumpf ohne `.csproj` — dort **nicht** arbeiten. Das baubare, deployte Projekt liegt unter:
> - **Quelle:** `Mcp-Servers\Dev.Mcp\Dev.Mcp\` (enthält `Dev.Mcp.csproj`, Namespace `Dev.Mcp.*`)
> - **Deploy-Ziel:** `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`
> - **MCP-Konfiguration (`.mcp.json`):** `"dev-mcp": { "command": "C:\\Develop\\.apps\\dev-mcp\\Dev.Mcp.exe" }`

**Zuerst lesen:** `CLAUDE.md`, `docs/mcp/dev-mcp.md`, dann die bestehenden Tool-Dateien (s.u.).

---

## Dein Auftrag (nur Strang 2)

Erweitere `Mcp-Servers\Dev.Mcp\Dev.Mcp\` um **zwei neue Tools**. Lies zuerst, wie bestehende Tools aufgebaut und registriert sind:

- Muster für `.NET`-CLI-Tools: `Tools\DotnetTools.cs` + `Services\DotnetRunner.cs`
- Muster für `Angular`-CLI-Tools: `Tools\AngularTools.cs` + `Services\AngularRunner.cs`
- Registrierung: `Program.cs` → `WithTools<...>()`
- Fehlerbehandlung: `Models\JsonOptions.cs` → `JsonOptions.Error(message)`
- Result-Modelle: `Models\DotnetModels.cs` (z.B. `DotnetBuildResult`), `Models\AngularModels.cs`

Beide Tools folgen dem gleichen Schichtenmodell: **Tool-Klasse** (MCP-Attribut, Eingabe-Validierung, `ExecuteAsync`-Wrapper) + **Service/Runner** (Prozess-Start, Parsing, strukturiertes Ergebnis-Model).

---

## Tool 1 — `run_inspectcode`

### Input
- `solution_path` (string, Pflicht): Windows-Absolutpfad zur `.sln` oder `.slnx`.

### Vorbedingung prüfen
Bevor der Prozess gestartet wird:
1. Prüfe ob `jb` auf dem PATH verfügbar ist: `jb --version` (kurzer Probe-Aufruf).
2. Wenn nicht gefunden: **sofort** `{ success: false, error: "jb CLI nicht gefunden — installieren mit: dotnet tool install -g JetBrains.ReSharper.GlobalTools" }` zurückgeben. Kein Prozess-Start, kein Throw.

> **Wichtig:** `jb` kommt vom NuGet-Global-Tool `JetBrains.ReSharper.GlobalTools`, **nicht** vom Rider-Installer. Es ist ein eigenständiges Install.

### CLI-Befehl
```
jb inspectcode <solution_path> --output=<tempfile>.sarif --format=Sarif --no-build
```

Flags:
- `--no-build`: Gate-1 (`build_dotnet_solution`) hat bereits gebaut — kein zweiter Build.
- `--format=Sarif`: SARIF ist das aktuelle Default-Format (seit 2024.1). **Nicht** XML.
- `--output=<tempfile>`: inspectcode schreibt das Ergebnis in eine **Datei**, **nicht** nach stdout. Stdout/stderr enthält nur Fortschritts-Log. Temporäre Datei anlegen (z.B. `Path.GetTempFileName()` + `.sarif`), nach dem Parsen löschen.

### Timeout
**900 Sekunden** (15 Minuten). inspectcode ist kein schnelles Tool — es analysiert die ganze Solution. Den Timeout-Wert als eigene Konstante benennen (z.B. `InspectCodeTimeoutSeconds = 900`), analog zu `BuildTimeoutSeconds = 300` in `DotnetRunner`.

Bei Timeout: `MakeFailResult("jb inspectcode timed out after 900s.", "jb inspectcode")` — kein roher Exception-Throw.

### SARIF parsen
SARIF-Struktur (relevant):
```json
{
  "runs": [{
    "tool": { "driver": { "rules": [{ "id": "...", "defaultConfiguration": { "level": "error|warning|note" } }] } },
    "results": [{ "ruleId": "...", "level": "error|warning|note", "message": { "text": "..." },
                  "locations": [{ "physicalLocation": { "artifactLocation": { "uri": "..." },
                                  "region": { "startLine": 1 } } }] }]
  }]
}
```

Severity-Mapping (SARIF `level` → Output-Bucket):
| SARIF level | Output-Bucket |
|-------------|---------------|
| `error`     | `errors[]`    |
| `warning`   | `warnings[]`  |
| `note`      | `suggestions[]` |
| (kein level-Feld) | `suggestions[]` (Default) |

> **Hinweis:** ReSharper kennt intern ERROR/WARNING/SUGGESTION/HINT. SARIF bildet das ab als error/warning/note. HINT erscheint im Normalfall nicht (unterhalb des Default-Analyse-Levels). `suggestions` ist der richtige Bucket — **nicht** `hints`.

Für `file`: aus `uri` (ist ein file-URI, z.B. `file:///C:/Develop/...`) den absoluten Windows-Pfad extrahieren (Uri-Klasse oder manuell `file:///` entfernen + `/` → `\`).

### Output-Schema (token-optimiert, kein rohes SARIF weitergeben)
```json
{
  "success": true,
  "command": "jb inspectcode",
  "summary": { "errors": 0, "warnings": 3, "suggestions": 12 },
  "errors":      [{ "file": "C:\\...", "line": 42, "rule": "RedundantUsingDirective", "msg": "..." }],
  "warnings":    [{ "file": "C:\\...", "line": 10, "rule": "...", "msg": "..." }],
  "suggestions": [{ "file": "C:\\...", "line": 7,  "rule": "...", "msg": "..." }]
}
```

Fehlerfall (Binary fehlt, Timeout, Parse-Fehler):
```json
{ "success": false, "command": "jb inspectcode", "error": "Fehlermeldung" }
```

### Result-Model (neue C#-Klasse)
Neue Datei `Models\InspectionModels.cs` anlegen:
```csharp
namespace Dev.Mcp.Models;

public sealed class InspectionIssue
{
    public string File { get; init; } = string.Empty;
    public int Line { get; init; }
    public string Rule { get; init; } = string.Empty;
    public string Msg { get; init; } = string.Empty;
}

public sealed class InspectionResult
{
    public bool Success { get; init; }
    public string Command { get; init; } = string.Empty;
    public InspectionSummary Summary { get; init; } = new();
    public InspectionIssue[] Errors { get; init; } = [];
    public InspectionIssue[] Warnings { get; init; } = [];
    public InspectionIssue[] Suggestions { get; init; } = [];
    public string? Error { get; init; }
    [System.Text.Json.Serialization.JsonIgnore]
    public string ConsoleOutput { get; set; } = string.Empty;
}

public sealed class InspectionSummary
{
    public int Errors { get; init; }
    public int Warnings { get; init; }
    public int Suggestions { get; init; }
}
```

### Neue Dateien
- `Models\InspectionModels.cs` (s.o.)
- `Services\InspectionRunner.cs` — kapselt jb-Aufruf, SARIF-Parsen, `MakeFailResult`
- `Tools\InspectionTools.cs` — `[McpServerTool]`-Attribut, `ExecuteAsync`-Wrapper, DI analog `DotnetTools`

---

## Tool 2 — `lint_angular_project`

### Input
- `project_path` (string, Pflicht): Windows-Absolutpfad zum Angular-Projekt-Root (Verzeichnis mit `angular.json`).

### Vorbedingung prüfen
Bevor `ng lint` aufgerufen wird:
1. Prüfe ob `angular.json` im `project_path` existiert.
2. Lies `angular.json` und prüfe ob ein `lint`-Target in mindestens einem Projekt definiert ist (analog zur bestehenden `IsJestBuilder`-Logik in `AngularRunner.cs` — `projects[*].architect.lint` muss existieren).
3. Wenn kein Lint-Target vorhanden: **sofort** `{ success: false, error: "ESLint nicht konfiguriert — ng add @angular-eslint ausführen (Gate-2-Bootstrap)" }` zurückgeben. **Kein** interaktiver Prozess-Start — ohne Lint-Target fragt `ng lint` interaktiv nach und blockiert.

### CLI-Befehl
```
ng lint --format=json
```

- `--format=json`: ESLint JSON-Format, maschinen-stabil. **Nicht** den Default-`stylish`-Formatter (ANSI, zeilenbasiert, brüchig).
- Ausführung analog `AngularRunner.RunAsync`: `ProcessStartInfo` mit `UseShellExecute = false`, `RedirectStandardOutput = true`, `RedirectStandardError = true`, **kein** `RedirectStandardInput` — stdin bleibt geschlossen, ein hängender interaktiver Prompt wird durch die Vorbedingungsprüfung (s.o.) verhindert.
- `ng.cmd` auf Windows verwenden (analog `AngularRunner.NgExecutable`).

### Timeout
**300 Sekunden** (`BuildTimeoutSeconds`) — analog `ng build`.

### JSON parsen
ESLint-JSON-Format: Array aus File-Objekten:
```json
[{ "filePath": "C:\\...", "errorCount": 1, "warningCount": 0,
   "messages": [{ "ruleId": "...", "severity": 2, "message": "...", "line": 10 }] }]
```

Severity-Mapping: `2` → `errors[]`, `1` → `warnings[]`.

**Sonderfall leeres Ergebnis:** `ng lint --format=json` kann bei 0 Befunden leeres stdout, `[]` oder ungültiges JSON liefern. Immer absichern:
- `stdout` leer oder Whitespace → 0 Findings, `success: true`
- `stdout` kein valides JSON → `{ success: false, error: "ESLint output kein gültiges JSON: <erste 200 Zeichen stdout>" }`
- `stdout` ist `[]` → 0 Findings, `success: true`

### Output-Schema (token-optimiert)
```json
{
  "success": true,
  "command": "ng lint",
  "summary": { "errors": 2, "warnings": 1 },
  "errors":   [{ "file": "C:\\...", "line": 10, "rule": "no-unused-vars", "msg": "..." }],
  "warnings": [{ "file": "C:\\...", "line": 5,  "rule": "...",            "msg": "..." }]
}
```

Fehlerfall (kein Lint-Target, Timeout, Parse-Fehler):
```json
{ "success": false, "command": "ng lint", "error": "Fehlermeldung" }
```

### Result-Model
`LintResult` analog `AngularBuildResult` in `Models\AngularModels.cs` (dort ergänzen oder neue Datei `Models\LintModels.cs` — entscheide nach Konvention im Projekt). Benötigte Felder: `Success`, `Command`, `Summary` (mit `Errors`/`Warnings` als int), `Errors[]` + `Warnings[]` als `LintIssue` (mit `File`, `Line`, `Rule`, `Msg`), `Error?` (string, nur bei Execution-Fehler), `[JsonIgnore] ConsoleOutput`.

### Neue/geänderte Dateien
- `Models\LintModels.cs` (neu) oder Ergänzung in `Models\AngularModels.cs`
- `Services\LintRunner.cs` — kapselt ng-lint-Aufruf, angular.json-Prüfung, JSON-Parsen
- `Tools\LintTools.cs` — `[McpServerTool]`-Attribut, `ExecuteAsync`-Wrapper

---

## Registrierung (Program.cs)

Beide Tool-Klassen in `Program.cs` eintragen:

```csharp
// Inspection services
builder.Services.AddSingleton<InspectionRunner>();

// Lint services
builder.Services.AddSingleton<LintRunner>();
```

Und in der `WithTools<...>()`-Kette:
```csharp
.WithTools<InspectionTools>()
.WithTools<LintTools>()
```

---

## Doku-Updates

### `docs/mcp/dev-mcp.md`
Beide Tools in der Tool-Tabelle ergänzen. Abschnitt „.NET (Scaffolding + Build/Test)" um `run_inspectcode`, neuer Abschnitt „Angular (Lint)" oder Ergänzung in „Angular (Scaffolding + Build/Test)" um `lint_angular_project`. Tool-Gesamtzahl in der Header-Zeile aktualisieren.

> Die anderen `docs/mcp/dev-*.md`-Dateien (`dev-angular.md`, `dev-dotnet.md`, `dev-filesystem.md`) sind **VERALTET** — nicht anfassen.

### `.claude/skills/dev-mcp/SKILL.md`
Beide Tool-Namen in die Aufzählung in der `description:`-Frontmatter-Zeile eintragen (Muster: bestehende Tool-Namen). Tool-Gesamtzahl im Frontmatter hochziehen (aktuell `39 Dev-Tools`, wird `41 Dev-Tools`).

> SKILL.md ist **dev-mcp-eigene** Doku — die Zahl darf und soll hier aktualisiert werden. Die Freeze-Klausel (§19) gilt nur für `CLAUDE.md` und zentrale Skill-Index/Registry-Dateien, **nicht** für SKILL.md.

---

## Parallelitäts-Sperre (KRITISCH — §19)

Du arbeitest **parallel** zu Strang 1 (Skills) und Strang 4 (acceptance-design) im selben Working Tree.

**Nur diese Dateien anfassen:**
- `Mcp-Servers\Dev.Mcp\Dev.Mcp\**` (neue + geänderte .cs-Dateien)
- `docs/mcp/dev-mcp.md`
- `.claude/skills/dev-mcp/SKILL.md`

**Nicht anfassen (geteilte Index-Dateien → Last-Write-Wins-Konflikt):**
- `CLAUDE.md`
- `.claude/settings*`
- Jede andere Datei außerhalb der drei Bereiche oben

**Nicht anfassen (anderer MCP, anderer Strang):**
- `Mcp-Servers\Codebase.Analyzer.Mcp\` → Strang 5/6

---

## Regeln

- Windows-Absolutpfade durchgängig. Kein Docker-Prefix, kein `/workspace/`.
- Keine stillen Annahmen — bei Unklarheit Sven fragen.
- Kein Commit/Merge ohne Anweisung von Sven.
- Build/Publish nach Abschluss: `dotnet publish Mcp-Servers\Dev.Mcp\Dev.Mcp\Dev.Mcp.csproj -c Release -r win-x64 --self-contained true -o "C:\Develop\.apps\dev-mcp\"` — dann Claude Code neu starten (EXE ist im laufenden Betrieb gesperrt).

---

## Verifikation

1. **Kompiliert:** `dotnet build Mcp-Servers\Dev.Mcp\Dev.Mcp\Dev.Mcp.csproj` läuft ohne Fehler.
2. **Tool-Registrierung im Code:** Beide Tool-Klassen haben `[McpServerTool(Name = "run_inspectcode")]` bzw. `[McpServerTool(Name = "lint_angular_project")]` und sind in `Program.cs` mit `WithTools<...>()` eingetragen.
3. **run_inspectcode — Schema:** Aufruf gegen `C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp.slnx` (die Solution dieses Repos). Output-JSON entspricht dem Schema aus §10 und dieser Spez (`success`, `command`, `summary.{errors,warnings,suggestions}`, `errors[]`, `warnings[]`, `suggestions[]` mit `{file,line,rule,msg}`). Kein rohes SARIF.
4. **lint_angular_project — Schema:** Aufruf gegen ein Angular-Projekt mit konfiguriertem ESLint. Output-JSON entspricht dem Schema (`success`, `command`, `summary.{errors,warnings}`, `errors[]`, `warnings[]` mit `{file,line,rule,msg}`). Kein rohes ESLint-Output.
5. **Fehlerfall run_inspectcode:** Aufruf ohne `jb` auf PATH (oder gefakten Pfad) → `{ success: false, error: "jb CLI nicht gefunden..." }`, kein Throw.
6. **Fehlerfall lint_angular_project:** Aufruf auf Angular-Projekt ohne ESLint-Config → `{ success: false, error: "ESLint nicht konfiguriert..." }`, kein Hang.
7. **Live-Check (nach Deploy):** Erst nach Publish + Claude-Code-Neustart durch Sven prüfen — nicht in-session verifikzierbar.
