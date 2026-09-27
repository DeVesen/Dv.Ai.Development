---
name: init
description: Use when dv-forge is used in a project for the first time, when the project CLAUDE.md has no or an outdated dv-forge section, or when a dv-forge skill reports a missing project setting such as storage paths, worktree, workitem numbers or planning skills.
disable-model-invocation: true
---

# dv-forge einrichten

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du schreibst die Projekt-Einstellungen in den Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`. Alle dv-forge-Skills und Scripts lesen nur dort. Du änderst nichts anderes.

## Ablauf
1. `node "<PLUGIN>/scripts/forge-config.js" show`. Jede Zeile ist `<Schlüssel>=<Wert>`; `(Default)` heißt: noch nicht gesetzt.
2. Je Schlüssel der Tabelle, in dieser Reihenfolge, eine Frage pro Nachricht: aktueller Wert, dein Vorschlag mit einem Satz Grund. Den Vorschlag leitest du aus dem Projekt ab: vorhandene Ordner, Build-Dateien, installierte Skills. „Passt“ übernimmt den Vorschlag. Bei `Worktree: nein` entfällt `Worktree-Ordner`.
3. Den Abschnitt im Format unten schreiben. Einen vorhandenen `## dv-forge`-Abschnitt ersetzt du vollständig, sonst hängst du ihn ans Ende der Datei.
4. `forge-config.js show` erneut ausführen und das Ergebnis melden. Commit anbieten, erst nach Ja committen.

## Schlüssel
| Schlüssel | Wert | Default |
|---|---|---|
| `Spec-Ablage` | Pfad-Muster mit `<datum>` und `<slug>` | `docs/forge/<datum>-<slug>/spec.md` |
| `Plan-Ablage` | Pfad-Muster, `<spec-ordner>` erlaubt | `<spec-ordner>/plan.md` |
| `Glossar` | Ordner | `docs/glossary` |
| `Profile` | Ordner der Modul- und Feature-Profile | wie `Glossar` |
| `Workitem` | `keine` oder Muster, z. B. `AB#\d+` | `keine` |
| `Worktree` | `ja` = Worktree vor der Umsetzung | `nein` |
| `Branch-Schema` | Muster mit `<slug>`, optional `<workitem>` | `feature/<slug>` |
| `Worktree-Ordner` | relativ zur Projektwurzel | `../<repo>-worktrees` |
| `Planungs-Skills` | Skill-Namen, mit Komma getrennt | leer: Plan-Writing fragt |
| `Build`, `Test`, `Lint` | Befehl oder Tool, z. B. `dev-mcp: test_dotnet_solution` | leer |
| `Suche` | Such- und Index-Werkzeuge | leer |
| `Commit-Konvention` | Regel oder Skill, z. B. `commit-message` | leer |

## Format
```markdown
## dv-forge

- Spec-Ablage: `docs/forge/<datum>-<slug>/spec.md`
- Worktree: ja
- Planungs-Skills: unit-integration-testing, software-design-principles
```

Alle Schlüssel der Tabelle, je eine Zeile, genau `- <Schlüssel>: <Wert>`. Ein bewusst leerer Wert bleibt als `- <Schlüssel>:` stehen. Muster schreibst du mit Platzhaltern, nie aufgelöst: `../<repo>-worktrees`, nicht der Ordnername aus `show`. Werte mit `<` oder `\` in Backticks.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Alle Fragen in einer Nachricht | Eine Frage pro Nachricht. |
| Eigene Schlüssel oder Überschriften erfinden | Nur die Schlüssel der Tabelle, Überschrift genau `## dv-forge`. |
| Einstellungen in eine andere Datei schreiben | Nur die Projekt-`CLAUDE.md` im Repo-Wurzelordner. |
