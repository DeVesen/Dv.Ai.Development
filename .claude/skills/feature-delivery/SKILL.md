---
name: feature-delivery
description: >
  Orchestrator-Skill fuer vollstaendige Feature-Umsetzung (.NET + Angular): plane, nur planen,
  erstelle einen Plan, setze X um, implementiere X, liefere X, umsetzen, feature-delivery,
  fix, setze plan X um, fuehre plan X aus, implementiere plan X, schlank planen, lean planen,
  kompakt planen, Solo-Planung. Drei Einstiege: Plan-only (plane/nur planen/erstelle Plan → STOPP),
  End-to-end (implementiere/setze um/fix/liefere/feature-delivery → Plan+Umsetzung automatisch),
  From-existing-plan (setze plan X um/implementiere plan X/fuehre plan X aus → ueberspringt Planung).
  Default-Planung ist Lean (ohne Zusatz): Orchestrator plant solo, keine Scouts, kein Review-Loop.
  Strong-Mode (strong) aktiviert volles Planning: Scouts, Topic-Planer, 6 Reviewer, Fix-Loop.
  Lean-Mode (schlank planen/lean planen/kompakt planen/Solo-Planung) ist identisch mit Default.
  Check-Mode (check/validate → Bewertung 1-7 lean vs. full, nur Beschreibungsanalyse, kein Planning, STOPP).
  Check-Plus-Mode (check plus/validate plus → Bewertung 1-7 mit Scouts, Code-gestuetzt, STOPP).
  Opt-out: ohne feature-delivery.
when_to_use: >
  Wenn der Nutzer ein Feature planen, umsetzen oder liefern will — .NET und Angular Stack.
  Plan-only-Einstieg: plane/nur planen/erstelle einen Plan → voller Planungs-Flow, STOPP nach Plan.
  End-to-end-Einstieg: implementiere/setze um/fix/liefere/feature-delivery → Plan und Umsetzung automatisch.
  From-existing-plan-Einstieg: setze plan X um/implementiere plan X/fuehre plan X aus →
  ueberspringt Planungs-Flow, direkt in Implementations-Flow.
  Default (ohne Zusatz): Lean-Planung — Orchestrator plant solo, schnell.
  Strong-Mode: strong → volles Planning mit Scouts (Phase 3), Topic-Planer (Phase 4b), 6 Reviewer + Fix-Loop.
  Lean-Mode: schlank planen/lean planen/kompakt planen/Solo-Planung → identisch mit Default.
  Check-Mode: check/validate → Bewertung 1-7 (lean vs. full), nur Anforderungsbeschreibung, kein Planning.
  Check-Plus-Mode: check plus/validate plus → wie Check, aber mit Scouts fuer Code-gestuetzte Bewertung.
  Nicht bei: reiner Erklaerung ohne Umsetzungsintent, ohne feature-delivery.
---

# feature-delivery

Orchestrator-Skill fuer vollstaendige Feature-Umsetzung in Kundenprojekten (.NET + Angular).
Deckt den gesamten Bogen: Anforderung → Plan → Umsetzung → Qualitaetssicherung → Ergebnis.

---

## Zwei-Schleifen-Architektur

```
┌─ OUTER LOOP (Stakeholder-Schleife) ──────────────────────────────────┐
│                                                                        │
│  Schritt 1: Anforderung klaeren                                        │
│             Iteration 1:  originaler Request                           │
│             Iteration 2+: originaler Request + PO-Delta                │
│                           (neue ACs, weggefallene ACs, Scope-Shift)   │
│                                                                        │
│  Schritt 2: Planen  ← lean / strong wirkt hier                        │
│             Iteration 1:  Vollplan                                     │
│             Iteration 2+: Delta-Plan (nur geaenderte/neue Topics)      │
│                           Unveraenderter Plan-Teil wird geerbt         │
│                           Auto-Empfehlung: strong wenn PO-Delta        │
│                           > 1 AC-Aenderung                             │
│                                                                        │
│  Schritt 3: Tests setzen (neu/geaenderte ACs → neue Tests)            │
│  Schritt 4: Umsetzen                                                   │
│                                                                        │
│  ┌─ INNER LOOP (Code-Qualitaets-Schleife, max. 5 Runden) ───────┐    │
│  │  5a: Code-Review (7 Reviewer — sehen vollen Plan + Delta)     │    │
│  │  5b: Tests (Unit + Integration)                                │    │
│  │  → Maengel? → Fix-Planer (gezielt) → Fix → zurueck zu 5a/5b  │    │
│  │  → Alles gruen? → raus aus Inner Loop                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  5c: PO/Stakeholder Review (Delivery-Inspection)                       │
│  → OK?       → Schritt 7 Closure                                      │
│  → Nicht OK? → Delta-Protokoll → zurueck zu Schritt 1                 │
│                                                                        │
│  Schritt 7: Closure                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

**Inner Loop** = Impl-Fix-Loop (max. 5 Runden): technische Korrektheit, Code-Qualitaet, Tests gruen.  
**Outer Loop** = Stakeholder-Schleife: Anforderungserfuellung aus Besteller-Perspektive. Kein Runden-Cap.

**Unterschied der Rueckwege:**
- Inner Loop (Maengel in *Wie* umgesetzt) → Fix-Planer → Fix-Scribes → Inner Loop erneut
- Outer Loop (Maengel in *Was* geliefert, neuer Scope) → Delta-Protokoll → Schritt 1

Details: [flows/implementation-flow.md](flows/implementation-flow.md), [flows/planning-flow.md](flows/planning-flow.md)

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

### Check (`check`, `validate`)

Kein Planning gestartet — reiner Bewertungs-Turn basierend auf der Anforderungsbeschreibung.

Plan-Orchestrator (Opus) analysiert und gibt aus:

**Bewertungs-Skala 1–7:**

| Wert | Bedeutung |
|------|-----------|
| 1–2 | Full Planning zwingend — viele Unbekannte, Cross-Service-Integration, Datenmigration, kein Scope-Mapping moeglich |
| 3 | Full Planning empfohlen — einige bekannte Bereiche, aber kritische offene Punkte |
| 4 | Grauzone — Scouting koennte Einschaetzung noch kippen (`check plus` empfohlen) |
| 5 | Lean sicher — Scope klar, bekannte Codebasis, ueberschaubare Integration |
| 6–7 | Lean/Trivial — Single-Class oder -Methode, keine Integration, vollstaendig klar |

**Ausgabe-Format:**
1. Bewertung `N/7` mit Einstufungstext (z. B. "Lean sicher")
2. Begruendung: Komplexitaets-Signale, Integrationspunkte, Bounded-Context-Risiken
3. Einschraenkungshinweis: "Einschaetzung basiert auf Beschreibung — Faktoren, die erst Scouts aufdecken koennen: [Liste]"
4. Empfehlung: welcher Einstieg (Plan-only/End-to-end + lean/full)

→ **STOPP.** Nutzer entscheidet Einstieg.

*Hint: Bei Bewertung 4 oder darunter ist `check plus` sinnvoll.*

---

### Check-Plus (`check plus`, `validate plus`)

Wie Check, aber mit Scouts: Phase 3 des Planungs-Flows wird ausgefuehrt (bis zu 10 Scouts parallel), Orchestrator merged Ergebnisse, gibt danach Code-gestuetzte Bewertung 1–7 aus.

**Hoehere Konfidenz** — empfohlen wenn Beschreibung wenig Code-Kontext enthaelt oder Bewertung aus `check` auf 4 landet.

Anti-Shortcut-Regel gilt: min. ein `plan-agent-scout` Task-Subagent (kein Grep/Read im Orchestrator-Turn).

→ **STOPP nach Bewertung.** Nutzer entscheidet Einstieg.

---

## Lean-Mode (`schlank planen`, `lean planen`, `kompakt planen`, `Solo-Planung`) — **Default**

| Aspekt | Regel |
|--------|-------|
| Wer entscheidet | **Default.** Aktiv ohne Zusatz. `schlank planen`/`lean planen` etc. bleiben als explizite Synonyme gueltig. |
| Was schrumpft | Nur Planung: Orchestrator (Opus) plant + prueft + reviewed in sich selbst — keine Scouts, keine Review-Subagent-Armee, kein 5er-Loop. |
| Was bleibt voll | Implementation unangetastet — voller Scribe, alle Gates, voller Review-Loop. Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht. Hier wird nie gespart. |
| Kombinierbar mit | Plan-only und End-to-end. **NICHT** mit From-existing-plan. |

*Framing:* Sicherer Default fuer den Normalfall. Fuer komplexe Features mit vielen Unbekannten explizit `strong` verwenden.

---

## Strong-Mode (`strong`)

Aktiviert das volle Planungs-Arsenal: Scouts (Phase 3), Topic-Planer (Phase 4b), 6 Reviewer parallel + Fix-Loop.

| Aspekt | Regel |
|--------|-------|
| Aktivierung | `strong` als expliziter Zusatz — z. B. `implementiere strong …` oder `plane strong …` |
| Was laeuft | Vollstaendiger Planungs-Flow gemaess [flows/planning-flow.md](flows/planning-flow.md) |
| Anti-Shortcut | Gilt vollstaendig — min. Scout, min. Topic-Planer, 6 Reviewer parallel |
| Kombinierbar mit | Plan-only und End-to-end. **NICHT** mit From-existing-plan. |

*Warum:* Fuer Features mit vielen Unbekannten, Cross-Service-Integration oder hohem Risiko — wenn mehr Konfidenz gebraucht wird als Lean liefert.*

---

## Flows

→ **Planungs-Flow:** [flows/planning-flow.md](flows/planning-flow.md)
→ **Implementations-Flow:** [flows/implementation-flow.md](flows/implementation-flow.md)

---

## References

- [../software-design-principles/SKILL.md](../software-design-principles/SKILL.md) — **Software-Design-Philosophie** (Nordstern): sauber · funktional · getestet · wartbar · nachhaltig — gilt automatisch für Planning und Implementation
- [references/principles-cleancode.md](references/principles-cleancode.md) — IODA · IOSP · SOLID · Clean Code · YAGNI · DRY · KISS · DDD-Leitplanken · Security · Fehlerbehandlung · Inter-Service-Kommunikation
- [references/subagent-prompts.md](references/subagent-prompts.md) — Auftrags-Vorlagen fuer alle Sub-Agents
- [references/archunit-baseline-template.cs](references/archunit-baseline-template.cs) — ArchUnitNET Regelklasse (Gate-2-Bootstrap)
- [references/eslint-baseline.json](references/eslint-baseline.json) — Angular ESLint Baseline (Gate-2-Bootstrap)
- [references/eslint-boundaries-template.js](references/eslint-boundaries-template.js) — Zone-Grenzen Template (optional, eslint-plugin-boundaries)

---

## Externe Skill-Referenzen

- [delivery-inspection](../delivery-inspection/SKILL.md) — Pruefung vor Auslieferung: 6 Reviewer pruefen Anforderungserfuellung (nach Impl-Fix-Loop, vor Closure)
- [test-design](../test-design/SKILL.md) — AAA · Namenskonvention · Magic Strings (Pflicht fuer Scribes, alle implement-review-Agents, Fix-Planer)
- [`dev-tooling`](../dev-tooling/SKILL.md) — MCP-Gateway: dev-mcp (Build, Test, Scaffolding, run_inspectcode, lint_angular_project), codebase-analyzer (Index, review_git_diff, statische Analyse), build-log-filter (ng serve, Shell-Fallback)
- [scout-protocol](references/scout-protocol.md) — Routing-Matrix + Hard Rules + Scout-Protokoll-Tabelle (Pflicht fuer plan-agent-scout, Phase 3)

---

## Pflegehinweis

Trigger: `description` YAML + `when_to_use` aktuell halten. Flows: nur in `flows/planning-flow.md` und `flows/implementation-flow.md` aendern. Sub-Agent-Prompts: nur in `references/subagent-prompts.md`.
