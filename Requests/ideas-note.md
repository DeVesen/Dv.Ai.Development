# Ideas & Notizen

Lose Ideen, die noch nicht als Story ausgearbeitet sind.

---

## feature-delivery: automatischer Feature-Branch

**Idee:** Der feature-delivery Orchestrator soll vor dem ersten Edit automatisch einen
Git-Branch anlegen — z. B. `git checkout -b story/STORY-XXX-slug`.

**Hintergrund:** Aktuell arbeitet feature-delivery direkt auf dem aktiven Branch (z. B. `master`).
Bei parallelen Story-Implementierungen oder nach einem Harness-Problem landen alle Änderungen
ungefiltert im selben Branch — ohne Isolation, ohne klare Commit-Geschichte pro Story.

**Gewünschtes Verhalten:**
- Orchestrator liest Story-ID und Slug aus dem Frontmatter
- Legt Branch an: `story/STORY-NNN-<slug>` (vor dem ersten Scribe-Start)
- Alle Scribes, Fixes und Gates laufen auf diesem Branch
- Nach Closure / `status: implemented`: Branch liegt bereit zum Merge/PR

**Offene Entscheidungen:**
- Branch-Naming-Konvention (z. B. `story/` vs. `feat/` vs. `STORY-NNN/`)
- Was passiert wenn Branch bereits existiert? (Fehler vs. Weiterarbeiten)
- Wer merged zurück — Orchestrator automatisch oder Nutzer manuell?
- Gilt das auch für Plan-only (dann noch kein Code, Branch wäre leer)?

**Status:** Idee — noch nicht als Story geschnitten.

---

## Research: Parallele Feature-Branches mit MCP-Tools

**Idee:** Untersuchen ob mehrere feature-delivery Instanzen gleichzeitig auf verschiedenen
Branches laufen können — jede Story auf ihrem eigenen Branch, parallel implementiert.

**Vermutung:**
- Sub-Agents (Scribes, Reviewer) könnten das prinzipiell — sie arbeiten unabhängig voneinander
- Die MCP-Tools (`dev-mcp`, `codebase-analyzer`) sind aber vermutlich nicht branch-aware:
  sie arbeiten mit absoluten Windows-Pfaden auf dem aktuellen Working Directory und kennen
  keinen Branch-Kontext
- Ein `git checkout story/STORY-002` durch Agent A würde das Working Directory für Agent B
  korrumpieren — beide zeigen auf dasselbe `C:\Develop\...`

**Zu klären:**
- Unterstützen `dev-mcp`-Tools einen Branch-Parameter oder arbeiten sie immer auf HEAD?
- Könnte `git worktree add` (natives Git, nicht Claude-Worktree) eine Lösung sein?
  Jede Story bekommt ein eigenes Checkout-Verzeichnis — MCP-Pfade würden auf den
  jeweiligen Worktree-Pfad zeigen statt auf den Haupt-Checkout
- Wie verhält sich `codebase-analyzer` (Index-basiert) bei mehreren Worktrees?

**Status:** Research-Idee — erst sinnvoll nach dem automatischen Feature-Branch-Konzept.
