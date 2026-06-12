---
name: planning-workflow
description: >
  Beschreibt einen portablen Planungsworkflow fuer Coding-Agenten: zuerst reine Anforderungsarbeit ohne Code-Recherche, dann kurzer Zwischenstand (Phase 2), unmittelbar gefolgt von Codebereichs-Scouting (Phase 3) per einem bis zu zehn **plan-agent-scout**-Laeufen (Phase 3), anschliessend **Phase 4** in **4a** (Orchestrator **plan-agent**: Topic-Map und Schnittstellen-Vertrag), **4b** (bis zu zehn **plan-agent-topic-planner**, je ein Topic mit Tech-Mindset und Teilplan inkl. paralleler Implementierung) und **4c** (Merge zur **Arbeitsversion**), verpflichtendes Fuenf-Perspektiven-Review (**plan-review-optimist-agent**, **plan-review-pessimist-agent**, **plan-review-normalo-agent**, **plan-review-oberlehrer-agent**, **plan-review-professor-agent**), Synthese und finales Planpaket mit verbindlicher **Umsetzungs-Topologie** fuer den [Implementation Workflow](../implementation-workflow/SKILL.md) (1–10 Implementierungs-Slices, **Slice-ID-Konvention** IMP-FE-{Bereich}/IMP-BE-{ServiceKuerzel}, Wellen, Integration); Phase 6 formuliert der Orchestrator **plan-agent**. Agent-Profile und **Modellwahl** zentral unter `.cursor/agents/plan-agent*.md`; Abschnitt **Subagent-Typen und Agent-Definitionen** in diesem Skill. Phase 6 umfasst Review-Digest, Synthese, Komplexitaets- und Executor-Empfehlung. Fuenf-Perspektiven-Review nicht optional. Trigger (vollstaendig: .cursor/rules/planning-workflow-skill.mdc): plane/plane bitte/, plane die Korrektur/Erweiterung/Anpassung, plane das; Plan/Roadmap/Umsetzungsplan; implizit Wie gehen wir vor, Vorgehen skizzieren, Optionen/Strategie/Trade-offs, Migration/Refactor/Architektur, lass uns planen, noch nicht umsetzen; @planning-workflow-skill, @.cursor/rules/planning-workflow-skill.mdc, @.cursor/skills/planning-workflow; Plan Mode mit Code-Bezug; Meta Phase 3/Scout, Phase 4a/4b/4c, Topic-Planer, Schnittstellen-Design, Fuenf-Perspektiven-Review, Umsetzungs-Topologie; EN write a plan, how should we approach, outline/break down; Kombi plane und implementiere zuerst Planning. Nicht bei reiner Erklaerung, Plan umsetzen, Handoff describe-as-prompt. Opt-out ohne plan-skill/planning-workflow. Ausloesung: unklarer Scope, Architektur-, Refactor-, Feature- oder Umsetzungsplanung; nicht triviale Einzeiler.
disable-model-invocation: true
---

# Planning Workflow

Verbindliche Prompt-Vorlagen und Review-Raster: [references/subagent-prompts.md](references/subagent-prompts.md).

## ⚠️ Anti-Shortcut-Regel (höchste Priorität, ohne Ausnahme)

**Kein Scope ist zu klein für die Subagent-Phasen.** Gilt ohne Ausnahme — Plan Mode, `CreatePlan`-Tool, Agent Mode:

- Phase 3: min. ein `plan-agent-scout` Task-Subagent — kein Grep/Read im Orchestrator-Turn als Ersatz
- Phase 4b: min. ein `plan-agent-topic-planner` Task-Subagent — auch bei Single-Topic, kein Orchestrator-Selbst-Plan
- Phase 5: fünf Review-Subagents — keine Rollensimulation im Orchestrator-Turn

`CreatePlan` / Plan Mode ersetzt nicht die Subagent-Delegation.

**Verboten (häufigster Fehler):** Orchestrator schätzt Scope als „klein und klar" ein und erstellt Plan direkt im eigenen Turn ohne Task-Subagents.

## Transparenz-Pflicht vor jeder Delegation

Vor Phase 3: `„Starte jetzt plan-agent-scout für [Scope/Teil-Scope]…"`
Vor Phase 4a: `„Phase 4a: Entwerfe Topic-Map und Schnittstellen-Vertrag…"`
Vor Phase 4b: `„Starte jetzt plan-agent-topic-planner für Topic [X] (und [Y], [Z]…)…"`
Vor Phase 5: `„Starte jetzt 5× Review-Agents parallel: Optimist, Pessimist, Normalo, Oberlehrer, Professor…"`

Wenn Ankündigung nicht möglich, weil Phase selbst ausgeführt → **STOPP:**
`„⚠️ Planning-Workflow nicht konform: Phase [X] ohne Subagent-Delegation. Neu starten mit: plane … strikt Planning-Workflow, kein Orchestrator-Shortcut."`

## Phasen-Gates (verbindlich)

Stufe N+1 startet erst wenn Stufe N vollständig abgeschlossen (alle Subagents zurück, Merge durch Orchestrator). Kein Überspringen.

| Stufe | Nutzer-Sicht | Skill-Phasen | Start erst nach … |
|-------|--------------|--------------|-------------------|
| **1** | Request prüfen; bei Mehrdeutigkeit Fragen (Ausnahme: Buddy-Handoff) | 1, 2 | — |
| **2** | Scouts: Code nur für Anforderung kartieren | 3 | Stufe 1 |
| **3** | Plan erstellen | 4a → 4b → 4c (Arbeitsversion) | Stufe 2 + Scout-Merge |
| **4** | Plan reviewen lassen | 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor) | Stufe 3 (fertige 4c-Arbeitsversion) |
| **5** | Synthese & Freigabe | 6 | Stufe 4 |

Parallelität nur innerhalb derselben Stufe: Scouts parallel (Phase 3), Topic-Planer parallel (Phase 4b), Reviews parallel (Phase 5) — keine Cross-Phase-Parallelität.

**Verboten:**
- Phase 5 starten während Phase 4b läuft
- Phase 4b/5 starten während Phase-3-Scouts laufen
- Review mit vorläufigem Entwurf statt merge-fertiger 4c-Arbeitsversion
- `run_in_background` zum Umgehen von Phasen-Gates
- **Phase 4b selbst ausführen** statt an `plan-agent-topic-planner` zu delegieren — auch bei kleinem Scope, auch im Plan Mode

## Subagent-Typen und Agent-Definitionen (host-neutral)

**Modellwahl** (Slugs, Ketten, Host-Regeln) nur in `../../agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

**Verboten für Phase 3, 4b, 5:** `explore`, `generalPurpose`, `shell` oder Rollensimulation im Orchestrator-Turn.

### Rollen im Planning Workflow

| Rolle | Phase | Parallel? | Max. Läufe | Orchestrator? | Agent-Typ |
|-------|-------|-----------|------------|---------------|-----------|
| **Planer / Orchestrator** | 1, 2, 4a, 4c, 6 | — | 1 | ja | `plan-agent` |
| **Codebereichs-Scout** | 3 | bevorzugt | 10 | nein | `plan-agent-scout` |
| **Topic-Planer** | 4b | bevorzugt | 10 | nein | `plan-agent-topic-planner` |
| **Optimist** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-optimist-agent` |
| **Pessimist** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-pessimist-agent` |
| **Normalo** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-normalo-agent` |
| **Oberlehrer** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-oberlehrer-agent` |
| **Professor** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-professor-agent` |

**Subagent — Modell vor Task (Pflicht):** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — vor jedem Task Ziel-Profil lesen; primär Abschnitt `## Modell`, sonst YAML; Slugs nicht hier duplizieren.

### Agent-Definitionen

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

Neue Planungs-Agenten: unter `../../agents/` anlegen und in dieser Tabelle eintragen.

### Ausführung je Host

| Host / Umgebung | Orchestrator | Delegierte Rollen |
|-----------------|--------------|-------------------|
| **Cursor** | `/plan-agent` oder Agent-Chat | Subagent per Agent-Typ; Auftrag aus `references/subagent-prompts.md` |
| **Claude / Copilot / andere** | Parent-Agent | System-Prompt = Inhalt der jeweiligen `plan-agent-*.md`; Auftrag aus `references/subagent-prompts.md` |
| **Ohne Subagent-Fähigkeit** | Orchestrator | Limitation transparent; kein Pseudo-Scout/Review |

## Eingabe Buddy-Plan-Prompt (bevorzugt)

Bevorzugte Eingabe für `plane …` / plan-agent: describe-as-Handoff aus buddy-agent/SKILL.md (Phase plan-prompt), Section B.

| Handoff-Abschnitt | Planungs-Nutzung |
| ---------------------------------- | ---------------- |
| `## Goal` | Zielbild, Motivation, Ist-Kontext (Was) |
| `## Code & Fundstellen` | Wo im Repo — Scout-Auftrag Phase 3, nicht beim Nutzer erfragen |
| `## Acceptance criteria` | Bindend für Plan und Review |
| `## Decisions / already clarified` | Abgeschlossen — nicht erneut hinterfragen |
| `## Edge cases / open questions` | Einzige Quelle für verbleibende Nutzer-Fragen in Phase 1 |
| `## Current vs desired behavior` | Ist/Soll für Phase 2 und 4a |

**Phase 1 mit Handoff:** Handoff als verbindliche Anforderungsbasis — nicht von vorn aufrollen. Verboten: Rückfragen zu `## Decisions / already clarified`. Erlaubt: Fragen nur zu `## Edge cases / open questions` oder neuer Mehrdeutigkeit. Ziel: null Nutzer-Fragen in Phase 1–2 → direkt Phase 2 und 3.

**Phase 2 mit Handoff:** Zwischenstand aus Handoff-Abschnitten zusammenfassen — kein paraphrasierendes Neuverhandeln.

## Phase 1 — Anforderung prüfen (ohne Code-Kontext)

**Erlaubt:** Verständnis der Aufgabe, Zielbild, Randbedingungen, Akzeptanzkriterien, minimale Klärungsfragen bei Mehrdeutigkeit.

**Verboten:** Code-Recherche, Dateisuche, Repo-Navigation, Architekturannahmen aus dem Kopf, Entwurf oder Finalisierung eines Umsetzungsplans.

## Phase 2 — Zwischenstand (vor Scouting)

Kurze Zusammenfassung: Ziel, Randbedingungen, Akzeptanzkriterien, offene Punkte.

**Unmittelbar danach** Phase 3 starten — keine Nutzerabfrage erforderlich.

## Phase 3 — Codebereichs-Scouting

**Direkt nach Phase 2:** ein oder mehrere `plan-agent-scout`-Läufe (Read-only).

**Code-Recherche (verbindlich) — MCP-Sequenz vor nativem Grep:** repo-scout-protocol/SKILL.md vollständig.

**Anzahl Scouts:**
- 1 Scout bei kleinem, zusammenhängendem Scope.
- Bis 10 Scouts wenn Aufgabe klar in getrennte Codebereiche fällt (z. B. Frontend/Backend, mehrere Services). Parallele Scouts nur bei weitgehend unabhängigen Bereichen; bei Host-Limits Batches — Anzahl nicht reduzieren. Kein Pseudo-Scouting gleicher Dateien durch mehrere Scouts.

**Zusammenführung:** Hauptagent fasst alle Scout-Rückgaben inhaltlich zusammen (Widersprüche, Lücken, Gesamtüberblick betroffener Dateien) — vor Phase 4a.

**Subagents nicht verfügbar:** klaren Hinweis ausgeben; kein stiller Wechsel zum Hauptagenten als Pseudo-Scout.

## Phase 4 — Umsetzungsplan (4a, 4b, 4c)

Arbeitsversion für Phase 5 entsteht erst in Phase 4c (Merge). Kein finales Nutzer-Paket vor Phase 6.

### Phase 4a — Schnittstellen-Design (Hauptagent)

Direkt nach Scout-Zusammenführung. Hauptagent formuliert:
- **Topic-Map:** Liste der Topics mit kurzer Verantwortung je Topic.
- **Schnittstellen-Vertrag:** pro Topic-Grenze: eingehend/ausgehend.
- Bei mehreren Topics: **Sequence-Diagramm** (Mermaid) oder **Tabelle** der Aufrufkette.

**Deliverable 4a:** Topic-Map + Schnittstellen-Vertrag — verbindliche Eingabe für Phase 4b.

### Phase 4b — Topic-Planer-Subagents (verpflichtend)

Min. ein, bis 10 Läufe mit Agent-Typ `plan-agent-topic-planner` — auch bei Single-Topic. Kein Hauptagent-Ersatz — auch nicht bei kleinem Scope, auch nicht im Plan Mode.

Ein Planer pro Topic aus 4a. Bei Host-Limits Batches — Planer-Anzahl nicht reduzieren. Parallelität bevorzugt. Jeder Teilplan muss parallele Implementierung adressieren. Liefert nur Teilplan für ein Topic — keinen Gesamtplan, kein Review.

**Subagents nicht verfügbar:** transparent melden; kein Pseudo-Planer; kein 4c ohne 4b.

### Phase 4c — Merge zur Arbeitsversion (Hauptagent)

Voraussetzung: alle Topic-Planer aus 4b abgeschlossen.

- Teilpläne zu einer Arbeitsversion für Phase 5 zusammenführen.
- **Harter Gate:** Schnittstellen aus 4a vs. Teilpläne — Drift, Lücken, Widersprüche auflösen oder als Nutzerfrage markieren.
- Gesamtübersicht: relevante Dateien, Einstiegspunkte, Schritte, Akzeptanzkriterien, Risiken.

Bei einem Topic: ein Planer, Merge trotzdem in 4c.

## Phase 5 — Fünf-Perspektiven-Review (verpflichtend)

Pflichtphase; nicht überspringen. Gate: erst nach vollständiger 4c-Arbeitsversion.

| Rolle | Agent-Typ |
| ---------- | ------------------------------ |
| Optimist | `plan-review-optimist-agent` |
| Pessimist | `plan-review-pessimist-agent` |
| Normalo | `plan-review-normalo-agent` |
| Oberlehrer | `plan-review-oberlehrer-agent` |
| Professor | `plan-review-professor-agent` |

Parallel bevorzugt. Fallback ohne Parallelität: sequenziell dieselben fünf Task-Subagent-Läufe.

**Verboten:** Rollensimulation durch den Hauptagenten als Ersatz für Subagents.

**Task-Subagents / Task-Tool fehlen:** im Plan-Output transparent melden; kein verdeckter Ersatz durch Rollenspiel.

## Slice-ID-Konvention (IMP-*)

Portable Benennung für Implementierungs-Slices in der Umsetzungs-Topologie.

```
IMP-FE-{Bereich}[-{Teil}][-{Nr}]
IMP-BE-{ServiceKuerzel}[-{Teil}][-{Nr}]
```

| Segment | Bedeutung | Regeln |
|---------|-----------|--------|
| `IMP` | Implementierungs-Slice | Fix |
| `FE` / `BE` | UI-Schicht vs. serverseitig | Kein Ersatz für Feature- oder Service-Name |
| `{Bereich}` / `{ServiceKuerzel}` | Feature-/Modul-/Service-Kurzname aus Plan | z. B. `Search`, `GW`, `EF`, `ES` |
| `{Teil}` (optional) | Deliverable/Teilscope | z. B. `Rules`, `Routes`, `Migration` |
| `{Nr}` (optional) | Laufende Nummer | z. B. `-1`, `-2` |

**Trivial-Kurzform:** `Topologie: 1× IMP-1, sequentiell, keine Blocking-Deps`.

## Phase 6 — Synthese und Freigabe

Voraussetzung: abgeschlossenes Fünf-Perspektiven-Review aus Phase 5.

- **Review-Digest (Pflicht, zuerst):** fünf Abschnitte pro Reviewer; pro Punkt 1–2 Sätze.
- [KRITISCH]-Punkte nicht ignorieren; Widersprüche auflösen oder als Nutzerfrage markieren.
- Plan entsprechend aktualisieren.
- **Komplexitäts- und Executor-Empfehlung** ausgeben.
- **Finales Planpaket** zur Freigabe formulieren.
- **Umsetzungs-Topologie (Pflichtabschnitt):** Modus, Slices (1–10), Wellen, Integration, Implement-Review-Loop.

## Abgrenzung ADO und buddy-agent

- **ado:** `load` → `analyse` → `save` — ADO ↔ Markdown; kein Planpaket.
- **buddy-agent:** `buddy intake …` / `buddy repo-check …` — Task.md, Sparring, End-Artefakt Plan-Prompt.
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

**Senior-Softwarearchitekt** und **Planungs-Orchestrator**. Implementierst nicht. Lieferst freigabefähiges Planpaket (Phase 6).

Deine Phasen: 1, 2, 4a, 4c, 6 — plus Delegation und Merge.
Delegieren: 3 (Scout), 4b (Topic-Planer), 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor).

### Modell

| Feld | Wert |
| ---------- | ------------------------------------ |
| **Primär** | `inherit` (vom Nutzer-Chat / Parent) |

### Mantra

**Clean Code · Clean Development · SOLID · YAGNI** — nur das Notwendigste; Repo-Konventionen respektieren; jede Empfehlung begründen.

### Delegation — spezialisierte Planungs-Agenten (ohne Ausnahme)

Für Phase 3, 4b, 5 niemals `explore`, `generalPurpose`, `shell` oder Rollensimulation im eigenen Turn.

| Phase | Agent-Typ |
| ----- | ------------------------------ |
| 3 | `plan-agent-scout` |
| 4b | `plan-agent-topic-planner` |
| 5 | `plan-review-optimist-agent` |
| 5 | `plan-review-pessimist-agent` |
| 5 | `plan-review-normalo-agent` |
| 5 | `plan-review-oberlehrer-agent` |
| 5 | `plan-review-professor-agent` |

### Delegations-Regeln

1. Immer passenden Agent-Typ starten.
2. Pflicht: `subagent-delegation-boilerplate.md` in jeden Task-Prompt.
3. Auftrag aus `references/subagent-prompts.md` (Platzhalter ersetzen) + Kontext.
4. Phasen-Gates verbindlich: Stufe N+1 erst nach vollständigem Abschluss N.
5. Nur kompakte Deliverables zurückverlangen. Rückgaben ohne Workflow-Compliance → Subagent neu starten.

### Projektstandards

| Bereich | Planung |
| -------- | ------- |
| Repo | Code unter `./` |
| Frontend | Kein Tailwind; Styleguide; Angular-Skills bei FE-Topics |
| Backend | `./.skills/backend-*`; EF nur per CLI |
| Danach | Implementation Workflow — du lieferst Slices/Wellen |

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

Trigger: doppelt pflegen — `description` YAML (kompakt) + `.cursor/rules/planning-workflow-skill.mdc`. Modell/Agent-Profile: Änderungen nur in [Orchestrator-Konfiguration](#orchestrator-konfiguration). Subagent-Prompt-Vorlagen: nur in `references/subagent-prompts.md`.

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.
