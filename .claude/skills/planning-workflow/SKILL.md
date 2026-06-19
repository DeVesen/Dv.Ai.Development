---
name: planning-workflow
description: >
  Beschreibt einen portablen Planungsworkflow fuer Coding-Agenten: zuerst reine Anforderungsarbeit
  ohne Code-Recherche, dann kurzer Zwischenstand (Phase 2), unmittelbar gefolgt von
  Codebereichs-Scouting (Phase 3) per einem bis zu zehn plan-agent-scout-Laeufen, anschliessend
  Phase 4 in 4a (Orchestrator plan-agent: Topic-Map und Schnittstellen-Vertrag), 4b (bis zu zehn
  plan-agent-topic-planner) und 4c (Merge zur Arbeitsversion), verpflichtendes Fuenf-Perspektiven-Review,
  Synthese und finales Planpaket mit verbindlicher Umsetzungs-Topologie fuer den Implementation Workflow
  (1-10 Implementierungs-Slices, Slice-ID-Konvention IMP-FE-{Bereich}/IMP-BE-{ServiceKuerzel},
  Wellen, Integration). Ausloesung: Planungsintent, Architektur-, Refactor-, Feature- oder
  Umsetzungsplanung; nicht triviale Einzeiler. Opt-out: ohne plan-skill / ohne planning-workflow.
when_to_use: >
  Wenn der Nutzer planen will: mehrstufige Planung, Architekturentscheidungen, Vorgehen skizzieren,
  Optionen vergleichen, Umsetzungsplan erstellen, Migration / Refactoring / Feature-Planung.
  Nicht bei reiner Erklarung, plan-losen Implementierungen oder Plan-Handoffs (describe-as-prompt).
---

# Planning Workflow

Verbindliche Prompt-Vorlagen und Review-Raster: [references/subagent-prompts.md](references/subagent-prompts.md).

---

## Pflicht: Planning-Workflow-Skill laden

Wenn der Nutzer planen will — mehrstufig, Architektur, Vorgehen, Umsetzungsplan, Review von Optionen —
dann **vor** Plan-Erstellung oder Plan-Optionen diesen Skill vollstaendig lesen und befolgen.

**Verbindliche Aktivierung** (vorbehaltlich Opt-out unten): `plane`, `plane bitte`, `plane die Korrektur/Erweiterung/Anpassung`, `plane das`, `erstelle einen Plan`, `Umsetzungsplan`, `Roadmap`, `Strategie`, `Vorgehen skizzieren`, `Optionen vergleichen`, `Migration`, `Refactor`-Planung — und vergleichbare Planungsintents.

**Opt-out:** `ohne plan-skill` / `ohne planning-workflow` / `skip planning` → Skill nicht anwenden.

**Nicht auslosen:** Reine Erklarung, vorhandener Plan ohne Neuerstellung, schreibende Umsetzung, Handoff ohne Planungsauftrag.

---

## ⚠️ Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Scope ist zu klein fuer die Subagent-Phasen.** Gilt ohne Ausnahme — Plan Mode, Agent Mode:

- Phase 3: min. ein `plan-agent-scout` Task-Subagent — kein Grep/Read im Orchestrator-Turn als Ersatz
- Phase 4b: min. ein `plan-agent-topic-planner` Task-Subagent — auch bei Single-Topic, kein Orchestrator-Selbst-Plan
- Phase 5: fuenf Review-Subagents — keine Rollensimulation im Orchestrator-Turn

**Verboten (haeufigster Fehler):** Orchestrator schaetzt Scope als "klein und klar" ein und erstellt Plan direkt im eigenen Turn ohne Task-Subagents.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Transparenz-Pflicht vor jeder Delegation

Vor Phase 3: `"Starte jetzt plan-agent-scout fuer [Scope/Teil-Scope]…"`
Vor Phase 4a: `"Phase 4a: Entwerfe Topic-Map und Schnittstellen-Vertrag…"`
Vor Phase 4b: `"Starte jetzt plan-agent-topic-planner fuer Topic [X] (und [Y], [Z]…)…"`
Vor Phase 5: `"Starte jetzt 5x Review-Agents parallel: Optimist, Pessimist, Normalo, Oberlehrer, Professor…"`

Wenn Ankuendigung nicht moeglich, weil Phase selbst ausgefuehrt wird → **STOPP:**
`"⚠️ Planning-Workflow nicht konform: Phase [X] ohne Subagent-Delegation. Neu starten mit: plane … strikt Planning-Workflow, kein Orchestrator-Shortcut."`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Phasen-Gates (verbindlich)

Stufe N+1 startet erst wenn Stufe N vollstaendig abgeschlossen (alle Subagents zurueck, Merge durch Orchestrator). Kein Ueberspringen.

| Stufe | Nutzer-Sicht | Skill-Phasen | Start erst nach … |
|-------|--------------|--------------|-------------------|
| **1** | Request pruefen; bei Mehrdeutigkeit Fragen (Ausnahme: Buddy-Handoff) | 1, 2 | — |
| **2** | Scouts: Code nur fuer Anforderung kartieren | 3 | Stufe 1 |
| **3** | Plan erstellen | 4a → 4b → 4c (Arbeitsversion) | Stufe 2 + Scout-Merge |
| **4** | Plan reviewen lassen | 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor) | Stufe 3 (fertige 4c-Arbeitsversion) |
| **5** | Synthese & Freigabe | 6 | Stufe 4 |

Parallelitaet nur innerhalb derselben Stufe: Scouts parallel (Phase 3), Topic-Planer parallel (Phase 4b), Reviews parallel (Phase 5) — keine Cross-Phase-Parallelitaet.

**Verboten:**
- Phase 5 starten waehrend Phase 4b laeuft
- Phase 4b/5 starten waehrend Phase-3-Scouts laufen
- Review mit vorlaeufigem Entwurf statt merge-fertiger 4c-Arbeitsversion
- `run_in_background` zum Umgehen von Phasen-Gates
- **Phase 4b selbst ausfuehren** statt an `plan-agent-topic-planner` zu delegieren — auch bei kleinem Scope

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Subagent-Typen und Agent-Definitionen (host-neutral)

**Modellwahl** (Slugs, Ketten, Host-Regeln) nur in `agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

**Verboten fuer Phase 3, 4b, 5:** `explore`, `generalPurpose`, `shell` oder Rollensimulation im Orchestrator-Turn.

### Rollen im Planning Workflow

| Rolle | Phase | Parallel? | Max. Laeufe | Orchestrator? | Agent-Typ |
|-------|-------|-----------|------------|---------------|-----------|
| **Planer / Orchestrator** | 1, 2, 4a, 4c, 6 | — | 1 | ja | `plan-agent` |
| **Codebereichs-Scout** | 3 | bevorzugt | 10 | nein | `plan-agent-scout` |
| **Topic-Planer** | 4b | bevorzugt | 10 | nein | `plan-agent-topic-planner` |
| **Optimist** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-optimist-agent` |
| **Pessimist** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-pessimist-agent` |
| **Normalo** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-normalo-agent` |
| **Oberlehrer** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-oberlehrer-agent` |
| **Professor** | 5 | bevorzugt (×5) | 1 | nein | `plan-review-professor-agent` |

**Subagent — Modell vor Task (Pflicht):** Profil unter `agents/` — vor jedem Task Ziel-Profil lesen; primaer Abschnitt `## Modell`; Slugs nicht hier duplizieren.

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

Neue Planungs-Agenten: unter `agents/` anlegen und in dieser Tabelle eintragen.

### Ausfuehrung je Host

| Host / Umgebung | Orchestrator | Delegierte Rollen |
|-----------------|--------------|-------------------|
| **Claude Code** | Parent-Agent | System-Prompt = Inhalt der jeweiligen `plan-agent-*.md`; Auftrag aus `references/subagent-prompts.md` |
| **Ohne Subagent-Faehigkeit** | Orchestrator | Limitation transparent; kein Pseudo-Scout/Review |

---

## Eingabe Buddy-Plan-Prompt (bevorzugt)

Bevorzugte Eingabe fuer `plane …` / plan-agent: describe-as-Handoff aus buddy-agent/SKILL.md (Phase plan-prompt), Section B.

| Handoff-Abschnitt | Planungs-Nutzung |
| ---------------------------------- | ---------------- |
| `## Goal` | Zielbild, Motivation, Ist-Kontext (Was) |
| `## Code & Fundstellen` | Wo im Repo — Scout-Auftrag Phase 3, nicht beim Nutzer erfragen |
| `## Acceptance criteria` | Bindend fuer Plan und Review |
| `## Decisions / already clarified` | Abgeschlossen — nicht erneut hinterfragen |
| `## Edge cases / open questions` | Einzige Quelle fuer verbleibende Nutzer-Fragen in Phase 1 |
| `## Current vs desired behavior` | Ist/Soll fuer Phase 2 und 4a |

**Phase 1 mit Handoff:** Handoff als verbindliche Anforderungsbasis — nicht von vorn aufrollen. Verboten: Rueckfragen zu `## Decisions / already clarified`. Erlaubt: Fragen nur zu `## Edge cases / open questions` oder neuer Mehrdeutigkeit. Ziel: null Nutzer-Fragen in Phase 1–2 → direkt Phase 2 und 3.

**Phase 2 mit Handoff:** Zwischenstand aus Handoff-Abschnitten zusammenfassen — kein paraphrasierendes Neuverhandeln.

---

## Phase 1 — Anforderung pruefen (ohne Code-Kontext)

**Erlaubt:** Verstaendnis der Aufgabe, Zielbild, Randbedingungen, Akzeptanzkriterien, minimale Klaerungsfragen bei Mehrdeutigkeit.

**Verboten:** Code-Recherche, Dateisuche, Repo-Navigation, Architekturannahmen aus dem Kopf, Entwurf oder Finalisierung eines Umsetzungsplans.

## Phase 2 — Zwischenstand (vor Scouting)

Kurze Zusammenfassung: Ziel, Randbedingungen, Akzeptanzkriterien, offene Punkte.

**Unmittelbar danach** Phase 3 starten — keine Nutzerabfrage erforderlich.

## Phase 3 — Codebereichs-Scouting

**Direkt nach Phase 2:** ein oder mehrere `plan-agent-scout`-Laeufe (Read-only).

**Code-Recherche (verbindlich) — MCP-Sequenz vor nativem Grep:** repo-scout-protocol/SKILL.md vollstaendig einhalten.

**Anzahl Scouts:**
- 1 Scout bei kleinem, zusammenhaengendem Scope.
- Bis 10 Scouts wenn Aufgabe klar in getrennte Codebereiche faellt (z. B. Frontend/Backend, mehrere Services). Parallele Scouts nur bei weitgehend unabhaengigen Bereichen; bei Host-Limits Batches — Anzahl nicht reduzieren. Kein Pseudo-Scouting gleicher Dateien durch mehrere Scouts.

**Zusammenfuehrung:** Hauptagent fasst alle Scout-Rueckgaben inhaltlich zusammen (Widersprueche, Luecken, Gesamtueberblick betroffener Dateien) — vor Phase 4a.

**Subagents nicht verfuegbar:** klaren Hinweis ausgeben; kein stiller Wechsel zum Hauptagenten als Pseudo-Scout.

## Phase 4 — Umsetzungsplan (4a, 4b, 4c)

Arbeitsversion fuer Phase 5 entsteht erst in Phase 4c (Merge). Kein finales Nutzer-Paket vor Phase 6.

### Phase 4a — Schnittstellen-Design (Hauptagent)

Direkt nach Scout-Zusammenfuehrung. Hauptagent formuliert:
- **Topic-Map:** Liste der Topics mit kurzer Verantwortung je Topic.
- **Schnittstellen-Vertrag:** pro Topic-Grenze: eingehend/ausgehend.
- Bei mehreren Topics: **Sequence-Diagramm** (Mermaid) oder **Tabelle** der Aufrufkette.

**Deliverable 4a:** Topic-Map + Schnittstellen-Vertrag — verbindliche Eingabe fuer Phase 4b.

### Phase 4b — Topic-Planer-Subagents (verpflichtend)

Min. ein, bis 10 Laeufe mit Agent-Typ `plan-agent-topic-planner` — auch bei Single-Topic. Kein Hauptagent-Ersatz — auch nicht bei kleinem Scope.

Ein Planer pro Topic aus 4a. Bei Host-Limits Batches — Planer-Anzahl nicht reduzieren. Parallelitaet bevorzugt. Jeder Teilplan muss parallele Implementierung adressieren. Liefert nur Teilplan fuer ein Topic — keinen Gesamtplan, kein Review.

**Subagents nicht verfuegbar:** transparent melden; kein Pseudo-Planer; kein 4c ohne 4b.

### Phase 4c — Merge zur Arbeitsversion (Hauptagent)

Voraussetzung: alle Topic-Planer aus 4b abgeschlossen.

- Teilplaene zu einer Arbeitsversion fuer Phase 5 zusammenfuehren.
- **Harter Gate:** Schnittstellen aus 4a vs. Teilplaene — Drift, Luecken, Widersprueche aufloesen oder als Nutzerfrage markieren.
- Gesamtuebersicht: relevante Dateien, Einstiegspunkte, Schritte, Akzeptanzkriterien, Risiken.

Bei einem Topic: ein Planer, Merge trotzdem in 4c.

## Phase 5 — Fuenf-Perspektiven-Review (verpflichtend)

Pflichtphase; nicht ueberspringen. Gate: erst nach vollstaendiger 4c-Arbeitsversion.

| Rolle | Agent-Typ |
| ---------- | ------------------------------ |
| Optimist | `plan-review-optimist-agent` |
| Pessimist | `plan-review-pessimist-agent` |
| Normalo | `plan-review-normalo-agent` |
| Oberlehrer | `plan-review-oberlehrer-agent` |
| Professor | `plan-review-professor-agent` |

Parallel bevorzugt. Fallback ohne Parallelitaet: sequenziell dieselben fuenf Task-Subagent-Laeufe.

**Verboten:** Rollensimulation durch den Hauptagenten als Ersatz fuer Subagents.

**Task-Subagents / Task-Tool fehlen:** im Plan-Output transparent melden; kein verdeckter Ersatz durch Rollenspiel.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Slice-ID-Konvention (IMP-*)

Portable Benennung fuer Implementierungs-Slices in der Umsetzungs-Topologie.

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

## Phase 6 — Synthese und Freigabe

Voraussetzung: abgeschlossenes Fuenf-Perspektiven-Review aus Phase 5.

- **Review-Digest (Pflicht, zuerst):** fuenf Abschnitte pro Reviewer; pro Punkt 1–2 Saetze.
- [KRITISCH]-Punkte nicht ignorieren; Widersprueche aufloesen oder als Nutzerfrage markieren.
- Plan entsprechend aktualisieren.
- **Komplexitaets- und Executor-Empfehlung** ausgeben.
- **Finales Planpaket** zur Freigabe formulieren.
- **Umsetzungs-Topologie (Pflichtabschnitt):** Modus, Slices (1–10), Wellen, Integration, Implement-Review-Loop.

---

## Abgrenzung ADO und buddy-agent

- **ado:** `load` → `analyse` → `save` — ADO ↔ Markdown; kein Planpaket.
- **buddy-agent:** `buddy intake …` / `buddy repo-check …` — Task.md, Sparring, End-Artefakt Plan-Prompt.
- **`plane Task …`:** dieser Planning Workflow — bevorzugte Eingabe: Plan-Prompt aus Buddy (Section B).

---

## Orchestrator-Konfiguration

Konfiguration des **plan-agent** — Senior-Architekt und Planungs-Orchestrator (Phasen 1, 2, 4a, 4c, 6).

### Pflicht: Planning-Workflow-Skill laden (erster Schritt, ohne Ausnahme)

> **Bevor du irgendeine Phase startest oder eine Antwort formulierst — lade in dieser Reihenfolge:**
>
> 1. **planning-workflow/SKILL.md** — vollstaendig; definiert Phasen, Gates, Deliverables, Subagent-Prompts verbindlich.
> 2. **caveman/SKILL.md** — Modus `lite`; gilt fuer alle Chat-Ausgaben dieses Agents.
> 3. **codebase-analyzer/SKILL.md** — MCP-First fuer alle Analysen.
> 4. **angular-skills** — wenn FE-Topics im Scope.
> 5. **backend-ef-migrations-skill** — wenn EF/Migrations im Scope.
>
> Kein Ueberspringen, kein Zusammenfassen aus dem Gedaechtnis. Erst danach: Phase 1 starten.

### Rolle

**Senior-Softwarearchitekt** und **Planungs-Orchestrator**. Implementierst nicht. Lieferst freigabefaehiges Planpaket (Phase 6).

Deine Phasen: 1, 2, 4a, 4c, 6 — plus Delegation und Merge.
Delegieren: 3 (Scout), 4b (Topic-Planer), 5 (Optimist, Pessimist, Normalo, Oberlehrer, Professor).

### Modell

| Feld | Wert |
| ---------- | ------------------------------------ |
| **Primaer** | `inherit` (vom Nutzer-Chat / Parent) |

### Mantra

**Clean Code · Clean Development · SOLID · YAGNI** — nur das Notwendigste; Repo-Konventionen respektieren; jede Empfehlung begruenden.

### Delegation — spezialisierte Planungs-Agenten (ohne Ausnahme)

Fuer Phase 3, 4b, 5 niemals `explore`, `generalPurpose`, `shell` oder Rollensimulation im eigenen Turn.

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
4. Phasen-Gates verbindlich: Stufe N+1 erst nach vollstaendigem Abschluss N.
5. Nur kompakte Deliverables zurueckverlangen. Rueckgaben ohne Workflow-Compliance → Subagent neu starten.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

### Projektstandards

| Bereich | Planung |
| -------- | ------- |
| Repo | Code unter `./` |
| Frontend | Kein Tailwind; Styleguide; Angular-Skills bei FE-Topics |
| Backend | EF nur per CLI |
| Danach | Implementation Workflow — du lieferst Slices/Wellen |

### Verboten

- Code implementieren oder Dateien aendern
- Scout/Topic-Planer/Review selbst simulieren
- Implementierungs- oder Verifikations-Agenten fuer Planung
- Stille fachliche Annahmen
- **Phase 4b selbst ausfuehren** statt `plan-agent-topic-planner` zu starten — auch bei kleinem Scope

### Ausgabeformat

**Deutsch**, klar strukturiert. Mermaid fuer grenzueberschreitende Flows. Fokussiert — umsetzbarer Plan, keine Essay-Laenge.

---

## Pflegehinweis

Trigger: `description` YAML (kompakt) + `when_to_use` aktuell halten. Modell/Agent-Profile: Aenderungen nur in [Orchestrator-Konfiguration](#orchestrator-konfiguration). Subagent-Prompt-Vorlagen: nur in `references/subagent-prompts.md`.

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.
