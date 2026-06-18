---
name: repo-scout-protocol
description: >
  Verbindliche Scout-Recherche-Kette fuer repo-check, Code-Landkarte und Planning-Scouts.
  Routing: Index → Filesystem-MCP bei leerem find_in_index; bei bekanntem Symbol Filesystem zuerst;
  Workflow-Artefakte (Skills/Agents/Packages) via Glob/Read unter Projektverzeichnis.
  MCP-Kanon: codebase-analyzer (codebase-analyzer MCP, /workspace/ Praefix),
  dev-mcp (Windows-Absolutpfad C:\...). Schema vor MCP-Aufruf lesen. Scout-Protokoll-Tabelle Pflicht.
  Ausloesung: repo-check, buddy repo-check, Code-Scout, Code-Landkarte, plan-agent-scout.
  Opt-out: ohne repo-scout-protocol.
when_to_use: >
  Laden wenn mindestens eines zutrifft: repo-check, buddy repo-check, Code-Scout, Code-Landkarte,
  Planning Phase 3 / plan-agent-scout, Agent erkundet Repo read-only.
  Nicht laden: reine Erklaerung ohne Repo-Zugriff, Implementierung, Build/Test-Verifikation.
---

# Repo-Scout-Protocol

Orchestrierungs-Skill fuer **Scout- und Recherche-Phasen** — keine Duplikation der MCP-Kanon-Skills.

**Kanon-Verweise (nur bei Bedarf laden):**

| MCP / Bereich | Kanon |
|---------------|-------|
| Index, Review, Metriken | [codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md) |
| Lesen/Suchen token-effizient | [dev-mcp/SKILL.md](../dev-mcp/SKILL.md) |
| MCP-Uebersicht | [dev-tooling-mcp/SKILL.md](../dev-tooling-mcp/SKILL.md) |

**Mount-Praefixe (verbindlich):**

| MCP | Container-Praefix | Parameter |
|-----|------------------|-----------|
| codebase-analyzer | `/workspace/` | `projectPath`, `filePath` |
| dev-mcp | Windows-Absolutpfad `C:\...` | `file_path`, `root` |

Vor **jedem** MCP-Tool-Aufruf: Deskriptor/Schema lesen — Namen unterscheiden sich (`file_path` ≠ `filePath`).

**MCP-Pfad-Kanon:** Projekt-MCP-Pfad-Dokumentation (deployed im Projekt, typisch `references/mcp-project-paths.md`) — Host-Pfade nicht unveraendert an codebase-analyzer.

Erklaerung der Fallback-Kette: [docs/mcp/scout-fallback-chain.md](../../../docs/mcp/scout-fallback-chain.md)

---

## Wann gilt dieser Skill?

**Laden** wenn mindestens eines zutrifft:

- `repo-check`, `buddy repo-check`, Code-Scout, Code-Landkarte
- Planning Phase 3 / `plan-agent-scout`
- Agent erkundet Repo **read-only** (nicht nur erklaeren)
- Anderer Skill verweist auf situative MCP-Auswahl in Scout-Phase

**Nicht laden:**

- Reine Erklaerung ohne Repo-Zugriff
- Implementierung/Umsetzung → [implementation-workflow](../implementation-workflow/SKILL.md)
- Build/Test-Verifikation → [build-log-filter](../build-log-filter/SKILL.md)

**Opt-out:** `ohne repo-scout-protocol`, `ohne scout-protokoll`

---

## Routing-Matrix (Kern)

| Situation | Erster Schritt | Zweiter Schritt | Dritter Schritt |
|-----------|----------------|-----------------|-----------------|
| Symbol/Bereich **unbekannt** (.cs/.ts) | Index: `index_project` auf richtiges MCP-Pfad / `.csproj` | `find_in_index` (selbes projectPath) | Filesystem: `find_by_content` oder `find_file` |
| Symbol/Pfad **bekannt** (Task, Handoff, Treffer) | Filesystem: `read_class_summary` / `read_signatures_only` / `read_method` | optional Index fuer Abhaengigkeiten | — |
| Interface-Implementierungen | Filesystem: `find_implementations` | — | — |
| Multi-.csproj Backend ohne funktionierendes `index_solution` | Mehrere `index_project` (Projekt-MCP-Pfad-Routing) | `find_in_index` pro `.csproj` | Filesystem |
| Index-Hinweis "use index_solution" | **Nur** wenn Projekt-MCP-Pfad-Dokumentation `index_solution` freigibt | `index_solution` | sonst: konkretes `.csproj` indexieren |
| **Workflow-Artefakt** (Skill, Agent, Package, `SKILL.md`) | `Glob` unter Projektverzeichnis | `Read` der Treffer | `Grep` nur fuer Querverweise |
| Deploy-/Install-Doku | `Glob` + `Read` | — | — |

**UI-only** (Button-Label ohne Symbol): kein Index-Zwang.

---

## Hard Rules

1. **Nach leerem `find_in_index`:** mindestens ein Filesystem-MCP-Versuch (`find_by_content` oder `find_file`) **bevor** natives Read/Grep auf Klassennamen.
2. **`index_project`-Hinweis auf Solution:** `index_solution` **nur** wenn Projekt-MCP-Pfad-Dokumentation `index_solution: allowed` — sonst `.csproj` via `index_project`.
3. **MCP erreichbar:** Read/Grep **nicht** als Ersatz fuer MCP in Scout-Phasen.
4. **Scout mit MCP-Pflicht** (Buddy repo-check, plan-agent-scout): nicht mit nur nativen Tools abschliessen ohne dokumentierte Warnung und Scout-Protokoll.
5. **Schema-Pflicht:** Parameter exakt wie im MCP-Deskriptor; codebase-analyzer: `/workspace/`, dev-mcp: Windows-Absolutpfad `C:\...`.
6. **Pfad-Kanon:** Projekt-MCP-Pfad-Dokumentation ist verbindlich — nicht aus dem Gedaechtnis ableiten.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Erlaubter Fallback (Read/Grep)

Nur wenn:

- mehrere Strategien aus der Routing-Matrix versucht wurden, **und**
- unter `### Warnungen` dokumentiert: welcher MCP, welches Tool, Ergebnis/Fehler, **und**
- kurze Begruendung, warum kein weiterer MCP sinnvoll ist.

**Hard Stop** (analog andere MCP-Blocker): benoetigter Server nicht in Tool-Liste → Scout nicht als abgeschlossen markieren; Nutzer auf MCP-Konfiguration hinweisen.

Statuszeile: `MCP: ok` oder `MCP: fallback (<Grund>)`.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Scout-Protokoll (Pflicht-Ausgabe)

Jede Scout-Antwort enthaelt:

```markdown
## Scout-Protokoll

| # | Ziel / Repo-Frage | Strategie | MCP | Tool | Ergebnis | Naechster Schritt |
|---|-------------------|-----------|-----|------|----------|------------------|
| 1 | … | index | codebase-analyzer | find_in_index | 0 Treffer | → find_by_content |
| 2 | … | filesystem | dev-mcp | find_by_content | 3 Dateien | → read_class_summary |
| … | | | | | | |

**Status:** MCP: ok | MCP: fallback (<Grund>)
**Fallback Read/Grep:** ja/nein — Begruendung
```

Ohne vollstaendige Tabelle: Scout **nicht** als abgeschlossen markieren.

**Buddy repo-check:** Scout-Protokoll unter `## Repo-Check (Ergebnis)` einfuegen (zusaetzlich zu `### Beantwortet` usw.).

**plan-agent-scout:** Scout-Protokoll als Deliverable-Abschnitt **0b** (nach MCP-Analyse-Status).

---

## Ablauf-Checkliste (pro Repo-Frage)

1. Projekt-MCP-Pfad-Dokumentation pruefen (fehlt → Default: `codebase-analyzer`).
2. Routing-Matrix: Situation zuordnen.
3. Schema lesen → MCP-Call.
4. Zeile in Scout-Protokoll.
5. Ergebnis leer/Fehler → naechste Strategie aus Matrix, nicht sofort Grep.
6. Alle Repo-Fragen bearbeitet → Scout-Protokoll + Status abschliessen.

---

## Zusammenspiel

| Partner | Rolle |
|---------|-------|
| [buddy-agent](../buddy-agent/SKILL.md) repo-check | Konsument — laed diesen Skill in Agent-Mode |
| [codebase-analyzer](../codebase-analyzer/SKILL.md) | Index, Review — nicht alleiniger Scout |
| [dev-mcp](../dev-mcp/SKILL.md) | Pflicht-Zweitstrategie bei Index-Miss |
| [planning-workflow](../planning-workflow/SKILL.md) Phase 3 | Scout-Subagent nutzt dieselbe Kette |

**Vertiefung Fallback-Logik:** [docs/mcp/scout-fallback-chain.md](../../../docs/mcp/scout-fallback-chain.md)

---

## Pflicht-Aktivierung

**Verbindlich laden** wenn mindestens einer dieser Ausloeser zutrifft:

- `repo-check` (explizit oder als Phasen-Trigger)
- `buddy repo-check`
- Code-Scout, Code-Landkarte
- Planning Phase 3 / `plan-agent-scout`
- Agent erkundet Repo read-only (nicht nur erklaeren)

**Vor Read/Grep** diesen Skill vollstaendig lesen — MCP-Kette hat Vorrang.

**MCP-Pfad-Kanon:** Projekt-MCP-Pfad-Dokumentation (deployed) — Host-Pfade nicht unveraendert an codebase-analyzer.

---

## Pflegehinweis

Trigger synchron halten in:

1. YAML `description` dieser Datei
2. `when_to_use`
3. Consumer: buddy-agent, plan-agent-scout, subagent-prompts
