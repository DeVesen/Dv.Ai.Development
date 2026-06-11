# AI-Skills

Quellbibliothek für dual-platform AI-Workflow-Artefakte — deploybar in **Cursor** und **Claude Code**.

```
AI-Skills/
├── agents/                   Sub-Agent-Profile (.md)
├── skills/                   Skill-Pakete (SKILL.md + references/)
├── rules/                    Cursor-Rules (.mdc) — nur Cursor
├── packages/                 Package-Manifeste (JSON)
├── references/               Geteilte Referenz-Dateien
├── mcp.json                  MCP-Server-Konfiguration
├── install-cursor-skills.ps1 Deploy-Skript (Windows/PowerShell)
├── install-skill.sh          Deploy-Skript (Linux/macOS)
└── update-cursor-skills.ps1  Update-Skript (Windows, manifest-basiert)
```

---

## Verzeichnisse

### `agents/` — Sub-Agent-Profile

Spezialisierte Agent-Profile, die von Skills als Sub-Agents aufgerufen werden. Jede Datei definiert Rolle, Modell, Fähigkeiten und Aufgaben eines Agents.

**Planungs-Agents:**

| Agent | Aufgabe |
|-------|---------|
| `plan-agent-scout.md` | Phase 3: Codebase-Scouting |
| `plan-agent-topic-planner.md` | Phase 4b: IMP-\*-Slices planen |
| `plan-review-pessimist-agent.md` | Risiko-Review (skeptisch) |
| `plan-review-optimist-agent.md` | Risiko-Review (konstruktiv) |
| `plan-review-normalo-agent.md` | Risiko-Review (pragmatisch) |
| `plan-review-professor-agent.md` | Tiefenanalyse mit Priorisierung |
| `plan-review-oberlehrer-agent.md` | Pedantischer Qualitäts-Review |

**Implementierungs-Agents:**

| Agent | Aufgabe |
|-------|---------|
| `implement-agent.md` | IMP-\*-Slices ausführen (Build + Test) |
| `implement-fix-planner-agent.md` | Evidenzbasierter Fix-Plan |
| `implement-review-*.md` | 6 Review-Perspektiven (Pessimist, Lehrer, Normalo, Oberlehrer, Professor, Optimist) |

**ADO-Agents:**

| Agent | Aufgabe |
|-------|---------|
| `ado-agent.md` | Orchestrator für ADO-Work-Items |
| `ado-story-pruefe-agent.md` | Feature-Cascade-Analyse |
| `ado-task-pruefe-agent.md` | Task-Draft + Code-Scout |

---

### `skills/` — Skill-Pakete

Jedes Verzeichnis enthält eine `SKILL.md` mit dem Workflow und optional einen `references/`-Unterordner mit Hilfsdokumenten.

**Kern-Workflows:**

| Skill | Beschreibung |
|-------|-------------|
| `planning-workflow/` | 6-Phasen-Planung: Anforderung → Scouts → Interface → Topics → Review → Synthese |
| `implementation-workflow/` | Agent-Mode: 1–10 Slices, Hard Gate, max. 3 Review-Iterationen |
| `buddy-agent/` | Pre-Planning Sparring: intake → compress → repo-check → diskussion → plan-prompt |
| `repo-scout-protocol/` | Scout-Kette (Index → Filesystem-MCP), Artefakt-Routing, Scout-Protokoll-Tabelle |

**ADO-Integration:**

| Skill | Beschreibung |
|-------|-------------|
| `ado/` | Work Items laden, analysieren, speichern; Todos, Status, Task-Completion |

**MCP-Kanon (1 Skill = 1 Server):**

| Skill | MCP-Server |
|-------|------------|
| `codebase-analyzer/` | Index, Review, AST, Refactoring-Safety, Nullability |
| `dev-filesystem-mcp/` | Token-effizientes Lesen/Suchen (`file_path`, `/project/...`) |
| `dev-angular-mcp/` | Angular-Scaffolding + Build/Test (`project_root`, `/workspace/...`) |
| `dev-dotnet-mcp/` | .NET-Scaffolding + Build/Test (`output_path`, `base_path`, `path`, `/workspace/...`) |
| `build-log-filter/` | Build-/Test-Log filtern (`filter_output`, `tool_type`) |
| `dev-tooling-mcp/` | **Router** — welcher Dev-MCP wann (kein eigener Server) |

**Angular-Ökosystem (v20+):**

| Skill | Beschreibung |
|-------|-------------|
| `angular-developer/` | Signals, DI, Routing, Forms, Testing |
| `angular-developer-extension/` | Migrations, Signal-Architektur, Testing-Extensions |
| `angular-new-app/` | Greenfield-Setup (`ng new`) |
| `angular-new-app-extension/` | Decision Gates, Docs-Checks, Planung |
| `angular-cache-busting/` | outputHashing, Meta-Tags, stale index.html |
| `angular-material/` | 35 Komponenten, 23 CDK-Module, Theming (v22.0.0) |
| `angular-material-custom-input/` | Custom Material Form Controls (ControlValueAccessor) |
| `angular-refactor/` | Refactoring-Workflow mit Test-Policy |

**Backend:**

| Skill | Beschreibung |
|-------|-------------|
| `backend-ef-migrations/` | EF Core Migrations CLI, Triplet-Enforcement, SQL-Views |

**Kommunikation & Session:**

| Skill | Beschreibung |
|-------|-------------|
| `describe-as/` | Gespräch zu kopierbarem Markdown-Handoff-Prompt verdichten |
| `describe-as-html-prompt/` | HTML-Handoff mit Mermaid-Diagrammen |
| `caveman/` | Knowledgeable-Caveman-Kommunikationsmodus |
| `commit-message/` | Git-Commit-Messages generieren |
| `conversation-insights/` | Session-Erkenntnisse als log.md festhalten |

---

### `rules/` — Cursor-Rules

`.mdc`-Dateien, die **nur in Cursor** aktiv sind. Sie injizieren automatisch Kontext basierend auf Dateimustern oder Keywords und leiten bei Bedarf an Agent-Profile weiter.

> Claude Code verwendet keine `.mdc`-Dateien. Das Äquivalent dort ist das `description`-Frontmatter einer Skill-Datei.

| Rule | Trigger (Beispiele) |
|------|---------------------|
| `planning-workflow-skill.mdc` | `plane`, `Wie gehen wir vor?`, Roadmap |
| `implementation-workflow-skill.mdc` | `implementiere`, `setze um`, `fix`, `leg los` |
| `angular-skills.mdc` | Angular-Dateien, `ng`, Signals, Routing |
| `ado-skill.mdc` | `load`, `analyse`, `save`, Task-Status |
| `build-log-filter.mdc` | `ng serve`, `npm start`, Shell-Fallback nach MCP-BLOCKER |
| `codebase-analyzer.mdc` | Code-Review-Fragen, Symbol-Suche |
| `dev-tooling-mcp.mdc` | `.cs`/`.ts`-Reads, Scaffolding, Build, Test |
| `buddy-agent-skill.mdc` | `@buddy-agent`, `buddy intake` |
| `repo-scout-protocol.mdc` | `repo-check`, `buddy repo-check`, Code-Landkarte, `plan-agent-scout` |

---

### `packages/` — Package-Manifeste

JSON-Manifeste definieren, welche Artefakte ein Paket enthält und wohin sie deployed werden.

```jsonc
// Beispiel: packages/planning-workflow.json
{
  "name": "planning-workflow",
  "skills": ["skills/planning-workflow/"],
  "agents": ["agents/plan-agent-scout.md", "..."],
  "rules": ["rules/planning-workflow-skill.mdc"],
  "references": ["references/subagent-model-before-task.md"],
  "params": ["frontend-path", "backend-path"]
}
```

**Verfügbare Pakete:**

`ado-requests-stories` · `agent-compliance` · `angular-bundle` · `angular-material-custom-input` · `angular-refactor` · `backend-ef-migrations` · `buddy-agent` · `build-log-filter` · `caveman` · `codebase-analyzer` · `commit-message` · `conversation-insights` · `describe-as` · `describe-as-html-prompt` · `dev-angular-mcp` · `dev-dotnet-mcp` · `dev-filesystem-mcp` · `dev-tooling-mcp` · `implementation-workflow` · `mcp-path-canon` · `planning-workflow` · `repo-scout-protocol`

---

### `references/` — Geteilte Referenzen

Dateien, die von mehreren Paketen gemeinsam genutzt werden:

| Datei | Inhalt |
|-------|--------|
| `mcps.md` | MCP-Router (wann welcher Server) — Kanon in `skills/<mcp>/SKILL.md` |
| `mcp-scout-fallback-chain.md` | **Alias** → Agent-Kanon: `skills/repo-scout-protocol/SKILL.md`; Menschen-Doku: `docs/mcp-scout-fallback-chain.md` |
| `subagent-model-before-task.md` | Vorgabe: Model-Sektion des Agent-Profils vor jeder Aufgabe lesen |
| `agent-compliance.md` | Verbindliche Skill/Workflow-Compliance; Orchestrator → Subagent Delegation |
| `subagent-delegation-boilerplate.md` | Copy-Paste-Block für Task-Prompts (Pflicht bei Delegation) |
| `mcp-project-paths.md` | **Deploy-Kanon** — MCP container paths + Backend routing (generiert aus skill-params) |
| `mcp-smoke-test.md` | Smoke-Tests nach MCP-Pfad-/Install-Änderungen |
| `verification-commands.md` | Projekt-spezifische Build/Test-Befehle pro Stack |

---

### `mcp.json` — MCP-Konfiguration (Referenz)

Aggregiertes Zielbild aller MCP-Server (Ports, Volume-Mounts, `autoApprove`). **Deploy-Quelle** sind die `"mcp"`-Blöcke in `packages/*.json` — `install-cursor-skills.ps1` / `update-cursor-skills.ps1` mergen daraus `.cursor/mcp.json`. Nach Package-Änderungen `mcp.json` hier als Referenz synchron halten. Für Claude Code den `"mcpServers"`-Block manuell übernehmen.

```
Log-Ports (interner HTTP-Log-Viewer, nicht MCP-Transport — alle Server nutzen stdio):
  8089  build-log-filter        ← kein autoApprove
  8090  codebase-analyzer       ← Volume-Mount erforderlich, 30 autoApproved Tools
  8091  dev-filesystem-mcp      ← Volume-Mount erforderlich, 6 autoApproved Tools
  8092  dev-angular-mcp         ← Volume-Mount erforderlich, 4 autoApproved Tools
  8093  dev-dotnet-mcp          ← Volume-Mount erforderlich, 4 autoApproved Tools
```

Die meisten Server haben eine `autoApprove`-Liste, sodass häufig genutzte Tools ohne Bestätigungs-Prompt aufgerufen werden. Ausnahme: `build-log-filter` hat kein `autoApprove` — jeder Aufruf erfordert Bestätigung.

Die `mcp.json` enthält außerdem einen `ado`-Eintrag für Azure DevOps (`@azure-devops/mcp`). Dieser erfordert die eigene ADO-Organisations-URL als Parameter — der Platzhalter `<IhreOrganisation>` muss nach dem Deploy ersetzt werden. Details: [`docs/InstallUpdate.md`](../docs/InstallUpdate.md#ado-mcp-konfigurieren).

---

## Installation & Update

➡️ Vollständige Anleitung: **[`docs/InstallUpdate.md`](../docs/InstallUpdate.md)**

**Windows (PowerShell):**
```powershell
# Verfügbare Pakete anzeigen
.\AI-Skills\install-cursor-skills.ps1 -List

# Deployen (Cursor + Claude Code)
.\AI-Skills\install-cursor-skills.ps1 C:\project\.cursor C:\project\.claude

# Update (manifest-basiert, entfernt veraltete Dateien)
.\AI-Skills\update-cursor-skills.ps1 C:\project\.cursor C:\project\.claude
```

**Linux/macOS:**
```bash
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude
```

---

## Was wohin deployed wird

| Artefakt | `.cursor/` | `.claude/` |
|----------|-----------|-----------|
| Rules (`.mdc`) | ✅ `rules/` | — nur Cursor |
| Skills | ✅ `skills/<name>/` | ✅ `skills/<name>/` |
| Agents | ✅ `agents/` | ✅ `agents/` |
| References | ✅ `references/` | ✅ `references/` |

> **MCP-Pfade:** `.cursor/references/mcp-project-paths.md` (deployt, aus `skill-params.json` generiert). Root-`AGENTS.md` ist für MCP **nicht** erforderlich.
