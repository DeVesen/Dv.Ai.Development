# Lokaler Test-Deploy

Ziel: die erzeugten Plugins `forge` und `angular` aus `plugin-compiler/dist/` lokal installieren und je Etappe einmal aufrufen. Alle Befehle laufen in einer Claude-Code-Session im Repo-Wurzelordner `Dv.Ai.Development`, auf dem Branch `exp/plugin-compiler`.

## 0. Bauen und prüfen

```bash
pip install -r plugin-compiler/requirements.txt   # pyyaml, jinja2, jsonschema
plugin-compiler/tools/smoke.sh
```

Erwartet: `build: 41 Dateien nach dist/ geschrieben; 2 Plugins, 27 geteilte Regeln, 5 plugin-spezifische, 11 Warnungen.`, danach `dist/ entspricht dem eingecheckten Stand.`, zweimal bzw. dreimal `√ Validation passed` und `smoke: ok`. Die 11 Warnungen sind die Regeln, deren Begründung in der Quelle fehlt (`TODO(…)`).

## 1. Installieren

```text
/plugin marketplace add ./plugin-compiler/dist
/plugin install forge@dv-plugin-compiler-demo
/plugin install angular@dv-plugin-compiler-demo
```

Danach Claude Code neu starten (oder `/reload-plugins`, falls vorhanden), damit Hooks und Agents geladen werden.

Prüfen: `/help` bzw. die Skill-Liste zeigt `/forge:spec`, `/forge:grill`, `/forge:spec-review`, `/forge:plan`, `/forge:plan-review`, `/forge:ablauf` und dieselben sechs für `/angular:`. `/agents` zeigt `forge:spec-review`, `forge:plan-review`, `angular:spec-review`, `angular:plan-review`.

Hinweis: Das bestehende `dv-forge` und `dv-angular` aus dem Marketplace `dv-ai-development` stören nicht; ihre Befehle heißen `/dv-forge:…` und `/dv-angular:…`.

## 2. Testmaterial

Die forge-Golden-Sets liefern Specs und Pläne mit eingebauten, dokumentierten Mängeln (`plugins/forge/evals/*.json`):

```bash
mkdir -p docs/forge/2026-11-03-aufgabenliste docs/forge/2026-11-03-bestellung docs/forge/2026-11-03-bestellung-review
cp plugins/forge/tests/fixtures/flawed-spec.md        docs/forge/2026-11-03-aufgabenliste/spec.md
cp plugins/forge/tests/fixtures/plan-review/spec.md   docs/forge/2026-11-03-bestellung/spec.md
cp plugins/forge/tests/fixtures/plan-review/spec.md   docs/forge/2026-11-03-bestellung-review/spec.md
cp plugins/forge/tests/fixtures/plan-review/plan.md   docs/forge/2026-11-03-bestellung-review/plan.md
```

Diese Dateien nach dem Test wieder löschen; sie gehören nicht in den Branch.

## 3. Je Etappe ein Aufruf

### Übersicht

| Aufruf | Erwartung |
|---|---|
| `/forge:ablauf` | Tabelle mit 5 Etappen, Befehl, Eingang, Artefakt, Gate; Profil `generic`. |
| `/angular:ablauf` | Dieselbe Tabelle; Profil `angular` mit Planungs-Skills `dv-angular:toolchain`, `dv-angular:angular-testing`, `dv-angular:angular-project-layout`. |

### Spec

`/forge:spec Ich will die Aufgabenliste als CSV exportieren können.`

Erwartet:
- Zuerst höchstens die Rahmenfrage nach der Workitem-Nummer (nur wenn das Projekt Workitem-Nummern nutzt).
- Dann eine Grill-Runde mit allen offenen Fragen auf einmal, je Frage `❓ **Q<n>** - **<Titel>**: …` und `➡️ <Empfehlung> · <Beleg-Tag> — <Grund>`; gibt es etwas selbst zu entscheiden, steht davor ein Block `Selbst entschieden:`.
- Kein Blick in Code oder Git, kein Plan, kein Auswahldialog.
- Erst bei leerer Frontier ein vollständiger Entwurf mit Titel und Slug; geschrieben wird erst nach deinem „ja“, nach `docs/forge/<datum>-<slug>/spec.md`.
- Ende: genau Pfad und Branch, kein Commit, kein nächster Schritt.
- forge: Ton per Du, kurz (R-101). angular: dieselbe Etappe ohne R-101 im Skill (`dist/angular/skills/spec/SKILL.md` vergleichen).
- Kein Hook, denn die Etappe hat kein Pflichtartefakt.

### Grill

1. Gate: `/forge:grill docs/forge/gibt-es-nicht/spec.md`
   Erwartet: Der Prompt wird blockiert, bevor Claude antwortet. Meldung `forge gate-grill: Pflichtartefakte fehlen. - spec.md nicht gefunden: …` plus `R-050 Pflichtartefakte vor dem Start: …`.
2. `/forge:grill` ohne Argument → blockiert mit `Pfad zu spec.md fehlt. Aufruf: /forge:grill <spec.md>`.
3. Normal: `/forge:grill docs/forge/2026-11-03-aufgabenliste/spec.md`
   Erwartet: Fragen nur zu Grenzfällen, Widersprüchen und Lücken (z. B. AC-01 anonym gegen AC-04 Konto, Export ohne AC); jede Änderung als Abschnitt/Vorher/Nachher mit Bestätigung; Ende mit Liste der Änderungen und neuen W-Einträge oder „Keine Änderung.“.

### Spec-Review

`/forge:spec-review docs/forge/2026-11-03-aufgabenliste/spec.md` (hat der Grill die Spec geändert, vorher die Fixture neu kopieren, damit die erwarteten Befunde passen)

Erwartet:
- Ein Sub-Agent `forge:spec-review` läuft (nur `Read`), die Haupt-Session liest die Spec nicht selbst.
- Neue Datei `docs/forge/2026-11-03-aufgabenliste/spec-review.md` mit `Verdict: NEEDS_CHANGES` und Befunden sortiert 🔴 → 🟡 → 🟢.
- Laut `plugins/forge/evals/spec-review-flawed.json` mindestens: 🔴 `widerspruch` an AC-01/AC-04, 🔴 `fehlendes-verhalten` an „Export“, 🟡 an AC-03 („funktioniert korrekt“), 🟡 an AC-05 (Klasse und Tabelle). Optional: Ticket-Verweis AB#1234, ungekoppeltes Gerät.
- Letzte Chat-Zeile genau `Review abgeschlossen: NEEDS_CHANGES · Bericht: <pfad>`.

### Plan

1. Gate: `/forge:plan docs/forge/2026-11-03-bestellung/spec.md` (dort gibt es noch kein `spec-review.md`)
   Erwartet: blockiert, `spec-review.md nicht gefunden: …/2026-11-03-bestellung/spec-review.md`.
2. `/forge:spec-review docs/forge/2026-11-03-bestellung/spec.md`, dann `/forge:plan docs/forge/2026-11-03-bestellung/spec.md`.
   Erwartet: Fragen einzeln (eine pro Nachricht), Plan mit `## Global Constraints`, `### Task <n>: …` lückenlos, je Task `**ACs:**`, Test-first-Schritte mit vollständigem Code; forge: Zeile `> Umsetzung mit /dv-forge:implementation …` unter dem Titel (R-102). Ende: nur der Plan-Pfad.
3. Unterschied angular: `/angular:plan …` lädt die Planungs-Skills aus dem Profil (nur wenn `dv-angular` installiert ist, sonst „nicht verfügbar“ unter Global Constraints) und schreibt Verifikationen als `dv-angular-test --root <Workspace> …` (R-201); bei mehreren `angular.json` fragt er nach dem Workspace (R-202). Die Fixture ist ein Node-Projekt; für einen echten Angular-Test eine Spec in einem Angular-Repo verwenden.

### Plan-Review

1. Gate: `/forge:plan-review docs/forge/2026-11-03-aufgabenliste/plan.md` → blockiert, `plan.md nicht gefunden: …`.
2. `/forge:plan-review docs/forge/2026-11-03-bestellung-review/plan.md` (Fixture-Plan mit eingebauten Mängeln, Spec im selben Ordner).

Erwartet:
- Sub-Agent `forge:plan-review` (nur `Read, Grep, Glob`), Datei `plan-review.md` neben dem Plan, `Verdict: NEEDS_CHANGES`.
- Laut `plugins/forge/evals/plan-review-flawed.json` mindestens: 🔴 `umsetzer-steckt-fest` an Task 1/Task 3a (Rückwärts-Abhängigkeit, Nummer 3a), 🔴 an Task 2 (Platzhalter „Passende Fehlerbehandlung ergänzen“), 🔴 `ac-fehlt-im-plan` an AC-04.
- Hinweis: Die Fixture liegt unter `plugins/forge/tests/fixtures/plan-review/repo`; der Reviewer bekommt die Repo-Wurzel und muss dort suchen. Für ein sauberes Ergebnis die Fixture in ein eigenes Git-Repo kopieren.
- angular: `/angular:plan-review …` meldet zusätzlich Verstöße gegen R-201 und R-203 als `umsetzer-steckt-fest` (Abschnitt „Zusatzregeln von angular“ im Agent).

## 4. Aufräumen

```text
/plugin uninstall forge@dv-plugin-compiler-demo
/plugin uninstall angular@dv-plugin-compiler-demo
/plugin marketplace remove dv-plugin-compiler-demo
```

```bash
rm -rf docs/forge/2026-11-03-aufgabenliste docs/forge/2026-11-03-bestellung docs/forge/2026-11-03-bestellung-review
```

## Bekannte Grenzen (nicht verifiziert)

- Die Aufrufe oben habe ich nicht in einer interaktiven Session ausgeführt; verifiziert sind Build, Lint, `claude plugin validate --strict` und die Gate-Skripte mit nachgestellten Hook-Eingaben (Exit 0/2).
- Dass `UserPromptSubmit` den getippten Slash-Befehl im Feld `prompt` liefert, stütze ich auf `plugins/forge/scripts/stage-guard.js`, das genau so arbeitet; in dieser Umgebung nicht live geprüft.
- `disable-model-invocation: true` steht wie verlangt in jedem Etappen-Skill. Folge: Kein Orchestrator und kein Modell kann die Skills verketten; jede Etappe tippt der Mensch. forge setzt das bewusst nur bei `init` (INVENTORY a15).
- Gate-Skripte sind POSIX-`sh`; unter Windows ohne Git-Bash laufen sie nicht (dv-angular liefert dafür `.cmd`-Dateien). Pfade mit Leerzeichen im ersten Argument werden zerlegt.
- `plugin.json` trägt keine Kopfzeile „GENERIERT“, weil JSON keine Kommentare kennt und `--strict` unbekannte Felder anmahnt; `hooks.json` und `marketplace.json` tragen sie im Feld `description`.
