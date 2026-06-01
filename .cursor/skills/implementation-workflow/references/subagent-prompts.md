## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{verification-commands}` | Datei mit den Verifikationsbefehlen für Agents (z. B. `.github/copilot-instructions.md`) |

# Subagent-Prompts — Implementation Workflow

Vorlagen zum Kopieren. Platzhalter in eckigen Klammern ersetzen.

**Agent-Typ (Pflicht):** Je Rolle der passende Subagent — Profil unter [../../agents/](../../agents/). **Modell:** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — Ziel-Profil, **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** in Prompts duplizieren.

**Workflow:** [SKILL.md](../SKILL.md) · **genericRTK-Regel:** [genericrtk-output-filter.mdc](../../rules/genericrtk-output-filter.mdc)

Die Vorlagen unten sind **Auftrags-Payloads** (Platzhalter), nicht Ersatz für die Agent-Profile.

**Orchestrator-Empfehlung (Schritt 2):** Für Task-Prompts mit Build/Test den Abschnitt **Implementierer (Slice — Build/Test + genericRTK)** bevorzugen; **Implementierer (Slice — compact)** nur bei trivialen Slices ohne Build/Test.

---

## Implementierer (Slice — compact)

Für Slices **ohne** slice-scoped Build/Test oder als Kurzform mit Verweis auf [implement-agent.md](../../agents/implement-agent.md).

```markdown
You are a subagent for a fixed-scope implementation task.

Context:
- Final plan summary: [1–3 bullets]
- Your slice only: [boundaries, files/areas if known]

Required when the plan section **Umsetzungs-Topologie** is present:
- **Slice-ID:** [e.g. IMP-FE-Search-Rules] — naming schema: [planning-workflow/SKILL.md](../../planning-workflow/SKILL.md) **Slice-ID-Konvention (IMP-*)**; take IDs from the plan, do not invent coarse `IMP-FE`/`IMP-BE` without Bereich/ServiceKürzel
- **Wave:** [e.g. W1 — parallel with IMP-BE-GW-Logging]

Optional (include when applicable):
- Execution topology for this slice: [sequential | parallel]
- Runs in parallel with / blocked by: [slice ids or none]
- Shared contracts/artifacts: [read-only for you | you own | do not touch — list]
- Integration handoff: [what must be true before merge / handoff]

Rules:
- **Agent:** `implement-agent` — [implement-agent.md](../../agents/implement-agent.md).
- **Build/Test:** **Allowed slice-scoped** — `dotnet build`, `dotnet test`, `ng build`, `npm run build`, `ng test`, `npm test`; unit tests for this slice. **genericRTK** on every run; diagnose only from MCP; if MCP output unclear → **inform user** to sharpen genericRTK.
- **Not allowed:** stack-wide Abschlussprüfung (verify-agent after integration).
- **Plan adherence:** Implement only this slice—no silent plan drift, scope expansion, or new product/design decisions beyond the plan.
- Match existing project style and host rules.

Deliverables:
- [Expected outputs, files, or behaviors]

Out of scope:
- [Explicit list]

Reply with: summary of changes, list of touched paths, open risks, and any
blockers that require the initial agent or user.
```

---

## Implementierer (Slice — Build/Test + genericRTK)

**Standard-Vorlage** für Schritt-2-Task-Prompts mit slice-scoped Build/Test.

Host policy and commands: **[`{verification-commands}`]({verification-commands})** and final plan. **Agent:** `implement-agent` — [implement-agent.md](../../agents/implement-agent.md). **Pflicht:** Pro Build-/Test-Lauf die **Ausführungs-Checkliste** (Schritte **1–8**) und **[Interpretationspflicht](../../rules/genericrtk-output-filter.mdc#interpretationspflicht-verbindlich)** in [`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc). **In-scope:** **must** run genericRTK on **every** run including exit 0 with **full** capture as `raw`/`text` (**no** summary-as-`raw`, **no** terminal-file substitute); diagnose **only** after **internally reading** MCP response. **MCP unreachable:** **Hard Stop** — `BLOCKER: genericRTK nicht erreichbar`, **stop**, no manual continue. **Out of scope:** **Außerhalb des Scopes** only. Use absolute working directory paths.

```text
You are an implementation subagent for ONE plan slice (IMP-*) only.

Slice-ID: [e.g. IMP-FE-Search-Rules]
Wave / topology: [e.g. W1 parallel with IMP-BE-GW-Logging | sequential after IMP-BE-GW-Contract]
Working directory for slice build/test commands: [absolute path]

Context:
- Final plan summary: [1–3 bullets]
- Your slice only: [boundaries, files/areas — what to touch, what to leave alone]
- Shared contracts: [read-only for you | you own | do not touch — list]
- Integration handoff: [what must be true before merge / handoff]

Hard rules:
- **Agent:** `implement-agent` — [implement-agent.md](../../agents/implement-agent.md). **Slice scope only** — not stack-wide Abschlussprüfung (verify-agent after integration).
- **Plan adherence:** No silent plan drift, scope expansion, or new product/design decisions beyond the plan.
- **Build/Test (slice-scoped only):** `dotnet build`, `dotnet test`, `ng build`, `npm run build`, `ng test`, `npm test` — prefer `--include` or targeted paths for this slice; unit tests that cover your slice.
- **Every** build/test run: genericRTK checklist per [genericrtk-output-filter.mdc](../../rules/genericrtk-output-filter.mdc); diagnose **only** from internally read MCP; if compressed output insufficient → **inform user** to sharpen genericRTK (do not use raw logs).
- If **`filter_output_stream`**: use a **unique** `session_id` per logical shell/stream **for this agent**; **never** share `session_id` with the orchestrator or **other** implementation subagents running in parallel; end with **`is_final: true`** when capture ends (including abort) — details: `.cursor/rules/genericrtk-output-filter.mdc` (heading **session_id (filter_output_stream)**).
- **Forbidden:** stack-wide release verification; diagnosis from raw console/Tool-UI/`terminals/*.txt` without completed MCP chain; MCP body in reports to orchestrator.

After each build or test run (slice-scoped):
1. Run the command for this slice (from copilot-instructions + plan — do not guess stack-wide commands unless the slice requires them).
2. Capture exit code and **full** stdout/stderr **of this run**. If command is **in scope**: **must** read tool schemas and run `filter_output` / `filter_output_stream` with **full** capture as `raw`/`chunk` (**forbidden:** summary-as-`raw`, terminal-file content); on **every** run including exit 0; if exit ≠ 0 add `analyze_build_output`. Before each MCP call: **`Rufe genericRTK …`** in reply to orchestrator. **Internally read** MCP response before any diagnosis. **Do not** paste MCP return text; **kurze Diagnose** in own words from internal MCP only. If MCP **unreachable**: **STOP** — `BLOCKER: genericRTK nicht erreichbar` (no fix loop continue). If **out of scope**: state **Außerhalb des Scopes**, concise summary, no raw dump.
3. If exit code ≠ 0: diagnose **only** from **internally read** MCP result when applicable, apply minimal fixes within slice scope, repeat from step 1 as needed for slice green.

Deliverables:
- [Expected outputs, files, or behaviors from plan]

Out of scope:
- [Explicit list]
- Stack-wide Abschlussprüfung (verify-agent)

Reply with:
- Summary of changes
- Touched paths
- Build/Test (slice): commands, OK/FAIL, **[Verifikations-Matrix](../../rules/genericrtk-output-filter.mdc#verifikations-matrix)** — one row per shell run (command, CWD, exit, `filter_output` ja/nein, `analyze_build_output` if FAIL)
- Open risks / blockers for initial agent or user
- genericRTK gaps (if any): what remained unclear → user hint
```

---

## Verifikation pro Stack

Host policy and command list: **[`{verification-commands}`]({verification-commands})** (*Agents — mandatory verification after changes*). **Agent:** `verify-agent` — [verify-agent.md](../../agents/verify-agent.md). **Pflicht:** Pro Build-/Test-Lauf die **Ausführungs-Checkliste** (Schritte **1–8**) und **[Interpretationspflicht](../../rules/genericrtk-output-filter.mdc#interpretationspflicht-verbindlich)** in [`.cursor/rules/genericrtk-output-filter.mdc`](../../rules/genericrtk-output-filter.mdc). **In-scope:** **must** run genericRTK on **every** run including exit 0 with **full** capture as `raw`/`text` (**no** summary-as-`raw`, **no** terminal-file substitute); diagnose **only** after **internally reading** MCP response. **MCP unreachable:** **Hard Stop** — `BLOCKER: genericRTK nicht erreichbar`, **stop**, no manual continue. **Out of scope:** **Außerhalb des Scopes** only. Use absolute working directory paths.

```text
You are a verification subagent — **Abschlussprüfer / Gesamt-Tester** for ONE stack only (Frontend OR Backend OR Backend/{Sub-Einheit}).

Stack / unit: [Frontend | Backend | Backend/{Sub-Einheit}]
Working directory for all shell commands: [absolute path]

Hard rules:
- **Agent:** `verify-agent` — [verify-agent.md](../../agents/verify-agent.md). **Stack-wide** final verification—not slice-only.
- **Every** build/test run: genericRTK checklist; diagnose **only** from internally read MCP; if compressed output insufficient → **inform user** to sharpen genericRTK (do not use raw logs).
- If **`filter_output_stream`**: use a **unique** `session_id` per logical shell/stream **for this agent**; **never** share `session_id` with the orchestrator or **other** verification subagents running in parallel; end with **`is_final: true`** when capture ends (including abort) — details: `.cursor/rules/genericrtk-output-filter.mdc` (heading **session_id (filter_output_stream)**).
- Fix only what is needed for green build / green unit tests; **no** new features or scope expansion.
- **Max 8 turns** in Phase 1; **max 8 turns** in Phase 2 (a “turn” = analyze → edit if needed → re-run the same command).

Phase 1 — Build-fix loop (max 8 turns):
1. Run the **check / release-style build** command for this stack (from copilot-instructions + repo docs — do not guess).
2. Capture exit code and **full** stdout/stderr **of this run**. If command is **in scope**: **must** read tool schemas and run `filter_output` / `filter_output_stream` with **full** capture as `raw`/`chunk` (**forbidden:** summary-as-`raw`, terminal-file content); on **every** run including exit 0; if exit ≠ 0 add `analyze_build_output`. Before each MCP call: **`Rufe genericRTK …`** in reply to orchestrator. **Internally read** MCP response before any diagnosis. **Do not** paste MCP return text; **kurze Diagnose** in own words from internal MCP only. If MCP **unreachable**: **STOP** — `BLOCKER: genericRTK nicht erreichbar` (no fix loop continue). If **out of scope**: state **Außerhalb des Scopes**, concise summary, no raw dump.
3. If exit code ≠ 0: diagnose **only** from **internally read** MCP result when applicable (**kurze Prosa**, no raw/full log paste), apply minimal fixes, repeat from step 1.
4. After 8 turns without success: STOP and escalate with the same reporting style (no unfiltered raw log).

Phase 2 — Unit-test-fix loop (max 8 turns, ONLY if Phase 1 ended OK):
5. Run the **unit test** command for this stack.
6. Same **genericRTK / Hard Stop / Außerhalb des Scopes** handling after **each** run as in Phase 1 (steps 2–4 pattern).
7. If exit code ≠ 0: diagnose, apply minimal fixes, repeat from step 5.
8. After 8 turns without success: STOP and escalate.

Deliver:
- Phase 1: OK/FAIL, turns used, final build command; in-scope: MCP tools used every run (**no** MCP text); **kurze Diagnose**; out-of-scope: **Außerhalb des Scopes**; MCP down: **`BLOCKIERT (genericRTK)`**
- Phase 2: OK/FAIL or SKIPPED (if user opt-out C/D), turns used, final test command; same reporting
- **[Verifikations-Matrix](../../rules/genericrtk-output-filter.mdc#verifikations-matrix):** one row per shell run (command, CWD, exit, `filter_output` ja/nein, `analyze_build_output` if FAIL)
- List of touched file paths (verification fixes only)
- If FAIL after max turns: concise diagnosis in **eigener Prosa** (intern aus MCP abgeleitet wenn applicable) — **not** a raw full log or MCP echo; **do not** instruct the orchestrator to run `ng build` / `ng test` / `dotnet build` / `dotnet test` themselves — request a **new verification subagent** with your fix summary and remaining risks
```

---

## Abschlussformat (Orchestrator)

Nach Schritt 3 — initial agent closure report.

```markdown
## Summary
- Fulfillment vs. plan: [complete / partial—why]
- Key changes: [high-level]

## Verification
- Host mode: [A build-fix then test-fix per touched stack | B tests only | C build only | D waived—quote user text]
- Stacks verified: [Frontend / Backend — only those that changed; Backend per build unit if split]
- Orchestrator integration edits after verification: [none | list—if any, note **re-verification subagent** ran]
- Per stack:
  - Phase 1 (build): command, turns used (max 8), OK/FAIL; in-scope runs: genericRTK tools on **every** run + **kurze Diagnose** (**no** MCP text); **[Verifikations-Matrix](../../rules/genericrtk-output-filter.mdc#verifikations-matrix)** (one row per shell run); out-of-scope: noted; MCP down: **BLOCKIERT (genericRTK)**
  - Phase 2 (unit tests): same reporting + matrix rows for **each** test command; command, turns used (max 8), OK/FAIL or SKIPPED
  - Verification fixes (paths) if any
- Subagents: **`implement-agent`** / **`verify-agent`** — Profile unter `.cursor/agents/`

## Follow-up
- Open points: [if any]

## Clean-Code / Clean-Development review (optional)
- **User:** Should I start a **separate** agent/session to review the **current
  Git changes** (e.g. `git diff` / changed files in the repo root the host
  specifies) against **Clean Code** and **Clean Development** practices?
  - Scope: review only what is already changed in Git—not hypothetical edits.
  - Do **not** proceed until you confirm; do **not** auto-run this review.
```
