# Scout-Protokoll (Referenz fuer plan-agent-scout)

Routing-Kette und Protokoll-Format fuer alle Scout-Phasen in feature-delivery (Phase 3).

---

## Routing-Matrix

| Situation | Erster Schritt | Zweiter Schritt | Dritter Schritt |
|-----------|----------------|-----------------|-----------------|
| Symbol/Bereich **unbekannt** (.cs/.ts) | Index: `index_project` auf richtiges MCP-Pfad / `.csproj` | `find_in_index` (selbes projectPath) | Filesystem: `find_by_content` oder `find_file` |
| Symbol/Pfad **bekannt** (Task, Handoff, Treffer) | Filesystem: `read_class_summary` / `read_signatures_only` / `read_method` | optional Index fuer Abhaengigkeiten | — |
| Interface-Implementierungen | Filesystem: `find_implementations` | — | — |
| Multi-.csproj Backend ohne funktionierendes `index_solution` | Mehrere `index_project` (Projekt-MCP-Pfad-Routing) | `find_in_index` pro `.csproj` | Filesystem |
| Index-Hinweis "use index_solution" | **Nur** wenn Projekt-MCP-Pfad-Dokumentation `index_solution` freigibt | `index_solution` | sonst: konkretes `.csproj` indexieren |
| **Workflow-Artefakt** (Skill, Agent, Package, `SKILL.md`) | `Glob` unter Projektverzeichnis | `Read` der Treffer | `Grep` nur fuer Querverweise |
| Deploy-/Install-Doku | `Glob` + `Read` | — | — |

**UI-only** (Button-Label ohne Symbol): kein Index-Zwang.

---

## Hard Rules

1. **Nach leerem `find_in_index`:** mindestens ein Filesystem-MCP-Versuch (`find_by_content` oder `find_file`) **bevor** natives Read/Grep auf Klassennamen.
2. **`index_project`-Hinweis auf Solution:** `index_solution` **nur** wenn Projekt-MCP-Pfad-Dokumentation `index_solution: allowed` — sonst `.csproj` via `index_project`.
3. **MCP erreichbar:** Read/Grep **nicht** als Ersatz fuer MCP in Scout-Phasen.
4. **Schema-Pflicht:** Parameter exakt wie im MCP-Deskriptor; beide MCPs: Windows-Absolutpfad `C:\...` — kein `/workspace/`.
5. **Pfad-Kanon:** Projekt-MCP-Pfad-Dokumentation ist verbindlich — nicht aus dem Gedaechtnis ableiten.

---

## Erlaubter Fallback (Read/Grep)

Nur wenn:
- mehrere Strategien aus der Routing-Matrix versucht wurden, **und**
- unter `### Warnungen` dokumentiert: welcher MCP, welches Tool, Ergebnis/Fehler, **und**
- kurze Begruendung, warum kein weiterer MCP sinnvoll ist.

**Hard Stop:** benoetigter Server nicht in Tool-Liste → Scout nicht als abgeschlossen markieren; Nutzer auf MCP-Konfiguration hinweisen.

Statuszeile: `MCP: ok` oder `MCP: fallback (<Grund>)`.

---

## Scout-Protokoll (Pflicht-Ausgabe)

Jede Scout-Antwort enthaelt:

```markdown
## Scout-Protokoll

| # | Ziel / Repo-Frage | Strategie | MCP | Tool | Ergebnis | Naechster Schritt |
|---|-------------------|-----------|-----|------|----------|------------------|
| 1 | … | index | codebase-analyzer | find_in_index | 0 Treffer | → find_by_content |
| 2 | … | filesystem | dev-mcp | find_by_content | 3 Dateien | → read_class_summary |

**Status:** MCP: ok | MCP: fallback (<Grund>)
**Fallback Read/Grep:** ja/nein — Begruendung
```

Ohne vollstaendige Tabelle: Scout **nicht** als abgeschlossen markieren.

**plan-agent-scout:** Scout-Protokoll als Deliverable-Abschnitt **0b** (nach MCP-Analyse-Status).

---

## Ablauf-Checkliste (pro Repo-Frage)

1. Projekt-MCP-Pfad-Dokumentation pruefen (fehlt → Default: `codebase-analyzer`).
2. Routing-Matrix: Situation zuordnen.
3. Schema lesen → MCP-Call.
4. Zeile in Scout-Protokoll eintragen.
5. Ergebnis leer/Fehler → naechste Strategie aus Matrix, nicht sofort Grep.
6. Alle Repo-Fragen bearbeitet → Scout-Protokoll + Status abschliessen.
