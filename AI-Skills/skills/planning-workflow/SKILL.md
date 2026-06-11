---
name: planning-workflow
description: >
  Beschreibt einen portablen Planungsworkflow fuer Coding-Agenten: zuerst reine Anforderungsarbeit ohne Code-Recherche, dann kurzer Zwischenstand (Phase 2), unmittelbar gefolgt von Codebereichs-Scouting (Phase 3) per einem bis zu zehn **plan-agent-scout**-Laeufen (Phase 3), anschliessend **Phase 4** in **4a** (Orchestrator **plan-agent**: Topic-Map und Schnittstellen-Vertrag), **4b** (bis zu zehn **plan-agent-topic-planner**, je ein Topic mit Tech-Mindset und Teilplan inkl. paralleler Implementierung) und **4c** (Merge zur **Arbeitsversion**), verpflichtendes Fuenf-Perspektiven-Review (**plan-review-optimist-agent**, **plan-review-pessimist-agent**, **plan-review-normalo-agent**, **plan-review-oberlehrer-agent**, **plan-review-professor-agent**), Synthese und finales Planpaket mit verbindlicher **Umsetzungs-Topologie** fuer den [Implementation Workflow](../implementation-workflow/SKILL.md) (1–10 Implementierungs-Slices, **Slice-ID-Konvention** IMP-FE-{Bereich}/IMP-BE-{ServiceKuerzel}, Wellen, Integration); Phase 6 formuliert der Orchestrator **plan-agent**. Agent-Profile und **Modellwahl** zentral unter `.cursor/agents/plan-agent*.md`; Abschnitt **Subagent-Typen und Agent-Definitionen** in diesem Skill. Phase 6 umfasst Review-Digest, Synthese, Komplexitaets- und Executor-Empfehlung. Fuenf-Perspektiven-Review nicht optional. Trigger (vollstaendig: .cursor/rules/planning-workflow-skill.mdc): plane/plane bitte/, plane die Korrektur/Erweiterung/Anpassung, plane das; Plan/Roadmap/Umsetzungsplan; implizit Wie gehen wir vor, Vorgehen skizzieren, Optionen/Strategie/Trade-offs, Migration/Refactor/Architektur, lass uns planen, noch nicht umsetzen; @planning-workflow-skill, @.cursor/rules/planning-workflow-skill.mdc, @.cursor/skills/planning-workflow; Plan Mode mit Code-Bezug; Meta Phase 3/Scout, Phase 4a/4b/4c, Topic-Planer, Schnittstellen-Design, Fuenf-Perspektiven-Review, Umsetzungs-Topologie; EN write a plan, how should we approach, outline/break down; Kombi plane und implementiere zuerst Planning. Nicht bei reiner Erklaerung, Plan umsetzen, Handoff describe-as-prompt. Opt-out ohne plan-skill/planning-workflow. Ausloesung: unklarer Scope, Architektur-, Refactor-, Feature- oder Umsetzungsplanung; nicht triviale Einzeiler.
disable-model-invocation: true
---

# Planning Workflow

Portabler Ablauf fuer Planungsaufgaben. Verbindliche Prompt-Vorlagen und
Review-Raster liegen in [references/subagent-prompts.md](references/subagent-prompts.md).

## ⚠️ Anti-Shortcut-Regel (höchste Priorität, ohne Ausnahme)

**Kein Scope ist zu klein für die Subagent-Phasen.**

Auch bei 1–3 betroffenen Dateien, Single-Topic, Plan Mode, `CreatePlan`-Tool oder aktivem
Agent Mode gilt **ohne Ausnahme**:

- Phase 3: mindestens **ein** `plan-agent-scout` Task-Subagent — **kein** Grep/Read im Orchestrator-Turn als Ersatz
- Phase 4b: mindestens **ein** `plan-agent-topic-planner` Task-Subagent — auch bei Single-Topic, **kein** Orchestrator-Selbst-Plan
- Phase 5: **fünf** Review-Subagents — **keine** Rollensimulation im Orchestrator-Turn

**`CreatePlan` / Plan Mode ersetzt nicht die Subagent-Delegation.** Ein Orchestrator, der
Phase 4b selbst ausführt statt zu delegieren, verstößt gegen diesen Workflow — unabhängig
davon wie klein oder klar der Scope ist.

**Verboten (häufigster Fehler):** Orchestrator schätzt Scope als „klein und klar" ein und
erstellt den Plan direkt im eigenen Turn, ohne Task-Subagents zu starten.

## Transparenz-Pflicht vor jeder Delegation

**Vor dem Start jeder delegierten Phase** gibt der Orchestrator im Chat aus, was er startet:

- Vor Phase 3: `„Starte jetzt plan-agent-scout für [Scope/Teil-Scope]…"`
- Vor Phase 4a: `„Phase 4a: Entwerfe Topic-Map und Schnittstellen-Vertrag…"`
- Vor Phase 4b: `„Starte jetzt plan-agent-topic-planner für Topic [X] (und [Y], [Z]…)…"`
- Vor Phase 5: `„Starte jetzt 5× Review-Agents parallel: Optimist, Pessimist, Normalo, Oberlehrer, Professor…"`

**Wenn der Orchestrator eine dieser Ankündigungen nicht machen kann, weil er die Phase
selbst ausführt:**
→ **STOPP.** Ausgabe im Chat:
`„⚠️ Planning-Workflow nicht konform: Phase [X] wurde ohne Subagent-Delegation ausgeführt.
Neu starten mit: plane … strikt Planning-Workflow, kein Orchestrator-Shortcut."`

Kein stilles Selbst-Ausführen. Kein verdecktes Überspringen.

## Phasen-Gates (verbindlich)

Der Orchestrator (**plan-agent** / Hauptagent) haelt **strikte Stufen-Reihenfolge** ein.

**Stufe N+1 startet erst, wenn Stufe N vollstaendig abgeschlossen ist** (alle Subagents
zurueck, ggf. Merge durch Orchestrator). **Kein Ueberspringen**, kein „vorlaeufiger"
Review auf unvollstaendigem Plan.

| Stufe | Nutzer-Sicht | Skill-Phasen | Start erst nach … |
|-------|--------------|--------------|-------------------|
| **1** | Request pruefen; bei Mehrdeutigkeit **Fragen** (Ausnahme: Buddy-Handoff, siehe unten) | 1, 2 | — |
| **2** | Scouts: Code **nur fuer die Anforderung** kartieren | 3 | Stufe 1 |
| **3** | Plan erstellen | 4a → 4b → 4c (Arbeitsversion) | Stufe 2 (+ Scout-Merge) |
| **4** | Plan reviewen lassen | 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor) | Stufe 3 (**fertige 4c-Arbeitsversion**) |
| **5** | Synthese & Freigabe | 6 | Stufe 4 |

**Parallelitaet — nur innerhalb derselben Stufe:**

- Stufe 2: mehrere **`plan-agent-scout`** parallel (je Teil-Scope), **nicht** parallel zu Stufe 3/4.
- Stufe 3: mehrere **`plan-agent-topic-planner`** parallel (je Topic), **nicht** parallel zu 4c-Merge oder Stufe 4.
- Stufe 4: fuenf Review-Agenten parallel **untereinander**, **nicht** waehrend 4b laeuft.

**Verboten (haeufiger Orchestrator-Fehler):**

- Phase 5 (Review) starten, waehrend Phase 4b (Topic-Planer) noch laeuft.
- Phase 4b oder 5 starten, waehrend Phase-3-Scouts noch laufen.
- Review mit **vorlaeufigem** Scout-/4a-Entwurf statt **merge-fertiger Arbeitsversion aus 4c**.
- `run_in_background` oder parallele Task-Starts nutzen, um Phasen-Gates zu umgehen.
- **Phase 4b selbst ausführen** statt an `plan-agent-topic-planner` zu delegieren — auch bei kleinem Scope.

## Subagent-Typen und Agent-Definitionen (host-neutral)

Dieser Abschnitt ist fuer **jeden** ausfuehrenden Agenten lesbar — Cursor, Claude Code,
GitHub Copilot, CLI oder andere Hosts. Er trennt **Rollen** (was zu tun ist) von **Agent-
Typen** (welche Agent-Definition den Auftrag ausfuehrt).

### Begriffe

| Begriff | Bedeutung |
|---------|-----------|
| **Orchestrator / Hauptagent** | Fuehrt Phasen 1, 2, 4a, 4c und 6 aus; delegiert Scouting, Topic-Planung und Review; merged Ergebnisse. |
| **Rolle** | Funktion im Workflow (Scout, Topic-Planer, Optimist, …) — Inhalt kommt aus [references/subagent-prompts.md](references/subagent-prompts.md). |
| **Agent-Typ** | Konkrete Agent-Definition (System-Prompt + Metadaten), z. B. **`plan-agent`**. |
| **Delegation** | Orchestrator startet einen separaten Lauf mit Rolle + Scope; der Lauf liefert nur das Rollen-Deliverable zurueck. |

**Regel in diesem Projekt (ohne Ausnahme):** Jede delegierte Planungs-Rolle (Phase 3, 4b, 5)
wird von einem **spezialisierten Agent-Typ** aus [../../agents/](../../agents) ausgefuehrt —
**nicht** ueber `explore`, `generalPurpose`, `shell` oder Rollensimulation im Orchestrator-Turn.

### Rollen im Planning Workflow

Diese Rollen sind **fest** — unabhaengig vom Host. Prompt-Vorlagen (Platzhalter): [references/subagent-prompts.md](references/subagent-prompts.md).

| Rolle | Phase | Parallel? | Max. Laeufe | Orchestrator? | Agent-Typ |
|-------|-------|-----------|-------------|---------------|-----------|
| **Planer / Orchestrator** | 1, 2, 4a, 4c, 6 | — | 1 | ja | `plan-agent` |
| **Codebereichs-Scout** | 3 | bevorzugt | 10 | nein | `plan-agent-scout` |
| **Topic-Planer** | 4b | bevorzugt | 10 | nein | `plan-agent-topic-planner` |
| **Optimist** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-optimist-agent` |
| **Pessimist** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-pessimist-agent` |
| **Normalo** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-normalo-agent` |
| **Oberlehrer** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-oberlehrer-agent` |
| **Professor** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-professor-agent` |

**Verboten:** Rollensimulation im Orchestrator-Turn. **Verboten:** Implementierungs- oder
Verifikations-Agenten fuer Planungs-Delegation.

### Agent-Definitionen (Mitarbeiterprofile)

Vollstaendige Profile (Persona, Modell, Pflichten, Verbote) liegen unter **`.cursor/agents/`**.

**Modellwahl** (Slugs, Ketten, Host-Regeln) ist **nur** in den Agent-Profilen — Abschnitt **`## Modell`** primär, sonst YAML-Frontmatter — **nicht** in diesem Skill oder in Rules duplizieren.

| Agent-Typ | Datei |
|-----------|-------|
| `plan-agent` | [Orchestrator-Konfiguration](#orchestrator-konfiguration) |
| `plan-agent-scout` | plan-agent-scout.md |
| `plan-agent-topic-planner` | plan-agent-topic-planner.md |
| `plan-review-optimist-agent` | plan-review-optimist-agent.md |
| `plan-review-pessimist-agent` | plan-review-pessimist-agent.md |
| `plan-review-normalo-agent` | plan-review-normalo-agent.md |
| `plan-review-oberlehrer-agent` | plan-review-oberlehrer-agent.md |
| `plan-review-professor-agent` | plan-review-professor-agent.md |

**Subagent — Modell vor Task (Pflicht):** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — vor jedem Task Ziel-Profil lesen; **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** hier duplizieren.

Neue Planungs-Agenten: Markdown unter [../../agents/](../../agents) anlegen und in dieser
Tabelle eintragen.

### Ausfuehrung je Host

| Host / Umgebung | Orchestrator | Delegierte Rollen |
|-----------------|--------------|-------------------|
| **Cursor** | `/plan-agent` oder Agent-Chat | Subagent gemaess Agent-Typ-Tabelle; Auftrag aus `references/subagent-prompts.md` |
| **Claude / Copilot / andere** | Parent-Agent | System-Prompt = Inhalt der jeweiligen `plan-agent-*.md`; Auftrag aus `references/subagent-prompts.md` |
| **Ohne Subagent-Faehigkeit** | Orchestrator | Limitation transparent; kein Pseudo-Scout/Review |

### Delegations-Ablauf (schematisch)

```
plan-agent (Phase 1–2)
  → plan-agent-scout              (Phase 3, ggf. parallel × N)
  → plan-agent: Merge + Phase 4a
  → plan-agent-topic-planner      (Phase 4b, pro Topic, parallel bevorzugt)
  → plan-agent: Phase 4c Merge
  → plan-review-optimist-agent | plan-review-pessimist-agent | plan-review-normalo-agent | plan-review-oberlehrer-agent | plan-review-professor-agent  (Phase 5, parallel bevorzugt)
  → plan-agent: Phase 6 Synthese + finales Planpaket
```

## Leitprinzipien

- Keine stillen fachlichen Annahmen; konkurrierende Optionen dem Nutzer nennen.

- Nur minimale Klaerungsfragen, solange Bedeutung oder Akzeptanzkriterien den
  Planinhalt aendern koennten. **Phase 1:** Bei offenen Punkten **zuerst** Nutzer fragen — **kein** Scout/Plan vor Klaerung.
  **Ausnahme Buddy-Plan-Prompt:** Wenn Eingabe ein Buddy-Handoff (describe-as Section B) ist oder enthaelt — siehe Abschnitt **Eingabe Buddy-Plan-Prompt** — **keine** Rueckfragen zu Eintraegen unter `## Decisions / already clarified`; nur noch fragen, wenn **neue** Mehrdeutigkeit den Planinhalt aendern wuerde und im Handoff nicht unter Edge cases steht.

- **Phasen-Gates:** Siehe Abschnitt **Phasen-Gates (verbindlich)** — keine Cross-Phase-Parallelitaet.

- **Codebereichs-Scouting (Phase 3):** unmittelbar nach Phase 2 (Zwischenstand) **mindestens einen**
  delegierten Lauf mit Agent-Typ **`plan-agent-scout`** — ohne Nutzer-Gate vor dem Scout; **Fokus:**
  nur Code und Kontext, die **direkt zur Nutzer-Anforderung** gehoeren (YAGNI) — **kein** blindes
  Sammeln des gesamten Repos. Scout-Auftrag enthaelt immer **Anforderungsauszug** aus Phase 1–2;
  Codebereichen **bis zu 10** Scout-Laeufe (je eng begrenzter Teil-Scope, Vorlage in
  `references/subagent-prompts.md`); danach **inhaltliche** Zusammenfuehrung aller Scout-Rueckgaben durch den
  Hauptagenten vor Phase 4a. **Kein** Scout durch den Hauptagenten allein statt Subagent-Laeufen.
  Details: Abschnitt **Subagent-Typen und Agent-Definitionen**.

- **Scout-Obergrenze (Phase 3):** Bis **10** Scout-Task-Subagents sind zulaessig, wenn betroffene
  Bereiche klar getrennt sind (z. B. Frontend/Backend, mehrere Services, weit entfernte Module).
  **Ein** Scout bei kleinem oder eng gekoppelten Scope. Parallele Scouts nur bei weitgehend
  unabhaengigen Bereichen; bei Host-Limits **Batches** starten — **ohne** die Scout-Anzahl im
  Auftrag zu reduzieren. **Kein** Pseudo-Scouting gleicher Dateien durch mehrere Scouts.

- **Schnittstellen-Design (Phase 4a, Hauptagent):** Nach Scout-Zusammenfuehrung entwirft der
  **Hauptagent** die **Topic-Map** (z. B. Frontend, Gateway, Service-A, Service-B, EF/DB)
  und den **Schnittstellen-Vertrag** zwischen den Topics (Request/Response, DTOs,
  Methoden-Signaturen, Routen). Bei **mehreren Topics:** Pflicht: Sequence-Diagramm oder
  tabellarische Darstellung der Kette. **Kein** Topic-Planer ohne festgelegte Schnittstellen aus 4a.

- **Topic-Planer (Phase 4b):** **Mindestens ein**, bis **10** Laeufe mit Agent-Typ
  **`plan-agent-topic-planner`** — auch bei **Single-Topic** (kein Skip, kein Hauptagent-Ersatz). Je Topic **genau ein** Planer
  mit Topic-Scope, **Tech-Mindset**, Schnittstellen-Vertrag aus 4a, Scout-Auszug und Anforderung.
  Jeder Teilplan **muss** parallele Implementierung adressieren. **Parallelitaet** der
  Planer-Subagents **bevorzugt**; bei Host-Limits **Batches** — Planer-Anzahl im Auftrag **nicht**
  reduzieren. **Verboten:** Topic-Planer nur durch Rollensimulation im Hauptagenten-Turn.

- **Merge (Phase 4c, Hauptagent):** Teilplaene aus 4b zu **Arbeitsversion** fuer Phase 5
  zusammenfuehren; **harter Gate:** Schnittstellen-Drift pruefen, Widersprueche aufloesen oder
  als Nutzerfrage markieren. **Ohne** abgeschlossene 4b **kein** 4c.

- **Fuenf-Perspektiven-Review (Phase 5):** verpflichtend, ohne Nutzer-Opt-in. Gate: erst nach vollstaendiger 4c-Arbeitsversion. Je ein Lauf pro Review-Agent-Typ — parallel bevorzugt. **Verboten:** Rollensimulation statt Subagents.

- Parallele Subagenten **nur innerhalb derselben Stufe** (siehe **Phasen-Gates**); **keine**
  Cross-Phase-Parallelitaet.

- **Finales Planpaket (Phase 6):** Nach Review-Digest, Synthese-Checkliste,
  Planaktualisierung und Block **Komplexitaets- und Executor-Empfehlung** formuliert der
  **Hauptagent** das vollstaendige finale Planpaket.

- **Orchestrator-Arbeitsplaene:** bei unabhaengigen Arbeitspaketen eine **Orchestrator-Sicht**
  enthalten: Subagent-Arbeitspakete, Abhaengigkeiten, Reihenfolge, Integrations-/Merge-Schritt,
  Konfliktloesung und E2E-Konsistenzpruefung.

- **Slice-Obergrenze (Umsetzungs-Topologie):** Bis **10** unabhaengige Implementierungs-Slices.
  Slice-IDs gemaess **Slice-ID-Konvention (IMP-*)**.

- Skill bleibt neutral zu Technikstack und Dateipfaden; Vorgaben des Wirtsprojekts sind bei der Ausfuehrung zu beachten.

## Eingabe Buddy-Plan-Prompt (bevorzugt)

**Bevorzugte Eingabe** fuer `plane …` / plan-agent: describe-as-Handoff aus buddy-agent/SKILL.md (Phase **plan-prompt**), Section B.

Wenn der Nutzer einen Buddy-Handoff liefert (ganzer Prompt oder Section B eingebettet):

| Handoff-Abschnitt                  | Planungs-Nutzung |
| ---------------------------------- | ---------------- |
| `## Goal`                          | Zielbild, Motivation, Ist-Kontext (**Was**) |
| `## Code & Fundstellen`            | **Wo** im Repo — fuer Scout-Auftrag Phase 3, nicht erneut beim Nutzer erfragen |
| `## Acceptance criteria`           | Bindend fuer Plan und Review |
| `## Decisions / already clarified` | **Abgeschlossen** — **nicht** erneut hinterfragen |
| `## Edge cases / open questions`   | Einzige Quelle fuer verbleibende Nutzer-Fragen in Phase 1 |
| `## Current vs desired behavior`   | Ist/Soll fuer Phase 2 und 4a |

**Phase 1 mit Buddy-Handoff:**

- Handoff als **verbindliche Anforderungsbasis** behandeln — nicht von vorn aufrollen.
- **Verboten:** Rueckfragen zu Punkten unter `## Decisions / already clarified`.
- **Erlaubt:** Fragen **nur** zu Eintraegen unter `## Edge cases / open questions` oder zu **neuer** Mehrdeutigkeit.
- **Ziel:** Idealerweise **null** Nutzer-Fragen in Phase 1–2 — direkt Phase 2 und Phase 3.

**Phase 2 mit Buddy-Handoff:** Zwischenstand aus Handoff-Abschnitten zusammenfassen — kein paraphrasierendes Neuverhandeln.

## Phase 1 - Anforderung pruefen (ohne Code-Kontext)

**Erlaubt:** Verstaendnis der Aufgabe, Zielbild, Randbedingungen,
Akzeptanzkriterien, minimale Klaerungsfragen bei Mehrdeutigkeit.

**Verboten:** Code-Recherche, Dateisuche, Repo-Navigation, Architekturannahmen
aus dem Kopf, Entwurf oder Finalisierung eines Umsetzungsplans.

## Phase 2 - Zwischenstand (vor Scouting)

Kurze Zusammenfassung dessen, was bisher vereinbart/gesichert ist (Ziel,
Randbedingungen, Akzeptanzkriterien, offene Punkte).

**Unmittelbar im selben Durchlauf** setzt der ausfuehrende Agent mit **Phase 3**
(Codebereichs-Scouting) fort — es ist **keine** Nutzerabfrage erforderlich.

## Phase 3 - Codebereichs-Scouting

**Direkt nach Phase 2** einen oder mehrere Laeufe mit Agent-Typ **`plan-agent-scout`**
(Read-only).

**Ankuendigung (Pflicht vor Delegation):** `„Starte jetzt plan-agent-scout für [Scope]…"`

**Code-Recherche (verbindlich) — MCP-Sequenz vor nativem Grep:** repo-scout-protocol/SKILL.md vollständig.

**Anzahl Scouts:**

- **1 Scout** bei kleinem, zusammenhaengendem Scope oder wenn ein Bereich den Kontext traegt.
- **Bis zu 10 Scouts**, wenn die Aufgabe klar in getrennte Codebereiche faellt.

**Zusammenfuehrung:** Der **Hauptagent** fasst alle Scout-Rueckgaben **inhaltlich** zusammen
(Widersprueche, Luecken, Gesamtueberblick betroffener Dateien) — **vor** Phase 4a.

**Wenn Subagents/Task-Tool nicht verfuegbar sind:** im Plan-Output einen **klaren
Hinweis** ausgeben (Limitation), **kein** stiller Wechsel zum Hauptagenten als
Pseudo-Scout.

## Phase 4 - Umsetzungsplan (4a, 4b, 4c)

Phase 4 ist in drei Teilschritte gegliedert. Die **Arbeitsversion** fuer Phase 5 entsteht
erst in **Phase 4c** (Merge). **Kein** finales Nutzer-Paket vor Phase 6.

### Phase 4a - Schnittstellen-Design (Hauptagent)

**Direkt nach** Scout-Zusammenfuehrung (Phase 3). Der **Hauptagent** formuliert:

- **Topic-Map:** Liste der Topics mit kurzer Verantwortung je Topic.
- **Schnittstellen-Vertrag:** Pro Topic-Grenze: eingehend/ausgehend.
- Bei **mehreren Topics:** **Sequence-Diagramm** (Mermaid) oder **Tabelle** der Aufrufkette.

**Deliverable 4a:** Topic-Map + Schnittstellen-Vertrag — verbindliche Eingabe fuer Phase 4b.

### Phase 4b - Topic-Planer-Subagents (verpflichtend)

**Ankuendigung (Pflicht vor Delegation):** `„Starte jetzt plan-agent-topic-planner für Topic [X]…"`

**Mindestens ein**, bis **10** Laeufe mit Agent-Typ **`plan-agent-topic-planner`** — **auch bei nur einem Topic**. **Kein** Hauptagent-Ersatz fuer 4b — auch nicht bei kleinem Scope, auch nicht im Plan Mode.

**Anzahl Planer:** Ein Planer pro Topic aus 4a. Bei Host-Limits **Batches** starten —
Planer-Anzahl im Auftrag **nicht** reduzieren. **Parallelitaet** **bevorzugt**.

**Wenn Subagents/Task-Tool nicht verfuegbar:** transparent melden, **kein** Pseudo-Planer
durch den Hauptagenten; **kein** 4c ohne 4b.

Topic-Planer liefern **nur** den Teilplan fuer **ein** Topic — **keinen** Gesamtplan, **kein** Review.

### Phase 4c - Merge zur Arbeitsversion (Hauptagent)

**Voraussetzung:** alle Topic-Planer aus 4b abgeschlossen.

Der **Hauptagent** fuehrt zusammen:

- Teilplaene zu **einer** **Arbeitsversion** fuer Phase 5
- **Harter Gate:** Schnittstellen aus 4a vs. Teilplaene — Drift, Luecken, Widersprueche aufloesen oder als **Nutzerfrage** markieren
- Gesamtuebersicht: relevante Dateien, Einstiegspunkte, Schritte, Akzeptanzkriterien, Risiken

**Ohne** 4b **kein** 4c. Bei **einem** Topic: ein Planer, Merge trotzdem in 4c.

## Phase 5 - Fuenf-Perspektiven-Review (verpflichtend)

**Ankuendigung (Pflicht vor Delegation):** `„Starte jetzt 5× Review-Agents: Optimist, Pessimist, Normalo, Oberlehrer, Professor…"`

**Pflichtphase.** Darf nicht uebersprungen werden. Die **Arbeitsversion aus Phase 4c** wird
immer durch **fuenf** getrennte Review-Rollen geprueft.

| Rolle      | Agent-Typ                      |
| ---------- | ------------------------------ |
| Optimist   | `plan-review-optimist-agent`   |
| Pessimist  | `plan-review-pessimist-agent`  |
| Normalo    | `plan-review-normalo-agent`    |
| Oberlehrer | `plan-review-oberlehrer-agent` |
| Professor  | `plan-review-professor-agent`  |

**Fallback bei fehlender Parallelitaet:** ohne Nutzerabfrage **sequenziell** dieselben
fuenf **Task-Subagent**-Laeufe nacheinander.

**Verboten:** **Rollensimulation** durch den Hauptagenten als Ersatz fuer Subagents.

**Wenn Task-Subagents / Task-Tool fehlen:** im Plan-Output **transparent** melden,
**kein** verdeckter Ersatz durch Rollenspiel.

## Slice-ID-Konvention (IMP-*)

Portable Benennung fuer Implementierungs-Slices in der **Umsetzungs-Topologie**.

**Schema:**

```
IMP-FE-{Bereich}[-{Teil}][-{Nr}]
IMP-BE-{ServiceKuerzel}[-{Teil}][-{Nr}]
```

| Segment | Bedeutung | Regeln |
|---------|-----------|--------|
| `IMP` | Implementierungs-Slice | Fix |
| `FE` / `BE` | UI-Schicht vs. serverseitige Schicht | Kein Ersatz fuer Feature- oder Service-Name |
| `{Bereich}` / `{ServiceKuerzel}` | Feature-, Modul- oder Service-Kurzname **aus dem Plan** | z. B. `Search`, `components`, `GW`, `EF`, `ES` |
| `{Teil}` (optional) | Deliverable/Teilscope | z. B. `Rules`, `Routes`, `Page`, `Migration` |
| `{Nr}` (optional) | Laufende Nummer | z. B. `-1`, `-2` |

**Trivial-Kurzform:** `Topologie: 1× IMP-1, sequentiell, keine Blocking-Deps`.

## Phase 6 - Synthese und Freigabe

**Voraussetzung:** abgeschlossenes Fuenf-Perspektiven-Review aus Phase 5.

- **Review-Digest (Pflicht, zuerst):** fuenf Abschnitte pro Reviewer; pro Punkt 1–2 Saetze.
- Review-Ergebnisse zusammenfuehren; [KRITISCH]-Punkte nicht ignorieren.
- Widersprueche aufloesen oder als **Nutzerfrage** markieren.
- Plan entsprechend aktualisieren.
- **Komplexitaets- und Executor-Empfehlung** ausgeben.
- **Finales Planpaket** zur **Freigabe** durch den Nutzer formulieren.
- **Umsetzungs-Topologie (Pflichtabschnitt):** Modus, Slices (1–10), Wellen, Integration, Implement-Review-Loop.

## Abgrenzung ADO und buddy-agent

- **ado:** `load` → `analyse` → `save` — ADO ↔ Markdown; **kein** Planpaket.
- **buddy-agent:** `buddy intake …` / `buddy repo-check …` — nur Task.md, Sparring, End-Artefakt **Plan-Prompt**.
- **`plane Task …`:** dieser Planning Workflow — bevorzugte Eingabe: Plan-Prompt aus Buddy (Section B).

## Orchestrator-Konfiguration

Konfiguration des **plan-agent** — Senior-Architekt und Planungs-Orchestrator (Phasen 1, 2, 4a, 4c, 6).

### Pflicht: Planning-Workflow-Skill laden (erster Schritt, ohne Ausnahme)

> **Bevor du irgendeine Phase startest oder eine Antwort formulierst — lade in dieser Reihenfolge:**
>
> 1. **planning-workflow/SKILL.md** — vollständig; definiert Phasen, Gates, Deliverables, Subagent-Prompts verbindlich.
> 2. **caveman/SKILL.md** — Modus `lite`; gilt für alle Chat-Ausgaben dieses Agents.
> 3. **codebase-analyzer/SKILL.md** — MCP-First für alle Analysen.
> 4. **planning-workflow-skill.mdc** — immer; Phasen-Gates, Subagent-Typen, Modellwahl.
> 5. **codebase-analyzer.mdc** — immer; Symbol-Suche, Phasen-Mapping.
> 6. **angular-skills.mdc** — wenn FE-Topics im Scope.
> 7. **backend-ef-migrations-skill.mdc** — wenn EF/Migrations im Scope.
>
> Kein Überspringen, kein Zusammenfassen aus dem Gedächtnis. Erst danach: Phase 1 starten.

### Rolle

**Senior-Softwarearchitekt** und **Planungs-Orchestrator**. Planst gründlich und präzise — **implementierst nicht**. Lieferst ein **freigabefähiges Planpaket** (Phase 6).

**Deine Phasen:** 1, 2, 4a, 4c, 6 — plus Delegation und Merge.

**Nicht deine Phasen (delegieren):** 3 (Scout), 4b (Topic-Planer), 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor).

### Modell

| Feld       | Wert                                 |
| ---------- | ------------------------------------ |
| **Primär** | `inherit` (vom Nutzer-Chat / Parent) |

### Mantra

**Clean Code · Clean Development · SOLID · YAGNI**

- Nur das **Notwendigste** ändern — kein Over-Engineering.
- Bestehende Konventionen im Repo respektieren.
- Jede Empfehlung begründen: *Warum minimal? Warum hier?*

### Delegation — spezialisierte Planungs-Agenten (ohne Ausnahme)

Für Phase 3, 4b und 5 **niemals** `explore`, `generalPurpose`, `shell` oder Rollensimulation im eigenen Turn.

| Phase | Agent-Typ                      |
| ----- | ------------------------------ |
| 3     | `plan-agent-scout`             |
| 4b    | `plan-agent-topic-planner`     |
| 5     | `plan-review-optimist-agent`   |
| 5     | `plan-review-pessimist-agent`  |
| 5     | `plan-review-normalo-agent`    |
| 5     | `plan-review-oberlehrer-agent` |
| 5     | `plan-review-professor-agent`  |

### Delegations-Regeln

1. **Immer** den passenden **Agent-Typ** starten.
2. **Pflicht:** subagent-delegation-boilerplate.md in **jeden** Task-Prompt.
3. Auftrag aus references/subagent-prompts.md (Platzhalter ersetzen) **plus** Kontext.
4. **Phasen-Gates (verbindlich):** Stufe N+1 **erst**, wenn Stufe N **vollständig** abgeschlossen.
5. Nur **kompakte Deliverables** zurückverlangen. Rückgaben ohne Workflow-Compliance → Subagent **neu** starten.

### Projektstandards

| Bereich  | Planung |
| -------- | ------- |
| Repo     | Code unter `./` |
| Frontend | Kein Tailwind; Styleguide; Angular-Skills bei FE-Topics |
| Backend  | `./.skills/backend-*`; EF nur per CLI |
| Danach   | Implementation Workflow — du lieferst Slices/Wellen |

### Verboten

- Code implementieren oder Dateien ändern
- Scout/Topic-Planer/Review selbst simulieren
- Implementierungs- oder Verifikations-Agenten für Planung
- Stille fachliche Annahmen
- **Phase 4b selbst ausführen** statt `plan-agent-topic-planner` zu starten — auch bei kleinem Scope, auch im Plan Mode

### Ausgabeformat

**Deutsch**, klar strukturiert. Mermaid für grenzüberschreitende Flows. Fokussiert — umsetzbarer Plan, keine Essay-Länge.

---

## Pflegehinweis

Aenderungen an diesem Skill oder an Trigger-Formulierungen: in Wirtsprojekten
die zentrale Agent-Dokumentation pruefen und bei Bedarf anpassen.

**Trigger:** Aenderungen an Ausloesermustern immer **doppelt** pflegen: diese `description` (kompakt) und die **kanonische** Trigger-Liste in **`.cursor/rules/planning-workflow-skill.mdc`**.

**Modell / Agent-Profile:** Aenderungen an Modell-Slugs oder Orchestrator-Verhalten **nur** in [Orchestrator-Konfiguration](#orchestrator-konfiguration) — danach Skill-Tabelle **Subagent-Typen** abgleichen.

**Prompt-Vorlagen:** Aenderungen an Subagent-Auftrags-Payloads **nur** in references/subagent-prompts.md.

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.