---
id: STORY-009
parent: FEAT-002
type: story
status: ready
slug: umsetzer-input-contract
touches: [subagent-prompts.md, implementation-flow.md]
depends_on: [STORY-007, STORY-001, STORY-003]
---

# STORY-009 · Umsetzer-Input-Contract

**Als** Umsetzer-Agent (Scribe/Reviewer)
**möchte ich** in Iteration 1 nur Task-ID-Pointer übergeben bekommen und nur meine eigene Task-Datei
lesen,
**damit** der Handoff beidseitig Tokens spart (kein Monolith-Plan mehr im Eingangs-Pfad).

## Beschreibung

Die Consumer-Seite des Task-Contracts: Der Handoff überträgt in **Iteration 1 nur Verweise**
(Task-ID-Pointer). Jeder Umsetzer-Agent liest **nur seine winzige Task-Datei** — nicht den
Monolith-Plan. Der Output-Contract des Planners (STORY-007/008) **ist** der Input-Contract des
Umsetzers; sie sind identisch definiert.

Setzt STORY-007 (Schema) voraus und berührt dieselbe Handoff-Wire-Form wie STORY-001 (② dünne
Payloads) und STORY-003 (① Evidenz-Pointer) — daher `depends_on` auf beide, damit C die von A
verschlankte Wire-Form nicht neu verhandelt.

## INVEST
- **I**: unabhängig testbar an den Handoff-/Umsetzer-Payloads.
- **V**: beidseitige Ersparnis (Umsetzer liest nur seine Task-Datei).
- **S/T**: klein, testbar (Handoff-Inhalt + Read-Scope des Umsetzers).
- **Abhängigkeit** (INVEST-bewusst): STORY-007 (Schema) + STORY-001/003 (Wire-Form) → `depends_on`.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`Handoff_Iteration1_UebertraegtNurTaskIdPointer`
- Arrange: Handoff-Definition für Iteration 1
- Act: übertragenen Inhalt prüfen
- Assert: nur Task-ID-Pointer (Verweise), kein Inline-Plan-/Task-Body
Status: neu

`Umsetzer_LiestNurSeineTaskDatei`
- Arrange: Umsetzer-Agent (Scribe/Reviewer) mit Task-ID-Pointer
- Act: Read-Scope prüfen
- Assert: liest genau seine `tasks/task-NNN.md`, nicht den Monolith-Plan
Status: neu

`OutputContract_GleichInputContract`
- Arrange: Planner-Output-Schema (STORY-007) und Umsetzer-Input-Schema
- Act: beide Schemata vergleichen
- Assert: identisch — dieselbe Task-Datei-Struktur wird geschrieben und gelesen
Status: neu

`MonolithPlanImHandoff_IstRegression`   (Negativ)
- Arrange: ein Handoff, der den gesamten Plan-Text inline an den Umsetzer überträgt
- Act: gegen den Contract prüfen
- Assert: gilt als Regression — kein Ganzplan-Inline mehr an Umsetzer erlaubt
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: `tasks/index.md` bleibt der einzige Ganzblick für PL/Reviewer; der Umsetzer braucht ihn nicht.
- Abhängigkeit: teilt sich `subagent-prompts.md` mit FEAT-001-Stories → nach FEAT-001 einplanen
  (Feature-Ebene `depends_on: FEAT-001`).
