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
| `implement-review-*.md` | 5 Review-Perspektiven (Pessimist, Lehrer, Normalo, Oberlehrer, Professor) |

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

**ADO-Integration:**

| Skill | Beschreibung |
|-------|-------------|
| `ado/` | Work Items laden, analysieren, speichern; Todos, Status, Task-Completion |

**Code-Analyse:**

| Skill | Beschreibung |
|-------|-------------|
| `codebase-analyzer/` | AST, Index, Refactoring-Safety, Nullability, Auto-Fixes |
| `dev-tooling-mcp/` | Token-effiziente Reads/Search + Angular/dotnet-Scaffolding |

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
| `build-log-filter.mdc` | Automatisch bei `ng build/test`, `dotnet build/test` |
| `codebase-analyzer.mdc` | Code-Review-Fragen, Symbol-Suche |
| `dev-tooling-mcp.mdc` | `.cs`/`.ts`-Reads, Scaffolding |
| `buddy-agent-skill.mdc` | `@buddy-agent`, `buddy intake` |

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

`ado-requests-stories` · `angular-bundle` · `angular-material-custom-input` · `angular-refactor` · `backend-ef-migrations` · `buddy-agent` · `build-log-filter` · `caveman` · `codebase-analyzer` · `commit-message` · `conversation-insights` · `describe-as` · `describe-as-html-prompt` · `dev-angular-mcp` · `dev-dotnet-mcp` · `dev-filesystem-mcp` · `implementation-workflow` · `planning-workflow`

---

### `references/` — Geteilte Referenzen

Dateien, die von mehreren Paketen gemeinsam genutzt werden:

| Datei | Inhalt |
|-------|--------|
| `mcps.md` | Situative MCP-Auswahlhilfe (codebase-analyzer vs. dev-filesystem-mcp) |
| `subagent-model-before-task.md` | Vorgabe: Model-Sektion des Agent-Profils vor jeder Aufgabe lesen |
| `verification-commands.md` | Projekt-spezifische Build/Test-Befehle pro Stack |

---

### `mcp.json` — MCP-Konfiguration

Definiert alle MCP-Server für das deployte Projekt. Wird beim Install in `.cursor/mcp.json` (Cursor) bzw. in die Claude-Code-Konfiguration eingebunden.

```
Ports:
  8089  build-log-filter
  8090  codebase-analyzer      ← Volume-Mount erforderlich
  8091  dev-filesystem-mcp     ← Volume-Mount erforderlich
  8092  dev-angular-mcp
  8093  dev-dotnet-mcp
```

Alle Server haben eine `autoApprove`-Liste der Tools, die ohne Bestätigungs-Prompt aufgerufen werden dürfen.

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
| Docs (AGENTS.md) | ✅ root | — |
