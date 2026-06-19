# Utility Skills

Kleine, fokussierte Skills für Kommunikation, Dokumentation und Meta-Arbeit.

---

## work-review

Automatischer Qualitäts-Review nach Abschluss eines Deliverables.

**Trigger:** Automatisch nach jedem Deliverable — Skill-Paket, Dokumentation, Markdown, PDF, PPTX, Analyse  
**Opt-out:** `kein-review`, `no-review`, `skip-review`

Vier parallele Reviewer-Agenten:

| Agent | Fokus |
|-------|-------|
| `implement-review-pessimist-agent` | Fehlende Details, Lücken, vergessene Edge Cases |
| `implement-review-lehrer-agent` | Fachliche Fehler, falsche APIs, veraltete Infos |
| `implement-review-normalo-agent` | Vollständigkeit, Pragmatik, Top-3-Empfehlungen |
| `implement-review-professor-agent` | Tiefenanalyse auf Doktorarbeit-Niveau (Opus) |

Alle vier Berichte abwarten → kritische Findings direkt fixen → Abschlussbericht.

---

## work-review-iterative

Iterativer Review-Fix-Loop: `work-review` ausführen → Findings fixen → wiederholen bis nichts mehr gemeldet.

**Trigger:** `/work-review-iterative`  
**Opt-out:** `kein-review`, `no-review`, `skip-review`

---

## skill-creator

Meta-Skill zum Erstellen und Verbessern von AI-Workflow-Artefakten.

**Trigger:** `create skill`, `neuer skill`, `agent profil`, `sub-agent`, `skill verbessern`, `description optimieren`, `.claude/agents`, SKILL.md reviewen  
**Alias:** `/agent-creator`

Drei Artefakt-Typen:
- **SKILL.md** — Claude Code Skills (`/skill-name`)
- **Agent-Profile** (`.claude/agents/*.md`) — Spezialisierte Sub-Agents
- **Cursor Rules** (`.cursor/rules/*.mdc`) — Cursor-only Auto-Inject

Produziert: token-dichte Descriptions, korrektes Agent-Wiring, Eval-Testfälle.

---

## conversation-insights

Decisive Erkenntnisse aus der aktuellen Session in `{insights-path}/log.md` festhalten.

**Trigger:** `capture insights`, `log insights`, `was haben wir gelernt`, `erkenntnisse protokollieren`, `was war entscheidend`  
**Nicht für:** Handoff/Prompt-Erstellung → das ist `describe-as`

---

## describe-as

Konversation als Copy-Paste Handoff-Artefakt verdichten — für Folge-Agenten.

**Trigger:** `describe-as-prompt`, `describe-as-html-prompt`, `handoff`, `für neuen Agent`, `das als prompt`, `HTML-Prompt`, `Mermaid`  
**Opt-out:** `kein describe-as`

Zwei Operationen:
- **text** — Fenced Markdown-Prompt
- **html** — Standalone HTML mit Mermaid-Diagrammen

Modi: Standard (mit Planning-Obligation) und Wasserdicht (ohne Planning-Meta).

---

## commit-message

Englischen Commit-Titel (max. 50 Zeichen) und -Beschreibung (max. 500 Zeichen) generieren.

**Trigger:** `commit message`, `commit beschreibung`, `Commit-Titel`, `erstelle commit`

Quellen: Konversations-Kontext, optionale `task-*.md`, optionaler `git diff`. Führt `git commit` **nicht** aus — nur Texterzeugung, außer der User fragt explizit danach.

---

## caveman

Ultra-kurzer Antwort-Stil — kein Fülltext, voller technischer Gehalt.

**Trigger:** `/caveman`, `caveman mode`, `terse mode`, `machine-dense`, `human-terse`  
**Stop:** `stop caveman`, `normal mode`

Modi: `lite`, `full`, `ultra`, `wenyan`, `human-terse`, `machine-dense`

---

## backend-ef-migrations

EF Core Migrations für .NET-Backend — Standard-Migrations und View-Migrations.

**Trigger:** EF Core Migration, `Add-Migration`, `Update-Database`, Pending Model Changes

Operationen: Standard-Migration, View-Migration, Pending-Model-Changes-Check.  
Enforcement: `docs/silent-shortcut-prevention.md`

---

## Zusammenspiel

- `work-review` / `work-review-iterative` → nach jedem Deliverable aus anderen Skills
- `skill-creator` → wenn ein neuer Skill oder Agent-Profil benötigt wird
- `describe-as` → für Handoff zwischen Agenten oder Sessions
- `conversation-insights` → Learnings festhalten nach entscheidenden Gesprächen
