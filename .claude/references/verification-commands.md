# Verifikationsbefehle

Dieses Dokument definiert die offiziellen Build- und Test-Befehle für dieses Projekt.
Agents lesen den Abschnitt `Agents — mandatory verification after changes` um zu wissen,
welche Befehle nach Code-Änderungen ausgeführt werden müssen — kein Raten erlaubt.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Agents — mandatory verification after changes

### Frontend

MCP `dev-mcp` verwenden — **kein direkter Shell-Aufruf**:

```
build_angular_project(project_root="C:\Develop\[frontend-absolutpfad]", configuration="production")

# Vollständige Tests:
test_angular_project(project_root="C:\Develop\[frontend-absolutpfad]")

# Slice-fokussiert (NEU — REQ-H04): nur geänderte Feature-Tests
test_angular_project(
  project_root="C:\Develop\[frontend-absolutpfad]",
  include_patterns=["src/app/feature/**/*.spec.ts"],
  test_name_pattern="MyComponent"
)
```

> Pfade als Windows-Absolutpfade (`C:\...`) — kein `/workspace/`.
> Vor dem ersten Build einmalig `npm install` per Shell erforderlich.
> Dev-Server: `ng serve` → http://localhost:4200

### Backend

MCP `dev-mcp` verwenden — **kein direkter Shell-Aufruf**:

```
build_dotnet_solution(path="C:\Develop\[backend-absolutpfad]", configuration="Release")

# Vollständige Tests:
test_dotnet_solution(path="C:\Develop\[backend-absolutpfad]")

# Slice-fokussiert (NEU — REQ-H04): nur geänderte Service-Tests
test_dotnet_solution(
  path="C:\Develop\[backend-absolutpfad]",
  filter="FullyQualifiedName~MyService",
  test_project_path="C:\Develop\[backend-absolutpfad]\tests\MyService.Tests.Unit"
)
```

> Pfade als Windows-Absolutpfade (`C:\...`) — kein `/workspace/`.
> Vor dem ersten Build einmalig `dotnet restore` per Shell erforderlich.

### Post-Implementierung Slice-Workflow (NEU — REQ-H03)

```
// 1. Geänderte Dateien ermitteln
git_changed_files(repo_root="C:\Develop\[repo]", base="unstaged")

// 2. Test-Targets ableiten
slice_test_targets(changed_file_paths=["..."], stack="auto")

// 3. Tests slice-fokussiert ausführen (aus slice_test_targets Output)
test_angular_project(project_root="...", include_patterns=["..."])
test_dotnet_solution(path="...", filter="...")

// 4. Impact-Review
analyze_slice_impact(changed_file_paths=["..."], format="compact")  // codebase-analyzer
```

---

## Warum MCP statt Shell

`build_angular_project`, `test_angular_project`, `build_dotnet_solution` und `test_dotnet_solution` (alle via `dev-mcp`)
filtern die Konsolenausgabe **intern** im MCP-Server — rohe stdout/stderr verlässt den Server nie.
Der LLM erhält ausschließlich strukturierte Daten: `errors[]`, `warnings[]`, `summary`.

Build-log-filter bleibt als Fallback für externe Shell-Aufrufe, die nicht über dev-mcp laufen.

---

## Fallback: direkter Shell-Aufruf (nur wenn MCP nicht verfügbar)

### Frontend

```bash
cd [frontend-pfad]
npm install
ng build          # production build
ng test           # Karma + Jasmine
```

### Backend

```bash
cd [backend-pfad]
dotnet restore
dotnet build --configuration Release
dotnet test
```

Bei Shell-Fallback gilt **build-log-filter** (Pflicht):
1. Shell ausführen → Exit-Code festhalten.
2. **Sofort** stdout/stderr über MCP `build-log-filter` (`filter_output` / `filter_output_stream`; bei Exit ≠ 0 zusätzlich `analyze_build_output`).
3. Inhaltliche Diagnose/Freigabe **nur** aus intern gelesenem MCP — **nicht** aus Roh-Konsole.

Kanon: Skill `build-log-filter`. Compliance: `.claude/references/agent-compliance.md`.

---

> **Hinweis:** Der Abschnittstitel `Agents — mandatory verification after changes` darf nicht umbenannt werden.
