# Operation: Describe-as-Text (Markdown Handoff Prompt)

Compresses the current conversation into a copy-paste handoff prompt (two-part: Section A complexity note, Section B fenced markdown prompt).

**Output-Stil:** Caveman Full — gilt für Section A und Section B.

## Vor der Antwort

1. Diese Datei vollständig lesen.
2. Inhalt **nur** aus aktuellem Thread ableiten — kein Repo-Scouting.
3. Alle konkreten Thread-Artefakte in Section B übernehmen: Pfade, Code-Refs, Skills, Beispiele, Ziele. Nichts kürzen das ein Identifier ist.
4. Lücken → **open questions** im Prompt, nicht erfinden.

## Modus-Entscheidung (Reihenfolge)

### 1) Wasserdicht-Modus (überschreibt alles)

Trigger: *wasserdicht*, *wasserdichtes Prompt*, *ohne Planning Workflow*, *ohne Workflow-Verweise*, *kein Planning-Skill*, *nur der Prompt*, *watertight prompt*, *self-contained only*, *no planning workflow*, *compact handoff only*.

- Kein `## Planning obligation`.
- Section A: eine Zeile `planning-overview model tier: not applicable — watertight prompt`.
- Section B: Journey, Code-Fundstellen, Beispiele, Referenzen vollständig — nur Planning-Meta weg.

### 2) Planning-relevant (Default wenn nicht Wasserdicht)

Wenn Thread Planung, Feature-Implementierung, Architektur oder Multi-Step enthält → `## Planning obligation` in Section B, prominent und zuerst.

### 3) Reine Information

Kein `## Planning obligation`.

## Antwort-Layout (Pflicht)

### Section A — Komplexitätshinweis

- Grobe Bewertung: **Low / Medium / High**.
- Planning-Modus: **Planning-overview Model-Tier** (wenn Planning in Scope, kein Wasserdicht):

  | Tier | Beispiele (illustrativ) |
  |------|------------------------|
  | Upper / reasoning-strong | Opus-class, GPT-5.5-class |
  | Middle / balanced | Composer-class, Sonnet-class |
  | Light / fast | GPT-5 mini-class, Haiku-class |

  Ein Satz: warum dieser Tier. Nicht applicabel → eine Zeile.
- 2–4 Sätze Begründung (nur Thread-Inhalt, kein Audit).
- Disclaimer: Komplexität ≠ Aufwandsschätzung, kein Risiko-Review.

### Section B — Handoff-Prompt

Einen einzigen fenced ` ```markdown ` Block. **Caveman Full** — terse Bullets, keine einleitenden Sätze, Identifier vollständig.

Pflicht-Abschnitte (leere weglassen oder `keine im Thread`):

1. `## Context` — Repo/Workspace nur wenn vom Nutzer angegeben.
2. `## Goal` — Ausgangslage · Ziel · Motivation (optional).
3. `## Code & Fundstellen` — Jede zitierte Code-Stelle aus Thread: `startLine:endLine:path` + eine Kontextzeile.
4. `## Beispiele aus der Unterhaltung` — Edge Cases, User Stories, Fehlermeldungen aus Thread.
5. `## Referenzen (Skills, Regeln, Docs)` — `.claude/skills/...`, `./AGENTS.md`-Einträge, URLs, Befehle.
6. `## Acceptance criteria` — Wenn im Thread besprochen.
7. `## Decisions / already clarified` — In Buddy-Sparring oder Thread **bereits geklärte** Entscheidungen, Richtungen, beantwortete Fragen. Plan-agent **darf diese nicht erneut hinterfragen**.
8. `## Edge cases / open questions` — **Nur noch offene** Entscheidungen explizit.
9. `## Current vs desired behavior` — Wenn Thread Ist/Soll kontrastiert.
10. `## Planning obligation` — **Nur wenn Planning-relevant (nicht Wasserdicht):** Nächsten Agent anweisen den Planning Workflow zu laden und Phase 1–6 strikt zu befolgen. Bei Buddy-Handoff: Verweis auf Abschnitt **Eingabe Buddy-Plan-Prompt** im Planning-Skill.

Sprache: Nutzersprache, außer Englisch explizit gewünscht.

## Qualität

- Prompt muss von neuem Agent ohne Prior-Chat ausführbar sein.
- Alle konkreten Pfade, Code-Refs, Skill-Mentions aus Thread → Section B. Nichts streichen das Identifier ist.
- Wasserdicht: dicht + eigenständig, kein Planning-Meta.
- Bullets statt große Blöcke; keinen Code erfinden der nicht im Thread war.
