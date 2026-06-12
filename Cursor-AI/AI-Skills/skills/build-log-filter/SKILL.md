---
name: build-log-filter
description: >
  Kanon für MCP build-log-filter: Shell-Build-/Test-Logs verdichten (filter_output,
  filter_output_stream, analyze_build_output). AUSSER SCOPE: ng build/test und dotnet
  build/test laufen via dev-angular-mcp / dev-dotnet-mcp (MCPs filtern intern).
  build-log-filter nur für ng serve, npm start und Shell-Fallback nach BLOCKER-Freigabe.
  tool_type-Mapping DotnetBuild/NgTest etc. Prozess-Pflicht in Rule build-log-filter.mdc.
disable-model-invocation: true
---

# build-log-filter

Kanonische Referenz für den MCP-Server **build-log-filter** (Docker, Port 8089).

**Verbindliche Verifikations-Prozedur** (wann filtern, Matrix, keine Rohlog-Diagnose): Rule [build-log-filter.mdc](../../rules/build-log-filter.mdc) — dieser Skill beschreibt nur **Tools und Parameter**.

**Vor jedem Tool-Aufruf:** Schema unter `mcps/build-log-filter/tools/<tool>.json` lesen.

## Voraussetzungen

- Kein Volume-Mount
- **Kein** `autoApprove` — Aufrufe können Bestätigung erfordern
- `raw` / `text` / `chunk` = **vollständiges** stdout/stderr des Shell-Laufs (kein Kurz-`raw`)

## Tools

| Tool | Zweck |
|------|-------|
| `filter_output` | Gesamten Log auf einmal filtern |
| `filter_output_stream` | Chunk-weise (lange Logs, `ng serve`) |
| `analyze_build_output` | Zusätzlich bei Shell-Exit ≠ 0 |

## tool_type / format-Mapping

| Kommando-Kontext | `tool_type` (`filter_*`) | `format` (`analyze_build_output`) |
|------------------|--------------------------|-----------------------------------|
| `dotnet build` | `DotnetBuild` | `dotnet-build` |
| `dotnet test` | `DotnetTest` | `dotnet-test` |
| `ng build`, Production-Build | `NgBuild` | `ng-build` |
| `ng test`, `npm test` (Frontend) | `NgTest` | `ng-test` |
| `ng serve`, `npm start` | `NodeGeneric` | `null` oder `node-generic` |

## JSON-Beispiele

### filter_output (nach dotnet build)

```json
{
  "raw": "<vollständiges stdout/stderr des Laufs>",
  "tool_type": "DotnetBuild"
}
```

### filter_output_stream

```json
{
  "chunk": "<Log-Chunk>",
  "tool_type": "NgTest",
  "session_id": "verify-frontend-ng-test-20260610-a1",
  "is_final": false
}
```

Letzter Chunk derselben `session_id`: `"is_final": true`.

### analyze_build_output (bei Exit ≠ 0)

```json
{
  "text": "<vollständiges stdout/stderr desselben Laufs>",
  "format": "ng-test"
}
```

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| MCP nicht in Tool-Liste | Docker/MCP nicht aktiv | `.cursor/mcp.json`, Docker prüfen |
| Leeres/kurzes `raw` | Nicht vollständiges Capture | Temp-Capture ungekürzt übergeben |
| Falscher `tool_type` | Mapping verwechselt | Tabelle oben |

## Außer Scope — MCP-First

`ng build`, `ng test`, `dotnet build`, `dotnet test` laufen via **dev-angular-mcp** / **dev-dotnet-mcp**. Diese MCPs filtern intern und liefern `errors[]`, `warnings[]`, `summary` — **kein** `filter_output` für MCP-Läufe.

**build-log-filter gilt nur für:**
- `ng serve`, `npm start` (Dev-Server — kein MCP)
- Shell-Fallback nach expliziter BLOCKER-Freigabe (`BLOCKER: dev-angular-mcp / dev-dotnet-mcp nicht erreichbar`)

## Abgrenzung

- **dev-angular-mcp** `build_angular_project` / `test_angular_project`: ng Build + Test (MCP-First — ersetzt build-log-filter für diese Kommandos)
- **dev-dotnet-mcp** `build_dotnet_solution` / `test_dotnet_solution`: dotnet Build + Test (MCP-First)
- **codebase-analyzer** `analyze_compiler_diagnostics`: Compiler ohne Shell-Build
- **Prozess-Gate:** Rule `build-log-filter.mdc` (`alwaysApply`)

## Log-UI

Port **8089** — Diagnose optional im Browser.

## Opt-out

`ohne build-log-filter`, `kein build-log-filter` → Rule-Opt-out; Skill nicht für Verifikation überspringen wenn Rule aktiv.
