---
id: FEAT-001
parent: EPIC-001
type: feature
status: ready
slug: prompt-diaet-reviewer-struktur
children: [STORY-001, STORY-002, STORY-003, STORY-004, STORY-005, STORY-006]
touches: [subagent-prompts.md, reviewer-gate-canon.md, secondbrain-schema.md, delivery-inspection/SKILL.md, implementation-flow.md, agents/*.md]
---

# FEAT-001 · Prompt-Diät + Reviewer-Struktur (A/B)

## Vollbeschreibung

Bündelt die zwei mechanischen, risikoarmen Stränge A (Prompt-Diät) und B (Reviewer-Struktur). Beide
senken den Token-/Kontext-Verbrauch im **Eingangs-Pfad** der Sub-Agents, ohne Review-Genauigkeit zu
verlieren. Sie sind als ein Feature geführt, weil sie sich teils dieselben Dateien teilen
(insbesondere `subagent-prompts.md`).

**Strang A · Prompt-Diät (alle Übergaben: inner + outer + Planung)**
- ② Profil = Single Source of Truth, Payloads dünn (nur Pointer + variable Rundendaten).
- ④ Read-Scoping konservativ (beweisbare Redundanz raus, überdimensionierte Voll-Reads auf Sektion).
- ① Geteilte Evidenz als Pointer (PL schreibt `round-M/evidence.md` einmal, Impl-Reviewer lesen Pointer).

**Strang B · Reviewer-Struktur**
- ①-Merge: Normalo + Auftraggeber → „Abnahme" (outer/DI 6→5), zwei getrennte Urteile.
- ③ auditor auflösen (Inner 7→6), Plan-Coverage-Vollständigkeit erbt verifier, Go/No-Go entfällt.
- ⑥ 🟢 abgeschafft — Tier-Achse binär 🔴/🟡; §3-Tripwire → „kein Finding"; Mindest-Mengen gestrichen.

## NFRs / Randbedingungen
- **Review-Genauigkeit unverändert** — kein Verlust an Tiefe (harte Grenze für alle Stories).
- **Anti-Shortcut-Regel gewahrt** — Boilerplate „nicht paraphrasieren/weglassen" bleibt unangetastet;
  Steuerung nur über das im Payload *Benannte* (④).
- **Positiv-Blöcke §8.3 bleiben** — PRESERVE-Liste / Ship-/AC-Map sind mandatierte Deliverables, keine 🟢-Findings (⑥).

## Scope-Abgrenzung
- **Nicht** Teil dieses Features: der Task-normalisierte Planner-Output-Contract (⑧ → FEAT-002).
- **Nicht** drin: alle geparkten Potentiale (⑤ Collapsed 7→1, Merge ②Revisor+Skeptiker, Merge ④craft+design-principles, Boilerplate-Rollen-Varianten, Sektions-Scoping-Default, DI-×6-Inline).

## Stories

- **STORY-001 · ② Profil = SSoT, dünne Payloads** — Payloads tragen nur Pointer + variable
  Rundendaten; Profil-Dopplung raus. Größter Gewinn: `plan-agent`-Payload.
- **STORY-002 · ④ Read-Scoping konservativ** — Fix-Planer-Doppel-Read raus, große Skills auf
  benannte Sektion, Boilerplate unangetastet.
- **STORY-003 · ① Geteilte Evidenz als Pointer** — PL schreibt `round-M/evidence.md` einmal,
  Impl-Reviewer bekommen den Pointer (nur Impl-Seite).
- **STORY-004 · ①-Merge DI „Abnahme" (6→5)** — Normalo+Auftraggeber zu einem Abnahme-Reviewer mit
  zwei getrennten Urteilen, Kollision gemeldet nie geglättet.
- **STORY-005 · ③ auditor auflösen (Inner 7→6)** — auditor löschen, Plan-Coverage erbt verifier,
  Go/No-Go entfällt.
- **STORY-006 · ⑥ 🟢 abschaffen (binär)** — Tier-Achse 🔴/🟡, Tripwire → „kein Finding",
  Mindest-Mengen gestrichen, Positiv-Blöcke bleiben.

## Parallelgruppen-Analyse

`subagent-prompts.md` ist die **geteilte Hot-Datei** — sie wird von ② (Payloads), ④ (Read-Scoping),
① (Reviewer-Pointer), ①-Merge (DI-Reviewer-Set), ③ (Reviewer-Set) und ⑥ (Rückgabe-Kurzformen)
berührt. Deshalb überwiegend serielle Sequenz auf dieser Datei.

```
Fundament (zuerst):
  STORY-001 (②) touches: subagent-prompts.md (Payloads pervasiv) + agents/*.md
    → verschlankt subagent-prompts.md am breitesten; als Erstes, dann serialisieren die anderen dagegen.

Seriell nach STORY-001 (teilen sich subagent-prompts.md):
  STORY-002 (④) touches: subagent-prompts.md (Fix-Planer-Read, Sektions-Scoping)
  STORY-003 (①) touches: implement-round-executor.md + subagent-prompts.md (Reviewer-Pointer)
  STORY-005 (③) touches: implement-review-auditor-agent.md (löschen), implement-review-verifier-agent.md,
                          implementation-flow.md, subagent-prompts.md (Reviewer-Set)

Parallel möglich (Primär-Änderung außerhalb subagent-prompts.md, nur kleiner Rand-Edit dort):
  STORY-004 (①-Merge) touches: delivery-inspection/SKILL.md (Primär), subagent-prompts.md (DI-Set, klein)
  STORY-006 (⑥)       touches: reviewer-gate-canon.md + secondbrain-schema.md (Primär),
                                subagent-prompts.md (Rückgabe-Kurzformen, klein), implementation-flow.md

Empfehlung: STORY-001 zuerst; STORY-004 und STORY-006 können parallel dazu/danach laufen
(Primär-Dateien disjunkt); STORY-002/003/005 gegen subagent-prompts.md serialisieren.
```

## Abhängigkeiten
- Downstream: FEAT-002 (C) sequenziert nach diesem Feature — insbesondere STORY-001 (②) und
  STORY-003 (①) formen die Handoff-Wire-Form, auf der FEAT-002 aufsetzt.

## Annahmen / Offene Punkte
- Annahme: Die sechs Beschlüsse sind je eine eigenständig verifizierbare Story (INVEST-I). ⑥ ist
  bewusst isoliert wegen breitem Kanon-Ripple (reviewer-gate-canon + secondbrain-schema).
- Offener Punkt (nicht-blockierend): Ob STORY-002/003/005 mit feineren Sektions-Ankern in
  `subagent-prompts.md` doch teil-parallelisierbar sind, entscheidet die Implementierung an der Datei.
