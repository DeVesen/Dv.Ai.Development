# Agent-Compliance (verbindlich)

Gilt für **Orchestrator** (Hauptagent) und **jeden Subagent** — ohne Ausnahme, sofern kein expliziter User-Opt-out im Thread.

## Grundsatz

Skills und Rules **nicht nur laden — strikt einhalten**. Aktive **Cursor Rules** (`.cursor/rules/*.mdc`) haben Vorrang vor Skill-Text und Agent-Profil, wenn sich Formulierungen widersprechen.

**Verboten:** Skill/Rules „gelesen“ melden und den Prozess trotzdem abkürzen; parallele Umsetzungspfade (z. B. nur Vendor-Skill ohne Workflow); Roh-Konsolen-Output als Reasoning-Input bei in-scope Build/Test (siehe build-log-filter).

## Workflow-Pflicht

| Intent | Pflicht |
|--------|---------|
| Planen (`plane`, Roadmap, Architektur, Vorgehen) | [planning-workflow](../skills/planning-workflow/SKILL.md) Phase 1–6 |
| Umsetzen (`implementiere`, `fix`, Plan ausführen, IMP-*) | [implementation-workflow](../skills/implementation-workflow/SKILL.md) inkl. Hard Gate, Subagents, Review-Loop |
| Build/Test-Verifikation | Skill [build-log-filter](../skills/build-log-filter/SKILL.md) + Cursor-Rule [build-log-filter.mdc](../rules/build-log-filter.mdc) — MCP **vor** Diagnose |
| Repo-Scout (repo-check, Planning Phase 3) | [repo-scout-protocol](../skills/repo-scout-protocol/SKILL.md) |

## Opt-out (nur explizit)

`ohne planning-workflow`, `ohne implementation-skill` — nur bei **klarem User-Text** im Thread.

**Kein Opt-out:** `ohne build-log-filter` bei in-scope Build/Test (Hard Stop laut Rule); `ohne Subagents`, `ohne Technik-Gate` — laut Implementation-Workflow **BLOCKER** (siehe [implementation-workflow-skill.mdc](../rules/implementation-workflow-skill.mdc)). **`ohne Review`:** BLOCKER, außer dokumentierter Opt-out im Thread (gleiche Rule).

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

## Kanon-Pfade (deployt)

| Artefakt | Pfad |
|----------|------|
| Agent-Compliance (dieses Dokument) | `{agent-compliance}` |
| Delegations-Boilerplate | `.cursor/references/subagent-delegation-boilerplate.md` |
| Verifikationsbefehle | `{verification-commands}` |
| MCP-Pfade | `{mcp-project-paths}` |
