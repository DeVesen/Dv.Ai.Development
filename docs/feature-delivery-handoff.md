# feature-delivery — Design & Handoff-Protokoll

> **Skill-Name:** `feature-delivery` (ersetzt den Arbeitstitel „Skill-X").
> **Status:** Design-Phase **abgeschlossen**. **NOCH NICHTS umgesetzt** — keine Skill-/Agent-/MCP-Dateien erstellt. Bereit für Umsetzung (sechs Bau-Stränge, §19).
> **Working Tree:** Branch `claude/skill-x-agent-framework-xj2zi3`. Sven mergt selbst auf `master`, **erst wenn das Feature komplett fertig ist** — bis dahin keine Änderungen an `master`/Branch-Topologie.
> **Zweck dieses Dokuments:** vollständiger, wasserdichter Wissensstand inkl. **Begründungen**, damit **jeder Agent direkt weiterarbeiten** kann. Source-of-Truth / Pflichtenheft.
> **Sprache der Arbeit:** Deutsch. Stil: fundiert, klar, faktenkorrekt, kein Boilerplate.

---

## 1. Ziel & Kontext

**`feature-delivery`** ist ein **Orchestrator-Skill** für vollständige Feature-Umsetzung in Kundenprojekten:

1. Nutzer gibt einen Prompt.
2. **Planung** durch Sub-Agents mit stärkeren Modellen.
3. Pläne werden durch **Prüfer** mit passenden Modellen reviewed.
4. Bei Funden → zurück an den **Plan-Fixer** zum Nachjustieren (Loop).
5. Fertiger Plan geht im Default **automatisch** in die Umsetzung (kein manueller Gate) — **Ausnahme:** nutzergetriggerter Plan-only-Ausstieg (§16).
6. **Schreiberlinge (Scribes)** implementieren — **Test-First** (§8).
7. Ergebnis läuft durch **statische Code-/Architekturanalyse**, **Review-** und **Test-Agents**.
8. Architektur, CodeStyle und Prinzipien werden in **Planung UND Implementation** durchgesetzt.

**Stack zuerst:** .NET und Angular.

**Prinzipien-Kanon:** Clean Code (Robert C. Martin) + IODA + IOSP + SOLID + **YAGNI · DRY · KISS** + **DDD-Leitplanken** (Bounded Context · Domänen-Modell-Trennung) + **weitere Architektur-Leitlinien** (Security · Fehlerbehandlung · Inter-Service-Kommunikation — §12). **Bei Widerspruch überwiegen SOLID + IODA + IOSP.**

---

## 2. Harte Rahmenbedingungen (festgelegt)

| Punkt | Festlegung |
|-------|-----------|
| Harness-Ort | Läuft lokal auf Svens Laptop, auch für Kundenprojekte. Vorerst nicht remote. |
| MCPs | `dev-mcp`, `codebase-analyzer` sind **zwingender** Bestandteil des Harness — werden als vorhanden vorausgesetzt. (`build-log-filter` ist **nicht** Teil von `feature-delivery` — §17.) |
| ReSharper/Rider + JB-Lizenz | Auf dem Laptop vorhanden — wird vorausgesetzt (`jb inspectcode` per CLI nutzbar). |
| Modelle | Nur **Opus** und **Sonnet**. **Kein Haiku** (zu wichtig). |
| Plan-Review-Loop | Max. **5** Iterationen. |
| Impl-Fix-Loop | Max. **5** Runden. |

---

## 3. Verzeichnisstruktur

```
.claude/
├── startup.md                          # NEU — Harness-Beschreibung + Konfig-Leitfaden (§18)
│                                        #   Eigenständig, kennt die Skills. Die Skills kennen startup.md NICHT.
├── skills/
│   ├── feature-delivery/
│   │   ├── SKILL.md                     # Orchestrator-Einstieg + Trigger (§16)
│   │   ├── flows/
│   │   │   ├── planning-flow.md          # ehem. planning-workflow/SKILL.md
│   │   │   └── implementation-flow.md    # ehem. implementation-workflow/SKILL.md
│   │   ├── references/
│   │   │   ├── principles-cleancode.md   # IODA + IOSP + SOLID + Clean Code + YAGNI/DRY/KISS
│   │   │   ├── archunit-baseline-template.cs
│   │   │   ├── eslint-baseline.json
│   │   │   ├── eslint-boundaries-template.js # eslint-plugin-boundaries Zonen-Template (§11)
│   │   │   └── subagent-prompts.md
│   │   └── agents/                       # (siehe §5)
│   ├── test-design/                      # bestehend (§14) — eigenständig, referenziert
│   └── acceptance-design/                # NEU, künftiger eigener Skill (§15, Strang 4)
└── agents/
    └── acceptance-design-agent.md        # NEU (§15) — eigener Agent
```

**Entfällt vollständig:** `.claude/skills/planning-workflow/` und `.claude/skills/implementation-workflow/` als eigenständige Skills.
**Keine Aliase** — die alten Trigger-Wörter wandern differenziert zu `feature-delivery` (§16), gehen aber nicht verloren.

---

## 4. Modell-Schema (endgültig)

**Kein Haiku. Keine „Opus-high/low"-Unterscheidung** — technisch in Claude Code nicht steuerbar (extended-thinking-Budget ist nicht über Agent-Profile setzbar). Reale Unterscheidung ist **Opus vs. Sonnet**. (Falls Claude Code später ein `thinking_budget:`-Frontmatter unterstützt, nachrüstbar.)

| Modell | Rollen |
|--------|--------|
| **Opus** | Plan-Orchestrator (Phasen 1,2,4a,4c,6) · Plan-Fixer (alle Runden) · plan-review-pessimist · plan-review-ioda · **Impl-Loop-Orchestrator (delegierter Agent)** · Fix-Planer (alle Runden) · implement-review-pessimist · implement-review-ioda · **Scribe Runden 4–5** |
| **Sonnet** | Scout · Topic-Planer · plan-review-optimist/normalo/oberlehrer/professor · **Scribe Runden 1–3** · implement-review-optimist/normalo/oberlehrer/professor/**lehrer** |

---

## 5. Agenten-Katalog

### Plan-Review: 6 Reviewer (5 alt + IODA neu)
`optimist (S)` · `pessimist (O)` · `normalo (S)` · `oberlehrer (S)` · `professor (S)` · **`ioda (O)` [NEU]**

### Impl-Review: 7 Reviewer (6 alt inkl. `lehrer` + IODA neu)
`pessimist (O)` · **`ioda (O)` [NEU]** · `lehrer (S)` · `normalo (S)` · `oberlehrer (S)` · `professor (S)` · `optimist (S)`
> `lehrer` bleibt erhalten — deckt **fachliche Korrektheit** ab, die kein anderer Reviewer prüft. Prüft zusätzlich die **Akzeptanz-Coverage** (§8, F4).

### Neue Agenten (Detail)

| Agent | Modell | Rolle |
|-------|--------|-------|
| `plan-fixer-agent` | Opus | **Patcher, kein Neu-Planer.** Input: Review-Digest + aktuelle Plan-Arbeitsversion. Ändert **nur** geflaggte Abschnitte. Kein Scouting, kein Neudenken, kein Scope-Expand. **Regel:** Erfordert ein Finding eine größere Änderung als ein gezielter Patch → als **Blocker** an Orchestrator zurück (Handling: §6, A1). |
| `plan-review-ioda-agent` | Opus | Prüft den **Plan konzeptuell** auf IODA/IOSP (vorausschauend). |
| `implement-review-ioda-agent` | Opus | Prüft den **Code** auf **IODA-Architektur** (Bausteinschnitt, Dekomposition, PoMO). **IOSP-Mechanik** (Integration/Operation-Mix je Methode) liefern künftig die codebase-analyzer-Tools (Strang 5 .NET / Strang 6 Angular, §19/§20) als deterministische Evidenz; **bis Strang 6** prüft der Agent IOSP für **Angular** selbst. ArchUnit-IOSP-Regel bleibt **Backstop** (§11). |
| `implement-loop-orchestrator` | Opus | Fährt den Implementations-Loop als **delegierter Agent** (nicht der Parent) → unabhängig vom Session-Modell auf Opus pinbar. |
| `implement-scribe-agent` | Sonnet | Scribe Runden 1–3. |
| `implement-scribe-opus-agent` | Opus | Scribe Runden 4–5 (Eskalation). |

> Zwei **separate** IODA-Agents (Plan + Implement), **kein** Mode-Switch in einer Datei — die Prompts sind fundamental verschieden.

### Übernommene Agenten (aus alten Workflows)
`plan-agent` (→ Plan-Orchestrator, **KEINE bestehende Datei** — wird aus der inline-Sektion `## Orchestrator-Konfiguration` in `planning-workflow/SKILL.md:270` materialisiert; `model: inherit` → Opus; Phasen 4a/4c/6 kommen aus `plan-agent-interface-designer` / `plan-agent-merger` / `plan-agent-synthesizer`, die eingefaltet werden) · `plan-agent-scout` · `plan-agent-topic-planner` · `plan-review-{optimist,pessimist,normalo,oberlehrer,professor}` · `implement-fix-planner-agent` · `implement-review-{pessimist,lehrer,normalo,oberlehrer,professor,optimist}`.

### Eigener Agent für künftigen Skill
`acceptance-design-agent` (§15) — **leicht (Sonnet)**, gehört zu Strang 4, wird mit `acceptance-design` gebaut, **nicht** zu feature-delivery.

---

## 6. Planungs-Flow

```
Phase 1+2  Anforderung klären (ohne Code)        Plan-Orchestrator (Opus)
Phase 3    Scouts 1–10 parallel (read-only)      Scout (Sonnet)
              + Test-Abdeckung des Bereichs mitkartieren (§8, F3)
Phase 4a   Interface-Design / Topic-Map          Plan-Orchestrator (Opus)
              + Service als Bounded Context denken; Domänengrenzen, Ubiquitous Language (§12)
Phase 4b   Topic-Planer 1–10 parallel            Topic-Planer (Sonnet)
              + Akzeptanz→Test-Liste je Topic (§8, F1)
Phase 4c   Merge zur Arbeitsversion              Plan-Orchestrator (Opus)
   │
   ▼  Plan-Review-Loop (max. 5 Iterationen)
        6 Reviewer parallel (§5)  — prüfen u.a. Vollständigkeit + Testbarkeit der Akzeptanzliste,
                                  Bounded-Context-Grenzen / kein ungewollter Shared-Kernel (§12)
        Findings?  ja → Plan-Fixer (Opus) → nächste Iteration
                   nein / Max erreicht → weiter
   │
   ▼
Phase 6    Synthese, Komplexitäts-/Executor-Empfehlung,
           Umsetzungs-Topologie (Slices/Wellen),
           finale Akzeptanz→Test-Liste (§8, F1)   Plan-Orchestrator (Opus)
   │
   ▼  Persistenz: Plan als Datei → requests/plans/plan-<feature>.md  (A3)
   │
   ├─ Plan-only-Einstieg → STOPP (Nutzer reviewt Datei)            (§16)
   └─ End-to-end-Einstieg → AUTOMATISCH → Implementations-Flow      (§16)
```

### Arbeitsteilung Plan-Fixer vs. Phase 6 (bestätigt)
- **Plan-Fixer** = iteratives Patchen **pro Iteration** innerhalb des Review-Loops; ändert nur geflaggte Abschnitte.
- **Phase 6** = finale Konsolidierung + Komplexitäts-/Executor-Empfehlung + Umsetzungs-Topologie + finale Akzeptanz→Test-Liste. Macht selbst **keine** inhaltliche Plan-Reparatur mehr.

### A1 — Plan-Fixer eskaliert einen Blocker (entschieden)
Finding verlangt größere Änderung als ein gezielter Patch → Plan-Fixer gibt **Blocker** zurück → **Plan-Orchestrator** macht **gezieltes Re-Planning nur des betroffenen Topics** (Mini-4a/4b) → Loop wird fortgesetzt.
**Warum:** Hält den Loop autonom, nutzt die 5 Iterationen sinnvoll; Eskalation an den Nutzer erst, wenn auch das Topic-Re-Planning wiederholt scheitert.

### A2 — Loop erreicht Max = 5 mit offenen Findings (entschieden)
- **Offene KRITISCH-Findings nach Max 5** → der **automatische** Handoff in die Implementation wird **gestoppt** (Hard Stop + Rest-Findings-Bericht).
- **Nur unkritische Rest-Findings** → Phase 6 läuft, Handoff **mit dokumentierter Warnung**.
**Warum:** Schützt die „automatisch"-Entscheidung davor, kaputte Pläne still durchzureichen; blockiert aber nicht bei Kosmetik.

### A3 — Plan-Persistenz (entschieden)
Pfad: **`requests/plans/plan-<feature>.md`**.
**Warum:** Konsistent mit `requests/stories/` (ado-Skill); übersteht Kontext-Kompaktierung beim Auto-Handoff. `<feature>`-Slug aus Nutzer-Prompt oder ADO-ID.

---

## 7. Implementations-Flow

```
Hard Gate (Readiness)            Impl-Loop-Orchestrator (Opus, delegiert)
   │  (gilt auch für From-existing-plan-Einstieg — prüft Umsetzbarkeit des geladenen Plans)
   ▼  Scribes 1–10 (parallel/sequenziell), Runden 1–3 Sonnet
        je Scribe ZWEISTUFIG (Test-First, §8):
          1) Tests erstellen/aktualisieren — 1:1 nach Plan-Akzeptanzliste (Red)
          2) Implementierung bis Tests grün (Green)
        je Scribe: NUR slice-scoped Build/Test
   │
   ▼  Integration-Checkpoint (Merge aller Scribes)
   │
   ▼  QUALITY GATES (integrationsweit — NICHT pro Scribe) — siehe §9
   │
   ▼  Findings → Fix-Planer (Opus, immer) → Fix-Scribes → Gates erneut
        Runden 4–5: Scribe-Opus + Fix-Planer-Opus
   │
   ▼  Nach Runde 5 mit offenen Findings: Hard Stop + Rest-Findings-Bericht
```

**Einstiege in den Impl-Flow:** (1) automatisch aus Phase 6 (End-to-end), (2) aus persistiertem Plan (From-existing-plan, §16). In beiden Fällen läuft der Hard Gate (Readiness).

---

## 8. Test-First / TDD (Querschnitt — entschieden)

**Prinzip:** Akzeptanzkriterien werden **test-fähig** formuliert (Planung) und **vor** der Implementierung als Tests geschrieben (Scribe). Die Tests **spiegeln** die Akzeptanzkriterien → grüne Tests = erfüllte Akzeptanz.
**Warum:** Tests **nach** der Implementierung testen nur den **Ist-Zustand** (was zufällig gebaut wurde), nicht die Soll-Vorgabe. Test-First bindet die Umsetzung an die Anforderung.

| # | Festlegung | Detail |
|---|-----------|--------|
| **F1** | **Plan-Deliverable: test-fähige Akzeptanzliste** | Pro Kriterium: **Testname** (test-design-Konvention `<Method>_<Situation>_<Expected>`) + **Arrange/Act/Assert-Stichpunkte** + Markierung **neu / erweitern / unberührt**. **Konkrete Testfall-Skizzen**, nicht nur abstrakte Kriterien → echte „1:1"-Übersetzung. **Gilt auch im Lean-Mode** (§13). *Warum konkret:* „User kann sich einloggen" ist nicht 1:1 übersetzbar — der Scribe müsste interpretieren. |
| **F2** | **Roter Schritt erzwingen** | Scribe verifiziert, dass **neue/erweiterte** Tests **zuerst fehlschlagen** (Red), bevor er implementiert. *Warum:* beweist, dass der Test echt prüft und nicht trivial grün ist. Unberührte Bestandstests ausgenommen. |
| **F3** | **Scout-Test-Kartierung** | Scouts (Phase 3) kartieren die **bestehende Test-Abdeckung** des Bereichs mit → Plan kann neu/erweitern/unberührt korrekt setzen. *Vorsicht:* codebase-analyzer `analyze_coverage` (Stale-Reports), `detect_untested_public_api` (False-Positives bei Integration-Tests) — als Hinweis, nicht als alleinige Wahrheit. |
| **F4** | **Akzeptanz-Coverage als Review-Check** | `lehrer` (fachliche Korrektheit) prüft: deckt die finale Test-Suite **alle** Akzeptanzkriterien ab? Kein neues Gate-Tool. |

**Scribe-Ablauf (zweistufig, pro Slice):** (1) Tests nach Plan-Vorgabe (Red für neu/erweitert) → (2) Implementierung bis grün (Green).
**test-design (§14)** ist die Brücke Akzeptanz→Testcode; die Namenskonvention macht jedes Kriterium zu einem Testnamen.

---

## 9. Quality Gates (Hard-Power) — Reihenfolge

**Wichtig:** Build ist **Vorbedingung**, nicht das letzte Gate. ArchUnitNET lädt **kompilierte Assemblies** via Reflection → ohne erfolgreichen Build nicht lauffähig. `jb inspectcode` braucht Restore/Build.

```
1. BUILD (muss grün)              build_dotnet_solution / build_angular_project (dev-mcp)
      │  Vorbedingung — ohne grünen Build kein Gate 2/3/4
      ▼
2. STATISCHE ANALYSE (parallel)
      • run_inspectcode            (dev-mcp, NEU — Strang 2)
      • ArchUnitNET-Tests          via test_dotnet_solution
      • lint_angular_project       (dev-mcp, NEU — Strang 2)  → ng lint
                                     │  inkl. eslint-plugin-boundaries (über Projekt-ESLint-Config,
                                     │  KEINE separate Tool-Erweiterung — §11)
      • review_git_diff            (codebase-analyzer — 5 focusAreas: security · performance ·
                                     │  api-validation · angular-best-practices · solid; rein statisch;
                                     │  Befunde speisen die LLM-Reviewer)
      • analyze_iosp_compliance    (codebase-analyzer, NACHGELAGERT — Strang 5 .NET / Strang 6 Angular)
                                     │  deterministische IOSP-Befunde je Methode; ArchUnit-IOSP-Regel bleibt Backstop
      ▼
3. IODA-REVIEW                     implement-review-ioda-agent (Opus)
      ▼
4. TEST-SUITE                      test_dotnet_solution / test_angular_project (dev-mcp)
                                     │  grün = Akzeptanzkriterien erfüllt (§8)
```

**Sequenz-Logik (Variante „C", angepasst):**
- **Errors** in Stufe 1 oder 2 → Stufe 3+4 warten, Fix zuerst.
- Nur **Warnings** → alle Stufen durchlaufen, **gebündelte Findings** an Fix-Planer.
- **Security-Findings (severity `critical`)** → **immer blockierend** wie Errors — unabhängig vom Kanal (codebase-analyzer/inspectcode), **nie** als Warning gebündelt durchgewunken.

**codebase-analyzer-Review-Kanal (#1 — Strang 1, keine MCP-Änderung):** `review_git_diff` am Integration-Checkpoint über die Feature-Änderungen, **alle 5 focusAreas**. Rein statisch; Befunde **speisen die 7 LLM-impl-Reviewer** als Evidenz (erdet das Urteil). Überschneidung mit `inspectcode`/ArchUnit (v. a. `solid`) ist gewollt redundant — Doppel-Findings werden im **Fix-Planer dedupliziert**.

**Gate-Ort:** am **Integration-Checkpoint** (nach Merge aller parallelen Scribes), **nicht** „nach jedem Scribe". Pro Scribe nur slice-scoped Build/Test.

**Gate-2-Bootstrap:** einmaliger **Setup-Schritt** (Teil von `startup.md`, §18), getrennt vom Pro-Slice-Loop. Installiert in frisches Kundenprojekt: ArchUnitNET (NuGet + Regelklasse + Verdrahtung) + ESLint-Baseline (`@angular-eslint`) + **optional** `eslint-plugin-boundaries` (Zonen-Template). Ohne diesen Schritt läuft der erste Gate-2-Lauf ins Leere.

---

## 10. dev-mcp — Erweiterungen (Teil des Features)

Ort: `Mcp-Servers/Dev.Mcp/Dev.Mcp/`. Output **token-optimiert** (maschinen-dicht, gerade noch menschenlesbar, kein rohes XML/JSON).

### Initial (Bau-Strang 2)

| Tool | Input | Output |
|------|-------|--------|
| `run_inspectcode` | `solutionPath` | `{ summary:{errors,warnings,hints}, errors:[{file,line,rule,msg}], warnings:[...] }` |
| `lint_angular_project` | `projectPath` | `{ summary:{errors,warnings}, errors:[{file,line,rule,msg}], warnings:[...] }` |

> `eslint-plugin-boundaries` erfordert **keine** Tool-Änderung — läuft als ESLint-Plugin innerhalb von `lint_angular_project`/`ng lint` über die Projekt-Config. Reine Config-/Bootstrap-Sache (§11, §18).

Build + Test bereits vorhanden (`build_dotnet_solution`, `test_dotnet_solution`, `build_angular_project`, `test_angular_project`) — **unverändert**.

### Nachgelagert (Bau-Strang 3) — `analyze_angular_architecture`
Schließt die **Lücke**, die `eslint-plugin-boundaries` nicht abdecken kann (Naming/Placement/HttpClient-Schmuggel). **Außerhalb des initialen Scope.** Voller Auftrags-Prompt: §20.

---

## 11. Baselines

### ArchUnitNET (Option A — nur Regelklasse)
Template `references/archunit-baseline-template.cs`, kopiert ins **bestehende** Test-Projekt des Kunden. Baseline-Regeln (im Harness, pro Projekt verfeinerbar):
- Controller → Service → Repository Layering, **keine Sprünge**
- Kein direkter DB-Zugriff aus Controllern
- Domain-Modelle **frei** von Infrastructure-Abhängigkeiten
- **Keine** zirkulären Abhängigkeiten zwischen Schichten
- IODA-nah: Service-Methoden, die andere Services aufrufen, enthalten **keine** Inline-Logik *(grobe IOSP-Regel — bleibt als **Backstop**; methodengenaue IOSP-Prüfung kommt via codebase-analyzer `analyze_iosp_compliance`, Strang 5/6 — §20)*
- Namenskonventionen: Services enden auf `Service`, Repositories auf `Repository`
- **DDD — keine Entity-Durchstecherei:** Persistence-/EF-Entities erscheinen **nicht** in Controller-Signaturen (Parameter/Return) — an der API-Grenze stehen **DTOs**; Persistence-Entities werden nur in der Repository-/Infrastructure-Schicht referenziert *(neu — §12, Punkt B)*

### Angular ESLint (`references/eslint-baseline.json`)
`@angular-eslint` + custom Architektur-Regeln im Harness.

### Angular Boundaries (`references/eslint-boundaries-template.js`) — entschieden (⑨ + B1)
`eslint-plugin-boundaries` als **optionaler** Teil des Gate-2-Bootstrap, mit Zonen-Template + **explizitem Anpass-Hinweis** (Zonen sind projektspezifisch).

**Zonierung (Vorlage):**
```
src/app/
├── core/
│   └── api/          ← ApiServices (nur HttpClient, keine Logik)
├── shared/
│   ├── components/   ← Dumb/Presentational Components
│   ├── pipes/
│   └── utils/
└── features/
    └── <feature>/
        ├── pages/       ← Smart/Container Components
        ├── components/  ← Feature-spezifische Dumb Components
        └── services/    ← Feature-Services (nutzen ApiServices, kein HttpClient direkt)
```

**Baseline-Regeln (Start-Set, bewusst klein):**
1. **ApiService-Placement:** ApiServices liegen in `core/api/`; alle Feature-Services und Smart-Komponenten dürfen sie importieren.
2. **Dumb-Components ohne Service-Import:** `*/components` dürfen nicht aus `*/services` oder `core/api` importieren.
3. **Cross-Feature-Verbot:** `features/a` darf nicht aus `features/b` importieren.
4. **shared kennt keine Features:** `shared` darf nicht aus `features/*` importieren.

**Warum klein starten:** bewusste Entscheidung (B1) — nur diese vier Regeln zum Start.
**Grenze (Warum `analyze_angular_architecture` nötig wird):** ESLint prüft nur **Import-Statements**, nicht **Inhalt/Benennung/DI**. Es kann nicht prüfen, ob eine `*ApiService`-Klasse wirklich in `core/api/` liegt, ob sie nur `HttpClient` injiziert, oder ob ein Feature-Service `HttpClient` direkt injiziert. Diese Lücke schließt erst Strang 3 (§10, §20).

---

## 12. Prinzipien-Dokument (`references/principles-cleancode.md`)

Inhalt: **Westphal IODA** + **IOSP** + **klassisches SOLID** + **Clean Code (Robert C. Martin)** + **YAGNI · DRY · KISS**.

- **IODA / IOSP / SOLID / Clean Code** — der Kern-Kanon.
- **YAGNI · DRY · KISS** — pragmatische Leitplanken gegen Über-Engineering, Duplikation und unnötige Komplexität. Sie **ergänzen** den Kanon, **überstimmen** SOLID/IODA aber nicht (z. B. bricht YAGNI keine nötige DIP-Abstraktion — es verhindert nur Abstraktion „auf Vorrat").
- **DDD-Leitplanken (gezielt — nicht das volle DDD)** — bewusst **nur** zwei Grenz-Prinzipien, **kein** Aggregate/Value-Object/Domain-Event-Vokabular (das wäre gegen YAGNI/KISS):
  - **(A) Bounded Context — Service = eigene Domäne** *(Planungs-Prinzip, nicht maschinell prüfbar)*: jeder Microservice als eigene Domäne. Gleiche Namen (Model/DTO/Parameter) in Service-A und Service-B dürfen **unterschiedliche** fachliche Bedeutung haben. **Keine** geteilten Modelle/DTOs über Service-Grenzen außer bewusstem **Shared Kernel**. Durchsetzung: Plan-Orchestrator Phase 4a + `plan-review` (§6). FE-Analogon: Feature-Zonierung (§11).
  - **(B) Domänen-Modell-Trennung — keine Entity-Durchstecherei** *(prüfbar)*: DB-/Persistence-Entitäten gehen nicht durch den ganzen Service bis zur API; Trennung Persistence-Entity / Domain-Model / DTO. Durchsetzung: ArchUnit (§11). Abgrenzung: **nicht** dasselbe wie „Domain frei von Infrastructure" (DIP/Abhängigkeitsrichtung) — B ist Typ-Durchstecherei nach außen.

### Weitere Architektur-Leitlinien
- **Security** *(prüfbar — höchste Priorität)*: Standard-Checks via codebase-analyzer `security` focusArea + `inspectcode` — SQL-Injection, XSS, Secrets, Auth, CORS, Token-Storage. **Security-Findings (`critical`) sind in Gate 2 immer blockierend** (§9), nie als Warning durchgewunken.
- **Fehlerbehandlung** *(teils prüfbar, teils Prinzip)*: Fehler **nicht verschlucken** (kein leerer/handlungsloser `catch`, kein `catchError` ohne Behandlung — prüfbar via inspectcode/codebase-analyzer); **zentrale, konsistente** Behandlung (Middleware/HTTP-Interceptor) statt verstreuter try-catch — Cross-Cutting → **IOSP/IODA**: gehört in die Integration, nicht in jede Operation; **einheitliches Fehler-Format** an der API-Grenze. *Konkretes Format (ProblemDetails/RFC 7807), Strategie (Exceptions vs. Result), Resilience → projektspezifisch, startup.md (§18).*
- **Inter-Service-Kommunikation** *(Planungs-Prinzip; nur bei service-übergreifenden Features)* — Ergänzung zu DDD-(A): **lose Kopplung, async bevorzugt** (Events für Cross-Service); **kein verteilter Monolith** (keine synchronen Aufruf-Ketten über viele Services, keine geteilte DB); **Anti-Corruption-Layer** an Service-Grenzen (Modell-Übersetzung — schließt an A an). *Konkreter Bus/Protokoll/Event-Contracts → startup.md (§18).*

**Bei Widerspruch: SOLID + IODA überwiegen.**

---

## 13. Lean-Planning-Mode (kleine Aufgaben)

| Aspekt | Regel |
|--------|-------|
| Wer entscheidet „klein" | **Sven — explizit.** Keine Auto-Heuristik. |
| Was schrumpft | **Nur Planung:** Orchestrator (Opus) plant + prüft + reviewed **in sich selbst** — keine Scouts, keine Review-Subagent-Armee, kein 5er-Loop. |
| Was bleibt voll | **Implementation unangetastet** — voller Scribe, alle Gates, voller Review-Loop. **Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht.** **Hier wird nie gespart.** |

**Framing:** bewusst **sanktionierte Ausnahme** zur Anti-Shortcut-Regel. Regelkonform, weil **nicht still**, sondern **nur nutzergetriggert**.

**Trigger (entschieden, §16):** primär **`schlank planen`** / **`lean planen`**, Synonyme **`kompakt planen`** / **`Solo-Planung`**.
- **Warum diese Wörter:** alle enthalten „planen" → unmissverständlich, dass **nur** die Planung betroffen ist. `klein` bewusst **nicht** — klingt nach Auto-Heuristik und kann als „kleines Feature" missverstanden werden.
- **Kombinierbarkeit:** Modifier auf die Planungs-Phase — kombinierbar mit **Plan-only** und **End-to-end**, **nicht** mit **From-existing-plan**.

---

## 14. test-design — Pflicht-Verweis (Status korrigiert)

- **Pflicht-Referenz für:** Scribe, alle implement-review-Agents, Fix-Planer. **Nicht** für Planungs-Agents.
- **FAKT (korrigiert):** Skill `test-design` **existiert** und ist auf dem Feature-Branch committet (`802c27b`). Vollständig: stackübergreifende Konventionen (AAA, Namensschema, Magic Strings) + Framework-Router (.NET: xUnit v3/FluentAssertions/Moq/WebApplicationFactory; Angular: Karma/Jasmine/TestBed/HttpTestingController) + Templates.
- **Entscheidung (④):** bleibt **eigenständiger Skill** — generisch nützlich auch außerhalb von `feature-delivery`, das ihn **referenziert** (analog `codebase-analyzer`).
- **Rolle im TDD-Prinzip (§8):** Brücke Akzeptanz→Testcode. Komplementär zu `acceptance-design` (§15):

| Skill | Verantwortung | Phase |
|-------|---------------|-------|
| **acceptance-design** | **WAS** muss erfüllt sein — test-fähige Akzeptanzkriterien | Anforderung / Planung |
| **test-design** | **WIE** wird getestet — AAA, Namenskonvention, Magic Strings | Implementierung |

---

## 15. acceptance-design — künftiger Skill (Strang 4, entschieden)

**Zweck:** prüft eine Anforderung auf **test-fähige Akzeptanzkriterien** und schärft bei Bedarf nach. Liefert das F1-Format (§8) als Output.

**Entkopplung (wichtig):** `feature-delivery` **referenziert ihn NICHT zwingend** — es erzeugt die Akzeptanzliste selbst (§8/F1) und läuft vollständig eigenständig. `acceptance-design` ist eine **DRY-Zentralisierung** der Definition „test-fähiges Akzeptanzkriterium" (heute an mehreren Stellen gebraucht: feature-delivery Phase 1/4b/6, buddy-Intake, ado-Story) **plus** Standalone-Tool.

**Kern-Konzept (Handoff-Stand — Details in eigener Session):**

| Aspekt | Festlegung |
|--------|-----------|
| **Typ** | **Aktiver** Prüf-/Schärf-Skill **mit Konventions-Kern** (Definition „test-fähig" als Referenz ladbar) |
| **Eigener Agent** | **ja, leicht** — `acceptance-design-agent` auf **Sonnet**: schlanker, fokussierter Prompt, **keine** Sub-Delegation (arbeitet selbst). Aktiv-interaktiv, nicht nur passive Konvention wie test-design. *Warum Sonnet:* strukturierte Prüfaufgabe mit klaren Kriterien (analog Scout/Topic-Planer), kein tiefes Reasoning. |
| **Eigener Trigger** | ja, standalone — z.B. `schärfe Anforderung`, `Akzeptanzkriterien prüfen`, `@acceptance-design` |
| **Input** | freie Anforderung (Prosa) · ADO-Story · buddy-Plan-Prompt |
| **Output** | geschärfte **test-fähige Akzeptanzliste** (F1-Format) + **Befund** (was war untestbar/schwammig) + **Rückfragen** bei nicht auflösbarer Mehrdeutigkeit |
| **Prüfkern** | „testbar" = messbares/eindeutiges Ergebnis · atomar · beobachtbar (über API/UI) · klare Vorbedingung/Aktion/Ergebnis (AAA-fähig) |
| **Interaktiv** | ja — bei untestbaren Kriterien Rückfragen (fragen → warten → schärfen) |
| **Andockpunkt** | `feature-delivery` **Phase 1** (geklärt); buddy/ado später |

**In eigener Session zu klären (nicht jetzt):** Ausformulierung der Prüfkriterien, exaktes I/O-Format, **wer** konkret referenziert (feature-delivery/buddy/ado) + Verdrahtung.
**Symmetrie zu test-design:** §14.

---

## 16. Skill-Identität — Name, Einstiege, Trigger (entschieden)

### Name (D1)
**`feature-delivery`** ersetzt „Skill-X".
**Warum:** Das ganze Ökosystem (Skills + MCP) ist dev-orientiert; der Name soll **Umsetzungscharakter** tragen. „Delivery" trägt den vollen Bogen Plan→Umsetzung→Qualität und bleibt ergebnisorientiert. Etablierter Begriff (Continuous Delivery).

### Drei Einstiege (D2)

| Einstieg | Trigger | Verhalten |
|----------|---------|-----------|
| **Plan-only** | `plane`, `nur planen`, `erstelle einen Plan` | Voller Planungs-Flow → Plan persistiert (A3) → **STOPP** |
| **End-to-end** | `setze X um`, `implementiere X`, `liefere X`, `umsetzen`, `feature-delivery`, `fix` | Plan → **automatisch** → Umsetzung → fertig |
| **From-existing-plan** | `setze plan <X> um`, `führe plan <X> aus`, `implementiere plan <X>` | Lädt persistierten Plan → **überspringt Planung** → Umsetzung |

**Plan-only-Ausstieg (Aspekt 1 = b):** bewusste, nutzergetriggerte Ausnahme zur „automatisch"-Regel. *Warum:* reiner Planungs-Use-Case ist real; rettet `plane` als ehrlichen Trigger (sonst erzeugte `plane` überraschend Code). Regelkonform, weil nicht still.
**From-existing-plan:** schließt den Plan-only-Pfad sauber ab (`plane` → Nutzer reviewt → `setze plan X um`), nutzt A3-Persistenz, erbt den Zweck des alten `implementation-workflow`.

### Schicksal von `plane` / `implementiere` / `fix`
Alle drei wandern zu `feature-delivery`, **keiner geht verloren** — differenzierte Semantik:
- `plane` → Plan-only-Pfad.
- `implementiere X` → End-to-end · `implementiere plan X` → From-existing („plan" unterscheidet).
- `fix` → End-to-end (kleiner Bugfix bei Bedarf mit Lean-Trigger kombinieren).

---

## 17. build-log-filter — aus dem Scope entfernt (entschieden)

`build-log-filter` ist **nicht** Teil von `feature-delivery`.
**Warum:** Im alten `implementation-workflow` Pflicht-Fallback für rohe Shell-Build-Ausgaben. In `feature-delivery` gibt es diesen Fall nicht — `dev-mcp` liefert bereits strukturierte, token-optimierte Ausgabe. Kein roher Log, kein Filterbedarf. (Bleibt als eigenständiger Skill im Repo, nur außerhalb dieses Features.)

---

## 18. startup.md — Harness-Dokument (Design)

**Ort:** `.claude/startup.md` (Harness-Ebene, **außerhalb** `skills/`).
**Natur:** eigenständiges Harness-Dokument — Beschreibung + interaktiver **Konfig-Leitfaden**. **Kein Skill** (kein Frontmatter, kein Auto-Trigger). Wird explizit geladen.
**Dependency-Richtung:** `startup.md` **kennt die Skills**; die Skills (inkl. `feature-delivery`) kennen `startup.md` **nicht**. `feature-delivery` prüft **nicht**, ob Startup gelaufen ist.
**Zweck (Svens Sicht):** Anhaltspunkt für den geplanten **Skill-Neuaufbau** — was projektspezifisch getroffen/überdacht werden muss. **Wächst klein.**

**Interaktivitätsprinzip:** AI **fragt → wartet → führt aus**. Kein Batch-Durchlauf; jede Maßnahme wird bestätigt, bevor die nächste startet.

**Struktur (Stand Design — Ausformulierung ist Bau-Strang 1):**
```
startup.md
├── Preamble    Wie du diese Datei (mit einer AI) verwendest
├── §1  Voraussetzungen prüfen          [Must-Have, automatisch prüfbar]
│        dev-mcp erreichbar? · codebase-analyzer erreichbar? · jb inspectcode CLI verfügbar?
├── §2  Gate-2-Bootstrap                [Must-Have, einmalig]
│        2a .NET:     ArchUnitNET installieren + Regelklasse + Test-Projekt verdrahten
│        2b Angular:  @angular-eslint Baseline installieren
├── §3  Optionale Maßnahmen             [Entscheidungsfragen, interaktiv]
│        3a eslint-plugin-boundaries — nutzt das Projekt core/shared/features? → Zonen anpassen
│        3b Custom ArchUnit-Regeln über die Baseline hinaus
│        3c Plan-Persistenz-Pfad bestätigen (Default requests/plans/, A3) oder ändern
│        3d Fehler-Format/-Strategie (ProblemDetails/RFC7807 als Default; Exceptions vs. Result)
│        3e Resilience (Polly: Retry/Circuit Breaker/Timeout) — falls Microservices
│        3f Inter-Service-Kommunikation (Message-Bus/Protokoll, Event-Contracts) — falls service-übergreifend
│        3g Logging/Observability (Correlation-IDs/Tracing) · Config/Secrets-Handling · API-Versionierung
├── §4  Verifikation                    Build grün? Lint grün? ArchUnit-Tests grün?
└── §5  Checkliste (Abschluss)          Was wurde eingerichtet — für spätere Referenz
```

**Aktueller Scope:** `dev-mcp` · `codebase-analyzer` · `test-design` · ArchUnitNET-Bootstrap · ESLint-Baseline + `eslint-plugin-boundaries` · **projektspezifische Architektur-Aspekte** (Fehler-Format/-Strategie, Resilience, Inter-Service-Mechanismus, Logging/Observability, Config/Secrets, API-Versionierung — Prinzip-Verweise §12) · Notiz: `analyze_angular_architecture` kommt später. **`build-log-filter` nicht enthalten.**

---

## 19. Umsetzung — sechs Bau-Stränge + Parallelitäts-Modell (D4, entschieden)

Sechs **getrennte** Umsetzungs-Prompts, in eigenen Agent-Sessions.

| Strang | Inhalt | Kategorie | Status |
|--------|--------|-----------|--------|
| **1** | **Skills + Agents** — `skills/feature-delivery/**` (SKILL, flows, references) + Agents in `agents/*` (§5) + `startup.md` | Skill | initial |
| **2** | **MCP initial** — `Mcp-Servers/Dev.Mcp/Dev.Mcp/`: `run_inspectcode` + `lint_angular_project` (§10) + Doku | MCP | initial |
| **3** | **MCP nachgelagert** — `analyze_angular_architecture` (§20) | MCP | **später** |
| **4** | **acceptance-design** — `skills/acceptance-design/**` + `agents/acceptance-design-agent.md` (§15) | Skill | eigener Auftrag, parallel-tauglich |
| **5** | **codebase-analyzer IOSP .NET** — `Mcp-Servers/Codebase.Analyzer.Mcp/`: `analyze_iosp_compliance` (Roslyn, ccdanalyzers-Logik MIT) (§20) | MCP | **später** |
| **6** | **codebase-analyzer IOSP Angular** — `analyze_iosp_compliance` (ts-morph, eigene Impl.) (§20) | MCP | **später** |

### Strang-Details
- **Strang 1** referenziert `test-design` (§14) und die dev-mcp-Tools per Name (Laufzeit, nicht Bauzeit).
- **Strang 4** ist **entkoppelt** von Strang 1 — feature-delivery wartet nicht darauf. Wer auf `acceptance-design` referenziert, wird in dessen eigener Session entschieden (§15).
- **Strang 5/6** liegen im **codebase-analyzer** (eigener MCP, ≠ dev-mcp) — disjunkt von Strang 1–4. Strang 5 (.NET/Roslyn) + 6 (Angular/ts-morph) teilen denselben Server → untereinander sequentiell (wie Strang 2/3). Beide **nachgelagert**, nicht produktionsblockierend.

### Parallelitäts-Modell (entschieden)
**Disjunkte Dateibereiche → parallel im selben Working Tree konfliktfrei.** Strang **1 ⟂ 2 ⟂ 4 ⟂ 5/6** sind parallel-tauglich (verschiedene Ordner/MCPs).

**Zwei Fallen — explizit:**
1. **Geteilte Index-/Doku-Dateien** (`CLAUDE.md` Skill-Liste, evtl. zentrale Skill-Index/Registry, `.claude/settings*`): Auf demselben Branch **ohne** Worktree-Isolation arbeiten Agents im **selben Tree** → **kein** Git-Merge, sondern **Last-Write-Wins im Dateisystem**. → **Lösung:** diese Dateien aus den parallelen Strängen **raushalten** und in einem **finalen, sequentiellen Integrations-Schritt** nachtragen (Sven oder Koordinator-Agent).
2. **Strang 2 ⟂ 3** (dev-mcp) und **Strang 5 ⟂ 6** (codebase-analyzer) sind **untereinander nicht** konfliktfrei — teilen je den MCP-Server-Code (Tool-Registrierung). Da alle nachgelagert sind, kein echtes Parallel-Problem; **innerhalb eines MCP sequentiell** bauen.

**Alternative für echte Konfliktfreiheit auch bei geteilten Dateien:** jeder Agent in eigenem **Git-Worktree** (Merge danach, automatisch bei verschiedenen Zeilen). Bei disjunkten Skill-Ordnern nicht nötig.

**Integrations-Voraussetzung:** Bevor `feature-delivery` **produktiv** läuft, müssen die Strang-2-Tools deployed sein, sonst läuft Gate-2 ins Leere.

---

## 20. Zukunfts-Prompts — nachgelagerte MCP-Tools (Stränge 3, 5, 6)

### Strang 3 — `analyze_angular_architecture` (dev-mcp)

> Wir arbeiten an einem Angular-Architektur-Prüf-Tool als zukünftige Erweiterung des dev-mcp (Dev.Mcp).
>
> **Kontext:** Im Rahmen des `feature-delivery`-Features (Orchestrator-Skill für Feature-Umsetzung in .NET + Angular) haben wir Gate-2 (Statische Analyse) designed. Für .NET nutzen wir ArchUnitNET — prüft kompilierte Assemblies via Reflection. Für Angular nutzen wir eslint-plugin-boundaries — prüft nur Import-Statements.
>
> **Die Lücke** — eslint-plugin-boundaries kann NICHT prüfen: ob eine Klasse namens `*ApiService` wirklich im richtigen Ordner liegt (z. B. `core/api/`) — Naming + Placement; ob ein `*ApiService` ausschließlich `HttpClient` injiziert (kein Business-Logic-Schmuggel); ob `HttpClient` direkt in einem Feature-Service injiziert wird (statt einen ApiService zu nutzen).
>
> **Architektur-Vision (Zonierung):**
> ```
> src/app/
> ├── core/
> │   └── api/          ← ApiServices (nur HttpClient, keine Logik)
> ├── shared/
> │   ├── components/   ← Dumb/Presentational Components
> │   ├── pipes/
> │   └── utils/
> └── features/
>     └── <feature>/
>         ├── pages/       ← Smart/Container Components
>         ├── components/  ← Feature-spezifische Dumb Components
>         └── services/    ← Feature-Services (nutzen ApiServices, kein HttpClient direkt)
> ```
>
> **Geplantes Tool: `analyze_angular_architecture`**
> Input: `projectPath` (Windows-Absolutpfad).
> Output: `{ misplaced: [{ class, path, expectedZone }], httpInFeatureService: [{ class, path }], namingViolations: [{ file, issue }] }`. Token-optimiert.
>
> **Aufgabe:** Design + Umsetzung in `Dev.Mcp` (`C:\Develop\Dv.Ai.Development\Mcp-Servers\Dev.Mcp\Dev.Mcp\`). Pfade immer als Windows-Absolutpfade. Kein Docker-Prefix. Vor Implementierung: Repo-Struktur des MCP-Servers lesen und verstehen, wie bestehende Tools (z. B. `lint_angular_project`) aufgebaut sind.

### Strang 5 — `analyze_iosp_compliance` (.NET, codebase-analyzer)

> Erweitere den codebase-analyzer MCP (`Mcp-Servers/Codebase.Analyzer.Mcp/`, Node/TypeScript + Roslyn-Bridge) um ein Tool `analyze_iosp_compliance` für **C#/.NET**.
>
> **Zweck:** Deterministische IOSP-Prüfung (Integration Operation Segregation) auf Methoden-Ebene — erkennt Methoden, die **Integration** (interne Methodenaufrufe) und **Operation** (Logik/Ausdrücke/externe API-Calls) **mischen**.
>
> **Quelle:** Stefan Liesers Roslyn-Analyzer `slieser/ccdanalyzers` (MIT), Kernlogik in `CleanCodeDeveloper.Analyzers/IOSPAnalyzer.cs`. Logik in die bestehende Roslyn-Komponente (hinter `src/analyzers/roslyn-runner.ts`) übernehmen/adaptieren.
>
> **Integration:** neuer `dotnet-iosp-runner.ts` + Tool-Registrierung in `index.ts` (Muster: bestehende `dotnet-*-runner.ts`).
> **Output (token-optimiert):** `{ summary:{methods, violations}, violations:[{file, method, line, integrationCalls, operationExpr, msg}] }`.
> **Vor Implementierung:** `roslyn-runner.ts` + ein `dotnet-*-runner.ts` lesen, um Bridge + Muster zu verstehen.

### Strang 6 — IOSP für Angular/TS (codebase-analyzer)

> Analog zu Strang 5, aber für **Angular/TypeScript** über die **ts-morph**-Schiene (`src/analyzers/ts-morph-analyzer.ts`). `ccdanalyzers` deckt nur .NET ab → **eigene Implementierung** der IOSP-Klassifikation (Integration vs. Operation je Methode) auf dem TS-AST.
>
> **Zweck:** schließt die .NET/Angular-IOSP-Asymmetrie — gleiche deterministische IOSP-Befunde für beide Stacks.
> **Output:** identisches Schema wie Strang 5.

---

## 21. Entscheidungs-Log (abgeschlossen ✓)

**Aus früheren Runden:**
- Modelle: nur Opus/Sonnet, **kein Haiku**; „Opus-high/low" fallen gelassen. ✓
- Plan-Review-Loop **max. 5**; Impl-Fix-Loop **max. 5**; Scribe 1–3 Sonnet, 4–5 Opus; Fix-Planer **immer Opus**. ✓
- Planning → Implementation **automatisch** (Default; Ausnahme Plan-only, §16). ✓
- `planning-workflow` + `implementation-workflow` als Skills **entfernt**, **keine Aliase**, werden zu `flows/`. ✓
- Skill = **Orchestrator**; planning + implementation als interne Flows. ✓
- `plan-fixer-agent` = **Patcher** (Opus); **zwei** IODA-Agents (Plan + Implement), beide Opus. ✓
- ArchUnitNET **Option A**; ESLint-Baseline im Harness. ✓
- Gate-Sequenz: **Build zuerst** → statische Analyse parallel → IODA → Tests; **Gate-2-Bootstrap**; Gates **integrationsweit**. ✓
- `run_inspectcode` + `lint_angular_project` in dev-mcp, token-optimiert. ✓
- Scope: Feature = **Skills + MCP gemeinsam**. ✓
- Prinzipien: Westphal IODA + IOSP + SOLID + Clean Code; bei Widerspruch SOLID+IODA. ✓
- `lehrer` behalten → **7** Impl-Reviewer; Impl-Loop-Orchestrator = **delegierter Agent auf Opus**. ✓
- Finalen Plan **als Datei** persistieren. ✓

**Aus dieser Runde:**
- **④ test-design:** existiert (`802c27b`); bleibt **eigenständiger Skill**, referenziert. ✓
- **⑨ + B1 eslint-plugin-boundaries:** optional, Zonen-Template + Anpass-Hinweis; **vier** Start-Regeln (§11). Keine MCP-Änderung. ✓
- **B2 analyze_angular_architecture:** Notiz „nachzuliefern" + Prompt (§20); Strang 3. ✓
- **build-log-filter:** aus Scope **raus** (§17). ✓
- **A1:** Plan-Fixer-Blocker → Orchestrator → Topic-Re-Planning → Loop fort. ✓
- **A2:** KRITISCH offen nach Max 5 → Auto-Handoff **gestoppt**; sonst Warnung. ✓
- **A3:** Plan-Persistenz `requests/plans/plan-<feature>.md`. ✓
- **D1 Name:** `feature-delivery`. ✓
- **D2 Einstiege/Trigger:** drei Einstiege; `plane`/`implementiere`/`fix` differenziert übernommen. ✓
- **D3 Lean-Trigger:** `schlank planen`/`lean planen` (+ `kompakt planen`/`Solo-Planung`); `klein` bewusst nicht. ✓
- **D4 Umsetzung:** **vier** getrennte Bau-Stränge (§19), Parallelitäts-Modell mit Index-Datei-Falle. ✓
- **startup.md:** eigenständiges Harness-Dokument außerhalb `skills/` (§18). ✓
- **TDD / Test-First (F1–F4, §8):** test-fähige Akzeptanzliste als Plan-Deliverable (konkrete Testfall-Skizzen, auch Lean); roter Schritt für neue/erweiterte Tests; Scout-Test-Kartierung; Akzeptanz-Coverage durch `lehrer`. *Warum:* Tests-after testen nur den Ist-Zustand. ✓
- **acceptance-design (§15):** eigener künftiger Skill (Strang 4) mit **leichtem** eigenem Agent (`acceptance-design-agent`, **Sonnet**, schlank, keine Sub-Delegation); prüft + schärft Anforderungen auf Testbarkeit; **entkoppelt** von feature-delivery; Symmetrie zu test-design. *Warum:* DRY-Zentralisierung der „test-fähig"-Definition + Standalone-Tool. ✓
- **YAGNI · DRY · KISS** in den Prinzipien-Kanon aufgenommen (§1/§12). *Warum:* YAGNI war im alten planning-workflow-Mantra eigenständig; pragmatische Leitplanken gegen Über-Engineering, Duplikation und unnötige Komplexität. **Ergänzen** den Kanon, **überstimmen** SOLID/IODA nicht. ✓
- **IOSP-Tooling (codebase-analyzer):** deterministisches `analyze_iosp_compliance` — **Strang 5** (.NET, aus `slieser/ccdanalyzers` MIT, Roslyn) + **Strang 6** (Angular, ts-morph, eigene Impl.), beide **nachgelagert** (§19/§20). Dadurch fokussiert `implement-review-ioda-agent` auf **IODA-Architektur**; **ArchUnit-IOSP-Regel bleibt Backstop** (§11). *Warum:* Lieser ist Co-Autor des IOSP-Prinzips → Referenz-Logik; MCP statt NuGet = keine Kundenabstimmung; deterministischer Befund entlastet das LLM-Urteil; Strang 6 schließt die .NET/Angular-IOSP-Asymmetrie. ✓
- **DDD-Leitplanken (gezielt):** **Bounded Context** (A — Planungs-Prinzip, §6/§12) + **Domänen-Modell-Trennung / keine Entity-Durchstecherei** (B — ArchUnit-Regel, §11/§12). Bewusst **ohne** volles DDD-Vokabular (YAGNI/KISS). *Warum:* A schließt eine echte Lücke (Microservice = eigene Domäne; gleiche Namen ≠ gleiche Bedeutung) — vom intra-Service-Kanon bisher nicht abgedeckt; B verhindert Entity-Durchstecherei (von Layering + „Domain frei von Infra" nur teilweise berührt). DDD ist **komplementär** zu IODA/IOSP/SOLID, beißt sich nicht. ✓
- **#1 codebase-analyzer als Gate-Kanal:** `review_git_diff` am Integration-Checkpoint, **alle 5 focusAreas** (security/performance/api-validation/angular-best-practices/solid), Teil von **Strang 1** (keine MCP-Änderung), speist die LLM-Reviewer; Doppel-Findings → Fix-Planer-Dedup (§9). *Warum:* Fähigkeit existiert bereits, war nur nicht als Gate verdrahtet — größter Hebel bei minimalem Neubau. ✓
- **#2 Fehlerbehandlung** als Kanon-Prinzip (§12): nicht verschlucken (prüfbar) + zentrale/konsistente Behandlung + einheitliches API-Fehler-Format. Konkretes Format/Strategie/Resilience → startup.md. *Warum:* Cross-Cutting-Concern, passt zu IOSP/IODA; universell durchsetzbar, Konkretes ist projektspezifisch. ✓
- **#3 Inter-Service-Kommunikation** als Planungs-Prinzip (§12, Ergänzung zu DDD-A): lose Kopplung/async, kein verteilter Monolith, ACL — **nur bei service-übergreifenden Features**. Konkreter Bus/Protokoll/Contracts → startup.md. *Warum:* schließt an Bounded Context an; nicht maschinell prüfbar; YAGNI-Eingrenzung auf Cross-Service. ✓
- **Weitere Aspekte → startup.md (§18):** Resilience, Logging/Observability, Config/Secrets, API-Versionierung, konkrete Fehler-/Kommunikations-Mechanismen. Saga/Eventual Consistency/Idempotenz **vorerst weggelassen** (Overhead). *Warum:* projektspezifisch oder später nachreichbar — bewusst **nicht** im durchsetzbaren Kanon (YAGNI/KISS). ✓
- **Security = immer blockierend:** Security-Findings (severity `critical`, aus codebase-analyzer/inspectcode) sind in Gate 2 **immer blockierend**, nie als Warning gebündelt (§9); zusätzlich expliziter Kanon-Stichpunkt (§12) + Kurzform (§1). *Warum:* zu kritisch, um als eine von 5 focusAreas durchzurutschen — explizites Gewicht statt impliziter Behandlung. ✓

---

## 22. Offene Punkte / verbleibend

| # | Punkt | Stand |
|---|-------|-------|
| — | **Umsetzung** der vier Bau-Stränge (§19) | Bereit — getrennte Prompts, später durch Sven angestoßen |
| — | **Ausformulierung** von `startup.md` | Teil von Bau-Strang 1 |
| — | **acceptance-design Detail-Design** (Prüfkriterien, I/O-Format, Verdrahtung „wer referenziert") | Teil von Bau-Strang 4 (eigene Session, §15) |
| — | **`eslint-boundaries-template.js`** — konkrete Regel-Syntax | Teil von Bau-Strang 1 (Regel-Set steht, §11) |
**Alle inhaltlichen Design-Fragen sind geklärt.** Was verbleibt, ist Umsetzung + Ausformulierung.

---

## 23. Branch / Repo-Status

- Feature-Branch (Harness): `claude/skill-x-agent-framework-xj2zi3`.
- Sven arbeitet lokal auf diesem Branch weiter, **bis das komplette Feature fertig ist** — dann **mergt er selbst** auf `master`. Bis dahin **keine** Änderungen an `master`.
- Noch **nichts implementiert** — Design-Phase abgeschlossen, Umsetzung folgt (§19).
- Branch-Umbenennung auf `feature-delivery` optional, **nicht** vor dem Merge nötig (Sven entscheidet).
