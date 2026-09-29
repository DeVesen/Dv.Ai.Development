# FEAT-001 — Entscheidungs-Record (durchgegrillt, final)

Begleitdokument zu `FEAT-001_worktree-per-feature-workflow.md`. Alle Entscheidungen sind final
(grill-me-Durchlauf 2026-07-03); die Stories STORY-001…007 setzen sie um.

## Projekt-Layout (Annahme)
```
<project-root>/            ← Session-cwd, KEIN Repo
├── .claude/              ← Harness (nie ins Projekt-Repo)
├── requests/             ← Stories/Pläne/Features (außerhalb jeden Repos, geteilt)
├── <repo-dir>/           ← DAS git-Repo (.git); z. B. source/{backend,frontend,devops}
├── worktrees/            ← NEU: Worktree-Checkouts, Geschwister zum Repo
└── .mcp.json
```

## Kern-Entscheidungen
- **D1 — Session-Modell:** feature-delivery besitzt den Worktree-Lebenszyklus. Mechanismus **manuell**:
  `git -C <repo-dir> worktree add <worktree-pfad> -b feat-<nnn>-<slug> HEAD`, danach alle Code-Ops über
  **Absolutpfade**. NICHT `EnterWorktree` (bricht bei Repo im Unterverzeichnis + verschmutzt `<repo>/.claude/worktrees`).
  Session-cwd bleibt `project-root`.
- **D2 — Naming:** `feat-<nnn>-<slug>`, `<nnn>` = stabile Parent-`FEAT-NNN`, `<slug>` = Feature-Slug.
  Reuse via `git branch --list "feat-<nnn>-*"`. Kein neues Frontmatter-Feld.
- **D3 — Ort:** `<project-root>/worktrees/feat-<nnn>-<slug>/` (außerhalb des Repos).
- **D4 — Story-Routing ersetzt Branch-Guard:** Implement-Trigger+Story → anlegen/betreten; `plane` → bleibt;
  No-Story-Reviewer → bleibt. Kein master-STOPP. Routing nach Story-Identifikation (parent+slug).
- **D5 — Auto-Commit:** nur `implementiere` (nicht `plane`), nur Code, nur bei Grün, ein Commit/Story,
  Message aus Titel/Name ohne interne `STORY-NNN`/`FEAT-NNN`. `requests/` liegt außerhalb → kein selektives Staging.
- **D6 — Reviewer:** gegen Worktree-Pfad, scopen via `git diff <merge-base>..HEAD`. 1-Story → Review bei Impl;
  Mehr-Story → Delivery-Inspection nach allen Stories.
- **D7 — Bootstrap:** konditional nach `touches` (Frontend → `npm ci`; Backend-only → skip); `dotnet restore`
  läuft beim Build; optionale Config-Kopier-Liste (Default leer). Nur bei frischem Worktree.
- **D8 — Teardown:** manuell `git worktree remove` nach Merge. Kein Auto-Push/PR.
- **D9 — CLAUDE.md-Regel:** ergänzen, nicht ersetzen (Sub-Agent-`isolation:worktree`-Verbot bleibt;
  neu: Top-Level = ein Worktree pro Feature).

## requirement-definition
- **RD1 — Feature-Zwang:** Pflicht-`parent`; Story-Direkteinstieg + Micro-Change erzwingen Feature; Minimal-Feature-Stub möglich.
- **RD2 — Feature-Name:** `feature "<name>" [prompt]` → Anführungszeichen = Name (nur Level `feature`).

## Implementierungs-Sorgfaltspunkte (keine Entscheidungen)
- **CODE_ROOT-Threading:** Worktree-Pfad an ALLE Sub-Agents/Tools durchreichen (üblichen Repo-Root pro Lauf überschreiben). Größtes Risiko.
- **Indexierung:** codebase-analyzer/dev-mcp auf Worktree-Pfad zeigen; `worktrees/*` nicht doppelt indexieren.
- **Config-Kopier-Liste** braucht ein Konfig-Zuhause.
- **Repo-Dir-Name** aus CLAUDE.md-Projektmap lesen, nicht hardcoden.

## Bewusst NICHT im Scope
Kein Auto-Push/PR · kein `plane`-Auto-Commit/-Wechsel · kein Sub-Agent-`isolation:worktree`.
