# feature-delivery

Orchestrator-Skill für vollständige Feature-Umsetzung (.NET + Angular). Deckt den gesamten Bogen: Anforderung → Plan → Umsetzung → Qualitätssicherung → Ergebnis.

> **Agent-Kanon (Pflicht):** [`.claude/skills/feature-delivery/SKILL.md`](../../.claude/skills/feature-delivery/SKILL.md)

---

## Drei Einstiege

| Trigger | Einstieg | Beschreibung |
|---------|----------|--------------|
| `plane`, `nur planen`, `erstelle einen Plan` | **Plan-only** | Voller Planungs-Flow → Plan persistiert → STOPP |
| `implementiere`, `setze um`, `fix`, `liefere`, `feature-delivery` | **End-to-end** | Plan + Implementierung automatisch |
| `setze plan X um`, `implementiere plan X`, `führe plan X aus` | **From-existing-plan** | Überspringt Planungs-Flow, lädt bestehenden Plan |

## Lean-Mode

Trigger: `schlank planen`, `lean planen`, `kompakt planen`, `Solo-Planung`
Modifiziert nur die Planungsphase — reduzierte Subagent-Delegation nach expliziter Freigabe durch Sven.

## Ablösung

Löst `planning-workflow` und `implementation-workflow` ab. Alle Flows liegen unter `.claude/skills/feature-delivery/flows/`.
