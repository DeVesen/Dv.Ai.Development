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
| Hard Gate (Readiness), Rundenzähler, Max-5-Cap, **Fan-out (Scribes/Reviewer/Fix-Planer/DI) + Collect, Quality Gates via MCP**, DI-Fan-out, Closure, Story-Status | **Session-Treiber** — die aufrufende Session; **der einzige Fan-out-/Collect-Knoten** (nur sie empfaengt Sub-Agent-Completions); hält nur Pointer + Verdikt (kein Agent-Profil, dokumentiert in SKILL.md + implementation-flow.md) |
| `finding-*.md` lesen, `digest.md` bauen, autoritative Tiers, Index aktualisieren | **Digest-Leaf** — [`implement-round-executor.md`](implement-round-executor.md), frisch je Runde, **dispatcht nichts**, gibt nur Pointer zurück |
| Urteil clean / fix (Was+Wie) / escalate; Outer-Verdikt aus di-findings | **PM-Leaf** — [`implement-supervisor.md`](implement-supervisor.md), frisch je Runde, **dispatcht nichts**, editiert nur den Urteils-Audit-Trail |

**Korrektur (Harness-Grundwahrheit):** Der ursprüngliche STORY-033-Split ließ einen „PL"-Sub-Agent
selbst Scribes/Reviewer dispatchen — das ist entfernt. In diesem Harness landet die Completion eines
gespawnten Kindes **immer bei der Session**, nie beim spawnenden Sub-Agent; deshalb faechert **nur** die
Session, und die Leaves lesen/verdichten/urteilen bloß.

**Kadenz:** frisches Digest-Leaf **und** frisches PM-Leaf je Runde via Agent-Tool (kein SendMessage über
Runden hinweg). Kontinuität ausschließlich datei-basiert über das SecondBrain-Verzeichnis
(`../skills/feature-delivery/references/secondbrain-schema.md`).

**STORY-034 (korrigiert):** 3-Tier-Erbsenzählerei + mechanischer Tier-Guard bleiben; der Outer-Verdikt
läuft in einem **frischen** Outer-Verdikt-PM-Leaf, das die Session nach ihrem DI-Fan-out startet — kein
über den Inner-Close hinweg fortgesetzter „Terminal-PM".
