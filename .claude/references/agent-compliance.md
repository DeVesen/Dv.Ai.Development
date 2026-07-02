# Agent-Compliance (verbindlich)

Gilt für **Orchestrator** (Hauptagent) und **jeden Subagent** — ohne Ausnahme, sofern kein expliziter User-Opt-out im Thread.

## Grundsatz

Skills **nicht nur laden — strikt einhalten**. Skills unter `.claude/skills/` haben Vorrang vor Agent-Profil-Text, wenn sich Formulierungen widersprechen.

**Verboten:** Skill „gelesen" melden und den Prozess trotzdem abkürzen; parallele Umsetzungspfade (z. B. nur Vendor-Skill ohne Workflow); Roh-Konsolen-Output als Reasoning-Input bei in-scope Build/Test (siehe build-log-filter).

## Deferred Tools

**Vor jedem deferred Tool: `ToolSearch('select:<name>')` ausführen — kein direkter Aufruf ohne Schema-Load.**

Deferred Tools sind in System-Reminder-Nachrichten aufgelistet, haben aber kein geladenes Schema. Ein direkter Aufruf ohne vorangehendes `ToolSearch` schlägt mit `InputValidationError` fehl.

**Pflicht-Reihenfolge:**
1. `ToolSearch` mit `query: "select:<toolname>"` aufrufen
2. Schema aus dem Ergebnis bestätigen
3. Tool aufrufen

Gilt für Orchestrator und jeden Subagent — ohne Ausnahme.

## Workflow-Pflicht

| Intent | Pflicht |
|--------|---------|
| Planen (`plane`, Roadmap, Architektur, Vorgehen) | [feature-delivery](../skills/feature-delivery/SKILL.md) — Planungs-Flow (lean/solo) |
| Umsetzen (`implementiere`, `fix`, Plan ausführen, IMP-*) | [feature-delivery](../skills/feature-delivery/SKILL.md) — Implementations-Flow inkl. Gates, Subagents, Inner-Loop |
| Build/Test-Verifikation | Skill [build-log-filter](../skills/build-log-filter/SKILL.md) — MCP **vor** Diagnose |
| Repo-Scout (Symbol-/Code-Suche) | [code-intel-workflow](../skills/code-intel-workflow/SKILL.md) — narrow→read→impact→verify |

## Opt-out (nur explizit)

`ohne feature-delivery` — nur bei **klarem User-Text** im Thread.

**Kein Opt-out:** `ohne build-log-filter` bei in-scope Build/Test (Hard Stop laut Skill); `ohne Subagents`, `ohne Technik-Gate` — laut feature-delivery **BLOCKER**. **`ohne Review`:** BLOCKER, außer dokumentierter Opt-out im Thread.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Orchestrator → Subagent

Vor **jeder** Delegation (Task/Subagent): [subagent-delegation-boilerplate.md](./subagent-delegation-boilerplate.md) in den Auftrag; passende Vorlage aus `subagent-prompts.md` des Workflows; Agent-Profil-Pfad nennen.

**Rückgabe prüfen:** Berichte ohne Compliance-Bezug, ohne Verifikations-Matrix (bei Build/Test) oder ohne Workflow-Einhaltung → **ablehnen**, Subagent mit Fix-Kontext **neu** starten.

## Ausgabe-Stil

Kanon: [output-style-canon.md](./output-style-canon.md)

| Kontext | Modus |
|---------|-------|
| Buddy compress · repo-check · diskussion | **HUMAN-TERSE** — Bullets, vollständige Wörter, kein Fließtext, kein Warum |
| Sub-Agent-Deliverable / Orchestrator-Ausgabe (User-sichtbar) | **BULLET-TERSE** — Stichpunkte, keine Prosa-Blöcke, keine Begrüßung |
| Agent-zu-Agent-Übergaben (Task-Prompt, Rückgabe) | **MACHINE-DENSE** — maximale Kompression, Key:Value, keine Rollenwiederholung |

**Selbstcheck (Pflicht vor jeder Ausgabe):** Modus aus obiger Tabelle bestimmen → Selbstcheck-Liste in output-style-canon.md abarbeiten → bei Verstoß STOPP + `STILFEHLER: [Kontext] — [Modus] verletzt.`

**Kein Opt-out** für HUMAN-TERSE im Buddy und MACHINE-DENSE bei Agent-zu-Agent-Handoffs.

## Kanon-Pfade

| Artefakt | Pfad |
|----------|------|
| Agent-Compliance (dieses Dokument) | `.claude/references/agent-compliance.md` |
| Delegations-Boilerplate | `.claude/references/subagent-delegation-boilerplate.md` |
| Verifikationsbefehle | `.claude/references/verification-commands.md` |
| MCP-Dokumentation | `docs/mcp-*.md` |
