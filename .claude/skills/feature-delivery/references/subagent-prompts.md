# Subagent-Prompts — feature-delivery

Vorlagen zum Kopieren. Platzhalter in eckigen Klammern ersetzen.

**Ausgabe-Stil aller Handoffs: MACHINE-DENSE** — Kein Fliesstext, keine Rollenwiederholung, Key:Value wo ausreichend. Deliverables zurück an den dispatchenden Agent (Plan-Orchestrator bzw. PL/Session-Treiber im Impl-Flow): MACHINE-DENSE. Review-Deliverables: BULLET-TERSE (User-sichtbar).

**Agent-Typ (Pflicht):** Profil unter `.claude/agents/`. **Modell:** Agent-Profil lesen; Slugs nicht in Prompts duplizieren.

**Compliance (Pflicht):** Vor jedem Subagent `subagent-delegation-boilerplate.md` in den Task-Prompt.

**Datei-Handoff (Impl-Review-Loop — Pflicht):** Reviewer und Scribes schreiben ihr Deliverable in **eine eigene Datei** unter dem vom PL (`implement-round-executor`) übergebenen Runden-Pfad `requests/plans/<feature>/iteration-N/round-M/` und geben **nur Datei-Pointer + Verdikt-Kurzform** zurück — **kein Report-Body im Agent-Return**. Verzeichnis-Layout, Dateinamen, Tabellen-Schema und Verdikt-Kurzformen: [secondbrain-schema.md](secondbrain-schema.md). Ein Return, der den vollen Report inline enthält, gilt als Regelverstoß gegen das Pointer-only-Format.

Vorlagen sind **Auftrags-Payloads** (Platzhalter) — kein Ersatz für Agent-Profile.

**Einstufungs-Kanon (bindend für alle Reviewer-Templates unten — Impl-Review + Delivery-Inspection):**
Jeder Reviewer liest und befolgt [reviewer-gate-canon.md](reviewer-gate-canon.md) (Linse = seine Rolle) —
Beleg-Pflicht, 🔴/🟡-Einstufung nach Konsequenz, Präferenz-Tripwire, Ausgabe-Format. Die Templates unten
spezifizieren nur die **linsen-spezifische** Prüfung + MCP-Pflichten; sie duplizieren den Kanon nicht. Der
Dispatcher (PL bzw. Terminal-PM) hängt den Kanon-Pointer an jeden Reviewer-Prompt.

---

## Planungs-Agents

### Plan-Orchestrator (plan-agent) — lean/solo

Plant alle Phasen solo (Opus). Kein Scout, kein Topic-Planer, kein Plan-Review-Loop, kein Plan-Fixer. Einzige Delegation: delivery-inspection Sub-Agents im Plan-Coverage-Check (Part A).

```text
Profil:plan-agent|Planungs-Orchestrator (lean/solo)|kein-Impl

Einstieg: Plan-only (Planung stoppt immer — kein Auto-Implement)
Ablauf + Phasen + Plan-Coverage-Check + §UA + §8/F1: vollständig in `.claude/agents/plan-agent.md` (lädt `planning-flow.md`)

Feature/Anforderung:
[Nutzer-Prompt — vollständig]

MCP-Pfade (Literale vor Versand eintragen):
  FE: [MCP_FRONTEND_PATH]
  BE-Projekte: [MCP_BE_PROJECTS]
  BE-Solution (optional): [MCP_BACKEND_SOLUTION]

Slug/Persistenz-Pfad: [requests/plans/plan-<feature>.md]
```

---

## Implementations-Agents

### Session-Treiber (Impl-Flow) — kein Agent-Profil

**Kein Subagent-Payload.** Dies ist der Ablauf, den die **aufrufende Session** selbst fährt (die
einzige persistente Instanz, FEAT-001/STORY-033). Die Session hält **nur** Index-Pointer +
PM-Verdikt-Kurzform; sie spawnt je Runde einen frischen PL und danach einen frischen PM via
Agent-Tool — **kein SendMessage über Runden hinweg**. Kein Reviewer-Report und kein Digest-Body
liegt je im Session-Fenster.

```text
Rolle: Session-Treiber (thin, pointer-only). Kein Produkt-Code außer Trivial-Edit-Fastpath (s. flow).

HARD GATE — Readiness (gilt für implementiere / implementiere nur / From-existing-plan):
  Plan vollständig? Akzeptanz→Test-Liste (§8/F1)? Umsetzungs-Topologie (IMP-Slices, Wellen, Blocking)?
  dev-mcp + codebase-analyzer erreichbar?  FAIL → Stop mit Blocker-Bericht, kein Impl-Start.

SECONDBRAIN anlegen (s. secondbrain-schema.md):
  requests/plans/<feature>/secondbrain-index.md anlegen; Aktuell: Iteration 1 · Runde 1 (= current_round=1); Cap 1/5.

INNER LOOP — je Runde M (frische Instanzen, datei-basierte Kontinuität):
  1. current_round M aus secondbrain-index.md LESEN.
     M > 5 (Cap) und Vorrunden-PM-Verdikt = fix (oder zurückgewiesener Exit) → STOPP: kein PL#M. Final-Gate
     (wenn Fix-Scribes in Runde 5 liefen): Build + Test via dev-mcp. Dann Aufteilung nach `Tier 🔴 offen`:
       🔴 == 0 → cap-erzwungener erbsenzaehlerei-exit → weiter wie Schritt 5b (Terminal-PM, DI, Closure + Rest-Findings-Bericht);
                 der Terminal-PM begründet die offenen 🟡 im pm-verdict-N.md mit „Cap erreicht — auf Folge-Story vertagt".
       🔴 > 0  → HARD-STOP: KEINE Closure, KEIN Terminal-PM-DI-Span, Story NICHT `reviewed` (bleibt `planned`). Rest-Findings-Bericht
                 (inkl. Liste der offenen 🔴) → gebündelte User-Eskalation (waiven / Cap ausnahmsweise erhöhen / abbrechen).
  2. Verzeichnis iteration-N/round-M/ anlegen.
  3. FRISCHEN PL spawnen: Agent(implement-round-executor) — Payload s. "PL — Round-Executor".
     Übergabe: Runden-Pfad, N/M, Planpaket-Pointer + Slice-IDs, (Fix-Runde:) PM-Was+Wie + Vorrunden-Digest-Pointer.
     PL-Rückgabe: NUR Pointer (digest.md + index) + Verdikt-Kurzform (inkl. Tier-Zähler 🔴/🟡). PL wird verworfen.
  4. FRISCHEN PM spawnen: Agent(implement-supervisor) — Payload s. "PM — Supervisor".
     Übergabe: index-Pointer + digest-Pointer + Story-Pfad + Iteration N. PM-Rückgabe: Verdikt-Kurzform. PM wird verworfen.
  5. Verdikt auswerten (Session hält nur Pointer + Verdikt):
     fix      → current_round++ → zurück zu Schritt 1 (nächster PL erhält PM-Was+Wie).
     escalate → gebündelte Nutzerfrage; warten; dann erneut ab Schritt 3 (Cap läuft weiter).
     clean / erbsenzaehlerei-exit → MECHANISCHER TIER-GUARD (Schritt 5a), dann ggf. Terminal-Span (Schritt 5b).

  5a. TIER-GUARD (reine Zähler-Arithmetik, kein Urteil): `Tier 🔴 offen` aus secondbrain-index.md LESEN.
      🔴 offen > 0  → Inner-Close ZURÜCKGEWIESEN → wie fix behandeln: current_round++ → Schritt 1
                      (bei current_round = 5: Cap greift → Schritt 1 stoppt via Cap-Regel).
      erbsenzaehlerei-exit zusätzlich: outer/pm-verdict-N.md prüfen — je offenes 🟡 eine Begründung?
                      fehlt eine  → nicht konform → wie fix behandeln.
      🔴 offen == 0 (und 🟡-Begründungen vollständig) → Inner-Close AUTORISIERT → Schritt 5b.

  5b. TERMINAL-PM-Span — zwei getrennte Mechanismus-Kanten (nicht verwechseln):
      • Session ↔ PM = SendMessage: die Session reaktiviert die in Schritt 5 pausierte, NOCH NICHT verworfene
        PM-Instanz per SendMessage (die EINZIGE Ausnahme zur Wegwerf-Kadenz — kein Runden-Übergang, sondern der
        Abschluss-Span DIESER Outer-Iteration; so liegt der Guard aus 5a nachweislich VOR dem Span, eine Instanz bleibt).
      • Terminal-PM → 5 DI-Reviewer = Vordergrund-Dispatch: der reaktivierte PM dispatcht die Reviewer SELBST als
        Vordergrund-Sub-Agents (identisch zum PL→Impl-Reviewer-Muster), sie schreiben di-finding-*.md + geben nur Pointer
        als direkte Rückgabe → di-digest bauen → Outer-Verdikt. NICHT die Session dispatcht die DI.
      Payload + Ablauf: "DELIVERY-INSPECTION → CLOSURE" in dieser Datei.

  ⚠️ Frischer PL UND frischer PM je Runde via Agent-Tool. Kein SendMessage-Fortsetzen einer
     Vorrunden-Instanz. Kadenz-Verstoß = Regelbruch (STORY-033). EINZIGE Ausnahme: der Terminal-PM-Span (5b).
  ⚠️ Der Tier-Guard (5a) ist NICHT verhandelbar: ein Erbsenzählerei-Exit bei offenem 🔴 wird
     deterministisch zurückgewiesen — ein Security-`critical` ist immer 🔴 und kann so nie durchgewunken werden.

Abschlussformat: "Abschlussformat (Session-Treiber)" aus dieser Datei.
```

---

### PL — Round-Executor (implement-round-executor) [NEU]

Frische, throwaway PL-Instanz für **genau eine** Runde. Mechanisch — dispatcht, sequenziert Gates,
liest Findings, baut Digest, aktualisiert Index. **Implementiert keinen Code, urteilt nicht.**

```text
Profil:implement-round-executor  (frisch je Runde — kein Vorrunden-Kontext)
Ablauf Schritt 0-6, Gate-Scope, Reviewer-Sets: `implement-round-executor.md` + `implementation-flow.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Runde:[N/M]
Planpaket-Pointer:[requests/plans/plan-<feature>.md — Slice-IDs, Umsetzungs-Topologie]
Nur Fix-Runde (M≥2): PM-Was+Wie:[Kurzform] · Vorrunden-Digest:[iteration-N/round-(M-1)/digest.md]
```

---

### PM — Supervisor (implement-supervisor) [NEU]

Frische, throwaway PM-Instanz je Runde. **Urteilsebene** — liest Index+Digest, fällt ein tier-gesteuertes
Urteil. Schreibt **nur** `outer/pm-verdict-N.md` (+ bei Requirement-Gap `outer/delta-N.md`). Bei Inner-Close
wird dieselbe Instanz zum **Terminal-PM** (s. DELIVERY-INSPECTION → CLOSURE).

```text
Profil:implement-supervisor  (frisch je Runde — kein Vorrunden-Kontext; bei Inner-Close: Terminal-PM)
Ablauf tier-gesteuertes Urteil (clean/erbsenzaehlerei-exit/fix/escalate), Terminal-PM-Span, Verboten-Liste: `implement-supervisor.md`

Index-Pointer:[requests/plans/<feature>/secondbrain-index.md]  (inkl. Tier-Zähler Tier 🔴/🟡 offen)
Digest-Pointer:[requests/plans/<feature>/iteration-N/round-M/digest.md]  (jede Finding-Zeile mit autoritativem Tier)
Story-Pfad:[requests/stories/STORY-XXX.md — für AC-Adressierung]
Iteration:[N — für den Pfad outer/pm-verdict-N.md]
```

---

### DELIVERY-INSPECTION → CLOSURE (Terminal-PM → Session)

Nach Inner-Loop-Abschluss mit `Tier 🔴 offen == 0` (PM `clean` / `erbsenzaehlerei-exit` nach bestandenem
Tier-Guard, inkl. cap-erzwungenem erbsenzaehlerei-exit bei 🔴==0). **Bei Cap mit 🔴 > 0 wird dieser Span
NICHT betreten** — dann Hard-Stop + User-Eskalation, keine Closure (s. INNER LOOP Schritt 1).
**Träger: der Terminal-PM** — dieselbe PM-Instanz, die den Inner-Loop geschlossen hat, von der Session per
SendMessage reaktiviert (die EINZIGE Ausnahme zur Wegwerf-Kadenz). Der **reaktivierte PM** (nicht die Session)
dispatcht die DI im Vordergrund, liest den di-digest und fällt den Outer-Verdikt in EINER Instanz. Danach
handelt die Session auf den Outer-Verdikt (Story-Status etc.).

```text
DELIVERY-INSPECTION → CLOSURE (Pflicht nach Inner-Loop — Pointer-Handoff, Notification-Trap strukturell gelöst):
  ✅ Warum kein Wait-Loop mehr: die DI-Reviewer schreiben je outer/di-N/di-finding-<rolle>.md und geben
     NUR Pointer + Kurzform zurück (kein Report-Body). Der Terminal-PM dispatcht sie im VORDERGRUND und
     wartet auf DIREKTE Pointer-Rückgaben — kein Background-Task, keine Completion-Notification, kein Poll.
     Der frühere Trap (STORY-031) war Background + Notification-Wait; entfällt hier per Konstruktion.

  Terminal-PM Schritt 1 — outer/di-N/ anlegen, dann 5 DI-Reviewer im Vordergrund dispatchen:
    Rollen: Revisor · Skeptiker · Abnahme · Dolmetscher · Querdenker (s. delivery-inspection/SKILL.md).
    Kontext je Reviewer: originale Story-ACs + finaler Diff/Touched-Paths + Gate-Status + Inner-Loop-Summary
      + Pfad outer/di-N/ + Kanon-Pointer reviewer-gate-canon.md (Linse = DI-Rolle; §1/§3/§6-Disziplin — di-finding-Format bleibt Kategorie). Constraint (delivery-inspection): kein eigenständiger Tool-Call außer dem Schreiben
      der eigenen di-finding-<rolle>.md. Rückgabe je Reviewer: Pointer + Kurzform (Kategorie-Vorschlag).
  Terminal-PM Schritt 2 — di-digest.md bauen + Outer-Verdikt:
    di-finding-*.md LESEN → outer/di-N/di-digest.md konsolidieren (Roll-up: Impl-Gaps/Req-Gaps/Unklar).
    Outer-Verdikt (autoritative Klassifikation) in outer/pm-verdict-N.md, Abschnitt Outer-Verdikt, schreiben:
      OK                 → keine Gaps.
      Implementation-Gap → das Richtige nicht korrekt umgesetzt (AC nicht erfüllt).
      Requirement-Gap    → das Falsche / neuer Scope → outer/delta-N.md schreiben (Format s. secondbrain-schema.md).
      Unklar             → Ambiguität → eine gebündelte Nutzerfrage.
    Rückgabe an die Session: OUTER-VERDIKT-Kurzform + Pointer (kein di-Body).

  Session Schritt 3 — auf den Outer-Verdikt handeln (Story-Status setzt NUR die Session; volles `implementiere` → `reviewed`, s. SKILL.md Story-Gate Schritt 5 A):
    OK                 → Story-Datei [story-path] status: reviewed → Abschlussformat ausgeben.
    Implementation-Gap → Fix-Scribe → Inner Loop zurück (frische PL/PM-Runden; Cap läuft weiter).
    Requirement-Gap    → nächste Outer-Iteration ab Schritt 1 mit FRISCHEM PM (Input: outer/delta-N.md).
    Unklar             → auf User-Antwort warten → Terminal-PM/Session klassifiziert neu.
  Opt-out (skip-delivery-inspection): Session setzt Story-Status trotzdem auf reviewed,
    Opt-out-Grund im Abschlussformat unter "## Closure" vermerken.
```

---

### Scribe Runden 1-3 (implement-scribe-agent) [NEU]

Implementiert genau einen Plan-Slice (IMP-*). Sonnet, Runden 1–3.

```text
Profil:implement-scribe-agent
Ablauf RED→GREEN, MCP-Build/Test, OnPush-Regel, Datei-Handoff: `implement-scribe-agent.md`
Test-Design-Referenz: .claude/skills/test-design/

Slice-ID:[z.B. IMP-FE-Search-Rules]
Welle:[z.B. W1 — parallel mit IMP-BE-GW-Logging]
Working directory:[absoluter Windows-Pfad C:\...]
SecondBrain-Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/ — vom PL]

Task-Pointer:[tasks/task-NNN.md]
Read-Scope: nur diese Task-Datei lesen — kein Ganzplan-Inline, tasks/index.md NICHT lesen
```

⚠️ **Handoff-Regression:** Ein Handoff, der den vollständigen Plan-Text oder Task-Body inline überträgt (statt Task-ID-Pointer), verletzt den Umsetzer-Input-Contract (STORY-009) und gilt als Regelverstoß.

---

### Scribe Runden 4-5 (implement-scribe-opus-agent) [NEU]

Identisch zu implement-scribe-agent (Runden 1–3), aber auf Opus eskaliert. Aktiviert nach Runde 3, wenn Findings persistieren.

```text
Profil:implement-scribe-opus-agent

Slice-ID:[z.B. IMP-FE-Search-Rules — Fix-Slice]
Welle:[Fix-Welle — Runde [4|5]]
Working directory:[absoluter Windows-Pfad C:\...]
SecondBrain-Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/ — vom PL]

Task-Pointer:[tasks/task-NNN.md]
Read-Scope: nur diese Task-Datei lesen — kein Ganzplan-Inline, tasks/index.md NICHT lesen

Kontext (Eskalation):
  Dies ist Runde [4|5] — Eskalation nach erfolgloser Runde 3.
  Fix-Teilplan (vom Fix-Planer): [vollständig]
  Rest-Findings aus vorheriger Runde: [vollständig]

Test-Design-Referenz: .claude/skills/test-design/

Aufgabe: identisch zu implement-scribe-agent (ZWEISTUFIG: RED → GREEN).
Zusatz Eskalations-Kontext: Fix-Teilplan und Rest-Findings sind verbindliche Vorgabe.
Keine Eigeninitiative jenseits des Fix-Teilplans.

**Angular Hard Rules — OnPush + async-Listen (Pflicht):**
In Komponenten mit `changeDetection: ChangeDetectionStrategy.OnPush` müssen
async-geladene Listen-Properties als Signal deklariert werden:
  ✅ `readonly options = signal<OptionType[]>([])`  → `this.options.set(data)` im Subscribe
  ❌ `options: OptionType[] = []`                  → `this.options = data` triggert keine CD
Gilt für jede Property die nach ngOnInit/Subscribe befüllt wird.

Pfade: Windows-Absolutpfade (C:\...) für alle dev-mcp-Calls.

Post-Scribe-Verifikation (Pflicht — MCP-First):
  mcp__dev-mcp__read_files_batch([alle Touched Paths]) — kein natives Read/Grep.
  Verifikations-Ergebnis im Summary festhalten.

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [SecondBrain-Runden-Pfad]/scribe-<slice>.md mit: Summary (Red/Green-Phase-Ergebnis),
Touched Paths, Build/Test-Matrix (Pflicht), offene Risiken/Blocker.

Rückgabe an den PL (Round-Executor): NUR Pointer + Verdikt-Kurzform
`scribe-<slice>.md · <RED|GREEN> · Dateien:<n> · build:<ok|fail> test:<ok|fail>` — kein Summary-Body inline.
(Touched Paths liest der PL aus der Datei.)
```

---

### Implementierer (Slice — compact)

Für Slices **ohne** slice-scoped Build/Test oder als Kurzform.

```text
You are a subagent for a fixed-scope implementation task.

Context:
- Final plan summary: [1-3 bullets]
- Your slice only: [boundaries, files/areas if known]

Required when the plan section **Umsetzungs-Topologie** is present:
- **Slice-ID:** [e.g. IMP-FE-Search-Rules]
- **Wave:** [e.g. W1 — parallel with IMP-BE-GW-Logging]

Rules:
- **Agent:** `implement-agent`.
- **Build/Test:** slice-scoped allowed.
- **Not allowed:** stack-wide Technik-Gate (Schritt 3 after integration).
- **Plan adherence:** Implement only this slice — no silent plan drift.
- **Test-First (§8):** write/update tests before implementation; verify Red before Green.

Reply with: summary, touched paths, open risks/blockers.
```

---

### Implementierer (Slice — Build/Test)

Standard-Vorlage für Schritt-2-Task-Prompts mit slice-scoped Build/Test.

```text
You are an implementation subagent for ONE plan slice (IMP-*) only.

Slice-ID: [e.g. IMP-FE-Search-Rules]
Working directory: [absolute Windows path C:\...]

Test-First (§8 — Pflicht):
  Schritt 1: Tests gemäß Akzeptanz→Test-Liste schreiben — neue/erweiterte Tests erst fehlschlagen lassen (Red).
  Schritt 2: Implementieren bis Tests grün (Green).
  Test-Design-Referenz: .claude/skills/test-design/ (Namenskonvention, AAA, Magic Strings).

Hard rules:
- **Agent:** `implement-agent`. **Slice scope only** — not stack-wide Technik-Gate.
- **Pre-Coding (wenn dev-mcp verfügbar):** Vor erstem Code-Edit —
  `read_class_summary` oder `read_signatures_only`; `read_method` nur für konkrete Änderungsmethode.
- **Build/Test (slice-scoped):** dotnet/ng build/test for this slice only.
  Pfade: Windows-Absolutpfade (C:\...) für alle dev-mcp-Calls.
- **Forbidden:** stack-wide Technik-Gate; silent scope expansion.

Reply with: summary, touched paths, Build/Test-Matrix per run (Pflicht), blockers.
```

---

### Fix-Planer (implement-fix-planner-agent)

```text
Profil: implement-fix-planner-agent.
Du erstellst einen Fix-Teilplan, implementierst NICHT.

Pflicht-Rules (0-4):
0) agent-compliance.md
1) feature-delivery/flows/implementation-flow.md
2) codebase-analyzer/SKILL.md
3) angular-developer/SKILL.md / backend-ef-migrations/SKILL.md (falls Scope passt)
4) test-design/SKILL.md (Testfall-Reparaturen)

Input:
- Finales Planpaket + Akzeptanz→Test-Liste
- Review-Digest (7 Rollen) + Gate-Findings
- Technik-Gate-Status je Stack
- klassifizierte Findings
- Diff-/Pfadliste

MCP-Reihenfolge A-H (verbindlich):
A index_project + find_in_index
B review_git_diff (alle 5 focusAreas)
C review_files_batch/review_file
D analyze_complexity + analyze_refactoring_safety
E detect_untested_public_api
F analyze_test_quality
G find_symbol_references
H compare_validation_rules

Liefern:
1) Konkrete Fix-Schritte (Datei/Symbol/Reihenfolge)
2) Scope (Stack/Topic)
3) Lokale ACs + referenzierte Akzeptanz→Tests
4) Risiken/offene Punkte
5) Vorgeschlagene IMP-Slice-IDs + Wellen/Blocking
6) Abgrenzung (nicht anfassen)
7) Evidenz-Basis (Pflicht): MCP-Calls + ok/fallback + Gate-Bezug je Slice
8) Dedup: Überschneidungen codebase-analyzer / inspectcode / ArchUnit bereinigen
```

---

### Impl-Review-Design-Principles (implement-review-design-principles-agent)

```text
Profil:implement-review-design-principles-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Design-Principles, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-design-principles-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
Gate-2-Status (inkl. analyze_iosp_compliance-Befunde):[…]
```

---

### Impl-Review-Risk

```text
Profil: implement-review-risk-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Risk, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-risk-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
Gate-Status (Build, Statische Analyse, Tests):[…]
```

---

### Impl-Review-Verifier

```text
Profil: implement-review-verifier-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Verifier, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-verifier-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

---

### Impl-Review-Readiness

```text
Profil: implement-review-readiness-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Readiness, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-readiness-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
Gate-Status:[…]
```

---

### Impl-Review-Craft

```text
Profil: implement-review-craft-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Craft, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-craft-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

---

### Impl-Review-Auditor

```text
Profil: implement-review-auditor-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Auditor, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-auditor-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

---

### Impl-Review-Guard

```text
Profil: implement-review-guard-agent (schreibt nur die eigene finding-Datei)
Kanon-Pointer: `reviewer-gate-canon.md` (Linse = Guard, bindend)
Ablauf + Prüfschritte + MCP + Datei-Handoff: `implement-review-guard-agent.md`

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

---

### Review-Digest (Implement)

Vom PL (Round-Executor) durch **Lesen** der `finding-*.md` der Runde gebaut → als `iteration-N/round-M/digest.md`
persistiert. Nicht aus Agent-Returns zusammengesetzt. Der Fix-Planer der Folgerunde erhält den `digest.md`-Pointer.

```text
### Review-Digest (Iteration [N])

#### Risk
- 🔴 Punkt 1: ...
- 🟡 Punkt 2: ...

#### Design-Principles
- 🔴 Punkt 1: ...
- 🟡 Punkt 2: ...

#### Verifier
- Punkt 1: ...
- AC-Map: [vollständig | fehlend: Liste]

#### Readiness
- Ship-Readiness: [SHIP | CONDITIONAL | NO-SHIP]
- Punkt 1: ...

#### Craft
- Punkt 1: ...

#### Auditor
- 🔴 Punkt 1: ...
- Go/No-Go: ...
- Note: ...

#### Guard
- PRESERVE: ...
- Erfüllte ACs: ...
```

---

### Abschlussformat (Session-Treiber)

```text
## Summary
- Ergebnis vs. Plan: [complete | partial]
- Iterationen: [Anzahl] von max. 5
- Loop-Ende: [sauber | Maximum mit Rest-Findings]

## Quality Gates (letzte Iteration)
- Gate 1 Build: [OK/FAIL]
- Gate 2 Statische Analyse: [OK/FAIL/WARNINGS — Findings: run_inspectcode / ArchUnit / lint / codebase-analyzer / iosp_compliance]
- Gate 3 Design-Principles-Review: [OK/FAIL]
- Gate 4 Test-Suite: [OK/FAIL]

## Iterativer Review-Loop
- Reviews je Iteration: 7 Rollen ausgeführt [ja/nein]
- Fix-Planer je Iteration: [vorhanden + Evidenz-Basis ja/nein]
- Umgesetzte Fix-Slices: [Liste]
- Akzeptanz-Coverage (Verifier): [vollständig | fehlend: Liste]
- Letzte Iteration ohne behebbares Finding: [ja/nein]

## Rest-Findings (nur bei Maximum mit offenen Punkten)
- Risk: [Punkte oder —]
- Design-Principles: [Punkte oder —]
- Verifier: [Punkte oder —]
- Readiness: [Punkte oder —]
- Craft: [Punkte oder —]
- Auditor: [Punkte oder —]
- Guard: [Punkte oder —]

## Offene Punkte
- [falls vorhanden; bei Rest-Findings hier Empfehlung]

## Closure
- Story-Status: reviewed — [Story-Pfad]   (volles `implementiere` mit Inner-Loop + Delivery-Inspection; `implementiere nur` setzt stattdessen `implemented`/`blocked` — s. SKILL.md Story-Gate Schritt 5)
- Delivery-Inspection: [N Iteration(en) sauber | skip — Grund: ...]
```
