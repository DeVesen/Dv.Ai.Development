# Merge-Verifikations-Prompt

Du bist ein Verifikations-Agent. Deine Aufgabe ist es, nach dem Merge von Branch `claude/vigilant-curie-bckavh` in `master` zu prüfen, ob alle erwarteten Änderungen korrekt übernommen wurden. Prüfe systematisch jeden Punkt unten und erstelle am Ende eine Checkliste mit Pass/Fail pro Punkt.

---

## Kontext: Was wurde in diesem Branch gemacht?

Dieses Repository (`devesen/dv.ai.development`) ist eine **Wissenssammlung** für Cursor und Claude Code — kein aktives Arbeitsprojekt. Der Branch hat die bisherigen `AI-Skills/`-Inhalte (Cursor-optimiert) auf zwei Plattformen aufgeteilt:

- `Cursor-AI/` → Cursor-spezifische Inhalte (unveränderte Kopie von `AI-Skills/`)
- `Claude-Code-Ai/` → Claude Code-optimierte Version (`.claude/` Verzeichnisstruktur)

---

## 1. Repository-Struktur

### 1.1 Toplevel-Verzeichnisse

Folgende Verzeichnisse müssen im Root existieren:

```
Claude-Code-Ai/
Cursor-AI/
Mcp-Servers/
README.md
```

**Nicht mehr vorhanden sein dürfen:**
- `AI-Skills/` (war der alte kombinierte Ordner — muss weg)
- `AGENTS.md` (Cursor-spezifisch — muss weg)
- `mcps.md` (Cursor-spezifisch — muss weg)
- `CLAUDE.md` im Root (wurde nach `Claude-Code-Ai/CLAUDE.md` verschoben)
- `docs/` im Root (wurde nach `Cursor-AI/docs/` und `Claude-Code-Ai/docs/` aufgeteilt)

### 1.2 Claude-Code-Ai-Struktur

```
Claude-Code-Ai/
├── .claude/
│   ├── agents/          (21 Agent-Profile)
│   ├── references/      (7 gemeinsame Referenz-Dateien)
│   └── skills/          (27 Skills)
├── docs/
│   ├── mcp/             (6 MCP-Dokumentations-Dateien)
│   └── skills/          (diverse Skill-Dokumentationen)
├── CLAUDE.md
└── README.md
```

### 1.3 Cursor-AI-Struktur

```
Cursor-AI/
├── AI-Skills/           (originale Cursor-Skills, unverändert)
│   ├── agents/
│   ├── packages/        (ACHTUNG: sollte in Cursor-AI gelöscht sein, war nur im alten AI-Skills)
│   ├── references/
│   ├── rules/           (.mdc Dateien, Cursor-only)
│   ├── skills/
│   └── ...
├── docs/
│   ├── mcp-*.md
│   ├── silent-shortcut-prevention.md
│   ├── output-style-enforcement.md
│   └── ...
├── mcps.md
└── README.md
```

---

## 2. Claude-Code-Ai/.claude/agents/ — Vollständige Liste

Genau diese 21 Dateien müssen existieren:

```
ado-agent.md
ado-story-pruefe-agent.md
ado-task-pruefe-agent.md
implement-agent.md
implement-fix-planner-agent.md
implement-review-lehrer-agent.md
implement-review-normalo-agent.md
implement-review-oberlehrer-agent.md
implement-review-optimist-agent.md
implement-review-pessimist-agent.md
implement-review-professor-agent.md
plan-agent-interface-designer.md
plan-agent-merger.md
plan-agent-scout.md
plan-agent-synthesizer.md
plan-agent-topic-planner.md
plan-review-normalo-agent.md
plan-review-oberlehrer-agent.md
plan-review-optimist-agent.md
plan-review-pessimist-agent.md
plan-review-professor-agent.md
```

### 2.1 Agent-Modell-IDs

Alle Agents müssen gültige **Claude Model IDs** haben (keine Cursor-spezifischen IDs wie `composer-2.5-standard`).

**Agents mit `model: claude-sonnet-4-6`:**
- ado-agent, ado-story-pruefe-agent, ado-task-pruefe-agent
- implement-agent
- implement-review-normalo-agent, implement-review-optimist-agent
- plan-agent-scout
- plan-review-normalo-agent, plan-review-optimist-agent

**Agents mit `model: claude-opus-4-8`:**
- implement-fix-planner-agent
- implement-review-lehrer-agent, implement-review-oberlehrer-agent
- implement-review-pessimist-agent, implement-review-professor-agent
- plan-agent-interface-designer, plan-agent-merger
- plan-agent-synthesizer, plan-agent-topic-planner
- plan-review-oberlehrer-agent, plan-review-pessimist-agent, plan-review-professor-agent

**Prüfung:** Grep nach `composer-2.5-standard` in allen Agent-Dateien → muss 0 Treffer ergeben.

### 2.2 Verbotene Agent-Felder

Folgende Felder dürfen in keinem Agent-Profil stehen:
- `readonly:` (Cursor-only)
- `disable-model-invocation:` (Cursor-only)
- `alwaysApply:` (Cursor-only)

---

## 3. Claude-Code-Ai/.claude/references/ — Vollständige Liste

Genau diese 7 Dateien müssen existieren:

```
agent-compliance.md
mcp-scout-fallback-chain.md
mcp-smoke-test.md
output-style-canon.md
subagent-delegation-boilerplate.md
subagent-model-before-task.md
verification-commands.md
```

### 3.1 Inhaltliche Prüfungen

**agent-compliance.md:**
- Darf KEINE Referenzen auf `.cursor/rules/` enthalten
- Darf KEINE `{mcp-project-paths}` Platzhalter enthalten
- Alle Pfade müssen auf `.claude/` zeigen (nicht `.cursor/`)
- Muss Inhalt aus `agents-compliance.snippet.md` integriert haben

**subagent-delegation-boilerplate.md:**
- Darf KEINE `.cursor/references/`, `.cursor/agents/`, `.cursor/rules/*.mdc` enthalten
- `.cursor/mcps.md` darf nicht referenziert werden → stattdessen "verfügbare MCP-Tools (siehe docs/)"
- Alle Pfade müssen auf `.claude/` zeigen

**verification-commands.md:**
- `{frontend-path}` und `{backend-path}` Platzhalter dürfen NICHT mehr vorkommen
- Soll `/workspace/[frontend-relativer-pfad]` und `/workspace/[backend-relativer-pfad]` verwenden
- `build-log-filter.mdc` Referenz muss durch `build-log-filter` Skill-Referenz ersetzt sein
- `{agent-compliance}` Platzhalter muss durch `.claude/references/agent-compliance.md` ersetzt sein

**mcp-scout-fallback-chain.md:**
- Darf KEINE `.cursor/mcps.md` Referenz enthalten
- Muss direkte MCP-Tool-Listen für `codebase-analyzer` und `dev-filesystem-mcp` eingebettet haben

**subagent-model-before-task.md:**
- `.cursor/agents/` Referenzen müssen durch `.claude/agents/` ersetzt sein

---

## 4. Claude-Code-Ai/.claude/skills/ — Vollständige Liste

Genau diese 27 Skill-Verzeichnisse müssen existieren, jedes mit einer `SKILL.md`:

```
ado/
angular-cache-busting/
angular-developer/
angular-developer-extension/
angular-material/
angular-material-custom-input/
angular-new-app/
angular-new-app-extension/
angular-refactor/
backend-ef-migrations/
buddy-agent/
build-log-filter/
caveman/
codebase-analyzer/
commit-message/
conversation-insights/
describe-as/
dev-angular-mcp/
dev-dotnet-mcp/
dev-filesystem-mcp/
dev-tooling-mcp/
implementation-workflow/
planning-workflow/
repo-scout-protocol/
skill-creator/
work-review/
work-review-iterative/
```

### 4.1 Allgemeine Skill-Anforderungen (gilt für alle SKILL.md)

**VERBOTEN in jedem SKILL.md:**
- `{parameter}` Platzhalter in jeder Form (z.B. `{frontend-path}`, `{workspace-root}`, `{backend-path}`)
- Referenzen auf `mcps.md` (weder `.cursor/mcps.md` noch andere Varianten)
- Referenzen auf `.mdc` Dateien
- `alwaysApply:` im Frontmatter
- `disable-model-invocation:` im Frontmatter

**ERFORDERLICH in jedem SKILL.md:**
- Gültiges YAML-Frontmatter mit `name:` und `description:`
- Skills, die MCP-Tools nutzen, müssen die Tool-Liste **direkt eingebettet** haben (nicht per Referenz auf mcps.md)

### 4.2 Skill-spezifische Prüfungen

**skill-creator/SKILL.md:**
- Darf KEINEN Abschnitt "Cursor Rule (.mdc)" oder "Creating a Cursor Rule" enthalten
- Darf KEINE "Dual-Platform Quick Reference" Sektion enthalten
- Darf KEINE AI-Skills Package-Manifest-Pflege Anweisungen enthalten
- Darf KEINE PowerShell Deploy-Anweisungen enthalten
- Darf KEINEN `/rule-creator` Alias enthalten
- Darf KEINE `.cursor/rules` oder `cursorrules` oder `.mdc erstellen` Referenzen enthalten
- Beschreibt nur noch Claude Code Skill-Erstellung

**skill-creator/references/cursor-rules.md:**
- Diese Datei darf NICHT mehr existieren (wurde gelöscht)

**build-log-filter/SKILL.md:**
- Muss den operativen Inhalt aus der alten `build-log-filter.mdc` integriert haben (nicht nur Trigger-Phrasen)

**codebase-analyzer/SKILL.md:**
- Muss direkte MCP-Tool-Liste für `codebase-analyzer` (Port 8090) eingebettet haben
- Muss MCP-Pfad-Kanon Abschnitt enthalten (`/workspace/` Prefix-Regel)

**dev-filesystem-mcp/SKILL.md:**
- Muss direkte MCP-Tool-Liste für `dev-filesystem-mcp` (Port 8091) eingebettet haben
- Muss MCP-Pfad-Kanon Abschnitt enthalten (`/project/` Prefix-Regel)

**dev-angular-mcp/SKILL.md:**
- Muss direkte MCP-Tool-Liste für `dev-angular-mcp` (Port 8092) eingebettet haben

**dev-dotnet-mcp/SKILL.md:**
- Muss direkte MCP-Tool-Liste für `dev-dotnet-mcp` (Port 8093) eingebettet haben

### 4.3 silent-shortcut-prevention.md Referenzierung

An jeder Stelle in Skills, wo Muss/VERBOTEN/STOPP/Blocker/Enforcement steht, soll auf `docs/silent-shortcut-prevention.md` (bzw. `Claude-Code-Ai/docs/silent-shortcut-prevention.md`) verwiesen werden.

Prüfe mindestens folgende Skills auf diese Referenz:
- build-log-filter, codebase-analyzer, implementation-workflow, planning-workflow, repo-scout-protocol

---

## 5. Claude-Code-Ai/CLAUDE.md

- Muss existieren (nicht im Root, sondern in `Claude-Code-Ai/`)
- Muss `.claude/`-first Struktur beschreiben
- Darf KEINE AI-Skills Deploy-Anweisungen enthalten
- Muss MCP-Konfigurationstabelle enthalten (mit Port, Image, Volumes)
- Darf KEINE Cursor-spezifischen Verweise enthalten

---

## 6. Cursor-AI/ — Vollständigkeitsprüfung

Die Cursor-Seite soll ein Spiegel des alten `AI-Skills/` sein:

**Muss in `Cursor-AI/AI-Skills/` existieren:**
- `agents/` Verzeichnis mit Cursor-Agent-Profilen
- `rules/` Verzeichnis mit `.mdc` Dateien
- `skills/` Verzeichnis mit den originalen Cursor-SKILLs
- `references/` Verzeichnis
- `update-cursor-skills.ps1`

**Muss in `Cursor-AI/docs/` existieren:**
- `silent-shortcut-prevention.md`
- `mcp-build-log-filter.md`, `mcp-codebase-analyzer.md`, `mcp-dev-angular.md`, `mcp-dev-dotnet.md`, `mcp-dev-filesystem.md`, `mcp-scout-fallback-chain.md`
- `output-style-enforcement.md`

---

## 7. Was NICHT verändert sein darf

**`Mcp-Servers/`** — Muss vollständig unverändert von master übernommen worden sein. Keine neuen, geänderten oder gelöschten Dateien.

---

## 8. Globale Grep-Prüfungen

Führe folgende Greps über das gesamte `Claude-Code-Ai/` Verzeichnis durch. Alle müssen **0 Treffer** ergeben:

```bash
# Cursor-spezifische Model IDs
grep -r "composer-2.5-standard" Claude-Code-Ai/

# Platzhalter
grep -r "{frontend-path}" Claude-Code-Ai/
grep -r "{backend-path}" Claude-Code-Ai/
grep -r "{workspace-root}" Claude-Code-Ai/
grep -r "{mcp-project-paths}" Claude-Code-Ai/
grep -r "{agent-compliance}" Claude-Code-Ai/
grep -r "{parameter}" Claude-Code-Ai/

# Veraltete Referenzen
grep -r "mcps\.md" Claude-Code-Ai/
grep -r "\.cursor/" Claude-Code-Ai/
grep -r "\.mdc" Claude-Code-Ai/
grep -r "cursor-rules" Claude-Code-Ai/
grep -r "disable-model-invocation" Claude-Code-Ai/
grep -r "alwaysApply" Claude-Code-Ai/
grep -r "readonly:" Claude-Code-Ai/.claude/agents/
```

---

## 9. Erlaubte Abweichungen / Bekannte Ausnahmen

- `Cursor-AI/AI-Skills/rules/*.mdc` enthält `.mdc` Dateien — das ist korrekt und gewollt (Cursor-only)
- `Cursor-AI/AI-Skills/` kann `mcps.md` und Cursor-spezifische Inhalte enthalten — das ist korrekt
- `Claude-Code-Ai/docs/` kann Referenzen auf `docs/silent-shortcut-prevention.md` enthalten — das ist gewollt

---

## 10. Erwartetes Ergebnis dieser Prüfung

Nach erfolgreichem Merge und korrekter Übernahme aller Änderungen sollte das Ergebnis sein:

```
PASS: Repository-Struktur korrekt (Claude-Code-Ai/, Cursor-AI/, Mcp-Servers/)
PASS: AI-Skills/ nicht mehr im Root
PASS: AGENTS.md nicht mehr im Root
PASS: mcps.md nicht mehr im Root (nur noch in Cursor-AI/)
PASS: CLAUDE.md nicht mehr im Root (nur noch in Claude-Code-Ai/)
PASS: 21 Agent-Dateien in Claude-Code-Ai/.claude/agents/
PASS: Keine composer-2.5-standard Model IDs in agents/
PASS: 7 Reference-Dateien in Claude-Code-Ai/.claude/references/
PASS: agent-compliance.md ohne .cursor/ Referenzen
PASS: verification-commands.md ohne {frontend-path} Platzhalter
PASS: mcp-scout-fallback-chain.md ohne mcps.md Referenz
PASS: 27 Skill-Verzeichnisse in Claude-Code-Ai/.claude/skills/
PASS: Keine mcps.md Referenzen in Skills
PASS: Keine {parameter} Platzhalter in Skills
PASS: skill-creator ohne Cursor-Abschnitte
PASS: skill-creator/references/cursor-rules.md gelöscht
PASS: Claude-Code-Ai/CLAUDE.md mit MCP-Tabelle
PASS: Mcp-Servers/ unverändert
PASS: Alle Grep-Checks ergeben 0 Treffer
```

Erstelle bei Abweichungen eine konkrete Liste der zu korrigierenden Dateien und der jeweiligen Änderung.
