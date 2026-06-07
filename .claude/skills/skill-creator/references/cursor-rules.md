# Cursor Rules — Complete Reference

Cursor rules are `.mdc` files in `.cursor/rules/`. They inject context automatically based on
file patterns, recognized phrases, or explicit user request. Subdirectories are allowed;
organization does not affect behavior.

---

## Frontmatter fields

```yaml
---
description: "..."    # Agent-Requested mode: what the rule does + when to load it
globs: "..."          # Auto-Attached mode: comma-separated glob patterns
alwaysApply: true     # Always mode: load in every conversation
---
```

Only one "mode" is active per rule (see below). Combining fields is possible but unusual.

---

## Four activation modes

### 1. Always
```yaml
---
alwaysApply: true
---
```
Loads in **every conversation** regardless of context. Use only for:
- Project-wide tech stack description
- Team-wide naming conventions
- Core security constraints

**Cost:** every token in an always-rule is consumed in every request. Keep always-rules under
~50 lines. One always-rule per project is the typical ceiling.

### 2. Auto-Attached
```yaml
---
globs: "src/**/*.ts, src/**/*.tsx, **/*.spec.ts"
---
```
Loads when files matching the glob pattern are open or referenced in context. The workhorse
mode for language/framework-specific conventions.

**Glob syntax:**
- `src/**/*.tsx` — matches `.tsx` in `src/` and all subdirectories
- `src/*.tsx` — matches `.tsx` in `src/` root only
- `**/*.{ts,tsx}` — matches both extensions anywhere
- `!node_modules/**` — negation (exclude pattern)

### 3. Agent-Requested
```yaml
---
description: "Angular Components and Services. Load when Angular, Component, Signal,
  Directive, Injectable, NgModule appears in the conversation scope."
alwaysApply: false
---
```
No `globs`. No `alwaysApply`. The agent reads `description` and decides whether to load the
rule based on the current task. Most flexible mode; requires a high-quality description.

**Description quality:**
- Keyword-first: most important trigger terms at the start
- Specific: `"EF Core Migrations — load when Add-Migration, DbContext, Update-Database"` not `"database stuff"`
- Include both English and project-language terms if relevant
- Length: 1–3 sentences; every word is a potential trigger

### 4. Manual
```yaml
---
---
```
Empty frontmatter. Loads only when user explicitly types `@rule-name` or the rule is
referenced by another mechanism. Use for heavyweight rules you opt into deliberately.

---

## Rule → agent profile reference pattern

When a rule routes to a specific agent, it should:
1. State the trigger condition
2. Link the agent profile with a relative path
3. Instruct reading the full profile (not summarizing it)
4. Never duplicate behavior that belongs in the agent profile
5. Provide an explicit opt-out phrase

```markdown
## Verbindliche Aktivierung

Erkennbarer Intent → vollständiges Agent-Profil lesen und befolgen:

[`agents/plan-agent.md`](../agents/plan-agent.md)

Phasen-Modell, Ausgabe-Formate und Workflow stehen **nur** im Profil —
diese Rule dupliziert sie nicht.

## Opt-out

`ohne plan-agent` → Profil nicht laden.
```

---

## Best practices

| Do | Don't |
|----|-------|
| Keep always-rules ≤ 50 lines | Put workflow logic in always-rules |
| Put trigger keywords at description start | Write vague descriptions |
| One concern per rule | Mix unrelated conventions |
| Link agent profile for delegation | Duplicate agent behavior in rule |
| Include opt-out phrase | Assume user can't escape the rule |

---

## Anti-patterns

**Bloated always-rule:** A 500-line always-rule that covers every framework convention. Every
token pays per request. Split by file type using Auto-Attached mode.

**Vague Agent-Requested description:** `"Use for code stuff"` — never triggers automatically.
The agent needs concrete keywords to match against the conversation.

**Behavior duplication:** Rule and agent profile both define the same phase model. If the
agent profile changes, the rule becomes stale. Rule = routing; agent = behavior.

**Missing opt-out:** Users cannot disable the rule for off-topic conversations. Always provide
an escape hatch.

---

## File organization

```
.cursor/rules/
├── core.mdc                  # always-rule: project-wide context
├── angular-skill.mdc         # agent-requested: Angular conventions
├── backend-ef-migrations.mdc # agent-requested: EF migrations
├── buddy-agent-skill.mdc     # agent-requested: buddy-agent delegation
└── genericrtk-output-filter.mdc  # auto-attached: build output filter
```

Subdirectories are scanned recursively. Rule identity comes from the filename, not the path.

---

## Relationship to skills

| Rules (.mdc) | Skills (SKILL.md) |
|-------------|-------------------|
| Cursor-only | Cursor + Claude Code |
| Auto-activated | Invoked explicitly or by Claude |
| Context injection | Workflow / process |
| No /command | Creates /skill-name command |
| Cannot be tested via evals | Can be tested via evals |

Use rules for *when* and *whether* to activate a behavior. Use skills for *how* to execute it.
A rule routing to an agent is the pattern for combining both.
