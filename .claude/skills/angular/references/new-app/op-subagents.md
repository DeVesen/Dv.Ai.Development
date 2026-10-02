# Op: Subagents & Qualität (Schritt 3 — nach Freigabe)

## Subagents

Vorlagen für alle Rollen: [subagent-prompts.md](subagent-prompts.md)

Reihenfolge:
`docs-check` → `workspace-scout` → `app-skeleton` → `quality-runner`

`feature-builder` nur nach separatem Feature-Plan + Freigabe.

Parent-Agent fasst zusammen und formuliert explizite nächste Entscheidungen — kein stiller Autopilot.

## Qualität (nach Erstellung)

- Minimum: `ng build` erfolgreich (wenn angefragt).
- Tests: passende Kommandos zum gewählten `--test-runner`.

Constraints: [constraints.md](constraints.md)
