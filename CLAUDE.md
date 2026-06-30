# Dv.Ai.Development — Claude Code Guide

This repository contains **AI workflow artifacts** (skills, agents, references) for Claude Code and **MCP server implementations** for Angular/.NET development.

---

## Zweck dieses Repos: Start-Claude-Harness

Dieses Repo ist das **zentrale Harness** — Vorlage und Ausgangsbasis für andere Test- und Kundenprojekte. Alles hier (`.claude/`, Skills, References, Agents, MCP-Server) wird in andere Projekte übertragen oder dort referenziert.

### Entscheidungsregel für Änderungen

Bevor eine Änderung an `.claude/`, Skills, References, Agents oder MCP-Servern übernommen wird, gilt:

| Änderungstyp | Vorgehen |
|---|---|
| **Verbesserung / Schärfung von Bestehendem** — klarer, präziser, robuster | Direkt übernehmen |
| **Etwas gänzlich Neues aus einem anderen Projekt** — Feature, Regel, Tool | Kritisch prüfen: Ist das harness-generisch oder projektspezifisch? Im Zweifel **nachfragen, bevor es übernommen wird** |

**Leitfrage für Neues:** Würde das in *jedem* Projekt auf diesem Harness Sinn machen — oder löst es ein konkretes Problem aus Projekt X?

- Ja → Harness-tauglich, kann aufgenommen werden
- Nein / unklar → Projektspezifisch lassen, nicht übernehmen; User fragen

---

## Repository Structure

```
.claude/                Claude Code — direkt nutzbar
├── skills/             21 Skills (via /skill-name oder automatisch)
│   ├── feature-delivery/        Orchestrator: Planung + Implementierung, drei Einstiege
│   ├── software-design-principles/         Persönliche Design-Philosophie: sauber·funktional·getestet·wartbar·nachhaltig
│   ├── acceptance-design/       Anforderungen auf Testbarkeit prüfen und schärfen
│   ├── requirement-definition/  Epic→Feature→Story Breakdown: INVEST, Richard-Lawrence-Splitting, F1-Akzeptanzkriterien
│   ├── angular-developer/       Angular Bundle: Language API, Projektstruktur, Signal-Architektur, Test-Policy, Migrationen
│   ├── angular-new-app/         Angular New App Bundle: ng new, ng generate, Decision Gate, Implementierungsplan, Subagents
│   ├── angular-material/        Angular Material Bundle: Komponenten, Theming, CDK, Custom mat-form-field Inputs
│   ├── backend-ef-migrations/   EF Core Migrations
│   ├── dev-tooling/             MCP-Gateway: Routing-Einstieg fuer dev-mcp, codebase-analyzer, build-log-filter
│   ├── dev-mcp/                 49 Tools: filesystem, dotnet, angular, git, patch
│   ├── build-log-filter/        Build-Log-Kompression
│   ├── codebase-analyzer/       Statische Analyse & Review
│   ├── code-intel-workflow/     Code-Intel: narrow→read→impact→verify
│   ├── grill-me/                Interaktives Verhoer einer Story/Plan: eine Frage+Empfehlung bis alle Entscheidungen klar sind
│   ├── skill-creator/           Meta-skill: create/improve skills and agent profiles
│   ├── delivery-inspection/     Delivery check: 6 Reviewer prüfen Anforderungserfüllung vor Auslieferung
│   ├── test-design/             AAA · Namenskonvention · Magic Strings (interne Dep. feature-delivery)
│   ├── describe-as/             Stil-Anpassung
│   ├── commit-message/          Commit-Message-Generator
│   ├── prozess-retrospektive/   Prozess-Analyse: Harness-Verbesserungsideen + Session-Erkenntnisse
│   ├── caveman/                 Kommunikationsstil: Caveman
│   └── de-en-communication/     Kommunikationsregeln: Deutsch/Englisch — Text DE, Code EN, Voice Mixed
├── agents/             Sub-Agent-Profile (auto-discovered) — alle Agent-Profile zentral hier (22 Profile; 21 von skills/*/agents/ migriert via STORY-004)
└── references/         Shared references (compliance, output-style, boilerplate)

Mcp-Servers/            MCP server implementations
├── Build.Log.Filter.Mcp/       build-log-filter — Build/Test log compression (Docker)
├── Codebase.Analyzer.Mcp/      codebase-analyzer — static analysis, index, review (Docker/Node)
├── Dev.Mcp/Dev.Mcp/            dev-mcp — unified stdio exe: filesystem+dotnet+angular+git+patch
├── Dev.Filesystem.Mcp/         VERALTET — in dev-mcp integriert
├── Dev.Angular.Mcp/            VERALTET — in dev-mcp integriert
└── Dev.Dotnet.Mcp/             VERALTET — in dev-mcp integriert

docs/                   Skill docs, MCP docs, enforcement references
├── skills/             Skill usage docs (usage, sub-agents, examples)
│   ├── feature-delivery.md
│   ├── acceptance-design.md
│   ├── codebase-analyzer.md
│   ├── build-log-filter.md
│   ├── dev-tooling-mcp.md
│   ├── angular-developer.md
│   ├── ado.md
│   ├── utility-skills.md
│   └── angular-material-v22-components.md
├── mcp/                MCP server reference docs
│   ├── dev-mcp.md
│   ├── codebase-analyzer.md
│   ├── build-log-filter.md
│   └── scout-fallback-chain.md
├── silent-shortcut-prevention.md
└── output-style-enforcement.md
```

---

## Key Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/feature-delivery` | `plane`, `implementiere`, `fix`, `feature-delivery` | Orchestrator: Planung + Implementierung, drei Einstiege |
| `/acceptance-design` | `schärfe Anforderung`, `Akzeptanzkriterien prüfen` | Anforderungen auf Testbarkeit prüfen und schärfen |
| `/requirement-definition` | `ich brauche ein Feature für…`, `schneide das in Stories`, `Anforderung erfassen` | Epic→Feature→Story Breakdown: INVEST, Splitting, F1-Akzeptanzkriterien → `requests/` |
| `/dev-tooling` | `welcher MCP`, `MCP-Einstieg`, Dev-Tooling-Fragen | Gateway: Routing zu dev-mcp, codebase-analyzer, build-log-filter |
| `/dev-mcp` | Dateien lesen/suchen, Scaffolding, Build, Test | 49 Tools — MCP-First-Gate für alle Dev-Operationen |
| `/codebase-analyzer` | Code-Gespräch, Review, Analyse | 43 MCP-Tools für Angular/.NET (inkl. Composite/Domain-Finder) |
| `/code-intel-workflow` | Symbol suchen, Rename-Impact, Post-Slice | MCP-Routing: narrow→read→impact→verify |
| `/build-log-filter` | `ng serve`, Shell-Fallback | Build/Test-Log-Filterung |
| `/angular-developer` | Angular-Arbeit | Bundle: Language API, Projektstruktur, Signal-Architektur, Test-Policy, Migrationen |
| `/software-design-principles` | `meine Prinzipien`, `@software-design-principles`, `beachte meine Designregeln`, `flow design` | Persönliche Design-Philosophie: 5 Werte + Flow Design + IODA/IOSP + SOLID + persönliche Regeln |
| `/grill-me` | `grill mich`, `befrage diese Story`, `schärf den Plan`, `hinterfrage den Plan` | Interaktives Verhör einer Story/Plan: eine Frage+Empfehlung bis alle Entscheidungszweige klar |
| `/skill-creator` | `create skill`, `agent profil` | Skills und Agents erstellen/verbessern |
| `/delivery-inspection` | Vor jeder Auslieferung | 6-Reviewer Anforderungserfüllungs-Gate |
| `/de-en-communication` | *(immer aktiv)* | Kommunikationsregeln: Text DE, Code EN, Voice Mixed |

---

## Adding or Changing a Skill / Agent

| Step | File |
|------|------|
| 1. Edit content | `.claude/skills/<name>/SKILL.md` + `references/` |
| 2. Edit agent | `.claude/agents/<name>.md` |
| 3. Update shared refs | `.claude/references/` |

Use `/skill-creator` to create new skills or agent profiles.

---

## Adding or Changing an MCP Server

| Folder | MCP Server Key | Skills |
|--------|---------------|--------|
| `Mcp-Servers/Build.Log.Filter.Mcp/` | `build-log-filter` | build-log-filter |
| `Mcp-Servers/Codebase.Analyzer.Mcp/` | `codebase-analyzer` | codebase-analyzer |
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/` | `dev-mcp` | dev-mcp |

When changing an MCP: update `Mcp-Servers/<name>/`, update `docs/mcp/<name>.md`, and update the matching skill under `.claude/skills/`.

---

## MCP Configuration

| Server | Transport | Details |
|--------|-----------|---------|
| build-log-filter | Docker HTTP | Port 8089 |
| codebase-analyzer | **Node stdio** | `C:\Develop\.apps\codebase-analyzer\index.js`, Log-Viewer Port 5052 |
| dev-mcp | **stdio** | `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`, Log-Viewer Port 5050 |

**Path convention (both MCPs):** Windows absolute paths (`C:\Develop\...`). No Docker, no `/workspace/` prefix, no `{parameter}` placeholders.

---

## MCP-First (immer aktiv)

Wenn Code oder Symbole im Repo nachgeschaut werden — MCP vor nativem Read/Grep:

| Aufgabe | Erster Griff |
|---------|-------------|
| Symbol / Datei suchen | `dev-mcp`: `find_file`, `find_by_content` |
| Klasse / Methode lesen | `dev-mcp`: `read_class_summary`, `read_signatures_only`, `read_method` |
| Index / Abhaengigkeiten | `codebase-analyzer`: `find_in_index`, `index_project` |
| Angular-Tests ausführen | `dev-mcp`: `test_angular_project` — ng test via Shell/PowerShell niemals erlaubt |
| .NET-Tests ausführen | `dev-mcp`: `test_dotnet_solution` — immer `test_project_path` für Primary-Target angeben (→ Verhaltensregeln) |
| Native Read / Grep | nur als dokumentierter Fallback — nach MCP-Versuch |

**Pfad-Format (verbindlich):** Windows-Absolutpfad `C:\Develop\...` — kein `/workspace/`, keine relativen Pfade.

---

## Verhaltensregeln

### Konventionsentscheidungen transparent kommunizieren

Wenn der Orchestrator oder ein Agent eine Konventionsentscheidung trifft, bei der **mehr als eine valide Option** existiert und die Wahl eine **User-sichtbare Auswirkung** hat: die getroffene Entscheidung direkt beim Fix in einem Halbsatz nennen — inklusive kurzem Alternativ-Hinweis.

**Regel:** Entscheiden, umsetzen, in einem Halbsatz nennen. Nicht fragen, nicht schweigen.

**Beispiel:** *„Nummerierung ab (2) — Windows-Konvention. Falls (1) gewünscht: ein Wort genügt."*

**Ausnahme:** Triviale oder eindeutige Entscheidungen ohne echte Alternative und ohne User-sichtbare Auswirkung erhalten keinen Kommentar — kein unnötiger Kommentar-Overhead.

*Hintergrund: STORY-010 — In Session v1 (#2) wurde ein Dedup-Counter bei `(2)` gestartet (Windows-Konvention) statt `(1)`. Der User bemerkte die Entscheidung erst im nächsten Turn. Diese Regel verhindert solche stillen Konventionsentscheidungen.*

---

### Git-Status-Check vor Statusaussagen

Vor jeder Statusaussage über Dateiänderungen: `git status` und ggf. `git branch` prüfen. Erst wenn keine Branch-Divergenz vorliegt, darf eine Statusaussage raus.

**Regel:** `git status` (und ggf. `git branch`) aufrufen bevor eine Aussage über den Änderungsstatus von Dateien formuliert wird. Bei erkannter Branch-Divergenz: korrekt kommunizieren — *„Edits auf Branch X vorhanden — nicht auf aktuellem Branch"*.

**Ausnahme:** Wenn der Kontext eindeutig zeigt, dass kein Branch-Wechsel stattgefunden hat (z. B. frisch geklontes Repo in derselben Session), ist der Check optional.

*Hintergrund: STORY-011 — In Session v1 (#1) führte ein Branch-Wechsel zu der falschen Aussage „Edits nicht gespeichert". Die Edits lagen auf Branch A, der aktuelle Branch war Branch B. Diese Regel verhindert aktiv falsches Vertrauen durch Branch-Divergenz.*

---

### .NET-Tests: test_project_path Pflichtangabe

BE-Tests immer mit `test_project_path` aufrufen. Primary Target: `LAC.ExperimentService.Tests\*.csproj`.

**Regel:** `test_dotnet_solution` ohne `test_project_path` auf `LAC.sln` läuft auf ApplicationLoggingService (26 Tests) — formal grün, aber nicht repräsentativ. Immer explizit angeben:

```
test_project_path="<solution-root>\LAC.ExperimentService.Tests\*.csproj"
```

**Ausnahme:** Gezielter Test einer anderen Komponente — dann das jeweilige Testprojekt explizit nennen, nie weglassen.

*Hintergrund: STORY-018 — Session v7 (#03): ohne test_project_path liefen nur 26 ApplicationLoggingService-Tests (grün), nicht die 45 ExperimentService-Tests (5 pre-existing Failures). Zweiter Call nötig — vermeidbar.*

---

### Parallele Story-Agents: kein Worktree

Wenn mehrere Stories parallel implementiert werden, DÜRFEN die Agents NICHT mit `isolation: "worktree"` gestartet werden — sie arbeiten direkt auf dem aktuellen Branch.

**Regel:** Parallele Story-Agents immer ohne `isolation: "worktree"` starten. Voraussetzung: `requirement-definition` hat die Parallelgruppen auf Datei-/Bereichsüberschneidungen geprüft (`touches`-Annotation je Story). Stories mit überschneidenden `touches` dürfen nicht parallel laufen.

**Ausnahme:** Wenn zwei Stories nachweislich dieselbe Datei im selben Abschnitt ändern — serialisieren statt Worktree.

*Hintergrund: Parallel-Session (STORY-001/002/003) — Worktree-Isolation erzeugte unnötigen Merge-Overhead und untracked-file-Konflikte bei Story-Status-Updates, obwohl die Stories unterschiedliche Dateien berührten.*

---

## Enforcement

Silent-shortcut prevention and MCP-first policy: `docs/silent-shortcut-prevention.md`

Agent compliance and output style: `.claude/references/agent-compliance.md`, `.claude/references/output-style-canon.md`

---

## Harness einrichten / aktualisieren

Ersteinrichtung oder Harness-Update → **[StartUpClaude.md](StartUpClaude.md)** öffnen und schrittweise durchführen.
**Update-Trigger:** Nutzer sagt „update" oder „aktualisiert" → AI geht nur offene Phase-B-Fragen durch (bereits beantwortete werden übersprungen).
