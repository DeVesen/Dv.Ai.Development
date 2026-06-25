# Utility Skills

Kleine, fokussierte Skills für Kommunikation, Dokumentation und Meta-Arbeit.

---

## delivery-inspection

Prüfung vor der Auslieferung — stellt sicher dass alle Anforderungen angegangen, korrekt verstanden
und vollständig umgesetzt wurden. Universell: Code-Features, Skill-Dateien, Dokumentation, Analysen.
Wird auch von `feature-delivery` als letzter Schritt vor Closure aufgerufen.

**Trigger:** `delivery-inspection`, `auslieferung prüfen`, `pruef ob alles umgesetzt`, `delivery check`  
**Opt-out:** `kein-delivery-inspection`, `no-delivery-inspection`, `skip-delivery-inspection`

Sechs parallele Reviewer-Perspektiven:

| Rolle | Fokus |
|-------|-------|
| **Revisor** | Anforderungs-Buchhalter: mappt jeden Request 1:1 auf Deliverable |
| **Skeptiker** | Lückenjäger: was fehlt, was ist halbfertig, was wurde vergessen? |
| **Normalo** | Pragmatische Abnahme: direkt produktiv einsetzbar? |
| **Dolmetscher** | Wurden Anforderungen korrekt *verstanden*? Fehlinterpretationen? Unklarheiten still entschieden? |
| **Auftraggeber** | Strengste Abnahme: würde ich das als Besteller unterschreiben? |
| **Querdenker** | YAGNI-Wächter: zu viel gemacht? Scope Creep? Nicht beauftragter Boilerplate? |

Iterativer Loop bis alle 6 Reviewer keine behebbaren Findings mehr melden.

---

## prozess-retrospektive

Analysiert den Arbeitsprozess einer Session und liefert konkrete Verbesserungsideen für den Harness.

**Trigger:** `prozess-retrospektive`, `retrospektive`, `prozess analyse`, `harness verbessern`, `wie lief das`  
**Opt-out:** `kein-retrospektive`, `no-retrospektive`, `skip-retrospektive`  
**Kein Auto-Trigger** — immer explizit aufgerufen.

Fünf Analyse-Bereiche:

| Bereich | Fokus |
|---------|-------|
| **MCP-Call-Qualität** | Timeouts, Fallbacks, Failures, unnötige Wiederholungen |
| **Orchestrierungs-Effizienz** | Gates, Runden, Blockaden, sequenziell vs. parallel |
| **Reviewer-Qualität** | Echte Findings vs. Rauschen — generisch, unabhängig von Reviewer-Anzahl/-Namen |
| **Reibungspunkte** | Nutzer-Eingriffe, Klärungsbedarfe, Missverständnisse |
| **Delivery-Inspection-Loop** | Iterations-Effizienz, Muster in Findings |

Output: strukturierter Bericht mit priorisierten Harness-Verbesserungsideen inkl. konkreter Dateiverweise.

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

- `delivery-inspection` → nach jedem Deliverable aus anderen Skills; automatisch letzter Schritt in `feature-delivery`
- `prozess-retrospektive` → optional nach jeder längeren Session für Harness-Verbesserungsideen
- `skill-creator` → wenn ein neuer Skill oder Agent-Profil benötigt wird
- `describe-as` → für Handoff zwischen Agenten oder Sessions
- `conversation-insights` → Learnings festhalten nach entscheidenden Gesprächen
