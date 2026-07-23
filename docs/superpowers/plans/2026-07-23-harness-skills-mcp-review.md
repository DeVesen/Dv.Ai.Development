# Harness Skills MCP-Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei Skills erweitern — commit-message erhält Auto-Review via `review_git_diff`; regression-audit erhält `analyze_slice_impact` für Software-Stacks; ado-mcp erhält einen Sprint-Planungs-Workflow.

**Architecture:** Ausschließlich Skill-Dateien (Markdown). Keine Produktivcode-Änderungen. Alle MCP-Aufrufe werden als Instruktionen in den Skills referenziert.

**Tech Stack:** Markdown, codebase-analyzer MCP (review_git_diff, analyze_slice_impact, analyze_planning_inventory), ADO MCP (wit_query_wiql).

## Global Constraints

- Frontmatter: nur `name` + `description`; `description` beginnt mit „Use when…"
- SKILL.md-Body < 500 Wörter; Details in `references/` auslagern
- Kein `@`-Link auf andere Dateien im Skill-Body (lädt sofort)
- Alle Windows-Absolutpfade in MCP-Aufrufen: `C:\...` — kein `/workspace/`
- Keine automatischen `git commit`-Aufrufe

---

## File Structure

| Datei | Aktion |
|-------|--------|
| `.claude/skills/commit-message/SKILL.md` | Modify — Step 1.5 (Auto-Review) zwischen Schritt 1 und 2 einfügen |
| `.claude/skills/regression-audit/SKILL.md` | Modify — Step 3.5 (Index-Check) + Step 4 Routing-Text anpassen |
| `.claude/skills/regression-audit/references/slice-impact.md` | New — Index-Check + analyze_slice_impact Protokoll |
| `.claude/skills/regression-audit/references/angular.md` | Modify — Schritt 2 durch analyze_slice_impact ersetzen |
| `.claude/skills/regression-audit/references/dotnet.md` | Modify — Schritt 2 durch analyze_slice_impact ersetzen |
| `.claude/skills/ado-mcp/SKILL.md` | Modify — Sprint-Trigger in Quick-Routing + Referenzen ergänzen |
| `.claude/skills/ado-mcp/references/op-sprint-analyse.md` | New — vollständiger Sprint-Analyse Workflow |

---

## Task 1: commit-message — Auto-Review via review_git_diff

**Files:**
- Modify: `.claude/skills/commit-message/SKILL.md`

**Interfaces:**
- Consumes: codebase-analyzer `review_git_diff` (staged: true)
- Produces: SKILL.md mit Step 1.5 und erweitertem Qualitätscheck

### Acceptance-Kriterien

- `/commit` ohne Opt-out → `review_git_diff` wird aufgerufen, bevor die Commit-Nachricht generiert wird
- Review liefert Blocker → nur Findings ausgeben, kein Commit-Text, Skill beendet
- Review liefert nur Warnings → Commit-Text generieren + Warning-Block darunter
- `/commit ohne review` oder `commit --no-review` → kein review_git_diff, direkt Commit-Text

---

- [ ] **Schritt 1.1: Step 1.5 nach `### 1 — Git-Zustand lesen` einfügen**

Exakter Einfügeort in `.claude/skills/commit-message/SKILL.md`: nach dem Block

```
Alle drei ausführen — staged und unstaged zusammen ergeben das vollständige Bild.
```

Einzufügender Text:

```markdown
### 1.5 — Auto-Review (entfällt bei `ohne review`)

Wenn der Trigger `ohne review` oder `--no-review` enthält → Schritt 1.5 überspringen.

Tool: `codebase-analyzer` → `review_git_diff` mit `staged: true`.

| Ergebnis | Verhalten |
|----------|-----------|
| **Blocker** vorhanden | Findings ausgeben — kein Commit-Text generieren. Skill endet hier. |
| Nur **Warnings** | Mit Schritt 2–4 fortfahren; Warnings als `### ⚠️ Review-Hinweise`-Block *nach* dem Commit-Codeblock ausgeben. |
| Keine Findings | Direkt weiter mit Schritt 2. |
```

---

- [ ] **Schritt 1.2: Qualitätscheck-Checkliste am Dateiende erweitern**

Die vorhandene Checkliste:

```markdown
- [ ] Work-Item vorhanden?
- [ ] Typ korrekt gewählt?
- [ ] Subject ≤72 Zeichen?
- [ ] Imperativ-Formulierung?
- [ ] Body nur wenn nötig?
```

Zeile ergänzen:

```markdown
- [ ] Review gelaufen oder Opt-out (`ohne review`) dokumentiert?
```

---

## Task 2: regression-audit — analyze_slice_impact integrieren

**Files:**
- Modify: `.claude/skills/regression-audit/SKILL.md`
- New: `.claude/skills/regression-audit/references/slice-impact.md`
- Modify: `.claude/skills/regression-audit/references/angular.md`
- Modify: `.claude/skills/regression-audit/references/dotnet.md`

**Interfaces:**
- Consumes: codebase-analyzer `index_status`, `index_project`, `analyze_slice_impact`
- Produces: aktualisierte Audit-Referenzkette + neue slice-impact.md

### Acceptance-Kriterien

- SKILL.md referenziert `slice-impact.md` für Index-Check (nur Software-Stacks)
- Stale Index → Skill fragt User, bevor er fortfährt
- angular.md und dotnet.md: Schritt 2 ruft `analyze_slice_impact` auf (ein Call pro Stack-Typ)
- Nicht-Software-Bereiche: theoretische Analyse unverändert

---

### 2a — SKILL.md aktualisieren

- [ ] **Schritt 2.1: Step 3.5 nach Schritt 3 einfügen**

Einfügeort: nach `3. **Stack erkennen**` und vor `4. **Verhaltens-Verifikation pro Bereich**`.

Einzufügender Text:

```markdown
3.5 **Index prüfen (nur Software-Stacks)** — wenn Angular oder .NET erkannt:
    Ablauf in [`references/slice-impact.md`](references/slice-impact.md).
    Bei veraltetem / fehlendem Index: Skill anhält und User fragen.
```

---

- [ ] **Schritt 2.2: Step 4 Text anpassen**

Bestehenden Text:

```
4. **Verhaltens-Verifikation pro Bereich** — Kernfrage: *Ist der zuletzt intendierte Zustand
   heute noch present?* Details im Stack-Playbook.
   - Kumulative Prüfung: alle in N Tagen berührten Bereiche **einmalig** gegen den
     aktuellen Stand prüfen — nicht isoliert pro Commit.
   - Software: Tests ausführen + Code-Review für betroffene Bereiche.
   - Nicht-Software: theoretische Analyse (Definition, Referenz, Konfiguration).
```

Ersetzen durch:

```
4. **Verhaltens-Verifikation pro Bereich** — Kernfrage: *Ist der zuletzt intendierte Zustand
   heute noch present?*
   - Kumulative Prüfung: alle in N Tagen berührten Bereiche **einmalig** gegen den
     aktuellen Stand prüfen — nicht isoliert pro Commit.
   - **Angular / .NET:** `analyze_slice_impact` ersetzt die manuelle Prüfung — Ablauf im Stack-Playbook.
   - **Nicht-Software:** theoretische Analyse (Definition, Referenz, Konfiguration).
```

---

### 2b — references/slice-impact.md erstellen

- [ ] **Schritt 2.3: Neue Datei anlegen**

Pfad: `.claude/skills/regression-audit/references/slice-impact.md`

Inhalt:

```markdown
# Slice Impact — Index-Check & analyze_slice_impact

## Index prüfen

Tool: `codebase-analyzer` → `index_status`

| Status | Aktion |
|--------|--------|
| Vorhanden, nicht veraltet | Direkt mit analyze_slice_impact fortfahren |
| Veraltet oder fehlend | **Stoppen:** „Index fehlt / veraltet — soll zuerst `index_project` ausgeführt werden? (ja / nein / überspringen)" |

- User antwortet „ja" → `index_project` für den erkannten Stack aufrufen, dann fortfahren
- User antwortet „nein" / „überspringen" → mit Warning im Report fortfahren: „Index veraltet — Ergebnisse möglicherweise unvollständig"

---

## analyze_slice_impact aufrufen

Ein Call pro Stack-Typ. `filePaths[]` = alle geänderten Dateien des jeweiligen Typs aus dem Git-Log (Windows-Absolutpfade).

Beide Calls können parallel abgesetzt werden wenn beide Stacks vorhanden sind.

```
codebase-analyzer.analyze_slice_impact(
  filePaths: ["C:\\..\\<datei1.ts>", "C:\\..\\<datei2.ts>"],
  format: "compact"
)

codebase-analyzer.analyze_slice_impact(
  filePaths: ["C:\\..\\<datei1.cs>", "C:\\..\\<datei2.cs>"],
  format: "compact"
)
```

---

## Ergebnis-Mapping auf Audit-Signale

| analyze_slice_impact Kategorie | Audit-Signal |
|-------------------------------|--------------|
| Compiler Errors | **Rot** — Blocker; sofort im Report benennen |
| Untested Public API | TDD-Verletzungs-Signal (rot wenn neu, gelb wenn bestehend) |
| Refactoring Safety Warnings | **Gelb** — Regressions-Risiko |
| BoyScout Findings | **Gelb** — hygienisch, kein Blocker |
| Keine Findings | **Grün** für diesen Stack-Bereich |
```

---

### 2c — angular.md aktualisieren

- [ ] **Schritt 2.4: Schritt 2 in references/angular.md ersetzen**

Kompletten Block `## Schritt 2: Verhaltens-Verifikation (kumulativ)` (inkl. der gesamten
Tabelle, dem `**Kumulativ bedeutet:**`-Absatz, dem `**Tests ausführen**`-Absatz und dem
Playwright-Hinweis) ersetzen durch:

```markdown
## Schritt 2: Verhaltens-Verifikation via analyze_slice_impact

Index-Check und Tool-Aufruf: → [`slice-impact.md`](slice-impact.md)

`filePaths[]` = alle geänderten `.ts`-Dateien aus Schritt 1, Windows-Absolutpfade.

Intent aus `commit-intent.md` als Maßstab für die Bewertung der Findings:

| Commit-Typ im Bereich | Erwartetes analyze_slice_impact Ergebnis |
|-----------------------|-----------------------------------------|
| `add <Feature>` | Kein Untested-API-Finding für neue Symbole |
| `extend <Komponente>` | Kein Refactoring-Safety-Warning für vorhandene Consumers |
| `fix <Problem>` | Keine Compiler Errors |
| `refactor <Bereich>` | Kein Compiler Error + kein Refactoring-Safety-Warning |
| Mehrere Typen kombiniert | Union aller obigen Erwartungen |

Falls Playwright MCP verfügbar und UI-Flows betroffen (Grid, Suchtabelle, View-Persistierung):
Playwright für kritische Pfade zusätzlich ausführen. Nicht verfügbar → im Report als Lücke benennen.
```

---

### 2d — dotnet.md aktualisieren

- [ ] **Schritt 2.5: Schritt 2 in references/dotnet.md ersetzen**

Kompletten Block `## Schritt 2: Verhaltens-Verifikation (kumulativ)` (inkl. Tabelle,
`**Kumulativ bedeutet:**`-Absatz und `**Tests ausführen**`-Absatz) ersetzen durch:

```markdown
## Schritt 2: Verhaltens-Verifikation via analyze_slice_impact

Index-Check und Tool-Aufruf: → [`slice-impact.md`](slice-impact.md)

`filePaths[]` = alle geänderten `.cs`-Dateien aus Schritt 1, Windows-Absolutpfade.

Intent aus `commit-intent.md` als Maßstab für die Bewertung der Findings:

| Commit-Typ im Bereich | Erwartetes analyze_slice_impact Ergebnis |
|-----------------------|-----------------------------------------|
| `add <Feature>` | Kein Untested-API-Finding für neue Klassen/Methoden |
| `extend <Klasse/Service>` | Kein Refactoring-Safety-Warning für vorhandene Consumer |
| `fix <Problem>` | Keine Compiler Errors |
| `refactor <Bereich>` | Kein Compiler Error + kein Refactoring-Safety-Warning |
| Mehrere Typen kombiniert | Union aller obigen Erwartungen |

Shared-/Core-Projekte: Compiler Errors und Refactoring-Safety-Warnings besonders prüfen —
eine geänderte Interface-Signatur hier betrifft alle abhängigen Projekte.
```

---

## Task 3: ado-mcp — Sprint-Planungs-Workflow

**Files:**
- Modify: `.claude/skills/ado-mcp/SKILL.md`
- New: `.claude/skills/ado-mcp/references/op-sprint-analyse.md`

**Interfaces:**
- Consumes: ADO MCP `wit_query_wiql`, codebase-analyzer `analyze_planning_inventory`
- Produces: aktualisiertes SKILL.md + neue op-sprint-analyse.md

### Acceptance-Kriterien

- Quick-Routing-Tabelle enthält „Sprint analysieren" → `references/op-sprint-analyse.md`
- Referenzen-Tabelle enthält denselben Eintrag
- op-sprint-analyse.md enthält alle 5 Schritte: Tasks laden, Inventory, Abgleich, Plan, Persistieren
- Plan wird als `docs/ado/sprint-<n>.md` gespeichert (kein automatischer Commit)

---

### 3a — SKILL.md aktualisieren

- [ ] **Schritt 3.1: Quick-Routing Tabelle ergänzen**

In der vorhandenen Quick-Routing-Tabelle nach der letzten Zeile eine neue Zeile einfügen:

```markdown
| Sprint analysieren | `references/op-sprint-analyse.md` |
```

---

- [ ] **Schritt 3.2: Referenzen-Tabelle ergänzen**

In der vorhandenen Referenzen-Tabelle nach der letzten Zeile ergänzen:

```markdown
| Sprint-Analyse Workflow | `references/op-sprint-analyse.md` |
```

---

### 3b — op-sprint-analyse.md erstellen

- [ ] **Schritt 3.3: Neue Datei anlegen**

Pfad: `.claude/skills/ado-mcp/references/op-sprint-analyse.md`

Inhalt:

```markdown
# Operation: Sprint analysieren

## Trigger

User nennt Sprint explizit: „analysiere Sprint 42", „Sprint-Analyse Sprint 42",
„Implementierungsplan für Sprint 5", „was ist in Sprint 42 drin"

---

## Schritt 1 — ADO-Tasks laden

Vor dem ersten ADO-MCP-Aufruf Tools laden (falls nicht bereits geschehen):

```
ToolSearch("select:mcp__ado__wit_query_wiql,mcp__ado__wit_get_work_items_batch_by_ids")
```

WIQL-Query für alle Tasks des genannten Sprints:

```
wit_query_wiql(
  projectName: "<project>",
  query: "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State],
          [System.Description], [Microsoft.VSTS.Common.AcceptanceCriteria]
          FROM WorkItems
          WHERE [System.IterationPath] UNDER '<project>\\Sprint <n>'
          AND [System.WorkItemType] IN ('Task', 'User Story', 'Bug')
          ORDER BY [System.ChangedDate] DESC"
)
```

Falls Projekt oder Iterationspfad unbekannt → User fragen:
„Wie heißt das ADO-Projekt und die Iteration? (z.B. `MeinProjekt` / `Sprint 42`)"

---

## Schritt 2 — Planning Inventory erstellen (parallel)

`codebase-analyzer` → `analyze_planning_inventory` für beide Stacks parallel:

```
analyze_planning_inventory(
  projectPath: "C:\\Develop\\<Projektname>\\src\\frontend",
  format: "compact"
)

analyze_planning_inventory(
  projectPath: "C:\\Develop\\<Projektname>\\src\\backend",
  format: "compact"
)
```

Pfade = Windows-Absolutpfade. Falls unbekannt → `index_status` prüfen oder User fragen:
„Wo liegen das Angular-Projekt und das .NET-Projekt? (Windows-Pfade)"

---

## Schritt 3 — Abgleich: existierend vs. neu

Pro ADO-Task aus Schritt 1:

1. Titel + Beschreibung → Schlüsselbegriffe extrahieren (Endpunkt-URL, Route, DTO-Name, Feature-Name)
2. Schlüsselbegriffe gegen das Planning Inventory matchen:
   - **Treffer** → Artefakt bereits vorhanden; Task = Erweiterung, Fix oder Konfiguration
   - **Kein Treffer** → Neu-Implementierung notwendig; Artefakt fehlt noch

---

## Schritt 4 — Implementierungsplan generieren

Pro Task einen Abschnitt im Format:

```markdown
### Task #<id> — <Titel>

**Status:** <WI-State>  
**Typ:** <existierend | neu>

**Betroffene Artefakte:**
- Angular: <Komponente / Route — oder „(neu anlegen)">
- .NET: <Controller / Endpunkt — oder „(neu anlegen)">

**Implementierungsschritte:**
1. <Konkreter Schritt mit Dateipfad-Hinweis>
2. <Konkreter Schritt>
3. <Test-Schritt>
```

---

## Schritt 5 — Plan persistieren

Verzeichnis `docs/ado/` anlegen falls nicht vorhanden.

Datei: `docs/ado/sprint-<n>.md`

Datei-Header:

```markdown
# Sprint <n> — Implementierungsplan

> Generiert: <YYYY-MM-DD>
> ADO-Projekt: <project>
> Iteration: <Iteration Path>

---
```

Danach alle Task-Abschnitte aus Schritt 4 anhängen.

Nach dem Schreiben bestätigen:
`docs/ado/sprint-<n>.md wurde angelegt — <Anzahl> Tasks, davon <X> neu / <Y> existierend.`

Kein automatischer `git commit` — der User entscheidet.

---

## Qualitätsregeln

- Jeder Task bekommt einen eigenen Abschnitt — keine Gruppierung
- „existierend" immer mit konkretem Dateipfad / Endpunkt-URL belegen
- „neu" mit Hinweis auf zu erstellende Dateien / Struktur
- Keine Implementierungsannahmen ohne Codebase-Evidenz aus dem Planning Inventory
```

---

## Reihenfolge der Implementierung

1. Task 1 (commit-message) — eigenständig, kein Abhängigkeit
2. Task 2a + 2b parallel (SKILL.md + slice-impact.md erstellen)
3. Task 2c + 2d parallel (angular.md + dotnet.md aktualisieren) — nach 2b (slice-impact.md muss existieren)
4. Task 3a + 3b parallel (SKILL.md + op-sprint-analyse.md)

Commit nach jedem Task — kein automatischer Push.
