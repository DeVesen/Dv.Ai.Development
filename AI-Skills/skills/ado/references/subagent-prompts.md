## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{workspace-root}` | Cursor-Workspace-Root; Story-/Task-MD unter `{workspace-root}/requests/stories/` |
| `{code-root}` | Wurzelpfad des Code-Repositories (z. B. `my-project/`) — **nicht** für Story-Artefakte |

# Subagent-Prompts — ADO Phasen `load` / `analyse` / `save`

Vorlagen zum Kopieren. Regeln: [SKILL.md](../SKILL.md), [subagent-model-before-task.md](../../../references/subagent-model-before-task.md).

---

## Story-SubAgent (`analyse` — Feature-Kaskade)

```text
Rolle: Story-SubAgent — Phase analyse. Load-Bundle → Analyse-Bundle. Kein MD-Schreiben.

Agent-Typ: ado-story-pruefe-agent. Modell: ado-story-pruefe-agent.md Abschnitt Modell.

Regeln: references/story-analyse-subagent.md, references/phase-analyse.md

storyId: [ID]
loadBundle: [Story-Teil aus Feature-Load]
featureContext: [featureId, title, url, summaries…]
defaultProject: [GUID]

Aufgabe:
1. Task-Inventar aus Story-Description im Load-Bundle ((x)-Parsing).
2. Drafts: Story-Zusammenfassung, Feature-Kontext, Description-Analyse, Task-Uebersicht, Story-Moeglichkeiten.
3. Pro discussion-offenem Task ohne (x) und ohne effektives TASK-CLOSED: Task-SubAgent Modus analyse (parallel, max. 10/Welle).
4. Analyse-Bundle zurueck an Orchestrator.

Deliverable: storyId, OK/FAIL, analyseBundle, taskSubagentResults, errors.
```

---

## Task-SubAgent (`analyse`)

```text
Rolle: Task-SubAgent — Phase analyse. Code-Scout + Task-Draft. Kein task-*.md schreiben.

Agent-Typ: ado-task-pruefe-agent. Modell: ado-task-pruefe-agent.md Abschnitt Modell.

Regeln: references/task-analyse-subagent.md

mode: analyse

featureContext: [Zusammenfassung oder kein Feature]

story: storyId, title, adoUrl, excerpts…

task: slug, label, originalText

paths: storyFolder, taskFilePath

Aufgabe:
1. Code-Scout unter {code-root}/ (MCP code-review-mcp bevorzugt).
2. taskDraft: Anforderung, Offene Fragen, Story-Bezug, Akzeptanzkriterien, AI Zusammenfassung.
3. moeglichkeitenBlock: buddy intake/repo-check, markiere fertig, ToDo, plane Task.

Deliverable: slug, OK/FAIL, modelUsed, taskDraft, legacySectionsRemoved, openQuestions, errors.
```

---

## Hauptagent — Story-Analyse (`analyse story`)

Bei analyse nach load story fuehrt der Hauptagent dieselben Schritte wie Story-SubAgent selbst aus
(siehe story-analyse-subagent.md) und startet Task-Subagents wie oben.

---

## Hauptagent — Phasen load / save

load: references/phase-load.md — nur MCP, Load-Bundle im Chat.

save: references/phase-save.md — Analyse-Bundle → {workspace-root}/requests/stories/ persistieren.
