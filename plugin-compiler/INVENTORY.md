# Bestandsaufnahme: forge und angular

Stand: Branch `exp/plugin-compiler`, gelesen aus `plugins/forge` (dv-forge 0.33.0) und `plugins/angular` (dv-angular 1.3.0). Ich habe nur gelesen, nichts geändert.

## 1. Inventar je Plugin

### forge (`plugins/forge`, 348 Dateien)

| Art | Inhalt |
|---|---|
| plugin.json | `dv-forge`, 0.33.0, nur `name`, `version`, `description` |
| Skills (19) | `init`, `session-orchestrator` (Startbefehl), `spec-whiteboarding`, `spec-whiteboarding-with-docs`, `spec-grilling`, `spec-review`, `spec-review-orchestrator`, `review-followup`, `plan-writing`, `plan-review`, `plan-orchestrator`, `start-work`, `implementation`, `implementation-review`, `implementation-orchestrator`, `finish-work`, `domain-modeling`, `merge-conflict-resolution`, `commit-message`. Dazu 17 Dateien unter `references/`. |
| Agents (28) | `spec-review-{clarity,completeness,consistency,feasibility,profiles,scout,verifier}`, `spec-rework`, `plan-review-{architecture,buildability,coverage,feasibility,risks,scout,verifier}`, `plan-rework`, `implementation-*` (12) |
| Commands | keine (`commands/` fehlt) |
| Hooks | `hooks/hooks.json`: `UserPromptSubmit` (guard-orchestrator, stage-guard), `PreToolUse` (guard-orchestrator, start-guard), `Stop`, `SessionEnd`, `SubagentStop` (result-check, agent-check) |
| Skripte | 33 Node-Skripte unter `scripts/`, 80 unter `scripts/lib/` (prepare, review-flow, aggregate-findings, spec-lint, plan-tasks, session-chain …) |
| Geteilte Prosa | `shared/dialog-rules.md`, `shared/orchestrator-rules.md`, `shared/review-flow/flow.md`, `shared/review-loop/{loop,finding-format,severity-rules}.md`, `shared/session-chain/base-sub-agent.md` |
| Sonst | `evals/` (3 Golden-Sets), `tests/` (130 Testdateien + Fixtures), Glossar in `CONTEXT.md` (Repo-Wurzel) |

### angular (`plugins/angular`, 99 Dateien)

| Art | Inhalt |
|---|---|
| plugin.json | `dv-angular`, 1.3.0, nur `name`, `version`, `description` |
| Skills (19) | `angular` (Dispatcher), `angular-{a11y,cli,component,di,forms,material,migration,new-project,project-layout,routing,signal-architecture,signals,styling,testing,testing-jest-conventions,testing-vitest-conventions}`, `toolchain`, `init` |
| Agents | keine (`agents/.gitkeep`) |
| Commands | keine (`commands/.gitkeep`) |
| Hooks | `hooks/hooks.json`: `PreToolUse` → `scripts/toolchain-guard.js` (lehnt `ng build/test/lint`, `npm test` und dev-mcp-Build/Test ab; nur wenn per `init` aktiviert) |
| Skripte | `bin/dv-angular-{build,test,lint}` (+ `.cmd`), `bin/lib/run-toolchain.js`, `scripts/init.js`, `scripts/toolchain-guard.js`, `scripts/toolchain/angular-{build,lint,test}.js`, `scripts/lib/project-setup.js` |
| Sonst | `tests/` (9 Testdateien) |

**Wichtigster Befund für den Prototyp:** angular hat keinen Spec-, Grill-, Review- oder Plan-Ablauf. Der Workflow Spec → Grill → Spec-Review → Plan → Plan-Review stammt vollständig aus forge. angular trägt dazu Stack-Regeln bei (Toolchain-Befehle, Testpolicy), die forge selbst schon erwähnt: `plan-writing/references/plan-format.md` Regel 10 nennt `dv-angular-test` als Verifikations-Befehl, und `plan-writing` lädt „Planungs-Skills“ aus der Projektkonfiguration.

## 2. (a) Doppelt oder abweichend formulierte Regeln und Etappen

| # | Thema | Fundstellen | Abweichung |
|---|---|---|---|
| a1 | **Severity vergibt wer?** | `shared/review-loop/severity-rules.md` und `finding-format.md` gegen alle Review-Agents und `scripts/lib/rules.js` | Die geteilten Dateien sagen „Reviewer stufen nach Konsequenz ein“ mit Feld `severity`. Die Agents sagen „Ein Feld `severity` oder `color` macht dein Ergebnis ungültig“; die Farbe leitet `rules.js` aus der Kategorie ab. Direkter Widerspruch. |
| a2 | **Maximum der Followup-Runden** | `CONTEXT.md` (Followup-Runde, Review-Schleife) gegen `shared/orchestrator-rules.md` | Das Glossar sagt „höchstens zwei je Lauf“, die Regeldatei sagt „Maximum Followup-Runden: 8“. |
| a3 | **Kategorien-Definitionen** | 17 Agents | `fehlendes-verhalten` hat drei Wortlaute (5× „Verhalten, das die Spec beschreiben müsste, fehlt“, 6× „eine Funktion, die der Plan baut, hat gar keinen Test …“, 1× Verifier „gar kein AC“). `detail` hat drei Wortlaute. Gleicher Name, unterschiedliche Bedeutung je Review. |
| a4 | **W-Einträge sind bindend** | 20 Agents, `spec-format.md`, `plan-format.md`, `spec-grilling` | Derselbe Absatz steht 20-mal fast wortgleich in den Agents. |
| a5 | **Ausgabeformat der Reviewer** | 17 Agents, `finding-format.md` | JSON-Schema, `location`-Regeln und „Ohne Findings schreibst du genau diese Form“ in jedem Agent wiederholt; die Felder in `finding-format.md` (`severity`) passen nicht zu den Agents (`category`). |
| a6 | **„Ziel“-Absatz der Spec-Reviewer** | 5 `spec-review-*`-Agents | „Die Spec soll stimmig, verständlich und grob umsetzbar sein …“ fünfmal gleich, jeweils mit eigener Ausnahme zur Schreibweise. |
| a7 | **Fragetechnik** | `grill-rounds.md` (Frontier) gegen `plan-writing` Schritt 6 und `angular/init` | Whiteboarding/Grill: alle offenen Fragen einer Runde auf einmal. Plan-Writing und angular-init: eine Frage pro Nachricht. `dialog-rules.md` Ton 7: „genau eine Frage“ am Ende; nur „Feste Formate gehen vor“ löst den Konflikt. |
| a8 | **Beleg-Tags** | `spec-whiteboarding/SKILL.md` (3 Tags), `spec-format.md` (5 Tags), `plan-format.md` (`delegiert`, `Planer`) | Die Menge der Tags ist an keiner Stelle vollständig; `Planer` (E-Einträge) steht in keiner Tag-Liste. |
| a9 | **Commits** | `spec-format.md` („Nie stagen und committen getrennt“) gegen `plan-format.md` Schritt 5 (`git add <dateien>` · `git commit …`) | Die Spec verbietet getrenntes Stagen, der Plan schreibt es dem Umsetzer vor. |
| a10 | **Ablauf eines Reviews** | `shared/review-loop/loop.md` und `shared/review-flow/flow.md` | Zwei Ablaufbeschreibungen; `flow.md` übernimmt Abschnitte aus `loop.md` per Verweis und überschreibt Teile davon („Davon abweichend gilt hier“). |
| a11 | **Fehlende Spec** | `spec-grilling` Schritt 1, `plan-writing` Schritt 1 | Gleiche Regel, zweimal formuliert; im Prototyp als R-050 mit Hook zusammengeführt. |
| a12 | **Begriff „Phase“** | `CONTEXT.md` (Etappe: „Nicht verwenden: Stufe, Phase“) | Der Auftrag spricht von „Phasen“; im erzeugten Text steht deshalb „Etappe“, nur Datei- und Schlüsselnamen heißen `phase`. |
| a13 | **Begriff „Stufe“** | `CONTEXT.md` gegen `severity-rules.md` | Das Glossar verbietet „Stufe“ für Kettenschritte; `severity-rules.md` nutzt „Stufe der Gruppe“ für die Farbe. Wird missverständlich, sobald beides in einem Text steht. |
| a14 | **Begriff „Gate“** | `CONTEXT.md` (Haltepunkt: „Nicht verwenden: Gate“), `plan-review-buildability` („Gates verdrahtet“ = Build/Test/Lint) | „Gate“ hat zwei Bedeutungen und ist für eine davon verboten. Der Prototyp definiert „Gate“ im eigenen Glossar als Pflichtartefakt-Prüfung, ausdrücklich kein Haltepunkt. |
| a15 | **Modellaufruf** | `forge/README.md` gegen Auftrag | forge setzt `disable-model-invocation: true` nur bei `init`, „damit ein Orchestrator Review-, Plan- und Umsetzungsabläufe verketten kann“. Der Auftrag verlangt es für jeden Etappen-Skill; damit kann keine Session-Kette die erzeugten Skills aufrufen. Im Prototyp umgesetzt wie verlangt, siehe TODO in TEST.md. |
| a16 | **Absicherungstest vs. Integrationstest** | `forge/plan-format.md` („rot ist ein Befund, kein Grund, Code zu ändern“) und `angular-testing/references/policy.md` („do not rewrite expectations without confirming intent“) | Dieselbe Idee, getrennt formuliert, in zwei Sprachen. Kandidat für eine gemeinsame Regel. |

## 3. (b) Schwammige Formulierungen

Gesucht nach „angemessen“, „ggf.“, „sinnvoll“, „sollte“, „idealerweise“, „bei Bedarf“, „etwa“, „grob“ (forge) und „prefer“, „consider“, „usually“, „if needed“, „as needed“ (angular).

| Fundstelle | Text | Problem |
|---|---|---|
| `forge/skills/spec-whiteboarding/references/grill-rounds.md` | „Optionen, falls sinnvoll, stehen knapp in der Frage.“ und Format „<Frage, ggf. mit Optionen>“ | Kein Kriterium, wann Optionen dazugehören. Im Prototyp als TODO markiert. |
| 5× `forge/agents/spec-review-*.md` | „grob umsetzbar“ | Schwelle offen; wird durch die Kategorien halb aufgefangen. |
| `forge/agents/implementation-review-{tests,risks,plan-fidelity,design,acceptance}.md` | „bei Bedarf“ | Offen, wann der Reviewer weiterliest. |
| `forge/agents/implementation-review-tests.md` | „sollte“ | Ausgerechnet das Wort, das `ac-rules.md` in ACs verbietet. |
| `forge/shared/dialog-rules.md` | „Erklärung danach, nur wenn nötig.“ | Kein Kriterium für „nötig“. |
| `forge/skills/plan-writing/references/task-rules.md` | „Ein Schritt ist genau eine Aktion von 2–5 Minuten“, „deutlich mehr als eine Aktion“ (buildability) | Zeitmaß ohne Messweg; „deutlich“ ohne Schwelle. |
| `forge/skills/plan-writing/references/plan-format.md` | „Architektur: <2–3 Sätze>“ | Gut: konkret. Gegenbeispiel zu den Fällen oben. |
| 12× forge | „etwa …“ | Meist Beispiel-Einleitung, unkritisch. |
| `angular/skills/angular-project-layout/SKILL.md` | „consider …“ | Empfehlung ohne Entscheidungsregel. |
| `angular/skills/angular-new-project/references/questionnaire.md` | „when possible“, „usually“, „if needed“ | Offene Bedingungen. |
| `angular/skills/angular-testing/references/policy.md` | „prefer `RouterTestingHarness` when that matters“ | „when that matters“ ohne Kriterium. |
| `angular/skills/angular-component/SKILL.md`, `angular-signals/SKILL.md` | description beginnt mit „Create …“/„Implement …“ (Imperativ) statt dritter Person, kein „Use when“ | Verstößt gegen die Lint-Regel des Prototyps. |

**Regeln ohne Begründung:** Der Compiler verlangt bei jeder Regel ein `why`. Für 11 übernommene Regeln steht in der Quelle keine Begründung (z. B. komplette Frontier je Runde, Abbruch-Regel, Ton, „nie überschreiben“). Dort steht im Quelltext `TODO(<Datei>)` statt einer erfundenen Begründung.

## 4. (c) Gemeinsamer Kern von forge und angular

Ehrlich betrachtet teilen die beiden Plugins heute fast nichts: forge ist ein Prozess-Plugin, angular ein Wissens- und Toolchain-Plugin. Gemeinsam sind:

1. **Plugin-Gerüst:** `plugin.json` mit identischen Feldern, `hooks/hooks.json`, Skill `init` mit `disable-model-invocation: true`, Hook-Prinzip „ein Fehler im Hook darf die Arbeit nie blockieren“ (`toolchain-guard.js`, forge-Guards).
2. **Plan-Verifikation:** forge-Pläne verlangen exakte Befehle je Task; angular liefert genau diese Befehle (`dv-angular-build/test/lint --root <Workspace>`). Die Brücke ist forge „Planungs-Skills“ → im Prototyp das `profile` im Plugin-Manifest.
3. **Testhaltung:** a16 oben – rote Verhaltens-Tests sind ein Befund, kein Anlass, die Erwartung umzuschreiben.

Als **geteilter Kern** im Prototyp eignet sich daher der forge-Workflow selbst (Regeln für Belege, Fragen, Spec-Format, AC-Form, Review-Verdict, Plan-Format), den beide Plugins emittieren. angular ergänzt ihn um drei Stack-Regeln (R-201 bis R-203) und Planungs-Skills im Profil; forge ergänzt ihn um Ton und Umsetzungsbefehl (R-101, R-102). So wird sichtbar, was geteilt ist und was nicht.

## 5. Umfang des Bestands für die fünf Etappen

| | Dateien | Zeilen |
|---|---|---|
| Skills (`spec-whiteboarding` + references, `spec-grilling`, `spec-review`, `plan-writing` + references, `plan-review`) | 13 | |
| Agents (`spec-review-*`, `spec-rework`, `plan-review-*`, `plan-rework`) | 16 | |
| Geteilte Prosa (`dialog-rules`, `review-flow/flow`, `review-loop/*`) | 5 | |
| **Summe Markdown** | **34** | **1731** |
| dazu Skripte (prepare, review-flow, aggregate, spec-lint, plan-tasks, …) | > 40 | |

## 6. Befunde aus der Komplettmigration von dv-forge

Der Compiler prüft jetzt den ganzen forge-Text. Was er im Bestand findet, meldet er als Warnung, weil die Ausgabe wortgleich bleiben muss:

| # | Befund | Fundstelle |
|---|---|---|
| m1 | **Frontmatter ist kein gültiges YAML:** `argument-hint: [grill\|spec-review\|…] [pfade] [workitem-nr]` beginnt mit `[` und wird als Liste gelesen, danach folgt Text. Ein strenger YAML-Parser lehnt die Frontmatter ab. | `skills/session-orchestrator/SKILL.md`, `skills/spec-whiteboarding/SKILL.md` |
| m2 | **Reviewer ohne `tools`-Zeile** erbt alle Werkzeuge, auch Edit und Bash. | `agents/implementation-review-tests.md` |
| m3 | **Reviewer mit Bash** (für Tests und `git diff`) sind nicht read-only. | `agents/implementation-{final,re,task}-reviewer.md` |
| m4 | **Kein `author`** in `plugin.json`; `claude plugin validate --strict` scheitert daran schon beim Bestand. Die erzeugte Fassung ergänzt ihn als deklarierte Abweichung. | `.claude-plugin/plugin.json` |
| m5 | **„Review-Loop“** steht im Text, obwohl das Glossar „Review-Schleife“ verlangt. | `shared/review-loop/loop.md`, Zeile 1 des Bodys |
| m6 | **„NEVER“ in Großbuchstaben** ohne Begründung in derselben Zeile. | `skills/commit-message/SKILL.md` |
| m7 | **26 Regeln der Regeldateien ohne Begründung:** Von 26 Regeln in `orchestrator-rules.md` und `dialog-rules.md` nennen nur 4 einen Grund. | `src/forge/rules/*.yaml` (`why: TODO(…)`) |
| m8 | **Doppelte Absätze:** 22 Blöcke stehen in 83 Vorkommen wortgleich in mehreren Dateien, jetzt je einmal in `src/forge/partials/`. Die fast gleichen Varianten (`## Ziel`, `## Kategorie`, `fehlendes-verhalten`) bleiben getrennt; sie unterscheiden sich wirklich (INVENTORY a3, a6). | 17 Agents, 4 Skills |

Gegen die Anforderungen des Prototyps verstößt forge bewusst an zwei Stellen, und der Compiler setzt dort forges Regel durch, nicht die des Prototyps:
- **`disable-model-invocation`** steht nur bei `init`. Die Orchestratoren rufen Unter-Skills über das Skill-Werkzeug auf. Mit `true` überall bräche die Session-Kette. Im Manifest steht deshalb je Skill ausdrücklich `model_invocation: allowed|disabled`.
- **Reviewer schreiben ihr Ergebnis selbst** (`tools: Read, Write`) als JSON-Datei, die Skripte auswerten. Read-only-Reviewer wie im Prototyp hätten keinen Weg für das Ergebnis.

## 7. Vergleich bisheriger Aufbau und neues Schema (dv-forge)

| | Bestand `plugins/forge` | `src/forge` + Manifest |
|---|---|---|
| Prosa-Dateien | 70 Markdown-Dateien (Skills, References, Agents, Shared, README) | 68 Quellen + 22 Partials + 2 Regel-YAML + `etappen.yaml` |
| Wortgleiche Blöcke | 83 Vorkommen von 22 Blöcken | je 1 |
| Regeln der Orchestratoren und Dialog-Regeln | Markdown-Listen | 26 Regeln mit ID, Begründung, Durchsetzung (`text`, `script`, `hook` + Skript) |
| Etappen der Session-Kette | nur im Code (`session-chain-*.js`) | `etappen.yaml`, beim Build gegen den Code geprüft |
| Hooks | `hooks.json` von Hand | Daten im Manifest; jedes Skript wird auf Existenz geprüft |
| Verweise `dv-forge:<name>`, `scripts/…`, `shared/…`, `references/…` | ungeprüft | jeder Verweis aufgelöst, sonst Abbruch mit Datei und Zeile |
| Code (Skripte, Tests, Evals) | 276 Dateien | unverändert als Assets |
| Nachweis | eigene Testsuite | Äquivalenz 348/348 Dateien + dieselbe Testsuite gegen `dist/forge` grün |

## 8. Umgesetzt (dv-forge 0.35.0 aus `src/forge`)

Grundlage: dv-forge 0.34.0 (Empfehlungs-Schwelle) plus `fix/forge-handover-stability`. Jede Änderung steht mit Dateien in `src/forge/CHANGES.yaml`.

| Befund | Umsetzung |
|---|---|
| 1 | Glossar: keine Zahl mehr für die Followup-Runden, Verweis auf `orchestrator-rules.md` (8), in `src/glossary.yaml` und `CONTEXT.md`. |
| 2 | `severity-rules.md`, `finding-format.md`: Reviewer vergeben eine Kategorie, die Farbe setzt das Skript; „Farbe“ statt „Stufe“. |
| 3 | Eine Commit-Form: `git add -- <pfade>` und direkt danach `git commit -m … -- <pfade>` (Partial `commit-mit-pfaden`); auch in der Hook-Meldung für den Umsetzer. |
| 4 | Fragerunden in Wellen bleiben; das Plan-Writing fragt jetzt auch in Runden; Ton-Regel 7 nimmt die Fragerunden aus. |
| 5 | Frontmatter ist gültiges YAML; der Compiler quotet Werte, die sonst ungültig wären; ungültige Frontmatter ist jetzt ein Build-Fehler. |
| 6 | Test-Reviewer: `disallowedTools: Edit, MultiEdit, NotebookEdit` statt einer tools-Liste, weil der Testbefehl auch ein Tool-Aufruf sein darf. |
| 7 | Bewusst so gelassen (Implementierungs-Reviewer brauchen Bash). |
| 8 | Alle 22 fehlenden Begründungen vom Menschen bestätigt und in `src/forge/rules/*.yaml` übernommen; keine forge-Regel ohne `why`. |
| 9 | `loop.md`: Überschrift „Review-Ablauf der Umsetzung“. |
| 10 | Spec-Nachprüfer nutzt die Kategorien der Spec-Reviewer (Partial `kategorien-spec-liste`). |
| 11 | Plan-Format Regel 12 nennt den Tag `Planer`. |
| 12 | „never“ statt „NEVER“ in `commit-message`. |
| B | `review-followup auto` und `orchestrator-state next`: auch ein 🔴 erst ab der Scout-Sicherheit ≥ Schwelle; darunter bleibt es offen, Abbruchgrund `unter-schwelle`. Die Scout-Sicherheit steht dafür in den Bericht-Daten. |
| C | Spec-Nacharbeit übernimmt den bevorzugten Vorschlag ab der Schwelle ohne Rückfrage (Zeile `**Übernehmen:**` in ihrer Eingabe). Die Plan-Nacharbeit bleibt unverändert: Sie fragt nur bei Widersprüchen der Spec, und die Spec ändert sie nicht. |

| 14 | `etappe-report` ruft `previewFinal` aus dem Handover-Fix auf und nennt `ABWEICHUNG=`/`SHOWSTOPPER=`; der Brief verlangt, Behebbares vor dem `final` zu beheben. |

