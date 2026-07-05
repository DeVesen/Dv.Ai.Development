---
id: FEAT-002
parent: EPIC-001
type: feature
status: ready
slug: task-normalisierter-planner-output-contract
children: [STORY-007, STORY-008, STORY-009]
touches: [planning-flow.md, plan-agent.md, subagent-prompts.md, implementation-flow.md, tasks-contract (neu)]
depends_on: [FEAT-001]
---

# FEAT-002 · Task-normalisierter Planner-Output-Contract (C · ⑧)

## Vollbeschreibung

Der Planner-Output ist heute *ein* Monolith-Plan. ⑧ macht ihn zu einer **normalisierten
Task-„Datenbank"**: `tasks/task-NNN.md` pro Task + `tasks/index.md` (Topologie). Der Handoff überträgt
in Iteration 1 **nur Verweise** (Task-ID-Pointer); jeder Umsetzer-Agent liest **nur seine winzige
Task-Datei** → Ersparnis auf **beiden** Seiten (Planner-Output und Umsetzer-Input).

**Kernkopplung:** Der Output-Contract des Planners **ist** der Input-Contract des Umsetzers — sie
werden gemeinsam definiert.

⑧ subsumiert ⑦ („Plan als Pointer"): ⑦ sparte nur dispatcher-seitig, ⑧ macht es beidseitig.

### Granularität — Zwei-Ebenen-Modell (beschlossen)
- **Task-Atom = eine vertikale, eigenständig test-first-verifizierbare Verhaltenseinheit** (≈ heutiger
  IMP-Slice), eine Datei je Task. Grenze an der **Vertragsnaht**, nicht an der Uhr.
- **3–5-Min-Granularität = Schritt-Checkliste *im* Task**, nicht als Task-Grenze. (Harte
  3–5-Min-als-Task verworfen: zerschneidet Test-First-Zyklus, Datei-Explosion, Kontextverlust.)
- **Task-Kriterien:** (1) ≥1 Akzeptanztest rot→grün *im* Task · (2) eine Verantwortung (kein „und") ·
  (3) unabhängig verifizierbar (sonst explizite `depends-on`) · (4) Naht = neuer
  Endpoint/DTO/Komponenten-Vertrag/Regel.

## NFRs / Randbedingungen
- **Kein Kontextverlust** — Task-Atome bleiben groß genug, dass der Test-First-Zyklus nicht zerschnitten wird.
- **Resumability** — Status je Task-Datei (Synergie mit `implementiere nur`-Pfad).
- **`touches`-Parallelisierung** bleibt erhalten (Topologie in `tasks/index.md`).

## Scope-Abgrenzung
- Ändert **ausschließlich** den Planner-Output-Contract + den gekoppelten Umsetzer-Input-Contract.
- **Nicht** drin: die A/B-Prompt-Diät-Inhalte (→ FEAT-001) und alle geparkten Potentiale.

## Stories

- **STORY-007 · Task-Contract-Schema + Granularität** — definiert das Task-Datei-Schema
  (`tasks/task-NNN.md`, vier Pflichtsektionen), `tasks/index.md`-Topologie und die
  Task-Kriterien/Zwei-Ebenen-Granularität. Fundament des Features.
- **STORY-008 · Planner-Cut-Prozedur** — die mechanische 6-Schritt-Prozedur, mit der `plan-agent`
  von Topic-Map/IMP-Slices ausgehend an Vertragsnähten in Tasks schneidet. (depends_on STORY-007)
- **STORY-009 · Umsetzer-Input-Contract** — Handoff überträgt in Iteration 1 nur Task-ID-Pointer;
  Umsetzer liest nur seine Task-Datei. Output-Contract = Input-Contract.
  (depends_on STORY-007, STORY-001, STORY-003)

## Parallelgruppen-Analyse

```
Fundament (zuerst):
  STORY-007 touches: tasks-contract (neue Referenz) + planning-flow.md
    → definiert das Schema, auf dem STORY-008 und STORY-009 beide aufsetzen.

Parallel nach STORY-007 (Primär-Dateien disjunkt):
  Gruppe C (parallel, nach STORY-007):
    STORY-008 touches: plan-agent.md + planning-flow.md (Cut-Prozedur, Planner-Seite)
    STORY-009 touches: subagent-prompts.md + implementation-flow.md (Handoff/Umsetzer-Seite)
  → Keine Überschneidung der Primär-Dateien; beide können nach STORY-007 gleichzeitig laufen.
```

## Abhängigkeiten
- **Feature-Ebene:** FEAT-002 sequenziert nach FEAT-001 (`depends_on: FEAT-001`) — A/B zuerst,
  C darauf aufsetzend, damit C die von A verschlankte Wire-Form nicht neu verhandelt.
- **Story-Ebene:** STORY-009 `depends_on` STORY-001 (② dünne Payloads) und STORY-003 (① Evidenz-Pointer),
  weil beide dieselbe Handoff-Wire-Form berühren, die STORY-009 neu formt.

## Annahmen / Offene Punkte
- Annahme: STORY-007 muss vor STORY-008/009 stehen, weil beide das Schema aus STORY-007 referenzieren.
- Offener Punkt (nicht-blockierend): Ablageort der neuen Task-Contract-Referenz (eigene Datei unter
  `feature-delivery/references/` vs. Abschnitt in `planning-flow.md`) — entscheidet die Implementierung.
