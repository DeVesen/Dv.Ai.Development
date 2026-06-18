# Op: Execution Workflow

## Execution workflow

1. **Document** current behavior, entry points, and risk (routing, guards, global services).
2. **Plan** small steps; one concern per commit-sized change where possible.
3. **After each meaningful step** — run build/lint/tests appropriate to risk (per Architecture skill: `ng build` after non-trivial edits).
4. **If tests fail** — distinguish regression vs. outdated spec; escalate ambiguity to the user before rewriting integration expectations.

## Optional deep checks (ideas)

- **Accessibility** — custom widgets: keyboard, focus, ARIA (Architecture skill).
- **Change detection / zoneless** — avoid patterns that assume implicit timing; prefer explicit signal flow.
- **Bundle and lazy loading** — keep feature boundaries; avoid pulling heavy deps into shared paths.
- **Dead code** — remove unused abstractions after migration.
- **Duplication** — consolidate duplicate test setup via helpers, not copy-pasted mega `beforeEach`.

## Output format (plans / reviews)

Use a short, scannable list:

- **Change** — what
- **Why** — stability / maintainability / performance
- **Risk** — low / medium / high
- **Tests** — which specs must stay green as contracts; which unit specs may move
- **Verify** — build command, focused test paths
