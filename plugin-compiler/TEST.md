# Lokaler Test-Deploy

Ziel: das vollständig aus `plugin-compiler/src` erzeugte `dv-forge` und den angular-Prototyp aus `plugin-compiler/dist/` lokal installieren und ausprobieren. Alle Befehle laufen im Repo-Wurzelordner `Dv.Ai.Development` auf dem Branch `exp/plugin-compiler`.

## 0. Bauen und prüfen

```bash
pip install -r plugin-compiler/requirements.txt   # pyyaml, jinja2, jsonschema
plugin-compiler/tools/smoke.sh
```

Erwartet, in dieser Reihenfolge:

```text
== 1/4 build (enthält die Äquivalenzprüfung dist/forge ↔ plugins/forge)
build: 369 Dateien nach dist/ geschrieben.
  dv-forge: 68 Quellen, 22 Partials, 26 Regeln als Daten, 276 Assets; 348 Dateien wortgleich zum Bestand (ohne Kopfzeile).
  angular: 5 Etappen, 27 geteilte Regeln, 3 eigene.
  40 Warnungen.
== 2/4 dist/ unverändert gegenüber git
dist/ entspricht dem eingecheckten Stand.
== 3/4 claude plugin validate --strict
√ Validation passed        (Marketplace, angular, forge)
== 4/4 forge-Testsuite gegen dist/forge
# tests 2143 / # pass 2142 / # fail 0 / # skipped 1
smoke: ok
```

Die 40 Warnungen sind Befunde im Bestand, kein Fehler des Builds: offene Begründungen bei Regeln, zwei ungültige YAML-Frontmatter, Reviewer mit Bash usw. Die Liste steht in INVENTORY.md, Abschnitt 6.

## 1. Installieren

Das erzeugte Plugin heißt wie das bestehende `dv-forge`, weil Skripte, Hooks und Texte den Namen fest enthalten (`/dv-forge:…`, `<git-common-dir>/dv-forge/…`). Zwei aktive Plugins mit demselben Namen kollidieren. Deshalb zuerst das bestehende abschalten:

```text
/plugin uninstall dv-forge@dv-ai-development
/plugin marketplace add ./plugin-compiler/dist
/plugin install dv-forge@dv-plugin-compiler-demo
/plugin install angular@dv-plugin-compiler-demo
```

Danach Claude Code neu starten, damit Hooks und Agents geladen werden.

Prüfen:
- Die Skill-Liste zeigt dieselben 19 `/dv-forge:…`-Skills wie bisher.
- `/agents` zeigt 28 `dv-forge:…`-Agents.
- Jede erzeugte Datei trägt nach dem Frontmatter die Zeile `<!--GENERIERT-nicht-editieren:src/forge/…-->`, z. B. `~/.claude/plugins/…/dv-forge/skills/spec-review/SKILL.md`.

## 2. dv-forge: Schritt für Schritt

Erwartung überall: dasselbe Verhalten wie das bisherige dv-forge 0.33.0. Die Äquivalenzprüfung belegt, dass jeder Text wortgleich ist.

| # | Aufruf | Erwartung |
|---|---|---|
| 1 | `/dv-forge:init` in einem Testprojekt | Prüft Stolperfallen (`setup-check.js`), fragt die Schlüssel einzeln ab und schreibt `## dv-forge` in die Projekt-`CLAUDE.md`. Der Skill ist der einzige mit `disable-model-invocation: true`. |
| 2 | `/dv-forge:spec-review docs/x/spec.md` ohne `--debug` | Der Hook `stage-guard.js` / `guard-orchestrator.js prompt` lehnt den getippten Unter-Skill ab und nennt den Startbefehl `/dv-forge:session-orchestrator`. |
| 3 | `/dv-forge:spec-review docs/forge/2026-11-03-aufgabenliste/spec.md --debug` (Fixture unten) | Fünf Spec-Reviewer starten parallel (`dv-forge:spec-review-*`), danach Nacharbeit, Nachprüfer und Scout. Letzte Zeile: `Review abgeschlossen: … · FOLLOWUP … · Bericht: …`. Laut `plugins/forge/evals/spec-review-flawed.json` mindestens 🔴 an AC-01/AC-04 (Widerspruch), 🔴 an „Export“ (fehlendes Verhalten), 🟡 an AC-03 und AC-05. |
| 4 | `/dv-forge:session-orchestrator` mit einer kleinen Idee, z. B. „Aufgabenliste als CSV exportieren“ | Die Leit-Session startet die Etappe Whiteboarding in einer eigenen Session (Modell Sonnet). Danach folgen Grill und Spec-Review, dann der Haltepunkt `spec` mit der Wahl Planning oder Spec-Nacharbeit. Danach Planning (Opus) und der Haltepunkt `go`. Ablauf und Modelle stehen in `src/forge/etappen.yaml`; der Build gleicht sie mit dem Code ab. |
| 5 | Am Haltepunkt `go` „GO“ | Umsetzung über `implementation-orchestrator` (Implementer, Task-Reviewer, Implementierungs-Review), danach Abschluss mit `finish-work`. Gepusht wird erst nach deinem Ja. |

Testmaterial für Schritt 3:

```bash
mkdir -p docs/forge/2026-11-03-aufgabenliste
cp plugins/forge/tests/fixtures/flawed-spec.md docs/forge/2026-11-03-aufgabenliste/spec.md
```

Hinweis zu Schritt 4: Die Session-Kette startet Etappen über `mcp__ccd_session__start_session`. Das gibt es nur in der Claude-Desktop-App mit Sessions; in der reinen CLI bleibt Schritt 3 der Weg.

## 3. angular (Prototyp aus dem gemeinsamen Kern)

| Aufruf | Erwartung |
|---|---|
| `/angular:ablauf` | Tabelle mit 5 Etappen (Spec, Grill, Spec-Review, Plan, Plan-Review), Befehl, Eingang, Artefakt, Gate; Profil `angular` mit drei Planungs-Skills aus dv-angular. |
| `/angular:grill docs/forge/gibt-es-nicht/spec.md` | Der Hook `gate-grill.sh` blockiert mit Exit 2: `spec.md nicht gefunden: …` plus Regel R-050 und ihre Begründung. |
| `/angular:spec-review docs/forge/2026-11-03-aufgabenliste/spec.md` | Ein Reviewer `angular:spec-review` (nur `Read`) läuft. Daneben entsteht `spec-review.md` mit `Verdict: NEEDS_CHANGES` und Befunden nach Severity. |
| `/angular:plan …/spec.md` ohne `spec-review.md` daneben | blockiert: `spec-review.md nicht gefunden`. |
| `/angular:plan …` mit Bericht | Plan mit `## Global Constraints`; Verifikationen als `dv-angular-test --root <Workspace> …` (R-201). |

## 4. Aufräumen

```text
/plugin uninstall dv-forge@dv-plugin-compiler-demo
/plugin uninstall angular@dv-plugin-compiler-demo
/plugin marketplace remove dv-plugin-compiler-demo
/plugin install dv-forge@dv-ai-development
```

```bash
rm -rf docs/forge/2026-11-03-aufgabenliste
```

## Was verifiziert ist und was nicht

- **Verifiziert:** Build mit allen Prüfungen. Äquivalenz: alle 348 Dateien des bestehenden forge entstehen wortgleich. Die forge-Testsuite gegen `dist/forge` (2142 grün, 1 übersprungen, wie im Original). `claude plugin validate --strict` für Marketplace und beide Plugins. Die Gate-Skripte des angular-Prototyps mit nachgestellten Hook-Eingaben.
- **Nicht verifiziert:** Installation und Aufrufe in einer interaktiven Session; die Session-Kette über die Desktop-App.
- **Bewusste Abweichungen vom Bestand:** `author` in `plugin.json` (für `--strict`), `description` in `hooks.json` und die Kopfzeile je Markdown-Datei. Die Äquivalenzprüfung lässt genau diese drei zu, sonst nichts.
