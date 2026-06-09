---
name: implementation-workflow
description: >
  Repo-Umsetzung: Hard Gate, 1–10 implement-agent (Slice inkl. Build/Test), iterativer Implement-Review-Loop max. 3× (Technik-Gate, 6 Reviews, implement-fix-planner-agent, Fix-Slices). build-log-filter + codebase-analyzer Pflicht.
  Trigger (kanonisch in Rule): implementiere/setze um/fix/einbauen/leg los, Plan ausführen,
  impliziter Repo-Code-Intent, @implementation-workflow-skill, Hard Gate, Schritt 2/IMP-*,
  engl. apply changes/go ahead/ship it; Opt-out ohne implement-skill. Discovery via alwaysApply-Rule
  (disable-model-invocation: true — Skill nicht auto-invoked).
disable-model-invocation: true
---

## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{frontend-path}` | Pfad zum Frontend-Projekt innerhalb von `{code-root}` |
| `{backend-path}` | Pfad zum Backend-Projekt innerhalb von `{code-root}` |
| `{agent-index}` | Datei mit der Repository-Agentenübersicht (z. B. `AGENTS.md`) |
| `{verification-commands}` | Datei mit den Verifikationsbefehlen für Agents |


# Implementation Workflow

## Quick Start

Use this workflow when acting as the **initial implementation agent** for an
explicit task—even ad-hoc without a dense written plan—with enough clarity to
implement (use the Hard Gate consistently; escalate if critical items are UNKNOWN).

Whenever the host expects this skill loaded **before executing** repo changes,
treat reading and following it as **mandatory** for the whole slice until closure.

Do **not** start editing code, spawning subagents, or running verification
commands immediately. First decide whether the plan is truly
**implementation-ready** using the **Hard Gate** below. If scope, acceptance
criteria, risks, or host rules are unclear, **stop** and resolve with the user
before any delegation or execution.

During **Schritt 2**, **implement-agent** subagents may run **slice-scoped** builds and tests (see [implement-agent](SKILL.md#orchestrator-konfiguration)); **stack-wide Technik-Gate** runs in **Schritt 3** per Review-Iteration, as described under **Schritt 3 — Iterativer Implement-Review-Loop**.

Verbindliche Prompt-Vorlagen (Auftrags-Payloads): [references/subagent-prompts.md](references/subagent-prompts.md).

## Subagent-Typen und Agent-Definitionen (host-neutral)

Dieser Abschnitt ist fuer **jeden** Host lesbar (Cursor, Claude, Copilot, CLI). **Modellwahl**

liegt **ausschliesslich** in [../../agents/*.md](../../agents/) — **nicht** in diesem Skill

oder in Rules.

### Rollen im Implementation Workflow

| Rolle | Schritt | Agent-Typ | Profil |
|-------|---------|-----------|--------|
| **Orchestrator / Initial Agent** | 1, Integration, 3 Loop | *(Nutzer-Chat / Parent)* | dieser Skill |
| **Implementierer** | 2 (1–10 Slices), 3 (Fix-Slices) | `implement-agent` | [implement-agent](SKILL.md#orchestrator-konfiguration) |
| **Technik-Gate** | 3.1 (pro Iteration) | Orchestrator-Subagent / Host-Task | Vorlage **Technik-Gate pro Stack** |
| **Implement-Review ×6** | 3.2 (pro Iteration) | `implement-review-*-agent` | [../../agents/](../../agents/) |
| **Fix-Planung** | 3.6 (pro Iteration) | `implement-fix-planner-agent` | [implement-fix-planner-agent.md](../../agents/implement-fix-planner-agent.md) |

**Subagent — Modell vor Task (Pflicht):** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — vor jedem Task Ziel-Profil lesen; **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** hier duplizieren.

- **implement-agent:** genau **ein** Plan- oder Fix-Slice (IMP-*); Build/Test **slice-relevant**; Unit-Tests im Slice; build-log-filter Pflicht.
- **implement-review-*:** **readonly** — je **eine** Rolle pro Lauf; **6** parallele Läufe pro Iteration; MCP-Pflicht je Profil.
- **implement-fix-planner-agent:** Fix-Teilplan aus Review-Digest; MCP A–H + build-log-filter + **Evidenz-Basis**; **keine** Code-Implementierung.
- **Technik-Gate:** stack-weiter Build + Unit-Tests (max. **8** Turns je Phase); build-log-filter Pflicht; enge Gate-Fixes erlaubt.
- **Verboten:** `explore`/`generalPurpose` statt dedizierter Agent-Profile; Orchestrator-Build/Test bypass; Review-Fixes ohne Fix-Planer.

### Ausfuehrung je Host

| Host | Implementierung | Review-Loop (Schritt 3) |
|------|-----------------|-------------------------|
| **Cursor** | Task-Subagent `implement-agent` | Technik-Gate + 6× `implement-review-*` + `implement-fix-planner-agent` + Fix-`implement-agent` |
| **Andere** | Sub-Lauf mit `implement-agent.md` als System-Prompt | Sub-Läufe mit jeweiligem Agent-`.md` als System-Prompt |

Neue Implementation-Agenten: unter [../../agents/](../../agents/) anlegen und hier eintragen.

## Trigger (Kanon)

**Kanonische Trigger-Liste:** [`.cursor/rules/implementation-workflow-skill.mdc`](../../rules/implementation-workflow-skill.mdc) — Abschnitte **Verbindliche Aktivierung**, **Implizite Aktivierung**, **Plan-Freigabe**, **Fortsetzung & Thread-Kontext**, **Explizite @-Referenzen**, **Meta-Trigger**, **Trigger-Beispiele**, **Nicht auslösen**, **Priorität gegen andere Workflows**.

**Discovery:** `disable-model-invocation: true` — dieser Skill wird vom Host **nicht** automatisch invoked. Bei erkanntem Umsetzungsintent: Rule (alwaysApply) verlangt **vollständiges Lesen** dieses Skills **vor** dem ersten Write.

**Bei Zweifel:** Hard Gate prüfen; bei UNKNOWN kritischen Punkten **stoppen** — nicht direkt editieren.

### Agent-Modus: Skill als Umsetzungsauftrag

Gilt **nicht nur** bei @-Anhang dieses Skills, sondern **immer**, wenn die [Implementation-Rule](../../rules/implementation-workflow-skill.mdc) Umsetzungsabsicht erkennt (alwaysApply).

If the user provides clear scope (typically a **final plan**, approved thread briefing, or Plan-Freigabe per Rule) and asks to implement — e.g. **„Setze es um und halte dich an den Skill“**, **„leg los“**, **„führe den Plan aus“**, or equivalent from **Implizite Aktivierung** in the Rule — treat that as explicit instruction to **run this Implementation Workflow end-to-end**, not informal one-off edits outside the playbook.

### Rolle dieses Skills — ein einheitlicher Ausführungsablauf

This document is **the complete host execution playbook**: readiness (Hard Gate),
brief execution-form recommendation plus user/thread alignment **when ambiguous**,
mandatory **1–10** implementation subagents (topology: sequential or parallel),
integration checkpoint, Implement-Review-Loop (max. 3 Iterationen: Technik-Gate, 6 Reviews, Fix-Planer, Fix-Slices), and orchestrator closure—all in **one** place. Older split workflows are **obsolete** here.

Orchestrator slices and dependencies come from the **final plan or agreed thread**
(use [planning-workflow/SKILL.md](../planning-workflow/SKILL.md) where planning is
hosted); this workflow does **not** replan the scope.

After the Hard Gate passes, complete **Ausführungsform** (below **before Schritt 2**)
before any edit or spawned subagents.

### Überblick (Ablauf)

```text
                    +---------------------------------+
                    | Start: implementation requested |
                    | (read skill; do not edit /      |
                    |  spawn subagents yet)           |
                    +----------------+----------------+
                                     |
                                     v
+-------------------------------------------------------------------+
| Schritt 1 + Hard Gate (readiness review)                          |
| All Hard Gate rows YES (or waived)?                               |
+--------------------------+----------------------------------------+
                           |
         +-----------------+-----------------+
         | NO / UNKNOWN                      | YES
         v                                   v
+-------------------------+    +--------------------------------------+
| Stop: ask user; no      |    | Implementation-ready                 |
| edits; no subagents;    |    | Ausführungsform vor Schritt 2        |
| abort until resolved    |    | (align with user if still ambiguous) |
+-------------------------+    +------------------+-------------------+
                                                  |
                                                  v
+-------------------------------------------------------------------+
| Schritt 2: 1–10 implementation subagents (sequential / parallel)   |
| No silent plan drift; slice-scoped build/test OK per implement-agent profile |
+--------------------------+----------------------------------------+
                           |
                           v
+------------------------------+
| Integration checkpoint        |
| outputs, drift, merge risk    |
+--------------+---------------+
               |
               v
+-------------------------------------------------------------------+
| Schritt 3: Implement-Review-Loop (max. 3 Iterationen):            |
| Technik-Gate → 6× Review → Fix-Planer → Fix-Slices; früh stoppen |
| wenn sauber; sonst Rest-Findings-Bericht nach Iteration 3        |
+-------------------------------------------------------------------+
                                 |
                                 v
                    +-----------------------+
                    | End / closure         |
                    +-----------------------+
```

## Schritt 1 - Plan-Check und Readiness Review

1. Read the instructions end-to-end (written plan **or** user thread). Check for explicit files,
   steps, acceptance criteria, and constraints—not assumed behavior.

2. Perform a **readiness review** as the **initial agent** (same session as
   orchestration): work carefully through the checklist below; **state uncertainty**
   where items cannot be verified—do not proceed while critical items remain
   **UNKNOWN** without user acknowledgment.

   Review checklist:
   - Missing decisions, ambiguous requirements, or conflicting instructions.
   - Hidden dependencies, irreversible steps, or security and data risks.
   - Whether the plan matches **host repository rules** (documentation,
     style, architecture) when those are available.
   - Whether success can be verified (tests, manual checks, or other criteria).

3. Evaluate every item in **Hard Gate: Implementation Readiness** below. Any
   checklist line answered **NO** or **UNKNOWN** (without user waiver for that
   item) blocks progression.

4. If blocked:
   - Ask focused questions or propose minimal plan patches.
   - **Do not** start implementation.
   - **Do not** spawn subagents.
   - **Abort** this workflow pass until the user confirms readiness or updates
     the plan.

5. Only when the Hard Gate passes: declare the work **implementation-ready** and
   proceed immediately to **Ausführungsform vor Schritt 2** below—still **before**
   any edits or spawned subagents.

## Hard Gate: Implementation Readiness

Proceed to implementation **only** if you can answer **YES** to every question
below (or the user has explicitly waived a specific item). **NO** or **UNKNOWN**
means **stop**: ask the user; **do not** edit; **do not** delegate; **do not**
run verification commands beyond read-only inspection allowed by host policy.

**Conditional rows (10–13):** answer **YES** if the condition in the first column
does **not** apply (i.e. treat as **N/A** / passes). For example, when exactly **one**
implementation subagent is used, questions **10–13** are **N/A** → **YES**.

| # | Question |
|---|----------|
| 1 | Is **scope** explicit (what is in / out)? |
| 2 | Are **acceptance criteria** explicit and **verifiable**? |
| 3 | Are **affected areas** clear (concrete paths, modules, or an explicit discovery strategy)? |
| 4 | Have required **host rules** and **relevant skills** been identified and loaded per host policy? |
| 5 | Are **risks** (security, data, irreversible steps, migrations) addressed or escalated? For **EF migrations** or **`parameter_search_view`**: load [backend-ef-migrations](../backend-ef-migrations/SKILL.md); verify Triplet, View SQL in `Up`/`Down`, and DB application — not build/tests alone. |
| 6 | Is the **iterative Implement-Review-Loop** (max. **3** Iterationen: Technik-Gate + 6 Reviews + Fix-Planer + Fix-Slices; früher Abbruch wenn sauber) accepted as mandatory post-integration verification, unless the user explicitly chose opt-out variants **B/C/D** in the thread? |
| 7 | Is it clear **which stacks** are touched (**Frontend** / **Backend**; Backend may be split per independent build unit when the backend contains multiple distinct build targets) so Schritt 3 can run **Technik-Gate per touched stack or build unit**, per host docs? |
| 8 | Is **implementation** explicitly split into **1–10** implementation subagents with boundaries from the **final plan** (or thread), and is **Technik-Gate per changed stack** in Schritt 3 (no gate for unchanged stacks) agreed? |
| 9 | **For the 1–10 implementation subagents:** Are slice boundaries taken from the **final plan** (or explicitly confirmed in the thread) so execution does **not** invent new splits? |
| 10 | **If two or more implementation subagents are used:** Is **execution topology** explicit (**sequential** pipeline vs **parallel**), including **order** for sequential runs? If the final plan’s **Umsetzungs-Topologie** mode is `parallel` (or equivalent waves), Ausführungsform must be **parallel** for those slices unless a documented downgrade (independence failure, host limits) with user/plan reason. |
| 11 | **If two or more implementation subagents are used:** Are **slice independence rules** explicit (typically: **no parallel edits to the same files**; shared contracts/interfaces only with **contract-/interface-first** or another gate **defined in the plan**)? |
| 12 | **If two or more implementation subagents are used:** Are **blocking dependencies** between packages stated in the final plan (or clearly **none** / not applicable)? |
| 13 | **If two or more implementation subagents are used:** Is there a defined **integration / merge step** and **drift/conflict ownership** (typically the **initial agent**), or a clear statement that integration is trivial? |

## Ausführungsform vor Schritt 2

After implementation-ready status and **before** any edits or spawning subagents:

1. Confirm **exactly** **1–10** **implementation** subagents (never zero, never more than ten),
   each scoped from the **final plan** or agreed thread. **Agent-Typ:** **`implement-agent`**
   ([implement-agent](SKILL.md#orchestrator-konfiguration)). Take slice boundaries, **Slice-IDs**, and **waves** from the plan section **Umsetzungs-Topologie
   (Implementation Workflow)** when present — **do not** invent new splits.
2. **Parallel bevorzugt (prüfen, dann wählen):** If the plan defines **≥2 independent**
   slices in a **parallel wave** and Hard Gate rows **10–13** are satisfied, set Ausführungsform
   to **parallel** for that wave. Use **sequential** only when the plan says so, slices are
   coupled, the same files would be edited without contract-first, or the host/Task tool
   cannot run parallel Task subagents (document sequential run without scope change).
   If using exactly **one** subagent, give one short justification **from the plan** (why a
   single slice is appropriate—**not** “to skip subagents” or “because simpler”).
3. Ground decisions in the **final plan**, **prior thread commits**, or the user’s
   immediate instructions; reuse them instead of inventing new splits.
4. When execution mode is still **ambiguous**, sources conflict, or planned
   delegation contradicts independence rules—**stop** here with concise alignment
   questions for the user. **Do not** open Schritt 2 until clarified (unless the
   user waives specifics in-writing for this slice).
5. Treat explicit prior confirmations (**user text**, **approved plan artifacts**,
   or documented host/session opt-outs) as **binding topology** afterward:
   operationalize boundaries but **never silently re-switch** modes mid-run unless
   the user updates instructions.

Enter Schritt 2 only once Ausführungsform aligns with Hard Gate commitments.

## Schritt 2 - Umsetzung (1–10 Implementierungs-Subagents)

**Initial agent (Orchestrator):** does **not** author product implementation during Schritt 2.
All implementation edits are performed only by **1–10** **`implement-agent`** subagents
(see [implement-agent](SKILL.md#orchestrator-konfiguration)). The initial agent may still coordinate, integrate at the
checkpoint, and resolve trivial merge mechanics when in scope.

1. With Ausführungsform aligned, execute via the documented **execution
   topology**. **Do not** silently overturn that mode apart from mandated plan
   fallbacks (for example downgrade parallel → sequential when independence rules
   fail) or refreshed user approvals:
   - **Parallele Multi-Subagent-Delegation (bevorzugt, wenn Plan und Hard Gate es erlauben):**
     run all slices of the **current parallel wave** **at the same time** when slices are
     **independent** per the plan—typically **no concurrent edits to the same files**;
     shared contracts need **contract- / interface-first** (or another gate) **as already
     defined in the plan**. The **initial agent** starts independent implementation
     subagents in **one message turn** with **multiple** `Task` tool calls when the host
     allows; if the host does not allow parallel starts for **all** slices in a wave at once,
     run the wave in **batches** (e.g. several parallel `Task` calls per batch until every
     slice in that wave has started) — **do not** drop or merge plan slices to fit a lower
     parallel cap; **document** batching in the orchestrator report. If parallel start is
     impossible entirely, run the same slices **sequentially** without changing scope and
     **document** the limitation.
   - **Sequentielle Multi-Subagent-Delegation:** run **implementation** subagents one after
     another (pipeline / handoffs) in the **order** from the final plan when the plan
     requires sequential waves, coupling does not allow parallelism, or parallel start
     is unavailable. If coupling does not allow parallelism, fall back to **sequential** or
     contract-first—**do not** “pseudo-parallelize” tightly coupled work.

2. **Implementierungs-Subagents — strikt:** each agent implements **only** its assigned slice from
   the plan; **no** scope expansion, **no** silent replanning, **no** product or design decisions beyond what the plan already fixes.
   **Build/Test (slice-scoped):** **allowed** per [implement-agent](SKILL.md#orchestrator-konfiguration) — `dotnet build`, `dotnet test`, `ng build`, `npm run build`, `ng test`, `npm test` and unit tests **for the assigned slice**; **build-log-filter** mandatory on every such run. **Not** stack-wide Technik-Gate (that is **Schritt 3** after integration).

3. **Agent-Typ (Implementierung):** **`implement-agent`** — Profil [implement-agent](SKILL.md#orchestrator-konfiguration); Modell gemäß [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

4. **Mandatory:** Record the execution topology explicitly: state the **count** (1–10) of
   implementation subagents, boundaries taken **from the plan**, and whether execution is
   **sequential** or **parallel** for this run (must match the Hard Gate and the Ausführungsform
   clarification above).

5. Each **implementation subagent** brief must include:
   - Exact scope (what to touch, what to leave alone).
   - **Deliverables** and how they map to plan steps.
   - Explicit **non-goals**: no product or design decisions not already in the
     plan; escalate conflicts to the initial agent or user.
   - **When the plan provides Umsetzungs-Topologie:** **Slice-ID**, **wave**, topology
     context, parallelism/blocking, shared contracts, integration handoff (see [references/subagent-prompts.md](references/subagent-prompts.md)).
   - **Pflicht:** Den passenden Abschnitt aus [references/subagent-prompts.md](references/subagent-prompts.md) in den Task-Prompt übernehmen — bei Build/Test **Implementierer (Slice — Build/Test + build-log-filter)**; build-log-filter-Checkliste kanonisch in [`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc) (**keine** zweite 1–8-Liste im Brief duplizieren).

6. **Plan deviations:** No deliberate deviation from the final plan without
   **user approval**. If implementation reveals the plan is wrong or incomplete,
   **stop** and ask. Only **trivial mechanical** edits are allowed without new
   approval (formatting, typo fixes, import reorder **without** behavior,
   scope, architecture, or UX change).

7. The initial agent remains orchestrator: subagent output is **not** done until
   the **integration checkpoint** (below) and **Schritt 3** pass.

### Build/Test + build-log-filter (kurz — gilt überall)

**Kanon (keine zweite Liste):** [`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc) — **Ausführungs-Checkliste (pro Build-/Test-Lauf)** Schritte **1–8** und **[Interpretationspflicht (verbindlich)](../../rules/build-log-filter.mdc#interpretationspflicht-verbindlich)**. **Gilt** für **`implement-agent`** (slice build/test), **Technik-Gate** (Schritt 3), **`implement-fix-planner-agent`** (Diagnose-Läufe) und den **initialen Agenten** nur bei dokumentierter Host-Limitation.

- Pro Lauf: Shell → vollständiges Capture → build-log-filter → **intern lesen** → Kurzprosa + Shell-Exit (**kein** MCP-Body, **kein** Roh-Log ans LLM).
- **Unklare verdichtete Ausgabe:** Agent **informiert den Nutzer**, dass build-log-filter nachgeschärft werden soll — **nicht** aus Roh-Konsole raten.
- **Interpretationspflicht:** inhaltliche Diagnose/Freigabe **nur** aus intern gelesenem MCP; **OK/FAIL** aus Shell-Exit; **kein** Kurz-`raw`, **kein** Terminal-Datei-Ersatz (`terminals/*.txt`).
- **Vor jedem** MCP: **`Rufe build-log-filter …`** sichtbar; **Hard Stop** wenn MCP nicht erreichbar (in-scope).

**Vor Technik-Gate (Orchestrator):** Beim ersten applicable Lauf oder vor Start einer Review-Iteration — wenn MCP bei applicable Kommando **nicht** erreichbar ist, sofort **Hard Stop** (`BLOCKER: build-log-filter nicht erreichbar`), **keine** Technik-Gate-/Review-Subagents starten.

**Implementation subagents (Schritt 2):** **must not** perform **stack-wide Technik-Gate** during Schritt 2 — that is **Schritt 3** after the integration checkpoint. Slice-scoped build/test per **implement-agent** is allowed.

**Host opt-outs:** **B** (tests only), **C** (build only), **D** (no automated verification) apply **only** with explicit user text in the thread, per **[`{verification-commands}`]({verification-commands})**.

### BoyScout pro Slice (Orchestrator, vor Integration-Checkpoint)

**When:** Nach Rückkehr **jedes** `implement-agent`-Slices (Schritt 2), sofern der Thread/Plan kein Opt-out (`kein boyscout`, `skip boyscout`) enthält.

**Pflicht-MCP:** `suggest_boyscout_actions(filePaths: [alle vom Slice geänderten Dateien], type)` — Top-Findings kompakt im Slice-Report des Subagents bzw. Orchestrator-Zusammenfassung. Ersetzt nicht den stack-weiten Technik-Gate in Schritt 3.

### Integration checkpoint (Orchestrator)

**When:** After all **implementation** subagent work for this pass is back. **Before** starting **Schritt 3** (first Review-Iteration).

**Do at minimum:**
- Collect subagent outputs (summaries, touched paths, diffs / artifacts).
- Classify **which stacks** changed (Frontend / Backend; split Backend per independent build unit when applicable) to size **Technik-Gate** runs in Schritt 3.
- Check for **interface / contract drift** between slices; on meaningful drift,
  **stop** and escalate to the user (or resolve with a minimal plan patch)—do
  not “review away” incompatible contracts.
- Assess merge/conflict risk. Resolve what is in scope for the initial agent;
  escalate unclear ownership per the plan.

Only after this checkpoint is the work **ready for** Schritt 3 (iterative review loop), which should focus on quality, plan alignment, and stack-wide green state—not first-contact integration.

**Orchestrator edits after Technik-Gate (verbindlich):** If the **initial agent** changes
repo files **after** a Technik-Gate run (integration fix, import cleanup, merge
resolution, config tweak), treat prior Technik-Gate as **stale**. **Do not** run
`ng build` / `ng test` / `dotnet build` / `dotnet test` yourself to “confirm green”.
**Must** re-run **Technik-Gate** for affected stacks in the **next** Review-Iteration and collect a **continued**
[Verifikations-Matrix](../../rules/build-log-filter.mdc#verifikations-matrix). See [Orchestrator-Nachlauf](../../rules/build-log-filter.mdc#orchestrator-nachlauf-hauptagent).

## Schritt 3 — Iterativer Implement-Review-Loop

Nach dem Integration-Checkpoint läuft ein **iterativer Review-Fix-Loop** (eingebettetes Muster aus work-review-iterative, angepasst auf Code-Umsetzung) mit **höchstens 3 Iterationen**. Der **initial agent** orchestriert; **keine** Rollensimulation statt Subagents.

**Iterationslimit (verbindlich):** Pro Iteration: **Technik-Gate → 6× Review → Digest → Fix-Planer → Fix-Slices**. **Maximal 3** volle Iterationen — **kein** vierter Durchlauf.

**Früher Abbruch:** Wenn eine abgeschlossene Iteration **keine behebbaren Findings** mehr liefert **und** Technik-Gate **OK** ist (opt-out **B**/**C**/**D** beachten), endet der Loop **sofort** — auch nach Iteration 1 oder 2.

**Nach Iteration 3 mit offenen Findings:** Kein weiterer Fix-Zyklus. Stattdessen **Rest-Findings-Bericht** (wer bemängelt was noch) — Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md) (**Rest-Findings nach Maximum**). Anschließend Schritt-3-Closure.

**Review-Rollen (6, je Iteration parallel bevorzugt):**

- `implement-review-pessimist-agent`
- `implement-review-lehrer-agent`
- `implement-review-normalo-agent`
- `implement-review-oberlehrer-agent`
- `implement-review-professor-agent`
- `implement-review-optimist-agent`

### Jede Iteration

**3.1 Technik-Gate pro Stack**

Scope by actual diffs: **one Technik-Gate run per changed stack** (**Frontend** `{frontend-path}`, **Backend** `{backend-path}`; split Backend per independent build unit when applicable). **Do not** run for unchanged stacks. Commands from **[`{verification-commands}`]({verification-commands})** and repo docs—**do not** guess.

**Task-Prompt:** Vorlage **Technik-Gate pro Stack** in [references/subagent-prompts.md](references/subagent-prompts.md). Phases: Build-fix loop (max. **8** turns), then unit-test-fix loop (max. **8** turns, only if build OK). Narrow gate fixes allowed; escalate after turn exhaustion.

**3.2 Sechs Implement-Reviews (parallel, readonly)**

Spawn **six** dedicated subagents—one per role above. **Forbidden:** simulating roles in the orchestrator thread.

Each reviewer receives: final plan + ACs, current diff / touched paths, Technik-Gate status per stack. **Task-Prompts:** respective sections in [references/subagent-prompts.md](references/subagent-prompts.md). **MCP mandatory** per agent profile.

**3.3 Review-Digest**

Merge all six reports into **Review-Digest (Iteration N)** using the template in [references/subagent-prompts.md](references/subagent-prompts.md).

**3.4 Findings klassifizieren**

Merge digest findings and categorize:

- **Eindeutig fixbar** — correctness gaps, missing tests, rule violations, Technik-Gate follow-ups clearly derivable from plan + diff + MCP evidence.
- **Klärungsbedürftig** — product/design ambiguity, conflicting AC interpretation, scope decisions not in the plan.

**3.5 Gebündelte Nutzer-Rückfragen (wenn nötig)**

If any **klärungsbedürftig** findings exist, ask **one bundled question** (template **Gebündelte Rückfragen** in [references/subagent-prompts.md](references/subagent-prompts.md)). **Wait** for answers before Fix-Planer / Fix-Slices.

**3.6 Fix-Planer**

Exactly **one** `implement-fix-planner-agent` run per iteration. Input: plan, ACs, Review-Digest, classified findings, Technik-Gate status, diff list, user clarifications (if any).

**Mandatory:** Rules 1–5 + MCP order **A–H** + build-log-filter + **Evidenz-Basis** in deliverable — see [implement-fix-planner-agent.md](../../agents/implement-fix-planner-agent.md) and prompt **Fix-Planer (nach Review)**.

**Forbidden:** orchestrator-authored fix plans; Fix-Slices without Fix-Planer output.

**3.7 Fix-Slices umsetzen**

Spawn **`implement-agent`** per Fix-Slice from the Fix-Teilplan (IMP-* IDs, waves/blocking as planned). **Task-Prompt:** **Implementierer (Fix-Slice)**. Slice-scoped build/test only; build-log-filter per run.

**3.8 Iterations-Zusammenfassung**

Report briefly:

- Iteration number (**1**, **2**, or **3** of max. 3)
- Finding count per reviewer role
- What was fixed (and what after user clarification)
- Technik-Gate OK/FAIL per stack
- Whether the **next** iteration starts, the loop **ends cleanly**, or **Rest-Findings** follow (after iteration 3 only)

**3.9 Abbruchbedingung**

Der Loop endet in **einem** dieser Fälle:

1. **Sauber (früher oder spät):** Eine abgeschlossene Iteration liefert **keine behebbaren Findings** (Reviewer melden nur marginale oder keine handlungsrelevanten Punkte) **und** Technik-Gate ist **OK** für alle geänderten Stacks (außer User-Opt-out **B**/**C**/**D**).
2. **Maximum erreicht:** Nach **Iteration 3** (Review + ggf. Fix-Planer + Fix-Slices abgeschlossen) — unabhängig davon, ob noch Findings offen sind. **Keine** Iteration 4.

**Abschlussmeldung bei sauberem Ende:**

> **Review-Loop abgeschlossen** nach [N] von max. 3 Iteration(en). Das Deliverable hat alle sechs Reviewer-Perspektiven ohne offene behebbare Findings bestanden.

**3.10 Rest-Findings nach Maximum (nur wenn Fall 2 und noch Bemängelungen)**

Wenn nach abgeschlossener **Iteration 3** (Review + Fix-Planer + Fix-Slices) aus dem **Review-Digest Iteration 3** noch **behebbare oder wesentliche** Findings offen sind (nicht durch Iteration-3-Fix-Slices adressiert), **vor** Schritt-3-Closure einen **Rest-Findings-Bericht** erstellen — Vorlage **Rest-Findings nach Maximum** in [references/subagent-prompts.md](references/subagent-prompts.md). Pro Reviewer-Rolle: was noch bemängelt wird; umgesetzte Punkte aus Iteration 3 als erledigt markieren; Rollen ohne offene Punkte explizit „—“.

**Abschlussmeldung bei Maximum mit Rest-Findings:**

> **Review-Loop beendet** nach 3 Iterationen (Maximum). Offene Bemängelungen — siehe Rest-Findings-Bericht unten.

### Schritt-3-Closure (Orchestrator)

1. **Plan alignment**: every plan step and AC **checked** or explained (with user agreement if deliberately deviated).
2. **Loop evidence**: iterations count (max. 3); Technik-Gate matrix per stack/iteration; six reviews per iteration; Fix-Planer with Evidenz-Basis; Fix-Slices executed; **Rest-Findings-Bericht** if loop ended at maximum with open findings.
3. **Operational hygiene**: no unrequested refactors, secrets, or scope creep.
4. **Topology**: sequential/parallel adherence; contract drift resolved or escalated.
5. **Closure format**: **Abschlussformat** in [references/subagent-prompts.md](references/subagent-prompts.md). Technik-Gate **green** only with completed runs + build-log-filter per applicable command; otherwise **`BLOCKIERT (build-log-filter)`** or FAIL — **no** false closure.
6. Optional **Clean-Code review** over current Git changes — **only** after user confirmation.

## Operationale Regeln

- **Implementation (Schritt 2):** **1–10** **`implement-agent`** subagents; slice-scoped build/test and unit tests per [implement-agent](SKILL.md#orchestrator-konfiguration); **build-log-filter** on every in-scope run.
- **Review-Loop (Schritt 3):** max. **3** Iterationen (früher Abbruch wenn sauber); **Technik-Gate** pro Stack/Iteration; **6× implement-review-***; **implement-fix-planner-agent** mit MCP A–H + build-log-filter + Evidenz-Basis; **implement-agent** Fix-Slices only; nach Iteration 3 mit Rest-Findings → **Rest-Findings-Bericht**, **kein** weiterer Loop.
- **Do not** run **stack-wide Technik-Gate** during Schritt 2; Schritt 3 owns stack-wide checks unless user chose opt-out **C** or **D** in the thread.
- **Orchestrator** fixt keine Review-Findings ohne Fix-Planer + implement-agent.
- **Technik-Gate** may apply **narrow fixes** for green build/tests (**no** feature or scope expansion).
- **Follow host repository instructions** when present; they override generic habits.
- **No unnecessary refactors** or scope expansion; every change traces to the plan (implementation), Fix-Teilplan (loop), or Technik-Gate unblocking only.
- **No deliberate plan deviations** without user approval; trivial mechanical edits only as defined in Schritt 2.
- **Ask** when requirements, risks, or verification expectations are unclear—do not guess to keep momentum.

## Orchestrator-Konfiguration

Konfiguration des **implement-agent** — Implementierungs-Subagent für Schritt 2 (genau einen Plan-Slice). Der implement-agent orchestriert Build/Test/build-log-filter innerhalb seines Scopes; der übergeordnete Orchestrator ist der Nutzer-Chat (Initial Agent).

### Rolle

**Implementierungs-Subagent** im Implementation Workflow **Schritt 2**. Setzt **genau einen** Plan-Slice um — Code **und** lokale Qualitätssicherung **innerhalb des Slice-Scopes**.

**Kein** stack-weites Technik-Gate — das ist **Schritt 3** (Orchestrator).

### Pflicht: Rules prüfen und anwenden (erster Schritt, ohne Ausnahme)

> **Bevor du deinen Slice startest — lade in dieser Reihenfolge:**
>
> 1. **[implementation-workflow-skill.mdc](../../rules/implementation-workflow-skill.mdc)** — immer; Subagent-Pflicht, build-log-filter-Kette, Verifikations-Matrix.
> 2. **[build-log-filter.mdc](../../rules/build-log-filter.mdc)** — immer; Ausführungs-Checkliste 1–8 für jeden Build-/Test-Lauf.
> 3. **[codebase-analyzer.mdc](../../rules/codebase-analyzer.mdc)** — immer; MCP-First für Analyse vor und während Implementierung.
> 4. **[angular-skills.mdc](../../rules/angular-skills.mdc)** — wenn FE-Slice im Scope.
> 5. **[backend-ef-migrations-skill.mdc](../../rules/backend-ef-migrations-skill.mdc)** — wenn EF/Migrations im Slice-Scope.
>
> Kein Überspringen. Erst danach: Slice-Implementierung starten.

### Modell

| Feld | Wert |
|------|------|
| **Primär** | `auto` (AUTO — vom Host / Task-Modellauswahl) |

Ist `auto` **nicht** wählbar → **stoppen**, transparent melden — **kein** stiller Ausweich.

### codebase-analyzer (Bevorzugt)

| Aufgabe | MCP-Call |
|---------|----------|
| Symbole / Einstiegspunkte | `index_project` → `find_in_index` |
| Komplexität prüfen | `analyze_complexity` |
| Refactoring-Sicherheit | `analyze_refactoring_safety` |
| Build-/Test-Fehler analysieren | `analyze_build_output` |

### Mantra

**Clean Code · SOLID · YAGNI · minimaler Diff** — nur was der Plan für **deinen Slice** vorsieht.

### Erlaubt — nur im Slice-Scope

- **Build:** `dotnet build`, `ng build`, `npm run build`
- **Test:** `dotnet test`, `ng test`, `npm test` — **slice-relevant**
- **Unit-Tests anlegen und ausführen**, die **deinen Slice** absichern
- Minimale Fixes, damit **deine** Build-/Test-Läufe für den Slice grün werden

### build-log-filter (verbindlich)

Kanon via Pflicht-Schritt 2: [`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc) — Schritte 1–8 und **[Interpretationspflicht (verbindlich)](../../rules/build-log-filter.mdc#interpretationspflicht-verbindlich)** pro Build-/Test-Lauf. **MCP nicht erreichbar:** **`BLOCKER: build-log-filter nicht erreichbar`** — stoppen.

### Parallelität

Eigene `session_id` bei `filter_output_stream` — nicht mit anderen implement-agent-Läufen oder dem Orchestrator teilen.

### Verboten

- Scope über den Slice hinaus, stille Planänderung, unrequested Refactors
- Stack-weites Technik-Gate in Schritt 2
- Diagnose aus Roh-Konsole ohne abgeschlossene build-log-filter-Kette
- `terminals/*.txt` als Capture-Ersatz

### Rückgabe an Orchestrator

```text
- Summary: …
- Touched paths: …
- Build/Test (Slice): Kommandos, OK/FAIL, Verifikations-Matrix-Zeilen pro Lauf
- Open risks / blockers: …
- build-log-filter-Lücken (falls): was am Filter unklar blieb → Nutzer-Hinweis
```

Auf Deutsch, kompakt.

---

## Pflegehinweis

After changing this skill, verify host-facing guidance still matches—per host policy when the project requires it—especially **Cursor**: [`.cursor/rules/implementation-workflow-skill.mdc`](../../rules/implementation-workflow-skill.mdc) (triggers, opt-outs, skill path, **parallel implementation preferred** summary). For verification commands and repo-wide policy, align with **[`{verification-commands}`]({verification-commands})** (*Agents — mandatory verification after changes*). For build/test console reporting, align with **[.cursor/rules/build-log-filter.mdc](../../rules/build-log-filter.mdc)** (mandatory build-log-filter for in-scope runs; **[Interpretationspflicht](../../rules/build-log-filter.mdc#interpretationspflicht-verbindlich)**; **Hard Stop** if MCP unreachable; **Rufe build-log-filter** visible; **no** MCP body in reports; **Außerhalb des Scopes** for out-of-mapping commands).

**Trigger doppelt pflegen (Checkliste):**

1. **Rule** — kanonische Trigger-Abschnitte (vollständig).
2. **Diese YAML-`description`** — kompakte Spiegelung (nicht schmaler als Rule-Kern).
3. **[`{agent-index}`]({agent-index})** — Zeile Implementation Workflow, Kurz-Trigger.

**Pflicht-Schlüsselwörter** (mindestens in Rule + YAML + {agent-index}): `implementiere`, `setze um`, `fix`, `leg los`, `@implementation-workflow`, `Hard Gate`, `ohne implement-skill`.

**Sync-Prüfung (manuell):** Nach Trigger-Änderungen in Rule/Skill/AGENTS jeweils prüfen, ob alle sieben Schlüsselwörter noch vorkommen (z. B. IDE-Suche im Repo nach diesen Strings in den drei Dateien).

**`disable-model-invocation`:** **Option A (verbindlich)** — `true` beibehalten; Discovery über alwaysApply-Rule + explizites Skill-Lesen. Siehe Rule-Abschnitt **Pflegehinweis / Skill-Discovery**. **Nicht** auf `false` ohne explizite Projektentscheidung.

**Ausführungs-Checkliste / Interpretationspflicht:** Änderungen zuerst in **[`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc)**, anschließend **Build/Test + build-log-filter (kurz)** und Prompt-Vorlagen in [references/subagent-prompts.md](references/subagent-prompts.md) abgleichen — **keine** zweite vollständige 1–8-Liste hier pflegen.

**Prompt-Vorlagen:** Aenderungen an Subagent-Auftrags-Payloads **nur** in [references/subagent-prompts.md](references/subagent-prompts.md); danach Verweise in diesem Skill, [implementation-workflow-skill.mdc](../../rules/implementation-workflow-skill.mdc) und Agent-`.md` pruefen.

**Agent-Profile:** Modell-Slugs nur in Agent-`.md` und [## Orchestrator-Konfiguration](SKILL.md#orchestrator-konfiguration); implement-review-* und implement-fix-planner-agent unter [../../agents/](../../agents/).

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.

## Prompt-Vorlagen

Kopierbare Auftrags-Payloads (Platzhalter) — **nicht** Ersatz für Agent-Profile unter [../../agents/](../../agents/):

| Abschnitt | Datei | Wann |
|-----------|-------|------|
| Implementierer (compact) | [references/subagent-prompts.md](references/subagent-prompts.md) | Slice ohne Build/Test |
| Implementierer (Build/Test + build-log-filter) | [references/subagent-prompts.md](references/subagent-prompts.md) | **Standard** Schritt 2 mit slice-scoped Build/Test |
| Technik-Gate pro Stack | [references/subagent-prompts.md](references/subagent-prompts.md) | Pro Review-Iteration |
| Implement-Review (×6) | [references/subagent-prompts.md](references/subagent-prompts.md) | Pro Review-Iteration |
| Fix-Planer (nach Review) | [references/subagent-prompts.md](references/subagent-prompts.md) | Nach Review-Digest |
| Rest-Findings nach Maximum | [references/subagent-prompts.md](references/subagent-prompts.md) | Nach Iteration 3 mit offenen Findings |
| Abschlussformat (Orchestrator) | [references/subagent-prompts.md](references/subagent-prompts.md) | Nach Review-Loop |
