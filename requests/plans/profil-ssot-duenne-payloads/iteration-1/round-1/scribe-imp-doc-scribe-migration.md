# Slice-ID: IMP-DOC-Scribe-Migration
Phase: GREEN — Migration
Verdikt: GREEN

## Touched Paths

- `/home/user/Dv.Ai.Development/.claude/agents/implement-scribe-agent.md`

## Build/Test-Matrix

| Build/Test | Status | Grund |
|------------|--------|-------|
| Build | N/A | md-only, kein Stack |
| Test | N/A | md-only, kein Stack |

## Summary

Migriert: Abschnitt `## Angular Hard Rules — OnPush + async-Listen` (6 Zeilen) aus dem Payload-Block
`subagent-prompts.md` Zeilen 343–348 wörtlich (1:1) in `.claude/agents/implement-scribe-agent.md`.

Einfügeposition: nach Phase-2-Green-Beschreibung (nach Punkt 6), vor `## Build/Test — MCP-Pflicht (Hard Gate)`.

Grep-Verifikation (native, MCP-Fallback freigegeben):
- `OnPush` im Profil: JA (Zeile 41, 43)
- `ChangeDetectionStrategy.OnPush` im Profil: JA (Zeile 43)
- `signal<` im Profil: JA (Zeile 45)

Payload-Entfernung aus `subagent-prompts.md`: NICHT in diesem Slice — Aufgabe W1.

## Offene Risiken / Blocker

Keine.
