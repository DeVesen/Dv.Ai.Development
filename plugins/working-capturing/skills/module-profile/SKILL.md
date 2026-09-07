---
name: module-profile
description: Use when you've worked out — or the user explained — what one of the project's build artifacts is for, how it's built, what it talks to, or who consumes it, and that isn't recorded in the project's module profiles yet. Covers every kind of artifact — services, shared libraries, executables. Also use when deliberately reviewing such a unit's code to establish its current state.
---

# Module Profile

## Overview

A code unit's *purpose* — why it exists as its own thing, what problem it owns — is rarely in its code. The code shows HOW it works, never WHY it was split out. A profile captures the reasoning next to the structure, so a later session doesn't re-derive it from scratch.

## Granularity — One Module Is One Build Artifact

A module is the unit the build system emits as its own artifact. This is a fixed rule, not a judgment call:

- **C#:** one `.csproj` is one module. Not a folder inside it, not a group of classes, not the solution.
- **Angular:** one project under `angular.json` → `projects` is one module. Not an `NgModule`, not a subfolder of a library.
- **Any other technology:** the same rule — whatever the build emits as its own artifact.

The rule is deliberately technology-open, with C# and Angular named because they're the cases that come up; a new technology gets the general rule, not a new exception.

Anything *smaller* than a build artifact is not a module profile: a folder's worth of classes belongs in `Structure` inside its module's profile, and a user-facing behavior belongs to `feature-profile`.

## Kinds

`Kind` says what sort of artifact this is. These three are the regular values — anchors, not a closed catalogue:

| Kind | What it is | Its contract is |
|---|---|---|
| `service` | A deployable that runs as its own long-lived process | Its endpoints / messages |
| `library` | Shared code compiled into its consumers, never runs alone | Its public API surface |
| `executable` | Runs as its own process, but on demand rather than continuously — CLI, tool, one-shot job | Its invocation surface: arguments, inputs, outputs |

Fits none of them? Name your own value and say in `Identity` what the thing is and why none fit. Never press a unit into `service` just because that's the closest label — a wrong `Kind` is read as a fact by everyone downstream. `Kind` steers which sections carry weight (below); it never settles them on its own.

## Phase Gate — Up to the Spec Only

**As an input to work, these profiles belong to the road up to the specification.** They are consulted while a request is being discussed and while a spec is being written. From the spec onward they are closed: a planner, implementer or reviewer works against the spec, the plan and the task card, and nothing beside them. Needing a profile in order to plan, build or judge means the spec is incomplete — that's a finding to report upward, never a reason to look it up. The gate is the phase you're in, not the role you hold: it binds the main agent just as much.

**Capturing is not consulting.** Recording what was just learned — with the owner present to answer the ask — is this skill's own job and isn't tied to a phase; a capture pass right after an implementation session is exactly what it's for. What the gate forbids is reading a profile *as input* to planning, building or reviewing. The dedup read this skill requires before writing happens inside a capture, so it's allowed there.

**Which side of the gate am I on?** If the answer to "why am I opening this file" is *to decide how to build or judge something*, you're past the gate — stop. If it's *to record or correct what we just established*, you're inside a capture — continue.

## Ask First — No Exceptions

**REQUIRED SUB-SKILL:** read the "Ask First" section of `glossary` and follow its discipline — never create or extend a profile without presenting your finding and getting an answer first. In short: present what you found (with the graphify pointer, if the project has a graph), wait, then write.

Two deliberate differences from that skill, so read them before applying it here:
- **No per-entry confidence tag.** `Maturity` is this skill's equivalent and grades the profile as a whole.
- **Unattended runs hand off instead of dropping.** Where that skill says to leave a finding for the next session, this skill's "Handing Off" section (below) governs: still no write, but the draft goes back to whoever dispatched you.

## Before Writing: Check What Exists

Before drafting, look for a profile for this unit — at the storage root below, under the mechanically derived directory name. Found one? Then the question is whether your finding is new or a correction to it, and the ask says which; don't start a second profile for the same unit. Nothing there? Note that in the ask, so the owner knows this is a first profile rather than an edit.

## When to Use

- You figured out what a build artifact is responsible for, or how it's internally organized, while working in or around it
- The user explained a unit's purpose, its boundaries, or why it's separate/extracted
- You found out who consumes a unit — a project reference, an API call, a pipeline invocation — or that changing it has a wider blast radius than expected
- You're deliberately walking a unit's code to record its current state (see Review Mode)
- An existing profile turned out to be wrong or outdated while you were working

## When NOT to Use

- Nothing new: the profile already says this, unchanged
- The insight is about a *feature* spanning several units → use `feature-profile`
- The insight is a term/naming mapping → use `glossary`
- Generic framework knowledge that isn't specific to this unit

## Storage

One directory per module, holding a `module.md`: `<module-profile-root>/<module-name>/module.md`. All kinds share one root — `Kind` in the profile distinguishes them, so a later session doesn't have to guess which directory to look in. Take `<module-profile-root>` from the project's CLAUDE.md (or equivalent instructions file), which names where module profiles live. Read **the file on disk** — grep it. Neither a claim that the section is missing, nor the copy of CLAUDE.md already sitting in your context, counts as evidence: a context snapshot can predate the section being added, and acting on it lands you in the wrong branch below or writes to a superseded path. Disk wins.

**An empty search result is not proof of absence.** A glob that matched no files, a tool that skips that file type, a wrong path — all return "nothing found" indistinguishably from a genuine absence. Before concluding the section isn't there, confirm your search actually read the file (a scanned-file count of zero is the tell), and retry differently if it didn't. Treating a falsely-empty result as fact sends you into the branch below and produces a question whose answer was on disk all along.

**If no root is actually named:** don't invent one, and don't abort either — fold the location question into the same ask as the finding ("where should module profiles live? I'd suggest X"). One ask, two questions. Directory structure below the root is this skill's call; the root itself is the project's.

**Directory name:** derive it mechanically from the unit's real name as the code/build knows it — lowercase everything, replace each separator character (dot, underscore, space, slash) with one hyphen, and leave internal CamelCase joined rather than splitting it. So `LAC.ReportService` → `lac-reportservice`, `LAC.Authorization` → `lac-authorization`. Mechanical means predictable: a later session must be able to find the directory from the unit's name without guessing. Don't re-split or prettify the name; if the owner prefers a different form, they'll say so in the ask.

**Language:** follow the project's documentation-language convention (its CLAUDE.md or equivalent will say; if it doesn't, ask as part of the same ask). Section headings and field names stay as in the template below regardless of prose language, so profiles stay machine-comparable.

**Reference files:** when one section of a profile grows past ~40 lines, move it into its own file in the same module directory (e.g. `public-api.md`, `data-model.md`, `endpoints.md`) and link it from `module.md` with a one-line summary of what's inside. `module.md` stays the entry point — a reader must never have to open a reference file to get oriented.

## Profile Structure

`module.md` holds these sections, in this order. Omit a section entirely rather than filling it with speculation.

**The header is an ID card.** `Kind`, `Artifact` and `Identity` together must let a reader say what this thing *is* without reading further — `Artifact` is the mechanical half (which manifest, what the build emits), `Identity` the human half (what it is here, how you'd recognize it). A header that only carries a label hasn't done its job.

```markdown
# <Module Name>

**Kind:** service | library | executable | <own value, when none fits>
**Artifact:** <which manifest, and what the build emits from it — e.g. `src/backend/LAC.ReportService/LAC.ReportService.csproj` → container image; `lac-web` in `angular.json` → browser bundle>
**Purpose:** <what problem this unit owns, in 1-3 sentences — the WHY, not a class list>
**Identity:** <one sentence: what this thing is in this project, and how you'd recognize it>
**Maturity:** sketch | reviewed
**Last updated:** YYYY-MM-DD  <!-- when this file was last written, regardless of maturity -->
**Graphify node:** `exact_node_id` (optional — see Graphify Pointer)

## Responsibilities
- <what it is accountable for>
- <explicit non-responsibilities, when a boundary is easy to get wrong>

## Consumed By         <!-- every kind; on a library put it first — it's the load-bearing section -->
- `<consumer>` — <what it uses from here> [direct | build-only | transitive via `<x>`] (<mechanism: project reference | REST call | message | process invocation>)

## Public Surface      <!-- every kind; what the contract IS depends on the kind -->
<what consumers depend on — the contract. Paths, not inlined code. Note anything public but unused.>

## Talks To            <!-- every kind -->
- `<other unit / external system>` — <what flows, which direction>

## Structure
<how it's organized internally — layers, key components, the pattern it follows. Point at paths; don't inline code.>

## Notes
<constraints, deliberate trade-offs, known rough edges. Rationale belongs here.>
```

**Which sections apply.** Relevance follows the *contract* named by `Kind`/`Artifact`/`Identity`, not the label on its own.

*Consumed By* applies to **every** kind. Whatever the build emits, something depends on it: a `.csproj` is referenced by other `.csproj` files, a service is called over its API, an executable is invoked by a pipeline or another process. On a `library` it comes first — it **is** the blast radius, and it's the reason the profile exists. Never skip it because it feels obvious: a unit whose consumers aren't listed can't be changed safely from a plan.

*Public Surface* is whatever a consumer builds against, which differs by kind — the exported API of a `library`, the endpoint/message surface of a `service`, the invocation surface (arguments, inputs, outputs) of an `executable`. Write the one the unit actually has.

Everything else applies to every kind.

**Libraries do have a *Talks To*.** A non-leaf library depends on other units at compile time (a DTO library referencing a models library, say), and a change over there breaks it just as hard as a change here breaks its consumers. That outbound direction belongs in *Talks To*, same as for a service — don't drop it because "libraries only get consumed".

**What counts as a consumer.** Record every unit that would notice a breaking change here, and label how it depends:
- `direct` — its source actually references this unit's symbols. Always listed.
- `build-only` — declares a dependency but its source never uses it. List it, labeled: it's usually either a leftover reference or an intentional re-export, and both matter to a planner.
- `transitive via X` — reaches this unit only through another consumer. List it, labeled, and name the hop: a breaking change still reaches it, but the fix may belong in the middle.
- Test projects count as consumers; label them so they can be told apart from production ones.

Name the **mechanism** next to the label, because the repair differs: a `project reference` is fixed by recompiling against a new signature, a `REST call` by versioning a contract, a `process invocation` by keeping arguments compatible. A consumer list without mechanisms tells a planner that something breaks, but not what to do about it.

Determine this by a **real reference search** across the codebase — both dependency manifests and source-level usage, since the two disagree more often than you'd expect. A briefing, a memory, or a graph edge is a hint to check, never the list itself.

**Unsure which kind it is?** Check what the build emits and how the thing gets started, in that order:
- a container/deployment manifest, or a long-lived host/startup file, or a web/app SDK attribute → `service`
- an executable output with a command-line entry point and no host → `executable`
- neither, plus a plain library output → `library`

Run that check rather than deferring to how the task was worded; it usually decides. If it genuinely doesn't, don't force it: write what you *observed* into `Identity`, propose the closest `Kind`, and let the ask settle it. An honest `Identity` ("runs on demand from the release pipeline, also referenced by two test projects") is worth more than a confident `Kind` that's wrong.

**Maturity** is `sketch` until someone has actually walked the unit's code end to end (Review Mode below); only then does it become `reviewed`.

`reviewed` is earned by the *walk*, not by how much you happen to know. Reading a lot in passing — even every filename, even the whole controller surface — is still `sketch`: an opportunistic capture doesn't graduate by accumulating detail. Ask yourself only: did someone deliberately go through this unit to establish its current state, end to end? If no, it's `sketch`, however confident you feel.

## Review Mode (deliberate current-state pass)

When the goal is to establish a unit's current state rather than log one finding:

1. Read its structure via signature-level reads (entry points, controllers/handlers, services, its project/manifest file) — not full-file reads. The unit's public/exported surface is the part that matters most, and the consumer list needs a reference search across the codebase for every kind, not just a read of the unit itself.
2. Draft the whole profile, including what you could *not* determine.
3. Present the complete draft in ONE ask — not one question per section. Say explicitly which parts are inference and which you read directly, and carry the inferred ones into Notes when you write, so the distinction survives past the conversation.
4. Write only what the answer confirms or corrects. Set `Maturity: reviewed` only if the walk actually covered the unit; otherwise leave `sketch` and note the gap. An unverified consumer list keeps any kind at `sketch` — an incomplete blast radius that looks complete is exactly what a plan will trust and get wrong.

**Can't receive an answer?** Then steps 3-4 don't apply as written — go to "Handing Off" below after step 2. Review Mode never authorizes writing without an answer.

**Where the `sketch`/`reviewed` line sits.** Judge it by the *coverage the walk achieved*, not by why the walk started: an opportunistic beginning that turned into genuine end-to-end coverage can earn `reviewed`. Covered means you saw every part that carries behavior — for a small unit that may be every file; for a large one, every area at signature level with nothing left unexamined that a reader would expect to be there. If you're weighing the two, say what you covered in the ask and let the answer settle it rather than deciding alone.

## Graphify Pointer (optional)

If the project has a graphify graph, the same rules as in `glossary`'s "Graphify Pointer" section apply: query only — never build one as a side effect — store exact node IDs rather than label queries, and treat any stored ID as a refreshable cache over the path, not as truth.

A whole module matches hundreds of nodes, so pick the one that *represents the unit itself*: its project/manifest node (the `.csproj`/`package.json`/equivalent) if one exists, else its top-level namespace/module node. Never a node for some class inside it. A manifest often yields several nodes (the project plus its SDK, target framework, individual dependencies) — take the one standing for the project itself, never one of its attributes or packages. Can't identify a module-level node cleanly? Omit the field — a wrong pointer is worse than none.

Graphify is orientation only, never authority — so never build a library's `Consumed By` list from graph edges alone. Use a real reference search for that; the graph may suggest consumers, but the list is a correctness claim.

## Handing Off (subagent / can't receive an answer)

If you're running where the owner's answer can't reach you (dispatched subagent, unattended run), the capture cannot complete here — you must not write it. Do the read-only work, then hand the finished draft plus the open questions back to whoever dispatched you, stated as a draft awaiting approval, so they can run the ask. Never present it as recorded, and never leave the finding entirely unmentioned.

Fields the ask was supposed to settle stay open in a handoff draft: propose a `Maturity` with your reasoning (say what the walk covered) rather than asserting one, leave `Last updated` for whoever writes the file, and if `Kind` was genuinely undecidable, hand back the candidate readings plus what you observed for `Identity`, rather than picking a section set.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Writing or extending a profile without asking first | Present the finding, wait for the answer, then write |
| Profile that just lists classes | The WHY is the point; structure is context for it |
| Profiling a folder or a group of classes as a module | One module = one build artifact (`.csproj`, `angular.json` project) |
| Omitting `Consumed By` on a service or executable | Every kind has consumers; only the mechanism differs |
| Listing consumers without saying how they depend | Name the mechanism: project reference, REST call, invocation |
| Pressing an odd unit into `service` because no label fits | Name your own `Kind` and explain it in `Identity` |
| A header that labels but doesn't identify | `Kind` + `Artifact` + `Identity` must say what the thing is |
| Dropping a library's `Talks To` | Non-leaf libraries do depend outward, and that breaks too |
| Omitting `Consumed By` because it seems obvious | That list is the blast radius — it's the whole point |
| Listing only direct consumers | Build-only and transitive ones break too; label each |
| Building `Consumed By` from graphify edges or a briefing | Use a real reference search; those are hints only |
| Deferring to how the task worded `Kind` | Run the build-artifact check; if it still won't decide, say what you saw in `Identity` |
| `Maturity: reviewed` after an opportunistic finding | Only a real end-to-end walk earns `reviewed` |
| Speculating to fill an empty section | Omit the section, or name the gap explicitly |
| Inventing a storage root because CLAUDE.md seems to lack one | Grep to confirm, then fold the location question into the ask |
| Writing as a subagent that can't receive the answer | Hand the draft back as awaiting approval; don't write |
| Cramming everything into `module.md` | Move overgrown sections to a linked reference file |
| Recording a cross-module feature here | That's `feature-profile`'s job |
| Opening a profile to decide how to build or judge something | Past the gate — work from spec/plan/card; report the gap instead |
