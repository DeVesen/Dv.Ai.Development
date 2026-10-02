---
name: init
description: Use when dv-forge is used in a project for the first time, when the project CLAUDE.md has no or an outdated dv-forge section, when a dv-forge skill reports a missing project setting such as storage paths, worktree, workitem numbers or planning skills, or when project rules or skills may still use tools that no longer exist or the old dv-forge `<stack>-<kommando>` spelling of build, test and lint commands.
disable-model-invocation: true
---

# dv-forge einrichten

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du räumst zuerst Stolperfallen aus dem Projekt-Setup und schreibst dann die Projekt-Einstellungen in den Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`. Alle dv-forge-Skills und Scripts lesen nur dort. Andere Stellen änderst du nur, wenn der Mensch sie einzeln freigibt.

## Ablauf
1. **Stolperfallen:** `node "<PLUGIN>/scripts/setup-check.js"`. Es listet je Datei, was dv-forge ausbremst, etwa Tools, die es nicht mehr gibt, oder die alte Schreibweise `dv-forge: <stack>-<kommando>`. Je Datei eine Nachricht: Fundstellen, Grund, Vorschlag. Der Mensch wählt: **alle nach Vorschlag**, **einzeln** oder **behalten**. Erst nach der Antwort änderst du, nur die genannten Zeilen. Globale Funde unter `~/.claude` änderst du nicht, du nennst nur die Quelle. Danach `setup-check.js` erneut, Rest melden.
2. `node "<PLUGIN>/scripts/forge-config.js" show`. Jede Zeile ist `<Schlüssel>=<Wert>`; `(Default)` heißt: noch nicht gesetzt.
3. Je Schlüssel der Tabelle, in dieser Reihenfolge, eine Frage pro Nachricht: aktueller Wert, dein Vorschlag mit einem Satz Grund. Den Vorschlag leitest du aus dem Projekt ab: vorhandene Ordner, Build-Dateien, installierte Skills. „Passt“ übernimmt den Vorschlag. Bei `Worktree: nein` entfällt `Worktree-Ordner`.
4. Den Abschnitt im Format unten schreiben. Einen vorhandenen `## dv-forge`-Abschnitt ersetzt du vollständig, sonst hängst du ihn ans Ende der Datei.
5. `forge-config.js show` erneut ausführen und das Ergebnis melden. Commit anbieten, erst nach Ja committen.

## Schlüssel
| Schlüssel | Wert | Default |
|---|---|---|
| `Spec-Ablage` | Pfad-Muster mit `<datum>` und `<slug>` | `docs/forge/<datum>-<slug>/spec.md` |
| `Plan-Ablage` | Pfad-Muster, `<spec-ordner>` erlaubt | `<spec-ordner>/plan.md` |
| `Glossar` | Ordner | `docs/glossary` |
| `Profile` | Ordner der Modul- und Feature-Profile | wie `Glossar` |
| `Workitem` | `keine` oder Muster, z. B. `AB#\d+` | `keine` |
| `Worktree` | `ja` = Worktree vor der Umsetzung | `nein` |
| `Branch-Schema` | Muster mit `<slug>`, optional `<workitem>`; `<slug>` = Plan-Dateiname ohne Datum und ohne doppelte Workitem-Nummer | `feature/<slug>` |
| `Worktree-Ordner` | relativ zur Projektwurzel | `../<repo>-worktrees` |
| `Planungs-Skills` | Skill-Namen, mit Komma getrennt; `<skill> @<pfad>` nur, wenn der Plan `<pfad>` berührt | leer: Plan-Writing fragt |
| `Build`, `Test`, `Lint` | Befehl, z. B. `npm test`; mehrere mit ` ; ` | leer |
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
| Eigene Schlüssel oder Überschriften erfinden | Nur die Schlüssel der Tabelle, Überschrift genau `## dv-forge`. |
| Einstellungen in eine andere Datei schreiben | Nur die Projekt-`CLAUDE.md` im Repo-Wurzelordner. |
