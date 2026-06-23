---
name: feature-delivery
description: >
  Orchestrator-Skill fuer vollstaendige Feature-Umsetzung (.NET + Angular): plane, nur planen,
  erstelle einen Plan, setze X um, implementiere X, liefere X, umsetzen, feature-delivery,
  fix, setze plan X um, fuehre plan X aus, implementiere plan X, schlank planen, lean planen,
  kompakt planen, Solo-Planung. Drei Einstiege: Plan-only (plane/nur planen/erstelle Plan → STOPP),
  End-to-end (implementiere/setze um/fix/liefere/feature-delivery → Plan+Umsetzung automatisch),
  From-existing-plan (setze plan X um/implementiere plan X/fuehre plan X aus → ueberspringt Planung).
  Lean-Mode (schlank planen/lean planen/kompakt planen/Solo-Planung) modifiziert nur die Planungsphase.
  Opt-out: ohne feature-delivery.
when_to_use: >
  Wenn der Nutzer ein Feature planen, umsetzen oder liefern will — .NET und Angular Stack.
  Plan-only-Einstieg: plane/nur planen/erstelle einen Plan → voller Planungs-Flow, STOPP nach Plan.
  End-to-end-Einstieg: implementiere/setze um/fix/liefere/feature-delivery → Plan und Umsetzung automatisch.
  From-existing-plan-Einstieg: setze plan X um/implementiere plan X/fuehre plan X aus →
  ueberspringt Planungs-Flow, direkt in Implementations-Flow.
  Lean-Mode: schlank planen/lean planen/kompakt planen/Solo-Planung → modifiziert nur Planungsphase.
  Nicht bei: reiner Erklaerung ohne Umsetzungsintent, ohne feature-delivery.
---

# feature-delivery

Orchestrator-Skill fuer vollstaendige Feature-Umsetzung in Kundenprojekten (.NET + Angular).
Deckt den gesamten Bogen: Anforderung → Plan → Umsetzung → Qualitaetssicherung → Ergebnis.

---

## ⚠️ Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Orchestrator überspringt Subagent-Phasen.** Gilt ohne Ausnahme — Plan Mode, Agent Mode:

- Planungs-Flow Phase 3: min. ein `plan-agent-scout` — kein Grep/Read im Orchestrator-Turn als Ersatz
- Planungs-Flow Phase 4b: min. ein `plan-agent-topic-planner` — auch bei Single-Topic, kein Orchestrator-Selbst-Plan
- Plan-Review: 6 Reviewer parallel — keine Rollensimulation im Orchestrator-Turn
- Impl-Flow: Scribes (implement-scribe-agent / implement-scribe-opus-agent) — Orchestrator schreibt keinen Produkt-Code selbst
- Impl-Review: 7 Reviewer parallel — keine Rollensimulation

**Verboten (haeufigster Fehler):** Agent schaetzt Scope als "klein und klar" ein und arbeitet direkt ohne Sub-Agents.

**Transparenz-Pflicht:** Vor jeder Delegation im Chat ankuendigen:
`"Starte jetzt [Agent-Typ] fuer [Scope/Phase]…"`

Wenn Ankuendigung nicht moeglich, weil Phase selbst ausgefuehrt wird → **STOPP:**
`"⚠️ feature-delivery nicht konform: [Phase] ohne Subagent-Delegation. Neu starten."`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Einstiege

### Plan-only (`plane`, `nur planen`, `erstelle einen Plan`)

Voller Planungs-Flow → Plan persistiert als `requests/plans/plan-<feature>.md` → **STOPP**.
Nutzer reviewt die Datei, kann dann mit From-existing-plan fortsetzen.

*Warum:* Reiner Planungs-Use-Case ist real. `plane` erzeugt hier bewusst keinen Code — regelkonformer, nutzergetriggerter Ausstieg.

### End-to-end (`setze X um`, `implementiere X`, `liefere X`, `umsetzen`, `feature-delivery`, `fix`)

Planungs-Flow → **automatisch** → Implementations-Flow → fertig.
Kein manueller Gate zwischen Plan und Implementierung.

*Warum:* Default-Verhalten; Plan ist Mittel zum Zweck, nicht Endprodukt.

### From-existing-plan (`setze plan <X> um`, `implementiere plan <X>`, `fuehre plan <X> aus`)

Laedt `requests/plans/plan-<feature>.md` → ueberspringt Planungs-Flow → direkt in Implementations-Flow.
Hard Gate (Readiness) prueft trotzdem die Umsetzbarkeit des geladenen Plans.

*Warum:* Schliesst Plan-only sauber ab; erbt den Zweck des alten `implementation-workflow`.

---

## Lean-Mode (`schlank planen`, `lean planen`, `kompakt planen`, `Solo-Planung`)

| Aspekt | Regel |
|--------|-------|
| Wer entscheidet | **Sven — explizit.** Keine Auto-Heuristik. `klein` bewusst NICHT Trigger. |
| Was schrumpft | Nur Planung: Orchestrator (Opus) plant + prueft + reviewed in sich selbst — keine Scouts, keine Review-Subagent-Armee, kein 5er-Loop. |
| Was bleibt voll | Implementation unangetastet — voller Scribe, alle Gates, voller Review-Loop. Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht. Hier wird nie gespart. |
| Kombinierbar mit | Plan-only und End-to-end. **NICHT** mit From-existing-plan. |

*Framing:* Sanktionierte Ausnahme zur Anti-Shortcut-Regel. Regelkonform, weil nicht still, sondern nur nutzergetriggert.

---

## Flows

→ **Planungs-Flow:** [flows/planning-flow.md](flows/planning-flow.md)
→ **Implementations-Flow:** [flows/implementation-flow.md](flows/implementation-flow.md)

---

## References

- [references/principles-cleancode.md](references/principles-cleancode.md) — IODA · IOSP · SOLID · Clean Code · YAGNI · DRY · KISS · DDD-Leitplanken · Security · Fehlerbehandlung · Inter-Service-Kommunikation
- [references/subagent-prompts.md](references/subagent-prompts.md) — Auftrags-Vorlagen fuer alle Sub-Agents
- [references/archunit-baseline-template.cs](references/archunit-baseline-template.cs) — ArchUnitNET Regelklasse (Gate-2-Bootstrap)
- [references/eslint-baseline.json](references/eslint-baseline.json) — Angular ESLint Baseline (Gate-2-Bootstrap)
- [references/eslint-boundaries-template.js](references/eslint-boundaries-template.js) — Zone-Grenzen Template (optional, eslint-plugin-boundaries)

---

## Externe Skill-Referenzen

- [test-design](../test-design/SKILL.md) — AAA · Namenskonvention · Magic Strings (Pflicht fuer Scribes, alle implement-review-Agents, Fix-Planer)
- `codebase-analyzer` MCP — statische Analyse, review_git_diff (alle 5 focusAreas), Index
- `dev-mcp` — Build, Test, Scaffolding, run_inspectcode, lint_angular_project

---

## Pflegehinweis

Trigger: `description` YAML + `when_to_use` aktuell halten. Flows: nur in `flows/planning-flow.md` und `flows/implementation-flow.md` aendern. Sub-Agent-Prompts: nur in `references/subagent-prompts.md`.
