---
name: implementation-workflow
description: >
  Repo-Umsetzung: Hard Gate, 1–10 implement-agent (Slice inkl. Build/Test), iterativer Implement-Review-Loop max. 3× (Technik-Gate, 6 Reviews, implement-fix-planner-agent, Fix-Slices). build-log-filter + codebase-analyzer Pflicht. Trigger (kanonisch in Rule): implementiere/setze um/fix/einbauen/leg los, Plan ausführen, impliziter Repo-Code-Intent, @implementation-workflow-skill, Hard Gate, Schritt 2/IMP-\*, engl. apply changes/go ahead/ship it; Opt-out ohne implement-skill. Discovery via alwaysApply-Rule (disable-model-invocation: true — Skill nicht auto-invoked).
disable-model-invocation: true
---

# Parameter

| Parameter                 | Beschreibung                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `{frontend-path}`         | Pfad zum Frontend-Projekt innerhalb von `{code-root}`         |
| `{backend-path}`          | Pfad zum Backend-Projekt innerhalb von `{code-root}`          |
| `{agent-index}`           | Datei mit der Repository-Agentenübersicht (z. B. `AGENTS.md`) |
| `{verification-commands}` | Datei mit den Verifikationsbefehlen für Agents                |


# Implementation Workflow

## ⚠️ MCP-First Build/Test — Anti-Shortcut-Regel (höchste Priorität, ohne Ausnahme)

**Kein Build- oder Test-Lauf wird als Shell-Kommando ausgeführt — immer MCP.**

| Aufgabe | MCP-Tool | MCP-Server | VERBOTEN |
|---------|----------|-----------|---------|
| Angular Build | `build_angular_project` | dev-angular-mcp | Shell `ng build` |
| Angular Test | `test_angular_project` | dev-angular-mcp | Shell `ng test` |
| .NET Build | `build_dotnet_solution` | dev-dotnet-mcp | Shell `dotnet build` |
| .NET Test | `test_dotnet_solution` | dev-dotnet-mcp | Shell `dotnet test` |

**Für jeden Build-/Test-Lauf gilt ohne Ausnahme:**

1. MCP-Tool aufrufen (`build_angular_project` / `test_angular_project` / `build_dotnet_solution` / `test_dotnet_solution`)
2. Response lesen: `errors[]`, `warnings[]`, `summary`, `success`
3. Diagnose / „verifiziert" / „grün" **nur** aus MCP-Ergebnis — **nie** aus Shell-Output
4. MCP-Lauf in der Rückgabe dokumentieren (MCP-Tool, `success`, Fehleranzahl)

**„Build succeeded" aus dem Terminal ist kein Verifikationsnachweis.** Nur MCP-`success: true` gilt.

**Wenn MCP nicht erreichbar:** Sofort **Hard Stop** ausgeben:
`„⚠️ BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar — kein Build/Test-Lauf starten."`
Kein stiller Shell-Fallback; kein Ausweichen auf build-log-filter ohne explizite Nutzerfreigabe.

**Kein Opt-out** (außer explizitem User-Text im Thread für Opt-out B/C/D gemäß `{verification-commands}`).

## Transparenz-Pflicht vor jedem Build/Test-Lauf

**Vor jedem** Build- oder Test-Lauf gibt der ausführende Agent im Chat aus:

```
„Führe jetzt Build/Test via [build_angular_project | test_angular_project | build_dotnet_solution | test_dotnet_solution] aus."
```

**Wenn dieser Satz nicht ausgegeben werden kann, weil der Agent Shell statt MCP verwenden will:**
→ **STOPP.** Ausgabe im Chat:
`„⚠️ MCP-First-Pflicht verletzt: [Kommando] ohne MCP-Aufruf. Nicht regelkonform."`

Kein stilles Ausführen. Kein „ich leite aus der Shell-Ausgabe ab".

## Quick Start

Use this workflow when acting as the **initial implementation agent** for an
explicit task—even ad-hoc without a dense written plan—with enough clarity to
implement (use the Hard Gate consistently; escalate if critical items are UNKNOWN).

Whenever the host expects this skill loaded **before executing** repo changes,
treat reading and following it as **mandatory** for the whole slice until closure.

Do **not** start editing code, spawning subagents, or running verification
commands immediately. First decide whether the plan is truly **implementation-ready** using the **Hard Gate** below. If scope, acceptance
criteria, risks, or host rules are unclear, **stop** and resolve with the user
before any delegation or execution.

During **Schritt 2**, **implement-agent** subagents may run **slice-scoped** builds and tests (see [implement-agent](#orchestrator-konfiguration)); **stack-wide Technik-Gate** runs in **Schritt 3** per Review-Iteration, as described under **Schritt 3 — Iterativer Implement-Review-Loop**.

Verbindliche Prompt-Vorlagen (Auftrags-Payloads): [references/subagent-prompts.md](references/subagent-prompts.md).

## Subagent-Typen und Agent-Definitionen (host-neutral)

Dieser Abschnitt ist fuer **jeden** Host lesbar (Cursor, Claude, Copilot, CLI). **Modellwahl**
liegt **ausschliesslich** in `../../agents/*.md` — **nicht** in diesem Skill oder in Rules.

### Rollen im Implementation Workflow

| Rolle                            | Schritt                         | Agent-Typ                         |
| -------------------------------- | ------------------------------- | --------------------------------- |
| **Orchestrator / Initial Agent** | 1, Integration, 3 Loop          | *(Nutzer-Chat / Parent)*          |
| **Implementierer**               | 2 (1–10 Slices), 3 (Fix-Slices) | `implement-agent`                 |
| **Technik-Gate**                 | 3.1 (pro Iteration)             | Orchestrator-Subagent / Host-Task |
| **Implement-Review ×6**          | 3.2 (pro Iteration)             | `implement-review-*-agent`        |
| **Fix-Planung**                  | 3.6 (pro Iteration)             | `implement-fix-planner-agent`     |

**Subagent — Modell vor Task (Pflicht):** `subagent-model-before-task.md` — vor jedem Task Ziel-Profil lesen; **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** hier duplizieren.

- **implement-agent:** genau **ein** Plan- oder Fix-Slice (IMP-*); Build/Test **slice-relevant**; Unit-Tests im Slice; build-log-filter Pflicht **auf jedem Lauf**.
- **implement-review-*:** **readonly** — je **eine** Rolle pro Lauf; **6** parallele Läufe pro Iteration; MCP-Pflicht je Profil.
- **implement-fix-planner-agent:** Fix-Teilplan aus Review-Digest; MCP A–H + build-log-filter + **Evidenz-Basis**; **keine** Code-Implementierung.
- **Technik-Gate:** stack-weiter Build + Unit-Tests (max. **8** Turns je Phase); build-log-filter Pflicht **auf jedem Lauf**; enge Gate-Fixes erlaubt.
- **Verboten:** `explore`/`generalPurpose` statt dedizierter Agent-Profile; Orchestrator-Build/Test bypass; Review-Fixes ohne Fix-Planer; **build-log-filter überspringen**.

### Ausfuehrung je Host

| Host       | Implementierung                                     | Review-Loop (Schritt 3)                                                                        |
| ---------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Cursor** | Task-Subagent `implement-agent`                     | Technik-Gate + 6× `implement-review-*` + `implement-fix-planner-agent` + Fix-`implement-agent` |
| **Andere** | Sub-Lauf mit `implement-agent.md` als System-Prompt | Sub-Läufe mit jeweiligem Agent-`.md` als System-Prompt                                         |

Neue Implementation-Agenten: unter `../../agents/` anlegen und hier eintragen.

## Trigger (Kanon)

**Kanonische Trigger-Liste:** `.cursor/rules/implementation-workflow-skill.mdc`

**Discovery:** `disable-model-invocation: true` — dieser Skill wird vom Host **nicht** automatisch invoked. Bei erkanntem Umsetzungsintent: Rule (alwaysApply) verlangt **vollständiges Lesen** dieses Skills **vor** dem ersten Write.

**Bei Zweifel:** Hard Gate prüfen; bei UNKNOWN kritischen Punkten **stoppen** — nicht direkt editieren.

### Agent-Modus: Skill als Umsetzungsauftrag

Gilt **nicht nur** bei @-Anhang dieses Skills, sondern **immer**, wenn die Implementation-Rule Umsetzungsabsicht erkennt (alwaysApply).

If the user provides clear scope (typically a **final plan**, approved thread briefing, or Plan-Freigabe per Rule) and asks to implement — treat that as explicit instruction to **run this Implementation Workflow end-to-end**, not informal one-off edits outside the playbook.

### Überblick (Ablauf)

```
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
| build-log-filter PFLICHT auf jedem Build/Test-Lauf                 |
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
| build-log-filter PFLICHT auf jedem Build/Test-Lauf                |
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
orchestration): work carefully through the checklist below; **state uncertainty** where items cannot be verified—do not proceed while critical items remain **UNKNOWN** without user acknowledgment.

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
proceed immediately to **Ausführungsform vor Schritt 2** below—still **before** any edits or spawned subagents.

## Hard Gate: Implementation Readiness

Proceed to implementation **only** if you can answer **YES** to every question
below (or the user has explicitly waived a specific item). **NO** or **UNKNOWN** means **stop**: ask the user; **do not** edit; **do not** delegate; **do not** run verification commands beyond read-only inspection allowed by host policy.

**Conditional rows (10–13):** answer **YES** if the condition in the first column
does **not** apply (i.e. treat as **N/A** / passes).

| #  | Question                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | Is **scope** explicit (what is in / out)?                                                                                                                                                                                                    |
| 2  | Are **acceptance criteria** explicit and **verifiable**?                                                                                                                                                                                     |
| 3  | Are **affected areas** clear (concrete paths, modules, or an explicit discovery strategy)?                                                                                                                                                   |
| 4  | Have required **host rules** and **relevant skills** been identified and loaded per host policy?                                                                                                                                             |
| 5  | Are **risks** (security, data, irreversible steps, migrations) addressed or escalated?                                                                                                                                                       |
| 6  | Is the **iterative Implement-Review-Loop** (max. **3** Iterationen) accepted as mandatory post-integration verification, unless the user explicitly chose opt-out variants **B/C/D** in the thread?                                          |
| 7  | Is it clear **which stacks** are touched so Schritt 3 can run **Technik-Gate per touched stack**?                                                                                                                                           |
| 8  | Is **implementation** explicitly split into **1–10** implementation subagents with boundaries from the **final plan**, and is **Technik-Gate per changed stack** in Schritt 3 agreed?                                                       |
| 9  | **For the 1–10 implementation subagents:** Are slice boundaries taken from the **final plan** so execution does **not** invent new splits?                                                                                                   |
| 10 | **If two or more implementation subagents are used:** Is **execution topology** explicit (**sequential** vs **parallel**)?                                                                                                                   |
| 11 | **If two or more implementation subagents are used:** Are **slice independence rules** explicit?                                                                                                                                             |
| 12 | **If two or more implementation subagents are used:** Are **blocking dependencies** between packages stated?                                                                                                                                 |
| 13 | **If two or more implementation subagents are used:** Is there a defined **integration / merge step** and **drift/conflict ownership**?                                                                                                      |
| 14 | Is **build-log-filter MCP erreichbar**? Bei `dotnet test`/`dotnet build`/`ng build`/`ng test` im Scope: MCP-Verfügbarkeit prüfen; bei UNKNOWN → **BLOCKER**: klären vor Delegation. |

## Ausführungsform vor Schritt 2

After implementation-ready status and **before** any edits or spawning subagents:

1. Confirm **exactly** **1–10** **implementation** subagents (never zero, never more than ten),
each scoped from the **final plan** or agreed thread. **Agent-Typ:** **`implement-agent`**.
2. **Parallel bevorzugt (prüfen, dann wählen):** If the plan defines **≥2 independent** slices in a **parallel wave** and Hard Gate rows **10–13** are satisfied, set Ausführungsform to **parallel** for that wave.
3. Ground decisions in the **final plan**, **prior thread commits**, or the user's immediate instructions.
4. When execution mode is still **ambiguous** — **stop** here with concise alignment questions for the user.
5. Treat explicit prior confirmations as **binding topology** afterward.

Enter Schritt 2 only once Ausführungsform aligns with Hard Gate commitments.

## Schritt 2 - Umsetzung (1–10 Implementierungs-Subagents)

**Initial agent (Orchestrator):** does **not** author product implementation during Schritt 2.
All implementation edits are performed only by **1–10** **`implement-agent`** subagents. The initial agent may still coordinate, integrate at the checkpoint, and resolve trivial merge mechanics when in scope.

1. With Ausführungsform aligned, execute via the documented **execution topology**.

2. **Implementierungs-Subagents — strikt:** each agent implements **only** its assigned slice from
   the plan; **no** scope expansion, **no** silent replanning, **no** product or design decisions beyond what the plan already fixes.
   **Build/Test (slice-scoped):** **via MCP** per [implement-agent](SKILL.md#orchestrator-konfiguration) — `build_dotnet_solution` / `test_dotnet_solution` (dev-dotnet-mcp), `build_angular_project` / `test_angular_project` (dev-angular-mcp) und unit tests **for the assigned slice**. **VERBOTEN:** Shell-Ausführung von `ng build` / `ng test` / `dotnet build` / `dotnet test` ohne BLOCKER-Nachweis. **Not** stack-wide Technik-Gate (that is **Schritt 3** after integration).

3. **Agent-Typ (Implementierung):** **`implement-agent`** — Modell gemäß `subagent-model-before-task.md`.

4. **Mandatory:** Record the execution topology explicitly: state the **count** (1–10) of
implementation subagents, boundaries taken **from the plan**, and whether execution is **sequential** or **parallel**.

5. Each **implementation subagent** brief must include:

  - Exact scope (what to touch, what to leave alone).
  - **Deliverables** and how they map to plan steps.
  - Explicit **non-goals**: no product or design decisions not already in the plan.
  - **When the plan provides Umsetzungs-Topologie:** **Slice-ID**, **wave**, topology context.
  - **Pflicht:** `subagent-delegation-boilerplate.md` in **jeden** Task-Prompt.
  - **Pflicht:** Passenden Abschnitt aus [references/subagent-prompts.md](references/subagent-prompts.md) inkl. **build-log-filter-Pflicht** — build-log-filter-Checkliste kanonisch in `.cursor/rules/build-log-filter.mdc`.
  - **Rückgabe prüfen:** Ohne Verifikations-Matrix (bei Build/Test) → Subagent **ablehnen**, neu delegieren.

6. **Plan deviations:** No deliberate deviation from the final plan without **user approval**.

7. The initial agent remains orchestrator: subagent output is **not** done until the **integration checkpoint** and **Schritt 3** pass.

### Build/Test — MCP-Pflicht (kurz — gilt überall)

**Angular und .NET Build/Test ausschließlich via MCP** — Shell-Kommandos sind verboten:

| Stack | VERBOTEN | Richtig |
|-------|----------|---------|
| Angular Build | Shell `ng build` | `build_angular_project` (dev-angular-mcp) |
| Angular Test | Shell `ng test` | `test_angular_project` (dev-angular-mcp) |
| .NET Build | Shell `dotnet build` | `build_dotnet_solution` (dev-dotnet-mcp) |
| .NET Test | Shell `dotnet test` | `test_dotnet_solution` (dev-dotnet-mcp) |

**Pro MCP-Lauf:** Tool aufrufen → `errors[]` / `warnings[]` / `summary` lesen → Kurzprosa (**kein** Roh-Log ans LLM, **kein** build-log-filter für diese Kommandos).

**Hard Stop — MCP nicht erreichbar:** `BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar` — **kein** stiller Shell-Fallback; Technik-Gate-/Review-Subagents **nicht** starten; erst nach expliziter Nutzerfreigabe Shell + build-log-filter als Fallback ([`{verification-commands}`]({verification-commands})).

**Fallback (Shell nach BLOCKER-Freigabe):** Kanon [`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc) — Ausführungs-Checkliste Schritte 1–8 + Interpretationspflicht.

**Implementation subagents (Schritt 2):** **must not** perform **stack-wide Technik-Gate** during Schritt 2 — that is **Schritt 3** after the integration checkpoint.

**Host opt-outs:** **B** (tests only), **C** (build only), **D** (no automated verification) apply **only** with explicit user text in the thread.

### BoyScout pro Slice (Orchestrator, vor Integration-Checkpoint)

**When:** Nach Rückkehr **jedes** `implement-agent`-Slices (Schritt 2), sofern der Thread/Plan kein Opt-out (`kein boyscout`, `skip boyscout`) enthält.

**Pflicht-MCP:** `suggest_boyscout_actions(filePaths: [alle vom Slice geänderten Dateien], type)` — Top-Findings kompakt im Slice-Report.

### Integration checkpoint (Orchestrator)

**When:** After all **implementation** subagent work for this pass is back. **Before** starting **Schritt 3**.

**Do at minimum:**

- Collect subagent outputs (summaries, touched paths, diffs / artifacts).
- Classify **which stacks** changed to size **Technik-Gate** runs in Schritt 3.
- Check for **interface / contract drift** between slices.
- Assess merge/conflict risk.

Only after this checkpoint is the work **ready for** Schritt 3.

**Orchestrator edits after Technik-Gate (verbindlich):** If the **initial agent** changes repo files **after** a Technik-Gate run, treat prior Technik-Gate as **stale**. **Must** re-run **Technik-Gate** for affected stacks in the **next** Review-Iteration.

## Schritt 3 — Iterativer Implement-Review-Loop

Nach dem Integration-Checkpoint läuft ein **iterativer Review-Fix-Loop** mit **höchstens 3 Iterationen**. Der **initial agent** orchestriert; **keine** Rollensimulation statt Subagents.

**Iterationslimit (verbindlich):** Pro Iteration: **Technik-Gate → 6× Review → Digest → Fix-Planer → Fix-Slices**. **Maximal 3** volle Iterationen.

**Früher Abbruch:** Wenn eine abgeschlossene Iteration **keine behebbaren Findings** mehr liefert **und** Technik-Gate **OK** ist, endet der Loop **sofort**.

**Nach Iteration 3 mit offenen Findings:** Rest-Findings-Bericht; kein weiterer Fix-Zyklus.

**Review-Rollen (6, je Iteration parallel bevorzugt):**
- `implement-review-pessimist-agent`
- `implement-review-lehrer-agent`
- `implement-review-normalo-agent`
- `implement-review-oberlehrer-agent`
- `implement-review-professor-agent`
- `implement-review-optimist-agent`

### Jede Iteration

**3.1 Technik-Gate pro Stack**

Scope by actual diffs: **one Technik-Gate run per changed stack**. Commands from `{verification-commands}` and repo docs—**do not** guess.

**build-log-filter Pflicht auf jedem Lauf** — siehe [⚠️ build-log-filter Anti-Shortcut-Regel](#️-build-log-filter-anti-shortcut-regel-höchste-priorität-ohne-ausnahme).

**Task-Prompt:** Vorlage **Technik-Gate pro Stack** in [references/subagent-prompts.md](references/subagent-prompts.md). Phases: Build-fix loop (max. **8** turns), then unit-test-fix loop (max. **8** turns, only if build OK). Narrow gate fixes allowed; escalate after turn exhaustion.

**3.2 Sechs Implement-Reviews (parallel, readonly)**

Spawn **six** dedicated subagents—one per role above. **Forbidden:** simulating roles in the orchestrator thread.

Each reviewer receives: final plan + ACs, current diff / touched paths, Technik-Gate status per stack. **Task-Prompts:** respective sections in [references/subagent-prompts.md](references/subagent-prompts.md). **MCP mandatory** per agent profile.

**3.3 Review-Digest**

Merge all six reports into **Review-Digest (Iteration N)**.

**3.4 Findings klassifizieren**

- **Eindeutig fixbar** — correctness gaps, missing tests, rule violations.
- **Klärungsbedürftig** — product/design ambiguity, conflicting AC interpretation.

**3.5 Gebündelte Nutzer-Rückfragen (wenn nötig)**

If any **klärungsbedürftig** findings exist, ask **one bundled question**. **Wait** for answers before Fix-Planer / Fix-Slices.

**3.6 Fix-Planer**

Exactly **one** `implement-fix-planner-agent` run per iteration. **Forbidden:** orchestrator-authored fix plans; Fix-Slices without Fix-Planer output.

**3.7 Fix-Slices umsetzen**

Spawn **`implement-agent`** per Fix-Slice. **build-log-filter Pflicht auf jedem Build/Test-Lauf.**

**3.8 Iterations-Zusammenfassung**

Report briefly: Iteration number, finding count per reviewer, what was fixed, Technik-Gate OK/FAIL per stack, whether next iteration starts or loop ends.

**3.9 Abbruchbedingung**

Der Loop endet in **einem** dieser Fälle:

1. **Sauber:** Eine abgeschlossene Iteration liefert **keine behebbaren Findings** und Technik-Gate ist **OK** (außer User-Opt-out B/C/D).
2. **Maximum erreicht:** Nach **Iteration 3** — unabhängig davon, ob noch Findings offen sind.

**3.10 Rest-Findings nach Maximum** — Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md).

### Schritt-3-Closure (Orchestrator)

1. **Plan alignment**: every plan step and AC **checked** or explained.
2. **Loop evidence**: iterations count; Technik-Gate matrix per stack/iteration; six reviews per iteration; Fix-Planer mit Evidenz-Basis; Fix-Slices; Rest-Findings-Bericht wenn nötig.
3. **build-log-filter-Compliance:** Technik-Gate **green** only with completed runs + build-log-filter per applicable command; otherwise **`BLOCKIERT (build-log-filter)`** or FAIL — **no** false closure.
4. **Closure format**: Vorlage **Abschlussformat** in [references/subagent-prompts.md](references/subagent-prompts.md).
5. Optional **Clean-Code review** — **only** after user confirmation.

## Operationale Regeln

- **Implementation (Schritt 2):** **1–10** **`implement-agent`** subagents; slice-scoped build/test; **build-log-filter** auf **jedem** in-scope Lauf.
- **Review-Loop (Schritt 3):** max. **3** Iterationen; **Technik-Gate** pro Stack/Iteration mit build-log-filter; **6× implement-review-***; **implement-fix-planner-agent** mit MCP A–H + build-log-filter + Evidenz-Basis; **implement-agent** Fix-Slices only.
- **build-log-filter überspringen ist verboten** — auch wenn Exit 0, auch wenn Passed-Zeilen sichtbar, auch wenn Scope klein.
- **Do not** run **stack-wide Technik-Gate** during Schritt 2.
- **Orchestrator** fixt keine Review-Findings ohne Fix-Planer + implement-agent.
- **Technik-Gate** may apply **narrow fixes** only.
- **No unnecessary refactors** or scope expansion.
- **Ask** when requirements, risks, or verification expectations are unclear.

## Orchestrator-Konfiguration

Konfiguration des **implement-agent** — Implementierungs-Subagent für Schritt 2 (genau einen Plan-Slice).

### Rolle

**Implementierungs-Subagent** im Implementation Workflow **Schritt 2**. Setzt **genau einen** Plan-Slice um — Code **und** lokale Qualitätssicherung **innerhalb des Slice-Scopes**.

**Kein** stack-weites Technik-Gate — das ist **Schritt 3** (Orchestrator).

### Pflicht: Rules prüfen und anwenden (erster Schritt, ohne Ausnahme)

> **Bevor du deinen Slice startest — lade in dieser Reihenfolge:**
>
> 0. **agent-compliance.md** — immer; Orchestrator-/Subagent-Pflicht, Delegations-Boilerplate.
> 1. **implementation-workflow-skill.mdc** — immer; Subagent-Pflicht, build-log-filter-Kette, Verifikations-Matrix.
> 2. **build-log-filter.mdc** — immer; Ausführungs-Checkliste 1–8 für **jeden** Build-/Test-Lauf.
> 3. **codebase-analyzer.mdc** — immer; MCP-First für Analyse.
> 4. **angular-skills.mdc** — wenn FE-Slice im Scope.
> 5. **backend-ef-migrations-skill.mdc** — wenn EF/Migrations im Slice-Scope.
>
> Kein Überspringen. Erst danach: Slice-Implementierung starten.

### Modell

| Feld       | Wert                                          |
| ---------- | --------------------------------------------- |
| **Primär** | `auto` (AUTO — vom Host / Task-Modellauswahl) |

Ist `auto` **nicht** wählbar → **stoppen**, transparent melden.

### codebase-analyzer (Bevorzugt)

| Aufgabe                        | MCP-Call                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Symbole / Einstiegspunkte      | `index_project` → `find_in_index`                                                       |
| Komplexität prüfen             | `analyze_complexity`                                                                    |
| Refactoring-Sicherheit         | `analyze_refactoring_safety`                                                            |
| Build-/Test-Fehler analysieren | **build-log-filter** `analyze_build_output` (nach `filter_*`) — nicht codebase-analyzer |

### Mantra

**Clean Code · SOLID · YAGNI · minimaler Diff** — nur was der Plan für **deinen Slice** vorsieht.

### Erlaubt — nur im Slice-Scope

- **Build (MCP):** `build_dotnet_solution` (dev-dotnet-mcp), `build_angular_project` (dev-angular-mcp)
- **Test (MCP):** `test_dotnet_solution` (dev-dotnet-mcp), `test_angular_project` (dev-angular-mcp) — **slice-relevant**
- **Unit-Tests anlegen und ausführen**, die **deinen Slice** absichern
- Minimale Fixes, damit **deine** Build-/Test-Läufe für den Slice grün werden

**VERBOTEN:** Shell-Ausführung von `ng build` / `ng test` / `dotnet build` / `dotnet test` ohne BLOCKER-Nachweis.

### MCP-Build/Test-Pflicht (verbindlich)

MCP aufrufen → `errors[]` / `warnings[]` / `summary` auswerten — kein Raw-Log, kein build-log-filter für diese Kommandos wenn MCP verfügbar.

**MCP nicht erreichbar:** **`BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar`** — stoppen; kein Shell-Fallback ohne Nutzerfreigabe. Fallback mit Nutzerfreigabe: [`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc) Schritte 1–8.

### Parallelität

Eigene `session_id` bei `filter_output_stream` — nicht mit anderen implement-agent-Läufen oder dem Orchestrator teilen.

### Verboten

- Scope über den Slice hinaus, stille Planänderung, unrequested Refactors
- Stack-weites Technik-Gate in Schritt 2
- Diagnose aus Roh-Konsole ohne abgeschlossene build-log-filter-Kette
- `terminals/*.txt` als Capture-Ersatz
- **Build/Test-Ergebnis ohne MCP als verifiziert melden**

### Rückgabe an Orchestrator

```
- Summary: …
- Touched paths: …
- Build/Test (Slice): Kommandos, OK/FAIL, Verifikations-Matrix-Zeilen pro Lauf
- Open risks / blockers: …
- build-log-filter-Lücken (falls): was am Filter unklar blieb → Nutzer-Hinweis
```

Auf Deutsch, kompakt.

---

## Pflegehinweis

After changing this skill, verify host-facing guidance still matches—especially **Cursor**: `.cursor/rules/implementation-workflow-skill.mdc`.

**build-log-filter Anti-Shortcut-Regel:** Änderungen zuerst in `.cursor/rules/build-log-filter.mdc`, anschließend den Abschnitt **Build/Test + build-log-filter (kurz)**, den Abschnitt **⚠️ build-log-filter Anti-Shortcut-Regel**, und die Prompt-Vorlagen in [references/subagent-prompts.md](references/subagent-prompts.md) abgleichen.

**Trigger doppelt pflegen:** Rule + YAML-`description` + `{agent-index}`.

**`disable-model-invocation`:** `true` beibehalten.

**Prompt-Vorlagen:** Änderungen an Subagent-Auftrags-Payloads **nur** in [references/subagent-prompts.md](references/subagent-prompts.md).

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.

## Prompt-Vorlagen

Kopierbare Auftrags-Payloads — **nicht** Ersatz für Agent-Profile unter `../../agents/`:

| Abschnitt                                      | Datei                             | Wann                                               |
| ---------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Implementierer (compact)                       | references/subagent-prompts.md    | Slice ohne Build/Test                              |
| Implementierer (Build/Test + build-log-filter) | references/subagent-prompts.md    | **Standard** Schritt 2 mit slice-scoped Build/Test |
| Technik-Gate pro Stack                         | references/subagent-prompts.md    | Pro Review-Iteration                               |
| Implement-Review (×6)                          | references/subagent-prompts.md    | Pro Review-Iteration                               |
| Fix-Planer (nach Review)                       | references/subagent-prompts.md    | Nach Review-Digest                                 |
| Rest-Findings nach Maximum                     | references/subagent-prompts.md    | Nach Iteration 3 mit offenen Findings              |
| Abschlussformat (Orchestrator)                 | references/subagent-prompts.md    | Nach Review-Loop                                   |