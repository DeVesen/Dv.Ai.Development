---
name: repo-scout-protocol
description: >
  Verbindliche Scout-Recherche-Kette für repo-check, Code-Landkarte und Planning-Scouts.
  Routing: Index → Filesystem-MCP bei leerem find_in_index; bei bekanntem Symbol Filesystem zuerst;
  Workflow-Artefakte (Skills/Rules/Packages) via Glob/Read unter {frontend-path}.
  Pflicht: index_solution bei Hinweis, Schema vor MCP-Aufruf, Scout-Protokoll-Tabelle je Scout-Antwort.
  Trigger: repo-check, buddy repo-check, Code-Scout, Code-Landkarte, plan-agent-scout.
  Opt-out: ohne repo-scout-protocol.
disable-model-invocation: true
---

# Repo-Scout-Protocol

Orchestrierungs-Skill für **Scout- und Recherche-Phasen** — keine Duplikation der MCP-Kanon-Skills.

**Kanon-Verweise (nur bei Bedarf laden):**

| MCP / Bereich | Kanon |
|---------------|-------|
| Index, Review, Metriken | [codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md) |
| Lesen/Suchen token-effizient | [dev-filesystem-mcp/SKILL.md](../dev-filesystem-mcp/SKILL.md) |
| Dev-MCP-Router | [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md) |
| MCP-Übersicht | `./mcps.md` |

## Parameter

| Parameter | Typische Bedeutung |
|-----------|-------------------|
| `{frontend-path}` | Frontend- oder Artefakt-Pfad (z. B. `src/AI-Skills` in Dv.Ai.Development) |
| `{backend-path}` | Backend- oder Server-Code-Pfad (z. B. `src/Mcp-Servers`) |
| `{workspace-root}` | Cursor-Workspace-Root (`.`) |
| `{agent-index}` | `./AGENTS.md` — konkrete Pfadwerte |

**Mount-Präfixe (verbindlich):**

| MCP | Container-Präfix | Parameter |
|-----|------------------|-----------|
| codebase-analyzer | `/workspace/` | `projectPath`, `filePath` |
| dev-filesystem-mcp | `/project/` | `file_path`, `root` |

Vor **jedem** MCP-Tool-Aufruf: Deskriptor/Schema lesen — Namen unterscheiden sich (`file_path` ≠ `filePath`).

---

## Wann gilt dieser Skill?

**Laden** wenn mindestens eines zutrifft:

- `repo-check`, `buddy repo-check`, Code-Scout, Code-Landkarte
- Planning Phase 3 / `plan-agent-scout`
- Agent erkundet Repo **read-only** (nicht nur erklären)
- Anderer Skill verweist auf situative MCP-Auswahl in Scout-Phase

**Nicht laden:**

- Reine Erklärung ohne Repo-Zugriff
- Implementierung/Umsetzung → [implementation-workflow](../implementation-workflow/SKILL.md)
- Build/Test-Verifikation → [build-log-filter](../build-log-filter/SKILL.md)

**Opt-out:** `ohne repo-scout-protocol`, `ohne scout-protokoll`

---

## Routing-Matrix (Kern)

| Situation | Erster Schritt | Zweiter Schritt | Dritter Schritt |
|-----------|----------------|-----------------|-----------------|
| Symbol/Bereich **unbekannt** (.cs/.ts) | Index: `index_project` oder `index_solution` | `find_in_index` | Filesystem: `find_by_content` oder `find_file` |
| Symbol/Pfad **bekannt** (Task, Handoff, Treffer) | Filesystem: `read_class_summary` / `read_signatures_only` / `read_method` | optional Index für Abhängigkeiten | — |
| Interface-Implementierungen | Filesystem: `find_implementations` | — | — |
| Index-Hinweis „use index_solution“ | **Pflicht** `index_solution` | `find_in_index` | Filesystem |
| **Workflow-Artefakt** (Skill, Rule, Agent, Package, `SKILL.md`, `.mdc`) | `Glob` unter `{frontend-path}/**` | `Read` der Treffer | `Grep` nur für Querverweise (`dependsOn`, Skill-Namen) |
| Deploy-/Install-Doku | `Glob` + `Read` | — | — |

**UI-only** (Button-Label ohne Symbol): kein Index-Zwang — siehe [op-code-map.md](../codebase-analyzer/references/op-code-map.md).

---

## Hard Rules

1. **Nach leerem `find_in_index`:** mindestens ein Filesystem-MCP-Versuch (`find_by_content` oder `find_file`) — **bevor** natives Read/Grep auf Klassennamen.
2. **`index_project`-Hinweis auf Solution:** `index_solution` ausführen, nicht ignorieren.
3. **MCP erreichbar:** Read/Grep **nicht** als Ersatz für MCP in Scout-Phasen.
4. **Scout mit MCP-Pflicht** (Buddy repo-check, plan-agent-scout): nicht mit nur nativen Tools abschließen ohne dokumentierte Warnung und Scout-Protokoll.
5. **Schema-Pflicht:** Parameter exakt wie im MCP-Deskriptor.

---

## Erlaubter Fallback (Read/Grep)

Nur wenn:

- mehrere Strategien aus der Routing-Matrix versucht wurden, **und**
- unter `### Warnungen` dokumentiert: welcher MCP, welches Tool, Ergebnis/Fehler, **und**
- kurze Begründung, warum kein weiterer MCP sinnvoll ist.

**Hard Stop** (analog andere MCP-Blocker): benötigter Server nicht in Tool-Liste → Scout nicht als abgeschlossen markieren; Nutzer auf `.cursor/mcp.json` hinweisen.

Statuszeile: `MCP: ok` oder `MCP: fallback (<Grund>)`.

---

## Scout-Protokoll (Pflicht-Ausgabe)

Jede Scout-Antwort enthält:

```markdown
## Scout-Protokoll

| # | Ziel / Repo-Frage | Strategie | MCP | Tool | Ergebnis | Nächster Schritt |
|---|-------------------|-----------|-----|------|----------|------------------|
| 1 | … | index | codebase-analyzer | find_in_index | 0 Treffer | → find_by_content |
| 2 | … | filesystem | dev-filesystem-mcp | find_by_content | 3 Dateien | → read_class_summary |
| … | | | | | | |

**Status:** MCP: ok | MCP: fallback (<Grund>)
**Fallback Read/Grep:** ja/nein — Begründung
```

Ohne vollständige Tabelle: Scout **nicht** als abgeschlossen markieren.

**Buddy repo-check:** Scout-Protokoll unter `## Repo-Check (Ergebnis)` einfügen (zusätzlich zu `### Beantwortet` usw.).

**plan-agent-scout:** Scout-Protokoll als Deliverable-Abschnitt **0b** (nach MCP-Analyse-Status).

---

## Ablauf-Checkliste (pro Repo-Frage)

1. `./mcps.md` lesen (fehlt → Default: `codebase-analyzer`).
2. Routing-Matrix: Situation zuordnen.
3. Schema lesen → MCP-Call.
4. Zeile in Scout-Protokoll.
5. Ergebnis leer/Fehler → nächste Strategie aus Matrix, nicht sofort Grep.
6. Alle Repo-Fragen bearbeitet → Scout-Protokoll + Status abschließen.

---

## Zusammenspiel

| Partner | Rolle |
|---------|-------|
| [buddy-agent](../buddy-agent/SKILL.md) repo-check | Konsument — lädt diesen Skill in Agent-Mode |
| [codebase-analyzer](../codebase-analyzer/SKILL.md) | Index, Review — nicht alleiniger Scout |
| [dev-filesystem-mcp](../dev-filesystem-mcp/SKILL.md) | Pflicht-Zweitstrategie bei Index-Miss |
| [planning-workflow](../planning-workflow/SKILL.md) Phase 3 | Scout-Subagent nutzt dieselbe Kette |

---

## Pflegehinweis

Trigger synchron halten in:

1. YAML `description` dieser Datei
2. [repo-scout-protocol.mdc](../../rules/repo-scout-protocol.mdc)
3. Consumer: buddy-agent, plan-agent-scout, subagent-prompts
