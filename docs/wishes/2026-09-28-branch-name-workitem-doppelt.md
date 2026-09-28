# Erfahrungsbericht Fehlersuche im Branch-Namensschema eines Plugins

**Lauf:** Der Mensch fragte, warum der von dv-forge angelegte Feature-Branch die Workitem-Nummer zweimal enthält. Der Agent verfolgte den Namen durch die dv-forge-Skripte, danach lief `dv-forge:prozess-retrospektive`. Plugin dv-forge 0.7.0, Session-Modell claude-opus-5-5, 2026-09-28.
**Ergebnis:** Ursache gefunden: Der Slug ist 1:1 der Plan-Dateiname, und der schreibt nach Projektregel Datum und Workitem-Nummer schon hinein. Entscheidung des Menschen: das Plugin ändern, nicht die Projekt-Konfiguration. Dauer 4 min, Eingaben des Menschen 3, Tokens neu 38k Hauptsession und 0k Subagents.

## Zahlen
- Dauer: 4 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 3 · API-Anfragen: 7 · Zusammenfassungen: 0
- Tokens Hauptsession: 38k neu gelesen, 518k aus dem Cache, 3k Ausgabe
- Tokens Subagents: 0k in 0 Agents
- Tool-Aufrufe: Grep 3, Bash 3, Skill 1
- Skills: dv-forge:prozess-retrospektive 1
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):
- 1k Tokens · Bash cd "C:/Users/S.Reichert/.claude/plugins/cache/dv-ai-development/dv-forge/0.7.0/s
- 0k Tokens · Bash cd "C:/Users/S.Reichert/.claude/plugins/cache/dv-ai-development/dv-forge/0.7.0/s
- 0k Tokens · Grep Branch-Schema|<slug>|slug
- 0k Tokens · Grep slug|Branch|branch
- 0k Tokens · Grep slug

Mehrfach gelesene Dateien:
- keine

Wiederkehrende Shell-Befehle (ab 3×):
- keine

## MCP-Nutzung
Quelle: `C:\Users\S.Reichert\.claude\projects\C--Develop-Trumpf-LacAtlas-main\4dfa88af-82a5-470e-be11-79992d44b1d6.jsonl` · Hauptagent + 0 SubAgent(s) · 7 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

Verfügbar, aber ungenutzt: 1a59c906-04da-521d-bda7-7f71b9f9e01c, 6f616b42-0ed8-571e-823f-ee4aca6b7ce9, ccd_connectors, ccd_directory, ccd_pr, ccd_session, ccd_session_mgmt, ccd_sidebar, ccd_view, ccd_window, claude-in-chrome, mcp-registry, plugin:context7:context7, plugin_context7_context7, scheduled-tasks, terminal

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Grep | 3 | – | – | Hauptagent (3) |
| Bash | 3 | – | – | Hauptagent (3) |

### Shell-Fallback-Kandidaten (0)

Keine Shell-Aufrufe von dotnet, ng, npm, npx, pnpm, yarn oder git mv.

**Relevanz:**
- dev-mcp: verzichtbar in dieser Session. Gesucht wurde in JavaScript-Dateien des Plugin-Caches außerhalb des Projekts, dafür reichten Grep und `sed`.
- codebase-analyzer: verzichtbar in dieser Session. Der Index deckt das Projekt ab, nicht den Plugin-Cache.
- browser-inspector: verzichtbar in dieser Session, keine UI im Spiel.
- microsoft-learn: verzichtbar in dieser Session, keine Microsoft-API im Spiel.

## Positiv

1. **Ursache mit 6 gezielten Suchaufrufen belegt.** Mit Grep auf `slug`/`Branch-Schema` in den Skill-Texten, dann in den Skripten, landete der Agent direkt bei den zwei Funktionen, die den Namen bauen. 0 Tool-Fehler, 38k neue Tokens, 4 min. Beibehalten: bei Fragen zum Plugin-Verhalten zuerst die Skripte lesen, nicht die Skill-Prosa auslegen.

## Reibung

1. **Das Branch-Schema setzt die Workitem-Nummer doppelt, weil der Slug schon Datum und Nummer enthält.**
   *Situation:* Das Projekt hat die Regel, dass Spec- und Plan-Dateinamen die Form `YYYY-MM-DD-<workitem>-<slug>.md` haben. Die Umsetzung legte dann einen Branch dieser Form an: `feature/<workitem>-<datum>-<workitem>-<slug>`. Der Mensch: „hier ist [Nummer] die workitemnummer aber zwei mal enthalten. nimmt der als <slug> 1:1 den Spec oder plan namen“. Code-Befund:
   - Das Skript `plan-tasks.js`, das Pläne in Tasks zerlegt, gibt in `slugOf()` den Dateinamen ohne Endung zurück, also einschließlich Datum und Workitem-Nummer.
   - Das Skript `forge-config.js`, das die dv-forge-Einstellungen des Projekts liest, ersetzt in `branchFor()` im Schema `<slug>` durch genau diesen Wert und `<workitem>` durch die Nummer aus der `Workitem:`-Zeile der Spec.
   - Das Skript `work.js`, das Branch und Worktree anlegt, baut den Worktree-Ordner als `<Worktree-Ordner>/<branch>`. Der Worktree-Ordner hat die Nummer also ebenfalls doppelt.

   Ältere, von Hand angelegte Branches im selben Repository haben die Form `feature/<workitem>-<kurzname>`, ohne Datum.
   *Kosten:* 1 Rückfrage des Menschen, 4 min Ursachensuche. Dazu ein Branch-Name mit 60 Zeichen statt rund 40, der nicht zur bestehenden Namenskonvention passt und im Remote dauerhaft so stehen bleibt, sobald er gepusht ist.
   *Ursache:* dv-forge kennt nur Slug und Workitem. Es weiß nicht, dass der Dateiname nach Projektregel schon Datum und Nummer trägt. Der Slug wird nirgends normalisiert.
   *Besser gewesen:* Das Plugin trennt beim Ermitteln des Slugs ein führendes Datum `YYYY-MM-DD-` und die Workitem-Nummer ab, bevor es den Slug ins Branch-Schema setzt. Aus `<datum>-<workitem>-<kurzname>` wird `<kurzname>`, der Branch heißt `feature/<workitem>-<kurzname>`.
   *Vorschlag:*
   1. `branchFor()` (oder eine eigene Funktion, die es vorher aufruft) entfernt ein führendes `^\d{4}-\d{2}-\d{2}-` und danach ein führendes Vorkommen der Workitem-Nummer samt Trennzeichen. Die Nummer wird dabei mit dem konfigurierten `Workitem`-Muster erkannt, z. B. `#\d{6}` ohne `#`.
   2. Dateinamen ohne Datum oder Nummer bleiben unverändert (rückwärtskompatibel).
   3. Workspace, Base-Tag (`forge-base/<slug>`) und Ledger nutzen weiter den vollen Slug. Sie sind intern und brauchen die Eindeutigkeit über das Datum. Nur Branch und Worktree-Ordner bekommen die gekürzte Form.
   4. `work.js start` findet einen bereits angelegten Branch mit der alten, doppelten Form weiterhin (`fortgesetzt`), damit laufende Arbeit nicht verwaist. Alternativ eine klare Meldung.
   5. Tests: Dateiname mit Datum und Nummer, nur mit Datum, nur mit Nummer, ohne beides, Ordnerform `…/<slug>/plan.md`.
   *Ziel:* Skript · `dv-forge/scripts/forge-config.js` (`branchFor`), betroffen auch `work.js` (Worktree-Ordner)
   *Im Projekt:* Branch `feature/307326-2026-09-28-307326-result-status-in-progress` aus Plan `docs/plans/2026-09-28-307326-result-status-in-progress.md` und Spec `docs/specs/2026-09-28-307326-result-status-in-progress.md`. Konfiguration in `CLAUDE.md`: `Branch-Schema: feature/<workitem>-<slug>`, `Workitem: #\d{6}`, `Worktree-Ordner: .claude/worktrees`. Die Projektregel „Ablage: Specs und Pläne“ schreibt die Nummer in den Dateinamen vor. Bestehende Branches z. B. `feature/304980-seam-dimension-picker`.

## Sparpotenzial

Keine nennenswerten Punkte. 38k neue Tokens, keine Wiederholungen, kein Tool-Ergebnis über 1k Tokens.

## Neue Ideen

- keine

## Kleinigkeiten

- Der dv-forge-Konfigurationsblock in der Projekt-`CLAUDE.md` nennt als Ablage `docs/specs/<datum>-<slug>.md` bzw. `docs/plans/<datum>-<slug>.md`. Die Projektregel weiter oben verlangt `<datum>-<workitem-nr>-<slug>`. Das hat den Fehler nicht ausgelöst, zeigt aber die Unschärfe: Für dv-forge ist „slug“ alles nach dem Datum, für den Menschen nur der Kurzname. · Eindruck
- Die Beschreibung von `Branch-Schema` im Plugin sollte festhalten, was `<slug>` genau enthält, damit Projekte ihr Schema passend wählen. · Eindruck
