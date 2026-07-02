# Planungs-Flow

Verbindliche Prompt-Vorlagen: [../references/subagent-prompts.md](../references/subagent-prompts.md).

---

## Planung ist lean/solo

Der `plan-agent` (Opus) plant **solo** — er klärt, entwirft, konsolidiert und reviewt den Plan in sich selbst. **Keine Scouts, kein Topic-Planer, kein Plan-Review-Loop, kein Plan-Fixer.** Das Solo-Planen ist regelkonformes Verhalten, kein Shortcut.

Einzige Delegation: die `delivery-inspection`-Sub-Agents im Plan-Coverage-Check (Part A, s.u.) — sie prüfen den fertigen Plan auf Anforderungsabdeckung.

## Transparenz-Pflicht vor der Coverage-Delegation

Der `plan-agent` arbeitet solo; die einzige Delegation ist der Plan-Coverage-Check Part A. Vor ihr im Chat ankuendigen:
`"Starte jetzt delivery-inspection Sub-Agents auf den fertigen Plan (Coverage-Check)…"`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Planungs-Flow-Struktur (lean/solo)

```
Phase 1+2  Anforderung klaeren                           plan-agent (Opus)
              Buddy-Plan-Prompt als bevorzugte Eingabe (§Buddy-Handoff)
              Bei Mehrdeutigkeit: fokussierte Klaerungsfragen

Phase 4a   Interface-Design / Topic-Map + Teilplaene     plan-agent (Opus, solo)
              + Service als eigene Bounded-Context-Domaene denken (§12)
              + je Topic Akzeptanz→Test-Liste (§8/F1)

Phase 4c   Konsolidierung zur Arbeitsversion             plan-agent (Opus, solo)
              Schnittstellen vs. Teilplaene: Drift/Luecken aufloesen
              IMP-Slices konsolidieren, Wellen/Blocking vorbereiten

Phase 6    Synthese                                      plan-agent (Opus, solo)
              - Komplexitaets- und Executor-Empfehlung
              - Umsetzungs-Topologie (Slices, Wellen, Integration)
              - Finale Akzeptanz→Test-Liste (§8/F1)
              - Uncertainty Audit (§UA — Pflicht)
   │
   ▼  Plan-Coverage-Check (Pflicht)
        Part A: delivery-inspection Sub-Agents auf den Plan
          → alle expliziten + impliziten Anforderungen abgedeckt?
          → Anforderungen korrekt verstanden, nicht zu eng/weit?
          → Findings → Plan patchen → erneut bis sauber
        Part B: Orchestrator-Tabelle (solo)
          → jeder Plan-Schritt hat AC + Testname + AAA-Stichpunkte
   │
   ▼  Persistenz: requests/plans/plan-<feature>.md  (A3)
   │
   └─ STOPP — Planung endet hier (kein Auto-Implement, SKILL.md Story-Gate Schritt 4).
        Story → planned. §UA-Eintraege werden beim STOPP gemeldet.
        Umsetzung erst auf expliziten Implement-Trigger:
          implementiere <ID>      → volle Loops
          implementiere nur <ID>  → Lean Single-Pass
```

---

## Plan-Coverage-Check (nach Phase 6, Pflicht)

**Pflicht nach Phase 6, vor Persistenz.**
**Solo-Planung spart an Delegation — nicht an dieser Vollstaendigkeits-Pruefung.**

Der Plan ist der einzige Vertrag fuer Implementation, Scribes, Quality Gates und Delivery-Inspection.
Jede Luecke hier zieht sich als roter Faden durch den gesamten Flow.

### Part A — Requirements-Coverage (Sub-Agents, delivery-inspection)

`delivery-inspection` Skill wird auf den fertigen Plan angewendet.
Deliverable = Plan + Akzeptanzliste. Anforderung = originaler Nutzer-Request.

Besonderer Fokus fuer alle 6 delivery-inspection-Reviewer:
- Alle **expliziten Anforderungen** aus dem Request im Plan adressiert?
- **Implizite Anforderungen** beruecksichtigt: nicht-funktionale Anforderungen, Sicherheit, Edge Cases, Migrationen, Backwards-Compatibility?
- Anforderungen **korrekt verstanden** — oder zu eng/weit ausgelegt?

Findings → `plan-agent` patcht Plan → erneuter Durchlauf bis sauber.

Anti-Shortcut: min. ein `delivery-inspection`-Durchlauf mit echten Sub-Agents — keine Rollensimulation im plan-agent-Turn.

### Part B — AC/TDD-Coverage (Orchestrator self-check, strukturierte Tabelle)

| Plan-Schritt / Slice | Akzeptanzkriterium | Testname (test-design-Konvention) | AAA-Stichpunkte | Status |
|---------------------|-------------------|----------------------------------|-----------------|--------|
| [Slice/Schritt] | [AC-Text] | `<Method>_<Situation>_<Expected>` | vorhanden / fehlt | vollstaendig / lueckenhaft / fehlt |

Status `lueckenhaft` oder `fehlt` → `plan-agent` ergaenzt Plan direkt.
Erst wenn alle Eintraege `vollstaendig`: weiter zu Persistenz.

**Auch implizit notwendige Tests muessen explizit erscheinen** — kein "ergibt sich aus dem Code":
- Fehlerbehandlung / Edge Cases
- Security-relevante Pfade
- Bestehende Tests die erweitert werden (`erweitern`-Markierung)

*Warum: Der Coverage-Check prueft ob jede Anforderung adressiert und jeder Plan-Schritt TDD-faehig ist. Er schliesst die Luecke zwischen Besteller-Erwartung und Implementierungs-Vertrag.*

---

## §UA — Uncertainty Audit (Phase 6, Pflicht)

**Gilt immer — auch im Plan-only-Einstieg.**

`plan-agent` erstellt am Ende von Phase 6 zwei Listen:

| Liste | Inhalt |
|-------|--------|
| **Offen** | Punkte, die in der Anforderung unklar geblieben sind und nicht entschieden wurden |
| **Selbst-entschieden** | Punkte, wo der `plan-agent` selbst eine Annahme getroffen hat, die der Nutzer nicht explizit vorgegeben hat |

Beide Listen werden im persisitierten Plan (`requests/plans/plan-<feature>.md`) als eigener Abschnitt "## Uncertainty Audit" dokumentiert.

**§UA-Ausgabe (Planung stoppt immer — kein Auto-Implement):**

Planung kettet nie automatisch in die Umsetzung (SKILL.md Story-Gate Schritt 4). Beim STOPP nach der
Persistenz werden vorhandene Eintraege explizit gemeldet:

```
⚠️ Plan enthaelt offene oder selbst-entschiedene Punkte.
Bitte in requests/plans/plan-<feature>.md nachschaerfen:

Offen:
  - [Liste]

Selbst-entschieden (Annahmen des plan-agent):
  - [Liste]

→ Danach mit `implementiere <ID>` (volle Loops) bzw. `implementiere nur <ID>` fortsetzen.
```

**Wenn beide Listen leer:** normaler STOPP-Hinweis — Story auf `planned`, bereit fuer den Implement-Trigger.

*Warum Selbst-entschieden separat:* Annahmen, die der `plan-agent` intern getroffen hat, sehen im Plan oft wie Entscheidungen aus — der Nutzer muss die Moeglichkeit haben, sie zu sehen und zu korrigieren bevor Code entsteht.*

---

## §8/F1 — Akzeptanzliste als Plan-Deliverable

**Pflicht.**

Der Plan enthaelt pro Akzeptanzkriterium:
- **Testname:** `<Method>_<Situation>_<Expected>` (test-design-Konvention `<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>`)
- **Arrange/Act/Assert-Stichpunkte** (konkret, nicht abstrakt)
- **Markierung:** `neu` / `erweitern` / `unberührt`

**Konkrete Testfall-Skizzen, nicht abstrakte Kriterien.** "User kann sich einloggen" ist NICHT ausreichend — der Scribe muesste interpretieren. Korrekt: `Login_GueltigeKredentiale_RedirectetZuDashboard` mit AAA-Stichpunkten.

Phase 6 konsolidiert zur finalen Akzeptanz→Test-Liste (alle Topics zusammen).

---

## §8/F3 — Test-Abdeckung mitkartieren

Der `plan-agent` kartiert bei der Planung die **bestehende Test-Abdeckung des Bereichs** mit → Plan kann `neu`/`erweitern`/`unberührt` korrekt setzen.

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

`plan-agent` denkt jeden Service als eigene Domaene:

- Gleiche Namen (Model/DTO/Parameter) in Service-A und Service-B duerfen unterschiedliche fachliche Bedeutung haben
- Keine geteilten Modelle/DTOs ueber Service-Grenzen (ausser bewusstem Shared Kernel)
- FE-Analogon: Feature-Zonierung (`features/a` kennt nicht `features/b`)

**Der `plan-agent` prueft selbst (Teil des Plan-Coverage-Checks):** Bounded-Context-Grenzen verletzt? Ungewollter Shared-Kernel?

---

## A3 — Plan-Persistenz

Pfad: **`requests/plans/plan-<feature>.md`**.
Feature-Slug aus Nutzer-Prompt oder ADO-ID.

*Warum:* Konsistent mit `requests/stories/` (ado-Skill); uebersteht Kontext-Kompaktierung beim Auto-Handoff.

---

## Planungs-Umfang (lean/solo)

Planung laeuft immer solo — `schlank planen`/`lean planen`/`kompakt planen`/`Solo-Planung` sind bedeutungsgleiche Synonyme fuer den Normalfall.

- Der `plan-agent` (Opus) plant + prueft + reviewed **in sich selbst**
- Keine Scouts, keine Topic-Planer, keine Review-Subagent-Armee, kein 5er-Loop
- **Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht** — nie an Test-First sparen
- **Uncertainty Audit (§UA) bleibt Pflicht**
- **Plan-Coverage-Check (beide Teile) bleibt Pflicht** — Part A: delivery-inspection Sub-Agents (keine Ausnahme), Part B: Orchestrator-Tabelle solo. Solo-Planung spart an Delegation, nicht an Vollstaendigkeits-Pruefung.
- Gilt fuer alle Plan-Trigger (plane/plan/plane nur/plane only/nur planen/erstelle einen Plan). From-existing-plan ueberspringt die Planung (Plan liegt bereits vor).

---

## Buddy-Plan-Prompt als bevorzugte Eingabe

| Handoff-Abschnitt | Planungs-Nutzung |
|-------------------|-----------------|
| `## Goal` | Zielbild, Motivation, Ist-Kontext |
| `## Code & Fundstellen` | Wo im Repo — Ausgangspunkte fuer die Planung |
| `## Acceptance criteria` | Bindend fuer Plan; Basis fuer §8/F1-Akzeptanzliste |
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

- Originaler Request (unveraendert)
- Delta-Protokoll (`requests/plans/<feature>/outer/delta-N.md` — vom Terminal-PM des Impl-Outer-Loops geschrieben, STORY-034)
- Bestehender Plan (`requests/plans/plan-<feature>.md`) — geerbt als Basis

### Planungs-Umfang

Nur geaenderte/neue Topics werden neu geplant. Unveraenderte Plan-Teile werden geerbt.

| Was sich aendert | Was passiert |
|-----------------|-------------|
| Neues AC / neuer Scope | Neues Topic → `plan-agent` plant es solo |
| Wegfallendes AC | Betroffenen Plan-Teil entfernen / anpassen |
| Modifiziertes AC | Betroffenes Topic neu planen |
| Unveraenderte Topics | Aus bestehendem Plan uebernehmen — kein erneuter Durchlauf |

Der Delta-Plan durchlaeuft denselben Plan-Coverage-Check (delivery-inspection) und §UA wie der Erstplan.

### Persistenz

Aktualisierter Plan ueberschreibt `requests/plans/plan-<feature>.md`.
Delta-Protokoll bleibt als `requests/plans/<feature>/outer/delta-N.md` erhalten (Audit-Trail, SecondBrain — STORY-034).

---

## Abgrenzung requirement-definition und grill-me

- **requirement-definition:** roher Wunsch → Epic/Feature/Story-Breakdown (Upstream — liefert die `ready`-Story).
- **grill-me:** interaktives Verhoer einer Story/Plan — offene Entscheidungszweige vor der Planung aufloesen.
- **`plane <Story>`:** dieser Planungs-Flow — bevorzugte Eingabe: eine `ready`-Story aus requirement-definition.

---

## Antwortformat

Deutsch, klar strukturiert. Mermaid fuer grenzueberschreitende Flows. Fokussiert — umsetzbarer Plan, keine Essay-Laenge.
Keine Code-Beispiele ohne explizite Nachfrage.
