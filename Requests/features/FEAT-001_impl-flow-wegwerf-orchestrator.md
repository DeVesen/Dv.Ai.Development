---
id: FEAT-001
type: feature
status: ready
slug: impl-flow-wegwerf-orchestrator
children: [STORY-032, STORY-033, STORY-034]
touches:
  - feature-delivery/flows/implementation-flow.md
  - feature-delivery/references/subagent-prompts.md
  - feature-delivery/SKILL.md
  - agents/implement-loop-orchestrator.md
---

# FEAT-001 — feature-delivery Impl-Flow: Wegwerf-Orchestrator + SecondBrain

## Kurzbeschreibung + Motivation

Der Implementations-Flow von `feature-delivery` läuft heute in **einer durchgehend lebenden
Orchestrator-Instanz** (`implement-loop-orchestrator`, Opus), die pro Fix-Runde den Gate-Output
plus **7 Reviewer-Reports live im eigenen Kontextfenster** akkumuliert. Beobachtung des Nutzers:
Kontext-Compact trat im Implementations-Teil auf, vermutlich schon in Runde 1 — ein
**Volumen-Problem**, kein Runden-Anzahl-Problem.

Ziel: Umbau auf ein **Wegwerf-Orchestrator-Pattern mit externem Gedächtnis (SecondBrain)**. Volle
Reviewer-Tiefe bleibt erhalten (kein Kontext-Kürzen bei Reviewern — deren Breite ist ihr
Existenzgrund), aber **kein Fenster wächst mehr unbegrenzt**. Kontinuität läuft ausschließlich über
persistierte Markdown-Dateien statt über ein wachsendes Chat-Gedächtnis.

## Design-Grundlage (7 gegrillte Entscheidungen)

Diese Entscheidungen sind vorab in einer `/grill-me`-Session getroffen und gelten als verbindlicher
Design-Input für alle Stories dieses Features:

1. **Dispatcher = eine Session als dünner Pointer-only-Treiber.** Jede *gespawnte* Rolle ist
   throwaway; die Session ist die einzige legitim persistente Instanz. Kontinuität rein datei-basiert
   → Impl kann in frischer Session gestartet werden (leerer Treiber).
2. **Scope: nur Impl-Flow.** Schema flow-agnostisch schneiden; Planning-Flow-Umbau kommt später,
   iterativ, als eigenes Vorhaben.
3. **Rollen-Kadenz:** frischer **PL** (mechanischer Runden-Executor) + frischer **PM** (Urteilsebene)
   je Runde. **Terminal-PM** ist die einzige Ausnahme, die Inner-Close→Outer überspannt. DI-Reviewer
   geben Pointer statt Payload. Fix-Planer bleibt erhalten, unter dem PM.
4. **Erbsenzählerei-Klassifikation, 3 Tiers:** 🔴 blockt Inner-Exit · 🟡 Wave nur mit schriftlicher
   Begründung · 🟢 frei durchwinkbar. Security-Findings Severity `critical` sind IMMER 🔴, nie als
   Erbsenzählerei einstufbar.
5. **SecondBrain = Verzeichnis pro Feature:** `requests/plans/<feature>/secondbrain-index.md` (heiß)
   + `iteration-N/round-M/{finding-*.md, digest.md, pm-verdict.md}` + `outer/` + `delta.md`. Findings
   als Struktur-Tabellen (ReportFindings-Vorbild). PL vergibt autoritative Tiers. Verdichtung
   heiß/kalt, **nie löschen** (Audit-Trail-Pflicht).
6. **Handoff = Datei-Referenzen** (Session gibt Pfade + Slice-IDs, Agents lesen selbst). Rundenzähler
   + Max-5-Cap in der Session. Mechanischer Tier-Guard: Index trägt offene Tier-Zähler → Session weist
   Erbsenzählerei-Exit bei offenem 🔴 zurück.
7. **Ausführung = Path 1:** dieses requirement-definition rahmt den Umbau als Harness-Story; die
   Umsetzung erfolgt via `skill-creator` (Markdown-/Agent-Profil-Edits). **Kein** feature-delivery-
   Impl-Flow für die Umsetzung selbst (Code-Gates sind für Markdown bedeutungslos). Akzeptanz-
   Verifikation = **Dry-Run** an einer kleinen Story.

## Scope

**Drin:**
- Umbau des Implementations-Flows von `feature-delivery` auf das Wegwerf-Orchestrator-Pattern.
- SecondBrain-Datei-Mechanismus (Verzeichnis-Layout, Schema, Verdichtung) — **harness-generisch**,
  wird ins Harness-Template gebacken (jedes Kundenprojekt bekommt die Konvention).
- Neue Agent-Profile: PL (`implement-round-executor`) + PM (`implement-supervisor`).
- Anpassung der bestehenden Reviewer-/Scribe-Prompt-Templates auf „schreibe Findings in Datei,
  gib Pointer zurück".

**Bewusst nicht drin:**
- Planning-Flow-Umbau (Scouts / Topic-Planer / 6 Plan-Reviewer) — späteres, eigenes Vorhaben,
  iterativ Schritt für Schritt. Das SecondBrain-Schema wird nur *flow-agnostisch vorbereitet*.
- Änderungen an den fachlichen Reviewer-Lenses (was ein Reviewer prüft) — nur ihr Rückgabeformat
  ändert sich, nicht ihr Prüfumfang.
- Produkt-Code (.NET/Angular) — dies ist eine reine Harness-Meta-Änderung.

## NFRs / Randbedingungen

- **Harness-Portabilität:** Alle Artefakte bleiben Skill-Markdown + Agent-Profile + Dateien —
  kein neues Paradigma (kein Workflow-JS), damit die Konvention in jedes Kundenprojekt portierbar ist.
- **Audit-Trail:** SecondBrain-Historie wird bei Iterationsabschluss verdichtet (heiß/kalt), aber
  **nie gelöscht**. Steht im Einklang mit `docs/silent-shortcut-prevention.md`.
- **Anti-Silent-Shortcut:** Der bewusste, kontrollierte Informationsverlust (Digest-Handoff) wird
  explizit protokolliert (🟡-Begründungspflicht, Tier-Guard), nicht stillschweigend verkauft.
- **Inkrementell auslieferbar:** Die drei Stories bilden eine Ausbaustufe-Sequenz; jede ist
  eigenständig per Dry-Run verifizierbar. STORY-032 (Datei-Handoff) allein soll den Compact bereits
  entschärfen — cheap-first-Validierung der Kern-Hypothese.

## Story-Liste

- **STORY-032 — Datei-basiertes Findings-Handoff** (cheap win): SecondBrain-Layout + Index;
  Reviewer/Scribes schreiben `finding-*.md`/Digest, geben nur Pointer zurück; der (noch monolithische)
  Orchestrator liest Dateien statt Payloads zu empfangen. Testet die Volumen-Hypothese mit minimalem
  Risiko.
- **STORY-033 — Rollen-Split**: Orchestrator → dünner Session-Treiber + throwaway PL + throwaway PM
  je Runde; Rundenzähler + Max-5-Cap in die Session. Baut auf STORY-032 (nutzt dessen Datei-Layout).
- **STORY-034 — Outer-Loop + Urteilslogik**: Terminal-PM (Inner→Outer), 3-Tier-Erbsenzählerei,
  mechanischer Tier-Guard, DI-Pointer-Handoff, Delta-Protokoll-Integration. Baut auf STORY-033
  (nutzt dessen PM-Rolle).

## Parallelgruppen-Analyse

Alle drei Stories berühren dieselben Kern-Dateien (`implementation-flow.md`, `subagent-prompts.md`,
`SKILL.md`, die Orchestrator-/PM-Agent-Profile) **und** haben harte logische Abhängigkeiten
(B nutzt A's Layout, C nutzt B's Rollen).

```
Parallelgruppen: keine
Serielle Sequenz: STORY-032 → STORY-033 → STORY-034
  STORY-032 touches: subagent-prompts.md, implementation-flow.md, secondbrain-schema.md (NEU),
                     implement-loop-orchestrator.md
  STORY-033 touches: implement-loop-orchestrator.md, implement-round-executor.md (NEU),
                     implement-supervisor.md (NEU), SKILL.md, implementation-flow.md,
                     subagent-prompts.md
  STORY-034 touches: implementation-flow.md, SKILL.md, subagent-prompts.md,
                     implement-supervisor.md, secondbrain-schema.md
  → Massive Überschneidung + logische Deps → strikt seriell, kein Worktree, keine Parallelität.
```

## Annahmen / Offene Punkte

- **Annahme:** Die harness-generische Einstufung des SecondBrain-Mechanismus (CLAUDE.md-Regel) ist im
  Grill bestätigt — der Compact-Bug trifft jeden feature-delivery-Lauf in jedem Kundenprojekt.
- **Offener Punkt (nicht-blockierend):** Endgültige Agent-Profil-Namen (`implement-round-executor` /
  `implement-supervisor`) werden in der skill-creator-Umsetzung final festgelegt.
- **Offener Punkt (nicht-blockierend):** SKILL.md von skill-creator nutzt einzelne macOS/Bash-Idiome
  (`open`, `/tmp/`); ggf. PowerShell-Anpassung nötig — betrifft nur die Nutzung des Vehikels, nicht
  dieses Feature. Separates Aufräum-Task.
