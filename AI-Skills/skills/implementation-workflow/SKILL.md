---
name: implementation-workflow
description: >
  Repo-Umsetzung: Hard Gate, 1–10 implement-agent (Slice inkl. Build/Test), verify-agent Abschlussprüfer pro Stack. genericRTK Pflicht.
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

During **Schritt 2**, **implement-agent** subagents may run **slice-scoped** builds and tests (see [implement-agent](SKILL.md#orchestrator-konfiguration)); **stack-wide Abschlussprüfung** runs **after** implementation via **verify-agent** per touched stack, as described under **Verifikations-Timing**.

Verbindliche Prompt-Vorlagen (Auftrags-Payloads): [references/subagent-prompts.md](references/subagent-prompts.md).

## Subagent-Typen und Agent-Definitionen (host-neutral)

Dieser Abschnitt ist fuer **jeden** Host lesbar (Cursor, Claude, Copilot, CLI). **Modellwahl**

liegt **ausschliesslich** in [../../agents/*.md](../../agents/) — **nicht** in diesem Skill

oder in Rules.

### Rollen im Implementation Workflow

| Rolle | Schritt | Agent-Typ | Profil |
|-------|---------|-----------|--------|
| **Orchestrator / Initial Agent** | 1, Integration, 3 Review | *(Nutzer-Chat / Parent)* | dieser Skill |
| **Implementierer** | 2 (1–10 Slices) | `implement-agent` | [implement-agent](SKILL.md#orchestrator-konfiguration) |
| **Verifikation / Abschlussprüfung** | nach Integration-Checkpoint | `verify-agent` | [verify-agent.md](../../agents/verify-agent.md) |

**Subagent — Modell vor Task (Pflicht):** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — vor jedem Task Ziel-Profil lesen; **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** hier duplizieren.

- **implement-agent:** genau **ein** Plan-Slice (IMP-*); Build/Test **slice-relevant**; Unit-Tests im Slice; genericRTK Pflicht.
- **verify-agent:** **Abschlussprüfer** — **ein** Stack (Frontend / Backend; Backend kann bei mehreren unabhängigen Build-Einheiten — unterschiedliche eigenständige Projekte/Module — je Build-Einheit aufgeteilt werden); stack-weiter Build + Unit-Tests; genericRTK Pflicht.
- **Verboten:** `explore`/`generalPurpose` statt **implement-agent**/**verify-agent**; Orchestrator-Build/Test bypass.

### Ausfuehrung je Host

| Host | Implementierung | Verifikation |
|------|-----------------|--------------|
| **Cursor** | Task-Subagent `implement-agent` | Task-Subagent `verify-agent` pro Stack |
| **Andere** | Sub-Lauf mit `implement-agent.md` als System-Prompt | Sub-Lauf mit `verify-agent.md` |

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
integration checkpoint, dedicated per-stack verification agents, and initial-agent
review—all in **one** place. Older split workflows are **obsolete** here.

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
| Schritt 3: initial agent review + per-stack verification agents   |
| (build-fix then test-fix; host [`{verification-commands}`]({verification-commands})) |
| Closure report; optional Clean-Code review only after user OK   |
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
| 6 | Is **post-implementation verification** clear and compatible with host policy (**per-stack verification agents**: build-fix loop then unit-test-fix loop, unless the user explicitly chose opt-out variants **B/C/D** in the thread)? |
| 7 | Is it clear **which stacks** are touched (**Frontend** / **Backend**; Backend may be split per independent build unit when the backend contains multiple distinct build targets) so the initial agent can spawn **one `verify-agent` per touched stack or build unit**, per host docs? |
| 8 | Is **implementation** explicitly split into **1–10** implementation subagents with boundaries from the **final plan** (or thread), and is **per-stack verification** (one agent per changed stack; **no** agent for unchanged stacks) agreed? |
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
   **Build/Test (slice-scoped):** **allowed** per [implement-agent](SKILL.md#orchestrator-konfiguration) — `dotnet build`, `dotnet test`, `ng build`, `npm run build`, `ng test`, `npm test` and unit tests **for the assigned slice**; **genericRTK** mandatory on every such run. **Not** stack-wide Abschlussprüfung (that is **verify-agent** after integration).

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
   - **Pflicht:** Den passenden Abschnitt aus [references/subagent-prompts.md](references/subagent-prompts.md) in den Task-Prompt übernehmen — bei Build/Test **Implementierer (Slice — Build/Test + genericRTK)**; genericRTK-Checkliste kanonisch in [`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc) (**keine** zweite 1–8-Liste im Brief duplizieren).

6. **Plan deviations:** No deliberate deviation from the final plan without
   **user approval**. If implementation reveals the plan is wrong or incomplete,
   **stop** and ask. Only **trivial mechanical** edits are allowed without new
   approval (formatting, typo fixes, import reorder **without** behavior,
   scope, architecture, or UX change).

7. The initial agent remains orchestrator: subagent output is **not** done until
   the **integration checkpoint** (below) and **Schritt 3** pass.

### Verifikations-Timing

After **all** implementation subagents finish and the **integration checkpoint** passes
**(before closure)**:

1. **Scope verification agents by actual diffs:** start **one `verify-agent` per stack
   that changed** in this pass (**Frontend** `{frontend-path}`, **Backend**
   `{backend-path}`; if the backend contains multiple independent build units — distinct
   projects/modules with their own build target — start one agent per changed unit).
   **Do not** start a verification agent for a stack with **no** changes. Derive concrete commands from
   **[`{verification-commands}`]({verification-commands})** (*Agents — mandatory verification after changes*) and repo docs—do **not** guess.
2. **Agent-Typ (Verifikation):** **`verify-agent`** — Profil [verify-agent.md](../../agents/verify-agent.md); Modell gemäß [subagent-model-before-task.md](../../references/subagent-model-before-task.md). Bei mehreren betroffenen Stacks **parallel** starten, sofern unabhängig. **Task-Prompt:** Vorlage **Verifikation pro Stack** in [references/subagent-prompts.md](references/subagent-prompts.md).

#### Checkliste Build/Test + genericRTK (kurz)

**Kanon (keine zweite Liste):** [`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc) — **Ausführungs-Checkliste (pro Build-/Test-Lauf)** Schritte **1–8** und **[Interpretationspflicht (verbindlich)](../../rules/genericrtk-output-filter.mdc#interpretationspflicht-verbindlich)**. **Gilt** für **`implement-agent`** (slice build/test), **`verify-agent`** (Abschlussprüfung) und den **initialen Agenten** nur bei dokumentierter Host-Limitation.

- Pro Lauf: Shell → vollständiges Capture → genericRTK → **intern lesen** → Kurzprosa + Shell-Exit (**kein** MCP-Body, **kein** Roh-Log ans LLM).
- **Unklare verdichtete Ausgabe:** Agent **informiert den Nutzer**, dass genericRTK nachgeschärft werden soll — **nicht** aus Roh-Konsole raten ([implement-agent](SKILL.md#orchestrator-konfiguration), [verify-agent.md](../../agents/verify-agent.md)).
- **Interpretationspflicht:** inhaltliche Diagnose/Freigabe **nur** aus intern gelesenem MCP; **OK/FAIL** aus Shell-Exit; **kein** Kurz-`raw`, **kein** Terminal-Datei-Ersatz (`terminals/*.txt`).
- **Vor jedem** MCP: **`Rufe genericRTK …`** sichtbar; **Hard Stop** wenn MCP nicht erreichbar (in-scope).

**Vor Verifikation (Orchestrator):** Beim ersten applicable Lauf oder vor Start der Verifikations-Subagents — wenn MCP bei applicable Kommando **nicht** erreichbar ist, sofort **Hard Stop** (`BLOCKER: genericRTK nicht erreichbar`), **keine** Verifikations-Subagents starten bzw. **Stopp** der laufenden Verifikation.

3. **Verification agent phases (per stack):**
   - **Phase 1 — Build-fix loop (max. 8 turns):** run the stack’s **check / release-style build**
     command. **After every run**, capture exit code and **complete** stdout/stderr, then apply **Console output and genericRTK** (bullet below). On failure, the agent **fixes** and rebuilds until **exit 0** or **8 turns** are
     exhausted. If still failing after 8 turns, **stop** and escalate to the **initial agent**
     / user with **kurzer eigener Kurzfassung** zur Diagnose (intern aus genericRTK verarbeitet, wenn applicable; siehe [`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc)) — **kein** ungefiltertes Rohkonsole-Paste.
   - **Phase 2 — Unit-test-fix loop (max. 8 turns, only if Phase 1 succeeded):** run the stack’s
     **unit test** command. **After every run**, same **Console output and genericRTK** handling as in Phase 1. On failure, the agent **fixes** and re-runs tests until **exit 0** or
     **8 turns** are exhausted. If still failing after 8 turns, **stop** and escalate with the same reporting rules as Phase 1.
   - **Console output and genericRTK (every build/test run in Phase 1 and Phase 2):**
     - **Im Scope** (command in `tool_type` / `format` mapping): **must** process **full** stdout/stderr of **this run** through genericRTK on **every** run — including **exit 0** — per [`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc) and **[Interpretationspflicht](../../rules/genericrtk-output-filter.mdc#interpretationspflicht-verbindlich)**. Read MCP tool descriptors, then `filter_output` (or `filter_output_stream` when long/streaming); if shell exit ≠ 0, also `analyze_build_output`. **Forbidden:** skip `filter_output` because the build succeeded; **summary-as-`raw`**; diagnose or sign off from raw console, Tool-UI, or terminal files without completed MCP chain.
     - **Out of scope** (command **not** in mapping): [Außerhalb des Scopes](../../rules/genericrtk-output-filter.mdc#außerhalb-des-scopes) — brief note, concise manual summary, **no** full raw log; **no** forced `filter_output`.
     - **MCP unreachable** for an **in-scope** command: [Hard Stop](../../rules/genericrtk-output-filter.mdc#hard-stop--mcp-nicht-erreichbar) — **stop immediately**; emit **`BLOCKER: genericRTK nicht erreichbar`** to orchestrator/user; **no** manual summary and continue; **no** verification sign-off.
     - **Parent visibility:** before each `filter_*` / `analyze_build_output` call, emit **`Rufe genericRTK …`** in the **message back to the orchestrator** (**kein** MCP-Body danach).
     - **Checkliste:** **Checkliste Build/Test + genericRTK (kurz)** oben = kanonische **Ausführungs-Checkliste** in the rule — **no** second parallel list.
   Phase 2 **must not** start until Phase 1 has completed with **OK**.
4. **Host opt-outs:** **B** (tests only — skip Phase 1 build loop / only run tests per host text),
   **C** (build only — skip Phase 2), **D** (no automated verification) apply **only** with explicit
   user text in the thread, per **[`{verification-commands}`]({verification-commands})**.
5. **Implementation subagents** must **not** perform **stack-wide Abschlussprüfung** during Schritt 2 — that is **verify-agent** after the integration checkpoint. Slice-scoped build/test per **implement-agent** is allowed.

### Integration checkpoint (Orchestrator)

**When:** After all **implementation** subagent work for this pass is back. **Before**
starting **per-stack verification agents** and **Schritt 3** review.

**Do at minimum:**
- Collect subagent outputs (summaries, touched paths, diffs / artifacts).
- Classify **which stacks** changed (Frontend / Backend; split Backend per independent build unit when applicable) to size **verification** agents.
- Check for **interface / contract drift** between slices; on meaningful drift,
  **stop** and escalate to the user (or resolve with a minimal plan patch)—do
  not “review away” incompatible contracts.
- Assess merge/conflict risk. Resolve what is in scope for the initial agent;
  escalate unclear ownership per the plan.

Only after this checkpoint is the work **ready for** per-stack verification and Schritt 3
(final review), which should focus on quality and plan alignment—not first-contact integration.

**Orchestrator edits after verification (verbindlich):** If the **initial agent** changes
repo files **after** a verification subagent run (integration fix, import cleanup, merge
resolution, config tweak), treat prior verification as **stale**. **Do not** run
`ng build` / `ng test` / `dotnet build` / `dotnet test` yourself to “confirm green”.
**Must** start a **new** verification subagent per affected stack and collect a **continued**
[Verifikations-Matrix](../../rules/genericrtk-output-filter.mdc#verifikations-matrix) for runs
**after** that edit. See [Orchestrator-Nachlauf](../../rules/genericrtk-output-filter.mdc#orchestrator-nachlauf-hauptagent).

## Schritt 3 - Review durch initialen Agenten

The **initial agent** (not a subagent) must review all changes before closure:

1. **Plan alignment**: every plan step and acceptance criterion **checked** or
   explained (with **user agreement** if deliberately deviated).

2. **Quality**: correctness, edge cases, unintended side effects, consistency
   with host rules.

3. **Verification**: confirm **per-stack verification subagents** ran per **Verifikations-Timing**
   (build-fix loop, then unit-test-fix loop, max. **8 turns** each), **only** for stacks that actually
   changed—unless the user explicitly chose **B**, **C**, or **D** in the thread per
   **[`{verification-commands}`]({verification-commands})**. Collect each agent’s **turn counts**, **OK/FAIL** per phase, exact commands, and touched paths
   (verification fixes). Per **in-scope** run: confirm **`filter_*`** (and on FAIL **`analyze_build_output`**) ran on **every** run including success, plus **kurze Diagnose** derived from **internally read** MCP (**no** MCP body, **no** raw-log paste). Reject subagent reports that diagnose from console/terminal files without MCP chain. **Out of scope:** [Außerhalb des Scopes](../../rules/genericrtk-output-filter.mdc#außerhalb-des-scopes) noted explicitly. **MCP unreachable:** status **`Verifikation: BLOCKIERT (genericRTK)`** — **not** acceptable closure. **Do not** accept unfiltered raw logs when genericRTK was required. If the host **cannot** spawn subagents: **`BLOCKER`** to user — **do not** replace with orchestrator-run build/test unless the user explicitly overrides in the thread.

4. **Operational hygiene**: confirm no unrequested refactors, secrets, or scope
   creep; list changed areas at a high level.

5. **Integration and execution topology** (1–10 implementation subagents; sequential or parallel):
   - Was the planned topology (**sequential / parallel**) adhered to?
   - Are integration risks (merge, **contract drift**) resolved or **explicitly**
     escalated with user/agent agreement?
   - Does **verification** cover every touched stack (Frontend / Backend) per policy?

6. **Closure**:
   - Summarize outcomes against acceptance criteria.
   - Use the **Abschlussformat** in [references/subagent-prompts.md](references/subagent-prompts.md).
   - Report **verification actually run** (per stack: Phase 1 / Phase 2 commands, turns used, OK/FAIL)—not
     an optional “should we build?” prompt—unless the user explicitly chose opt-out **D**
     or narrowed scope (**B**/ **C**) in writing in the thread. Verification is **green** only if subagents completed and genericRTK ran per applicable run; otherwise report **`BLOCKIERT (genericRTK)`** or FAIL — **no** false “verified” closure.
   - Offer an optional **separate review agent** over **current Git changes**
     for **Clean Code** and **Clean Development** principles—**only** after user
     confirmation; do **not** start that review automatically.

## Operationale Regeln

- **Implementation:** **1–10** **`implement-agent`** subagents; slice-scoped build/test and unit tests per [implement-agent](SKILL.md#orchestrator-konfiguration); **genericRTK** on every in-scope run.
- **Verification (Abschlussprüfung):** after integration checkpoint, **one `verify-agent` per changed stack** (**no** orchestrator bypass); stack-wide build-fix then unit-test-fix (max. **8** turns each), per **[`{verification-commands}`]({verification-commands})** and [verify-agent.md](../../agents/verify-agent.md). **genericRTK** mandatory; **unclear MCP output → inform user** to sharpen genericRTK — do not guess from raw logs.
- **Verification subagents** may apply **narrow fixes** required for green build/tests (**no** feature or
  scope expansion; **no** unrelated refactors). Escalate product/design ambiguity to the initial agent or user.
- **Do not** run **stack-wide** release verification during Schritt 2; **verify-agent** owns Abschlussprüfung unless user chose opt-out **C** or **D** in the thread.
- **Follow host repository instructions** (for example the repository’s agent or
  contributor guide) when present; they override generic habits.
- **No unnecessary refactors** or scope expansion; every change should trace to
  the plan (implementation) or to **unblocking** build/tests (verification agents only).
- **No deliberate plan deviations** without user approval; trivial mechanical
  edits only as defined in Schritt 2.
- **Ask** when requirements, risks, or verification expectations are unclear—do
  not guess to keep momentum.

## Orchestrator-Konfiguration

Konfiguration des **implement-agent** — Implementierungs-Subagent für Schritt 2 (genau einen Plan-Slice).

### Rolle

**Implementierungs-Subagent** im Implementation Workflow **Schritt 2**. Setzt **genau einen** Plan-Slice um — Code **und** lokale Qualitätssicherung **innerhalb des Slice-Scopes**.

**Kein** Stack-weiter Abschlussprüfer — das ist [verify-agent.md](../../agents/verify-agent.md) **nach** dem Integration-Checkpoint.

### Pflicht: Rules prüfen und anwenden (erster Schritt, ohne Ausnahme)

> **Bevor du deinen Slice startest — lade in dieser Reihenfolge:**
>
> 1. **[implementation-workflow-skill.mdc](../../rules/implementation-workflow-skill.mdc)** — immer; Subagent-Pflicht, genericRTK-Kette, Verifikations-Matrix.
> 2. **[genericrtk-output-filter.mdc](../../rules/genericrtk-output-filter.mdc)** — immer; Ausführungs-Checkliste 1–8 für jeden Build-/Test-Lauf.
> 3. **[code-review-mcp.mdc](../../rules/code-review-mcp.mdc)** — immer; MCP-First für Analyse vor und während Implementierung.
> 4. **[angular-skills.mdc](../../rules/angular-skills.mdc)** — wenn FE-Slice im Scope.
> 5. **[backend-ef-migrations-skill.mdc](../../rules/backend-ef-migrations-skill.mdc)** — wenn EF/Migrations im Slice-Scope.
>
> Kein Überspringen. Erst danach: Slice-Implementierung starten.

### Modell

| Feld | Wert |
|------|------|
| **Primär** | `auto` (AUTO — vom Host / Task-Modellauswahl) |

Ist `auto` **nicht** wählbar → **stoppen**, transparent melden — **kein** stiller Ausweich.

### code-review-mcp (Bevorzugt)

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

### genericRTK (verbindlich)

**Jeder** Build-/Test-Lauf im Scope:

1. Shell → **vollständiges** stdout/stderr-Capture dieses Laufs
2. **Sofort** `filter_output` / `filter_output_stream` (bei Exit ≠ 0 zusätzlich `analyze_build_output`)
3. Vor jedem MCP: **`Rufe genericRTK …`** sichtbar
4. **Inhaltliche Diagnose nur** aus **intern gelesenem** MCP-Ergebnis — **niemals** Roh-Konsole
5. MCP-Body **nicht** in Berichte kopieren — nur **Kurzprosa** aus MCP

**MCP nicht erreichbar:** **`BLOCKER: genericRTK nicht erreichbar`** — stoppen.

### Parallelität

Eigene `session_id` bei `filter_output_stream` — nicht mit anderen implement-agent-Läufen oder dem Orchestrator teilen.

### Verboten

- Scope über den Slice hinaus, stille Planänderung, unrequested Refactors
- Stack-weite Release-/Integrations-Verifikation **statt** verify-agent
- Diagnose aus Roh-Konsole ohne abgeschlossene genericRTK-Kette
- `terminals/*.txt` als Capture-Ersatz

### Rückgabe an Orchestrator

```text
- Summary: …
- Touched paths: …
- Build/Test (Slice): Kommandos, OK/FAIL, Verifikations-Matrix-Zeilen pro Lauf
- Open risks / blockers: …
- genericRTK-Lücken (falls): was am Filter unklar blieb → Nutzer-Hinweis
```

Auf Deutsch, kompakt.

---

## Pflegehinweis

After changing this skill, verify host-facing guidance still matches—per host policy when the project requires it—especially **Cursor**: [`.cursor/rules/implementation-workflow-skill.mdc`](../../rules/implementation-workflow-skill.mdc) (triggers, opt-outs, skill path, **parallel implementation preferred** summary). For verification commands and repo-wide policy, align with **[`{verification-commands}`]({verification-commands})** (*Agents — mandatory verification after changes*). For build/test console reporting, align with **[.cursor/rules/genericrtk-output-filter.mdc](../../rules/genericrtk-output-filter.mdc)** (mandatory genericRTK for in-scope runs; **[Interpretationspflicht](../../rules/genericrtk-output-filter.mdc#interpretationspflicht-verbindlich)**; **Hard Stop** if MCP unreachable; **Rufe genericRTK** visible; **no** MCP body in reports; **Außerhalb des Scopes** for out-of-mapping commands).

**Trigger doppelt pflegen (Checkliste):**

1. **Rule** — kanonische Trigger-Abschnitte (vollständig).
2. **Diese YAML-`description`** — kompakte Spiegelung (nicht schmaler als Rule-Kern).
3. **[`{agent-index}`]({agent-index})** — Zeile Implementation Workflow, Kurz-Trigger.

**Pflicht-Schlüsselwörter** (mindestens in Rule + YAML + {agent-index}): `implementiere`, `setze um`, `fix`, `leg los`, `@implementation-workflow`, `Hard Gate`, `ohne implement-skill`.

**Sync-Prüfung (manuell):** Nach Trigger-Änderungen in Rule/Skill/AGENTS jeweils prüfen, ob alle sieben Schlüsselwörter noch vorkommen (z. B. IDE-Suche im Repo nach diesen Strings in den drei Dateien).

**`disable-model-invocation`:** **Option A (verbindlich)** — `true` beibehalten; Discovery über alwaysApply-Rule + explizites Skill-Lesen. Siehe Rule-Abschnitt **Pflegehinweis / Skill-Discovery**. **Nicht** auf `false` ohne explizite Projektentscheidung.

**Ausführungs-Checkliste / Interpretationspflicht:** Änderungen zuerst in **[`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc)** (Abschnitte **Ausführungs-Checkliste** und **Interpretationspflicht**), anschließend **Verifikations-Timing → Checkliste Build/Test + genericRTK (kurz)** und Prompt-Vorlagen in [references/subagent-prompts.md](references/subagent-prompts.md) abgleichen — **keine** zweite vollständige 1–8-Liste hier pflegen.

**Prompt-Vorlagen:** Aenderungen an Subagent-Auftrags-Payloads **nur** in [references/subagent-prompts.md](references/subagent-prompts.md); danach Verweise in diesem Skill, [implementation-workflow-skill.mdc](../../rules/implementation-workflow-skill.mdc) und Agent-`.md` pruefen.

**Agent-Profile:** Modell-Slugs und Ketten für den implement-agent **nur** in [## Orchestrator-Konfiguration](SKILL.md#orchestrator-konfiguration) dieses Skills; verify-agent: [../../agents/verify-agent.md](../../agents/verify-agent.md); Skills/Rules verweisen auf [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — keine Slug-Duplikate.

## Prompt-Vorlagen

Kopierbare Auftrags-Payloads (Platzhalter) — **nicht** Ersatz für Agent-Profile unter [../../agents/](../../agents/):

| Abschnitt | Datei | Wann |
|-----------|-------|------|
| Implementierer (compact) | [references/subagent-prompts.md](references/subagent-prompts.md) | Slice ohne Build/Test |
| Implementierer (Build/Test + genericRTK) | [references/subagent-prompts.md](references/subagent-prompts.md) | **Standard** Schritt 2 mit slice-scoped Build/Test |
| Verifikation pro Stack | [references/subagent-prompts.md](references/subagent-prompts.md) | Nach Integration-Checkpoint |
| Abschlussformat (Orchestrator) | [references/subagent-prompts.md](references/subagent-prompts.md) | Schritt 3 Closure |
