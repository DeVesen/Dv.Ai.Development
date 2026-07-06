---
id: EPIC-001
type: epic
status: reviewed
slug: subagent-token-reduktion-feature-delivery
children: [FEAT-001, FEAT-002]
---

# EPIC-001 · Subagent-Token-Reduktion feature-delivery

## Kurzbeschreibung & Motivation

Der Token-/Kontext-Verbrauch der von PM/PL und `plan-agent` gestarteten Sub-Agents in
`feature-delivery` soll gesenkt werden — **ohne Verlust an Review-Genauigkeit**.

Kernbefund aus dem Brainstorm: Der **Rückgabe-Pfad** ist bereits schlank (Pointer-only, File-Handoff,
machine-dense). Die Tokens stecken im **Eingangs-Pfad** — Prompt (Boilerplate + Payload + Kontext-Daten)
**plus** das, was der Sub-Agent auf Befehl **liest** (agent-compliance + Profil + „genannte Skills
vollständig" + Kanon).

Grundrichtung: Pro-Agent-Prompt senken **plus** gezielte Reviewer-Reduktion. **Kein** Blanko-Fan-out-
Verzicht — die Collapsed-Reviewer-Idee (7→1) bleibt bewusst geparkt.

## Scope

**Drin:**
- Prompt-Diät für alle Übergaben (inner + outer + Planung): Profil als Single Source of Truth, dünne
  Payloads, konservatives Read-Scoping, geteilte Evidenz als Pointer.
- Reviewer-Struktur: DI-Merge (Normalo+Auftraggeber → „Abnahme", 6→5), auditor-Auflösung (Inner 7→6),
  🟢-Tier-Abschaffung (Achse binär 🔴/🟡).
- Task-normalisierter Planner-Output-Contract: `tasks/task-NNN.md` + `tasks/index.md` statt Monolith-Plan;
  Planner-Output-Contract = Umsetzer-Input-Contract.

**Bewusst NICHT drin (geparkt):**
- ⑤ Collapsed-Reviewer 7→1 (braucht Live-Vergleichslauf gegen Vollsatz).
- Merge ② Revisor+Skeptiker (Security-Verwässerung).
- Merge ④ craft+design-principles (Modell-Mismatch).
- ③ Rollen-Varianten der Boilerplate, (b) Sektions-Scoping als genereller Default,
  (X) DI-×6-Inline / `kein-Tool-Call` aufweichen.

## Features

- **FEAT-001 · Prompt-Diät + Reviewer-Struktur (A/B)** — mechanisch, risikoarm. Dünne Payloads
  (Profil führend), konservatives Read-Scoping, geteilte Evidenz-Pointer, DI-Merge zu „Abnahme",
  auditor-Auflösung, 🟢-Abschaffung. Betrifft Payloads, Profile, Kanon-Dateien und Delivery-Inspection.
- **FEAT-002 · Task-normalisierter Planner-Output-Contract (C)** — größer, Planner + Umsetzer.
  Planner-Output als normalisierte Task-„Datenbank" (`tasks/task-NNN.md` + `tasks/index.md`) statt
  Monolith-Plan; gemeinsamer Output-/Input-Contract; Zwei-Ebenen-Granularität (Task-Atom + Schritt-
  Checkliste).

## Abhängigkeit zwischen den Features

FEAT-001 (①-Evidenz-Pointer, ②-dünne Payloads) berührt dieselbe Handoff-Wire-Form, die FEAT-002 (⑧)
neu formt. Empfehlung aus der Quelle: **A/B zuerst, C darauf aufsetzend** — FEAT-002 sequenziert nach
FEAT-001, damit C nicht Teile von A neu verhandelt.

## Quelle

Alle Entscheidungen festgeschrieben in `requests/subagent-prompt-reduction.md`
(Branch `claude/subagent-prompt-reduction-iez9rv`, Stand 881d45b).
