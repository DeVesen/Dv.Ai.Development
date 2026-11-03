# Lokaler Test-Deploy

Ziel: das aus `plugin-compiler/src` erzeugte `dv-forge` 0.35.0 und den angular-Prototyp aus `plugin-compiler/dist/` lokal installieren und ausprobieren. Alle Befehle laufen im Repo-Wurzelordner `Dv.Ai.Development` auf dem Branch `exp/plugin-compiler`.

**Grundlage:** dv-forge 0.34.0 aus `master` (mit Empfehlungs-Schwelle) plus `fix/forge-handover-stability` (7b4faac). Darauf liegen die Befunde 2 bis 12, 14, B und C; die Liste steht in `src/forge/CHANGES.yaml`.

## 0. Bauen und prüfen

Das Projekt wird mit der Plugin-Druckerei gedruckt (`plugins/plugin-druckerei`, Befehl `druckerei`).

```bash
pip install pyyaml jinja2 jsonschema
plugin-compiler/tools/smoke.sh
```

Erwartet, in dieser Reihenfolge:

```text
== 1/2 Try-Deploy
Drucken und Prüfen: ok (13 Warnungen)
  dv-forge: 68 Quellen, 24 Partials, 26 Regeln als Daten, 277 Assets; 302 Dateien wortgleich zum Bestand, 47 laut Änderungsprotokoll geändert.
  angular: 5 Etappen, 27 geteilte Regeln, 3 eigene.
TÜV (claude plugin validate):  Marketplace, angular, forge bestanden
Probeläufe (Tests):  forge: 2202 bestanden, 0 fehlgeschlagen, 1 übersprungen
Gegenüber dist/: 0 Dateien geändert, 0 neu, 0 entfernt.
TRY-DEPLOY ok.
== 2/2 dist/ vollständig in git
smoke: ok
```

Die 13 Warnungen sind offene Begründungen der angular-Prototyp-Regeln (`TODO(…)`) und die drei Implementierungs-Reviewer mit Bash (Befund 7, bewusst so gelassen). Alle 26 forge-Regeln haben eine bestätigte Begründung (Befund 8).

## 1. Installieren

Das erzeugte Plugin heißt wie das bestehende `dv-forge`, weil Skripte, Hooks und Texte den Namen fest enthalten. Deshalb zuerst das bestehende abschalten:

```text
/plugin uninstall dv-forge@dv-ai-development
/plugin marketplace add ./plugin-compiler/dist
/plugin install dv-forge@dv-plugin-compiler-demo
/plugin install angular@dv-plugin-compiler-demo
```

Danach Claude Code neu starten. Prüfen: 19 `/dv-forge:…`-Skills, 28 `dv-forge:…`-Agents, Version 0.35.0 in `/plugin`.

## 2. Was sich gegenüber dv-forge 0.34.0 ändert und wie du es siehst

| Befund | Aufruf | Erwartung |
|---|---|---|
| 4 | Planning-Etappe mit einer Spec, die Fragen offenlässt | Das Plan-Writing stellt alle offenen Fragen **einer Runde zusammen** im Format `❓ **Q<n>** - …` / `➡️ <Empfehlung> · <Beleg-Tag> — <Grund>`, nicht mehr eine pro Nachricht. Du kannst „alles wie empfohlen“ antworten. |
| B | Spec- oder Plan-Review, bei dem ein Scout ein 🔴 mit `Sicherheit:` unter deiner Schwelle (Standard 70 %) bewertet | Der Orchestrator setzt dieses 🔴 **nicht** automatisch um. Der Abschlussbericht nennt `Abbruch: Unter der Empfehlungs-Schwelle, 1 × 🔴 mit Vorschlag bleiben beim Menschen (<Titel>)`; die Leit-Session hält am Haltepunkt. Ein 🔴 ab der Schwelle läuft wie bisher automatisch. |
| C | Spec-Review, bei dem ein 🔴 neues Verhalten ohne Beleg verlangt und der Scout ≥ Schwelle sicher ist | Die Spec-Nacharbeit fragt **nicht** mehr, sondern setzt den Vorschlag um. In der Spec steht `- **R<n> · <Stelle>** — geändert — Empfehlung übernommen (Sicherheit <n> %) — …`. Unter der Schwelle kommt wie bisher eine Frage. |
| 5 | `cat` der installierten `skills/session-orchestrator/SKILL.md` | `argument-hint: '[grill|…] [pfade] [workitem-nr]'` in Anführungszeichen: gültiges YAML. |
| 6 | Implementierungs-Review | Der Test-Reviewer darf die Suite ausführen, aber keine Datei bearbeiten (`disallowedTools: Edit, MultiEdit, NotebookEdit`). |
| 14 | Eine Etappe der Session-Kette kurz vor ihrem `final` | `etappe-report` gibt nach `BERICHT=` die Zeile `VORAB=ok` oder `VORAB=abweichung` mit `ABWEICHUNG=…`/`SHOWSTOPPER=…` aus. Die Etappe behebt, was in ihrer Hand liegt, und schreibt die Berichtsdatei erneut; die Leit-Session hält dadurch seltener. |
| 3 | Whiteboarding mit Commit auf Wunsch | Der Commit läuft als `git add -- <spec>` und direkt danach `git commit -m "…" -- <spec>`; das klappt jetzt auch für eine neue Spec. |

Am schnellsten siehst du B mit deiner Schwelle: in der Projekt-`CLAUDE.md` unter `## dv-forge` die Zeile `- Empfehlungs-Schwelle: 95` setzen. Dann bleiben fast alle 🔴 bei dir.

Testmaterial mit bekannten Mängeln (Erwartung je Befund in `plugins/forge/evals/spec-review-flawed.json`):

```bash
mkdir -p docs/forge/2026-11-03-aufgabenliste
cp plugins/forge/tests/fixtures/flawed-spec.md docs/forge/2026-11-03-aufgabenliste/spec.md
```

`/dv-forge:spec-review docs/forge/2026-11-03-aufgabenliste/spec.md --debug` läuft ohne Session-Kette. Die volle Kette startest du mit `/dv-forge:session-orchestrator`; sie braucht die Claude-Desktop-App mit Sessions.

## 3. angular (Prototyp aus dem gemeinsamen Kern)

| Aufruf | Erwartung |
|---|---|
| `/angular:ablauf` | Tabelle mit 5 Etappen; Profil `angular` mit drei Planungs-Skills aus dv-angular. |
| `/angular:grill docs/forge/gibt-es-nicht/spec.md` | Der Hook `gate-grill.sh` blockiert mit Exit 2: `spec.md nicht gefunden: …` plus Regel R-050. |
| `/angular:spec-review <spec.md>` | Reviewer `angular:spec-review` (nur `Read`), daneben `spec-review.md` mit Verdict. |

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

- **Verifiziert:** Build mit allen Prüfungen. Abgleich: 302 Dateien wortgleich zum Bestand, jede der 47 übrigen steht im Änderungsprotokoll mit abgenommenem Fingerabdruck. Die forge-Testsuite gegen `dist/forge` ist grün (2202 bestanden; 16 Tests mehr als auf der Grundlage, alle für die Befunde). `claude plugin validate --strict` für Marketplace und beide Plugins.
- **Nicht verifiziert:** Installation und Aufrufe in einer interaktiven Session, insbesondere wie Scouts die `Sicherheit` in echten Läufen schätzen. Davon hängt ab, wie oft B und C greifen.
- **Bewusste Abweichungen ohne Befund-Nummer:** `author` in `plugin.json`, `description` in `hooks.json`, die Kopfzeile je Markdown-Datei.
