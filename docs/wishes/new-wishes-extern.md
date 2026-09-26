# Wünsche extern — was nicht direkt zum dv-forge-Plugin gehört

Zusammenfassung der Erfahrungsberichte `1.md`–`5.md` (dv-forge 0.4.0, Läufe vom 2026-09-25), geprüft am 2026-09-26.
Hier stehen Ursachen und Wünsche, die außerhalb von `plugins/forge` liegen: Harness, Nachbar-Plugins, Stil-Hooks, MCP-Regeln, das Zielprojekt und allgemeines Agentenverhalten.

- **Quellen:** `<Bericht>.<Punkt>`, z. B. `1.11` = `1.md`, Punkt 11; `1.K4` = `1.md`, Kleinigkeiten, vierte Zeile.
- **Wo umsetzen:** Ort, an dem sich der Wunsch beheben lässt.
- **Intern:** Workaround in dv-forge, siehe `new-wishes-intern.md`.

---

## E1. Claude-Code-Harness

### E1.1 Subagent-Antworten kommen als eigene Nachrichten

- **Quellen:** 3.7, 5.7
- **Beobachtung:** Die Ergebnisse der Reviewer kommen nicht als Rückgabewert des `Agent`-Aufrufs, sondern als eigene Nachrichten in beliebiger Reihenfolge. Fehlt der JSON-Block, fehlt auch das Feld `reviewer`, und der Orchestrator muss über die Agent-ID zuordnen.
- **Wo umsetzen:** Nicht beeinflussbar, Verhalten der Harness.
- **Intern:** Q2 (Ergebnis per Datei, Kopfzeile `REVIEWER: <name>`).

### E1.2 Subagenten fehlen Attribution und Tool-Schemata

- **Quellen:** 1.11
- **Beobachtung:** Die Commit-Attribution (`Co-Authored-By`) aus dem Session-Reminder erreicht Subagenten nicht. Verzögert geladene MCP-Tools muss der Subagent selbst per `ToolSearch` laden. Sonst hält er dev-mcp für nicht erreichbar und bricht laut Projektregel ab.
- **Wo umsetzen:** Nicht beeinflussbar, Verhalten der Harness.
- **Intern:** I7 (Pflichtangaben fest in den Umsetzer).

### E1.3 MCP-Tool-Schemata sind für Reviewer nicht abfragbar

- **Quellen:** 5.5
- **Beobachtung:** buildability konnte falsche MCP-Parameter nur durch Vergleich mit älteren Plänen finden. Das echte Tool-Schema steht dem Reviewer nicht zur Verfügung.
- **Wo umsetzen:** Harness bzw. MCP-Server. Denkbar ist ein Schema-Export je MCP-Server, den Reviewer lesen können.
- **Intern:** P3 (Abgleich mit dem echten Tool-Schema).

### E1.4 `spec-whiteboarding` fehlt in der Skill-Liste

- **Quellen:** 4.15
- **Beobachtung:** Der Skill ist im Plugin-Cache installiert (`~/.claude/plugins/cache/dv-ai-development/dv-forge/0.4.0/skills/spec-whiteboarding/`) und hat als einziger regulärer dv-forge-Skill kein `disable-model-invocation`. Trotzdem steht er nicht in der Skill-Liste der Session, `domain-modeling` dagegen schon. Laden lässt er sich.
- **Wo umsetzen:** Ursache offen. Prüfen, ob die Harness die Liste kürzt (die `description` ist mit 539 Zeichen sehr lang) oder ob ein anderer Filter greift. Falls die Länge die Ursache ist, lässt sich das intern durch eine kürzere `description` lösen.

---

## E2. dv-working-capturing (Nachbar-Plugin, `plugins/working-capturing`)

### E2.1 Ort von Glossar und Profilen abfragbar machen

- **Quellen:** 4.10, 2.11
- **Beobachtung:**
  - `domain-modeling` erwartet den Ort in der Projekt-`CLAUDE.md`. Die nannte keinen.
  - Eine Suche nach `glossary*.md` fand nichts, weil das Glossar ein Ordner mit mehreren Dateien ist.
  - Gesucht wird an zwei Orten (Ort laut `CLAUDE.md` bzw. `docs/glossary`, dazu `docs/application/**`). Im Projekt lagen dort gleichnamige Dateien mit unterschiedlichem Inhalt.
  - Der Fallback `docs/glossary/` steht in `working-capturing/skills/glossary/SKILL.md:53`, für Modul- und Feature-Profile fehlt ein solcher Fallback.
- **Wunsch:**
  - working-capturing liefert den Ort von Glossar und Profilen an einer Stelle, z. B. per Script oder festem Eintrag, statt ihn aus der `CLAUDE.md` zu erwarten.
  - Einen Fallback auch für Modul- und Feature-Profile festlegen.
  - Beim Erfassen vor gleichnamigen Profil-Dateien an mehreren Orten warnen.
- **Wo umsetzen:** `plugins/working-capturing`.
- **Intern:** S9 (domain-modeling), R1 (Dubletten im spec-review).

### E2.2 Glossar-Stand hängt am Branch

- **Quellen:** 4.10
- **Beobachtung:** Die passenden Glossar-Einträge standen nur auf einem anderen Branch als dem ausgecheckten und mussten per `git show <branch>:<pfad>` gelesen werden.
- **Wunsch:** working-capturing sagt, wie mit einem Glossar umzugehen ist, das auf verschiedenen Branches unterschiedlich weit ist, z. B. gegen welchen Branch gelesen und erfasst wird.
- **Wo umsetzen:** `plugins/working-capturing`.

---

## E3. Stil-Plugins und Output-Hooks

- **Quellen:** 1.13, 4.8
- **Beobachtung:** Der caveman-Stil (starke Kürzung) und der ADHD-Output-Hook (höchstens 5 Listenpunkte, keine Zusammenfassung, erste Zeile = nächste Aktion) kollidieren mit festen dv-forge-Formaten: Abschlussbericht mit allen `Urteil:`-Zeilen, Rundenformat, Übergabe mit „genau diesen drei Punkten“. Der Agent löste das uneinheitlich. Mit mehr Tasks wird der Konflikt größer.
- **Wunsch:** Die Stil-Regeln nehmen Formate aus, die ein aktiver Skill vorschreibt. Das kann ein Satz im Hook-Text sein, z. B. „Vom aktiven Skill vorgeschriebene Ausgabeformate haben Vorrang“.
- **Wo umsetzen:** ADHD-Hook in den User-Settings. caveman ist ein Fremd-Plugin (Submodul `.claude/plugins/caveman`, nur Lese-Referenz), dort höchstens als Issue.
- **Intern:** Q9 (Vorrang in den Skills festschreiben, Abschlussbericht als Datei).

---

## E4. MCP-First-Regeln und Konventions-Skills anderer Plugins

### E4.1 Tool-Routing gilt nicht erkennbar in fremden Skill-Abläufen

- **Quellen:** 4.16
- **Beobachtung:** Andere Skills verlangen, Dateien und Symbole über bestimmte MCP-Werkzeuge zu suchen, „kein stiller Fallback“. In der Faktensuche von `spec-whiteboarding` nutzte der Agent trotzdem Grep und Shell-Git, ohne das zu erwähnen.
- **Wunsch:** Die MCP-First-Vorgaben sagen ausdrücklich, ob sie auch innerhalb fremder Skill-Abläufe und in Subagenten gelten. Alternativ setzt ein Hook sie durch, statt dass sie nur als Skill-Text existieren.
- **Wo umsetzen:** Skill `dev-mcp`, Projekt-`CLAUDE.md` (Abschnitt „MCP-First“).
- **Intern:** S8 (Faktensuche verweist auf Projekt-Werkzeuge).

### E4.2 Test-Konventions-Skills werden beim Planen nicht gefunden

- **Quellen:** 2.13
- **Beobachtung:** Für die Vitest-Tests gab es einen eigenen Konventions-Skill (dv-angular). Beim Schreiben des Testcodes im Plan wurde er nicht geladen, Stil und Namen stammen aus der bestehenden Testdatei.
- **Wunsch:** Die `description` der Konventions-Skills triggert auch, wenn Testcode in einem Plan geschrieben wird, nicht nur beim Bearbeiten einer `*.spec.ts`.
- **Wo umsetzen:** `plugins/angular` (`angular-testing-vitest-conventions` u. a.), `plugins/dotnet` (`dotnet-xunit-conventions`).
- **Intern:** P1 (plan-writing lädt die Konventions-Skills).

---

## E5. Zielprojekt (Projekt, in dem dv-forge lief)

Punkte, die im Projekt selbst behoben werden müssen. Sie sind hier festgehalten, weil sie die Läufe gestört haben.

1. **Totes Lint-Gate** (1.2, 1.7): Die Lint-Konfiguration existiert, die Pakete fehlen. Ältere Pläne haben den Lint-Aufruf übernommen, deren Lint-Läufe sind vermutlich genauso still gescheitert. Lint verdrahten oder aus den Vorgaben entfernen.
2. **Zwei Glossar-Ordner** (2.11, 4.10): Gleichnamige Dateien (`domain-terms.md`, `backend-terms.md`) mit abweichendem Inhalt an zwei Orten. Zusammenführen.
3. **Glossar-Ort fehlt in der Projekt-`CLAUDE.md`** (4.10): Ort von Glossar und Profilen eintragen, solange E2.1 nicht umgesetzt ist.
4. **Worktree-Pflicht zu weit gefasst** (4.2): Die Regel „eigener Branch plus Worktree, sobald eine Workitem-Nummer bekannt ist“ griff schon beim Schreiben der Spec. Auf die Umsetzung eingrenzen.
5. **Transienter Vitest-Worker-Timeout** (1.K4): Ein roter Lauf ohne echtes Testergebnis. Ursache im Test-Setup prüfen, z. B. Worker-Anzahl oder Timeout.

---

## E6. Allgemeines Agentenverhalten

### E6.1 Mehrteilige Regel-Abschnitte vor dem Ändern rückfragen

- **Quellen:** 4.6
- **Beobachtung:** Nach der Spec bat der Mensch, eine Regel aus der Projekt-`CLAUDE.md` zu entfernen. Der Agent löschte den ganzen Abschnitt samt einer unabhängigen zweiten Regel und wies erst danach darauf hin.
- **Wunsch:** Enthält ein Abschnitt mehrere unabhängige Regeln, entfernt der Agent nur die genannte oder fragt vorher nach.
- **Wo umsetzen:** Globale `~/.claude/CLAUDE.md` (Verhaltensregel), unabhängig von dv-forge.
- **Intern:** S8 (Hinweis in der Übergabe, dass Folgeaufträge nicht mehr unter dem Whiteboard-Modus laufen).
