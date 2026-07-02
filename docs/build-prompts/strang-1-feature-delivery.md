# Umsetzungs-Auftrag — Strang 1: `feature-delivery` (Skills + Agents) · ARCHIV

> ⚠️ **ARCHIVIERT / HISTORISCH — ausgeführt, überholt, wird nicht gepflegt.**
> Dies war das Bau-Rezept, mit dem der Skill `feature-delivery` erstmals angelegt wurde
> (Strang 1 von sechs). Das Rezept wurde ausgeführt; der Skill existiert und hat sich
> seither eigenständig weiterentwickelt. Als Rezept ist es tot — der hier beschriebene
> Agenten-Roster (Planungs-Subagenten, Review-Loop der Planung, Loop-Orchestrator,
> Scribe-Split) entspricht **nicht** mehr dem aktuellen Stand.

## Was das war

Auftrag, `.claude/skills/feature-delivery/` samt Flows, References und dem damaligen
Agenten-Roster anzulegen und Inhalte aus den Vorgänger-Skills zu migrieren.

## Was sich seither geändert hat

- **STORY-005:** die damaligen Planungs-Subagenten und der gesamte Review-Loop der
  Planung wurden **ersatzlos gelöscht** — Planung ist heute lean/solo im `plan-agent`.
- **FEAT-001:** Einstiegs-Modi neu geschnitten; Implementations-Loop auf das
  Wegwerf-PL/PM-Modell (`implement-round-executor` + `implement-supervisor`, SecondBrain)
  konsolidiert.

## Aktueller Stand (Wahrheit)

- Kanon: [`.claude/skills/feature-delivery/SKILL.md`](../../.claude/skills/feature-delivery/SKILL.md)
- Überblick: [`docs/skills/feature-delivery.md`](../skills/feature-delivery.md)
- Aktuelle Agent-Profile: [`.claude/agents/`](../../.claude/agents/)
