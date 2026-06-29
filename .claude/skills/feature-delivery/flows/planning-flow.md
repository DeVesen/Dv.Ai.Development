# Planungs-Flow

Verbindliche Prompt-Vorlagen und Review-Raster: [../references/subagent-prompts.md](../references/subagent-prompts.md).

---

## ⚠️ Anti-Shortcut-Regel — gilt im Strong-Mode (hoechste Prioritaet, ohne Ausnahme)

**Im Strong-Mode ist kein Scope zu klein fuer die Subagent-Phasen.** Gilt ohne Ausnahme bei explizitem `strong`:

- Phase 3: min. ein `plan-agent-scout` Task-Subagent — kein Grep/Read im Orchestrator-Turn als Ersatz
- Phase 4b: min. ein `plan-agent-topic-planner` Task-Subagent — auch bei Single-Topic, kein Orchestrator-Selbst-Plan
- Plan-Review: 6 Reviewer parallel — keine Rollensimulation im Orchestrator-Turn

**Verboten im Strong-Mode (haeufigster Fehler):** Orchestrator schaetzt Scope als "klein und klar" ein und erstellt Plan direkt im eigenen Turn ohne Task-Subagents.

*Lean-Mode (Default, ohne `strong`): Orchestrator plant solo — das ist regelkonformes Verhalten, kein Shortcut.*

## Transparenz-Pflicht vor jeder Delegation

Vor Phase 3: `"Starte jetzt plan-agent-scout fuer [Scope/Teil-Scope]…"`
Vor Phase 4a: `"Phase 4a: Entwerfe Topic-Map und Schnittstellen-Vertrag…"`
Vor Phase 4b: `"Starte jetzt plan-agent-topic-planner fuer Topic [X] (und [Y], [Z]…)…"`
Vor Plan-Review: `"Starte jetzt 6x Review-Agents parallel: Guard, Risk, Readiness, Craft, Auditor, Design-Principles…"`

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
| **Guard** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-guard-agent.md` |
| **Risk** | Review | bevorzugt | 1 | Opus | `../agents/plan-review-risk-agent.md` |
| **Readiness** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-readiness-agent.md` |
| **Craft** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-craft-agent.md` |
| **Auditor** | Review | bevorzugt | 1 | Sonnet | `../agents/plan-review-auditor-agent.md` |
| **Design-Principles** | Review | bevorzugt | 1 | Opus | `../agents/plan-review-design-principles-agent.md` |
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
          guard (S) · risk (O) · readiness (S) · craft (S) · auditor (S) · design-principles (O)
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
              - Uncertainty Audit (§UA — Pflicht, auch im Lean-Mode)
   │
   ▼  Plan-Coverage-Check (Pflicht — gilt im Lean-Mode UND Strong-Mode)
        Part A: delivery-inspection Sub-Agents auf den Plan
          → alle expliziten + impliziten Anforderungen abgedeckt?
          → Anforderungen korrekt verstanden, nicht zu eng/weit?
          → Findings → Plan patchen → erneut bis sauber
        Part B: Orchestrator-Tabelle (solo)
          → jeder Plan-Schritt hat AC + Testname (test-design-Konvention) + AAA-Stichpunkte
          → auch implizite Tests: Fehlerbehandlung, Edge Cases, Security, erweiterte Bestandstests
          → Fehlende Eintraege → direkt ergaenzen
   │
   ▼  Persistenz: requests/plans/plan-<feature>.md  (A3)
   │
   ├─ Plan-only-Einstieg → STOPP (Nutzer reviewt Datei)
   └─ End-to-end-Einstieg:
        Uncertainty Audit leer?
          ja  → AUTOMATISCH → Implementations-Flow
          nein → STOPP (§UA-Stop) — kein Auto-Handoff
```

---

## Plan-Coverage-Check (nach Phase 6, Pflicht — gilt immer)

**Gilt im Lean-Mode UND Strong-Mode, nach Phase 6, vor Persistenz.**
**Lean-Mode spart an Planungs-Tiefe — nicht an dieser Vollstaendigkeits-Pruefung.**

Der Plan ist der einzige Vertrag fuer Implementation, Scribes, Quality Gates und Delivery-Inspection.
Jede Luecke hier zieht sich als roter Faden durch den gesamten Flow.

### Part A — Requirements-Coverage (Sub-Agents, delivery-inspection)

`delivery-inspection` Skill wird auf den fertigen Plan angewendet.
Deliverable = Plan + Akzeptanzliste. Anforderung = originaler Nutzer-Request.

Besonderer Fokus fuer alle 6 Reviewer:
- Alle **expliziten Anforderungen** aus dem Request im Plan adressiert?
- **Implizite Anforderungen** beruecksichtigt: nicht-funktionale Anforderungen, Sicherheit, Edge Cases, Migrationen, Backwards-Compatibility?
- Anforderungen **korrekt verstanden** — oder zu eng/weit ausgelegt?

Findings → Plan-Orchestrator patcht Plan → erneuter Durchlauf bis sauber.

Anti-Shortcut: min. ein `delivery-inspection`-Durchlauf mit echten Sub-Agents — auch im Lean-Mode.

### Part B — AC/TDD-Coverage (Orchestrator self-check, strukturierte Tabelle)

| Plan-Schritt / Slice | Akzeptanzkriterium | Testname (test-design-Konvention) | AAA-Stichpunkte | Status |
|---------------------|-------------------|----------------------------------|-----------------|--------|
| [Slice/Schritt] | [AC-Text] | `<Method>_<Situation>_<Expected>` | vorhanden / fehlt | vollstaendig / lueckenhaft / fehlt |

Status `lueckenhaft` oder `fehlt` → Orchestrator ergaenzt Plan direkt.
Erst wenn alle Eintraege `vollstaendig`: weiter zu Persistenz.

**Auch implizit notwendige Tests muessen explizit erscheinen** — kein "ergibt sich aus dem Code":
- Fehlerbehandlung / Edge Cases
- Security-relevante Pfade
- Bestehende Tests die erweitert werden (`erweitern`-Markierung)

*Warum:* Plan-Review prueft Plan-Qualitaet (Architektur, Bounded Context). Der Coverage-Check prueft ob jede Anforderung adressiert und jeder Plan-Schritt TDD-faehig ist. Beides zusammen schliesst die Luecke zwischen Besteller-Erwartung und Implementierungs-Vertrag.*

---

## §UA — Uncertainty Audit (Phase 6, Pflicht)

**Gilt immer — auch im Lean-Mode, auch im Plan-only-Einstieg.**

Plan-Orchestrator erstellt am Ende von Phase 6 zwei Listen:

| Liste | Inhalt |
|-------|--------|
| **Offen** | Punkte, die in der Anforderung unklar geblieben sind und nicht entschieden wurden |
| **Selbst-entschieden** | Punkte, wo der Orchestrator selbst eine Annahme getroffen hat, die der Nutzer nicht explizit vorgegeben hat |

Beide Listen werden im persisitierten Plan (`requests/plans/plan-<feature>.md`) als eigener Abschnitt "## Uncertainty Audit" dokumentiert.

**§UA-Stop (nur End-to-end-Einstieg):**

Wenn mindestens ein Eintrag in einer der beiden Listen:

```
⚠️ Plan enthaelt offene oder selbst-entschiedene Punkte.
Bitte in requests/plans/plan-<feature>.md nachschaerfen:

Offen:
  - [Liste]

Selbst-entschieden (Annahmen des Orchestrators):
  - [Liste]

→ Danach mit `setze plan <feature> um` fortsetzen.
```

Kein Auto-Handoff, kein stiller Uebergang in die Implementierung.

**Wenn beide Listen leer:** Auto-Handoff laeuft normal.

*Warum Selbst-entschieden separat:* Annahmen, die der Orchestrator intern getroffen hat, sehen im Plan oft wie Entscheidungen aus — der Nutzer muss die Moeglichkeit haben, sie zu sehen und zu korrigieren bevor Code entsteht.*

---

## Check-Flow / Check-Plus-Flow

### Check (`check`, `validate`)

Kein Subagent, kein Scouting — reiner Orchestrator-Turn.

```
Plan-Orchestrator (Opus)
  Analysiert: Anforderungsbeschreibung
  Liefert:
    - Bewertung N/7 + Einstufungstext
    - Begruendung (Komplexitaets-Signale, Integrationspunkte, Bounded-Context-Risiken)
    - Faktoren-Vorbehalt: "Erst nach Scouting sichtbar: [Liste moeglicher Ueberraschungen]"
    - Empfehlung: Einstieg + lean/full

→ STOPP
```

**Skala:**

| Wert | Einstufung | Beschreibung |
|------|-----------|--------------|
| 1–2 | Full Planning zwingend | Viele Unbekannte, Cross-Service-Integration, Datenmigration, kein Scope-Mapping moeglich |
| 3 | Full Planning empfohlen | Einige bekannte Bereiche, aber kritische offene Punkte |
| 4 | Grauzone | Scouting koennte Einschaetzung noch kippen — `check plus` empfohlen |
| 5 | Lean sicher | Scope klar, bekannte Codebasis, ueberschaubare Integration |
| 6–7 | Lean/Trivial | Single-Class oder -Methode, keine Integration, vollstaendig klar |

### Check-Plus (`check plus`, `validate plus`)

Wie Check, aber Phase 3 (Scouts) wird ausgefuehrt.

```
Phase 3    Scouts 1-N parallel (read-only)              Scout (Sonnet)
              Anti-Shortcut-Regel gilt: min. ein plan-agent-scout Task-Subagent
              Orchestrator merged Scout-Ergebnisse

Plan-Orchestrator (Opus)
  Analysiert: Anforderungsbeschreibung + Scout-Ergebnisse
  Liefert: Bewertung N/7 (Code-gestuetzt) + Begruendung + Empfehlung

→ STOPP
```

Hoehere Konfidenz als reiner Check — empfohlen bei Bewertung 4 oder bei wenig Code-Kontext in der Beschreibung.

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

## MDC-Selektor-Annotationsliste (Angular Material)

Angular Material MDC entfernt bestimmte DOM-Attribute zur Laufzeit und ersetzt sie durch CSS-Klassen.
Planner MUSS bei mat-*-Selektoren diese Liste vor dem Aufnehmen in den Plan konsultieren.

| Alter Selektor / Attribut | Korrekte MDC-Klasse / Selektor | Hinweis |
|--------------------------|-------------------------------|---------|
| `mat-hint[align="end"]` | `.mat-mdc-form-field-hint-end` | `align`-Attribut wird zur Laufzeit entfernt |
| `mat-error` (direkter Tag-Selektor) | `.mat-mdc-form-field-error` | Tag bleibt, direkte Tag-Selektoren sind instabil |
| `mat-label` | `.mat-mdc-floating-label` | MDC rendert floating label in Shadow-DOM-ähnlichem Pattern |
| `mat-hint` (ohne align) | `.mat-mdc-form-field-hint-wrapper` | Allgemeiner Hint-Container |
| `mat-form-field .mat-form-field-wrapper` | `.mat-mdc-form-field-flex` | Wrapper-Element wird umbenannt |

**Wartung:** Beim Angular Material Major Release — Liste auf neue MDC-Klassen prüfen (siehe SKILL.md).
**Unbekannte mat-*-Selektoren:** Nicht in Liste → aus Angular Material Quellcode / MDC-Doku ableiten, nicht raten.

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

*Hinweis:* A2 betrifft Review-Findings. §UA-Stop (Uncertainty Audit) ist davon unabhaengig und prueft danach nochmals separat.

*Warum:* Schuetzt die "automatisch"-Entscheidung davor, kaputte Plaene still durchzureichen; blockiert aber nicht bei Kosmetik.

---

## A3 — Plan-Persistenz

Pfad: **`requests/plans/plan-<feature>.md`**.
Feature-Slug aus Nutzer-Prompt oder ADO-ID.

*Warum:* Konsistent mit `requests/stories/` (ado-Skill); uebersteht Kontext-Kompaktierung beim Auto-Handoff.

---

## Lean-Mode im Planungs-Flow (Default)

Aktiv wenn kein `strong` Zusatz vorhanden — also standardmaessig bei allen Plan-only- und End-to-end-Einstiegen.
`schlank planen`/`lean planen`/`kompakt planen`/`Solo-Planung` bleiben als explizite Synonyme gueltig.

Wenn Lean-Mode aktiv:

- Orchestrator (Opus) plant + prueft + reviewed **in sich selbst**
- Phase 3 (Scouts) entfaellt
- Keine Review-Subagent-Armee, kein 5er-Loop
- **Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht** — auch im Lean-Mode wird nie an Test-First gespart
- **Uncertainty Audit (§UA) bleibt Pflicht** — auch im Lean-Mode
- **Plan-Coverage-Check (beide Teile) bleibt Pflicht** — Part A: delivery-inspection Sub-Agents (auch im Lean-Mode, keine Ausnahme), Part B: Orchestrator-Tabelle solo. Lean spart an Planungs-Tiefe, nicht an Vollstaendigkeits-Pruefung.
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

## Outer-Loop-Re-Planung (Iteration 2+)

Wenn der Outer Loop einen Requirement-Gap zurueckmeldet (Delta-Protokoll vorhanden), laeuft Schritt 2 als **Delta-Plan** — kein Vollplan.

### Eingabe

- Originaler Request (unveraendert — Reviewer behalten Gesamtkontext)
- Delta-Protokoll (`requests/plans/plan-<feature>-delta-<N>.md`)
- Bestehender Plan (`requests/plans/plan-<feature>.md`) — geerbt als Basis

### Planungs-Umfang

Nur geaenderte/neue Topics werden neu geplant. Unveraenderte Plan-Teile werden geerbt (kein Re-Scouting, kein Re-Review dafuer).

| Was sich aendert | Was passiert |
|-----------------|-------------|
| Neues AC / neuer Scope | Neues Topic → Topic-Planer (strong) oder Orchestrator solo (lean) |
| Wegfallendes AC | Betroffenen Plan-Teil entfernen / anpassen |
| Modifiziertes AC | Betroffenes Topic neu planen |
| Unveraenderte Topics | Aus bestehendem Plan uebernehmen — kein erneuter Durchlauf |

### Lean/Strong in Iteration 2+

| Bedingung | Empfehlung |
|-----------|-----------|
| PO-Delta ≤ 1 AC-Aenderung | Lean (Orchestrator solo auf Delta) |
| PO-Delta > 1 AC-Aenderung | **Strong empfohlen** — Orchestrator gibt Empfehlung aus, Nutzer entscheidet |

*Warum: Ein einzelnes geaendertes AC ist in der Regel ein gezielter Patch. Mehrere Aenderungen koennen sich gegenseitig beeinflussen — Scouts und Review lohnen sich dann.*

### Reviewer-Kontext in Iteration 2+

Alle Plan-Reviewer (Phase Review-Loop) erhalten:
- Originalen Request (Gesamtziel bleibt sichtbar)
- Delta-Protokoll (was hat sich geaendert und warum)
- Aktualisierten Plan (Vollplan = geerbt + neue/geaenderte Topics)

*Warum: Reviewer muessen das Gesamtbild sehen, nicht nur den Delta — sonst koennen sie Konsistenz und Bounded-Context nicht pruefen.*

### Persistenz

Aktualisierter Plan ueberschreibt `requests/plans/plan-<feature>.md`.
Delta-Protokoll bleibt als `requests/plans/plan-<feature>-delta-<N>.md` erhalten (Audit-Trail).

---

## Abgrenzung ADO und buddy-agent

- **ado:** `load` → `analyse` → `save` — ADO ↔ Markdown; kein Planpaket.
- **buddy-agent:** `buddy intake` / `buddy repo-check` — Sparring, Endprodukt Plan-Prompt.
- **`plane Task …`:** dieser Planungs-Flow — bevorzugte Eingabe: Plan-Prompt aus Buddy.

---

## Antwortformat

Deutsch, klar strukturiert. Mermaid fuer grenzueberschreitende Flows. Fokussiert — umsetzbarer Plan, keine Essay-Laenge.
Keine Code-Beispiele ohne explizite Nachfrage.
