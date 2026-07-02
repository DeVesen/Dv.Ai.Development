---
id: STORY-034
parent: FEAT-001
type: story
status: implemented
slug: outer-loop-urteilslogik
depends_on: [STORY-033]
touches:
  - feature-delivery/flows/implementation-flow.md
  - feature-delivery/SKILL.md
  - feature-delivery/references/subagent-prompts.md
  - agents/implement-supervisor.md
  - feature-delivery/references/secondbrain-schema.md
---

# STORY-034 — Outer-Loop + Urteilslogik

## User Story

Als **Harness-Betreiber** möchte ich Terminal-PM, die 3-Tier-Erbsenzählerei-Klassifikation und den
mechanischen Tier-Guard, **damit** die Ship-Entscheidung nachvollziehbar, ohne Silent-Shortcut und
mit Audit-Trail fällt — und Security-critical-Findings nie durchgewunken werden können.

## Vollbeschreibung

Dritte, abschließende Ausbaustufe (FEAT-001). Baut auf der PM-Rolle aus STORY-033 auf und ergänzt die
Urteils- und Outer-Loop-Logik gemäß FEAT-001 Entscheidungen 3, 4, 6:

- **Terminal-PM-Ausnahme:** der PM, der „inner-clean" (oder Erbsenzählerei-Exit) urteilt, überspannt
  als einzige Instanz Inner-Close → Delivery-Inspection-Dispatch → Outer-Verdikt. Harte Grenze danach
  (Requirement-Gap → frischer PM für die nächste Outer-Iteration). DI-Reviewer geben Pointer statt
  Payload (Notification-Trap löst sich strukturell auf).
- **3-Tier-Erbsenzählerei:** 🔴 blockt Inner-Exit · 🟡 Wave nur mit schriftlicher Begründung im
  `pm-verdict.md` · 🟢 frei durchwinkbar. Aggregat-Regel: ein offenes 🔴 → nächste Runde Pflicht.
- **Mechanischer Tier-Guard:** der heiße Index trägt offene Tier-Zähler; die Session weist einen
  Erbsenzählerei-Exit bei offenem 🔴 deterministisch zurück.
- **Delta-Protokoll-Integration** in den Outer-Loop (Requirement-Gap → `delta.md`).

## INVEST

- **Independent:** Bewusst verletzt — `depends_on: STORY-033` (nutzt dessen PM-Rolle + Session-Treiber).
- **Negotiable / Valuable / Estimable / Small / Testable:** erfüllt. Wert: nachvollziehbare, gegen
  Silent-Shortcut abgesicherte Ship-Entscheidung. Testbar via Dry-Run mit provozierten 🔴/🟡/Req-Gap.

## Akzeptanzkriterien (F1)

<!-- rd:ac:start -->
`TerminalPM_NachInnerClean_DispatchtDIUndFaelltOuterVerdiktInEinerInstanz`
- Arrange: Inner-Loop urteilt „clean" (oder Erbsenzählerei-Exit)
- Act: derselbe PM dispatcht die Delivery-Inspection und liest den DI-Digest
- Assert: Inner-final-Verdikt + Outer-Dispatch + Outer-Verdikt liegen in EINER PM-Instanz; danach harte Grenze — bei Requirement-Gap wird ein frischer PM für die nächste Outer-Iteration gestartet
Status: neu

`PM_BeiErbsenzaehlereiExitMitOffenemGelb_SchreibtBegruendungProFinding`
- Arrange: Digest mit ausschließlich 🟢- und ≥1 🟡-Finding, kein offenes 🔴
- Act: PM entscheidet Erbsenzählerei-Exit
- Assert: `pm-verdict.md` enthält je 🟡-Finding eine schriftliche Begründung; ohne Begründung ist der Exit nicht konform
Status: neu

`SessionTierGuard_BeiOffenemRotFinding_WeistErbsenzaehlereiExitZurueck`
- Arrange: Index-Tier-Zähler zeigt ein offenes 🔴 (z. B. Security-critical), PM meldet Erbsenzählerei-Exit
- Act: Session prüft die Tier-Zähler vor dem Exit
- Assert: Session weist den Exit zurück und erzwingt die nächste Inner-Runde
Status: neu

`PM_MitSecurityCriticalFinding_KannNieErbsenzaehlereiEinstufen`   (Negativ)
- Arrange: Finding Severity `critical` aus beliebigem Kanal (codebase-analyzer / inspectcode)
- Act: Versuch, es als 🟡 oder 🟢 zu klassifizieren
- Assert: bleibt immer 🔴 / blockierend, unabhängig vom Kanal; keine Erbsenzählerei-Einstufung möglich
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte

- Delta-Protokoll-Format wird aus dem bestehenden `implementation-flow.md`-Abschnitt übernommen
  (nur Relokation ins SecondBrain-`iteration-N/delta.md`).
- Verifikation per Dry-Run mit gezielt provozierten Findings je Tier.
