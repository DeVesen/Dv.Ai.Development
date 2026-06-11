---
name: planning-workflow
description: >
  Beschreibt einen portablen Planungsworkflow fuer Coding-Agenten: zuerst
  reine Anforderungsarbeit ohne Code-Recherche, dann kurzer Zwischenstand
  (Phase 2), unmittelbar gefolgt von Codebereichs-Scouting (Phase 3) per
  einem bis zu zehn **plan-agent-scout**-Laeufen (Phase 3), anschliessend **Phase 4** in **4a** (**plan-agent-interface-designer**: Topic-Map und Schnittstellen-Vertrag),
  **4b** (bis zu zehn **plan-agent-topic-planner**,
  je ein Topic mit Tech-Mindset und Teilplan inkl. paralleler Implementierung) und **4c** (**plan-agent-merger**: Merge zur
  **Arbeitsversion**), verpflichtendes Fuenf-Perspektiven-Review (**plan-review-optimist-agent**,
  **plan-review-pessimist-agent**, **plan-review-normalo-agent**, **plan-review-oberlehrer-agent**, **plan-review-professor-agent**), Synthese und finales Planpaket mit verbindlicher
  **Umsetzungs-Topologie** fuer den [Implementation Workflow](../implementation-workflow/SKILL.md)
  (1–10 Implementierungs-Slices, **Slice-ID-Konvention** IMP-FE-{Bereich}/IMP-BE-{ServiceKuerzel},
  Wellen, Integration); Phase 6 formuliert **plan-agent-synthesizer**.
  Agent-Profile und **Modellwahl** zentral unter `.cursor/agents/plan-agent*.md`; Abschnitt
  **Subagent-Typen und Agent-Definitionen** in diesem Skill. Phase 6 umfasst Review-Digest,
  Synthese, Komplexitaets- und Executor-Empfehlung. Fuenf-Perspektiven-Review nicht optional.
  Trigger (vollstaendig: .cursor/rules/planning-workflow-skill.mdc): plane/plane bitte/,
  plane die Korrektur/Erweiterung/Anpassung, plane das; Plan/Roadmap/Umsetzungsplan;
  implizit Wie gehen wir vor, Vorgehen skizzieren,
  Optionen/Strategie/Trade-offs, Migration/Refactor/Architektur, lass uns planen,
  noch nicht umsetzen; @planning-workflow-skill, @.cursor/rules/planning-workflow-
  skill.mdc, @.cursor/skills/planning-workflow; Plan Mode mit Code-Bezug; Meta Phase
  3/Scout, Phase 4a/4b/4c, Topic-Planer, Schnittstellen-Design, Fuenf-Perspektiven-Review,
  Umsetzungs-Topologie; EN write a plan, how
  should we approach, outline/break down; Kombi plane und implementiere zuerst
  Planning. Nicht bei reiner Erklaerung, Plan umsetzen, Handoff describe-as-prompt.
  Opt-out ohne plan-skill/planning-workflow. Ausloesung: unklarer Scope, Architektur-,
  Refactor-, Feature- oder Umsetzungsplanung; nicht triviale Einzeiler.
disable-model-invocation: true
---

# Planning Workflow

Portabler Ablauf fuer Planungsaufgaben. Verbindliche Prompt-Vorlagen und

Review-Raster liegen in [references/subagent-prompts.md](references/subagent-prompts.md).

## Phasen-Gates (verbindlich)

Der Orchestrator (**plan-agent** / Hauptagent) haelt **strikte Stufen-Reihenfolge** ein.

**Stufe N+1 startet erst, wenn Stufe N vollstaendig abgeschlossen ist** (alle Subagents

zurueck, ggf. Merge durch Orchestrator). **Kein Ueberspringen**, kein „vorlaeufiger“

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

- Phase 4b (Topic-Planer) starten, solange Interface-Designer (4a) noch laeuft oder das Deliverable nicht formal geprueft wurde (Topic-Map + Schnittstellen-Vertrag vollstaendig? Sequence-Diagramm bei ≥ 2 Topics vorhanden?).

- Phase 4c (Merger) starten, waehrend noch Topic-Planer aus 4b laufen.

- Phase 5 (Review) starten, waehrend Phase 4b (Topic-Planer) oder Phase 4c (Merger) noch laeuft.

- Phase 4b oder 5 starten, waehrend Phase-3-Scouts noch laufen.

- Review mit **vorlaeufigem** Scout-/4a-Entwurf statt **merge-fertiger Arbeitsversion aus 4c**.

- Phase 6 (Synthesizer) starten, bevor alle fuenf Phase-5-Reviews abgeschlossen sind.

- `run_in_background` oder parallele Task-Starts nutzen, um Phasen-Gates zu umgehen.

## Subagent-Typen und Agent-Definitionen (host-neutral)

Dieser Abschnitt ist fuer **jeden** ausfuehrenden Agenten lesbar — Cursor, Claude Code,

GitHub Copilot, CLI oder andere Hosts. Er trennt **Rollen** (was zu tun ist) von **Agent-

Typen** (welche Agent-Definition den Auftrag ausfuehrt).

### Begriffe

| Begriff | Bedeutung |

|---------|-----------|

| **Orchestrator / Hauptagent** | Fuehrt Phasen 1 und 2 aus; delegiert alle Inhalts-Phasen; prueft Deliverables auf formale Vollstaendigkeit; steuert Phasen-Gates. Erstellt selbst weder Plaene noch Implementierungen. |

| **Rolle** | Funktion im Workflow (Scout, Topic-Planer, Optimist, …) — Inhalt kommt aus [references/subagent-prompts.md](references/subagent-prompts.md). |

| **Agent-Typ** | Konkrete Agent-Definition (System-Prompt + Metadaten), z. B. **`plan-agent`**. |

| **Delegation** | Orchestrator startet einen separaten Lauf mit Rolle + Scope; der Lauf liefert nur das Rollen-Deliverable zurueck. |

**Regel in diesem Projekt (ohne Ausnahme):** Jede delegierte Planungs-Rolle (Phase 3, 4a, 4b, 4c, 5, 6)

wird von einem **spezialisierten Agent-Typ** aus [../../agents/](../../agents/) ausgefuehrt —

**nicht** ueber `explore`, `generalPurpose`, `shell` oder Rollensimulation im Orchestrator-Turn.

### Rollen im Planning Workflow

Diese Rollen sind **fest** — unabhaengig vom Host. Prompt-Vorlagen (Platzhalter): [references/subagent-prompts.md](references/subagent-prompts.md).

| Rolle | Phase | Parallel? | Max. Laeufe | Orchestrator? | Agent-Typ |

|-------|-------|-----------|-------------|---------------|-----------|

| **Orchestrator** | 1, 2 | — | 1 | ja | [`plan-agent`](SKILL.md#orchestrator-konfiguration) |

| **Codebereichs-Scout** | 3 | bevorzugt | 10 | nein | [`plan-agent-scout`](../../agents/plan-agent-scout.md) |

| **Interface-Designer** | 4a | nein | 1 | nein | [`plan-agent-interface-designer`](../../agents/plan-agent-interface-designer.md) |

| **Topic-Planer** | 4b | bevorzugt | 10 | nein | [`plan-agent-topic-planner`](../../agents/plan-agent-topic-planner.md) |

| **Merger** | 4c | nein | 1 | nein | [`plan-agent-merger`](../../agents/plan-agent-merger.md) |

| **Optimist** | 5 | bevorzugt (×5) | 1 | nein | [`plan-review-optimist-agent`](../../agents/plan-review-optimist-agent.md) |

| **Pessimist** | 5 | bevorzugt (×5) | 1 | nein | [`plan-review-pessimist-agent`](../../agents/plan-review-pessimist-agent.md) |

| **Normalo** | 5 | bevorzugt (×5) | 1 | nein | [`plan-review-normalo-agent`](../../agents/plan-review-normalo-agent.md) |

| **Oberlehrer** | 5 | bevorzugt (×5) | 1 | nein | [`plan-review-oberlehrer-agent`](../../agents/plan-review-oberlehrer-agent.md) |

| **Professor** | 5 | bevorzugt (×5) | 1 | nein | [`plan-review-professor-agent`](../../agents/plan-review-professor-agent.md) |

| **Synthesizer** | 6 | nein | 1 | nein | [`plan-agent-synthesizer`](../../agents/plan-agent-synthesizer.md) |

**Verboten:** Rollensimulation im Orchestrator-Turn. **Verboten:** Implementierungs- oder

Verifikations-Agenten fuer Planungs-Delegation.

### Agent-Definitionen (Mitarbeiterprofile)

Vollstaendige Profile (Persona, Modell, Pflichten, Verbote) liegen unter **`.cursor/agents/`**.

**Modellwahl** (Slugs, Ketten, Host-Regeln) ist **nur** in den Agent-Profilen — Abschnitt **`## Modell`**
primär, sonst YAML-Frontmatter — **nicht** in diesem Skill oder in Rules duplizieren.

| Agent-Typ | Datei |

|-----------|-------|

| `plan-agent` | [Orchestrator-Konfiguration](SKILL.md#orchestrator-konfiguration) |

| `plan-agent-scout` | [plan-agent-scout.md](../../agents/plan-agent-scout.md) |

| `plan-agent-interface-designer` | [plan-agent-interface-designer.md](../../agents/plan-agent-interface-designer.md) |

| `plan-agent-topic-planner` | [plan-agent-topic-planner.md](../../agents/plan-agent-topic-planner.md) |

| `plan-agent-merger` | [plan-agent-merger.md](../../agents/plan-agent-merger.md) |

| `plan-agent-synthesizer` | [plan-agent-synthesizer.md](../../agents/plan-agent-synthesizer.md) |

| `plan-review-optimist-agent` | [plan-review-optimist-agent.md](../../agents/plan-review-optimist-agent.md) |

| `plan-review-pessimist-agent` | [plan-review-pessimist-agent.md](../../agents/plan-review-pessimist-agent.md) |

| `plan-review-normalo-agent` | [plan-review-normalo-agent.md](../../agents/plan-review-normalo-agent.md) |

| `plan-review-oberlehrer-agent` | [plan-review-oberlehrer-agent.md](../../agents/plan-review-oberlehrer-agent.md) |

| `plan-review-professor-agent` | [plan-review-professor-agent.md](../../agents/plan-review-professor-agent.md) |

**Subagent — Modell vor Task (Pflicht):** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — vor jedem Task Ziel-Profil lesen; **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** hier duplizieren.

Neue Planungs-Agenten: Markdown unter [../../agents/](../../agents/) anlegen und in dieser

Tabelle eintragen.

### Ausfuehrung je Host

| Host / Umgebung | Orchestrator | Delegierte Rollen |

|-----------------|--------------|-------------------|

| **Cursor** | `/plan-agent` oder Agent-Chat | Subagent gemaess Agent-Typ-Tabelle; Auftrag aus `references/subagent-prompts.md` |

| **Claude / Copilot / andere** | Parent-Agent | System-Prompt = Inhalt der jeweiligen `plan-agent-*.md`; Auftrag aus `references/subagent-prompts.md` |

| **Ohne Subagent-Faehigkeit** | Orchestrator | Limitation transparent; kein Pseudo-Scout/Review |

### Delegations-Ablauf (schematisch)

```text

plan-agent (Phase 1–2)

  → plan-agent-scout              (Phase 3, ggf. parallel × N)

  → plan-agent: Scout-Zusammenführung, Deliverable-Prüfung

  → plan-agent-interface-designer (Phase 4a — Gate: abgeschlossen + formal geprüft vor 4b)

  → plan-agent-topic-planner      (Phase 4b, pro Topic, parallel bevorzugt)

  → plan-agent-merger             (Phase 4c — Gate: alle 4b-Deliverables abgeschlossen)

  → plan-review-optimist-agent | plan-review-pessimist-agent | plan-review-normalo-agent | plan-review-oberlehrer-agent | plan-review-professor-agent  (Phase 5, parallel bevorzugt)

  → plan-agent-synthesizer        (Phase 6 — Gate: alle 5 Reviews abgeschlossen)

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

- **Schnittstellen-Design (Phase 4a, Interface-Designer):** Nach Scout-Zusammenfuehrung delegiert der

  **Orchestrator** an **`plan-agent-interface-designer`**, der die **Topic-Map** (z. B. Frontend, Gateway, Service-A, Service-B, EF/DB)

  und den **Schnittstellen-Vertrag** zwischen den Topics (Request/Response, DTOs,

  Methoden-Signaturen, Routen). Bei **mehreren Topics** Pflicht: Sequence-Diagramm oder

  tabellarische Darstellung der Kette (z. B. Button-Klick → Gateway → Search-Service → DB).

  **Kein** Topic-Planer ohne festgelegte Schnittstellen aus 4a.

- **Topic-Planer (Phase 4b):** **Mindestens ein**, bis **10** Laeufe mit Agent-Typ

  **`plan-agent-topic-planner`** — auch bei **Single-Topic** (kein Skip, kein Hauptagent-Ersatz). Je Topic **genau ein** Planer

  mit Topic-Scope, **Tech-Mindset** (z. B. Angular, .NET-Service, EF), Schnittstellen-Vertrag

  aus 4a, Scout-Auszug und Anforderung. Jeder Teilplan **muss** parallele Implementierung

  (Sub-Slices, contract-first, Blocking) fuer sein Topic adressieren. **Parallelitaet** der

  Planer-Subagents **bevorzugt**; bei Host-Limits **Batches** — Planer-Anzahl im Auftrag **nicht**

  reduzieren. **Verboten:** Topic-Planer nur durch Rollensimulation im Hauptagenten-Turn.

- **Merge (Phase 4c, Merger):** Der Orchestrator delegiert nach Abschluss aller 4b-Topic-Planer

  an **`plan-agent-merger`**, der Teilplaene zu **Arbeitsversion** fuer Phase 5 zusammenfuehrt;

  **harter Gate:** Schnittstellen-Drift pruefen, Widersprueche aufloesen oder als Nutzerfrage markieren.

  **Ohne** abgeschlossene 4b **kein** 4c.

- **Fuenf-Perspektiven-Review (Phase 5):** verpflichtend, ohne Nutzer-Opt-in. Gate: erst nach vollstaendiger 4c-Arbeitsversion (nicht Scout-Notizen/4a-Schnittstellen). Je ein Lauf `plan-review-optimist-agent`/`plan-review-pessimist-agent`/`plan-review-normalo-agent`/`plan-review-oberlehrer-agent`/`plan-review-professor-agent` — parallel bevorzugt; sonst sequenziell fuenf Task-Subagent-Laeufe. **Verboten:** Rollensimulation statt Subagents. → Phase 5 (vollstaendige Ausfuehrungsregeln).

- Parallele Subagenten **nur innerhalb derselben Stufe** (siehe **Phasen-Gates**); **keine**

  Cross-Phase-Parallelitaet. Danach **inhaltliche** Synthese (Phase 6, **`plan-agent-synthesizer`**), Konsistenzpruefung und das **finale Planpaket** zur

  Nutzer-Freigabe.

- **Finales Planpaket (Phase 6):** Nach Review-Digest, Synthese-Checkliste,

  Planaktualisierung und Block **Komplexitaets- und Executor-Empfehlung** formuliert **`plan-agent-synthesizer`** das vollstaendige finale Planpaket.

  Ist eine spaetere **Implementierung** vorgesehen, ist das Planpaket **ohne** den

  Pflichtabschnitt **Umsetzungs-Topologie (Implementation Workflow)** unvollstaendig

  (Ausnahme: Trivial-Kurzform, siehe Phase 6).

- **Orchestrator-Arbeitsplaene:** Laesst sich die Aufgabe sinnvoll in unabhaengige

  Arbeitspakete splitten (z. B. Frontend/Backend, getrennte Services, parallele

  Dateibereiche), soll der Umsetzungsplan eine **Orchestrator-Sicht** enthalten:

  Subagent-Arbeitspakete, Abhaengigkeiten zwischen Paketen **und** Reihenfolge,

  klar definierter **Integrations-/Merge-Schritt**, wer Konflikte aufloest und wie

  End-to-End-Konsistenz geprueft wird; danach Reihenfolge fuer globales Review/

  Verifikation. Keine Pseudoparallele Arbeitsstellung bei gleicher Datei oder bei

  geteilten Contracts ohne vereinbartes Interface-first-Vorgehen.

- **Slice-Obergrenze (Umsetzungs-Topologie):** Bis **10** unabhaengige

  Implementierungs-Slices sind zulaessig, wenn Unabhaengigkeit, Wellen und Blocking im

  Plan stehen (keine Pseudoparallele bei gleichen Dateien; contract-first bei geteilten

  Contracts). Slice-IDs gemaess **Slice-ID-Konvention (IMP-*)** (siehe unten); feine

  `IMP-BE-{ServiceKuerzel}` ermoeglichen parallele Backend-Services in derselben Welle —

  ersetzen nicht die Wellen- und Blocking-Logik. Parallele Wellen mit vielen Slices: im Plan alle Slice-IDs festhalten;

  bei Host-Limits die Ausfuehrung in **Batches** (z. B. mehrere parallele Starts pro

  Welle) — **ohne** die Slice-Anzahl im Plan zu reduzieren (Details:

  [Implementation Workflow](../implementation-workflow/SKILL.md), Schritt 2).

- Grobe Erfolgswahrscheinlichkeit (in Prozent) optional an geeigneter Stelle

  angeben, klar als Schaetzung ohne Garantie; mit kurzer Begruendung.

- **Phase 6 vs. spaetere Umsetzung:** Die **Komplexitaets- und Executor-

  Empfehlung** in Phase 6 richtet sich an die spaetere **Umsetzung** (illustratives

  Executor-Tier). Die verbindliche **Ausfuehrungstopologie** legt nach finalem Plan

  der [Implementation Workflow](../implementation-workflow/SKILL.md)

  („Ausfuehrungsform vor Schritt 2") fest. **Modellwahl** delegierter Planungs-Agenten und Orchestrator: nur in

  den jeweiligen [../../agents/plan-agent-*.md](../../agents/) — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

- Skill bleibt neutral zu Technikstack und Dateipfaden; Vorgaben des

  Wirtsprojekts sind bei der Ausfuehrung zu beachten.

## Eingabe Buddy-Plan-Prompt (bevorzugt)

**Bevorzugte Eingabe** fuer `plane …` / plan-agent: describe-as-Handoff aus [buddy-agent/SKILL.md](../buddy-agent/SKILL.md) (Phase **plan-prompt**), Section B.

Wenn der Nutzer einen Buddy-Handoff liefert (ganzer Prompt oder Section B eingebettet):

| Handoff-Abschnitt | Planungs-Nutzung |
|-------------------|------------------|
| `## Goal` | Zielbild, Motivation, Ist-Kontext (**Was**) |
| `## Code & Fundstellen` | **Wo** im Repo — fuer Scout-Auftrag Phase 3, nicht erneut beim Nutzer erfragen |
| `## Acceptance criteria` | Bindend fuer Plan und Review |
| `## Decisions / already clarified` | **Abgeschlossen** — **nicht** erneut hinterfragen |
| `## Edge cases / open questions` | Einzige Quelle fuer verbleibende Nutzer-Fragen in Phase 1 |
| `## Current vs desired behavior` | Ist/Soll fuer Phase 2 und 4a |

**Phase 1 mit Buddy-Handoff:**

- Handoff als **verbindliche Anforderungsbasis** behandeln — nicht von vorn aufrollen.

- **Verboten:** Rueckfragen zu Punkten unter `## Decisions / already clarified`.

- **Erlaubt:** Fragen **nur** zu Eintraegen unter `## Edge cases / open questions` oder zu **neuer** Mehrdeutigkeit im aktuellen Nutzer-Text, die den Planinhalt aendern wuerde.

- **Ziel:** Idealerweise **null** Nutzer-Fragen in Phase 1–2, wenn Handoff vollstaendig ist — direkt Phase 2 und Phase 3.

**Phase 2 mit Buddy-Handoff:** Zwischenstand aus Handoff-Abschnitten zusammenfassen (Goal, AC, Decisions, offene Edge cases) — kein paraphrasierendes Neuverhandeln.

## Phase 1 - Anforderung pruefen (ohne Code-Kontext)

**Erlaubt:** Verstaendnis der Aufgabe, Zielbild, Randbedingungen,

Akzeptanzkriterien, minimale Klaerungsfragen bei Mehrdeutigkeit — **nur** wo Buddy-Handoff fehlt oder Edge cases offen sind (siehe **Eingabe Buddy-Plan-Prompt**).

**Verboten:** Code-Recherche, Dateisuche, Repo-Navigation, Architekturannahmen

aus dem Kopf, Entwurf oder Finalisierung eines Umsetzungsplans; Rueckfragen zu bereits geklaerten Buddy-Entscheidungen.

Bei Bedarf: grobe Einschaetzung von Komplexitaet und Unsicherheit, rein aus dem

Gespraech/Handoff, nicht aus Code.

## Phase 2 - Zwischenstand (vor Scouting)

Kurze Zusammenfassung dessen, was bisher vereinbart/gesichert ist (Ziel,

Randbedingungen, Akzeptanzkriterien, offene Punkte). Bei Buddy-Handoff: aus Section B uebernehmen, nicht neu erfinden.

**Unmittelbar im selben Durchlauf** setzt der ausfuehrende Agent mit **Phase 3**

(Codebereichs-Scouting) fort — es ist **keine** Nutzerabfrage erforderlich, ob

Scouting gestartet werden soll.

## Phase 3 - Codebereichs-Scouting

**Direkt nach Phase 2** einen oder mehrere Laeufe mit Agent-Typ **`plan-agent-scout`**

(Read-only). Siehe Abschnitt **Subagent-Typen und Agent-Definitionen**.

**Code-Recherche (verbindlich) — MCP-Sequenz vor nativem Grep:**
[repo-scout-protocol/SKILL.md](../repo-scout-protocol/SKILL.md) vollständig — Routing-Matrix, Pflicht `find_by_content`/`find_file` bei Index-Miss, Scout-Protokoll-Tabelle im Deliverable.
Bei Bezug auf Klassen, Methoden, Properties, Services, Routen oder „von Stelle A nach Stelle B" —
Basis-Landkarte (`index_project` auf MCP container paths + `find_in_index`) gemäß
[codebase-analyzer — op-code-map](../codebase-analyzer/references/op-code-map.md).
Read/Grep nur nach ausgeschöpfter MCP-Kette oder MCP-BLOCKER.
UI-Elemente ohne Symbol (Button-Label, Feld ohne Klassenname) sind davon ausgenommen.

**Erweiterte MCP-Analyse in Phase 3** (nach `find_in_index`, wenn konkrete Klassen/Methoden aufgelöst):
Scouts rufen zusätzlich (MCP primär, Fallback nur bei MCP-Fehler):

| Schritt | MCP-Call (primär) | Fallback | Bedingung |
|---------|-------------------|----------|-----------|
| A | `analyze_complexity` auf betroffene Dateien | Methoden-Länge via Grep | mind. 1 Klasse im Scope |
| B | `analyze_refactoring_safety` auf Klassen mit geplantem Umbau | Abhängigkeiten via `find_in_index` | nur bei Umbau |
| C | `suggest_class_splits` bei Klassen mit >1 Verantwortung | Manuelle Lektüre via Read | nur wenn relevant |
| D | `analyze_maintainability_index` auf betroffene Dateien | MI-Schätzung via Methoden-Länge + Branches | wie Schritt A (mind. 1 Klasse im Scope) |
| E | `analyze_type_graph` auf betroffene Dateien | Grep auf `Tuple<` / Mehrfach-Rückgaben | mind. 2 Klassen/Services im Scope **und** Schnittstellen oder Rückgabetypen betroffen |

Scouts dokumentieren im Deliverable: MCP-Analyse-Status + Positionen 6–10 (Hotspots, Risiken, Split-Kandidaten, Maintainability-Findings, Typ-Smells).

**Orchestrator-Vorindizierung (Pflicht vor Scout-Delegation bei Symbol-Scopes):** Orchestrator
ruft **vor** Scout-Delegation mindestens einmal pro betroffenen Stack bzw. `.csproj` `index_project` auf
(Smoke: Output enthält Summary) und gibt die **verifizierten Literal-Pfade** in den Scout-Auftrag —
keine unersetzten Platzhalter `{mcp-*}` ohne Wert.
Pfade gemäß **`.cursor/references/mcp-project-paths.md`** (Literale in Scout-Prompt).
Schlägt `index_project` fehl: BLOCKER; [op-code-map.md](../codebase-analyzer/references/op-code-map.md#mcp-pfadauflösung-docker--pflicht-playbook)
— **kein** blindes `index_solution` ohne `index_solution: allowed` in mcp-project-paths.md.

**Scout-Merge — MCP-Status-Gate:** Beim Zusammenführen aller Scout-Deliverables prüfen:
Wenn **alle** Scouts `MCP: fallback` ohne dokumentierten Anker-Pfad zurückliefern →
**Plan 4a nicht starten** bis mindestens ein Stack-Pfad verifiziert oder als
`MCP-BLOCKER` im Plan markiert und dem Nutzer kommuniziert ist.

**Anzahl Scouts:**

- **1 Scout** bei kleinem, zusammenhaengendem Scope oder wenn ein Bereich den Kontext traegt.

- **Bis zu 10 Scouts**, wenn die Aufgabe klar in getrennte Codebereiche faellt (z. B.

  Frontend/Backend, mehrere Services, parallele Feature-Bereiche). Je Scout: **eigener**, in

  Prompt und Kontext explizit genannter **Teil-Scope** (Pfade, Module, Suchhinweise) — nicht

  dieselben Dateien durch mehrere Scouts.

**Ausfuehrung Multi- vs. Single-Scout:** Eine **Multi-Scout-**Aufteilung **oder** kurze

Begruendung, warum **ein** Scout reicht (kleiner Scope, enge Kopplung, gemeinsamer

Einstiegspunkt). Bei Multi-Scout: **welche Scouts parallel** starten duerfen; bei Host-Limits

**Batches** (wie bei parallelen Implementierungs-Slices) — Scout-Anzahl im Auftrag **nicht**

reduzieren.

**Zusammenfuehrung:** Der **Hauptagent** fasst alle Scout-Rueckgaben **inhaltlich** zusammen

(Widersprueche, Luecken, gesamtueberblick betroffener Dateien) — **vor** Phase 4a. Kein Scout

liefert den finalen Plan.

**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

**Wenn Subagents/Task-Tool nicht verfuegbar sind:** im Plan-Output einen **klaren

Hinweis** ausgeben (Limitation), **kein** stiller Wechsel zum Hauptagenten als

Pseudo-Scout.

Scouting-Auftrag wortgetreu aus der Vorlage in

[references/subagent-prompts.md](references/subagent-prompts.md) (Abschnitt "Codebereichs-Scout")

bauen; Agent-Typ **`plan-agent-scout`** ([plan-agent-scout.md](../../agents/plan-agent-scout.md)); bei Multi-Scout Platzhalter **Teil-Scope** und ggf. **Scout-ID** setzen. Scout liefert

**keine** Implementierung und **keinen** finalen Plan.

## Phase 4 - Umsetzungsplan (4a, 4b, 4c)

Phase 4 ist in drei Teilschritte gegliedert. Die **Arbeitsversion** fuer Phase 5 entsteht

erst in **Phase 4c** (Merge). **Kein** finales Nutzer-Paket vor Phase 6.

### Phase 4a - Schnittstellen-Design (Interface-Designer)

**Direkt nach** Scout-Zusammenfuehrung (Phase 3). Der **Orchestrator** delegiert an

**`plan-agent-interface-designer`** ([plan-agent-interface-designer.md](../../agents/plan-agent-interface-designer.md)).

Auftrag aus [references/subagent-prompts.md](references/subagent-prompts.md) (Abschnitt "Interface-Designer") bauen.

Der Interface-Designer formuliert aus den Scout-Deliverables:

- **Topic-Map:** Liste der Topics (z. B. `TOPIC-FE-Search`, `TOPIC-BE-GW`,

  `TOPIC-BE-AppService`, `TOPIC-BE-EF`) mit kurzer Verantwortung je Topic. Topics sind

  **Planungs-IDs** (`TOPIC-*`); IMP-Slice-IDs fuer die Umsetzung folgen der **Slice-ID-

  Konvention** in Phase 6.

- **Schnittstellen-Vertrag:** Pro Topic-Grenze: eingehend/ausgehend (HTTP-Route, DTO,

  Methoden-Signatur, Events); keine stillen Annahmen zwischen Topics.

- Bei **mehreren Topics:** **Sequence-Diagramm** (Mermaid) oder **Tabelle** der Aufrufkette

  (Beispiel: UI-Aktion → API-Gateway → Anwendungsservice → Persistence-Schicht).

- Scout-Ergebnisse und Anforderung (Phasen 1–2) einbeziehen; offene Punkte markieren.

**Deliverable 4a:** Topic-Map + Schnittstellen-Vertrag — verbindliche Eingabe fuer Phase 4b.

**Gate 4a → 4b (Orchestrator-Pflicht):** Vor Start von Phase 4b prueft der Orchestrator das

Interface-Designer-Deliverable auf formale Vollstaendigkeit:

- Alle Topics in der Topic-Map vorhanden?
- Schnittstellen-Vertrag fuer jede Topic-Grenze (inbound/outbound)?
- Sequence-Diagramm vorhanden, wenn ≥ 2 Topics?

Bei Luecken: Interface-Designer mit Fix-Kontext **neu starten** — **kein** 4b ohne geprueftes Deliverable.

**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

### Phase 4b - Topic-Planer-Subagents (verpflichtend)

**Mindestens ein**, bis **10** Laeufe mit Agent-Typ **`plan-agent-topic-planner`** — **auch bei nur einem Topic**. **Kein** Hauptagent-Ersatz fuer 4b.

**Anzahl Planer:** Ein Planer pro Topic aus 4a. Bei Host-Limits **Batches** starten —

Planer-Anzahl im Auftrag **nicht** reduzieren. **Parallelitaet** **bevorzugt**, sofern der Host

es erlaubt.

**Pro Topic-Planer im Prompt (Vorlage in** [references/subagent-prompts.md](references/subagent-prompts.md) **Abschnitt „Topic-Planer“;**

**Agent-Typ:** [plan-agent-topic-planner.md](../../agents/plan-agent-topic-planner.md)**):**

- Topic-ID und Topic-Scope (Pfade, Module, Service-Name)

- **Tech-Mindset** (z. B. Angular Frontend, .NET Gateway, .NET App-Service, EF Core)

- Schnittstellen-Vertrag aus 4a (nur dieses Topic: inbound/outbound)

- Relevanter Scout-Auszug und Anforderungsauszug

- **Pflicht im Teilplan:** Abschnitt **„Parallele Implementierung“** (welche Dateien/Slices

  parallel moeglich, contract-first, Blocking zu anderen Topics)

**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

**Wenn Subagents/Task-Tool nicht verfuegbar:** transparent melden, **kein** Pseudo-Planer

im Orchestrator-Turn; **kein** 4c ohne 4b.

Topic-Planer liefern **nur** den Teilplan fuer **ein** Topic — **keinen** Gesamtplan, **kein** Review.

### Phase 4c - Merge zur Arbeitsversion (Merger)

**Voraussetzung:** alle Topic-Planer aus 4b abgeschlossen.

Der **Orchestrator** delegiert an **`plan-agent-merger`** ([plan-agent-merger.md](../../agents/plan-agent-merger.md)).

Auftrag aus [references/subagent-prompts.md](references/subagent-prompts.md) (Abschnitt "Merger") bauen —

Schnittstellen-Vertrag aus 4a und alle Topic-Teilplaene vollstaendig einfuegen.

Der Merger fuehrt zusammen:

- Teilplaene zu **einer** **Arbeitsversion** fuer Phase 5 (startfaehig ohne weitere Recherche)

- **Harter Gate:** Schnittstellen aus 4a vs. Teilplaene — Drift, Luecken, Widersprueche;

  aufloesen oder als **Nutzerfrage** markieren

- Gesamtuebersicht: relevante Dateien, Einstiegspunkte, Schritte, Akzeptanzkriterien, Risiken,

  offene Fragen

- **Ausfuehrung Multi- vs. Single-Agent** und **Orchestrator-Sicht:**

  Multi-Subagent-Aufteilung **oder** Begruendung Single-Agent; bei Multi: Arbeitspakete,

  Parallelitaet, Blocking, gemeinsame Artefakte, Interface-first, Orchestrator-Integration,

  E2E-Pruefung

- **IMP-Slices aus Teilplaenen ableiten** (nicht erfinden): Aus vorgeschlagenen IMP-Slice-IDs

  der Topic-Teilplaene eine konsistente Slice-Tabelle zusammenfuehren. Kuerzel gemaess

  `IMP-FE-{Bereich}-…` / `IMP-BE-{ServiceKuerzel}-…`; nicht mehrere Services unter einer

  undifferenzierten `IMP-BE`-ID buendeln. Wellen und Blocking fuer Phase 6 vorbereiten.

**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

**Ohne** 4b **kein** 4c. Bei **einem** Topic: ein Planer, Merge trotzdem in 4c.

## Phase 5 - Fuenf-Perspektiven-Review (verpflichtend)

**Pflichtphase.** Darf nicht uebersprungen werden. Die **Arbeitsversion aus Phase 4c** wird

immer durch **fuenf** getrennte Review-Rollen geprueft: **Optimist**, **Pessimist**,

**Normalo**, **Oberlehrer**, **Professor**. Ziel ist ein echtes Fuenf-Perspektiven-Review mit **fuenf Task-

Subagent-Laeufen** und klar getrennten Rolleninhalten (siehe Leitprinzipien:

**keine Rollensimulation** durch den Hauptagenten).

**Ausfuehrung:** Je Rolle **genau ein** Lauf mit dem passenden Agent-Typ; wenn die Plattform **parallel** erlaubt, alle fuenf parallel

starten.

| Rolle | Agent-Typ |
|-------|-----------|
| Optimist | `plan-review-optimist-agent` |
| Pessimist | `plan-review-pessimist-agent` |
| Normalo | `plan-review-normalo-agent` |
| Oberlehrer | `plan-review-oberlehrer-agent` |
| Professor | `plan-review-professor-agent` |

Prompts aus [references/subagent-prompts.md](references/subagent-prompts.md); Profile unter [../../agents/](../../agents/).

**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

**Fallback bei fehlender Parallelitaet:** ohne Nutzerabfrage **sequenziell** dieselben

fuenf **Task-Subagent**-Laeufe nacheinander (Reihenfolge optional z. B. Optimist →

Pessimist → Normalo → Oberlehrer → Professor oder wie im Team vereinbart — **konsequent dokumentieren**).

**Verboten:** **Rollensimulation** durch den Hauptagenten als Ersatz fuer Subagents.

**Wenn Task-Subagents / Task-Tool fehlen:** im Plan-Output **transparent**

melden (z. B. „Fuenf-Perspektiven-Review mit Task-Subagents nicht ausfuehrbar“),

**kein** verdeckter Ersatz durch Rollenspiel; ggf. Arbeitsversion mit

**Warnhinweis** zur eingeschraenkten Review-Tiefe — **keine** Freigabe fuer „Review

ja/nein“ oder Wahl eines Ersatzverfahrens einholen, ausser der Nutzer steuert dies

ausdruecklich ausserhalb dieses Skills.

## Slice-ID-Konvention (IMP-*)

Portable Benennung fuer Implementierungs-Slices in der **Umsetzungs-Topologie**. Keine

fest codierten Projektnamen — Bereich und ServiceKuerzel legt der Planer **im jeweiligen

Plan** fest.

**Schema:**

```text

IMP-FE-{Bereich}[-{Teil}][-{Nr}]

IMP-BE-{ServiceKuerzel}[-{Teil}][-{Nr}]

```

| Segment | Bedeutung | Regeln |

|---------|-----------|--------|

| `IMP` | Implementierungs-Slice | Fix |

| `FE` / `BE` | UI-Schicht vs. serverseitige Schicht | Kein Ersatz fuer Feature- oder Service-Name |

| `{Bereich}` / `{ServiceKuerzel}` | Feature-, Modul- oder Service-Kurzname **aus dem Plan** | z. B. `Search`, `components`, `GW`, `EF`, `ES` — im Plan definieren, nicht im Skill festlegen |

| `{Teil}` (optional) | Deliverable/Teilscope innerhalb des Bereichs | z. B. `Rules`, `Routes`, `Page`, `Migration` |

| `{Nr}` (optional) | Laufende Nummer bei mehreren Slices gleichen Prefix | z. B. `-1`, `-2` |

**Beispiele (Illustration, projektneutral):**

- `IMP-FE-Search-Rules` — Frontend, Search-Feature, Parser/Rules

- `IMP-FE-components-Dialog` — Frontend, shared/dumb components

- `IMP-BE-GW-Logging` — Backend, Gateway-Service

- `IMP-BE-EF-Migration` — Backend, Persistence/ORM-Schicht

- `IMP-BE-ES-Repository` — Backend, beliebiger App-Service (Kuerzel `ES` = Beispiel)

**Anti-Patterns (verboten):**

- `IMP-FE` / `IMP-BE` **ohne** Bereich bzw. ServiceKuerzel (Ausnahme: Trivial-Kurzform `IMP-1`)

- Ein `IMP-BE-…` fuer **mehrere** Services buendeln

- Parallelitaet aus `FE` vs. `BE` **ableiten** — Parallelitaet nur ueber **Wellen + Unabhaengigkeit**

  (keine gleichen Dateien; geteilte Contracts nur mit contract-first/W0)

**Trivial-Kurzform:** `Topologie: 1× IMP-1, sequentiell, keine Blocking-Deps`. Bei

erkennbarem FE/BE-Scope stattdessen `IMP-FE-{Bereich}-1` oder `IMP-BE-{ServiceKuerzel}-1`

**bevorzugen**.

**Abgrenzung Verifikation:** Slice-IDs steuern **Implementierungs-Subagents** (`implement-agent`).

Verify-Stacks (Frontend / Backend; Backend ggf. per unabhängiger Build-Einheit) definiert das **Wirtsprojekt** in Host-Doku —

mehrere `IMP-BE-*`-Slices koennen denselben Backend-verify-Stack teilen.

## Phase 6 - Synthese und Freigabe

**Voraussetzung:** alle fuenf Phase-5-Reviews abgeschlossen.

Der **Orchestrator** delegiert an **`plan-agent-synthesizer`** ([plan-agent-synthesizer.md](../../agents/plan-agent-synthesizer.md)).

Auftrag aus [references/subagent-prompts.md](references/subagent-prompts.md) (Abschnitt "Synthesizer") bauen —

Arbeitsversion aus 4c und alle fuenf Review-Ergebnisse vollstaendig einfuegen.

**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).

Der Synthesizer erstellt in dieser Reihenfolge (Deliverable-Details im Agent-Profil und in der Prompt-Vorlage):

1. **Review-Digest** — zuerst ausgeben, bevor inhaltliche Synthese beginnt. Fuenf Abschnitte
   (Optimist, Pessimist, Normalo, Oberlehrer, Professor); je nummeriertem Punkt 1–2 Saetze Kernaussage.
   Bei fehlendem Task-Tool in Phase 5: Limitations-Hinweis beibehalten, keinen erzwungenen Digest.

2. **Synthese-Checkliste (Punkte 1–6)** — Checkliste aus
   [references/subagent-prompts.md](references/subagent-prompts.md) (Abschnitt „Synthese-Checkliste").
   [KRITISCH]-Punkte des Professors sind Pflicht-Adressierung.

3. **Komplexitaets- und Executor-Empfehlung (final)** — kurzer eigenstaendiger Block:
   Komplexitaet Low/Medium/High; Executor-Tier illustrativ (keine Markennamen als Vorschreibung);
   Topologie-Hinweis verbindlich (konsistent mit Pflichtabschnitt Umsetzungs-Topologie);
   Begruendung 2–4 Saetze aus Phase-5-Reviews (insbesondere Pessimist); Disclaimer.
   Bei trivialem Plan einzeilig: „Empfehlung nicht erforderlich".

4. **Finales Planpaket** — vollstaendiger Freigabetext. Pflicht-Abschnitt

   **Umsetzungs-Topologie (Implementation Workflow)** (wenn Implementierung vorgesehen;
   Trivial-Kurzform: `Topologie: 1× IMP-1, sequentiell, keine Blocking-Deps`). Mindestschema:

   - **Modus:** `single` | `sequential` | `parallel` (Wellen)

   - **Slices (1–10):** Tabelle `ID` | Scope | Deliverable | parallel mit | blockiert durch;
     IDs gemaess Slice-ID-Konvention (IMP-*); max. 10 Slices gesamt

   - **Wellen:** W0 contract-first, W1 parallele Slices, W2 Integration

   - **Integration:** wer merged, Schnittstellencheck, E2E-Akzeptanz gegen Plan

   - **Implement-Review-Loop:** Verweis auf Implementation Workflow
     (Technik-Gate + 6 Reviewer + Fix-Planer + Fix-Slices)

   - **BoyScout pro Slice:** `suggest_boyscout_actions` als letzter Schritt jedes Slices

   Ohne diesen Abschnitt (wenn Implementierung vorgesehen): Planpaket unvollstaendig.

**Gate 6 (Orchestrator-Pflicht):** Vor Nutzer-Presentation prueft der Orchestrator:

- Sind alle [KRITISCH]-Punkte des Professors adressiert?
- Ist Pflichtabschnitt Umsetzungs-Topologie vorhanden (wenn Implementierung vorgesehen)?
- Review-Digest vorhanden (wenn Task-Subagents in Phase 5 verfuegbar waren)?

Bei Luecken: Synthesizer mit Fix-Kontext **neu starten**.
## Abgrenzung ADO und buddy-agent

- **ado:** `load` → `analyse` → `save` — ADO ↔ Markdown ([ado/SKILL.md](../ado/SKILL.md)); **kein** Planpaket.
- **buddy-agent:** `buddy intake …` / `buddy repo-check …` — nur Task.md, Sparring, End-Artefakt **Plan-Prompt** ([buddy-agent/SKILL.md](../buddy-agent/SKILL.md)).
- **Verfeinern (Legacy):** `Task … verfeinern` — [task-verfeinern.md](../ado/references/task-verfeinern.md); interaktiver Dialog; kein Planpaket in MD.
- **`plane Task …`:** dieser Planning Workflow — bevorzugte Eingabe: Plan-Prompt aus Buddy (Section B); finales Planpaket **im Chat**.

## Orchestrator-Konfiguration

Konfiguration des **plan-agent** — Planungs-Orchestrator (Phasen 1, 2).

### Pflicht: Planning-Workflow-Skill laden (erster Schritt, ohne Ausnahme)

> **Bevor du irgendeine Phase startest oder eine Antwort formulierst — lade in dieser Reihenfolge:**
>
> **Skills (immer):**
> 1. **[planning-workflow/SKILL.md](SKILL.md)** — vollständig; definiert Phasen, Gates, Deliverables, Subagent-Prompts verbindlich.
> 2. **[caveman/SKILL.md](../caveman/SKILL.md)** — Modus `lite`; gilt für alle Chat-Ausgaben dieses Agents.
> 3. **[codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md)** — MCP-First für alle Analysen; Read/Grep nur als Fallback.
>
> **Rules (`.cursor/rules/` prüfen — relevante laden und befolgen):**
> 4. **[planning-workflow-skill.mdc](../../rules/planning-workflow-skill.mdc)** — immer; Phasen-Gates, Subagent-Typen, Modellwahl.
> 5. **[codebase-analyzer.mdc](../../rules/codebase-analyzer.mdc)** — immer; Symbol-Suche, Phasen-Mapping, MCP-Ausgabeformat.
> 6. **[angular-skills.mdc](../../rules/angular-skills.mdc)** — wenn FE-Topics im Scope.
> 7. **[backend-ef-migrations-skill.mdc](../../rules/backend-ef-migrations-skill.mdc)** — wenn EF/Migrations im Scope.
>
> Kein Überspringen, kein Zusammenfassen aus dem Gedächtnis. Erst danach: Phase 1 starten.

### Rolle

**Senior-Softwarearchitekt** und **reiner Planungs-Orchestrator** — orchestriert den Ablauf, delegiert alle Inhalts-Phasen, prueft Deliverables formal. **Erstellt selbst weder Plaene noch Planpakete noch Implementierungen.**

**Deine Phasen:** 1, 2 — plus Delegation, Deliverable-Pruefung und Phasen-Gate-Steuerung.

**Nicht deine Phasen (delegieren):** 3 (Scout), 4a (Interface-Designer), 4b (Topic-Planer), 4c (Merger), 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor), 6 (Synthesizer).

### Modell

| Feld | Wert |
|------|------|
| **Primär** | `inherit` (vom Nutzer-Chat / Parent) |

Orchestrator-Modell ist **unabhängig** von delegierten Agenten — deren Modelle nur im jeweiligen Ziel-Profil (Abschnitt **`## Modell`** primär, sonst YAML).

### Mantra

**Clean Code · Clean Development · SOLID · YAGNI**

- Nur das **Notwendigste** ändern — kein Over-Engineering.
- Bestehende Konventionen im Repo respektieren.
- Jede Empfehlung begründen: *Warum minimal? Warum hier?*

### Delegation — spezialisierte Planungs-Agenten (ohne Ausnahme)

Fuer **alle Inhalts-Phasen** (3, 4a, 4b, 4c, 5, 6) **niemals** `explore`, `generalPurpose`, `shell` oder Rollensimulation im eigenen Turn.

| Phase | Agent-Typ | Profil |
|-------|-----------|--------|
| 3 | `plan-agent-scout` | [plan-agent-scout.md](../../agents/plan-agent-scout.md) |
| 4a | `plan-agent-interface-designer` | [plan-agent-interface-designer.md](../../agents/plan-agent-interface-designer.md) |
| 4b | `plan-agent-topic-planner` | [plan-agent-topic-planner.md](../../agents/plan-agent-topic-planner.md) |
| 4c | `plan-agent-merger` | [plan-agent-merger.md](../../agents/plan-agent-merger.md) |
| 5 | `plan-review-optimist-agent` | [plan-review-optimist-agent.md](../../agents/plan-review-optimist-agent.md) |
| 5 | `plan-review-pessimist-agent` | [plan-review-pessimist-agent.md](../../agents/plan-review-pessimist-agent.md) |
| 5 | `plan-review-normalo-agent` | [plan-review-normalo-agent.md](../../agents/plan-review-normalo-agent.md) |
| 5 | `plan-review-oberlehrer-agent` | [plan-review-oberlehrer-agent.md](../../agents/plan-review-oberlehrer-agent.md) |
| 5 | `plan-review-professor-agent` | [plan-review-professor-agent.md](../../agents/plan-review-professor-agent.md) |
| 6 | `plan-agent-synthesizer` | [plan-agent-synthesizer.md](../../agents/plan-agent-synthesizer.md) |

### Delegations-Regeln

1. **Immer** den passenden **Agent-Typ** starten — Modell gemäß [subagent-model-before-task.md](../../references/subagent-model-before-task.md) aus dem **Ziel-Profil**.
2. **Pflicht:** [subagent-delegation-boilerplate.md](../../references/subagent-delegation-boilerplate.md) in **jeden** Task-Prompt — Skills/Rules **einhalten**, nicht nur laden ([agent-compliance.md](../../references/agent-compliance.md)).
3. Auftrag aus [references/subagent-prompts.md](references/subagent-prompts.md) (Platzhalter ersetzen) **plus** relevanter Kontext (Scout-Deliverables, 4a-Schnittstellen-Vertrag, Teilplaene etc.).
4. **Phasen-Gates (verbindlich):** Stufe N+1 **erst**, wenn Stufe N **vollständig** abgeschlossen — siehe Skill **Phasen-Gates**. Parallelität **nur innerhalb derselben Stufe**.
5. Nur **kompakte Deliverables** zurückverlangen. Rückgaben ohne Workflow-Compliance oder fehlender formaler Vollstaendigkeit → Subagent **neu** starten.

### Code-Landkarte (Phase 2→3)

**MCP zuerst — Fallback nur bei MCP-Fehler.**

**Vor jeder Scout-Delegation** mit Symbolen:

1. Orchestrator ruft **einmal pro Stack** `index_project` auf.
2. Ergebnis: aufgelöste Symbole und **verifizierter `projectPath`** als feste Werte in den Scout-Auftrag.
3. **Schlägt `index_project` fehl:** Pfad-Playbook aus [codebase-analyzer/SKILL.md](../codebase-analyzer/SKILL.md) befolgen; danach `MCP-BLOCKER` im Scout-Auftrag — **kein** stilles Überspringen.

### Projektstandards

| Bereich | Planung |
|---------|---------|
| Repo | Code unter `./` |
| Frontend | Kein Tailwind; Styleguide; Angular-Skills bei FE-Topics |
| Backend | `./.skills/backend-*`; EF nur per CLI |
| Danach | [Implementation Workflow](../implementation-workflow/SKILL.md) — du lieferst Slices/Wellen |

### Verboten

- Code implementieren oder Dateien ändern
- Planungsinhalte (Topic-Map, Schnittstellen-Vertrag, Teilplaene, Merge, Synthese) selbst erstellen
- Scout/Interface-Designer/Topic-Planer/Merger/Review/Synthesizer selbst simulieren
- Implementierungs- oder Verifikations-Agenten fuer Planung
- Stille fachliche Annahmen
- Phasen-Gate ueberspringen oder 4b vor geprueftem 4a-Deliverable starten

### Ausgabeformat

**Deutsch**, klar strukturiert. Mermaid für grenzüberschreitende Flows. Fokussiert — umsetzbarer Plan, keine Essay-Länge.

---

## Pflegehinweis

Aenderungen an diesem Skill oder an Trigger-Formulierungen: in Wirtsprojekten

die zentrale Agent-Dokumentation (Skill-Tabelle, Pflichtladehinweise) pruefen

und bei Bedarf anpassen. **Trigger:** Aenderungen an Ausloesermustern immer **doppelt**

pflegen: diese `description` (kompakt) und die **kanonische** Trigger-Liste in

**`.cursor/rules/planning-workflow-skill.mdc`** (Cursor Always-Apply-Regel).

**Modell / Agent-Profile:** Aenderungen an Modell-Slugs oder Orchestrator-Verhalten **nur** in

[Orchestrator-Konfiguration](SKILL.md#orchestrator-konfiguration) dieses Skills — danach diese Skill-Tabelle **Subagent-Typen** abgleichen.

**Prompt-Vorlagen:** Aenderungen an Subagent-Auftrags-Payloads **nur** in [references/subagent-prompts.md](references/subagent-prompts.md); danach Verweise in diesem Skill, in Agent-`.md` und Cross-Skills (z. B. describe-as-prompt) pruefen.

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.

