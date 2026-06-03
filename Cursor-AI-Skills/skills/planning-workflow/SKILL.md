---

name: planning-workflow

description: >

  Beschreibt einen portablen Planungsworkflow fuer Coding-Agenten: zuerst

  reine Anforderungsarbeit ohne Code-Recherche, dann kurzer Zwischenstand

  (Phase 2), unmittelbar gefolgt von Codebereichs-Scouting (Phase 3) per

  einem bis zu zehn **plan-agent-scout**-Laeufen (Phase 3), anschliessend **Phase 4** in **4a** (Orchestrator

  **plan-agent**: Topic-Map und Schnittstellen-Vertrag), **4b** (bis zu zehn **plan-agent-topic-planner**,

  je ein Topic mit Tech-Mindset und Teilplan inkl. paralleler Implementierung) und **4c** (Merge zur

  **Arbeitsversion**), verpflichtendes Drei-Perspektiven-Review (**plan-agent-optimist**,

  **plan-agent-pessimist**, **plan-agent-normalo**), Synthese und finales Planpaket mit verbindlicher

  **Umsetzungs-Topologie** fuer den [Implementation Workflow](../implementation-workflow/SKILL.md)

  (1–10 Implementierungs-Slices, **Slice-ID-Konvention** IMP-FE-{Bereich}/IMP-BE-{ServiceKuerzel},

  Wellen, Integration); Phase 6 formuliert der Orchestrator **plan-agent**.

  Agent-Profile und **Modellwahl** zentral unter `.cursor/agents/plan-agent*.md`; Abschnitt

  **Subagent-Typen und Agent-Definitionen** in diesem Skill. Phase 6 umfasst Review-Digest,

  Synthese, Komplexitaets- und Executor-Empfehlung. Drei-Perspektiven-Review nicht optional.

  Trigger (vollstaendig: .cursor/rules/planning-workflow-skill.mdc): plane/plane bitte/,

  plane die Korrektur/Erweiterung/Anpassung, plane das; Plan/Roadmap/Umsetzungsplan;

  implizit Wie gehen wir vor, Vorgehen skizzieren,

  Optionen/Strategie/Trade-offs, Migration/Refactor/Architektur, lass uns planen,

  noch nicht umsetzen; @planning-workflow-skill, @.cursor/rules/planning-workflow-

  skill.mdc, @.cursor/skills/planning-workflow; Plan Mode mit Code-Bezug; Meta Phase

  3/Scout, Phase 4a/4b/4c, Topic-Planer, Schnittstellen-Design, Drei-Perspektiven-Review,

  Umsetzungs-Topologie; EN write a plan, how

  should we approach, outline/break down; Kombi plane und implementiere zuerst

  Planning. Nicht bei reiner Erklaerung, Plan umsetzen, Handoff describe-as-prompt.

  Opt-out ohne plan-skill/planning-workflow. Ausloesung: unklarer Scope, Architektur-,

  Refactor-, Feature- oder Umsetzungsplanung; nicht triviale Einzeiler.

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

| **1** | Request pruefen; bei Mehrdeutigkeit **Fragen** | 1, 2 | — |

| **2** | Scouts: Code **nur fuer die Anforderung** kartieren | 3 | Stufe 1 |

| **3** | Plan erstellen | 4a → 4b → 4c (Arbeitsversion) | Stufe 2 (+ Scout-Merge) |

| **4** | Plan reviewen lassen | 5 (Optimist, Pessimist, Normalo) | Stufe 3 (**fertige 4c-Arbeitsversion**) |

| **5** | Synthese & Freigabe | 6 | Stufe 4 |



**Parallelitaet — nur innerhalb derselben Stufe:**



- Stufe 2: mehrere **`plan-agent-scout`** parallel (je Teil-Scope), **nicht** parallel zu Stufe 3/4.

- Stufe 3: mehrere **`plan-agent-topic-planner`** parallel (je Topic), **nicht** parallel zu 4c-Merge oder Stufe 4.

- Stufe 4: drei Review-Agenten parallel **untereinander**, **nicht** waehrend 4b laeuft.



**Verboten (haeufiger Orchestrator-Fehler):**



- Phase 5 (Review) starten, waehrend Phase 4b (Topic-Planer) noch laeuft.

- Phase 4b oder 5 starten, waehrend Phase-3-Scouts noch laufen.

- Review mit **vorlaeufigem** Scout-/4a-Entwurf statt **merge-fertiger Arbeitsversion aus 4c**.

- `run_in_background` oder parallele Task-Starts nutzen, um Phasen-Gates zu umgehen.



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

wird von einem **spezialisierten Agent-Typ** aus [../../agents/](../../agents/) ausgefuehrt —

**nicht** ueber `explore`, `generalPurpose`, `shell` oder Rollensimulation im Orchestrator-Turn.



### Rollen im Planning Workflow



Diese Rollen sind **fest** — unabhaengig vom Host. Prompt-Vorlagen (Platzhalter): [references/subagent-prompts.md](references/subagent-prompts.md).



| Rolle | Phase | Parallel? | Max. Laeufe | Orchestrator? | Agent-Typ |

|-------|-------|-----------|-------------|---------------|-----------|

| **Planer / Orchestrator** | 1, 2, 4a, 4c, 6 | — | 1 | ja | [`plan-agent`](../../agents/plan-agent.md) |

| **Codebereichs-Scout** | 3 | bevorzugt | 10 | nein | [`plan-agent-scout`](../../agents/plan-agent-scout.md) |

| **Topic-Planer** | 4b | bevorzugt | 10 | nein | [`plan-agent-topic-planner`](../../agents/plan-agent-topic-planner.md) |

| **Optimist** | 5 | bevorzugt (×3) | 1 | nein | [`plan-agent-optimist`](../../agents/plan-agent-optimist.md) |

| **Pessimist** | 5 | bevorzugt (×3) | 1 | nein | [`plan-agent-pessimist`](../../agents/plan-agent-pessimist.md) |

| **Normalo** | 5 | bevorzugt (×3) | 1 | nein | [`plan-agent-normalo`](../../agents/plan-agent-normalo.md) |



**Verboten:** Rollensimulation im Orchestrator-Turn. **Verboten:** Implementierungs- oder

Verifikations-Agenten fuer Planungs-Delegation.



### Agent-Definitionen (Mitarbeiterprofile)



Vollstaendige Profile (Persona, Modell, Pflichten, Verbote) liegen unter **`.cursor/agents/`**.

**Modellwahl** (Slugs, Ketten, Host-Regeln) ist **nur** in den Agent-Profilen — Abschnitt **`## Modell`**
primär, sonst YAML-Frontmatter — **nicht** in diesem Skill oder in Rules duplizieren.



| Agent-Typ | Datei |

|-----------|-------|

| `plan-agent` | [plan-agent.md](../../agents/plan-agent.md) |

| `plan-agent-scout` | [plan-agent-scout.md](../../agents/plan-agent-scout.md) |

| `plan-agent-topic-planner` | [plan-agent-topic-planner.md](../../agents/plan-agent-topic-planner.md) |

| `plan-agent-optimist` | [plan-agent-optimist.md](../../agents/plan-agent-optimist.md) |

| `plan-agent-pessimist` | [plan-agent-pessimist.md](../../agents/plan-agent-pessimist.md) |

| `plan-agent-normalo` | [plan-agent-normalo.md](../../agents/plan-agent-normalo.md) |

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

  → plan-agent: Merge + Phase 4a

  → plan-agent-topic-planner      (Phase 4b, pro Topic, parallel bevorzugt)

  → plan-agent: Phase 4c Merge

  → plan-agent-optimist | pessimist | normalo  (Phase 5, parallel bevorzugt)

  → plan-agent: Phase 6 Synthese + finales Planpaket

```



## Leitprinzipien



- Keine stillen fachlichen Annahmen; konkurrierende Optionen dem Nutzer nennen.

- Nur minimale Klaerungsfragen, solange Bedeutung oder Akzeptanzkriterien den

  Planinhalt aendern koennten. **Phase 1:** Bei offenen Punkten **zuerst** Nutzer fragen — **kein** Scout/Plan vor Klaerung.

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

- **Merge (Phase 4c, Hauptagent):** Teilplaene aus 4b zu **Arbeitsversion** fuer Phase 5

  zusammenfuehren; **harter Gate:** Schnittstellen-Drift pruefen, Widersprueche aufloesen oder

  als Nutzerfrage markieren. **Ohne** abgeschlossene 4b **kein** 4c.

- **Drei-Perspektiven-Review (Phase 5):** verpflichtend, ohne Nutzer-Opt-in.

  **Gate:** Erst starten, wenn Phase **4b abgeschlossen** und Phase **4c** (Merge zur **Arbeitsversion**)

  durch den Hauptagenten **fertig** ist. Input fuer Review: **ausschliesslich** diese Arbeitsversion —

  **nicht** Scout-Rohnotizen, **nicht** nur 4a-Schnittstellen, **nicht** „geplante Massnahmen (vorlaeufig)“.

  **`plan-agent-optimist`**, **`plan-agent-pessimist`** und **`plan-agent-normalo`** — je **ein** Lauf;

  Prompts aus `references/subagent-prompts.md`. **Verboten:** die drei

  Perspektiven nur durch **Rollensimulation** im Hauptagenten-Turn (Perspektivwechsel

  ohne Subagents). **Parallelitaet** der drei Review-Subagents ist **bevorzugt**,

  sofern die Umgebung es erlaubt; sonst **sequenziell** drei getrennte Task-

  Subagent-Laeufe in festgelegter Reihenfolge — **kein** Ersatz durch einen einzigen

  Agenten mit drei Rollenabschnitten.

- Parallele Subagenten **nur innerhalb derselben Stufe** (siehe **Phasen-Gates**); **keine**

  Cross-Phase-Parallelitaet. Danach **inhaltliche** Synthese, Konsistenzpruefung und das **finale Planpaket** zur

  Nutzer-Freigabe durch den **Hauptagenten** (Phase 6).

- **Finales Planpaket (Phase 6):** Nach Review-Digest, Synthese-Checkliste,

  Planaktualisierung und Block **Komplexitaets- und Executor-Empfehlung** formuliert der

  **Hauptagent** das vollstaendige finale Planpaket (kein separater Task-Subagent).

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



## Phase 1 - Anforderung pruefen (ohne Code-Kontext)



**Erlaubt:** Verstaendnis der Aufgabe, Zielbild, Randbedingungen,

Akzeptanzkriterien, minimale Klaerungsfragen bei Mehrdeutigkeit.



**Verboten:** Code-Recherche, Dateisuche, Repo-Navigation, Architekturannahmen

aus dem Kopf, Entwurf oder Finalisierung eines Umsetzungsplans.



Bei Bedarf: grobe Einschaetzung von Komplexitaet und Unsicherheit, rein aus dem

Gespraech, nicht aus Code.



## Phase 2 - Zwischenstand (vor Scouting)



Kurze Zusammenfassung dessen, was bisher vereinbart/gesichert ist (Ziel,

Randbedingungen, Akzeptanzkriterien, offene Punkte).



**Unmittelbar im selben Durchlauf** setzt der ausfuehrende Agent mit **Phase 3**

(Codebereichs-Scouting) fort — es ist **keine** Nutzerabfrage erforderlich, ob

Scouting gestartet werden soll.



## Phase 3 - Codebereichs-Scouting



**Direkt nach Phase 2** einen oder mehrere Laeufe mit Agent-Typ **`plan-agent-scout`**

(Read-only). Siehe Abschnitt **Subagent-Typen und Agent-Definitionen**.



**Code-Recherche (verbindlich) — MCP zuerst, Fallback (Read/Grep) nur wenn MCP nicht verfügbar:**
Bei Bezug auf Klassen, Methoden, Properties, Services, Routen oder „von Stelle A nach Stelle B" —
Basis-Landkarte (`index_project` + `find_in_index`) gemäß
[code-review-mcp — Code-Landkarte](../code-review-mcp/SKILL.md#code-landkarte--verbindliche-recherche-reihenfolge).
UI-Elemente ohne Symbol (Button-Label, Feld ohne Klassenname) sind davon ausgenommen.

**Erweiterte MCP-Analyse in Phase 3** (nach `find_in_index`, wenn konkrete Klassen/Methoden aufgelöst):
Scouts rufen zusätzlich (MCP primär, Fallback nur bei MCP-Fehler):

| Schritt | MCP-Call (primär) | Fallback | Bedingung |
|---------|-------------------|----------|-----------|
| A | `analyze_complexity` auf betroffene Dateien | Methoden-Länge via Grep | mind. 1 Klasse im Scope |
| B | `analyze_refactoring_safety` auf Klassen mit geplantem Umbau | Abhängigkeiten via `find_in_index` | nur bei Umbau |
| C | `suggest_class_splits` bei Klassen mit >1 Verantwortung | Manuelle Lektüre via Read | nur wenn relevant |

Scouts dokumentieren im Deliverable: MCP-Analyse-Status + Positionen 6–8 (Hotspots, Risiken, Split-Kandidaten).

**Orchestrator-Vorindizierung (empfohlen, bei Multi-Scout mit Symbolen):** Orchestrator
ruft **vor** Scout-Delegation einmal pro betroffenen Stack `index_project` auf und gibt
den verifizierten `projectPath` als festen Wert in den Scout-Auftrag. Pfade gemäß
`./AGENTS.md` (`{frontend-path}` / `{backend-path}`).
Schlägt `index_project` fehl: BLOCKER dokumentieren; Fallback-Playbook in
[code-review-mcp/SKILL.md — MCP-Pfadauflösung](../code-review-mcp/SKILL.md#mcp-pfadauflösung-dockerwindows--pflicht-playbook)
befolgen — **kein** stilles Überspringen.

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



### Phase 4a - Schnittstellen-Design (Hauptagent)



**Direkt nach** Scout-Zusammenfuehrung (Phase 3). Der **Hauptagent** (Modell = Nutzer-Chat)

formuliert **ohne** Topic-Planer-Subagents zuerst:



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

durch den Hauptagenten; **kein** 4c ohne 4b.



Topic-Planer liefern **nur** den Teilplan fuer **ein** Topic — **keinen** Gesamtplan, **kein** Review.



### Phase 4c - Merge zur Arbeitsversion (Hauptagent)



**Voraussetzung:** alle Topic-Planer aus 4b abgeschlossen.



Der **Hauptagent** fuehrt zusammen:



- Teilplaene zu **einer** **Arbeitsversion** fuer Phase 5 (startfaehig ohne weitere Recherche)

- **Harter Gate:** Schnittstellen aus 4a vs. Teilplaene — Drift, Luecken, Widersprueche;

  aufloesen oder als **Nutzerfrage** markieren

- Gesamtuebersicht: relevante Dateien, Einstiegspunkte, Schritte, Akzeptanzkriterien, Risiken,

  offene Fragen

- **Ausfuehrung Multi- vs. Single-Agent** und **Orchestrator-Sicht** (wie bisher in Phase 4):

  Multi-Subagent-Aufteilung **oder** Begruendung Single-Agent; bei Multi: Arbeitspakete,

  Parallelitaet, Blocking, gemeinsame Artefakte, Interface-first, Orchestrator-Integration,

  E2E-Pruefung

- **IMP-Slices aus Teilplaenen ableiten:** Pro Service- bzw. Feature-Bereich eigenes

  Kuerzel in der Slice-ID (`IMP-FE-{Bereich}-…`, `IMP-BE-{ServiceKuerzel}-…`); nicht

  mehrere Services unter einer undifferenzierten `IMP-BE`-ID buendeln. Wellen und Blocking

  fuer Phase 6 vorbereiten.

- **Arbeitshypothese spaetere Umsetzung (optional):** nur vorlaeufig; finale Executor-Empfehlung

  in **Phase 6**



**Ohne** 4b **kein** 4c. Bei **einem** Topic: ein Planer, Merge trotzdem in 4c.



## Phase 5 - Drei-Perspektiven-Review (verpflichtend)



**Pflichtphase.** Darf nicht uebersprungen werden. Die **Arbeitsversion aus Phase 4c** wird

immer durch **drei** getrennte Review-Rollen geprueft: **Optimist**, **Pessimist**,

**Normalo**. Ziel ist ein echtes Drei-Perspektiven-Review mit **drei Task-

Subagent-Laeufen** und klar getrennten Rolleninhalten (siehe Leitprinzipien:

**keine Rollensimulation** durch den Hauptagenten).



**Ausfuehrung:** Je Rolle **genau ein** Lauf mit **`plan-agent-optimist`**, **`plan-agent-pessimist`**

bzw. **`plan-agent-normalo`**; wenn die Plattform **parallel** erlaubt, alle drei parallel

starten. Prompts aus [references/subagent-prompts.md](references/subagent-prompts.md); Profile unter [../../agents/](../../agents/).



**Modell:** Ziel-Profil — [subagent-model-before-task.md](../../references/subagent-model-before-task.md).



**Fallback bei fehlender Parallelitaet:** ohne Nutzerabfrage **sequenziell** dieselben

drei **Task-Subagent**-Laeufe nacheinander (Reihenfolge optional z. B. Optimist →

Pessimist → Normalo oder wie im Team vereinbart — **konsequent dokumentieren**).

**Verboten:** **Rollensimulation** durch den Hauptagenten in drei Rollenabschnitten

als Ersatz fuer Subagents.



**Wenn Task-Subagents / Task-Tool fehlen:** im Plan-Output **transparent**

melden (z. B. „Drei-Perspektiven-Review mit Task-Subagents nicht ausfuehrbar“),

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



**Voraussetzung:** abgeschlossenes Drei-Perspektiven-Review aus Phase 5 (alle drei

Perspektiven vorhanden).



- **Review-Digest (Pflicht, zuerst, Nutzer-Chat):** Liegen alle drei

  Task-Subagent-Rueckgaben aus Phase 5 vor **und** wurde das Drei-Perspektiven-

  Review tatsaechlich mit Task-Subagents ausgefuehrt (nicht nur der

  Limitations-Hinweis bei fehlendem Task-Tool), **zuerst** im Chat einen

  **Review-Digest** ausgeben — **bevor** inhaltliche Synthese, Plan-Aenderungen

  oder die Synthese-Checkliste inhaltlich bearbeitet werden. Struktur: drei

  Abschnitte **Optimist**, **Pessimist**, **Normalo**. Pro **nummeriertem Punkt**

  der jeweiligen Subagent-Antwort hoechstens **1–2 Saetze** eigenstaendige

  Kernaussage (neutral: Befund; bei Pessimist/Normalo ggf. Risiko oder Luecke);

  nicht den Originalwortlaut bloss wiederholen. Punktnummern der Subagent-Antworten

  beibehalten oder klar referenzieren.

  - **Kurzantwort einer Rolle:** Liefert eine Rolle faktisch keine nummerierte

    Liste oder nur eine Gesamteinschaetzung, reicht **ein Satz** fuer diese Rolle.

  - **Kein volles Drei-Perspektiven-Review:** Wurde Phase 5 nur mit transparentem

    Limitations-Hinweis dokumentiert, **keinen** Review-Digest der drei Rollen

    erzwingen; Hinweis beibehalten wie in Phase 5 beschrieben.

- Review-Ergebnisse aus Optimist, Pessimist und Normalo zusammenfuehren; Risiken

  des Pessimisten nicht ignorieren.

- Widersprueche aufloesen oder als **Nutzerfrage** markieren.

- Plan entsprechend aktualisieren.

- **Inhaltliche Synthese (Hauptagent):** Die Checkliste in

  [references/subagent-prompts.md](references/subagent-prompts.md) (Abschnitt „Synthese-Checkliste“)

  abarbeiten: **Punkte 1–6**, dann **Punkt 7** (**Komplexitaets- und Executor-

  Empfehlung**), dann **Punkt 8** (finales Planpaket).

- **Komplexitaets- und Executor-Empfehlung (final).** Dieser Block wird gemaess

  **Punkt 7** der Synthese-Checkliste formuliert. Kurzer, eigenstaendiger Block:

  - **Komplexitaet (Umsetzung):** Low / Medium / High.

  - **Executor-Tier (illustrativ):** Ober- / Mittel- / Leicht-Klasse — keine

    Markennamen als Vorschreibung; konkrete Modell-IDs entscheidet die Umgebung.

  - **Topologie-Hinweis (verbindlich, Kurzfassung):** Single / sequenziell / parallel

    (Wellen) — **muss** mit dem Pflichtabschnitt **Umsetzungs-Topologie** uebereinstimmen;

    keine zweite, widerspruechliche Topologie. Operative Ausfuehrung (parallele

    Task-Starts) legt der [Implementation Workflow](../implementation-workflow/SKILL.md)

    in **Ausfuehrungsform vor Schritt 2** fest.

  - **Begruendung (2–4 Saetze):** stuetzt sich auf den durch Phase 5 geprueften

    Plan (insbesondere **Pessimist**-Risiken, Kopplung, Integrationsaufwand) und

    den Pflichtabschnitt **Umsetzungs-Topologie** (nicht nur Phase 4c).

  - **Disclaimer:** keine Aufwandsschaetzung, keine Risikoanalyse und keine

    Garantie fuer Verfuegbarkeit konkreter Modelle.

  - Bei **trivialem Plan** einzeilig: **Empfehlung nicht erforderlich**.

- **Finales Planpaket (Hauptagent):** Nach **Punkt 8** der Synthese-Checkliste bzw.

  nach den **Punkten 1–7** und Ausgabe des Blocks **Komplexitaets- und Executor-

  Empfehlung** das **vollstaendige finale Planpaket** zur **Freigabe** durch den Nutzer

  im Chat formulieren (kein „finaler Plan“ vor Ende dieser Phase).

- **Umsetzungs-Topologie (Implementation Workflow) — Pflichtabschnitt** im finalen

  Planpaket (wenn Implementierung vorgesehen; bei **trivialem Plan** Kurzform:

  z. B. `Topologie: 1× IMP-1, sequentiell, keine Blocking-Deps`). Mindestschema:

  - **Modus:** `single` | `sequential` | `parallel` (Wellen)

  - **Slices (1–10):** Tabelle mit Spalten `ID` | Scope (Pfade/Module) | Deliverable |

    parallel mit | blockiert durch. **IDs gemaess Slice-ID-Konvention (IMP-*)** oben

    (z. B. `IMP-FE-Search-Rules`, `IMP-BE-GW-Logging`). Maximal **10** Slices gesamt; bei

    paralleler Welle mit vielen Slices: Host-Batching in der Ausfuehrung dokumentieren,

    Slice-Liste im Plan unveraendert lassen

  - **Wellen:** z. B. W0 contract-first, W1 parallele Slices, W2 Integration

    (Orchestrator)

  - **Integration:** wer merged, Schnittstellencheck, E2E-Akzeptanz gegen Plan

  - **Verifikation:** betroffene Stacks (Frontend / Backend) — Verweis

    Implementation Workflow (Verifikation pro Stack)

  Der Orchestrator **operationalisiert** diese Topologie; er erfindet in der

  Umsetzung **keine** neuen Splits. **Single-Slice** nur mit **expliziter Begruendung**

  im Plan (wie Phase 4c).



## Abgrenzung ADO `Task … verfeinern` und buddy-agent

Copy-Befehl **`Task … in Story … verfeinern`** im [ado](../ado/SKILL.md)-Skill ist **kein** Ersatz fuer diesen Planning Workflow (**Legacy**):

- **Verfeinern (Legacy):** menschenlesbare Task-MD ([task-verfeinern.md](../ado/references/task-verfeinern.md)) — interaktiver 5-Phasen-Dialog im Orchestrator; **kein** finales Planpaket / keine Umsetzungs-Topologie in der Datei.
- **buddy-agent (Standard, Phase 2):** read-only Sparring — End-Artefakt **Plan-Prompt** ([buddy-agent.md](../../agents/buddy-agent.md)) mit Pflichtabschnitten Wo/Was/AC; **kein** finales Planpaket; **kein** IMP-Slice-Vorgehen im Prompt.
- **`plane Task …`:** dieser Planning Workflow — **bevorzugte Eingabe** ist der **Plan-Prompt aus Buddy** (ggf. plus `task-*.md`); finales Planpaket und **Umsetzungs-Topologie** zur Freigabe **im Chat**.

## Pflegehinweis



Aenderungen an diesem Skill oder an Trigger-Formulierungen: in Wirtsprojekten

die zentrale Agent-Dokumentation (Skill-Tabelle, Pflichtladehinweise) pruefen

und bei Bedarf anpassen. **Trigger:** Aenderungen an Ausloesermustern immer **doppelt**

pflegen: diese `description` (kompakt) und die **kanonische** Trigger-Liste in

**`.cursor/rules/planning-workflow-skill.mdc`** (Cursor Always-Apply-Regel).



**Modell / Agent-Profile:** Aenderungen an Modell-Slugs oder Agent-Verhalten **nur** in

[../../agents/plan-agent*.md](../../agents/) — danach diese Skill-Tabelle **Subagent-Typen** abgleichen.

**Prompt-Vorlagen:** Aenderungen an Subagent-Auftrags-Payloads **nur** in [references/subagent-prompts.md](references/subagent-prompts.md); danach Verweise in diesem Skill, in Agent-`.md` und Cross-Skills (z. B. describe-as-prompt) pruefen.

