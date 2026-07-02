# Integrations-Schritt — Abschluss feature-delivery · ARCHIV

> ⚠️ **ARCHIVIERT / HISTORISCH — ausgeführt, wird nicht gepflegt.**
> Abschluss-Checkliste des ursprünglichen `feature-delivery`-Aufbaus (Aufräumen der geteilten
> Index-Dateien, Ablösung der Vorgänger-Skills). **Ausgeführt** — der aktuelle Stand steht in
> [`CLAUDE.md`](../../CLAUDE.md) und [`docs/skills/feature-delivery.md`](../skills/feature-delivery.md).
> Die genannten Skill-Namen (`planning-workflow`, `implementation-workflow`) und die
> `plan-agent-*`-Merge-Referenzen sind bewusst historisch — diese Skills/Agents wurden in
> `feature-delivery` bzw. den `plan-agent` aufgelöst. Verweis auf
> [`feature-delivery-handoff.md`](../feature-delivery-handoff.md) (selbst archiviert) ist veraltet.

> **Source-of-Truth:** [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md), v.a. **§19 (Parallelitäts-Modell)** und **§3 (Verzeichnisstruktur)**. Zuerst lesen.

## Voraussetzungen (alle müssen erfüllt sein)

Dieser Schritt läuft **sequentiell**, nachdem alle relevanten Stränge abgeschlossen sind:

| Strang | Deliverable | Pflicht für diesen Schritt? |
|--------|------------|----------------------------|
| 1 | `feature-delivery` Skill + Agents + `startup.md` | ✅ ja |
| 2 | `run_inspectcode` + `lint_angular_project` im dev-mcp | ✅ ja |
| 4 | `acceptance-design` Skill + `acceptance-design-agent` | ✅ ja |
| 3 | `analyze_angular_architecture` im dev-mcp | optional (kann nachgereicht werden) |
| 5+6 | `analyze_iosp_compliance` im codebase-analyzer | optional (kann nachgereicht werden) |

**Mindest-Voraussetzung: Stränge 1, 2 und 4 abgeschlossen.** Stränge 3, 5, 6 sind nachgelagert und können nach diesem Schritt in einer weiteren Integrations-Runde eingetragen werden.

> **Bereits vorhanden (nicht neu erstellen):** `.claude/startup.md` (von Strang 1), `.claude/skills/feature-delivery/` (von Strang 1), `.claude/skills/acceptance-design/` (von Strang 4), `.claude/agents/acceptance-design-agent.md` (von Strang 4). Diese Dateien **nur lesen/prüfen**, nicht überschreiben.

---

## Ziel

Die **geteilten Index-Dateien** nachtragen, die während der parallelen Stränge bewusst ausgespart wurden (Last-Write-Wins-Falle). Außerdem: alte, migrierte Skills aufräumen.

---

## Checkliste

### 1. `CLAUDE.md` aktualisieren

**Skill-Tabelle (Key Skills):**
- `feature-delivery` eintragen (Trigger: `plane`, `implementiere`, `fix`, `feature-delivery`)
- `acceptance-design` eintragen (Trigger: `schärfe Anforderung`, `Akzeptanzkriterien prüfen`)
- `planning-workflow` + `implementation-workflow` **entfernen** (aufgegangen in `feature-delivery/flows/`)

**Repository-Struktur (`.claude/skills/`):**
- `feature-delivery/` hinzufügen (Beschreibung: Orchestrator, drei Einstiege)
- `acceptance-design/` hinzufügen
- `planning-workflow/` + `implementation-workflow/` entfernen (oder als `VERALTET` markieren, falls du die Ordner noch nicht löscht)

**`.claude/agents/`-Hinweis korrigieren:**
- CLAUDE.md enthält den veralteten Hinweis `derzeit noch nicht angelegt (Profile liegen noch unter skills/*/agents/)` — dieser ist falsch, da `.claude/agents/acceptance-design-agent.md` jetzt existiert. Hinweis entfernen oder ersetzen durch: `acceptance-design-agent.md` (harness-weit discoverable).

**MCP-Konfiguration:**
- dev-mcp Tool-Anzahl: **erst nach Schritt 6 (SKILL.md-Bereinigung) eintragen** — dort wird die korrekte Zahl ermittelt. Platzhalter stehen lassen bis Schritt 6 abgeschlossen ist, dann zurückkehren und eintragen.

**`docs/mcp/`-Baum in CLAUDE.md bereinigen:**
- `dev-mcp.md` eintragen (existiert, fehlt in der Liste).
- `dev-angular.md`, `dev-dotnet.md`, `dev-filesystem.md` entfernen (VERALTET, in dev-mcp integriert).
- **Dateien auf Disk:** `docs/mcp/dev-angular.md`, `docs/mcp/dev-dotnet.md`, `docs/mcp/dev-filesystem.md` ebenfalls löschen — sie enthalten nur noch Redirect-Hinweise auf dev-mcp und sind nach der CLAUDE.md-Bereinigung verwaist.

**Adding or Changing an MCP Server:**
- Zeile `Mcp-Servers/Dev.WindowsService.Mcp/` → auf `Mcp-Servers/Dev.Mcp/Dev.Mcp/` korrigieren (falls noch nicht geschehen).

---

### 2. Externe Links aktualisieren (vor dem Löschen)

Folgende Skills außerhalb von `feature-delivery/` verlinken auf die alten Ordner und würden nach dem Löschen broken links haben. **Vor dem Löschen updaten:**

| Datei | Aktion |
|-------|--------|
| `.claude/skills/code-intel-workflow/SKILL.md` | `planning-workflow` → `feature-delivery`, `implementation-workflow` → `feature-delivery` |
| `.claude/skills/repo-scout-protocol/SKILL.md` | `implementation-workflow` → `feature-delivery` |
| `.claude/skills/ado/SKILL.md` | `planning-workflow` → `feature-delivery` |
| `.claude/skills/ado/references/copy-commands.md` | `planning-workflow` → `feature-delivery` |
| `.claude/skills/ado/references/op-refine-task.md` | `planning-workflow` → `feature-delivery` |
| `.claude/skills/ado/references/task-verfeinern.md` | `planning-workflow` → `feature-delivery` |
| `.claude/skills/skill-creator/references/agent-profiles.md` | `planning-workflow` → `feature-delivery` |
| `.claude/skills/conversation-insights/references/op-refine.md` | `planning-workflow` → `feature-delivery` |

**Inhalt der Links:** Nur die Pfad-Teile `planning-workflow` / `implementation-workflow` ersetzen — Semantik (was der Link aussagt) erhalten. Kein Umschreiben ganzer Abschnitte.

---

### 3. Alte Skill-Ordner entfernen

**Erst Schritt 2 abschließen, dann löschen.**

```
.claude/skills/planning-workflow/
.claude/skills/implementation-workflow/
```

**Migrations-Klarstellung (kein Blocker — alles ist migriert, nur anders strukturiert):**

Die folgenden vier Agents existieren **nicht 1:1** in `feature-delivery/agents/` — sie wurden bewusst umstrukturiert:

| Alter Agent (Quelle) | Neues Ziel | Warum |
|---------------------|-----------|-------|
| `planning-workflow/agents/plan-agent-interface-designer.md` | Inhalt in `feature-delivery/agents/plan-agent.md` eingefaltet | Phase 4a wird vom Plan-Orchestrator selbst getragen (§5/§6 Handoff) |
| `planning-workflow/agents/plan-agent-merger.md` | Inhalt in `feature-delivery/agents/plan-agent.md` eingefaltet | Phase 4c desgleichen |
| `planning-workflow/agents/plan-agent-synthesizer.md` | Inhalt in `feature-delivery/agents/plan-agent.md` eingefaltet | Phase 6 desgleichen |
| `implementation-workflow/agents/implement-agent.md` | Aufgeteilt in `implement-scribe-agent.md` + `implement-scribe-opus-agent.md` | Zweistufiger TDD-Scribe (§7/§8 Handoff) |

**Das Fehlen dieser vier Dateien in `feature-delivery/agents/` ist kein Migrations-Fehler.**

**Weitere Vor-dem-Löschen-Checks:**
- `feature-delivery/flows/planning-flow.md` existiert
- `feature-delivery/flows/implementation-flow.md` existiert
- Schritt 2 (externe Links) ist abgeschlossen
- Kein weiterer externer Verweis übrig: Grep `planning-workflow|implementation-workflow` in `.claude/skills/**/*.md`, **ausgenommen**:
  - `planning-workflow/` und `implementation-workflow/` selbst (werden gelöscht)
  - `feature-delivery/SKILL.md` (enthält bewussten historischen Verweis `erbt den Zweck des alten implementation-workflow` — kein Broken Link)

---

### 4. `docs/skills/` — Doku-Dateien aufräumen

`docs/skills/planning-workflow.md` und `docs/skills/implementation-workflow.md` existieren noch und werden nach dem Löschen der Skill-Ordner inhaltlich verwaist sein.

**Aktion:** Beide Dateien löschen und `docs/skills/feature-delivery.md` anlegen (Kurzübersicht: drei Einstiege, Lean-Mode, Verweis auf `.claude/skills/feature-delivery/SKILL.md`). Falls `docs/skills/acceptance-design.md` noch nicht existiert, ebenfalls anlegen.

CLAUDE.md's `docs/`-Baum in der Struktur-Übersicht entsprechend aktualisieren: `planning-workflow.md` + `implementation-workflow.md` entfernen, `feature-delivery.md` + `acceptance-design.md` eintragen.

---

### 5. `docs/mcp/dev-mcp.md` — Konsistenz prüfen

- Tool-Zählung oben im Dokument stimmt mit tatsächlich vorhandenen Tools überein — bei Abweichung korrigieren, bevor Schritt 6 die finale Zahl festlegt.
- Pfad-Angabe zur EXE korrekt (nach aktuellem `Mcp-Servers\Dev.Mcp\Dev.Mcp\` Stand).

---

### 6. `.claude/skills/dev-mcp/SKILL.md` — Bereinigen + Konsistenz prüfen

- Neue Tools (`run_inspectcode`, `lint_angular_project`, ggf. `analyze_angular_architecture`) sind eingetragen.
- **Bekannte interne Inkonsistenz beheben:**
  - Section-Header `Angular-Tools (8 Tools)` — Tabelle darunter hat nur 7 Zeilen (`lint_angular_project` fehlt in der Tabelle, obwohl im Frontmatter unter „Statische Analyse" vorhanden). Header-Zahl oder Tabelle korrigieren.
  - `rename_file` erscheint doppelt (sowohl unter Move/Rename-Tools als auch unter .NET-Tools). Duplikat entfernen.
- Tool-Gesamtzahl im Frontmatter (`41 Dev-Tools` o.ä.) erst **nach** der Bereinigung neu zählen und eintragen. Diese Zahl dann in Schritt 1 (`CLAUDE.md`) übernehmen — `docs/mcp/dev-mcp.md` und `SKILL.md` müssen übereinstimmen.

---

### 7. `.claude/settings.json` / `.claude/settings.local.json`

- Prüfen ob `feature-delivery` als Skill benötigt wird (auto-discover via Frontmatter-`name:` — normalerweise kein Eintrag nötig).
- Prüfen ob `acceptance-design` und `acceptance-design-agent` korrekt auftauchen.
- **Keine stillen Änderungen** — nur wenn konkret etwas fehlt.

---

### 8. Abschluss-Verifikation

- `git status` zeigt nur gewünschte Änderungen.
- `CLAUDE.md` nennt `feature-delivery` + `acceptance-design`, nicht mehr `planning-workflow` / `implementation-workflow`; Agents-Hinweis korrekt.
- Alte Skill-Ordner sind entfernt (oder bewusst als Platzhalter behalten — Entscheidung hier treffen und dokumentieren).
- `docs/skills/feature-delivery.md` + `docs/skills/acceptance-design.md` existieren; `docs/skills/planning-workflow.md` + `docs/skills/implementation-workflow.md` sind entfernt.
- dev-mcp Tool-Anzahl in `CLAUDE.md`, `docs/mcp/dev-mcp.md` und `dev-mcp/SKILL.md` stimmt überein.
- Branch `claude/skill-x-agent-framework-xj2zi3` — kein Push, kein Merge ohne Svens Anweisung.

---

## Parallelitäts-Sperre aufgehoben

Dieser Schritt darf `CLAUDE.md`, Skill-Registries und `.claude/settings*` **anfassen** — das ist sein expliziter Auftrag. Alle anderen Strang-Sperren bleiben inhaltlich gültig (keine fremden Strang-Dateien verändern).

## Regeln

- Keine stillen Annahmen — vor jedem Löschvorgang Sven bestätigen lassen.
- Kein Commit/Merge ohne Svens explizite Anweisung.
