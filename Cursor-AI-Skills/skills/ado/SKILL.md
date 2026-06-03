---
name: ado
description: >
  Azure DevOps Work Items ↔ Markdown-Artefakte unter requests/stories/ (MCP ado).
  Operationen: prüfe Story/Task, prüfe Feature, Task fertig, ToDo, active/resolved, Task verfeinern (Legacy).
  Orchestrator: ado-agent. Trigger: prüfe Story/Task/Feature, markiere Task fertig, ToDo für Task,
  active, resolved, Task verfeinern, @ado. Opt-out: ohne ado-story-skill.
disable-model-invocation: true
---

## Voraussetzungen

- MCP-Server **`ado`** erreichbar — [`../../mcp.json`](../../mcp.json)
- Config lesen: [`config.defaults.json`](config.defaults.json) — Organisation ≠ Projekt-GUID
- Tool-Schema vor jedem MCP-Aufruf: [`references/mcp-tools.md`](references/mcp-tools.md)

**MCP nicht erreichbar:** Abbrechen, Nutzer informieren — keine halben lokalen Dateien.

## Repo-Layout

| Element | Muster |
|---------|--------|
| Story-Ordner | `requests/stories/UserStory-{id}-{titleSlug}/` |
| Story-MD | `UserStory-{id}-{titleSlug}.md` |
| Tasks | `tasks/task-{kebab-slug}.md` |

Feld-Mapping: [`references/field-mapping.md`](references/field-mapping.md) · Templates: [`templates/`](templates/)

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `prüfe Story {id}`, `prüfe Task {id}` | Story-Sync + Task-Inventar + Task-SubAgents | [`references/op-load-story.md`](references/op-load-story.md) |
| `prüfe Feature {id}` | Feature-Kaskade + parallele Story-SubAgents | [`references/op-load-feature.md`](references/op-load-feature.md) |
| `markiere Task … fertig`, `Task … erledigt`, `schließe Task` | TASK-CLOSED + task-*.md + Story-Checkbox | [`references/op-close-task.md`](references/op-close-task.md) |
| `ToDo für Task …`, `notiere im Task`, `dictiere ToDo` | Offene Fragen + TODO-Marker in Discussion | [`references/op-add-todo.md`](references/op-add-todo.md) |
| `Story … auf active`, `… resolved` | ADO State-Update; resolved: Ordner löschen | [`references/op-set-state.md`](references/op-set-state.md) |
| `Task … verfeinern` (explizit, Legacy) | Interaktiver 5-Phasen-Klärungsworkflow | [`references/op-refine-task.md`](references/op-refine-task.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Datei |
|-------|-------|
| MCP-Tools | [`references/mcp-tools.md`](references/mcp-tools.md) |
| Marker-Format (`TASK-CLOSED`, `TODO`, …) | [`references/markers.md`](references/markers.md) |
| Akzeptanzkriterien | [`references/acceptance-criteria.md`](references/acceptance-criteria.md) |
| Task-Übersicht (4 Listen) | [`references/task-overview.md`](references/task-overview.md) |
| Copy-Befehle (`## Möglichkeiten`) | [`references/copy-commands.md`](references/copy-commands.md) |
| State-Mapping | [`references/state-mapping.md`](references/state-mapping.md) |

## Orchestrator & Subagents

Orchestrator: [`ado-agent`](../../agents/ado-agent.md) · Story-SubAgent: [`ado-story-pruefe-agent`](../../agents/ado-story-pruefe-agent.md) · Task-SubAgent: [`ado-task-pruefe-agent`](../../agents/ado-task-pruefe-agent.md)

Subagent-Prompts: [`subagent-prompts.md`](subagent-prompts.md) · Modell vor Task: [`../../references/subagent-model-before-task.md`](../../references/subagent-model-before-task.md)

**Kein HTML** unter `requests/stories/` · **Kein** Schreiben an `System.Description`/AC in ADO

## Opt-out

`ohne ado-story-skill` · `ohne ado-requests-skill` · `no ado requests skill` → Skill nicht laden.
