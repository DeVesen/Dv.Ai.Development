---
name: feature-delivery
description: >
  Orchestrator-Skill fuer vollstaendige Feature-Umsetzung (.NET + Angular): plane, nur planen,
  erstelle einen Plan, setze X um, implementiere X, liefere X, umsetzen, feature-delivery,
  fix, setze plan X um, fuehre plan X aus, implementiere plan X, implementiere lean impl, schlank planen, lean planen,
  kompakt planen, Solo-Planung. Akzeptiert ausschliesslich Stories (type: story, status: ready)
  — Epics und Features werden verweigert, fehlendes Story-Format erfordert Bestaetigung.
  Vier Einstiege: Plan-only (plane/nur planen/erstelle Plan → STOPP, setzt Story auf planned),
  End-to-end (implementiere/setze um/fix/liefere/feature-delivery → Plan+Umsetzung automatisch),
  From-existing-plan (setze plan X um/fuehre plan X aus → ueberspringt Planung),
  Already-Planned (Story status=planned → Plan automatisch laden, direkt Implementierung).
  Default-Planung ist Lean (ohne Zusatz): Orchestrator plant solo, keine Scouts, kein Review-Loop.
  Strong-Mode (strong) aktiviert volles Planning: Scouts, Topic-Planer, 6 Reviewer, Fix-Loop.
  Lean-Mode (schlank planen/lean planen/kompakt planen/Solo-Planung) ist identisch mit Default.
  Check-Mode (check/validate → Bewertung 1-7 lean vs. full, nur Beschreibungsanalyse, kein Planning, STOPP).
  Check-Plus-Mode (check plus/validate plus → Bewertung 1-7 mit Scouts, Code-gestuetzt, STOPP).
  Opt-out: ohne feature-delivery.
when_to_use: >
  Wenn der Nutzer eine Story planen, umsetzen oder liefern will — .NET und Angular Stack.
  Voraussetzung: Story-Datei mit type: story und status: ready (aus requirement-definition).
  Epic oder Feature uebergeben → REFUSE. Kein Story-Format → STOP + Bestaetigung.
  Story status=planned → Already-Planned-Path: verlinkten Plan laden, direkt Implementierung.
  Plan-only-Einstieg: plane/nur planen/erstelle einen Plan → Planungs-Flow, Story auf planned setzen, STOPP.
  End-to-end-Einstieg: implementiere/setze um/fix/liefere/feature-delivery → Plan+Umsetzung, Story auf implemented.
  From-existing-plan-Einstieg: setze plan X um/implementiere plan X/fuehre plan X aus →
  ueberspringt Planungs-Flow, direkt in Implementations-Flow, Story auf implemented.
  Default (ohne Zusatz): Lean-Planung — Orchestrator plant solo, schnell.
  Strong-Mode: strong → volles Planning mit Scouts (Phase 3), Topic-Planer (Phase 4b), 6 Reviewer + Fix-Loop.
  Lean-Mode: schlank planen/lean planen/kompakt planen/Solo-Planung → identisch mit Default.
  Lean-Impl-Mode: implementiere lean impl → Impl-Review auf 3 Reviewer (risk · craft · readiness) oder 1 impl-quality-review-agent (collapsed, alle Lenses intern, 1 Approval). Scribes, Gates, Test-First bleiben voll.
  Check-Mode: check/validate → Bewertung 1-7 (lean vs. full), nur Anforderungsbeschreibung, kein Planning.
  Check-Plus-Mode: check plus/validate plus → wie Check, aber mit Scouts fuer Code-gestuetzte Bewertung.
  Nicht bei: reiner Erklaerung ohne Umsetzungsintent, ohne feature-delivery.
  Story-Entscheidungen noch unklar vor dem Plan? → /grill-me <story.md> vorschalten.
  Parallele Stories: NIEMALS isolation: worktree verwenden — alle Agents arbeiten direkt auf dem
  aktuellen Branch. Voraussetzung: requirement-definition hat touches-Annotation und Parallelgruppen
  geprueft (keine Ueberschneidung). Stories mit ueberschneidenden touches serialisieren.
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
│  │  Session-Treiber spawnt je Runde frisch: PL → PM              │    │
│  │  PL: Fix-Scribes → Gates → 7 Reviewer → digest.md (Pointer)   │    │
│  │      + autoritative Tiers 🔴/🟡/🟢 → Tier-Zaehler in Index     │    │
│  │  PM: liest Index+Digest → clean / erbsenzaehlerei-exit /      │    │
│  │      fix(Was+Wie) / escalate                                  │    │
│  │  Session-Tier-Guard: 🔴 offen > 0 → Exit zurueckgewiesen      │    │
│  │  → fix?        → naechste Runde (PL dispatcht Fix-Planer)      │    │
│  │  → Inner-Close?→ PM wird TERMINAL-PM, raus aus Inner Loop      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  5c: TERMINAL-PM (eine Instanz) — dispatcht Delivery-Inspection        │
│      (Pointer-Handoff) → liest di-digest → Outer-Verdikt               │
│  → OK?       → Schritt 7 Closure                                      │
│  → Req-Gap?  → outer/delta-N.md → zurueck zu Schritt 1 (frischer PM)  │
│                                                                        │
│  Schritt 7: Closure                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

**Inner Loop** = Impl-Fix-Loop (max. 5 Runden): technische Korrektheit, Code-Qualitaet, Tests gruen.  
**Outer Loop** = Stakeholder-Schleife: Anforderungserfuellung aus Besteller-Perspektive. Kein Runden-Cap.

**Unterschied der Rueckwege:**
- Inner Loop (Maengel in *Wie* umgesetzt) → Fix-Planer → Fix-Scribes → Inner Loop erneut
- Outer Loop (Maengel in *Was* geliefert, neuer Scope) → Delta-Protokoll → Schritt 1

### Inner-Exit-Urteilslogik: 3-Tier + Terminal-PM + Tier-Guard (STORY-034)

Der Uebergang Inner→Outer ist die kritischste Entscheidung des Flows — sie faellt nachvollziehbar, gegen Silent-Shortcut abgesichert und mit Audit-Trail:

- **3-Tier-Erbsenzählerei** (autoritativ vom PL vergeben): 🔴 blockt den Inner-Exit (ein offenes 🔴 → naechste Runde Pflicht) · 🟡 nur mit **schriftlicher Begruendung je Finding** im `outer/pm-verdict-N.md` durchwinkbar · 🟢 frei. **Security-`critical` ist aus jedem Kanal immer 🔴 — nie als Erbsenzählerei einstufbar.**
- **PM-Urteil**: `clean` (nichts offen) · `erbsenzaehlerei-exit` (nur 🟡/🟢 offen, 🟡 begruendet) · `fix` · `escalate`.
- **Mechanischer Tier-Guard** (Session): liest `Tier 🔴 offen` aus dem Index; ein Inner-Close bei offenem 🔴 wird **deterministisch zurueckgewiesen** — reine Zaehler-Arithmetik, nicht durch ein PM-Fehlurteil aushebelbar.
- **Terminal-PM**: der PM, der den Inner-Loop schliesst, ist die **einzige** Instanz, die Inner-Close → Delivery-Inspection-Dispatch → Outer-Verdikt in **einer** Instanz ueberspannt (DI-Reviewer geben Pointer statt Payload → Notification-Trap geloest). Danach **harte Grenze**: die Folge-Outer-Iteration bekommt einen frischen PM.

### Rollenbild Impl-Fix-Loop — Wegwerf-Instanzen (STORY-033)

Der Inner Loop laeuft **nicht** in einer durchgehend lebenden Orchestrator-Instanz (das erzeugte
Kontext-Compact durch unbegrenztes Fenster-Wachstum, FEAT-001). Stattdessen drei Elemente,
Kontinuitaet rein **datei-basiert** ueber das SecondBrain
([references/secondbrain-schema.md](references/secondbrain-schema.md)):

| Element | Lebensdauer | Aufgabe |
|---------|-------------|---------|
| **Session-Treiber** (die aufrufende Session) | persistent — einzige lebende Instanz | Haelt **nur** Index-Pointer + PM-Verdikt-Kurzform. Liest `current_round` + `Tier 🔴 offen` aus `secondbrain-index.md`, erzwingt den Max-5-Cap **und den mechanischen Tier-Guard**, spawnt je Runde frische Rollen. |
| **PL** `implement-round-executor` | throwaway — frisch je Runde | Mechanisch: dispatcht (Fix-Planer →) Scribes → Integration-Checkpoint → Gates → Reviewer, liest die `finding-*.md`, baut `digest.md` **+ vergibt autoritative Tiers 🔴/🟡/🟢** und schreibt die Tier-Zaehler in den Index. Gibt **nur Pointer** zurueck. Implementiert keinen Code, urteilt nicht. |
| **PM** `implement-supervisor` | throwaway — frisch je Runde; **Ausnahme: Terminal-PM** ueberspannt den Inner-Close→Outer-Span | Urteilsebene: liest Index+Digest → **ein** Inner-Urteil `clean` / `erbsenzaehlerei-exit` / `fix` (Was+Wie) / `escalate`. Schreibt **nur** `outer/pm-verdict-N.md` (+ bei Requirement-Gap `outer/delta-N.md`). Als Terminal-PM: DI-Dispatch + Outer-Verdikt in einer Instanz. |

**Kadenz:** frischer PL **und** frischer PM je Runde via Agent-Tool — **kein SendMessage ueber
Runden hinweg**. Kein Fenster waechst mehr unbegrenzt; kein Reviewer-Report und kein Digest-Body
liegt je im Session-Fenster (nur Pointer + Verdikt). Der Fix-Planer bleibt erhalten, unter dem
PM-Urteil — die naechste Runde dispatcht ihn, bevor Fix-Scribes laufen.

**Einzige Ausnahme zur Wegwerf-Kadenz:** der **Terminal-PM** (der PM, der den Inner-Loop schliesst)
setzt **dieselbe** Instanz ueber Inner-Close → Delivery-Inspection → Outer-Verdikt fort — kein
Runden-Uebergang, sondern der Abschluss-Span einer Outer-Iteration. Danach harte Grenze. Details +
3-Tier + Tier-Guard: s. Abschnitt oben und [flows/implementation-flow.md](flows/implementation-flow.md).

Details: [flows/implementation-flow.md](flows/implementation-flow.md), [flows/planning-flow.md](flows/planning-flow.md)

---

## ⚠️ Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Orchestrator überspringt Subagent-Phasen.** Gilt ohne Ausnahme — Plan Mode, Agent Mode:

- Planungs-Flow Phase 3: min. ein `plan-agent-scout` — kein Grep/Read im Orchestrator-Turn als Ersatz
- Planungs-Flow Phase 4b: min. ein `plan-agent-topic-planner` — auch bei Single-Topic, kein Orchestrator-Selbst-Plan
- Plan-Review: 6 Reviewer parallel — keine Rollensimulation im Orchestrator-Turn
- Impl-Flow: Scribes (implement-scribe-agent / implement-scribe-opus-agent) — der PL (implement-round-executor) schreibt keinen Produkt-Code selbst, der PM (implement-supervisor) urteilt nur
- Impl-Review: 7 Reviewer parallel — keine Rollensimulation im PL-Thread
- Impl-Fix-Loop: frischer PL UND frischer PM je Runde via Agent-Tool — kein SendMessage ueber Runden hinweg, keine lang lebende Orchestrator-Instanz

**Ausnahme: Micro-Change-Modus** (s.u.) — Orchestrator editiert direkt, kein Scribe, kein Plan-File, 1 Reviewer (risk). Nur wenn Fastpath explizit aktiviert und angekuendigt.

**Verboten (haeufigster Fehler):** Agent schaetzt Scope als "klein und klar" ein und arbeitet direkt ohne Sub-Agents — ohne den Micro-Change-Modus korrekt aktiviert zu haben.

**Transparenz-Pflicht:** Vor jeder Delegation im Chat ankuendigen:
`"Starte jetzt [Agent-Typ] fuer [Scope/Phase]…"`

Wenn Ankuendigung nicht moeglich, weil Phase selbst ausgefuehrt wird → **STOPP:**
`"⚠️ feature-delivery nicht konform: [Phase] ohne Subagent-Delegation. Neu starten."`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Story-Gate (vor jedem Einstieg — keine Ausnahme)

feature-delivery akzeptiert **ausschliesslich Stories** als Eingabe-Anforderung.
Pruefreihenfolge beim Start:

### Schritt 1 — Input-Typ pruefen

Liegt eine Datei vor, Frontmatter lesen (`type`-Feld). Liegt kein Frontmatter vor, Beschreibungstext
auf Epic-/Feature-Signale pruefen (z. B. „mehrere Stories", „Funktionsbereich", „Saeulen A–D").

| Befund | Reaktion |
|--------|----------|
| `type: epic` oder `type: feature` | **STOP + REFUSE:** *„⛔ feature-delivery verweigert die Ausführung: Die übergebene Anforderung ist ein [Epic/Feature], kein Story-Arbeitspaket. feature-delivery setzt eine ausgearbeitete Story (`type: story`, `status: ready`) voraus. Bitte erst /requirement-definition ausführen und die Story bis `ready` schärfen."* Keine Weiterarbeit. |
| Kein `type`-Feld, kein Story-Format erkennbar | **STOP + Bestätigung erforderlich:** *„⚠️ Die Anforderung liegt nicht im Story-Format vor (kein `type: story` im Frontmatter erkennbar). Ohne ausgearbeitete Story fehlt die Spezifikationsbasis — das erhöht das Risiko von Fehlinterpretationen und Nacharbeiten erheblich. Trotzdem fortfahren? [Ja / Nein — zuerst /requirement-definition ausführen]"* Wartet auf explizites Ja. |
| `type: story` | weiter mit Schritt 2 |

### Schritt 2 — Status pruefen

| `status`-Wert | Reaktion |
|---------------|----------|
| `planned` + `plan`-Referenz vorhanden | **Already-Planned-Path:** Plan-Datei laden → direkt in Implementations-Flow (Planungs-Flow komplett ueberspringen). Meldung: *„Story ist bereits geplant (`status: planned`). Lade Plan [plan-referenz] und starte direkt mit der Implementierung."* |
| `ready` | Normaler Weg → Einstieg gemaess gewaehltem Modus (Plan-only / End-to-end / From-existing-plan) |
| alles andere (`offen`, `implemented`, oder fehlend) | **STOP + REFUSE:** *„⛔ feature-delivery verweigert die Ausführung: Story hat Status `[wert]` — erwartet wird `ready`. Die Story muss zuerst in /requirement-definition bis `ready` geschärft werden."* Keine Weiterarbeit. |

### Schritt 3 — Abhaengigkeiten pruefen

Nur relevant wenn die Story ein `depends_on`-Feld im Frontmatter hat.

Fuer jede referenzierte Story-ID in `depends_on`: die jeweilige Story-Datei lesen und `status`
pruefen.

| Befund | Reaktion |
|--------|----------|
| Alle `depends_on`-Stories haben `status: implemented` | Weiter — keine Blockierung |
| Mindestens eine `depends_on`-Story hat anderen Status | **STOP + REFUSE:** *„⛔ feature-delivery verweigert die Ausführung: Diese Story hat eine unerfüllte Abhängigkeit. [STORY-XXX] hat Status `[wert]` — erwartet wird `implemented`. Die abhängige Story muss zuerst vollständig umgesetzt sein."* Bei mehreren blockierenden Stories alle auflisten. Keine Weiterarbeit. |
| `depends_on`-Story-Datei nicht auffindbar | **STOP + REFUSE:** *„⛔ Abhängige Story [STORY-XXX] nicht gefunden — Pfad prüfen oder Abhängigkeit in der Story-Datei korrigieren."* |

### Schritt 4 — Story-Status nach Planung setzen

Nach erfolgreichem Abschluss des Planungs-Flows (Plan-Datei persistiert unter
`requests/plans/plan-<slug>.md`):

1. Story-Frontmatter aktualisieren:
   - `status: ready` → `status: planned`
   - Feld `plan` hinzufuegen: `plan: requests/plans/plan-<slug>.md`
2. Meldung: *„Plan persistiert. Story-Status auf `planned` gesetzt, Plan-Referenz eingetragen."*

### Schritt 5 — Story-Status nach Implementierung setzen

Nach Abschluss von Schritt 7 (Closure) des Outer Loops. **Den Story-Status setzt ausschließlich der Session-Treiber** — der Terminal-PM fällt den Outer-Verdikt (OK/Gap), berührt aber das Story-Frontmatter nie:

1. Story-Frontmatter aktualisieren: `status: planned` → `status: implemented` (nur bei Outer-Verdikt `OK`)
2. Meldung: *„Implementierung abgeschlossen. Story-Status auf `implemented` gesetzt."*

---

## Package-Feed-Gate (vor Phase 1+2 — nur bei Package-Install-Tasks)

**Auslöser** — Gate aktiviert wenn Task/Anforderung enthält:
- PyPI: `pip install`, `requirements.txt`, `pyproject.toml`, privater Feed
- NuGet: `dotnet add package`, `.csproj PackageReference`, NuGet-Feed-Referenz
- npm: `npm install`, `yarn add`, `pnpm add`, `package.json` mit privatem Registry

**Bei Auslöser: Orchestrator stellt Pflicht-Fragen — blockierend.**
Kein Plan wird erstellt bevor alle relevanten Felder beantwortet sind.

### PyPI-Checklist

1. Package-Quelle: PyPI-Standard / privater Feed / lokales .whl?
2. Falls privat: Feed-URL?
3. Credential-Typ: Token / Basic Auth?
4. Package-Existenz im Feed bestätigt (Test-Install oder Registry-Suche)?

⚠️ Hinweis: Privater PyPI-Feed → `--extra-index-url` verwenden, nicht `--index-url` (STORY-024).

### NuGet-Checklist

1. Feed-URL (JFrog Artifactory / Azure Artifacts / intern)?
2. Credential-Typ: API-Key / PAT?
3. nuget.config vorhanden oder generieren?
4. Package-Existenz im Feed bestätigt?

### npm-Checklist

1. Registry-URL (abweichend von registry.npmjs.org)?
2. .npmrc-Konfiguration vorhanden?
3. Token-Typ: npm token / PAT?
4. Package-Existenz im Registry bestätigt?

**Sobald alle Felder beantwortet:** weiter mit Phase 1+2.  
**Fehlende Antworten:** Orchestrator wartet — kein Plan ohne vollständige Checklist.

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
| Was bleibt voll | Voller Scribe, alle Gates, Test-First (§8/F1) — immer. Impl-Review: Standard 7 Reviewer. |
| `lean impl` (opt-in) | Reduziert Impl-Review auf 3 Reviewer (risk · craft · readiness) statt 7 — oder collapsed via `impl-quality-review-agent` (1 Agent, alle Lenses intern, 1 Approval statt 7 parallele). Scribes, Gates, Test-First bleiben voll. Aktivierung: `implementiere lean impl …` — explizit anfordern, kein Standard. Collapsed: `implementiere lean impl collapsed`. |
| Kombinierbar mit | Plan-only und End-to-end. **NICHT** mit From-existing-plan. |

*Framing:* Sicherer Default fuer den Normalfall. Fuer komplexe Features mit vielen Unbekannten explizit `strong` verwenden.

---

## Micro-Change-Modus (Fastpath)

Aktiviert durch zwei alternative Heuristiken:

**Heuristik A — Visual-Micro (alle vier Signale):**
1. Aenderung < 10 Zeilen gesamt
2. Genau eine Datei betroffen
3. Rein visuell (Zahl, Farbe, CSS, HTML-Attribut, Abstand) — kein Verhaltens-Delta
4. Kein neues Verhalten (keine neue Interaktion, kein Datenfluss-Delta)

**Heuristik B — Service-Micro (alle drei Signale):**
1. Aenderungen ausschliesslich in einem einzigen Service (ein Angular-Service/Component ODER ein .NET-Service)
2. Kein Schema-Change: keine Migration, kein neues Interface, kein neues DTO/Modell
3. Kein Cross-Service-Contract-Delta: keine API-Signatur-Aenderung, kein Shared-Model-Update

**Aktivierung:** Story hat `micro_change: true` (Heuristik A) oder `micro_change: service` (Heuristik B) im Frontmatter
**oder** Orchestrator erkennt alle Signale und kuendigt explizit an.

| Aspekt | Normal | Heuristik A (Visual) | Heuristik B (Service) |
|--------|--------|----------------------|-----------------------|
| Plan-File | Pflicht | entfaellt | entfaellt |
| Story-Status | `ready → planned → implemented` | `ready → implemented` | `ready → implemented` |
| Scribes | 1-10 Subagents | entfaellt — Orchestrator editiert direkt | Scribe bleibt (Scope kann > 10 Zeilen sein) |
| Reviewer | 7 (oder scope-adjusted) | 1 Reviewer: risk | 2 Reviewer: risk · craft |
| Delivery-Inspection | Pflicht | entfaellt | entfaellt |
| Build + Test | Pflicht | Pflicht | Pflicht |
| Test-First §8/F1 | Pflicht | Pflicht | Pflicht |

**Grenze:** Trifft auch nur eines der Signale der aktiven Heuristik nicht zu → kein Fastpath; normaler Flow.
Scope-Einschaetzung "klingt klein" reicht nicht — alle Kriterien muessen messbar zutreffen.

**Transparenz-Pflicht:**
- Heuristik A: `"Micro-Change erkannt (Visual) — Fastpath aktiv: direkter Edit, 1 Reviewer (risk), kein Plan-File."`
- Heuristik B: `"Micro-Change erkannt (Service-Scope) — Fastpath aktiv: Scribe, 2 Reviewer (risk · craft), kein Plan-File."`

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

MDC-Selektor-Annotationsliste: Bei Angular Material Major Release auf neue MDC-Klassen prüfen → `flows/planning-flow.md` Abschnitt `## MDC-Selektor-Annotationsliste` aktualisieren.
