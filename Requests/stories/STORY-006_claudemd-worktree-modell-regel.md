---
id: STORY-006
parent: FEAT-001
type: story
status: implemented
slug: claudemd-worktree-modell-regel
touches: [CLAUDE.md]
---

# CLAUDE.md: Worktree-Modell-Regel ergänzen

**Als** Harness-Pflegender
**möchte ich** die CLAUDE.md-Verhaltensregeln um das Worktree-Modell ergänzen
**damit** die neue Mechanik dokumentiert ist und die alte „kein Worktree"-Regel korrekt eingeordnet bleibt.

## Beschreibung

D9 — **ergänzen, nicht ersetzen**:
- Die bestehende Regel „Parallele Story-Agents: kein Worktree" bleibt gültig (Sub-Agent-`isolation:worktree`-Verbot **innerhalb** eines Laufs).
- **Neu:** Top-Level = **ein Worktree pro Feature** via manuellem `git worktree add` (Cross-Feature parallel).
- Plus: Layout-Annahme (Repo im Unterverzeichnis, `requests/`/`worktrees/` extern) + Aussage **kein Auto-Push/PR** (Merge manuell).

## INVEST
Erfüllt. Reine Doku-Regel, eigene Datei, unabhängig.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`ClaudeMd_WorktreeRegel_ErgaenztAlteRegelWiderspruchsfrei`
- Arrange: bestehende Regel „Parallele Story-Agents: kein Worktree"
- Act: Edit
- Assert: alte Regel bleibt erhalten (Sub-Agent-Verbot); neuer Abschnitt „ein Worktree pro Feature" ergänzt; die beiden widersprechen sich nicht (unterschiedliche Ebenen benannt)
Status: erweitern

`ClaudeMd_DokumentiertKeinAutoPushPr`
- Arrange: neue Worktree-Sektion
- Assert: explizite Aussage „kein Auto-Push, kein Auto-PR — Merge manuell"
Status: neu

`ClaudeMd_LayoutAnnahme_Dokumentiert`
- Arrange: neue Worktree-Sektion
- Assert: Projekt-Layout (repo-dir / `requests/` / `worktrees/`) beschrieben
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Dokumentiert das Verhalten, das STORY-001/003 implementieren (kein Datei-Konflikt → parallel möglich).
