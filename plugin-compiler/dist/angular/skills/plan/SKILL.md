---
name: plan
description: Turns a reviewed spec.md into an implementation plan with exact files, interfaces and test-first steps before any code is written. Use when the spec review is done and the plan is still missing.
argument-hint: <spec.md> [ziel.md]
disable-model-invocation: true
---
<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/plan.yaml -->

# Plan

`$ARGUMENTS`: `<spec.md> [ziel.md]` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du schreibst einen Plan für einen Umsetzer, der sein Handwerk beherrscht, aber null Kontext zu Projekt, Werkzeugen und Fachgebiet hat und dessen Testentwurf du nicht vertrauen darfst. Alles steht im Plan, Dateien, Code, Tests, nachzulesende Doku, Prüfung. Kleine Tasks, DRY, YAGNI, TDD, häufige Commits.

## Eingang und Artefakt

- Eingang: `spec.md`, `spec-review.md`; das erste Argument ist der Pfad zu `spec.md`, alle anderen Artefakte liegen im selben Ordner.
- Artefakt: `<spec-ordner>/plan.md`
- Gate: Plan im Format unten geschrieben; jedes AC in mindestens einem Task; Selbst-Check erledigt.
- Hook: `scripts/gate-plan.sh` blockiert `/angular:plan` mit Exit-Code 2, wenn ein Pflichtartefakt fehlt (R-050).

## Ablauf

1. **Spec lesen:** Das erste Argument ist die Spec. Fehlt sie oder der Spec-Review-Bericht daneben, meldest du „<Artefakt> nicht gefunden: <pfad>“ und endest. (→ R-050) Steht im Kopf `Status: Abbruch` oder `abgetrennt`, warnst du und lässt den Menschen entscheiden. Zeigt `git status --porcelain -- <spec>` eine Zeile, warnst du, dass die Spec nicht committet ist.
2. **Umfang prüfen:** Beschreibt die Spec mehrere unabhängige Teilsysteme, empfiehlst du einen Plan pro Teilsystem und fragst nach. Jeder Plan ergibt für sich lauffähige, testbare Software.
3. **Ziel festlegen:** das zweite Argument, sonst `plan.md` im Ordner der Spec. Existiert die Datei, fragst du nach. (→ R-015)
4. **Kontext lesen:** genau die Spec, die Projekt-`CLAUDE.md`, den betroffenen Code und Dateien, die der Mensch ausdrücklich mitgibt. (→ R-043) Erst verorten, dann alle nötigen Zeilenbereiche in einem parallelen Block lesen. Danach listest du jede Datei, die entsteht oder sich ändert, mit ihrer Verantwortung; die Tasks folgen daraus.
5. **Planungs-Skills:** Das Profil `angular` nennt `dv-angular:toolchain`, `dv-angular:angular-testing`, `dv-angular:angular-project-layout`. Lade sie über das Skill-Werkzeug, nachdem die Dateiliste feststeht; ihre Kernregeln kommen je Regel als eine Zeile mit dem Skill-Namen unter `## Global Constraints`. Ist ein Skill nicht installiert, steht er dort als „nicht verfügbar“. TODO(forge/skills/plan-writing/references/context-reading.md): forge kennt zusätzlich `<skill> @<pfad>`.
6. **Offene Fragen** stellst du dem Menschen, eine pro Nachricht. (→ R-044)
7. **Plan schreiben** im Format unten, mit `**Basis:**` aus `git rev-parse --short HEAD`. (→ R-040) (→ R-041) (→ R-042) (→ R-045)
8. **Selbst-Check:** Für jede AC-ID und jede Soll-Vorgabe zeigst du auf den Task, der sie umsetzt; Namen und Signaturen heißen in allen Tasks gleich; jede Annahme über Fremd-Code hast du im installierten Paket oder in der Doku nachgesehen. Was du findest, korrigierst du sofort. TODO(forge/skills/plan-writing/SKILL.md): forge prüft vorher mechanisch mit `plan-tasks.js lint`; das Skript ist nicht Teil des Prototyps.
9. **Ergebnis:** nur den Plan-Pfad nennen. (→ R-004)

## Format

````markdown
# <Titel> — Umsetzungsplan

**Ziel:** <ein Satz>
**Architektur:** <2–3 Sätze>
**Tech-Stack:** <Technologien>
**Spec:** <Pfad zur spec.md, relativ zur Checkout-Wurzel>
**Basis:** <Commit-Kurzhash beim Schreiben>

## Global Constraints
- <projektweite Vorgabe, Wert wörtlich aus der Spec>

---

### Task 1: <Komponente>

**ACs:** AC-01, AC-03

**Dateien:**
- Create: `exakter/pfad.ext`
- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`
- Test: `tests/exakter/pfad.ext` · `<Anker>`

**Interfaces:**
- Consumes: <exakte Signaturen aus früheren Tasks>
- Produces: <exakte Namen, Parameter- und Rückgabetypen für spätere Tasks>

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
- [ ] **Schritt 2: Test rot laufen lassen** — Befehl: `<befehl>` — erwartet: FAIL `<testname>`
- [ ] **Schritt 3: Minimal implementieren**
- [ ] **Schritt 4: Test grün laufen lassen** — Befehl: `<befehl>` — erwartet: PASS
- [ ] **Schritt 5: Commit**

## Entscheidungen
- **W · <Kurztitel>** · Aussage | delegiert — <Antwort>
- **E · <Kurztitel>** · Planer — <Wahl und Grund>
````

- Task-Überschriften lauten exakt `### Task <n>: <Komponente>`, `<n>` lückenlos ab 1, ohne Zusätze wie „3a“.
- Unter Global Constraints steht jede projektweite Vorgabe der Spec mit exakt ihrem Wert und je Kernregel eines
  Planungs-Skills eine Zeile mit dem Skill-Namen. Jeder Task erbt diesen Abschnitt.
- Neue Testdateien stehen als `Create:`; `Test:` steht für eine bestehende Testdatei und trägt einen Anker.
- Gab es keine Frage an den Menschen, steht unter `## Entscheidungen` die Zeile `- Keine Fragen an den Menschen.`
  TODO(forge/skills/plan-writing/references/plan-format.md): Der Tag `Planer` der E-Einträge steht in keiner Liste der Beleg-Tags (INVENTORY a8).

## Regeln

- **R-050 · Pflichtartefakte vor dem Start.** Eine Etappe startet nur, wenn ihre Pflichtartefakte vorliegen; das prüft ihr Gate. Fehlt eines, meldest du „<Artefakt> nicht gefunden: <pfad>“ und endest. *Warum:* Jede Etappe arbeitet auf dem Artefakt ihrer Vorgänger; Grill und Plan-Writing enden in dv-forge bei fehlender Spec mit „Spec nicht gefunden“.
- **R-040 · Test zuerst.** Jeder Task beginnt mit einem fehlschlagenden Test, danach Test rot laufen lassen, minimal implementieren, Test grün laufen lassen, committen. Ein AC ohne Code-Änderung bekommt einen Absicherungstest, der sofort grün ist; rot ist dann ein Befund, kein Grund, Code zu ändern. *Warum:* Der Umsetzer beherrscht sein Handwerk, aber seinem Testentwurf darfst du nicht vertrauen.
- **R-041 · Vollständiger Code statt Platzhalter.** Jeder Code-Schritt enthält den vollständigen Code in einem Code-Block. Keine Platzhalter, kein „Tests für das Obige schreiben“ ohne Testcode, keine Verweise auf andere Tasks statt Code. *Warum:* Der Umsetzer hat null Kontext und liest Tasks womöglich außer der Reihe.
- **R-042 · Jedes AC in einem Task.** Jeder Task nennt unter `**ACs:**` die AC-IDs, die er umsetzt; jedes AC der Spec steht in mindestens einem Task. Jede Soll-Vorgabe der Spec steht mit ihrem Wert unter `## Global Constraints`. *Warum:* Ein AC ohne Task wird nicht gebaut; `ac-fehlt-im-plan` ist im Plan-Review 🔴.
- **R-043 · Keine fremden Specs und Pläne.** Andere Specs oder Pläne liest du nie, auch nicht zur selben Workitem-Nummer. *Warum:* Sie lenken einen Neuanlauf.
- **R-044 · Fragen statt Annahmen.** Offene Fragen stellst du dem Menschen, eine Frage pro Nachricht, mit Empfehlung und Grund. Jede Antwort notierst du sofort als W-Eintrag mit Tag `Aussage`; sagt der Mensch „entscheide du“, gilt deine Empfehlung mit Tag `delegiert`. Legt die Spec die Form eines AC-Ergebnisses nicht fest, wählst du sie nicht selbst. *Warum:* Du triffst keine Annahme stillschweigend, und W-Einträge im Plan sind bindend wie in der Spec.
- **R-045 · Stabiler Anker.** Jede `Modify`-Zeile trägt nach `·` einen stabilen Anker (Symbol oder eindeutige Zeichenfolge); die Zeilenangabe dient nur der Orientierung. *Warum:* Der Anker bleibt gültig, wenn ein früherer Task dieselbe Datei ändert.
- **R-014 · W-Einträge sind bindend.** Jede Entscheidung des Menschen steht als `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` unter `## Entscheidungen`. Ein W-Eintrag ist beantwortet und bindend; du fragst nicht erneut danach, auch nicht anders formuliert oder als Bestätigung. *Warum:* W-Einträge sind die bindenden Entscheidungen des Menschen; ein W-Eintrag ist deshalb nie selbst ein Finding.
- **R-015 · Nie überschreiben.** Existiert das Ziel-Artefakt schon, fragst du nach und überschreibst es nicht. *Warum:* TODO(forge/skills/spec-whiteboarding/SKILL.md, forge/skills/plan-writing/SKILL.md): Beide sagen „nie überschreiben“, keiner nennt den Grund.
- **R-004 · Ende ohne nächsten Schritt.** Am Ende steht nur das Ergebnis der Etappe, wie ihr Ablauf es nennt. Kein Befehl, kein Hinweis auf einen nächsten Schritt, kein Commit, kein automatischer Start. *Warum:* Über den Fortgang entscheidet nicht die Etappe; in dv-forge entscheidet ihn die Leit-Session mit dem Menschen.
- **R-201 · Angular-Toolchain.** Jede Verifikation nutzt `dv-angular-build`, `dv-angular-test` oder `dv-angular-lint` mit `--root <Workspace>` im Bash-Tool; Argumente nach `--` gehen an `ng`, z. B. `dv-angular-test --root <Workspace> -- --include src/app/x.spec.ts`. Nicht `ng build|test|lint`, nicht `npm test`, nicht `build_angular_project` oder `test_angular_project` von dev-mcp. *Warum:* Die Befehle liefern Status, Zusammenfassung und Fehler und legen das Volllog in eine Datei, die nie in den Kontext geladen wird; der Hook von dv-angular lehnt die anderen Wege ab. *(nur angular)*
- **R-202 · Workspace-Wahl.** `<Workspace>` ist der Ordner mit der `angular.json`. Gibt es im Repo genau einen, nimmst du ihn; gibt es mehrere, fragst du, welcher gemeint ist, und startest nichts. *Warum:* TODO(angular/skills/toolchain/SKILL.md): Die Quelle nennt keinen Grund. *(nur angular)*
- **R-203 · Verhaltenstests sind Spezifikation.** Integrationsnahe Tests (Smart-Component mit Service und gemocktem HTTP, Routing, mehrstufige Abläufe) beschreiben gewünschtes Verhalten. Schlägt einer nach einer Änderung fehl, gilt das als Regression oder bewusste Verhaltensänderung; der Plan schreibt die Erwartung nicht ohne Bestätigung des Menschen um. *Warum:* TODO(angular/skills/angular-testing/references/policy.md): Die Quelle nennt keinen Grund; forge sagt dasselbe für Absicherungstests (INVENTORY a16). *(nur angular)*

## Beispiele

Beispiele stehen in [references/beispiele.md](references/beispiele.md); sie sind keine Pflicht.
