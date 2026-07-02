# Implementations-Flow

Verbindliche Prompt-Vorlagen und Review-Raster: [../references/subagent-prompts.md](../references/subagent-prompts.md).

**Datei-Handoff (SecondBrain):** Reviewer und Scribes schreiben ihr Deliverable in eine eigene Datei und geben nur Pointer + Verdikt-Kurzform zurück; der **PL** (`implement-round-executor`, frisch je Runde) liest die Dateien und baut den Digest daraus. Verzeichnis-Layout, Dateinamen und Tabellen-Schema: [../references/secondbrain-schema.md](../references/secondbrain-schema.md).

**Rollen-Split (STORY-033):** Der Impl-Fix-Loop laeuft nicht in einer lang lebenden Orchestrator-Instanz, sondern in **dünnem Session-Treiber + throwaway PL + throwaway PM je Runde**. Kadenz: frischer PL UND frischer PM pro Runde via Agent-Tool — kein SendMessage über Runden hinweg. Kontinuität rein datei-basiert. Rollenbild: [../SKILL.md → Rollenbild Impl-Fix-Loop](../SKILL.md).

---

*Architektur-Uebersicht: [../SKILL.md → Zwei-Schleifen-Architektur](../SKILL.md)*

---

## ⚠️ MCP-First Build/Test — Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Build- oder Test-Lauf als Shell-Kommando — immer MCP.**

| Aufgabe | MCP-Tool | MCP-Server | VERBOTEN |
|---------|----------|-----------|---------|
| Angular Build | `build_angular_project` | dev-mcp | Shell `ng build` |
| Angular Test | `test_angular_project` | dev-mcp | Shell `ng test` |
| Angular Lint | `lint_angular_project` | dev-mcp | Shell `ng lint` |
| .NET Build | `build_dotnet_solution` | dev-mcp | Shell `dotnet build` |
| .NET Test | `test_dotnet_solution` | dev-mcp | Shell `dotnet test` |
| .NET Inspectcode | `run_inspectcode` | dev-mcp | Shell `jb inspectcode` |

**MCP nicht erreichbar → Hard Stop:**
`"⚠️ BLOCKER: dev-mcp nicht erreichbar — kein Build/Test-Lauf starten."`
Kein Shell-Fallback ohne explizite Nutzerfreigabe.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## ⚠️ Rollen-Delegation-Pflicht — Anti-Shortcut-Regel

**Weder PL noch PM schreiben Produkt-Code selbst — immer Scribes. Der PM urteilt (und schreibt nur seinen eigenen Urteils-Audit-Trail `outer/pm-verdict-N.md` / `outer/delta-N.md`).**

**Verboten:**
- PL schreibt Produkt-Code statt an Scribe/Fix-Planer zu delegieren
- PM editiert Produkt-Code, `finding-*.md`, Digest oder Index (seine einzigen Schreib-Dateien sind `outer/pm-verdict-N.md` + `outer/delta-N.md`)
- PM stuft ein 🔴 herab / behandelt ein Security-`critical` als 🟡/🟢
- Session weist einen Erbsenzählerei-Exit bei offenem 🔴 **nicht** zurück (Tier-Guard übersprungen)
- PL- und Implementierer-Rolle in einem Turn zusammenlegen
- Session-Treiber uebernimmt PL- oder PM-Arbeit inline statt frische Instanzen zu spawnen
- SendMessage-Fortsetzen einer PL-/PM-Instanz ueber Runden hinweg (jede Runde: frisch via Agent-Tool) — **einzige Ausnahme:** der Terminal-PM setzt DIESELBE Instanz über den Inner-Close→Outer-Span fort (kein Runden-Übergang)
- Kein Hard Gate / kein 7x Review-Loop trotz abgeschlossener Implementierung

**Ausnahme: Micro-Change-Modus** — wenn Fastpath explizit aktiviert (s. SKILL.md `## Micro-Change-Modus`):
Session-Treiber editiert direkt, 1 Reviewer (risk), kein Plan-File, kein Scribe, kein PL/PM-Split.
Muss angekuendigt worden sein: *"Micro-Change erkannt — Fastpath aktiv."*

**Ausnahme: `implementiere nur` (Lean Single-Pass)** — wenn der Nutzer `implementiere nur` triggert
(s. Abschnitt „Implementiere-nur-Einstieg" unten): Der Session-Treiber dispatcht Scribes **direkt** fuer
einen Einzeldurchlauf und faehrt Build/Test bis gruen (max. 5 Fix-Versuche) — **kein** PL, **kein** PM,
**keine** Runden, **keine** Reviewer, **kein** SecondBrain, **keine** Delivery-Inspection. Der Verzicht
auf PL/PM ist hier regelkonform; Scribes bleiben Pflicht (kein Session-eigener Produkt-Code ausser dem
Trivial-Edit-Fastpath). Green → `implemented`, rot nach 5 Versuchen → `blocked`.

**Transparenz-Pflicht vor Schritt 2:** Im Chat ausgeben:
`"Starte jetzt implement-round-executor (PL) fuer Runde [M]…"` bzw. der PL:
`"Starte jetzt implement-scribe-agent fuer Slice [IMP-*]…"`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## From-existing-plan-Einstieg

- Laedt `requests/plans/plan-<feature>.md`
- **Hard Gate laeuft trotzdem** — prueft Umsetzbarkeit des geladenen Plans
- Ueberspringt den gesamten Planungs-Flow
- Dann: direkt in den Implementations-Flow (ab Hard Gate) — **volle Loops** (Inner + Outer), Story → `reviewed`

---

## Implementiere-nur-Einstieg (Lean Single-Pass — ohne Reviewer/PL/PM/SecondBrain)

**Trigger:** `implementiere nur <Story>`. Der bewusst schlanke Gegenpol zum vollen Impl-Fix-Loop:
wendet den vorhandenen Plan Slice fuer Slice an und faehrt slice-scoped Build/Test bis gruen — **ohne**
Inner-Loop-Runden, **ohne** die 7 Reviewer, **ohne** PL/PM-Rollen, **ohne** SecondBrain
(`secondbrain-index.md` / `digest.md` / `finding-*.md`) und **ohne** Outer-Delivery-Inspection.

**Getrieben vom Session-Treiber** (keine PL/PM-Instanzen — dokumentierte Ausnahme zur Rollen-Delegation-Pflicht, s. o. und SKILL.md Anti-Shortcut-Regel). Scribes bleiben Pflicht: **kein** Direkt-Edit durch die Session ausser dem Trivial-Edit-Fastpath (Schritt 2).

**Voraussetzung:** Story `status: planned` mit `plan`-Referenz (oder expliziter Plan via From-existing-plan). Auf `status: ready` **ohne** Plan → STOPP + Hinweis „erst `plane` ausfuehren" (Gate in SKILL.md Story-Gate Schritt 2). Kein Auto-Planning.

**Ablauf:**

1. **Mini-Readiness (leichtgewichtig):** Plan geladen? Akzeptanz→Test-Liste (§8/F1) und Slice-Grenzen vorhanden? dev-mcp erreichbar? Nein → Stop mit Blocker-Bericht. **Kein SecondBrain anlegen** (kein `secondbrain-index.md`).
2. **Scribe-Einzeldurchlauf:** je Slice genau **ein** Scribe (`implement-scribe-agent`, Sonnet), zweistufig Test-First (§8): (1) Tests nach Plan-Akzeptanzliste — zuerst Red (F2); (2) Implementierung bis gruen. Topologie aus Plan (sequenziell/parallel). **Kein** zweiter Scribe-Durchlauf, **keine** Review-Runde, **kein** Fix-Planer.
3. **Slice-Coverage-Check:** je IMP-* Slice mindestens ein Touched Path (wie im vollen Flow) — fehlender Slice = BLOCKER; Fix-Scribe fuer genau diesen Slice, dann erneut pruefen (zaehlt noch nicht als Fix-Versuch — betrifft die Vollstaendigkeit, nicht Build/Test).
4. **Build/Test bis gruen — max. 5 Fix-Versuche (Session-Zaehler):**
   - Integrationsweiter Build + Test via dev-mcp; Stack-Scope wie im vollen Flow (Gate-1-Build + Gate-4-Tests). **Keine** statische Analyse, **keine** Reviewer, **kein** `review_git_diff`.
   - Erster Build/Test-Lauf gruen → direkt zu Schritt 5 (0 Fix-Versuche noetig).
   - Rot → **einen** Fix-Scribe (`implement-scribe-agent`) mit dem konkreten Build-/Testfehler beauftragen (kein Fix-Planer, kein PM-Urteil), Fix-Versuch-Zaehler +1, dann erneut Build/Test.
   - Wiederholen bis gruen **oder** bis Fix-Versuch 5 gelaufen ist. **MCP-First bleibt Pflicht** — Build/Test niemals als Shell-Kommando (s. Anti-Shortcut-Regel oben).
5. **Abschluss (Session-Treiber setzt Story-Status, SKILL.md Story-Gate Schritt 5 B):**
   - Gruen innerhalb von ≤ 5 Fix-Versuchen → Story `status: implemented` (roh umgesetzt, nicht reviewed) + Kurz-Meldung.
   - Nach dem 5. Fix-Versuch weiterhin rot → **STOPP**: Story `status: blocked` (**nicht** `implemented`) + Meldung an den Nutzer mit letztem Fehler und Kurz-Diagnose. Kein weiterer Versuch ohne neue Nutzer-Entscheidung.

**Abgrenzung:**
- `implementiere lean impl` reduziert die Impl-Review auf 3 Reviewer, behaelt aber PL/PM/SecondBrain/Inner-Loop. `implementiere nur` hat **gar keine** Review-Ebene und **keinen** Inner-Loop.
- Volles `implementiere` laeuft mit Inner-Loop (max. 5 Runden, PL/PM, 7 Reviewer) + Outer-Delivery-Inspection → Story `reviewed`.

---

## Subagent-Typen und Agent-Definitionen

**Modellwahl** ausschliesslich in `.claude/agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

### Rollen im Implementations-Flow

| Rolle | Schritt | Modell | Agent-Datei |
|-------|---------|--------|-------------|
| **Session-Treiber** | Treiber: Hard Gate, Rundenzähler, Max-5-Cap, **mechanischer Tier-Guard** (weist Exit bei offenem 🔴 zurück), Closure, Story-Status | — (die aufrufende Session, kein Agent-Profil) | dokumentiert in SKILL.md + diesem Flow |
| **PL — Round-Executor** | je Runde: (Fix-Planer →) Scribes → Integration-Checkpoint → Gates → Reviewer → digest.md **+ autoritative Tier-Vergabe (🔴/🟡/🟢) + Tier-Zähler in Index** | Opus | `.claude/agents/implement-round-executor.md` |
| **PM — Supervisor** | je Runde: Urteil clean / erbsenzaehlerei-exit / fix (Was+Wie) / escalate. **Terminal-PM** (bei Inner-Close): DI-Dispatch + Outer-Verdikt in einer Instanz | Opus | `.claude/agents/implement-supervisor.md` |
| **Scribe Runden 1-3** | Slice-Implementierung | Sonnet | `.claude/agents/implement-scribe-agent.md` |
| **Scribe Runden 4-5** | Eskalation — nur wenn > 30 LOC oder Komplexitaets-Fehlschlag | Opus | `.claude/agents/implement-scribe-opus-agent.md` |
| **Risk** | Review | Opus | `.claude/agents/implement-review-risk-agent.md` |
| **Design-Principles** | Review | Opus | `.claude/agents/implement-review-design-principles-agent.md` |
| **Verifier** | Review | Sonnet | `.claude/agents/implement-review-verifier-agent.md` |
| **Readiness** | Review | Sonnet | `.claude/agents/implement-review-readiness-agent.md` |
| **Craft** | Review | Sonnet | `.claude/agents/implement-review-craft-agent.md` |
| **Auditor** | Review | Sonnet | `.claude/agents/implement-review-auditor-agent.md` |
| **Guard** | Review | Sonnet | `.claude/agents/implement-review-guard-agent.md` |
| **Fix-Planer** | Fix-Planung | Opus | `.claude/agents/implement-fix-planner-agent.md` |

---

## Implementations-Flow-Struktur

```
Hard Gate (Readiness)              SESSION-TREIBER (die aufrufende Session — persistent, thin)
   │  (gilt fuer volles `implementiere` UND From-existing-plan — NICHT fuer `implementiere nur`, s. Lean-Single-Pass-Abschnitt oben)
   │  Prueft Umsetzbarkeit des Plans (Scope, ACs, Akzeptanzliste, Slices)
   │  Legt requests/plans/<feature>/secondbrain-index.md an; setzt current_round=1
   │
   ▼  ┌─ RUNDE M (Session spawnt je Runde frischen PL — implement-round-executor, Opus) ─┐
   │  │  (Fix-Runde M≥2: PL dispatcht ZUERST implement-fix-planner-agent mit PM-Was+Wie
   │  │   + Vorrunden-Digest-Pointer → konkreter Fix-Teilplan)
   ▼  Scribes 1-10 (parallel oder sequenziell je Topologie)
        Runden 1-3: implement-scribe-agent (Sonnet)
        Runden 4-5: implement-scribe-opus-agent (Opus)

        Je Scribe ZWEISTUFIG (Test-First, §8):
          1) Tests schreiben/aktualisieren — 1:1 nach Plan-Akzeptanzliste (Red)
             Neue/erweiterte Tests MUESSEN zuerst fehlschlagen (F2)
          2) Implementierung bis Tests gruen (Green)

        Je Scribe: NUR slice-scoped Build/Test via dev-mcp
   │
   ▼  Integration-Checkpoint (nach Merge ALLER Scribes, NICHT pro Scribe)
        - Slice-Coverage-Check (Pflicht, vor Gates): je IMP-* Slice mind. 1 Touched Path
          → fehlender Slice = BLOCKER; kein Gate-Start, kein Review-Start
        - Scribe-Dateien lesen (scribe-<slice>.md → Summaries, Touched Paths) — kein Payload-Empfang
        - Geaenderte Stacks klassifizieren → Gate-Scope
        - Interface-/Contract-Drift pruefen
   │
   ▼  QUALITY GATES (integrationsweit — NICHT pro Scribe):

        Gate-Scope richtet sich nach den geaenderten Stacks (aus Integration-Checkpoint):

        | Stack         | Gate 1 Build               | Gate 2 Statische Analyse                              | Gate 4 Tests                  |
        |---------------|----------------------------|-------------------------------------------------------|-------------------------------|
        | Angular only  | build_angular_project      | lint_angular_project, review_git_diff                 | test_angular_project          |
        | .NET only     | build_dotnet_solution      | run_inspectcode, ArchUnitNET, review_git_diff          | test_dotnet_solution          |
        | Angular + .NET| build_angular_project      | lint_angular_project, run_inspectcode,                | test_angular_project          |
        |               | build_dotnet_solution      | ArchUnitNET, review_git_diff, analyze_iosp_compliance | test_dotnet_solution          |

        Nur die zum Stack passenden Tools laufen — kein Stack ohne Aenderung wird gebaut oder getestet.

        1. BUILD (muss gruen — Vorbedingung)
             build_dotnet_solution / build_angular_project (dev-mcp)
             Ohne gruenen Build kein Gate 2/3/4
             Nach Gate 1: `warnings`-Array aus Build-Response auslesen.
             Nicht-leere Warnings → als Befunde sammeln, an alle 7 Reviewer + Fix-Planer als Evidenz weitergeben.

        2. STATISCHE ANALYSE (parallel, nach grunem Build):
             • run_inspectcode               (dev-mcp) → token-opt. JSON
             • ArchUnitNET-Tests             via test_dotnet_solution (dev-mcp)
             • lint_angular_project          (dev-mcp) — nur wenn ESLint konfiguriert:
                  Vor Aufruf prüfen: `.eslintrc.*` ODER `eslint.config.{js,mjs,cjs}` vorhanden
                  ODER `eslint`-Eintrag in `angular.json`.
                  Wenn nicht konfiguriert: überspringen + Hinweis ausgeben:
                  "ESLint nicht konfiguriert — Setup gehört ins §2-Bootstrap."
                  → ng lint inkl. eslint-plugin-boundaries
             • review_git_diff               (codebase-analyzer)
                  alle 5 focusAreas: security · performance · api-validation
                                     angular-best-practices · solid
                  Befunde speisen als Evidenz die 7 LLM-Reviewer
             • analyze_iosp_compliance       (codebase-analyzer, nachgelagert Strang 5/6)
                  IOSP-Befunde je Methode; ArchUnit-IOSP-Regel bleibt Backstop

        3. DESIGN-PRINCIPLES-REVIEW: implement-review-design-principles-agent (Opus)
             Prueft Code auf vollstaendiges Design-Principles-Spektrum (IODA/IOSP, SOLID, persoenliche Regeln, DDD)
             IOSP-Mechanik: bis Strang-6-Deployment prueft design-principles-agent IOSP fuer Angular selbst

        4. TEST-SUITE: test_dotnet_solution / test_angular_project (dev-mcp)
             Gruen = Akzeptanzkriterien erfuellt (§8/F2)
   │
        **Parallel-Pattern (Pflicht nach Gate 1):** Tests (Gate 4) UND 7 Reviewer-Agents
        starten im selben parallelen Message-Block — zeitgleich nach gruenem Build.
        Tests haben null Abhaengigkeit vom Review-Output. Kein sequenzielles Warten:
          ❌ Warte auf alle Reviewer → dann starte Tests
          ✅ Starte Tests + Reviewer im selben Block → sammle alle Ergebnisse

        **Change-Scope-Classifier (vor Reviewer-Start — Pflicht):**
        Klassifiziere den Scope anhand der vom Scribe geaenderten Dateien:

        | Scope | Erkennungszeichen | Reviewer-Set |
        |-------|-------------------|--------------|
        | micro-change A | Story `micro_change: true` ODER alle vier Signale: 1 Datei, < 10 Zeilen, rein visuell, kein Verhaltens-Delta | 1 Reviewer: risk (Fastpath — kein Scribe, kein Plan-File) |
        | micro-change B | Story `micro_change: service` ODER: 1 Service, kein Schema-Change, kein Contract-Delta | 2 Reviewer: risk · craft (kein Plan-File; Scribe bleibt) |
        | lean impl | `implementiere lean impl` Trigger aktiv | 3 Reviewer: risk · craft · readiness — ODER 1 `impl-quality-review-agent` (collapsed, bei `lean impl collapsed`) |
        | md-only | Ausschliesslich `.md`-Dateien; kein `.ts`, kein `.cs`, kein Code | 3 Reviewer: risk · guard · readiness |
        | CSS/HTML-only | Ausschliesslich `.html`/`.scss`/`.css`; kein `.ts`, kein Backend | 4 Reviewer: Structure · CSS-Logic · AC-Coverage · Regression |
        | Single-Service | `.ts`-Dateien eines Angular-Services/Components oder eines .NET-Services | Standard-7-Reviewer |
        | Cross-Service | Aenderungen in ≥2 Services, BE+FE gemeinsam, Migrations | Standard-7 + Integration-Reviewer |

        → Scope einmal klassifizieren; Ensemble entsprechend starten; nicht nachjustieren.
   │
   ▼  Reviewer parallel (schreiben je eine finding-<reviewer>.md, Rückgabe nur Pointer) — Anzahl laut Change-Scope-Classifier:
        Standard-7:          risk (O) · design-principles (O) · verifier (S) · readiness (S) · craft (S) · auditor (S) · guard (S)
        md-only:             risk (O) · guard (S) · readiness (S)
        lean-impl-3:         risk (O) · craft (S) · readiness (S)
        lean-impl-collapsed: 1× impl-quality-review-agent (S) — alle Lenses intern, 1 Approval

        verifier prueft zusaetzlich:
          - Fachliche Korrektheit (kein anderer Reviewer)
          - Explizite AC-Map: jedes Akzeptanzkriterium einzeln auf Test gemappt (§8/F4)

        codebase-analyzer review_git_diff-Befunde → speisen als Evidenz alle Reviewer
   │
   ▼  Digest: PL LIEST finding-*.md → baut iteration-N/round-M/digest.md
        (kein Report-Body im PL-Return; autoritative Tiers 🔴/🟡/🟢 vergeben; secondbrain-index.md aktualisieren: current_round=M, Cap M/5, Zähler + Tier-Zähler)
   │
   ▼  PL-Rückgabe an Session: NUR Pointer (digest.md + index) + Verdikt-Kurzform (inkl. Tier-Zähler). PL wird verworfen.
   │  └────────────────────────────────────────────────────────────────────────────────────────────┘
   │
   ▼  ┌─ Session spawnt frischen PM (implement-supervisor, Opus) auf Index+Digest-Pointer ─┐
   │  │  PM liest Index+Digest (zuerst Tier 🔴 offen) → EIN Urteil: clean / erbsenzaehlerei-exit / fix (Was+Wie) / escalate.
   │  │  Editiert nur outer/pm-verdict-N.md (+ delta-N.md bei Req-Gap). Rückgabe: Verdikt-Kurzform (+ Tier-Zähler).
   │  │  Bei Inner-Close (clean/erbsenzaehlerei-exit): dieselbe Instanz wird nach dem Tier-Guard zum Terminal-PM.
   │  └───────────────────────────────────────────────────────────────────────────────────┘
   │
   ▼  SESSION entscheidet + MECHANISCHER TIER-GUARD (liest current_round + `Tier 🔴 offen` aus secondbrain-index.md VOR nächstem Spawn):
        clean / erbsenzaehlerei-exit → TIER-GUARD (reine Zähler-Arithmetik):
              `Tier 🔴 offen == 0`?  ja  → Inner-Close autorisiert → PM wird TERMINAL-PM
                                     nein (🔴 > 0) → Exit ZURÜCKGEWIESEN → current_round++ → neue Runde (deterministisch, kein Urteil)
              erbsenzaehlerei-exit zusätzlich: sind im pm-verdict-N.md je offenes 🟡 Begründungen? nein → wie `fix` behandeln
        escalate  → gebündelte Nutzerfrage; warten; dann clean/erbsenzaehlerei-exit/fix
        fix + current_round < 5 → current_round++ → neue RUNDE M+1 (frischer PL, erhält PM-Was+Wie)
        fix + current_round = 5 → MAX-5-CAP greift: KEIN PL#6. Final-Gate (wenn Fix-Scribes in Runde 5 liefen): Build + Test via dev-mcp.
                    Aufteilung nach `Tier 🔴 offen`:
                      🔴 == 0 → cap-erzwungener erbsenzaehlerei-exit (Terminal-PM, DI, Closure + Rest-Findings-Bericht)
                      🔴 > 0  → HARD-STOP + User-Eskalation, KEINE Closure, Story NICHT `reviewed` (bleibt `planned`; 🔴 nie still durchwinken)
   │
   ▼  TERMINAL-PM (die EINZIGE Instanz, die Inner-Close → Outer überspannt — dieselbe PM-Instanz, via SendMessage nach dem Guard):
        entsteht NUR bei Inner-Close mit `Tier 🔴 offen == 0` (PM-Urteil clean/erbsenzaehlerei-exit nach bestandenem Tier-Guard;
        der cap-erzwungene erbsenzaehlerei-exit bei 🔴==0 fällt hierunter). Bei 🔴 > 0 entsteht KEIN Terminal-PM (s. Cap-Zeile).
        1. 6 DI-Reviewer im VORDERGRUND dispatchen (identisch zum PL→Impl-Reviewer-Muster): sie schreiben outer/di-N/di-finding-<rolle>.md,
           geben NUR Pointer als DIREKTE Rückgabe zurück — kein Payload, kein Background, keine Completion-Notification → Trap strukturell gelöst
        2. di-finding-*.md lesen → outer/di-N/di-digest.md bauen → Outer-Verdikt in outer/pm-verdict-N.md:
              OK               → Closure
              Implementation-Gap → Fix-Scribe → zurück in den Inner Loop (frische PL/PM-Runden)
              Requirement-Gap  → outer/delta-N.md schreiben → Outer Loop Schritt 1 (FRISCHER PM)
              Unklar           → gebündelte User-Eskalation, warten
        Harte Grenze danach: die Folge-Outer-Iteration startet mit frischen Rollen durchweg
```

---

## Schritt 1 — Hard Gate: Implementation Readiness

Fortfahren **nur** wenn alle Fragen YES (oder explizit vom User gewaivert). NO/UNKNOWN → stoppen: fragen; nicht editieren; nicht delegieren.

Bedingte Zeilen (10-13): YES wenn Bedingung nicht zutrifft (N/A).

| # | Frage |
|---|-------|
| 1 | Scope explizit (was in / out)? |
| 2 | Akzeptanzkriterien und Akzeptanz→Test-Liste (§8/F1) explizit und verifikabel? |
| 3 | Betroffene Bereiche klar (konkrete Pfade, Module oder explizite Discovery-Strategie)? |
| 4 | Host-Rules und relevante Skills identifiziert und geladen? |
| 5 | Risiken (Sicherheit, Daten, irreversible Schritte, Migrationen) adressiert oder eskaliert? |
| 6 | Iterativer Impl-Fix-Loop (max. 5 Runden) als Pflicht akzeptiert? |
| 7 | Welche Stacks betroffen → Quality Gates konfigurierbar? |
| 8 | 1-10 Scribes mit Slice-Grenzen aus finalem Plan; Gates integrationsweit vereinbart? |
| 9 | Slice-Grenzen aus finalem Plan — keine neuen Splits erfinden? |
| 10 | >=2 Slices: Ausfuehrungs-Topologie (sequenziell/parallel) explizit? |
| 11 | >=2 Slices: Slice-Unabhaengigkeitsregeln explizit? |
| 12 | >=2 Slices: Blocking-Abhaengigkeiten zwischen Packages benannt? |
| 13 | >=2 Slices: Integration-/Merge-Schritt und Drift-/Konflikt-Ownership definiert? |
| 14 | dev-mcp erreichbar? Bei dotnet/ng Build/Test im Scope: Verfuegbarkeit pruefen; bei UNKNOWN → BLOCKER klaeren. |

---

## Schritt 2 — Scribes (1-10 Implementierungs-Subagents)

**Weder PL noch PM editiert Produkt-Code.** Alle Produkt-Edits nur durch Scribes. Der PL
(`implement-round-executor`) dispatcht ausschliesslich; ein PL-eigener Produkt-Code-Edit gilt als
Regelverstoss (Negativ-AC STORY-033). Der PM (`implement-supervisor`) urteilt ausschliesslich.

**Trivial-Edit-Ausnahme (nur der Session-Treiber, PRE-Runde — strenge Positivliste):**
Weil der PL nicht editieren darf, liegt der einzige Direkt-Edit-Fastpath beim **Session-Treiber** und
wird **vor** dem Spawnen einer PL-Runde entschieden (verwandt mit dem Micro-Change-Modus, s. SKILL.md).
Wenn ALLE Bedingungen gleichzeitig erfuellt sind:
  1. Maximal 3 Dateien betroffen
  2. Pro Datei genau 1 Aenderungszeile (kein Block, kein Umstrukturieren)
  3. Zeilen-ID aus Plan eindeutig identifizierbar (Zeilennummer oder eindeutiger String)
  4. Aenderungstyp aus Positivliste:
     - Single-line typo fix (Tippfehler in String/Bezeichner)
     - Import-only change (eine Import-Zeile ergaenzen/entfernen)
     - Comment-change (Kommentar korrigieren)

→ Session-Treiber fuehrt Edit direkt aus — keine PL-Runde, keine Scribe-Delegation.
→ Ausserhalb der Positivliste: PL-Runde + Scribe-Delegation gilt ohne Ausnahme.
→ Bei Zweifel: PL-Runde + Scribe delegieren.

1. Ausfuehrungs-Topologie ausfuehren (aus finalem Plan Phase 6).
2. **Scribes strikt:** nur zugewiesener Slice; kein Scope-Expand; keine stille Umplanung.
3. Topologie explizit protokollieren: Anzahl (1-10), Grenzen aus Plan, sequenziell/parallel.
4. Jeder Scribe-Brief enthaelt:
   - Scope (was anfassen, was nicht)
   - Deliverables + Mapping zu Plan-Schritten
   - Akzeptanzliste (Testname + AAA-Stichpunkte) fuer diesen Slice (§8/F1)
   - Test-First-Pflicht: Neue/erweiterte Tests zuerst RED, dann GREEN (§8/F2)
   - Non-Goals: keine Produkt-/Design-Entscheidungen ausserhalb Plan
   - Pflicht: passenden Abschnitt aus `../references/subagent-prompts.md` inkl. MCP-First-Pflicht
5. Keine Abweichung vom finalen Plan ohne User-Freigabe.
6. Scribe-Output ≠ done — erst nach Integration-Checkpoint + Quality Gates.

**Kontext-Kompaktierung-Check (vor erstem Edit):**
Wenn eine Kontext-Kompaktierung stattgefunden hat → Read-Welle fuer ALLE Impl-Target-Dateien
parallel starten, dann erst Edit-Block ausfuehren. Im Zweifel: Read-Welle.

### Integration-Checkpoint (nach allen Scribes, vor Gates)

**Slice-Coverage-Check (Pflicht — erster Schritt, vor Gates):**
Touched Paths je Slice aus den `scribe-<slice>.md`-Dateien der Runde **lesen** (nicht aus Agent-Returns).
Fuer jeden IMP-* Slice aus der Plan-Topologie pruefen:
- Liegt mindestens eine Datei in den Scribe-Touched-Paths, die zum erwarteten Slice-Scope passt?
- Nein → BLOCKER: Slice [ID] hat keine Touched Paths. Gate-Start verboten. Fix-Scribe beauftragen, dann erneut pruefen.
- Ausgabe: Tabelle `IMP-Slice | Erwarteter Scope | Touched Paths | OK / BLOCKER`

Danach:
- Scribe-Dateien lesen (scribe-<slice>.md → Summaries, Touched Paths, Diffs) — kein Payload-Empfang
- Geaenderte Stacks klassifizieren → Gate-Scope
- Interface-/Contract-Drift zwischen Slices pruefen
- Merge-/Konflikt-Risiko bewerten

---

## Schritt 3 — Iterativer Impl-Fix-Loop (Session-Treiber + frischer PL + frischer PM je Runde)

Max. **5 Runden**. Der **Session-Treiber** treibt; er spawnt je Runde einen **frischen PL**
(`implement-round-executor`) und danach einen **frischen PM** (`implement-supervisor`) via Agent-Tool.
**Kein SendMessage über Runden hinweg** — jede Runde beginnt kontextfrei; Kontinuität liest die neue
Instanz aus `secondbrain-index.md` + dem Vorrunden-Digest. Keine Rollensimulation statt Subagents.

**Pro Runde:**
1. **Session** spawnt PL#M → PL: (Fix-Planer bei M≥2 →) Scribes → Integration-Checkpoint → Quality Gates
   → Reviewer → liest `finding-*.md` → baut `digest.md` **+ vergibt autoritative Tiers 🔴/🟡/🟢** → aktualisiert Index (inkl. Tier-Zähler) → gibt nur Pointer zurück.
2. **Session** spawnt PM#M auf Index+Digest-Pointer → PM urteilt `clean` / `erbsenzaehlerei-exit` / `fix` (Was+Wie) / `escalate`.
3. **Session** hält nur Pointer + PM-Verdikt, führt bei Inner-Close den Tier-Guard aus und entscheidet den nächsten Schritt (s. 3.9).

Die Session-Fenster-Disziplin ist das eigentliche Ziel: zwischen den Runden liegen **nur** Index-Pointer
+ PM-Verdikt-Kurzform im Session-Kontext — nie ein Reviewer-Report oder Digest-Body.

**Frueherer Abbruch:** PM urteilt `clean` **oder** `erbsenzaehlerei-exit` (nach bestandenem Tier-Guard, `Tier 🔴 offen == 0`) → Inner-Loop sofort schließen → Terminal-PM.

**Nach Runde 5 mit offenen Findings (PM = fix / zurückgewiesener Exit):** Session weist via Max-5-Cap zurück → kein PL#6.
Aufteilung nach `Tier 🔴 offen` (s. 3.9.2): 🔴 == 0 → cap-erzwungener `erbsenzaehlerei-exit` (Terminal-PM, DI, Closure mit Rest-Findings-Bericht) · 🔴 > 0 → **Hard-Stop + User-Eskalation, KEINE Closure** (Story bleibt `planned`, nicht `reviewed`).

### Quality-Gate-Sequenz-Logik

- **Errors in Gate 1 oder 2** → Gate 3+4 warten; Fix zuerst
- **Nur Warnings** → alle Gates durchlaufen; gebündelte Findings an Fix-Planer
- **Security-Findings (severity `critical`)** → **immer blockierend** wie Errors — unabhaengig vom Kanal (codebase-analyzer / inspectcode), **nie** als Warning gebuendelt durchgewunken

### 3-Tier-Erbsenzählerei-Klassifikation + Mechanischer Tier-Guard (STORY-034)

Der Inner-Exit ist nicht binär. Jedes Finding trägt einen von drei Tiers; drei Instanzen mit klarer
Gewaltenteilung entscheiden darüber:

| Tier | Bedeutung | Wirkung auf den Inner-Exit |
|------|-----------|----------------------------|
| 🔴 | Blockierend — Correctness-Bug, fehlender AC-Test, Contract-Drift, Regression, **Security-`critical`** | Blockt den Exit. **Ein offenes 🔴 → nächste Runde Pflicht.** |
| 🟡 | Begründungspflichtig — behebbar, Wave vertretbar | Wave nur mit **schriftlicher Begründung je Finding** im `outer/pm-verdict-N.md`. |
| 🟢 | Frei — kosmetisch | Frei durchwinkbar. |

**Gewaltenteilung:**
- **PL** vergibt die **autoritative** Tier-Einstufung beim Digest-Bau (Reviewer liefern nur `Tier-Vorschlag`) und schreibt die offenen Zähler `Tier 🔴/🟡/🟢 offen` in den Index. Regeln: `../references/secondbrain-schema.md → ## Tier-Klassifikation`.
- **PM** urteilt auf Basis der Tiers: `Tier 🔴 offen > 0` → `fix` (Pflicht); `== 0` → `clean` oder **`erbsenzaehlerei-exit`** (bei erbsenzaehlerei-exit: je offenes 🟡 eine Begründung ins `pm-verdict-N.md`).
- **Session** führt den **mechanischen Tier-Guard** aus: liest `Tier 🔴 offen` aus dem Index; meldet der PM einen Inner-Close (clean/erbsenzaehlerei-exit) bei `🔴 offen > 0`, **weist die Session den Exit deterministisch zurück** und erzwingt die nächste Runde (bis der Cap greift). Kein Urteil, reine Zähler-Arithmetik — deshalb nicht durch ein PM-Fehlurteil aushebelbar.

**Security-`critical` — nicht überstimmbar:** aus **jedem** Kanal immer 🔴. Der PL stuft es beim
Digest-Bau zwingend als 🔴 ein; der PM kann es nicht herabstufen; selbst bei einem PM-Fehlurteil greift
der Session-Tier-Guard über den 🔴-Zähler. Ein Security-`critical` kann daher **nie** per
Erbsenzählerei-Exit durchgewunken werden (Negativ-AC STORY-034).

### Incomplete-Response-Policy (Reviewer-Retry)

Wenn ein Reviewer-Agent kein Urteil und kein Finding liefert (Incomplete-Response):

1. **1x Retry:** Der PL spawnt den Reviewer-Agent einmalig neu. Ergebnis abwarten.
2. **Retry erfolgreich (Urteil vorhanden):** Review-Output normal auswerten. Kein Self-Assessment.
3. **Retry ebenfalls incomplete:** Self-Assessment ist erlaubt — muss aber explizit als `"Reviewer unavailable after retry"` dokumentiert werden (kein normales Review-Urteil).

*Hintergrund: STORY-026 — Session v4 (#7): Reviewer lieferte "Suche läuft — ich warte auf den Befund." ohne Urteil. Self-Assessment ohne Retry = blindes Urteil. 1x Retry trennt echte Timeouts von Regelbrüchen.*

### Jede Runde

**3.1 Quality Gates (integrationsweit)**

Gate-Reihenfolge einhalten (Build → Statische Analyse → Design-Principles → Tests). Alle Gates dokumentiert rueckmelden.

**Prozess-Disziplin (Fix-Edit-Zyklen):** `review_git_diff` laeuft in Gate 2 nach **jedem** Fix-Edit-Zyklus — auch nach trivialen Fixes (1 Zeile). Kein Fix-Zyklus reduziert Gate 2 auf Build+Test allein. Zweck: unbeabsichtigte Whitespace- oder Seiteneffekt-Aenderungen werden vor dem naechsten Review-Loop erkannt.

**3.2 Sieben Impl-Reviews (parallel, Datei-Handoff — vom PL dispatcht)**

7 Subagents, je eine Rolle. Verboten: Rollensimulation im PL-Thread.
Jeder erhaelt: finaler Plan + ACs + Akzeptanzliste, aktueller Diff/Touched Paths, Gate-Status pro Stack, codebase-analyzer review_git_diff-Befunde als Evidenz, **den Runden-Pfad `iteration-N/round-M/`**.
Jeder Reviewer schreibt seine EIGENE `finding-<reviewer>.md` (Struktur-Tabelle, s. secondbrain-schema.md) und gibt **nur Pointer + Verdikt-Kurzform** zurueck — **kein Report-Body im Return**.
Task-Prompts: jeweiliger Abschnitt in `../references/subagent-prompts.md`.

**3.3 Review-Digest (PL):** Der **PL liest** die `finding-*.md` der Runde und baut daraus `iteration-N/round-M/digest.md` (Review-Digest Runde N). Er empfaengt **keine** vollen Reports als Agent-Rueckgabe. Weil der PL throwaway ist, transitieren die finding-Bodies **einmal** durch das PL-Fenster (nicht durch die Session). `secondbrain-index.md` (current_round, Cap, Zaehler, Runden-Historie, letzter Digest-Pointer) aktualisieren. PL-Rückgabe an die Session: nur Pointer + Verdikt-Kurzform.

**3.4 PM-Urteil (frische Instanz, tier-gesteuert):** Nach dem PL spawnt die Session einen **frischen** `implement-supervisor` (PM) auf Index+Digest-Pointer. Der PM liest **zuerst `Tier 🔴 offen`** und fällt **ein** Urteil:
- `clean` — `Tier 🔴/🟡/🟢 offen` alle 0, Gates gruen, ACs adressiert → Inner-Loop schließbar.
- `erbsenzaehlerei-exit` — `Tier 🔴 offen == 0`, aber ≥1 🟡/🟢 offen; Restfindings keiner Runde wert → Inner-Loop schließbar. **Pflicht:** je offenes 🟡 eine schriftliche Begründung im `outer/pm-verdict-N.md`.
- `fix` — `Tier 🔴 offen > 0` (Pflicht), oder der PM entscheidet, ein 🟡 doch zu fixen → kompaktes **Was+Wie** (Verweis auf Digest-Zeilen).
- `escalate` — Produkt-/Design-Ambiguität, konfligierende AC-Interpretation → gebündelte Nutzerfrage.

Der PM editiert **nur** `outer/pm-verdict-N.md` (und bei Requirement-Gap `outer/delta-N.md`) — keinen Produkt-Code, keine Findings, keinen Digest, keinen Index. Bei Inner-Close (`clean`/`erbsenzaehlerei-exit`) wird der PM nach bestandenem Tier-Guard zum **Terminal-PM** (s. Schritt 4).

**3.5 Escalate → Gebuendelte Nutzer-Rueckfrage:** Bei PM-Verdikt `escalate` stellt die Session **eine** gebündelte Frage und wartet, bevor die nächste Runde startet.

**3.6 Fix-Planer (Opus, immer — vom nächsten PL dispatcht, unter dem PM-Urteil):** Bei PM-Verdikt `fix` dispatcht der **PL der Folgerunde** als ersten Schritt genau einen `implement-fix-planner-agent`. Der Fix-Planer erhaelt die PM-Was+Wie-Kurzform + den `digest.md`-Pointer (+ bei Bedarf die `finding-*.md`-Pfade) und liest selbst — kein Digest-Body im Session-Fenster. Verboten: PL-authored Fix-Plaene; Fix-Scribes ohne Fix-Planer-Output. Fix-Planer dedupliziert Doppel-Findings aus inspectcode + codebase-analyzer (v. a. `solid`-Ueberschneidungen).

**3.7 Fix-Scribes:** Scribe-Typ je nach Runde und Story-Scope:
- Runden 1-3: `implement-scribe-agent` (Sonnet) — immer
- Runden 4-5 Eskalation zu `implement-scribe-opus-agent` (Opus) nur wenn mindestens ein Kriterium erfuellt:
  - Story-Scope > 30 LOC gesamt, ODER
  - Vorgaenger-Runde scheiterte an Komplexitaet (nicht triviale Bugs/Tippfehler)
- Runden 4-5 Small-Scope (≤ 30 LOC, klarer Scope): `implement-scribe-agent` (Sonnet) weiternutzen — 3× schneller, keine Qualitaetseinbusse bei klarem Scope

**3.8 Iterations-Zusammenfassung:** Der PL schreibt die Runden-Historie-Zeile in `secondbrain-index.md` (Runden-Nr., Reviewer-Zahl, Fixable, Digest-Pointer, Status). Die Session referenziert nur den Index-Pointer.

**3.9 Abbruchbedingung (Session entscheidet, liest `current_round` + `Tier 🔴 offen` aus `secondbrain-index.md` VOR jedem Spawn):**
1. Sauber: PM-Verdikt `clean` **oder** `erbsenzaehlerei-exit` → **Tier-Guard**: `Tier 🔴 offen == 0`? (bei erbsenzaehlerei-exit zusätzlich: 🟡-Begründungen im pm-verdict-N.md vollständig?) → ja: Inner-Loop beenden, PM wird Terminal-PM → Delivery-Inspection. **Nein (🔴 > 0): Exit deterministisch zurückgewiesen → wie `fix` behandeln (current_round++).**
2. Maximum (Max-5-Cap): `current_round = 5` **und** PM-Verdikt `fix` (oder ein vom Tier-Guard zurückgewiesener Exit) → Session weist den Fix-Zyklus zurück, **startet keinen PL#6**. Der Cap begrenzt die **Fix-Runden**, hebt aber die 🔴-Invariante NICHT auf — deshalb Aufteilung nach `Tier 🔴 offen`:
   - **`Tier 🔴 offen == 0`** (nur 🟡/🟢 Rest): cap-erzwungener `erbsenzaehlerei-exit` — der Terminal-PM schreibt `outer/pm-verdict-N.md` mit je offenem 🟡 einer Begründung („Cap erreicht — auf Folge-Story vertagt"), dann Delivery-Inspection → Closure mit Rest-Findings-Bericht.
   - **`Tier 🔴 offen > 0`** (offenes 🔴, z. B. Security-`critical`): **KEINE Closure, KEIN Terminal-PM-DI-Span, Story NICHT `reviewed` (bleibt `planned`).** Hard-Stop → Rest-Findings-Bericht (inkl. Liste der offenen 🔴) → **gebündelte User-Eskalation** (waiven / Cap ausnahmsweise erhöhen / abbrechen). Damit kann ein offenes 🔴 nie still über den Cap durchgewunken werden (Aggregat-Regel + Security-Guardrail bleiben am Cap gewahrt).
3. escalate: gebündelte Nutzerfrage; nach Antwort clean/erbsenzaehlerei-exit/fix — der Cap gilt weiterhin (escalate-Runden zählen mit).

**3.10 Rest-Findings nach Maximum**

Wenn Fix-Scribes in Runde 5 gelaufen sind (Code wurde nach dem letzten Gate-Lauf noch geaendert):
→ **Final-Gate**: Build + Test via dev-mcp ausfuehren, Ergebnis dokumentieren.
→ Dann: Rest-Findings-Bericht (Vorlage in `../references/subagent-prompts.md`).

Wenn Runde 5 sauber exitete (keine Fix-Scribes): kein Extra-Lauf — Gate 5 gilt als final.

---

## §8 — Test-First / TDD (verbindlich)

**Prinzip:** Akzeptanzkriterien werden test-faehig formuliert (Planung) und vor der Implementierung als Tests geschrieben (Scribe). Die Tests spiegeln die Akzeptanzkriterien → gruene Tests = erfuellte Akzeptanz.
*Warum:* Tests nach der Implementierung testen nur den Ist-Zustand (was zufaellig gebaut wurde), nicht die Soll-Vorgabe. Test-First bindet die Umsetzung an die Anforderung.

| # | Festlegung | Detail |
|---|-----------|--------|
| **F1** | **Plan-Deliverable: Akzeptanzliste** | 1:1 aus Planungs-Flow — Testname (test-design-Konvention) + AAA-Stichpunkte + Markierung (neu/erweitern/unberührt). Scribe implementiert 1:1 nach dieser Vorgabe. |
| **F2** | **Roter Schritt erzwingen** | Scribe verifiziert: neue/erweiterte Tests fehlschlagen zuerst (Red), bevor Implementierung beginnt. Beweist dass der Test echt prueft. Unberuehrte Bestandstests ausgenommen. |
| **F4** | **Akzeptanz-Coverage als Review-Check** | `verifier`-Reviewer prueft: explizite AC-Map — jedes Akzeptanzkriterium einzeln auf Test gemappt. Kein neues Gate-Tool — nur Review-Check. |

**Scribe-Ablauf (zweistufig, pro Slice):**
1. Tests nach Plan-Akzeptanzliste schreiben/aktualisieren (Red fuer neu/erweitert)
2. Implementierung bis Tests gruen (Green)

**test-design** ist die Brücke Akzeptanz→Testcode:
- `.cs`/`.csproj` → [../test-design/frameworks/dotnet.md](../test-design/frameworks/dotnet.md)
- `*.spec.ts`/Angular → [../test-design/frameworks/angular.md](../test-design/frameworks/angular.md)
- Namenskonvention: `<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>`

---

## MCP-First Reference

| Aufgabe | MCP-Tool | MCP-Server |
|---------|----------|-----------|
| .NET Build | `build_dotnet_solution` | dev-mcp |
| .NET Test | `test_dotnet_solution` | dev-mcp |
| .NET Inspectcode | `run_inspectcode` | dev-mcp |
| Angular Build | `build_angular_project` | dev-mcp |
| Angular Test | `test_angular_project` | dev-mcp |
| Angular Lint | `lint_angular_project` | dev-mcp |
| Git-Diff Review | `review_git_diff` | codebase-analyzer |
| IOSP Compliance | `analyze_iosp_compliance` | codebase-analyzer |
| Index/Symbol-Suche | `index_project`, `find_in_index` | codebase-analyzer |

---

## Gate-2-Bootstrap (Einmalig je Kundenprojekt)

Bevor `feature-delivery` produktiv laeuft, einmaliger Setup-Schritt (Teil von `.claude/startup.md`):

1. **ArchUnitNET:** NuGet + Regelklasse (`../references/archunit-baseline-template.cs` → bestehendes Test-Projekt kopieren) + Verdrahtung
2. **ESLint-Baseline:** `@angular-eslint` aus `../references/eslint-baseline.json` installieren
3. **Optional:** `eslint-plugin-boundaries` mit Zonen-Template (`../references/eslint-boundaries-template.js`) — falls Projekt core/shared/features-Struktur nutzt; Zonen projektspezifisch anpassen

Ohne diesen Schritt laeuft Gate-2 beim ersten Lauf ins Leere.

---

## BoyScout pro Slice (vor Integration-Checkpoint)

Nach Rueckkehr jedes Scribes (sofern kein `kein boyscout`/`skip boyscout`):
`suggest_boyscout_actions(filePaths: [alle vom Slice geaenderten Dateien], type)` — Top-Findings kompakt im Slice-Report.

---

## Schritt 4 — Delivery-Inspection (5c — Outer Loop Gate, getragen vom Terminal-PM)

Letzter Schritt vor Closure — prueft ob alle Anforderungen erfuellt wurden.
Kein Code-Qualitaets-Check (Gates und Reviews haben das erledigt) — sondern Anforderungserfuellung aus Besteller-Perspektive.

**Träger (STORY-034): der Terminal-PM.** Der PM, der den Inner-Loop schließt (`clean`/`erbsenzaehlerei-exit` bei `Tier 🔴 offen == 0` nach bestandenem Tier-Guard), überspannt als **einzige** Instanz Inner-Close → DI-Dispatch → Outer-Verdikt. Nach dem Outer-Verdikt: **harte Grenze** — die Folge-Outer-Iteration bekommt einen frischen PM.

**Zwei getrennte Mechanismus-Kanten (nicht verwechseln):**
1. **Session ↔ PM = SendMessage.** Der PM meldet den Inner-Close-Verdikt zurück und **pausiert** (wird noch nicht verworfen). Die Session prüft den Tier-Guard (`Tier 🔴 offen`). Erst bei `== 0` reaktiviert sie **dieselbe** PM-Instanz per **SendMessage** zum Terminal-Span. So liegt der mechanische Guard nachweislich **vor** dem Terminal-Span, und es bleibt **eine** Instanz (AC1). Dies ist die einzige dokumentierte Ausnahme zur „kein SendMessage über Runden"-Regel (die pro Runde gilt, nicht für diesen Abschluss-Span).
2. **Terminal-PM → 6 DI-Reviewer = Vordergrund-Dispatch mit Pointer-Handoff.** Der reaktivierte Terminal-PM dispatcht die 6 DI-Reviewer selbst als **Vordergrund**-Sub-Agents — **identisch zum etablierten Muster, mit dem der PL die 7 Impl-Reviewer dispatcht** (Sub-Agent dispatcht Sub-Agents, synchron, direkte Rückgabe). Kein Background-Task, keine Completion-Notification.

⚠️ **Notification-Trap strukturell gelöst (STORY-031 → STORY-034):**
Der frühere Wait-Loop entstand durch **Background-Task + Notification-Wait**: Completion-Notifications gingen an den Haupt-Thread statt zurück an den zwischengeschalteten Dispatcher. STORY-034 löst das strukturell durch **Pointer-Handoff im Vordergrund**: die DI-Reviewer schreiben je `outer/di-N/di-finding-<rolle>.md` und geben **nur Pointer + Kurzform als DIREKTE, synchrone Rückgabe** zurück (kein Report-Body, keine Notification). Weil der Terminal-PM auf direkte Vordergrund-Rückgaben wartet — genau wie der PL auf seine Reviewer-Pointer —, gibt es keinen Notification-Wait, der misrouten könnte. Danach liest er die `di-finding-*.md`, baut `outer/di-N/di-digest.md` und fällt den Outer-Verdikt.
Details und Prompt-Vorlage: `../references/subagent-prompts.md` → "DELIVERY-INSPECTION → CLOSURE".

Jeder DI-Reviewer erhaelt: originale Anforderung + finaler Plan + Diff/Touched Paths + Gate-Status + den Pfad `outer/di-N/`.

### Outer-Verdikt: Finding-Klassifikation (verbindlich — vom Terminal-PM)

Der **Terminal-PM** klassifiziert (aus `di-digest.md`) jeden Befund in eine von drei Kategorien und schreibt das Ergebnis in `outer/pm-verdict-N.md`:

| Kategorie | Kriterium | Reaktion |
|-----------|-----------|----------|
| **Implementation-Gap** | Das Richtige wurde nicht korrekt umgesetzt (fehlendes Feature, falsches Verhalten, AC nicht erfuellt) | Fix-Scribe beauftragen → Inner Loop (frische PL/PM-Runden) |
| **Requirement-Gap** | Das Falsche wurde umgesetzt, oder neuer Scope entsteht (PO aendert Ziel, AC faellt weg, neues AC entsteht) | Delta-Protokoll `outer/delta-N.md` erstellen → Outer Loop zurueck zu Schritt 1 (frischer PM) |
| **Unklar** | Produkt-/Design-Ambiguitaet, nicht eindeutig klassifizierbar | User eskalieren (gebuendelt, einmalige Frage) — warten vor Entscheidung |

Kein Gap → **OK** → Closure (Session setzt Story-Status → `reviewed`, s. SKILL.md Story-Gate Schritt 5 A).

### Delta-Protokoll (bei Requirement-Gap)

Wenn mindestens ein Requirement-Gap gefunden → Terminal-PM erstellt das Delta-Protokoll in **`requests/plans/<feature>/outer/delta-N.md`** (in die SecondBrain relokiert — vgl. `../references/secondbrain-schema.md`) vor dem Rueckweg zu Schritt 1:

```
## Delta-Protokoll — Outer Loop Iteration [N]

### PO/Stakeholder-Befunde
- [Befund 1]: [Beschreibung]
- [Befund 2]: [Beschreibung]

### Aenderungen am Request
- Neu: [neue Anforderung / neues AC]
- Weggefallen: [AC oder Scope der entfernt wird]
- Modifiziert: [bestehendes AC das sich aendert]

### Betroffene Plan-Teile
- [Topic / Slice / Bereich]: [wie betroffen]
- Unveraendert (wird geerbt): [Liste]

### Planungs-Hinweis fuer Iteration [N+1]
- Anzahl AC-Aenderungen: [N]
- Re-Planung laeuft lean/solo (einziger Planungsmodus); nur die betroffenen Topics werden neu geplant.
```

`outer/delta-N.md` ist die verbindliche Eingabe fuer Schritt 1 der naechsten Outer-Loop-Iteration; diese startet mit **frischen** Rollen durchweg (harte Grenze).

Erst nach sauberem Delivery-Inspection-Durchlauf (keine Requirement-Gaps, keine offenen Implementation-Gaps): weiter zu Closure.
Opt-out: `skip-delivery-inspection` (Grund im Closure-Protokoll vermerken).

---

## Closure (nach Delivery-Inspection)

1. Plan alignment: jeder Plan-Schritt und AC geprueft oder erklaert.
2. Loop-Evidenz: Runden-Anzahl; Gate-Matrix pro Stack/Runde; 7 Reviews je Runde; Fix-Planer mit Evidenz-Basis; Fix-Scribes; Rest-Findings-Bericht wenn noetig.
3. MCP-Compliance: Gate gruen nur mit abgeschlossenen MCP-Laeufen; kein Shell-Bypass.
4. Closure-Format: Vorlage in `../references/subagent-prompts.md`.

---

## Pflegehinweis

Trigger: SKILL.md-Frontmatter aktuell halten. Subagent-Prompt-Vorlagen: nur in `../references/subagent-prompts.md`.

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.
