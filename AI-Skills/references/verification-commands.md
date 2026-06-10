# Verifikationsbefehle

Dieses Dokument definiert die offiziellen Build- und Test-Befehle für dieses Projekt.
Agents lesen den Abschnitt `Agents — mandatory verification after changes` um zu wissen,
welche Befehle nach Code-Änderungen ausgeführt werden müssen — kein Raten erlaubt.

---

## Agents — mandatory verification after changes

### Frontend

MCP `dev-angular-mcp` verwenden — **kein direkter Shell-Aufruf**:

```
build_angular_project(project_root="{frontend-path}", configuration="production")
test_angular_project(project_root="{frontend-path}")
```

> Vor dem ersten Build einmalig `npm install` per Shell erforderlich.
> Dev-Server (kein Verifikationsbefehl): `ng serve` → http://localhost:4200 (proxies /api → https://localhost:7071)

### Backend

MCP `dev-dotnet-mcp` verwenden — **kein direkter Shell-Aufruf**:

```
build_dotnet_solution(path="{backend-path}", configuration="Release")
test_dotnet_solution(path="{backend-path}")
```

> Vor dem ersten Build einmalig `dotnet restore` per Shell erforderlich.
> Einzelnen Service starten (kein Verifikationsbefehl): `dotnet run --project LAC.GatewayService`

---

## Warum MCP statt Shell

`build_angular_project`, `test_angular_project`, `build_dotnet_solution` und `test_dotnet_solution` filtern die
Konsolenausgabe **intern** im MCP-Server — rohe stdout/stderr verlässt den Server nie.
Der LLM erhält ausschließlich strukturierte Daten: `errors[]`, `warnings[]`, `summary`.

Build-log-filter bleibt als Fallback für externe Shell-Aufrufe, die nicht über diese MCPs laufen.

---

## Fallback: direkter Shell-Aufruf (nur wenn MCP nicht verfügbar)

### Frontend

```powershell
cd {frontend-path}
npm install
ng build          # production build
ng test           # Karma + Jasmine
```

### Backend

```powershell
cd {backend-path}
dotnet restore
dotnet build --configuration Release
dotnet test                        # all test projects under tests/
```

Bei Shell-Fallback gilt **build-log-filter** (Pflicht):
1. Shell ausführen → Exit-Code festhalten.
2. **Sofort** stdout/stderr über MCP `build-log-filter` (`filter_output` / `filter_output_stream`; bei Exit ≠ 0 zusätzlich `analyze_build_output`).
3. Inhaltliche Diagnose/Freigabe **nur** aus intern gelesenem MCP — **nicht** aus Roh-Konsole.

Kanon: `.cursor/rules/build-log-filter.mdc` und Skill `build-log-filter`. Compliance: `{agent-compliance}`.

---

> **Hinweis:** Der Abschnittstitel `Agents — mandatory verification after changes` darf nicht umbenannt werden.
