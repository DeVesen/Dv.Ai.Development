# Kickoff conventions (shared by all dv-kickoff skills)

Every skill in this plugin reads this file first. It defines where results live, how decisions are labelled, and the rules every skill keeps.

## Configuration: the `Kickoff` block in CLAUDE.md

`kickoff-init` writes this block into the project's `CLAUDE.md`. Every other skill reads it. Missing block: use the defaults below and suggest running `kickoff-init` once, without blocking the work.

```markdown
## Kickoff
- docs-dir: docs/architecture
- language: de
- project-brief: docs/architecture/project-brief.md
- architecture-checklist: docs/architecture/architecture-checklist.md
- architecture-concept: docs/architecture/architecture-concept.md
- architecture-overview: docs/architecture/architecture-overview.svg
```

Defaults equal the values above, with `language` defaulting to the language the user is talking in. Skill files, scripts and hooks are English; the documents the skills produce follow `language`.

## Status labels

Every statement in a produced document carries exactly one of three labels. Use the document language's wording for the label, keep the meaning.

| Label | Meaning |
|---|---|
| DECIDED | The user confirmed it explicitly. |
| DERIVED | Follows from decisions or from a supplied document, but the user has not confirmed it. Needs a check. |
| OPEN | Not decided: waiting on a customer, deferred, or detail not yet discussed. |

Why three: a document that presents assumptions as decisions gets quoted as authority later. "Sounds good" to a vague proposal is not DECIDED; the question must have been concrete.

## Rules for all skills

- Read first (repo, supplied documents, existing results), then ask. Never ask what the material already answers; offer it as DERIVED to confirm.
- One topic and one question per message. Each question carries a recommendation, a short reason and the alternatives.
- Do not re-open decided points. Point out consequences when a new answer touches an earlier one.
- Never commit. Write files only when the user asked for them or approved the target path. Persistent configuration (CLAUDE.md) is shown as a proposal first.
- Spec, plan and feature documentation belong to the forge skills. Kickoff skills never write them.
- Conversation language follows the user. Documents follow `language`.
