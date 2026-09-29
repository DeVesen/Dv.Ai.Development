---
id: FEAT-001
type: feature
status: ready
slug: worktree-per-feature-workflow
children: [STORY-001, STORY-002, STORY-003, STORY-004, STORY-005, STORY-006, STORY-007]
---

# Worktree-per-Feature Workflow

Formalisiert die zwei Ideen aus `Requests/ideas-note.md` (*„automatischer Feature-Branch"* +
*„Research: Parallele Feature-Branches"*). Vollständiger Entscheidungs-Record (durchgegrillt, final):
[`FEAT-001_decisions.md`](FEAT-001_decisions.md) (D1–D9, RD1/RD2, Sorgfaltspunkte).

## Kurzbeschreibung & Motivation

`feature-delivery` soll jedes Feature in einem **eigenen git-Worktree** umsetzen, statt im
Haupt-Checkout den Branch zu wechseln. Damit können mehrere Features **echt parallel** und
**kollisionsfrei** implementiert werden (jeder Agent in eigenem Worktree = eigener Ordner + eigener
Branch), während der Nutzer auf `master` als ruhiger Heimathafen bleibt.

**Zielbild:** Mehrere `feature-delivery implementiere …`-Läufe → mehrere Worktrees → mehrere Branches,
alle nebenläufig; der Nutzer dirigiert von `master`. **Kein Auto-Push, kein Auto-PR** — Merge bleibt
bewusst manuell.

## Projekt-Layout (Annahme)

```
<project-root>/            ← Session-cwd, KEIN Repo
├── .claude/              ← Harness (nie ins Projekt-Repo)
├── requests/             ← Stories/Pläne/Features (außerhalb jeden Repos, geteilt)
├── <repo-dir>/           ← DAS git-Repo (.git); pusht auf remote  (z. B. source/{backend,frontend,devops})
├── worktrees/            ← NEU: Worktree-Checkouts, Geschwister zum Repo
└── .mcp.json
```

## Scope

**Drin:**
- feature-delivery: Worktree-Routing statt Branch-Guard (anlegen/wiederfinden je Feature).
- Deterministisches Naming `feat-<nnn>-<slug>` (`<nnn>` = stabile Parent-`FEAT-NNN`).
- Manuelles `git worktree add` + Absolutpfad-Routing (nicht `EnterWorktree` — bricht bei Repo im
  Unterverzeichnis + würde `<repo>/.claude/worktrees` verschmutzen).
- Frischer-Worktree-Bootstrap (konditional nach `touches`) + optionale Config-Kopier-Liste.
- Auto-Commit pro Story (nur `implementiere`, nur Code, nur bei Grün, Message ohne interne IDs).
- requirement-definition: Feature-Zwang (Pflicht-`parent`) + eigener Feature-Name-Grammatik.
- Doku/Regeln: CLAUDE.md ergänzen, StartUpClaude.md Worktree-Workflow.

**Bewusst NICHT drin:**
- Kein Auto-Push, kein Auto-PR (Merge = Nutzer, lokal oder push+PR).
- Kein `plane`-Auto-Commit, kein `plane`-Worktree-Wechsel.
- Kein Sub-Agent-`isolation:worktree` (bleibt verboten innerhalb eines Laufs).

## NFRs / Qualität
- **Isolation:** Parallele Feature-Läufe dürfen sich nie in dieselben Dateien/denselben Branch teilen.
- **Sauberkeit:** `.claude/` und `requests/` landen nie im Projekt-Repo; Worktrees liegen außerhalb des Repos.
- **Robustheit:** Kein Verhalten hängt an der Session-cwd (alles absolut-pfad-basiert).
- **Kosten transparent:** Bootstrap-Latenz (node_modules) einmal pro Feature, nur bei Frontend-`touches`.

## Story-Liste

<!-- rd:children:start -->
- **STORY-001** — feature-delivery: Worktree-Routing statt Branch-Guard
- **STORY-002** — feature-delivery: Frischer-Worktree-Bootstrap *(nach STORY-001)*
- **STORY-003** — feature-delivery: Auto-Commit pro Story *(nach STORY-001)*
- **STORY-004** — requirement-definition: Feature-Zwang
- **STORY-005** — requirement-definition: Eigener Feature-Name *(nach STORY-004)*
- **STORY-006** — CLAUDE.md: Worktree-Modell-Regel
- **STORY-007** — StartUpClaude.md: Worktree-Workflow-Doku

**Parallelgruppen (disjunkte Dateien → parallel):**
```
Lane 1 (seriell): STORY-001 → STORY-002 → STORY-003   (feature-delivery)
Lane 2 (seriell): STORY-004 → STORY-005               (requirement-definition)
Lane 3:           STORY-006                            (CLAUDE.md)
Lane 4:           STORY-007                            (StartUpClaude.md)
```
<!-- rd:children:end -->

## Annahmen / Offene Punkte
- Worktree-Ort `<project-root>/worktrees/` — empfohlen, bei Umsetzung final bestätigen (latenz-irrelevant).
- Config-Kopier-Liste braucht ein Konfig-Zuhause (CLAUDE.md-Projektmap oder kleine Config-Datei).
- Repo-Dir-Name ist projektspezifisch → aus CLAUDE.md-Projektmap lesen, nicht hardcoden.
- CODE_ROOT-Threading (Worktree-Pfad an alle Sub-Agents/Tools) = größter Umsetzungs-Sorgfaltspunkt.
