# Dv.Ai.Development — Claude Code Guide

Dieses Repo enthält **eigene Skills / MCP-Server** für Angular/.NET-Entwicklung, aufbauend auf dem Superpowers-Plugin und Context7.

---

## Voraussetzung: Plugins global installieren

### Superpowers

```
/plugin install superpowers@claude-plugins-official
```

Superpowers liefert den Prozess-Rahmen (Planung, TDD, Debugging, Review, …).
Die Skills in `.claude/skills/` sind domänenspezifische Ergänzungen dazu.

Das Submodul `.claude/plugins/superpowers/` ist eine **reine Lese-Referenz** — nicht von Claude geladen.
Beim Entwickeln eigener Skills zuerst die relevante Superpowers-Quelldatei lesen:
`.claude/plugins/superpowers/skills/<name>/SKILL.md`

### Context7

```
/plugin install context7@claude-plugins-official
```

Context7 liefert aktuelle Bibliotheks-Dokumentation direkt in den Kontext — verhindert veraltetes API-Wissen bei Angular, .NET, und weiteren Abhängigkeiten.
Details: https://claudedirectory.org/plugins/context7

---

## MCP-Konfiguration

| Server | Transport | Details |
|--------|-----------|---------|
| `build-log-filter` | Docker HTTP | Port 8089 |
| `codebase-analyzer` | Node stdio | `C:\Develop\.apps\codebase-analyzer\index.js` |
| `dev-mcp` | stdio | `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe` |

**Pfad-Konvention:** Windows-Absolutpfad `C:\Develop\...` — kein `/workspace/`, keine relativen Pfade.

---

## MCP-First (immer aktiv)

| Aufgabe | Erster Griff |
|---------|-------------|
| Symbol / Datei suchen | `dev-mcp`: `find_file`, `find_by_content` |
| Klasse / Methode lesen | `dev-mcp`: `read_class_summary`, `read_signatures_only`, `read_method` |
| Index / Abhängigkeiten | `codebase-analyzer`: `find_in_index`, `index_project` |
| Angular-Tests ausführen | `dev-mcp`: `test_angular_project` — niemals via Shell/PowerShell |
| .NET-Tests ausführen | `dev-mcp`: `test_dotnet_solution` — immer `test_project_path` angeben |
| Native Read / Grep | nur als dokumentierter Fallback nach MCP-Versuch |

---

## Skill-Erstellung

Neue Skills nach den Konventionen von Superpowers `writing-skills` erstellen:
**https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md**

Pflicht-Konventionen (Kurzfassung):

- Frontmatter: nur `name` + `description`; `description` beginnt mit „Use when…" — **nie** Ablauf zusammenfassen
- SKILL.md-Body: schlank (ToC + generischer Ablauf); Details in `references/` auslagern
- Token-Effizienz: < 500 Wörter für normale Skills; häufig geladene Skills < 200 Wörter
- Kein `@`-Link auf andere Dateien im Skill-Body (lädt sofort und verbrennt Kontext)

---

## Verhaltensregeln

**Git-Status vor Statusaussagen:** `git status` und `git branch` prüfen bevor über Dateiänderungen gesprochen wird. Bei Branch-Divergenz korrekt kommunizieren.

**Konventionsentscheidungen:** Wenn mehr als eine valide Option existiert und die Wahl User-sichtbar ist — Entscheidung in einem Halbsatz nennen, inkl. Alternativ-Hinweis. Nicht fragen, nicht schweigen.

---

## Repo-Struktur

```
.claude/
├── skills/           Eigene domänenspezifische Skills
│   ├── angular/      Angular (developer + material + new-app) — SKILL.md = ToC
│   ├── dotnet/       .NET (EF Migrations) — SKILL.md = ToC
│   └── ...           Weitere Skills (acceptance-design, requirement-definition, …)
├── agents/           Eigene Sub-Agent-Profile
├── references/       Geteilte Referenzen
└── plugins/
    ├── superpowers/  Git-Submodul obra/superpowers (Lese-Referenz)
    └── caveman/      Git-Submodul JuliusBrussee/caveman (Lese-Referenz)

Mcp-Servers/          MCP-Server Implementierungen
├── Build.Log.Filter.Mcp/
├── Codebase.Analyzer.Mcp/
└── Dev.Mcp/Dev.Mcp/
```
