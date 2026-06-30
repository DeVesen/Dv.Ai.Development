---
id: STORY-004
type: story
status: implemented
slug: agent-profile-move-dot-claude-agents
plan: Requests/plans/plan-agent-profile-move-dot-claude-agents.md
---

# STORY-004 — Agent-Profile nach .claude/agents/ verschieben

Als AI-Workflow-Entwickler möchte ich, dass alle `implement-*`-Agent-Profile aus `.claude/skills/feature-delivery/agents/` nach `.claude/agents/` verschoben werden, damit `subagent_type: "implement-scribe-agent"` ohne Retry auflöst und keine doppelten Quellen entstehen.

## Kontext

Der Orchestrator rief `subagent_type: "implement-scribe-agent"` auf — Typ wurde nicht gefunden, weil Profile unter `.claude/skills/feature-delivery/agents/` liegen, nicht unter `.claude/agents/`. Workaround funktionierte, aber strukturell bleibt der Retry-Overhead erhalten. `acceptance-design-agent.md` liegt bereits korrekt unter `.claude/agents/` — die Konvention ist etabliert.

Entscheidung (grill-me Option B): Vollständiger Move, alle Referenzen mitziehen. Kein Copy (Sync-Risiko), keine Symlinks (Windows-Rechte-Problem).

## Scope (drin / bewusst nicht drin)

**Drin:**
- Move aller `implement-*`-Profile und `plan-*`-Profile aus `.claude/skills/feature-delivery/agents/` → `.claude/agents/`
- Aktualisierung aller Referenzen in SKILL.md und Orchestrator-Profilen, die explizite Pfade nennen
- Verzeichnis `.claude/skills/feature-delivery/agents/` nach dem Move leer (kann gelöscht oder als Hinweis-Stub gelassen werden)

**Nicht drin:**
- Inhaltliche Änderungen an den Profilen (separater Scope)
- Änderungen an Profilen anderer Skills

## INVEST

- **I** — unabhängig von STORY-001/002/003 (keine geteilten Dateien)
- **N** — keine Teilumsetzung: entweder alle Profile verschoben oder keiner
- **V** — `subagent_type` löst auf oder löst nicht auf — binäre Prüfung
- **E** — File-Move + Referenz-Update, kein Logik-Delta
- **T** — testbar: Verzeichnis-Listing `.claude/agents/` + subagent_type-Aufruf ohne Fehler

## Betroffene Profile (vollständig)

```
implement-fix-planner-agent.md
implement-loop-orchestrator.md        ← bleibt in .claude/agents/ (bereits Profil, nicht nur Skill-Ref)
implement-review-auditor-agent.md
implement-review-craft-agent.md
implement-review-design-principles-agent.md
implement-review-guard-agent.md
implement-review-readiness-agent.md
implement-review-risk-agent.md
implement-review-verifier-agent.md
implement-scribe-agent.md
implement-scribe-opus-agent.md
plan-agent-scout.md
plan-agent-topic-planner.md
plan-agent.md
plan-fixer-agent.md
plan-review-auditor-agent.md
plan-review-craft-agent.md
plan-review-design-principles-agent.md
plan-review-guard-agent.md
plan-review-readiness-agent.md
plan-review-risk-agent.md
```

<!-- rd:ac:start -->
`AgentProfileMove_AlleImplementProfile_UnterDotClaudeAgents`
- Arrange: `.claude/agents/` Verzeichnis nach dem Move
- Act: Verzeichnis listen
- Assert: Alle implement-*-agent.md und plan-*-agent.md Profile vorhanden; kein Profil noch ausschließlich unter .claude/skills/feature-delivery/agents/
Status: neu

`AgentProfileMove_SubagentType_LöstOhneRetryAuf`
- Arrange: Orchestrator-Profil ruft subagent_type: "implement-scribe-agent" auf
- Act: Agent spawnen
- Assert: Agent startet ohne "type not found" Fehler — kein Retry, kein Nutzereingriff
Status: neu

`AgentProfileMove_KeineDoppeltenProfile_KeinSyncRisiko`
- Arrange: `.claude/skills/feature-delivery/agents/` nach dem Move
- Act: Verzeichnis listen
- Assert: Verzeichnis leer oder nicht mehr existent; keine Kopie der Profile unter altem Pfad
Status: neu

`AgentProfileMove_AlterPfad_ProfileFehlen` (Negativ)
- Arrange: `.claude/agents/` ohne implement-Profile (alter Zustand)
- Act: Orchestrator ruft subagent_type: "implement-scribe-agent" auf
- Assert: "Type not found" Fehler — Retry nötig; Overhead entsteht
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte

- `implement-loop-orchestrator.md` selbst ist bereits ein Agent-Profil; es braucht ggf. keinen Pfad-Update, da es keine Self-Referenz enthält
- Prüfen: Gibt es in SKILL.md (`feature-delivery/SKILL.md`) hardcodierte Pfade auf `.claude/skills/feature-delivery/agents/`? Falls ja → mitaktualisieren
