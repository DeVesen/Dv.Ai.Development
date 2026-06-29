# Implementations-Flow

Verbindliche Prompt-Vorlagen und Review-Raster: [../references/subagent-prompts.md](../references/subagent-prompts.md).

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

## ⚠️ Orchestrator-Delegation-Pflicht — Anti-Shortcut-Regel

**Impl-Loop-Orchestrator schreibt keinen Produkt-Code selbst — immer Scribes.**

**Verboten:**
- Orchestrator schreibt Produkt-Code statt Scribe zu delegieren
- Orchestrator- und Implementierer-Rolle in einem Turn zusammenlegen
- Kein Hard Gate / kein 7x Review-Loop trotz abgeschlossener Implementierung

**Transparenz-Pflicht vor Schritt 2:** Im Chat ausgeben:
`"Starte jetzt implement-scribe-agent fuer Slice [IMP-*]…"`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## From-existing-plan-Einstieg

- Laedt `requests/plans/plan-<feature>.md`
- **Hard Gate laeuft trotzdem** — prueft Umsetzbarkeit des geladenen Plans
- Ueberspringt den gesamten Planungs-Flow
- Dann: direkt in den Implementations-Flow (ab Hard Gate)

---

## Subagent-Typen und Agent-Definitionen

**Modellwahl** ausschliesslich in `../agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

### Rollen im Implementations-Flow

| Rolle | Schritt | Modell | Agent-Datei |
|-------|---------|--------|-------------|
| **Impl-Loop-Orchestrator** | Gesamter Flow | Opus | `../agents/implement-loop-orchestrator.md` |
| **Scribe Runden 1-3** | Slice-Implementierung | Sonnet | `../agents/implement-scribe-agent.md` |
| **Scribe Runden 4-5** | Eskalation | Opus | `../agents/implement-scribe-opus-agent.md` |
| **Risk** | Review | Opus | `../agents/implement-review-risk-agent.md` |
| **Design-Principles** | Review | Opus | `../agents/implement-review-design-principles-agent.md` |
| **Verifier** | Review | Sonnet | `../agents/implement-review-verifier-agent.md` |
| **Readiness** | Review | Sonnet | `../agents/implement-review-readiness-agent.md` |
| **Craft** | Review | Sonnet | `../agents/implement-review-craft-agent.md` |
| **Auditor** | Review | Sonnet | `../agents/implement-review-auditor-agent.md` |
| **Guard** | Review | Sonnet | `../agents/implement-review-guard-agent.md` |
| **Fix-Planer** | Fix-Planung | Opus | `../agents/implement-fix-planner-agent.md` |

---

## Implementations-Flow-Struktur

```
Hard Gate (Readiness)              Impl-Loop-Orchestrator (Opus, delegierter Agent)
   │  (gilt fuer End-to-end UND From-existing-plan)
   │  Prueft Umsetzbarkeit des Plans (Scope, ACs, Akzeptanzliste, Slices)
   │
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
        - Subagent-Outputs sammeln (Summaries, Touched Paths)
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
             • lint_angular_project          (dev-mcp) → ng lint inkl. eslint-plugin-boundaries
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
        | CSS/HTML-only | Ausschliesslich `.html`/`.scss`/`.css`; kein `.ts`, kein Backend | 4 Reviewer: Structure · CSS-Logic · AC-Coverage · Regression |
        | Single-Service | `.ts`-Dateien eines Angular-Services/Components oder eines .NET-Services | Standard-7-Reviewer |
        | Cross-Service | Aenderungen in ≥2 Services, BE+FE gemeinsam, Migrations | Standard-7 + Integration-Reviewer |

        → Scope einmal klassifizieren; Ensemble entsprechend starten; nicht nachjustieren.
   │
   ▼  7 Reviewer parallel (readonly):
        risk (O) · design-principles (O) · verifier (S) · readiness (S) · craft (S) · auditor (S) · guard (S)

        verifier prueft zusaetzlich:
          - Fachliche Korrektheit (kein anderer Reviewer)
          - Explizite AC-Map: jedes Akzeptanzkriterium einzeln auf Test gemappt (§8/F4)

        codebase-analyzer review_git_diff-Befunde → speisen als Evidenz alle Reviewer
   │
   ▼  Findings → Fix-Planer (Opus, immer) → Fix-Scribes → Gates erneut
        Runden 4-5: implement-scribe-opus-agent + Fix-Planer-Opus
   │
   ▼  Nach Runde 5 mit offenen Findings:
        Final-Gate (wenn Fix-Scribes in Runde 5 liefen): Build + Test via dev-mcp
        → Hard Stop + Rest-Findings-Bericht
   │
   ▼  Delivery-Inspection (nach Impl-Fix-Loop, vor Closure)
        6 Reviewer parallel: Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker
        Findings → impl-loop-orchestrator → Fix-Scribe oder User-Eskalation
        Erst nach sauberem Durchlauf: weiter zu Closure
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

**Impl-Loop-Orchestrator implementiert nicht.** Alle Produkt-Edits nur durch Scribes.

**Trivial-Edit-Ausnahme (Orchestrator darf direkt editen — strenge Positivliste):**
Wenn ALLE Bedingungen gleichzeitig erfuellt sind:
  1. Maximal 3 Dateien betroffen
  2. Pro Datei genau 1 Aenderungszeile (kein Block, kein Umstrukturieren)
  3. Zeilen-ID aus Plan eindeutig identifizierbar (Zeilennummer oder eindeutiger String)
  4. Aenderungstyp aus Positivliste:
     - Single-line typo fix (Tippfehler in String/Bezeichner)
     - Import-only change (eine Import-Zeile ergaenzen/entfernen)
     - Comment-change (Kommentar korrigieren)

→ Orchestrator fuehrt Edit direkt aus — keine Scribe-Delegation.
→ Ausserhalb der Positivliste: Scribe-Delegation gilt ohne Ausnahme.
→ Bei Zweifel: Scribe delegieren.

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
Fuer jeden IMP-* Slice aus der Plan-Topologie pruefen:
- Liegt mindestens eine Datei in den Scribe-Touched-Paths, die zum erwarteten Slice-Scope passt?
- Nein → BLOCKER: Slice [ID] hat keine Touched Paths. Gate-Start verboten. Fix-Scribe beauftragen, dann erneut pruefen.
- Ausgabe: Tabelle `IMP-Slice | Erwarteter Scope | Touched Paths | OK / BLOCKER`

Danach:
- Subagent-Outputs sammeln (Summaries, Touched Paths, Diffs)
- Geaenderte Stacks klassifizieren → Gate-Scope
- Interface-/Contract-Drift zwischen Slices pruefen
- Merge-/Konflikt-Risiko bewerten

---

## Schritt 3 — Iterativer Impl-Fix-Loop

Max. **5 Runden**. Impl-Loop-Orchestrator orchestriert; keine Rollensimulation statt Subagents.

**Pro Runde:** Quality Gates → 7x Review → Digest → Fix-Planer → Fix-Scribes.

**Frueherer Abbruch:** Keine behebbaren Findings + alle Gates gruen → Loop sofort beenden.

**Nach Runde 5 mit offenen Findings:** Rest-Findings-Bericht; kein weiterer Fix-Zyklus.

### Quality-Gate-Sequenz-Logik

- **Errors in Gate 1 oder 2** → Gate 3+4 warten; Fix zuerst
- **Nur Warnings** → alle Gates durchlaufen; gebündelte Findings an Fix-Planer
- **Security-Findings (severity `critical`)** → **immer blockierend** wie Errors — unabhaengig vom Kanal (codebase-analyzer / inspectcode), **nie** als Warning gebuendelt durchgewunken

### Jede Runde

**3.1 Quality Gates (integrationsweit)**

Gate-Reihenfolge einhalten (Build → Statische Analyse → Design-Principles → Tests). Alle Gates dokumentiert rueckmelden.

**3.2 Sieben Impl-Reviews (parallel, readonly)**

7 Subagents, je eine Rolle. Verboten: Rollensimulation im Orchestrator-Thread.
Jeder erhaelt: finaler Plan + ACs + Akzeptanzliste, aktueller Diff/Touched Paths, Gate-Status pro Stack, codebase-analyzer review_git_diff-Befunde als Evidenz.
Task-Prompts: jeweiliger Abschnitt in `../references/subagent-prompts.md`.

**3.3 Review-Digest:** Alle 7 Reports → Review-Digest (Runde N).

**3.4 Findings klassifizieren:**
- Eindeutig fixbar: Correctness-Luecken, fehlende Tests, Rule-Violations, Security-Befunde
- Klaerungsbeduerftig: Produkt-/Design-Ambiguitaet, konfligierende AC-Interpretation

**3.5 Gebuendelte Nutzer-Rueckfragen:** Wenn klaerungsbeduerftig → eine gebuendelte Frage. Warten vor Fix-Planer.

**3.6 Fix-Planer (Opus, immer):** Genau ein `implement-fix-planner-agent` pro Runde. Verboten: Orchestrator-authored Fix-Plaene; Fix-Scribes ohne Fix-Planer-Output. Fix-Planer dedupliziert Doppel-Findings aus inspectcode + codebase-analyzer (v. a. `solid`-Ueberschneidungen).

**3.7 Fix-Scribes:** Scribe-Typ je nach Runde (Runden 1-3: Sonnet; Runden 4-5: Opus).

**3.8 Iterations-Zusammenfassung:** Runden-Nr., Finding-Anzahl je Reviewer, was gefixt, Gate-Status, ob naechste Runde startet oder Loop endet.

**3.9 Abbruchbedingung:**
1. Sauber: keine behebbaren Findings + alle Gates gruen.
2. Maximum: nach Runde 5 — unabhaengig von offenen Findings.

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

## Schritt 4 — Delivery-Inspection (5c — Outer Loop Gate)

Letzter Schritt vor Closure — prueft ob alle Anforderungen erfuellt wurden.
Kein Code-Qualitaets-Check (Gates und Reviews haben das erledigt) — sondern Anforderungserfuellung aus Besteller-Perspektive.

Aufruf: `delivery-inspection` skill (siehe [../../delivery-inspection/SKILL.md](../../delivery-inspection/SKILL.md)).

Jeder Reviewer erhaelt: originale Anforderung + finaler Plan + Diff/Touched Paths + Gate-Status.

### Finding-Klassifikation (verbindlich)

Impl-Loop-Orchestrator klassifiziert jeden Befund in eine von drei Kategorien:

| Kategorie | Kriterium | Reaktion |
|-----------|-----------|----------|
| **Implementation-Gap** | Das Richtige wurde nicht korrekt umgesetzt (fehlendes Feature, falsches Verhalten, AC nicht erfuellt) | Fix-Scribe beauftragen → Inner Loop |
| **Requirement-Gap** | Das Falsche wurde umgesetzt, oder neuer Scope entsteht (PO aendert Ziel, AC faellt weg, neues AC entsteht) | Delta-Protokoll erstellen → Outer Loop zurueck zu Schritt 1 |
| **Unklar** | Produkt-/Design-Ambiguitaet, nicht eindeutig klassifizierbar | User eskalieren (gebuendelt, einmalige Frage) — warten vor Entscheidung |

### Delta-Protokoll (bei Requirement-Gap)

Wenn mindestens ein Requirement-Gap gefunden → Orchestrator erstellt Delta-Protokoll vor dem Rueckweg zu Schritt 1:

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

### Planungs-Empfehlung fuer Iteration [N+1]
- Anzahl AC-Aenderungen: [N]
- Empfehlung: [lean / strong]
  (Automatisch strong wenn > 1 AC-Aenderung)
```

Dieses Protokoll wird in `requests/plans/plan-<feature>-delta-<N>.md` persistiert und ist die verbindliche Eingabe fuer Schritt 1 der naechsten Outer-Loop-Iteration.

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
