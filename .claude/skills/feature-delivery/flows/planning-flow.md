# Planungs-Flow

Verbindliche Prompt-Vorlagen und Review-Raster: [../references/subagent-prompts.md](../references/subagent-prompts.md).

---

## ⚠️ Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Scope ist zu klein fuer die Subagent-Phasen.** Gilt ohne Ausnahme:

- Phase 3: min. ein `plan-agent-scout` Task-Subagent — kein Grep/Read im Orchestrator-Turn als Ersatz
- Phase 4b: min. ein `plan-agent-topic-planner` Task-Subagent — auch bei Single-Topic, kein Orchestrator-Selbst-Plan
- Plan-Review: 6 Reviewer parallel — keine Rollensimulation im Orchestrator-Turn

**Verboten (haeufigster Fehler):** Orchestrator schaetzt Scope als "klein und klar" ein und erstellt Plan direkt im eigenen Turn ohne Task-Subagents.

## Transparenz-Pflicht vor jeder Delegation

Vor Phase 3: `"Starte jetzt plan-agent-scout fuer [Scope/Teil-Scope]…"`
Vor Phase 4a: `"Phase 4a: Entwerfe Topic-Map und Schnittstellen-Vertrag…"`
Vor Phase 4b: `"Starte jetzt plan-agent-topic-planner fuer Topic [X] (und [Y], [Z]…)…"`
Vor Plan-Review: `"Starte jetzt 6x Review-Agents parallel: Optimist, Pessimist, Normalo, Oberlehrer, Professor, IODA…"`

Wenn Ankuendigung nicht moeglich, weil Phase selbst ausgefuehrt wird → **STOPP:**
`"⚠️ Planungs-Flow nicht konform: Phase [X] ohne Subagent-Delegation. Neu starten."`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Phasen-Gates (verbindlich)

Stufe N+1 startet erst wenn Stufe N vollstaendig abgeschlossen (alle Subagents zurueck, Merge durch Orchestrator). Kein Ueberspringen.

| Stufe | Nutzer-Sicht | Flow-Phasen | Start erst nach … |
|-------|--------------|-------------|-------------------|
| **1** | Anforderung klaeren (ohne Code-Recherche) | 1, 2 | — |
| **2** | Scouts: Code kartieren + Test-Abdeckung mitkartieren | 3 | Stufe 1 |
| **3** | Plan erstellen + Bounded-Context-Denken | 4a → 4b → 4c | Stufe 2 + Scout-Merge |
| **4** | Plan reviewen lassen (6 Reviewer) | Plan-Review-Loop | Stufe 3 (fertige 4c-Arbeitsversion) |
| **5** | Synthese, Persistenz, Handoff | 6 | Stufe 4 |

Parallelitaet nur innerhalb derselben Stufe: Scouts parallel (Phase 3), Topic-Planer parallel (Phase 4b), Reviews parallel — keine Cross-Phase-Parallelitaet.

**Verboten:**
- Plan-Review starten waehrend Phase 4b laeuft
- Phase 4b/Review starten waehrend Phase-3-Scouts laufen
- Review mit vorlaeufigem Entwurf statt merge-fertiger 4c-Arbeitsversion
- `run_in_background` zum Umgehen von Phasen-Gates
- Phase 4b selbst ausfuehren statt an `plan-agent-topic-planner` zu delegieren — auch bei kleinem Scope

---

## Subagent-Typen und Agent-Definitionen

**Modellwahl** (Slugs) nur in `../agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

**Verboten fuer Phase 3, 4b, Review:** `explore`, `generalPurpose`, `shell` oder Rollensimulation im Orchestrator-Turn.

### Rollen im Planungs-Flow

| Rolle | Phase | Parallel? | Max. Laeufe | Modell | Agent-Datei |
|-------|-------|-----------|------------|--------|-------------|
| **Plan-Orchestrator** | 1, 2, 4a, 4c, 6 | — | 1 | Opus | `../agents/plan-agent.md` |
| **Scout** | 3 | bevorzugt | 10 | Sonnet | `../agents/plan-agent-scout.md` |
| **Topic-Planer** | 4b | bevorzugt | 10 | Sonnet | `../agents/plan-agent-topic-planner.md` |
| **Optimist** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-optimist-agent.md` |
| **Pessimist** | Review | bevorzugt | 1 | Opus | `../agents/plan-review-pessimist-agent.md` |
| **Normalo** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-normalo-agent.md` |
| **Oberlehrer** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-oberlehrer-agent.md` |
| **Professor** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-professor-agent.md` |
| **IODA-Reviewer** | Review | bevorzugt | 1 | Opus | `../agents/plan-review-ioda-agent.md` |
| **Plan-Fixer** | Review-Loop | — | 1/Iteration | Opus | `../agents/plan-fixer-agent.md` |

### Ausfuehrung

| Host / Umgebung | Orchestrator | Delegierte Rollen |
|-----------------|--------------|-------------------|
| **Claude Code** | Parent-Agent | System-Prompt = Inhalt der jeweiligen Agent-Datei; Auftrag aus `../references/subagent-prompts.md` |
| **Ohne Subagent-Faehigkeit** | Orchestrator | Limitation transparent; kein Pseudo-Scout/Review |

---

## Planungs-Flow-Struktur

```
Phase 1+2  Anforderung klaeren (ohne Code-Recherche)    Plan-Orchestrator (Opus)
              Buddy-Plan-Prompt als bevorzugte Eingabe (§Buddy-Handoff)
              Bei Mehrdeutigkeit: fokussierte Klaerungsfragen

Phase 3    Scouts 1-10 parallel (read-only)             Scout (Sonnet)
              + bestehende Test-Abdeckung des Bereichs mitkartieren (§8/F3)
              MCP-Sequenz: repo-scout-protocol einhalten
              Zusammenfuehrung durch Plan-Orchestrator nach Scout-Rueckkehr

Phase 4a   Interface-Design / Topic-Map                 Plan-Orchestrator (Opus)
              + Service als eigene Bounded-Context-Domaene denken (§12)
              Topic-Map + Schnittstellen-Vertrag als Deliverable fuer Phase 4b

Phase 4b   Topic-Planer 1-10 parallel                  Topic-Planer (Sonnet)
              + Akzeptanz→Test-Liste je Topic (§8/F1)
              Jeder Planer: ein Topic, Teilplan, kein Gesamtplan, kein Review

Phase 4c   Merge zur Arbeitsversion                     Plan-Orchestrator (Opus)
              Schnittstellen aus 4a vs. Teilplaene: Drift/Luecken aufloesen
   │
   ▼  Plan-Review-Loop (max. 5 Iterationen)
        6 Reviewer parallel:
          optimist (S) · pessimist (O) · normalo (S) · oberlehrer (S) · professor (S) · ioda (O)
        Pruefen u. a.:
          - Vollstaendigkeit + Testbarkeit der Akzeptanzliste (§8/F1)
          - Bounded-Context-Grenzen / kein ungewollter Shared-Kernel (§12)
        Findings?
          ja → Plan-Fixer (Opus) → nächste Iteration
          nein / Max erreicht → weiter
   │
   ▼
Phase 6    Synthese                                      Plan-Orchestrator (Opus)
              - Review-Digest (je Reviewer, KRITISCH-Punkte nicht ignorieren)
              - Komplexitaets- und Executor-Empfehlung
              - Umsetzungs-Topologie (Slices 1-10, Wellen, Integration)
              - Finale Akzeptanz→Test-Liste (§8/F1)
   │
   ▼  Persistenz: requests/plans/plan-<feature>.md  (A3)
   │
   ├─ Plan-only-Einstieg → STOPP (Nutzer reviewt Datei)
   └─ End-to-end-Einstieg → AUTOMATISCH → Implementations-Flow
```

---

## §8/F1 — Akzeptanzliste als Plan-Deliverable

**Pflicht — gilt auch im Lean-Mode.**

Topic-Planer-Output enthaelt pro Akzeptanzkriterium:
- **Testname:** `<Method>_<Situation>_<Expected>` (test-design-Konvention `<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>`)
- **Arrange/Act/Assert-Stichpunkte** (konkret, nicht abstrakt)
- **Markierung:** `neu` / `erweitern` / `unberührt`

**Konkrete Testfall-Skizzen, nicht abstrakte Kriterien.** "User kann sich einloggen" ist NICHT ausreichend — der Scribe muesste interpretieren. Korrekt: `Login_GueltigeKredentiale_RedirectetZuDashboard` mit AAA-Stichpunkten.

Phase 6 konsolidiert zur finalen Akzeptanz→Test-Liste (alle Topics zusammen).

---

## §8/F3 — Scout-Test-Kartierung (Phase 3)

Scouts (Phase 3) kartieren die **bestehende Test-Abdeckung des Bereichs** mit → Plan kann `neu`/`erweitern`/`unberührt` korrekt setzen.

**Vorsicht codebase-analyzer:**
- `analyze_coverage` liefert Stale-Reports → als Hinweis, nicht alleinige Wahrheit
- `detect_untested_public_api` hat False-Positives bei Integration-Tests → als Hinweis, nicht alleinige Wahrheit

---

## §12 — Bounded-Context-Denken in Phase 4a

Plan-Orchestrator denkt jeden Service als eigene Domaene:

- Gleiche Namen (Model/DTO/Parameter) in Service-A und Service-B duerfen unterschiedliche fachliche Bedeutung haben
- Keine geteilten Modelle/DTOs ueber Service-Grenzen (ausser bewusstem Shared Kernel)
- FE-Analogon: Feature-Zonierung (`features/a` kennt nicht `features/b`)

**Plan-Review prueft:** Bounded-Context-Grenzen verletzt? Ungewollter Shared-Kernel?

---

## Arbeitsteilung Plan-Fixer vs. Phase 6 (verbindlich)

- **Plan-Fixer** = iteratives Patchen pro Iteration innerhalb des Review-Loops; aendert nur geflaggte Abschnitte. **Kein Scouting, kein Neudenken, kein Scope-Expand.**
- **Phase 6** = finale Konsolidierung + Komplexitaets-/Executor-Empfehlung + Umsetzungs-Topologie + finale Akzeptanz→Test-Liste. Macht selbst **keine** inhaltliche Plan-Reparatur mehr.

---

## A1 — Plan-Fixer-Blocker

Finding verlangt groessere Aenderung als gezielter Patch → Plan-Fixer gibt **Blocker** zurueck → **Plan-Orchestrator** macht **gezieltes Re-Planning nur des betroffenen Topics** (Mini-4a/4b) → Loop wird fortgesetzt.

*Warum:* Haelt den Loop autonom, nutzt die 5 Iterationen sinnvoll; Eskalation an Nutzer erst wenn Topic-Re-Planning wiederholt scheitert.

---

## A2 — Max-5-Handling

- **Offene KRITISCH-Findings nach Max 5** → der automatische Handoff in die Implementation wird **gestoppt** (Hard Stop + Rest-Findings-Bericht).
- **Nur unkritische Rest-Findings** → Phase 6 laeuft, Handoff **mit dokumentierter Warnung**.

*Warum:* Schuetzt die "automatisch"-Entscheidung davor, kaputte Plaene still durchzureichen; blockiert aber nicht bei Kosmetik.

---

## A3 — Plan-Persistenz

Pfad: **`requests/plans/plan-<feature>.md`**.
Feature-Slug aus Nutzer-Prompt oder ADO-ID.

*Warum:* Konsistent mit `requests/stories/` (ado-Skill); uebersteht Kontext-Kompaktierung beim Auto-Handoff.

---

## Lean-Mode im Planungs-Flow

Wenn `schlank planen`/`lean planen`/`kompakt planen`/`Solo-Planung` aktiv (nur durch Sven explizit):

- Orchestrator (Opus) plant + prueft + reviewed **in sich selbst**
- Phase 3 (Scouts) entfaellt
- Keine Review-Subagent-Armee, kein 5er-Loop
- **Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht** — auch im Lean-Mode wird nie an Test-First gespart
- Kombinierbar mit Plan-only und End-to-end. **NICHT** mit From-existing-plan.

---

## Buddy-Plan-Prompt als bevorzugte Eingabe

| Handoff-Abschnitt | Planungs-Nutzung |
|-------------------|-----------------|
| `## Goal` | Zielbild, Motivation, Ist-Kontext |
| `## Code & Fundstellen` | Wo im Repo — Scout-Auftrag Phase 3 |
| `## Acceptance criteria` | Bindend fuer Plan und Review; Basis fuer §8/F1-Akzeptanzliste |
| `## Decisions / already clarified` | Abgeschlossen — nicht erneut hinterfragen |
| `## Edge cases / open questions` | Einzige Quelle fuer verbleibende Nutzer-Fragen in Phase 1 |
| `## Current vs desired behavior` | Ist/Soll fuer Phase 2 und 4a |

Phase 1 mit Handoff: Handoff als verbindliche Anforderungsbasis — nicht von vorn aufrollen. Verboten: Rueckfragen zu `## Decisions / already clarified`.

---

## Slice-ID-Konvention (IMP-*)

Portable Benennung fuer Implementierungs-Slices in der Umsetzungs-Topologie (Phase 6).

```
IMP-FE-{Bereich}[-{Teil}][-{Nr}]
IMP-BE-{ServiceKuerzel}[-{Teil}][-{Nr}]
```

| Segment | Bedeutung | Regeln |
|---------|-----------|--------|
| `IMP` | Implementierungs-Slice | Fix |
| `FE` / `BE` | UI-Schicht vs. serverseitig | Kein Ersatz fuer Feature- oder Service-Name |
| `{Bereich}` / `{ServiceKuerzel}` | Feature-/Modul-/Service-Kurzname aus Plan | z. B. `Search`, `GW`, `EF`, `ES` |
| `{Teil}` (optional) | Deliverable/Teilscope | z. B. `Rules`, `Routes`, `Migration` |
| `{Nr}` (optional) | Laufende Nummer | z. B. `-1`, `-2` |

**Trivial-Kurzform:** `Topologie: 1x IMP-1, sequentiell, keine Blocking-Deps`.

---

## Abgrenzung ADO und buddy-agent

- **ado:** `load` → `analyse` → `save` — ADO ↔ Markdown; kein Planpaket.
- **buddy-agent:** `buddy intake` / `buddy repo-check` — Sparring, Endprodukt Plan-Prompt.
- **`plane Task …`:** dieser Planungs-Flow — bevorzugte Eingabe: Plan-Prompt aus Buddy.

---

## Antwortformat

Deutsch, klar strukturiert. Mermaid fuer grenzueberschreitende Flows. Fokussiert — umsetzbarer Plan, keine Essay-Laenge.
Keine Code-Beispiele ohne explizite Nachfrage.
