# Dv.Ai.Development

A Claude Code harness repository for Angular and .NET development. Provides custom skills and MCP servers that sit on top of the [Superpowers](https://github.com/obra/superpowers) plugin framework and extend it with domain-specific workflows, file system tooling, and deep code analysis. [Context7](https://claudedirectory.org/plugins/context7) keeps library documentation current at inference time.

## Prerequisites

Install both plugins globally in Claude Code before using this repo:

```
/plugin install superpowers@claude-plugins-official
/plugin install context7@claude-plugins-official
```

**Superpowers** — process framework (planning, TDD, debugging, review).  
**Context7** — up-to-date library documentation (Angular, .NET, and other dependencies).

## Repository Structure

```
.claude/
├── skills/                     Custom domain-specific skills
│   ├── angular/                Angular developer + Material + new-app scaffolding
│   ├── dotnet/                 .NET backend + EF Core migrations
│   ├── commit-message/         Conventional Commits generator
│   ├── de-en-communication/    Language rules (German/English)
│   ├── software-design-principles/  Personal design philosophy
│   ├── prozess-retrospektive/  Session process analysis
│   ├── regression-audit/       Change regression detection
│   ├── ado-mcp/                Azure DevOps work item operations + analysis
│   ├── microsoft-learn/        Routing skill for Microsoft Learn MCP server
│   ├── dev-mcp/                Routing skill for dev-mcp MCP server
│   └── codebase-analyzer/      Routing skill for codebase-analyzer MCP server
├── agents/                     Custom sub-agent profiles
├── references/                 Shared reference files
└── plugins/
    ├── superpowers/            Git submodule obra/superpowers (read reference)
    └── caveman/                Git submodule JuliusBrussee/caveman (read reference)

Mcp-Servers/
├── Build.Log.Filter.Mcp/       Build log filter (C#/.NET 9)
├── Codebase.Analyzer.Mcp/      Code intelligence engine (Node.js / TypeScript)
└── Dev.Mcp/                    Development toolchain gateway (C#/.NET)
```

---

## Skills

Skills live in `.claude/skills/` and guide Claude's behavior for specific workflows. The skills `dev-mcp` and `codebase-analyzer` are documented in the [MCP Servers](#mcp-servers) chapter below, since they exist solely to route tasks to their respective servers.

### Background — Always Active

These skills activate automatically on every interaction. No command needed.

---

#### `de-en-communication`

`Language` `Auto-trigger` `German` `English` `Voice Input`

Defines the language rules for all conversations: German for chat responses, English for source code, comments, documentation, and Markdown files. Handles voice input (responds in German with English tech terms) and mixed German/English requests.

**Auto-triggers on every interaction — no command needed.**

---

### Active — Invoke Explicitly

These skills are loaded when a specific command or keyword is detected in the conversation.

---

#### `angular`

`Angular` `TypeScript` `Material UI` `CDK` `Signals` `Routing` `Forms` `Testing` `Accessibility` `Migrations` `Scaffolding`

Full Angular/TypeScript development guidance. Covers components, signals, reactive and template-driven forms, dependency injection, routing, Material UI, CDK harnesses, testing, accessibility, animations, and migration from legacy patterns (NgModule → standalone, `ngIf`/`ngFor` → control flow). Also covers `ng new` scaffolding via a structured decision gate and sub-agent orchestration.

| Command / Trigger | Purpose |
|---|---|
| `/angular` · `@angular` | Load Angular guidance |
| `ng generate`, `ng new` | Scaffolding workflows |
| Angular error messages in chat | Auto-loaded on Angular context |
| `ohne angular` | Opt-out — skill not loaded |

> Build and test **always** via **dev-mcp** — never via shell commands.

---

#### `dotnet`

`.NET` `C#` `EF Core` `Migrations` `Postgres` `Backend` `Schema`

Guidance for .NET/C# backend work with a strong focus on EF Core migrations against Postgres: schema changes, model snapshots, `PendingModelChanges`, column errors, View-migrations, and `Down()` symmetry.

| Command / Trigger | Purpose |
|---|---|
| `/dotnet` · `@dotnet` · `@ef-migration` | Load .NET guidance |
| `dotnet ef migrations add` | EF migration workflow |
| `42703 column does not exist` | Auto-load on migration errors |
| `ohne dotnet` | Opt-out |

> **Hard rule:** Never create migration files manually — always via `dotnet ef migrations add`.

---

#### `commit-message`

`Git` `Conventional Commits` `Work Items` `Azure DevOps` `Jira` `GitHub Issues`

Generates a single Conventional Commits message from the current git state. Reads `git status`, `git diff`, and `git diff --staged`, then extracts the work item from the prompt, conversation context, or branch name (`AB#123`, `PROJ-42`, `#78`). Outputs a ready-to-paste code block — never executes `git commit` itself.

| Command / Trigger | Purpose |
|---|---|
| `/commit` | Generate commit message |
| "commit message schreiben" | Natural language trigger |
| "schreib den commit" · "commit fuer die Aenderungen" | Natural language trigger |

**Format:** `<type>(<work-item>): <imperative summary>`

**Types:** `feat` · `fix` · `refactor` · `perf` · `test` · `docs` · `chore` · `build` · `style` · `revert`

---

#### `software-design-principles`

`Design Philosophy` `Code Review` `SOLID` `IODA/IOSP` `Flow Design` `Clean Code` `DRY` `KISS` `YAGNI`

Applies a personal software design philosophy during design decisions and code reviews. Core values: *clean · functional · tested · maintainable · sustainable*. Enforces guard clauses over deep nesting, single-responsibility functions (one verb-noun pair per function), IODA/IOSP architecture separation (Integration methods orchestrate; Operation methods compute — never both), and Flow Design for upfront data-flow diagrams before writing code.

| Command / Trigger | Purpose |
|---|---|
| `/software-design-principles` · `@software-design-principles` | Load design philosophy |
| "meine Prinzipien" · "beachte meine Prinzipien" | Natural language trigger |
| "Design-Philosophie" · "sauber wartbar nachhaltig" | Natural language trigger |
| `ohne software-design` | Opt-out |

---

#### `prozess-retrospektive`

`Process` `Retrospective` `MCP Quality` `Improvement` `Session Analysis`

Analyzes the *process* of the current session — not what was delivered, but how it ran. Covers MCP call quality, orchestration efficiency, reviewer findings, friction points, and session learnings. Produces a prioritized improvement table for skills, agents, and MCP servers.

| Command / Trigger | Purpose |
|---|---|
| "retrospektive" · "prozess analyse" | Start session retrospective |
| "harness verbessern" · "was koennen wir verbessern" | Natural language trigger |
| "wie lief das" · "erkenntnisse" · "learnings" | Natural language trigger |
| `kein-retrospektive` · `no-retrospektive` | Opt-out |

> Always explicit — never auto-triggers.

---

#### `regression-audit`

`Git` `Regression` `Testing` `Audit` `Test Drift` `TDD`

Audits recent git commits for silent regressions, broken behavior, or test drift. Reads the commit log for a configurable window (default: 7 days), groups changes by subsystem, verifies that intended behavior is still present in the current code, and reports TDD violations (feature added without a test) and test drift (test changed without a requirement change) as separate signals.

| Command / Trigger | Purpose |
|---|---|
| `/regression-audit` · `@regression-audit` | Run regression audit |
| "regression prüfen" · "hat etwas gebrochen" | Natural language trigger |
| "stille regression" · "test drift" · "wöchentlicher audit" | Natural language trigger |
| `ohne regression-audit` | Opt-out |

---

#### `ado-mcp`

`Azure DevOps` `Work Items` `ADO` `MCP` `Tasks` `Status Marker`

Routes all Azure DevOps work item operations to the official Microsoft ADO MCP Server (`@azure-devops/mcp`). Covers reading work items by ID or URL, querying lists, updating fields and comments, and a dedicated analysis operation that decomposes work items into structured `docs/ado/<id>.md` files. Supports multi-task detection (numbered lists and bullet points) and tracks per-task implementation status via inline markers.

| Command / Trigger | Purpose |
|---|---|
| `ado-mcp init` | Configure `.mcp.json` entry (asks org + auth method) |
| Work item ID or URL in chat | Auto-loaded for work item read/update operations |
| "analysiere Workitem #1234" | Decompose WI into `docs/ado/<id>.md` |
| "Status aller Tasks" / "bist du schon umgesetzt" | Query per-task implementation status from ADO |
| "ich fange Task X an" / "Task X ist fertig" | Set `(sr-active)` / `(sr-done)` marker in ADO description |

**Status markers** — the skill reads and writes two inline emoji markers in ADO work item descriptions:

| Marker | Meaning |
|---|---|
| ✅ | Task completed |
| 🔄 | Task currently in progress |

**Setup:** Run `ado-mcp init` and Claude will write the `.mcp.json` entry for you.

---

#### `microsoft-learn`

`Microsoft` `Azure` `.NET` `ASP.NET Core` `EF Core` `C#` `Blazor` `Bicep` `MS Graph` `NuGet` `MCP`

Routes Microsoft and Azure documentation lookups to the official Microsoft Learn remote MCP server (`https://learn.microsoft.com/api/mcp`). Auto-triggers on questions about .NET APIs, Azure SDK usage, EF Core, ASP.NET Core configuration, Bicep templates, MS Graph, SignalR, and any other Microsoft technology where up-to-date official documentation matters more than training-knowledge.

| Command / Trigger | Purpose |
|---|---|
| `microsoft-learn init` | Configure `.mcp.json` entry (remote HTTP — no path needed) |
| `.NET API`, `Azure SDK`, `EF Core` queries | Auto-loaded on Microsoft tech context |
| "wie funktioniert X in .NET" / "Azure SDK Beispiel" | Natural language trigger |
| "ASP.NET config" / "EF Core migration syntax" | Natural language trigger |

**Tools available via this skill:**

| Tool | Purpose |
|---|---|
| `microsoft_docs_search` | Semantic search across all Microsoft Learn documentation |
| `microsoft_docs_fetch` | Fetch a full documentation page as Markdown |
| `microsoft_code_sample_search` | Find official code snippets — supports `language` filter |

**Setup:** Run `microsoft-learn init` and Claude will write the `.mcp.json` entry for you. No path required — the server is remote.

---

## MCP Servers

MCP (Model Context Protocol) servers extend Claude Code with direct access to development tools, running as local processes or containers. The skills `dev-mcp` and `codebase-analyzer` in `.claude/skills/` define routing rules and hard gates for using these servers.

**Golden rule:**
- **Read / search / build / test** → `dev-mcp`
- **Analyze / review / index / metrics** → `codebase-analyzer`
- **Filter noisy shell output** → `build-log-filter`

---

### dev-mcp

**Transport:** stdio (native .NET executable)  
**Location:** `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`  
**Source:** `Mcp-Servers/Dev.Mcp/`  
**Skill:** `.claude/skills/dev-mcp/`

The primary file system and toolchain gateway. Replaces all shell commands for build, test, scaffold, and file operations. If dev-mcp is unreachable Claude raises a hard blocker — no silent shell fallback is allowed (ng test has zero exceptions; it must always go through this server).

**Setup:** Run `dev-mcp init` and Claude will write the `.mcp.json` entry for you.

#### File & Search

| Tool | Purpose |
|---|---|
| `read_file_raw` | Read any file (.json, .md, .html, .scss, …) |
| `read_signatures_only` | Public API of a .cs / .ts file |
| `read_method` | Single method body |
| `read_class_summary` | Class structure overview |
| `read_component_bundle` | Full Angular component (ts + html + scss) |
| `read_files_batch` | Multiple files in one call |
| `list_directory` | Directory listing |
| `find_file` | Files by glob pattern |
| `find_by_content` | Regex content search |
| `find_implementations` | All implementations of an interface |
| `find_test_pattern` | Find matching spec / test class |

#### Build & Test

| Tool | Purpose |
|---|---|
| `build_angular_project` | `ng build` (replaces shell) |
| `test_angular_project` | `ng test` (replaces shell — no exceptions) |
| `lint_angular_project` | ESLint via Angular CLI |
| `build_dotnet_solution` | `dotnet build` |
| `test_dotnet_solution` | `dotnet test` |
| `publish_dotnet_project` | `dotnet publish` |
| `run_npm_script` | `npm run <script>` or `npm install` |
| `run_inspectcode` | JetBrains static analysis (.NET) |

#### Scaffold & Modify

| Tool | Purpose |
|---|---|
| `scaffold_angular_component` | `ng generate component` |
| `scaffold_angular_service` | `ng generate service` |
| `scaffold_spec_for` | Create a matching spec file |
| `scaffold_dotnet_test_class` | Create a .NET test class |
| `scaffold_dotnet_project` | Create a .NET project |
| `create_dotnet_solution` | Create a .NET solution |
| `git_move` | Move a file preserving git history |
| `rename_file_with_impact` | Rename + impact analysis |
| `apply_text_patch` | Patch a file |
| `replace_in_files` | Batch text replacement |
| `git_changed_files` | List files changed in git |
| `list_processes` | Running processes |

---

### codebase-analyzer

**Transport:** stdio (Node.js)  
**Location:** `C:\Develop\.apps\codebase-analyzer\index.js`  
**Source:** `Mcp-Servers/Codebase.Analyzer.Mcp/` (v2.9.0)  
**Skill:** `.claude/skills/codebase-analyzer/`

Deep code intelligence for Angular and .NET. Handles indexing, reviews, metrics, coverage, and composite multi-step analysis in a single call. All paths must be Windows absolute paths (`C:\...`). Phase-aware: automatically adapts its workflow to **Planning**, **Implementation**, or **Post-Implementation**.

**Setup:** Run `codebase-analyzer init` and Claude will write the `.mcp.json` entry for you.

#### Index & Symbol Lookup

| Tool | Purpose |
|---|---|
| `index_project` | Index an Angular or .NET project (supports batch via `projects[]`) |
| `index_solution` | Index a .NET solution (prefer `index_project` per `.csproj` if this fails) |
| `index_status` | Cache status of all indexes (stale?, symbolCount, indexedAt) |
| `find_in_index` | Symbol lookup in index (`paths_only` / `compact` / `full`) |
| `find_symbol_references` | All call sites of a symbol |
| `find_type_hierarchy` | Inheritance and implementation chain |

#### Review

| Tool | Purpose |
|---|---|
| `review_file` | Single-file review |
| `review_code` | Review code pasted in chat |
| `review_git_diff` | Review before a commit |
| `review_files_batch` | Multiple files at once |
| `review_with_index` | Final review with full project context |

#### Code Analysis

| Tool | Purpose |
|---|---|
| `analyze_compiler_diagnostics` | Compiler errors (Roslyn / TypeScript) |
| `analyze_complexity` | Cyclomatic complexity |
| `analyze_nullability` | Async / nullable analysis |
| `analyze_duplicates` | Duplicate code detection |
| `analyze_dead_code` | Dead code after refactoring |
| `analyze_dataflow` | Data flow analysis |
| `analyze_refactoring_safety` | Refactoring risk assessment |
| `analyze_method_extraction_candidates` | Extract-method suggestions |
| `analyze_control_flow` | Control flow analysis |
| `analyze_maintainability_index` | Maintainability index |
| `analyze_type_graph` | Architecture / dependency graph |
| `analyze_iosp_compliance` | IOSP check (Integration vs. Operation method mixing) |
| `detect_god_classes` | God-class growth detection |
| `generate_auto_fixes` | Automated fix suggestions |
| `suggest_class_splits` | Class split recommendations |
| `analyze_ast_only` | Raw AST analysis |

#### Test Quality & Coverage

| Tool | Purpose |
|---|---|
| `detect_untested_public_api` | Untested public API (`no_test_file` / `rendered_not_asserted` / `no_reference_found`) |
| `analyze_component_test_coverage` | Angular component coverage: level A/B/C, parent-spec matrix, template scenarios |
| `analyze_test_quality` | Test quality check (no test run required) |
| `analyze_coverage` | Coverage report (requires a prior test run) |
| `analyze_test_health` | Combined coverage + quality overview |
| `suggest_boyscout_actions` | Bundled boy-scout checks post-implementation |

#### API Contract & Navigation

| Tool | Purpose |
|---|---|
| `compare_validation_rules` | Angular form validators ↔ .NET DataAnnotations delta |
| `find_api_callers` | HttpClient calls in Angular services |
| `find_api_consumers` | .NET endpoint → all Angular call sites |
| `trace_api_contract` | FE service → BE endpoint + validation delta (one call) |
| `find_angular_route` | Route path → component + guards |
| `find_angular_guard` | Guard name → file + canActivate chain |
| `find_dotnet_endpoint` | Controller / action or route template → method + DTO |
| `find_di_registration` | Service / Interface → DI registration in Program.cs |
| `analyze_planning_inventory` | Endpoint / route / DTO inventory for planning |

#### Composite Tools — Multi-step in One Call

| Tool | Replaces |
|---|---|
| `scout_symbol` | `index_project` → `find_in_index` → `find_by_content` |
| `scout_scope` | Multiple `scout_symbol` calls → single scout table |
| `analyze_slice_impact` | compiler + boyscout + untested + refactoring checks |
| `analyze_advanced_all` | Full project health report (sprint-end / release) |

---

### build-log-filter

**Transport:** Docker HTTP — Port 8089  
**Source:** `Mcp-Servers/Build.Log.Filter.Mcp/` (C#/.NET 9)  
**Skill:** referenced from `prozess-retrospektive`

Reduces raw build and test output to errors, warnings, summaries, and stack traces. Primarily used as a filter for shell-based build log streams (e.g., `ng serve`) where dev-mcp streaming is not available. Supports both one-shot filtering and chunk-by-chunk streaming with session state.

| Tool | Purpose |
|---|---|
| `filter_output` | Filter a complete raw log |
| `filter_output_stream` | Filter a streaming log chunk-by-chunk (stateful via `session_id`) |

**Supported tool types:** `DotnetBuild` · `DotnetTest` · `NgBuild` · `NgTest` · `Jest` · `Vitest` · `NodeGeneric`  
**Output formats:** `text` (default) · `json`

**Docker:**
```bash
# Build
docker build -t build-log-filter-mcp .

# Run (interactive -i required for stdio)
docker run -i --rm build-log-filter-mcp
```

Or with Docker Compose (see `docker/docker-compose.yml` — `stdin_open: true` is already set).
