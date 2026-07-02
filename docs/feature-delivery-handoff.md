# feature-delivery — Design & Handoff-Protokoll · ARCHIV

> ⚠️ **ARCHIVIERT / HISTORISCH — nicht mehr gültig, wird bewusst nicht gepflegt.**
> Dieses Dokument war das ursprüngliche Design- und Handoff-Protokoll, aus dem
> `feature-delivery` erstmals gebaut wurde (sechs Bau-Stränge). Der beschriebene
> Entwurf ist inzwischen **zweifach überholt**. Als Recipe hat es seinen Zweck
> erfüllt — es beschreibt weder den aktuellen Flow noch den aktuellen Agenten-Roster.

## Was das war

Vollständiges Pflichtenheft des Erst-Entwurfs von `feature-delivery`: Orchestrator-Skill
für .NET + Angular, Planungs- und Implementations-Flow, Prinzipien-Kanon, Quality-Gates,
dev-mcp-Erweiterungen und der Umsetzungsplan in sechs Strängen.

## Warum überholt

- **FEAT-001** hat die Einstiegs-Modi neu geschnitten (heute `plane` / `implementiere` /
  `implementiere nur` + Review-on-Demand `code-inspection` / `delivery-inspection`,
  Branch-Guard) und den ursprünglich **automatischen** Plan→Umsetzung-Handoff abgeschafft.
- **STORY-005** hat die damaligen Planungs-Subagenten und den gesamten Review-Loop der
  Planung **ersatzlos gelöscht**. Planung läuft heute **lean/solo** im Orchestrator
  (`plan-agent`, Opus) — ohne Scout, ohne Topic-Planer, ohne Review-Loop, ohne Patcher.
- Der Implementations-Loop läuft heute als **Wegwerf-PL/PM-Modell** (frische Runden-
  Instanzen `implement-round-executor` + `implement-supervisor`, datei-basierte
  SecondBrain-Kontinuität) statt eines durchgehend lebenden Loop-Orchestrators.

## Aktueller Stand (Wahrheit)

- Kanon: [`.claude/skills/feature-delivery/SKILL.md`](../.claude/skills/feature-delivery/SKILL.md)
- Überblick: [`docs/skills/feature-delivery.md`](skills/feature-delivery.md)
- Aktuelle Agent-Profile: [`.claude/agents/`](../.claude/agents/)

## Hinweise

- Die übrigen Bau-Strang-Rezepte unter [`docs/build-prompts/`](build-prompts/) verweisen auf
  dieses Dokument als Source-of-Truth — sie sind aus demselben Grund **ebenfalls historisch**.
- Der vollständige Original-Entwurf (Design-Log inkl. Begründungen) ist über die
  Git-Historie dieser Datei abrufbar.
