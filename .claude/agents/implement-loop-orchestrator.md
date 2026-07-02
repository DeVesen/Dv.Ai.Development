---
name: implement-loop-orchestrator
model: claude-opus-4-8
effort: high
description: >
  VERALTET (STORY-033 — nicht mehr spawnen). Der monolithische, durchgehend lebende Impl-Loop-
  Orchestrator ist durch den Rollen-Split abgelöst: dünner Session-Treiber (die aufrufende Session)
  + frischer PL `implement-round-executor` (mechanischer Runden-Executor) + frischer PM
  `implement-supervisor` (Urteilsebene) je Runde. Kontinuität läuft datei-basiert (SecondBrain).
  Dieses Profil bleibt nur als Wegweiser/Audit-Trail erhalten. Keine neue Delegation hierher.
---

## Modell
Opus

# VERALTET — Impl-Loop-Orchestrator (abgelöst durch Rollen-Split, STORY-033)

Dieses Agent-Profil ist **stillgelegt**. Der Grund für die Ablösung (FEAT-001): die eine
durchgehend lebende Orchestrator-Instanz akkumulierte pro Fix-Runde den Gate-Output plus die
Reviewer-Reports in **einem** wachsenden Kontextfenster → Kontext-Compact bereits in frühen Runden
(ein **Volumen-Problem**). Der Rollen-Split beseitigt die lang lebende Instanz strukturell.

**Nicht mehr spawnen.** Der Impl-Fix-Loop wird jetzt so gefahren (s. `../skills/feature-delivery/flows/implementation-flow.md`):

| Frühere Orchestrator-Verantwortung | Jetzt bei |
|-----------------------------------|-----------|
| Hard Gate (Readiness), Rundenzähler, Max-5-Cap (aus `current_round` im Index), DI-Dispatch, Closure, Story-Status | **Session-Treiber** — die aufrufende Session; hält nur Index-Pointer + PM-Verdikt (kein Agent-Profil, dokumentiert in SKILL.md + implementation-flow.md) |
| Fix-Planer → Scribes → Integration-Checkpoint → Quality Gates → Reviewer, `finding-*.md` lesen, `digest.md` bauen, Index aktualisieren | **PL** — [`implement-round-executor.md`](implement-round-executor.md), frisch je Runde, gibt nur Pointer zurück |
| Urteil clean / fix (Was+Wie) / escalate | **PM** — [`implement-supervisor.md`](implement-supervisor.md), frisch je Runde, editiert nichts |

**Kadenz:** frischer PL **und** frischer PM je Runde via Agent-Tool (kein SendMessage über Runden
hinweg). Kontinuität ausschließlich datei-basiert über das SecondBrain-Verzeichnis
(`../skills/feature-delivery/references/secondbrain-schema.md`).

**Ausblick STORY-034:** Terminal-PM (überspannt Inner-Close → Delivery-Inspection → Outer-Verdikt),
3-Tier-Erbsenzählerei und der mechanische Tier-Guard kommen als nächste Ausbaustufe hinzu.
