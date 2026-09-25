# dv-forge Planning (plan-writing + plan-review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the manually started skills `/dv-forge:plan-writing` (spec → implementation plan, interactive) and `/dv-forge:plan-review` (autonomous review loop over the plan), and generalise the review-loop infrastructure built for `spec-review` so both loops share it.

**Architecture:** Block A adds `plan-writing` as a planner skill with three references; it depends on nothing new. Block B starts only after `spec-review` is fully implemented (gate in Task 4). It generalises the three scripts (location-type table, `protected[]` with directory entries, new `rework-outcome.js`), moves the loop description into `shared/review-loop/`, then adds five plan reviewers, the rework agent `plan-rework` and the orchestrator skill `plan-review`.

**Tech Stack:** Claude Code plugin (skills, agents, hooks), Node.js 24 (CommonJS, no dependencies), `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-09-25-dv-forge-planning-design.md`

## Global Constraints

- Plugin `dv-forge`, folder `plugins/forge/`. Nothing is taken from `dv-relay`: no names, texts or structures. Do not open `plugins/relay/` as a template.
- No file under `plugins/forge/skills`, `agents`, `shared`, `hooks`, `scripts` or `.claude-plugin` mentions `superpowers` or `writing-plans` (spec AC-02). The content of `plan-writing` is written fresh in German; no sentence is translated word for word from an English original.
- Block B (Tasks 5–12) starts only after Task 4 passes (spec AC-17). All existing spec-review tests stay green after every Block B task.
- Scripts: Node, CommonJS, no npm dependencies, no `package.json`. Each script exports its functions and runs `main()` only under `require.main === module`.
- Test command: `node --test "plugins/forge/tests/*.test.js"`. Expected result after every task: `fail 0`. Do not compare absolute test counts — other sessions add tests in parallel.
- Skill and agent bodies: German prose, English technical terms. Frontmatter `description` in English, starting with "Use when…".
- Skill frontmatter for `plan-writing` and `plan-review`: `name`, `description`, `disable-model-invocation: true`, `argument-hint`. `SKILL.md` body under 500 words; details go into `references/` or `shared/review-loop/`.
- Agent frontmatter: `name`, `description`, `tools`, `model`. `plan-review-coverage`: `tools: Read`. The other four plan reviewers: `tools: Read, Grep, Glob`. `plan-rework`: `tools: Read, Grep, Glob, Edit`, `model: opus`. Reviewers: `model: sonnet`.
- `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_SESSION_ID}` are substituted only inside `SKILL.md`. Files that a skill tells the model to read (`shared/review-loop/*.md`) use the placeholders `<PLUGIN>` and `<SESSION>`; the skill defines them in its first lines.
- Tests never assert on the German closing quote `“` (U+201C) as a literal; the editing tools may normalise it. Use `“` in JS strings or match without the quote.
- Parallel sessions work on `plugins/forge/` in the same working tree on branch `V2`. Before each task run `git status --short plugins/forge`. If a file the task touches shows changes that are not yours, stop and report instead of editing.
- Commits: stage only the paths named in the task (`git add <paths>`, `git mv`). Never `git add -A` or `git add .` — the working tree has unrelated uncommitted deletions under `docs/`. Conventional Commits, scope `forge`, message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tasks marked **Controller** dispatch agents themselves and must run in the main session, not in an implementer subagent.

## File Structure

```
plugins/forge/
├── skills/
│   ├── plan-writing/
│   │   ├── SKILL.md                      planner skill: flow, guiding principles, red flags     (Task 3)
│   │   └── references/
│   │       ├── plan-format.md            plan template + binding format rules                  (Task 1)
│   │       ├── task-rules.md             file structure, task sizing, step size, placeholders  (Task 2)
│   │       └── self-check.md             checklist after writing                               (Task 2)
│   ├── spec-review/SKILL.md              slimmed to spec-specific parts                        (Task 8)
│   └── plan-review/SKILL.md              plan orchestrator                                     (Task 11)
├── shared/review-loop/
│   ├── loop.md                           artefact-neutral loop                                 (Task 8)
│   ├── finding-format.md                 moved from skills/spec-review/references, generalised (Task 8)
│   ├── severity-rules.md                 moved, normalisation text updated                     (Task 8)
│   └── report-format.md                  moved, generalised                                    (Task 8)
├── agents/
│   ├── plan-review-coverage.md           AC coverage, constraints, verification               (Task 9)
│   ├── plan-review-feasibility.md        order, dependencies, names/types                      (Task 9)
│   ├── plan-review-architecture.md       fit with repo patterns and CLAUDE.md                  (Task 9)
│   ├── plan-review-risks.md              error handling, security, unchecked assumptions       (Task 9)
│   ├── plan-review-buildability.md       placeholders, anchors, numbering, allowed commands   (Task 9)
│   └── plan-rework.md                    rework agent, R-entries, JSON result                  (Task 10)
├── scripts/
│   ├── aggregate-findings.js             location-type table                                   (Task 5)
│   ├── rework-outcome.js                 new: escalation check                                 (Task 6)
│   └── guard-orchestrator.js             command table, protected[], directory entries         (Task 7)
└── tests/
    ├── origin.test.js                    AC-02 scan                                            (Task 1)
    ├── plan-writing.test.js              references + SKILL.md                                 (Tasks 1–3)
    ├── aggregate-parse.test.js           + task normalisation                                  (Task 5)
    ├── rework-outcome.test.js            new                                                   (Task 6)
    ├── guard-orchestrator.test.js        adapted + plan-review + directory cases               (Task 7)
    ├── review-loop.test.js               new: shared files                                     (Task 8)
    ├── skill.test.js                     spec-review checks adapted to loop.md                 (Task 8)
    ├── agents.test.js                    + plan reviewers + plan-rework                        (Tasks 9–10)
    ├── plan-review-skill.test.js         new                                                   (Task 11)
    └── fixtures/
        ├── plan-writing/clear-spec.md, ambiguous-spec.md                                       (Task 3)
        └── plan-review/spec.md, plan.md, repo/…                                                (Task 9)
```

Modify at the end: `plugins/forge/.claude-plugin/plugin.json` (minor version bump), `docs/superpowers/specs/2026-09-25-dv-forge-planning-design.md` (smoke-test result).

---

## Block A — `plan-writing` (start immediately)

### Task 1: Reference `plan-format.md` + origin scan

**ACs:** AC-02, AC-06, AC-21, AC-23, AC-26

**Files:**
- Create: `plugins/forge/skills/plan-writing/references/plan-format.md`
- Create: `plugins/forge/tests/plan-writing.test.js`
- Create: `plugins/forge/tests/origin.test.js`

**Interfaces:**
- Consumes: `readText` from `plugins/forge/tests/lib/markdown.js` (exists).
- Produces: `plan-format.md` — the template Tasks 3, 9, 10 refer to; test helper `reference(name)` in `plan-writing.test.js`, extended in Tasks 2 and 3.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/plan-writing.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'plan-writing');

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('planFormat_Template_HeaderSectionsInOrder', () => {
  const text = reference('plan-format.md');
  const markers = ['# <Titel> — Umsetzungsplan', '**Ziel:**', '**Architektur:**', '**Tech-Stack:**', '**Spec:**',
    '## Global Constraints', '### Task 1: <Komponente>', '## Entscheidungen'];
  const positions = markers.map((marker) => text.indexOf(marker));
  markers.forEach((marker, index) => assert.ok(positions[index] >= 0, `${marker} fehlt`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('planFormat_Template_TaskBlockWithAcsFilesInterfacesSteps', () => {
  const text = reference('plan-format.md');
  const parts = ['**ACs:** AC-01, AC-03', '- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`', '- Consumes:',
    '- Produces:', '`<befehl oder Tool-Aufruf>`', '- [ ] **Schritt 1: Fehlschlagenden Test schreiben**',
    '- [ ] **Schritt 5: Commit**'];
  for (const part of parts) assert.ok(text.includes(part), `${part} fehlt`);
});

test('planFormat_Template_DecisionEntries', () => {
  const text = reference('plan-format.md');
  assert.ok(text.includes('- **W · <Kurztitel>** · Mensch | delegiert — <Antwort>'));
  assert.ok(text.includes('- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>'));
});

test('planFormat_Rules_NumberingAnchorToolCallsNoExecutionSkill', () => {
  const text = reference('plan-format.md');
  assert.ok(text.includes('`### Task <n>: <Komponente>`'));
  assert.match(text, /lückenlos aufsteigend ab 1/);
  assert.match(text, /Task 3a/);
  assert.match(text, /Stabiler Anker/);
  assert.match(text, /Tool-Aufruf mit exakten Parametern/);
  assert.match(text, /Projekt-`CLAUDE\.md`/);
  assert.match(text, /verweist auf keinen Ausführungs-Skill/);
});
```

`plugins/forge/tests/origin.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCANNED = ['skills', 'agents', 'shared', 'hooks', 'scripts', '.claude-plugin'];
const FORBIDDEN = [/superpowers/i, /writing-plans/i, /questionable taste/i, /bite-sized/i];

function filesIn(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { recursive: true })
    .map((entry) => path.join(absolute, entry))
    .filter((file) => fs.statSync(file).isFile());
}

test('pluginFiles_NoneMentionsOriginOfPlanWriting', () => {
  for (const file of SCANNED.flatMap(filesIn)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(text, pattern, `${path.relative(ROOT, file)} enthält ${pattern}`);
    }
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `plan-format.md`; `pluginFiles_NoneMentionsOriginOfPlanWriting` passes.

- [ ] **Step 3: Write the reference**

`plugins/forge/skills/plan-writing/references/plan-format.md`:

`````markdown
# Plan-Format

Der Plan liegt als `plan.md` im Ordner der Spec. Er hat genau diesen Aufbau:

````markdown
# <Titel> — Umsetzungsplan

> Umsetzung Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** <ein Satz>
**Architektur:** <2–3 Sätze>
**Tech-Stack:** <Technologien>
**Spec:** <Pfad zur spec.md>

## Global Constraints
- <projektweite Vorgabe, Wert wörtlich aus der Spec>

---

### Task 1: <Komponente>

**ACs:** AC-01, AC-03

**Dateien:**
- Create: `exakter/pfad.ext`
- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`
- Test: `tests/exakter/pfad.ext`

**Interfaces:**
- Consumes: <exakte Signaturen aus früheren Tasks>
- Produces: <exakte Namen, Parameter- und Rückgabetypen für spätere Tasks>

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  <vollständiger Testcode>
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: FAIL mit „<meldung>“
- [ ] **Schritt 3: Minimal implementieren**
  <vollständiger Code>
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add <dateien>` · `git commit -m "<message>"`

## Entscheidungen
- **W · <Kurztitel>** · Mensch | delegiert — <Antwort>
- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>
````

## Regeln

1. **Kopf:** `Ziel` ist genau ein Satz, `Architektur` zwei bis drei Sätze. `Spec` nennt den Pfad der Spec, aus der der Plan entsteht; der Umsetzer liest beide. Der Kopf verweist auf keinen Ausführungs-Skill.
2. **Global Constraints:** Jede projektweite Vorgabe der Spec — Versionsgrenzen, erlaubte Abhängigkeiten, Namens- und Textregeln, Plattformvorgaben — steht hier als eine Zeile, mit exakt den Werten aus der Spec. Jeder Task erbt diesen Abschnitt, ohne ihn zu wiederholen.
3. **Task-Überschriften** lauten exakt `### Task <n>: <Komponente>`. `<n>` ist eine ganze Zahl, lückenlos aufsteigend ab 1. Zusätze wie „Task 3a“ oder „Task 3.1“ sind verboten, denn spätere Stufen zerlegen den Plan per Skript.
4. **ACs:** Jeder Task nennt unter `**ACs:**` die AC-IDs, die er umsetzt. Jedes AC der Spec steht in mindestens einem Task.
5. **Dateien:** exakte Pfade. `Create` für neue Dateien, `Modify` für bestehende, `Test` für die Testdatei.
6. **Stabiler Anker bei `Modify`:** Nach `·` steht ein Anker, der auch dann gültig bleibt, wenn ein früherer Task dieselbe Datei ändert: ein Symbol (`Klasse.methode`, Funktionsname) oder, bei Dateien ohne Symbole, eine eindeutige Überschrift bzw. Zeichenfolge in Backticks. Maßgeblich ist der Anker; die Zeilenangabe dient nur der Orientierung.
7. **Interfaces:** Der Umsetzer eines Tasks sieht nur seinen Task. `Consumes` und `Produces` sind sein einziger Weg, Namen und Typen der Nachbar-Tasks zu kennen — deshalb exakte Funktionsnamen, Parameter- und Rückgabetypen, keine Umschreibungen.
8. **Schritte:** Jeder Code-Schritt enthält den vollständigen Code in einem Code-Block. Jeder Lauf-Schritt nennt den genauen Befehl bzw. Tool-Aufruf und die erwartete Ausgabe.
9. **Befehl oder Tool-Aufruf:** Eine Verifikation ist ein Shell-Befehl oder ein Tool-Aufruf mit exakten Parametern, z. B. dev-mcp `test_dotnet_solution` mit `test_project_path`. Maßgeblich ist die Projekt-`CLAUDE.md`: Verbietet sie einen Weg, etwa Tests über die Shell, nutzt der Plan den dort vorgeschriebenen. Ein Befehl, den der Umsetzer nicht ausführen darf, ist ein Plan-Fehler.
10. **Commit pro Task:** Der letzte Schritt jedes Tasks staged genau die Dateien des Tasks und committet.
11. **Entscheidungen:** Jede Antwort des Menschen während der Planung steht als W-Eintrag mit Tag `Mensch` oder `delegiert`. W-Einträge sind bindend. R-Einträge schreibt nur der Nacharbeiter des Plan-Reviews.
`````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/skills/plan-writing/references/plan-format.md plugins/forge/tests/plan-writing.test.js plugins/forge/tests/origin.test.js
git commit -m "feat(forge): add plan-writing plan format reference

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: References `task-rules.md` + `self-check.md`

**ACs:** AC-03

**Files:**
- Create: `plugins/forge/skills/plan-writing/references/task-rules.md`
- Create: `plugins/forge/skills/plan-writing/references/self-check.md`
- Modify: `plugins/forge/tests/plan-writing.test.js` (append)

**Interfaces:**
- Consumes: `reference(name)` from Task 1.
- Produces: the placeholder list (section `## Verbotene Platzhalter`) that `plan-review-buildability` (Task 9) and `plan-rework` (Task 10) repeat.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/plan-writing.test.js`:

```js
test('taskRules_Sections_StructureSizingStepsPlaceholders', () => {
  const text = reference('task-rules.md');
  for (const heading of ['## Dateistruktur zuerst', '## Zuschnitt eines Tasks', '## Schrittgröße', '## Verbotene Platzhalter']) {
    assert.ok(text.includes(`\n${heading}\n`), `${heading} fehlt`);
  }
});

test('taskRules_Structure_OneResponsibilityExistingPatternsFirst', () => {
  const text = reference('task-rules.md');
  assert.match(text, /eine klare Verantwortung/);
  assert.match(text, /Was sich gemeinsam ändert, liegt zusammen/);
  assert.match(text, /vorhandenen Muster/);
});

test('taskRules_Sizing_SmallestUnitWithOwnTestCycle', () => {
  const text = reference('task-rules.md');
  assert.match(text, /kleinste Einheit mit eigenem Testzyklus/);
  assert.match(text, /ablehnen und den Nachbarn trotzdem annehmen/);
});

test('taskRules_Steps_FiveActionsTwoToFiveMinutes', () => {
  const text = reference('task-rules.md');
  assert.match(text, /2–5 Minuten/);
  for (const word of ['fehlschlagenden Test', 'Fehlschlag', 'minimalen Code', 'Erfolg', 'committen']) {
    assert.ok(text.includes(word), `${word} fehlt`);
  }
});

test('taskRules_Placeholders_ListsForbiddenPatterns', () => {
  const text = reference('task-rules.md');
  const patterns = ['TBD', 'TODO', 'später umsetzen', 'Fehlerbehandlung ergänzen', 'Validierung hinzufügen',
    'Randfälle behandeln', 'Tests für das Obige', 'wie Task N', 'in keinem Task definiert'];
  for (const pattern of patterns) assert.ok(text.includes(pattern), `${pattern} fehlt`);
});

test('selfCheck_Checklist_CoveragePlaceholdersConsistencyFormat', () => {
  const text = reference('self-check.md');
  assert.match(text, /Spec-Abdeckung/);
  assert.match(text, /Platzhalter-Scan/);
  assert.match(text, /Namens- und Typ-Konsistenz/);
  assert.match(text, /Format/);
  assert.match(text, /kein SubAgent/);
  assert.match(text, /sofort im Plan/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `task-rules.md` and `self-check.md`.

- [ ] **Step 3: Write both references**

`plugins/forge/skills/plan-writing/references/task-rules.md`:

````markdown
# Task-Regeln

## Dateistruktur zuerst

Bevor du den ersten Task schreibst, listest du jede Datei, die entsteht oder sich ändert, mit ihrer Verantwortung. Hier fallen die Zerlegungsentscheidungen — die Tasks folgen daraus.

- Jede Datei hat eine klare Verantwortung und eine schmale, gut beschriebene Schnittstelle.
- Kleine, fokussierte Dateien statt großer Alleskönner. Verlässlich ändern lässt sich nur, was man als Ganzes im Kopf behält — für dich wie für den Umsetzer.
- Was sich gemeinsam ändert, liegt zusammen. Geschnitten wird nach Verantwortung, nicht nach technischer Schicht.
- Im bestehenden Code gelten die vorhandenen Muster. Du baust nicht eigenmächtig um. Ist eine Datei, die du ohnehin änderst, unhandlich geworden, darf der Plan ihre Teilung enthalten.

Jeder Task liefert danach eine Änderung, die für sich einen Sinn ergibt.

## Zuschnitt eines Tasks

Ein Task ist die kleinste Einheit mit eigenem Testzyklus, die einen eigenen Review wert ist.

- Setup, Konfiguration, Gerüst und Doku gehören in den Task, dessen Ergebnis sie braucht — nicht in eigene Tasks.
- Du teilst nur dort, wo ein Reviewer den einen Task ablehnen und den Nachbarn trotzdem annehmen könnte.
- Jeder Task endet mit einem Ergebnis, das sich unabhängig prüfen lässt.

## Schrittgröße

Ein Schritt ist genau eine Aktion von 2–5 Minuten. Der Zyklus pro Task:

1. fehlschlagenden Test schreiben
2. Test laufen lassen und den Fehlschlag bestätigen
3. minimalen Code schreiben, der den Test grün macht
4. Test laufen lassen und den Erfolg bestätigen
5. committen

## Verbotene Platzhalter

Jeder Schritt enthält den tatsächlichen Inhalt, den der Umsetzer braucht. Diese Muster sind Plan-Fehler — du schreibst sie nie:

- „TBD“, „TODO“, „später umsetzen“, „Details ergänzen“
- „passende Fehlerbehandlung ergänzen“, „Validierung hinzufügen“, „Randfälle behandeln“
- „Tests für das Obige schreiben“ ohne den Testcode selbst
- „wie Task N“ oder „analog zu Task N“ — du wiederholst den Code, weil der Umsetzer Tasks womöglich außer der Reihe liest
- Schritte, die sagen, was zu tun ist, ohne zu zeigen, wie — ein Code-Schritt braucht einen Code-Block
- Verweise auf Typen, Funktionen oder Methoden, die in keinem Task definiert sind und im Code nicht existieren
````

`plugins/forge/skills/plan-writing/references/self-check.md`:

````markdown
# Selbst-Check nach dem Schreiben

Nach dem letzten Task liest du die Spec noch einmal mit frischem Blick und hältst den Plan dagegen. Das ist eine Checkliste für dich selbst, kein SubAgent.

1. **Spec-Abdeckung:** Zeig für jede AC-ID und jede Soll-Vorgabe der Spec auf den Task, der sie umsetzt. Findest du keinen, ergänzt du den Task.
2. **Platzhalter-Scan:** Durchsuch den Plan nach jedem Muster aus `task-rules.md`, Abschnitt „Verbotene Platzhalter“.
3. **Namens- und Typ-Konsistenz:** Heißen Funktionen, Typen und Felder in späteren Tasks genauso wie dort, wo sie entstehen, und haben sie dieselbe Signatur? `ladeKunden()` in Task 2 und `holeKunden()` in Task 5 ist ein Fehler.
4. **Format:** Task-Nummern lückenlos ab 1, jede `Modify`-Zeile mit Anker, jede Verifikation laut Projekt-`CLAUDE.md` erlaubt, `## Entscheidungen` am Ende.

Was du findest, korrigierst du sofort im Plan. Ein zweiter Durchgang ist nicht nötig.
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/skills/plan-writing/references/task-rules.md plugins/forge/skills/plan-writing/references/self-check.md plugins/forge/tests/plan-writing.test.js
git commit -m "feat(forge): add plan-writing task rules and self-check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Skill `plan-writing` + pressure test (Controller for Step 5)

**ACs:** AC-01, AC-03, AC-04, AC-05, AC-07, AC-20

**Files:**
- Create: `plugins/forge/skills/plan-writing/SKILL.md`
- Create: `plugins/forge/tests/fixtures/plan-writing/clear-spec.md`
- Create: `plugins/forge/tests/fixtures/plan-writing/ambiguous-spec.md`
- Modify: `plugins/forge/tests/plan-writing.test.js` (append)

**Interfaces:**
- Consumes: the three references from Tasks 1 and 2 (linked as `references/<name>`); `readMarkdown`, `wordCount` from `tests/lib/markdown.js`.
- Produces: `/dv-forge:plan-writing <spec.md>`; writes `plan.md` next to the spec; hands over with `/dv-forge:plan-review <pfad/plan.md>`.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/plan-writing.test.js`:

```js
const fs = require('node:fs');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['plan-format.md', 'task-rules.md', 'self-check.md'];

test('skill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'plan-writing');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md>');
});

test('skill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('skill_Body_LinksAllReferencesThatExist', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of REFERENCES) {
    assert.ok(body.includes(`references/${name}`), `${name} nicht verlinkt`);
    assert.ok(fs.existsSync(path.join(SKILL_DIR, 'references', name)), `${name} fehlt`);
  }
});

test('skill_Body_WritesPlanNextToSpecAndHandsOverToPlanReview', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`plan.md` im Ordner der Spec'));
  assert.match(body, /nie überschreiben/);
  assert.ok(body.includes('/dv-forge:plan-review <pfad/plan.md>'));
  assert.match(body, /frischen Session/);
  assert.ok(body.includes('Du committest nichts.'));
});

test('skill_Body_AsksHumanAndRecordsWEntries', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /eine Frage pro Nachricht/);
  assert.ok(body.includes('W-Eintrag'));
  assert.ok(body.includes('`delegiert`'));
  assert.match(body, /keine Annahme stillschweigend/);
});

test('skill_Body_KeepsGuidingPrinciples', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /null Kontext/);
  assert.match(body, /DRY\. YAGNI\. TDD\./);
  assert.match(body, /Kündige an/);
  assert.match(body, /mehrere unabhängige Teilsysteme/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `plan-writing/SKILL.md`.

- [ ] **Step 3: Write the skill and the two fixtures**

`plugins/forge/skills/plan-writing/SKILL.md`:

````markdown
---
name: plan-writing
description: Use when an approved dv-forge spec.md has to become an implementation plan with exact files, interfaces and test-first steps before any code is written.
disable-model-invocation: true
argument-hint: <spec.md>
---

# Plan-Writing

Argumente: `$ARGUMENTS`

Kündige an: „Ich schreibe mit dv-forge:plan-writing den Umsetzungsplan.“

## Leitbild
Du schreibst für einen Umsetzer, der sein Handwerk beherrscht, aber null Kontext zu diesem Projekt, seinen Werkzeugen und dem Fachgebiet hat — und dessen Gespür für guten Testentwurf du nicht vertrauen darfst. Alles, was er braucht, steht im Plan: welche Dateien, welcher Code, welche Tests, welche Doku er nachlesen muss, wie er prüft. Kleine Tasks. DRY. YAGNI. TDD. Häufige Commits.

## Ablauf
1. **Spec lesen.** Das erste Argument ist die Spec. Fehlt die Datei: melden „Spec nicht gefunden: <pfad>“ und Ende. Steht im Kopf `Status: Abbruch`: warnen und den Menschen entscheiden lassen, ob du weitermachst.
2. **Umfang prüfen.** Beschreibt die Spec mehrere unabhängige Teilsysteme, empfiehlst du einen Plan pro Teilsystem und fragst nach. Jeder Plan muss für sich lauffähige, testbare Software ergeben.
3. **Ziel festlegen:** `plan.md` im Ordner der Spec. Existiert sie schon: nachfragen, nie überschreiben.
4. **Kontext lesen:** Projekt-`CLAUDE.md` und den betroffenen Code. Dann legst du die Dateistruktur nach `references/task-rules.md` fest.
5. **Offene Fragen** stellst du dem Menschen, eine Frage pro Nachricht, mit Empfehlung und Grund. Dazu gehören echte Architektur-Alternativen; geplant wird genau eine. Jede Antwort notierst du sofort als W-Eintrag mit Tag `Mensch`. Sagt der Mensch „entscheide du“, gilt deine Empfehlung mit Tag `delegiert`. Du triffst keine Annahme stillschweigend.
6. **Plan schreiben** nach `references/plan-format.md` und `references/task-rules.md`.
7. **Selbst-Check** nach `references/self-check.md`; Befunde korrigierst du sofort im Plan.
8. **Übergabe:** Plan-Pfad nennen, dazu den Befehl in einem Code-Block:
   ```
   /dv-forge:plan-review <pfad/plan.md>
   ```
   und den Hinweis, ihn in einer frischen Session zu starten. Du committest nichts.

## Rote Flaggen
| Gedanke | Stattdessen |
|---|---|
| „Die Spec ist klar, ein kurzer Plan ohne Code reicht.“ | Der Umsetzer hat null Kontext. Jeder Code-Schritt enthält vollständigen Code. |
| „Das nehme ich einfach an.“ | Frage an den Menschen, Antwort als W-Eintrag. |
| „Wie Task 3, nur anders.“ | Code wiederholen; Tasks werden womöglich außer der Reihe gelesen. |
| „Tests kommen am Ende.“ | Jeder Task beginnt mit einem fehlschlagenden Test. |
| „Zeilennummern reichen.“ | `Modify` braucht einen stabilen Anker. |
````

`plugins/forge/tests/fixtures/plan-writing/clear-spec.md`:

```markdown
# Titel als URL-Slug

Status: bestätigt am 2026-09-20

## Was, wie, wo, warum
Artikel-Titel sollen als lesbarer Teil einer URL nutzbar sein, damit Links sprechend sind. · Aussage

## Theoretisches Verhalten nach Umsetzung
Aus einem Titel entsteht ein Slug aus Kleinbuchstaben, Ziffern und Bindestrichen. · Aussage

## Soll-Vorgaben
- Node.js 24, keine npm-Abhängigkeiten. · Aussage
- Tests laufen mit `node --test`. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben der Titel „Hallo Welt“, wenn der Slug gebildet wird, dann ist er `hallo-welt`.
- **AC-02** Gegeben der Titel „Über Größe“, wenn der Slug gebildet wird, dann ist er `ueber-groesse`.
- **AC-03** Gegeben ein Titel nur aus Sonderzeichen, wenn der Slug gebildet wird, dann endet der Aufruf mit dem Fehler „Titel ergibt keinen Slug“.

## Entscheidungen
- **W · Umlaute** · Aussage — Umlaute werden ausgeschrieben (ä → ae, ö → oe, ü → ue, ß → ss).
```

`plugins/forge/tests/fixtures/plan-writing/ambiguous-spec.md` — identical to `clear-spec.md`, plus this line appended directly after AC-03:

```markdown
- **AC-04** Gegeben zwei Artikel mit gleichem Titel, wenn beide einen Slug bekommen, dann sind die beiden Slugs verschieden.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Pressure test, baseline vs. skill (Controller)**

Prepare in the session scratchpad: `<SCRATCH>/slug-clear/docs/forge/2026-09-20-slug/spec.md` (copy of `clear-spec.md`) and `<SCRATCH>/slug-ambiguous/docs/forge/2026-09-20-slug/spec.md` (copy of `ambiguous-spec.md`). Both folders contain nothing else.

Scenario text (`<ORDNER>` is `slug-clear` or `slug-ambiguous`):

```
Du bist die Main-Session in Claude Code, Arbeitsordner <SCRATCH>/<ORDNER>. Der Nutzer schreibt:
"/dv-forge:plan-writing <SCRATCH>/<ORDNER>/docs/forge/2026-09-20-slug/spec.md — die Spec ist klar, schreib kurz und ohne Code, der Umsetzer kriegt das hin."
Der Nutzer ist nicht erreichbar. Willst du ihm eine Frage stellen, schreib sie als letzte Zeile deiner Antwort und schreib dann keinen Plan.
```

Four `general-purpose` agents, each with `run_in_background: false`, two per message:
1. Baseline, clear: scenario only.
2. Baseline, ambiguous: scenario only.
3. Skill, clear: "Lies `<ABSOLUTER PFAD zu plugins/forge/skills/plan-writing/SKILL.md>` und die dort verlinkten references und befolge den Skill." plus scenario.
4. Skill, ambiguous: same as 3.

Pass when all of these hold:
- Run 3 wrote `<SCRATCH>/slug-clear/docs/forge/2026-09-20-slug/plan.md`. Every `### Task <n>:` block has a code block under "Schritt 1" and under "Schritt 3". The `**ACs:**` lines together contain AC-01, AC-02, AC-03. The plan ends with `## Entscheidungen`. It contains none of `TBD`, `TODO`, `wie Task`.
- Run 4 wrote no `plan.md`, and its last line is a question about how equal titles become different slugs.
- Record what runs 1 and 2 did (expected: plan without code, or an assumption instead of a question).

If a check fails: sharpen the matching sentence under `## Ablauf` or `## Rote Flaggen` in `SKILL.md`, re-run the failing skill run, at most 2 times. After that, report the gap.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/skills/plan-writing/SKILL.md plugins/forge/tests/fixtures/plan-writing/clear-spec.md plugins/forge/tests/fixtures/plan-writing/ambiguous-spec.md plugins/forge/tests/plan-writing.test.js
git commit -m "feat(forge): add plan-writing skill

Baseline: <what runs 1 and 2 did>. With skill: <what runs 3 and 4 did>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Block B — generalisation + `plan-review` (only after Task 4)

### Task 4: Gate — spec-review complete (Controller)

**ACs:** AC-17

**Files:** none.

**Interfaces:**
- Consumes: the state produced by `docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md`.
- Produces: the go/no-go for Tasks 5–12.

- [ ] **Step 1: Check the spec-review artefacts**

Run:

```bash
test -f plugins/forge/skills/spec-review/SKILL.md && test -f plugins/forge/agents/spec-rework.md && test -f plugins/forge/tests/skill.test.js && echo files-ok
grep -c "B15 · Smoke-Test" docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md
```

Expected: `files-ok`, then `1`.

- [ ] **Step 2: Check the test suite**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 3: Decide**

All expectations met: continue with Task 5. Otherwise stop the whole plan here and report: "Block B wartet auf spec-review: <which check failed>". Do not start Task 5.

---

### Task 5: `aggregate-findings.js` — location-type table

**ACs:** AC-18

**Files:**
- Modify: `plugins/forge/scripts/aggregate-findings.js:9-13` · `normalizeLocation`
- Modify: `plugins/forge/scripts/aggregate-findings.js` · `module.exports`
- Test: `plugins/forge/tests/aggregate-parse.test.js` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `LOCATION_TYPES: Array<{ name: string, pattern: RegExp, normalize: (match: RegExpExecArray) => string }>` and `normalizeLocation(location: string, types = LOCATION_TYPES): string`, both exported. Used by Task 6.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/aggregate-parse.test.js`:

```js
const { LOCATION_TYPES } = require('../scripts/aggregate-findings.js');

test('normalizeLocation_TaskSpellings_AreEqual', () => {
  assert.equal(normalizeLocation('Task 03'), 'task 3');
  assert.equal(normalizeLocation('task 3'), 'task 3');
  assert.equal(normalizeLocation(' TASK   3 '), 'task 3');
});

test('normalizeLocation_GlobalConstraints_FallsBackToHeadingRule', () => {
  assert.equal(normalizeLocation('Global  Constraints'), 'global constraints');
});

test('normalizeLocation_TaskWithStep_IsNotATaskLocation', () => {
  assert.equal(normalizeLocation('Task 3, Schritt 2'), 'task 3, schritt 2');
});

test('locationTypes_Table_HasAcAndTaskRows', () => {
  assert.deepEqual(LOCATION_TYPES.map((type) => type.name), ['ac', 'task']);
});

test('normalizeLocation_ExtraTypeRow_WorksWithoutTouchingOthers', () => {
  const types = [...LOCATION_TYPES, { name: 'x', pattern: /^x-0*(\d+)$/, normalize: (match) => `x-${match[1]}` }];
  assert.equal(normalizeLocation('X-05', types), 'x-5');
  assert.equal(normalizeLocation('AC-07', types), 'ac-7');
  assert.equal(normalizeLocation('Task 03', types), 'task 3');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `normalizeLocation('Task 03')` returns `'task 03'`, and `LOCATION_TYPES` is `undefined`.

- [ ] **Step 3: Replace `normalizeLocation` with the table**

In `plugins/forge/scripts/aggregate-findings.js`, replace the function `normalizeLocation` with:

```js
const LOCATION_TYPES = [
  { name: 'ac', pattern: /^ac-0*(\d+)$/, normalize: (match) => `ac-${match[1]}` },
  { name: 'task', pattern: /^task 0*(\d+)$/, normalize: (match) => `task ${match[1]}` },
];

function collapseLocation(location) {
  return String(location).trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeLocation(location, types = LOCATION_TYPES) {
  const collapsed = collapseLocation(location);
  for (const type of types) {
    const match = type.pattern.exec(collapsed);
    if (match) return type.normalize(match);
  }
  return collapsed;
}
```

Replace the `module.exports` line with:

```js
module.exports = { SEVERITY_RANK, LOCATION_TYPES, normalizeLocation, extractReviews, aggregate, summarize, run, render };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` (the existing AC and heading tests stay green).

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/aggregate-findings.js plugins/forge/tests/aggregate-parse.test.js
git commit -m "feat(forge): normalise finding locations via a type table

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: New script `rework-outcome.js`

**ACs:** AC-14, AC-24

**Files:**
- Create: `plugins/forge/scripts/rework-outcome.js`
- Test: `plugins/forge/tests/rework-outcome.test.js`

**Interfaces:**
- Consumes: `normalizeLocation(location)` from Task 5; the rendered output of `aggregate-findings.js` (`render(run(text, expected))`), whose REWORK section has one header per group: `### 🔴 <location> (<reviewers>[ · hochgestuft])`.
- Produces: CLI `node rework-outcome.js --escalation-status <status>` reading stdin
  ```
  === AGGREGATE ===
  <output of aggregate-findings.js>
  === REWORK-RESULT ===
  <rework agent answer ending in a JSON block {"results":[{"location","status"}]}>
  ```
  stdout: first line `OUTCOME all-red-escalated=<true|false> escalated=<k>`, then one line `ESCALATED <location>` per result with the given status. Exit codes: 0 ok, 1 invalid input, 2 missing parameter. Exports `evaluate(text: string, escalationStatus: string): { allRedEscalated: boolean, escalated: string[] }`, `render(outcome): string`, `parseStatus(args: string[]): string`. Used by Task 11.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/rework-outcome.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const aggregateFindings = require('../scripts/aggregate-findings.js');
const outcome = require('../scripts/rework-outcome.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'rework-outcome.js');
const finding = (location, severity) => ({ location, quote: 'q', severity, consequence: 'c', rationale: 'r' });
const block = (value) => '```json\n' + JSON.stringify(value) + '\n```';

function aggregateText(findings) {
  const text = block({ reviewer: 'coverage', findings });
  return aggregateFindings.render(aggregateFindings.run(text, ['coverage']));
}

function input(findings, results) {
  return `=== AGGREGATE ===\n${aggregateText(findings)}\n=== REWORK-RESULT ===\nErledigt.\n${block({ results })}\n`;
}

test('evaluate_AllRedAreSpecQuestions_ReturnsTrue', () => {
  const text = input([finding('AC-04', 'red'), finding('Task 2', 'red')],
    [{ location: 'AC-04', status: 'spec-question' }, { location: 'Task 2', status: 'spec-question' }]);
  const result = outcome.evaluate(text, 'spec-question');
  assert.equal(result.allRedEscalated, true);
  assert.deepEqual(result.escalated, ['AC-04', 'Task 2']);
});

test('evaluate_MixedStatuses_ReturnsFalse', () => {
  const text = input([finding('AC-04', 'red'), finding('Task 2', 'red')],
    [{ location: 'AC-04', status: 'spec-question' }, { location: 'Task 2', status: 'changed' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_RedWithoutResultEntry_ReturnsFalse', () => {
  const text = input([finding('AC-04', 'red'), finding('Task 2', 'red')], [{ location: 'AC-04', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_LocationSpelledDifferently_MatchesNormalised', () => {
  const text = input([finding('Task 03', 'red')], [{ location: 'task 3', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, true);
});

test('evaluate_HeadingWithParentheses_IsRecognised', () => {
  const text = input([finding('Kopf (Ziel)', 'red')], [{ location: 'Kopf (Ziel)', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, true);
});

test('evaluate_OtherStatusParameter_IsUsed', () => {
  const text = input([finding('Task 1', 'red')], [{ location: 'Task 1', status: 'plan-question' }]);
  assert.equal(outcome.evaluate(text, 'plan-question').allRedEscalated, true);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_NoRedGroups_ReturnsFalse', () => {
  const text = input([finding('Task 1', 'yellow')], [{ location: 'Task 1', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_InvalidJson_Throws', () => {
  const text = `=== AGGREGATE ===\n${aggregateText([finding('Task 1', 'red')])}\n=== REWORK-RESULT ===\n\`\`\`json\n{ kaputt\n\`\`\`\n`;
  assert.throws(() => outcome.evaluate(text, 'spec-question'));
});

test('evaluate_ResultsNotAnArray_Throws', () => {
  const text = `=== AGGREGATE ===\n${aggregateText([finding('Task 1', 'red')])}\n=== REWORK-RESULT ===\n${block({ results: 'x' })}\n`;
  assert.throws(() => outcome.evaluate(text, 'spec-question'), /Rückgabe-Format/);
});

test('evaluate_MissingMarkers_Throws', () => {
  assert.throws(() => outcome.evaluate('nur Text', 'spec-question'), /=== AGGREGATE ===/);
});

test('render_Outcome_FirstLineThenEscalatedLines', () => {
  assert.equal(outcome.render({ allRedEscalated: true, escalated: ['AC-04'] }),
    'OUTCOME all-red-escalated=true escalated=1\nESCALATED AC-04');
});

test('parseStatus_MissingOrFlagAsValue_ReturnsEmpty', () => {
  assert.equal(outcome.parseStatus([]), '');
  assert.equal(outcome.parseStatus(['--escalation-status', '--x']), '');
  assert.equal(outcome.parseStatus(['--escalation-status', 'spec-question']), 'spec-question');
});

test('cli_MissingParameter_ExitsWith2', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { input: '', encoding: 'utf8' });
  assert.equal(result.status, 2);
});

test('cli_InvalidInput_ExitsWith1', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--escalation-status', 'spec-question'], { input: 'x', encoding: 'utf8' });
  assert.equal(result.status, 1);
});

test('cli_ValidInput_PrintsOutcome', () => {
  const text = input([finding('AC-04', 'red')], [{ location: 'AC-04', status: 'spec-question' }]);
  const result = spawnSync(process.execPath, [SCRIPT, '--escalation-status', 'spec-question'], { input: text, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'OUTCOME all-red-escalated=true escalated=1\nESCALATED AC-04\n');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `Cannot find module '../scripts/rework-outcome.js'`.

- [ ] **Step 3: Write the script**

`plugins/forge/scripts/rework-outcome.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { normalizeLocation } = require('./aggregate-findings.js');

const AGGREGATE_MARK = '=== AGGREGATE ===';
const RESULT_MARK = '=== REWORK-RESULT ===';
const RED_GROUP = /^### 🔴 (.+) \([^()]*\)$/;
const JSON_BLOCK = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

function splitInput(text) {
  const source = String(text);
  const aggregateAt = source.indexOf(AGGREGATE_MARK);
  const resultAt = source.indexOf(RESULT_MARK);
  if (aggregateAt === -1 || resultAt === -1 || resultAt < aggregateAt) {
    throw new Error(`Eingabe braucht ${AGGREGATE_MARK} und danach ${RESULT_MARK}`);
  }
  return {
    aggregate: source.slice(aggregateAt + AGGREGATE_MARK.length, resultAt),
    result: source.slice(resultAt + RESULT_MARK.length),
  };
}

function redLocations(aggregate) {
  return aggregate.split(/\r?\n/)
    .map((line) => RED_GROUP.exec(line.trimEnd()))
    .filter(Boolean)
    .map((match) => match[1]);
}

function isValidEntry(entry) {
  return entry !== null && typeof entry === 'object'
    && typeof entry.location === 'string' && entry.location.trim() !== ''
    && typeof entry.status === 'string' && entry.status !== '';
}

function parseResults(result) {
  const blocks = [...String(result).matchAll(JSON_BLOCK)];
  if (blocks.length === 0) throw new Error('Kein JSON-Block in der Rückgabe des Nacharbeiters');
  const parsed = JSON.parse(blocks[blocks.length - 1][1]);
  const valid = parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.results)
    && parsed.results.every(isValidEntry);
  if (!valid) throw new Error('JSON-Block verletzt das Rückgabe-Format');
  return parsed.results;
}

function evaluate(text, escalationStatus) {
  const { aggregate, result } = splitInput(text);
  const results = parseResults(result);
  const statusByKey = new Map(results.map((entry) => [normalizeLocation(entry.location), entry.status]));
  const reds = redLocations(aggregate);
  const allRedEscalated = reds.length > 0
    && reds.every((location) => statusByKey.get(normalizeLocation(location)) === escalationStatus);
  const escalated = results.filter((entry) => entry.status === escalationStatus).map((entry) => entry.location.trim());
  return { allRedEscalated, escalated };
}

function render(outcome) {
  return [
    `OUTCOME all-red-escalated=${outcome.allRedEscalated} escalated=${outcome.escalated.length}`,
    ...outcome.escalated.map((location) => `ESCALATED ${location}`),
  ].join('\n');
}

function parseStatus(args) {
  const index = args.indexOf('--escalation-status');
  const value = index === -1 ? '' : String(args[index + 1] ?? '');
  return value.startsWith('--') ? '' : value;
}

function main() {
  const status = parseStatus(process.argv.slice(2));
  if (!status) {
    process.stderr.write('Aufruf: node rework-outcome.js --escalation-status <status> < eingabe\n');
    process.exit(2);
  }
  try {
    process.stdout.write(`${render(evaluate(fs.readFileSync(0, 'utf8'), status))}\n`);
  } catch (error) {
    process.stderr.write(`dv-forge rework-outcome: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { evaluate, render, parseStatus };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/rework-outcome.js plugins/forge/tests/rework-outcome.test.js
git commit -m "feat(forge): add rework-outcome script with escalation status parameter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `guard-orchestrator.js` — command table, `protected[]`, directory entries

**ACs:** AC-08 (path rule), AC-16, AC-27

**Files:**
- Modify: `plugins/forge/scripts/guard-orchestrator.js` (whole file)
- Modify: `plugins/forge/tests/guard-orchestrator.test.js` · tests `parseSpecArgument_PlainAndQuotedPaths_ReturnsPath`, `parseSpecArgument_OtherPrompt_ReturnsNull`, `onPrompt_SkillCall_WritesMarkerWithAbsoluteSpecPath` (replace), then append

**Interfaces:**
- Consumes: nothing new. `hooks/hooks.json` stays unchanged.
- Produces: marker JSON `{ command: string, protected: Array<{ path: string, kind: 'file' | 'dir' }> }`; exports `markerPath`, `parseSkillCall(prompt): { command, files } | null`, `writeMarker(sessionId, marker, tmpRoot?)`, `onPrompt`, `decidePreTool`, `release`, `COMMANDS`. `rework-outcome.js` is an allowed shell script. Directory entries are used by sub-project 3; spec- and plan-review write only file entries.

- [ ] **Step 1: Replace the three spec-only tests**

In `plugins/forge/tests/guard-orchestrator.test.js`, delete the tests `parseSpecArgument_PlainAndQuotedPaths_ReturnsPath`, `parseSpecArgument_OtherPrompt_ReturnsNull` and `onPrompt_SkillCall_WritesMarkerWithAbsoluteSpecPath` and put these in their place:

```js
test('parseSkillCall_SpecReviewPlainAndQuoted_ProtectsSpec', () => {
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review docs/spec.md'),
    { command: '/dv-forge:spec-review', files: ['docs/spec.md'] });
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review "my docs/spec.md" q.md --rounds 2').files, ['my docs/spec.md']);
});

test('parseSkillCall_OtherPrompt_ReturnsNull', () => {
  assert.equal(guard.parseSkillCall('bitte review docs/spec.md'), null);
  assert.equal(guard.parseSkillCall('/dv-forge:spec-review'), null);
});

test('onPrompt_SpecReview_WritesMarkerWithAbsoluteFileEntry', () => {
  const env = setup();
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
  assert.equal(marker.command, '/dv-forge:spec-review');
  assert.deepEqual(marker.protected, [{ path: env.specPath, kind: 'file' }]);
});
```

- [ ] **Step 2: Append the new tests**

Append to `plugins/forge/tests/guard-orchestrator.test.js`:

```js
function setupPlanReview(prompt = '/dv-forge:plan-review docs/forge/x/plan.md') {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-repo-'));
  guard.onPrompt({ session_id: SESSION, cwd, prompt }, tmpRoot);
  return {
    tmpRoot, cwd,
    planPath: path.join(cwd, 'docs', 'forge', 'x', 'plan.md'),
    specPath: path.join(cwd, 'docs', 'forge', 'x', 'spec.md'),
  };
}

function setupDirectory() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-dir-'));
  const repo = path.join(base, 'repo');
  guard.writeMarker(SESSION, { command: '/dv-forge:test', protected: [{ path: repo, kind: 'dir' }] }, tmpRoot);
  return { tmpRoot, cwd: base, repo, sibling: path.join(base, 'repo-alt') };
}

test('parseSkillCall_PlanReviewWithoutSpec_UsesSpecInPlanFolder', () => {
  const call = guard.parseSkillCall('/dv-forge:plan-review docs/forge/x/plan.md --rounds 2');
  assert.equal(call.command, '/dv-forge:plan-review');
  assert.deepEqual(call.files.map((file) => file.replace(/\\/g, '/')), ['docs/forge/x/plan.md', 'docs/forge/x/spec.md']);
});

test('parseSkillCall_PlanReviewWithSpec_ProtectsBoth', () => {
  const call = guard.parseSkillCall('/dv-forge:plan-review "my plans/plan.md" other/spec.md --rounds 2');
  assert.deepEqual(call.files, ['my plans/plan.md', 'other/spec.md']);
});

test('decidePreTool_PlanReviewMainSessionReadsPlan_DeniesWithPlanReason', () => {
  const env = setupPlanReview();
  const reason = preTool(env, { tool_name: 'Read', tool_input: { file_path: env.planPath } });
  assert.match(reason, /dv-forge:plan-review läuft/);
});

test('decidePreTool_PlanReviewMainSessionReadsSpecInPlanFolder_Denies', () => {
  const env = setupPlanReview();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
});

test('decidePreTool_PlanReviewShellNamesPlan_Denies', () => {
  const env = setupPlanReview();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/forge/x/PLAN.md' } }));
});

test('decidePreTool_PlanReviewShellIsReworkOutcome_Allows', () => {
  const env = setupPlanReview();
  const command = `node "/plugins/forge/scripts/rework-outcome.js" --escalation-status spec-question <<'EOF'\nplan.md\nEOF`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_PlanReviewSubagentEditsPlan_Allows', () => {
  const env = setupPlanReview();
  assert.equal(preTool(env, { agent_id: 'agent-1', tool_name: 'Edit', tool_input: { file_path: env.planPath } }), null);
});

test('decidePreTool_DirectoryEntryFileInside_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.repo, 'src', 'x.cs') } }));
});

test('decidePreTool_DirectoryEntrySiblingWithSamePrefix_Allows', () => {
  const env = setupDirectory();
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.sibling, 'x.cs') } }), null);
});

test('decidePreTool_DirectoryEntryGrepInside_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.repo, 'src') } }));
});

test('decidePreTool_DirectoryEntryShellNamesDirectory_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `ls "${env.repo}"` } }));
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `guard.parseSkillCall is not a function`, `guard.writeMarker is not a function`.

- [ ] **Step 4: Rewrite the guard**

This plan was written against `guard-orchestrator.js` as of commit `1ce9183`. Before replacing, run `git log --oneline 1ce9183..HEAD -- plugins/forge/scripts/guard-orchestrator.js`. For every listed commit, read its diff (`git show <hash>`); behaviour it adds that the code below lacks must be carried over and named in the commit body.

`plugins/forge/scripts/guard-orchestrator.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FILE_TOOLS = {
  Read: 'file_path', Edit: 'file_path', Write: 'file_path', MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
};
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js'];
const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g;
const DEFAULT_REASON = 'dv-forge-Orchestrator läuft: geschützte Dateien werden nur von SubAgents gelesen und geändert.';

const COMMANDS = {
  '/dv-forge:spec-review': {
    reason: 'dv-forge:spec-review läuft: Der Orchestrator liest und ändert die Spec nicht. '
      + 'Prüfen übernehmen die Reviewer-Agents, Korrigieren der Agent spec-rework.',
    protect: ([spec]) => (spec ? [spec] : null),
  },
  '/dv-forge:plan-review': {
    reason: 'dv-forge:plan-review läuft: Der Orchestrator liest und ändert weder Plan noch Spec. '
      + 'Prüfen übernehmen die Reviewer-Agents, Korrigieren der Agent plan-rework.',
    protect: ([plan, spec]) => (plan ? [plan, spec ?? path.join(path.dirname(plan), 'spec.md')] : null),
  },
};

function markerPath(sessionId, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `${sessionId}.json`);
}

function normalize(value) {
  const resolved = path.resolve(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isWithin(filePath, dirPath) {
  const file = normalize(filePath);
  const dir = normalize(dirPath);
  return file === dir || file.startsWith(`${dir}/`);
}

function tokenize(text) {
  return [...String(text).matchAll(TOKEN)].map((match) => match[1] ?? match[2] ?? match[3]);
}

function positionalArguments(args) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--rounds') {
      index += 1;
      continue;
    }
    if (!args[index].startsWith('--')) result.push(args[index]);
  }
  return result;
}

function parseSkillCall(prompt) {
  const [command, ...args] = tokenize(String(prompt ?? '').trim());
  const entry = COMMANDS[command];
  if (!entry) return null;
  const files = entry.protect(positionalArguments(args));
  return files ? { command, files } : null;
}

function writeMarker(sessionId, marker, tmpRoot) {
  const file = markerPath(sessionId, tmpRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(marker));
}

function readMarker(sessionId, tmpRoot) {
  try {
    return JSON.parse(fs.readFileSync(markerPath(sessionId, tmpRoot), 'utf8'));
  } catch {
    return null;
  }
}

function onPrompt(input, tmpRoot) {
  const call = parseSkillCall(input.prompt);
  if (!call) return;
  const entries = call.files.map((file) => ({ path: path.resolve(input.cwd, file), kind: 'file' }));
  writeMarker(input.session_id, { command: call.command, protected: entries }, tmpRoot);
}

function hitsEntry(target, entry) {
  return entry.kind === 'dir' ? isWithin(target, entry.path) : normalize(target) === normalize(entry.path);
}

function grepHitsEntry(searchRoot, entry) {
  return isWithin(entry.path, searchRoot) || (entry.kind === 'dir' && isWithin(searchRoot, entry.path));
}

function shellHitsEntry(command, entry) {
  const needle = entry.kind === 'dir'
    ? path.resolve(entry.path).replace(/\\/g, '/').toLowerCase()
    : path.basename(entry.path).toLowerCase();
  return command.includes(needle);
}

function touchesProtected(input, entries) {
  const toolInput = input.tool_input ?? {};
  if (input.tool_name === 'Grep') {
    const searchRoot = path.resolve(input.cwd, toolInput.path ?? '.');
    return entries.some((entry) => grepHitsEntry(searchRoot, entry));
  }
  if (Object.hasOwn(FILE_TOOLS, input.tool_name)) {
    const target = toolInput[FILE_TOOLS[input.tool_name]];
    return Boolean(target) && entries.some((entry) => hitsEntry(path.resolve(input.cwd, target), entry));
  }
  if (SHELL_TOOLS.has(input.tool_name)) {
    const command = String(toolInput.command ?? '').toLowerCase().replace(/\\/g, '/');
    return !ALLOWED_SCRIPTS.some((script) => command.includes(script))
      && entries.some((entry) => shellHitsEntry(command, entry));
  }
  return false;
}

function decidePreTool(input, tmpRoot) {
  if (input.agent_id) return null;
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker || !Array.isArray(marker.protected)) return null;
  if (!touchesProtected(input, marker.protected)) return null;
  return COMMANDS[marker.command]?.reason ?? DEFAULT_REASON;
}

function release(sessionId, tmpRoot) {
  fs.rmSync(markerPath(sessionId, tmpRoot), { force: true });
}

function writeDeny(reason) {
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function main() {
  const [event, argument] = process.argv.slice(2);
  if (event === 'release') return release(argument);
  const input = readStdinJson();
  if (event === 'prompt') return onPrompt(input);
  if (event === 'pretool') return writeDeny(decidePreTool(input));
  if (event === 'stop') return release(input.session_id);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge guard: ${error.message}\n`);
  }
}

module.exports = { COMMANDS, markerPath, parseSkillCall, writeMarker, onPrompt, decidePreTool, release };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including all pre-existing spec-review guard tests (Grep cases, shell cases, sub-agent, foreign session, release, CLI, hooks.json).

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/guard-orchestrator.test.js
git commit -m "feat(forge): guard plan-review and directory entries via a command table

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Shared review loop + slim `spec-review` (Controller for Step 6)

**ACs:** AC-17, AC-25

**Files:**
- Move: `plugins/forge/skills/spec-review/references/finding-format.md` → `plugins/forge/shared/review-loop/finding-format.md`
- Move: `plugins/forge/skills/spec-review/references/severity-rules.md` → `plugins/forge/shared/review-loop/severity-rules.md`
- Move: `plugins/forge/skills/spec-review/references/report-format.md` → `plugins/forge/shared/review-loop/report-format.md`
- Create: `plugins/forge/shared/review-loop/loop.md`
- Modify: `plugins/forge/skills/spec-review/SKILL.md` (whole body)
- Modify: `plugins/forge/tests/skill.test.js` · tests `skill_Body_DispatchesAllAgentsInForeground`, `skill_Body_UsesScriptsViaPluginRoot`
- Create: `plugins/forge/tests/review-loop.test.js`

**Interfaces:**
- Consumes: CLI contracts of `file-hash.js`, `aggregate-findings.js` (`--expect`, `STATUS …`, `=== REPORT ===`, `=== REWORK ===`), `guard-orchestrator.js release <session>`.
- Produces: `shared/review-loop/loop.md` with the building blocks a skill must define: **Eingaben**, **Reviewer**, **Nacharbeiter**, **Fortschritts-Skript**, **Zusatz-Stopps**, **Bericht**; placeholders `<PLUGIN>` and `<SESSION>`. `report-format.md` with `<Berichtstitel>`. Used by Task 11.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/review-loop.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const SHARED = path.join(__dirname, '..', 'shared', 'review-loop');
const OLD_REFERENCES = path.join(__dirname, '..', 'skills', 'spec-review', 'references');

test('sharedLoop_Files_ExistAndOldReferencesAreGone', () => {
  for (const name of ['loop.md', 'finding-format.md', 'severity-rules.md', 'report-format.md']) {
    assert.ok(fs.existsSync(path.join(SHARED, name)), `${name} fehlt`);
  }
  assert.equal(fs.existsSync(OLD_REFERENCES), false);
});

test('loop_BuildingBlocks_AllNamed', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  for (const block of ['Eingaben', 'Reviewer', 'Nacharbeiter', 'Fortschritts-Skript', 'Zusatz-Stopps', 'Bericht']) {
    assert.ok(text.includes(`| ${block} |`), `${block} fehlt`);
  }
});

test('loop_Round_ForegroundAggregateStopsAndProgress', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  for (const part of ['run_in_background: false', '<PLUGIN>/scripts/aggregate-findings.js', '--expect <aktiv>',
    'failed=', 'clean=true', 'r = N+1', 'red=0', 'Stillstand in Runde r', '<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('loop_ProgressCheck_NamesNoConcreteScript', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.ok(!text.includes('file-hash.js'));
  assert.ok(!text.includes('${CLAUDE_PLUGIN_ROOT}'));
});

test('reportFormat_Generic_TitleAndSkillSpecificParts', () => {
  const text = readText(path.join(SHARED, 'report-format.md'));
  assert.ok(text.includes('## <Berichtstitel>: <pfad des Artefakts>'));
  assert.ok(text.includes('<Zusatz-Status des Skills>'));
  assert.ok(text.includes('<Zusatz-Abschnitte des Skills>'));
  assert.ok(!text.includes('Spec-Review:'));
});

test('findingFormat_Generic_LocationKeysIncludeTask', () => {
  const text = readText(path.join(SHARED, 'finding-format.md'));
  assert.ok(text.includes('`Task <n>`'));
  assert.ok(!text.includes('<completeness|consistency'));
});
```

In `plugins/forge/tests/skill.test.js` replace the two tests named above with:

```js
const LOOP = path.join(__dirname, '..', 'shared', 'review-loop', 'loop.md');

function readLoop() {
  return fs.readFileSync(LOOP, 'utf8');
}

test('skill_Body_ListsAllAgentsAndLoopRunsThemInForeground', () => {
  const { body } = readSkill();
  for (const agent of [...AGENTS, 'dv-forge:spec-rework']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(readLoop().includes('run_in_background: false'));
});

test('skill_Body_DefinesPluginRootSessionAndReadsLoop', () => {
  const { body } = readSkill();
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js'));
  for (const script of ['aggregate-findings.js', 'guard-orchestrator.js']) {
    assert.ok(readLoop().includes(`<PLUGIN>/scripts/${script}`), `${script} fehlt in loop.md`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `loop.md fehlt`, the old references folder still exists, `<PLUGIN>` not in `SKILL.md`.

- [ ] **Step 3: Move the references and write the shared files**

```bash
mkdir -p plugins/forge/shared/review-loop
git mv plugins/forge/skills/spec-review/references/finding-format.md plugins/forge/shared/review-loop/finding-format.md
git mv plugins/forge/skills/spec-review/references/severity-rules.md plugins/forge/shared/review-loop/severity-rules.md
git mv plugins/forge/skills/spec-review/references/report-format.md plugins/forge/shared/review-loop/report-format.md
rmdir plugins/forge/skills/spec-review/references
```

`plugins/forge/shared/review-loop/finding-format.md` (replace content):

````markdown
# Findings-Format

Jeder Reviewer beendet seine Antwort mit genau einem JSON-Block. Nach dem Block folgt kein Text.

```json
{
  "reviewer": "<Kurzname des Reviewers>",
  "findings": [
    {
      "location": "AC-07",
      "quote": "wörtliches Zitat aus dem geprüften Dokument",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: ein Stellen-Schlüssel des Skills — `AC-<Zahl>`, `Task <n>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor. Details auf Schritt-Ebene gehören in `quote`.
- `quote`: wörtlich aus dem geprüften Dokument. Bei Befunden aus einer Zusatzquelle mit Präfix `Quelle: `.
- `severity`: `red` | `yellow` | `green`, siehe `severity-rules.md`.
- Keine Findings: `"findings": []`.
- Alle Felder sind Strings und Pflicht. Ein Block, der davon abweicht, gilt als ungültig. Der Reviewer wird dann einmal neu gestartet.
````

`plugins/forge/shared/review-loop/severity-rules.md` — replace only step 1 of the numbered list with:

```markdown
1. `location` normalisieren über die Tabelle der Stellen-Typen in `aggregate-findings.js`: `AC-7` = `AC-07`, `Task 3` = `Task 03`; alles andere per Rückfall-Regel (trim, Leerzeichen, Kleinschreibung).
```

`plugins/forge/shared/review-loop/report-format.md` (replace content):

````markdown
# Abschlussbericht (nur im Chat)

```markdown
## <Berichtstitel>: <pfad des Artefakts>

**Status:** <sauber nach Review r | Cap erreicht, k × 🔴 offen | Stillstand in Runde r | Zusatz-Status des Skills>
**Reviews:** <anzahl> · **Nacharbeiten:** <anzahl>
**Ausgefallen:** <reviewer-liste>        ← nur wenn vorhanden

### Letztes Review
<Abschnitt zwischen `=== REPORT ===` und `=== REWORK ===` aus der letzten Aggregation, unverändert>

<Zusatz-Abschnitte des Skills>

Nächster Schritt: <Text aus dem Skill>
```

- `k` = Wert `red=` aus der letzten `STATUS`-Zeile.
- Keine Review-Dateien schreiben, nichts committen.
````

`plugins/forge/shared/review-loop/loop.md`:

````markdown
# Review-Loop

Gemeinsamer Ablauf aller dv-forge-Orchestrator-Skills. `<PLUGIN>` und `<SESSION>` nennt dir der aufrufende Skill. Er legt außerdem fest:

| Baustein | Bedeutung |
|---|---|
| Eingaben | Geprüfte Dateien, ihre Existenzprüfung, `N` (maximale Nacharbeiten) und `aktiv` |
| Reviewer | Agent-Namen mit ihren Eingaben; ihre Kurznamen bilden `aktiv` |
| Nacharbeiter | Agent-Name und seine Eingabe |
| Fortschritts-Skript | Aufruf, dessen Ausgabe vor und nach der Nacharbeit verglichen wird |
| Zusatz-Stopps | Prüfungen direkt nach der Nacharbeit, falls vorhanden |
| Bericht | Titel, zusätzliche Status-Werte und Abschnitte, nächster Schritt |

## Rolle
Du orchestrierst, sonst nichts. Du liest die geprüften Dateien nicht, bewertest keine Findings und änderst nichts selbst. Jede Entscheidung ist mechanisch: Zähler, `STATUS`-Zeile, Skript-Ausgaben. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Loop fort. Ein Hook blockt deine Zugriffe auf die geschützten Dateien.

## Runde r
Start: `r = 1`, `nacharbeiten = 0`.

1. **Review:** In EINER Nachricht je aktivem Reviewer einen `Agent`-Call mit `run_in_background: false`, jeder als frische Instanz, mit genau den Eingaben aus dem Skill und ohne Findings früherer Runden.
2. **Aggregieren:** Den letzten JSON-Block jedes Reviewers wörtlich übergeben:
   ```bash
   node "<PLUGIN>/scripts/aggregate-findings.js" --expect <aktiv> <<'DV_FORGE_EOF'
   <JSON-Blöcke>
   DV_FORGE_EOF
   ```
3. Nennt `STATUS` unter `failed=` Reviewer: diese einmal neu starten, dann erneut aggregieren, mit allen Blöcken plus den neuen. Wer danach noch fehlt, gilt als ausgefallen.
4. **Stopp**, in dieser Reihenfolge:
   - `clean=true` → Ende „sauber nach Review r“
   - `r = N+1` → Ende „Cap erreicht“
   - `red=0` (nur Ausfall) → `r = r+1`, weiter mit Schritt 1 ohne Nacharbeit
5. **Nacharbeit:**
   1. Fortschritts-Skript des Skills ausführen, Ausgabe merken.
   2. Nacharbeiter mit `run_in_background: false` starten: Eingaben aus dem Skill, dazu `Runde: <r>`, `Findings:` und der REWORK-Abschnitt der Aggregation unverändert.
   3. Zusatz-Stopps des Skills prüfen.
   4. Fortschritts-Skript erneut ausführen. Gleiche Ausgabe → Ende „Stillstand in Runde r“.
   5. `nacharbeiten + 1`, `r = r+1`, weiter mit Schritt 1.

## Abschluss
1. Bericht im Chat nach `<PLUGIN>/shared/review-loop/report-format.md`, mit dem REPORT-Abschnitt der letzten Aggregation und den Angaben des Skills. Keine Dateien schreiben, nichts committen.
2. `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`
````

- [ ] **Step 4: Slim `spec-review/SKILL.md`**

First compare the current `plugins/forge/skills/spec-review/SKILL.md` with the version in `docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md`, Task 9 Step 3. Sentences that the spec-review session sharpened after its pressure test belong into `## Rolle` of `loop.md` (if generic) or into the new `SKILL.md` below (if spec-specific). Name every carried-over sentence in the commit body.

Replace the file with:

````markdown
---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review loop of parallel reviewers, mechanical aggregation and rework until it is clean or the round cap is reached.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--rounds N]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Spec gilt. Du liest die Spec nicht.

## Eingaben
1. Das erste Argument ist die Spec (`S`, absolut machen). Ein weiteres Argument ohne `--` ist die Quelle (`Q`). `--rounds N` gibt die maximale Zahl an Nacharbeiten an, Default 3.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<S>"` ausführen. Ist der Exit ≠ 0: melden „Spec nicht gefunden: <S>“ und Ende.
3. Profile per Glob suchen: `<glossar>/*.md` (Ort aus der Projekt-CLAUDE.md, sonst `docs/glossary`) und `docs/application/**/*.md`. Gibt es Treffer, ist `profiles` aktiv und `P` = Trefferliste. Du liest diese Dateien nicht.
4. `aktiv = completeness,consistency,feasibility,clarity[,profiles]`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>` und `Profile: <P>`, nur wenn aktiv

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>`

## Fortschritts-Skript
`node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<S>"`

## Zusatz-Stopps
Keine.

## Bericht
Titel „Spec-Review“, Artefakt `<S>`, keine Zusatz-Status und keine Zusatz-Abschnitte. Nächster Schritt: „Spec und Abschnitt „Entscheidungen“ lesen, dann selbst committen.“
````

- [ ] **Step 5: Run the tests and check for stale paths**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including `pluginFiles_NoneMentionsOriginOfPlanWriting` and all remaining spec-review skill tests (frontmatter, word count).

Run: `grep -rn "spec-review/references\|references/finding-format\|references/severity-rules\|references/report-format" plugins/forge`
Expected: no output. Any hit (e.g. in `spec-rework.md` or a test) is updated to the `shared/review-loop/` path in this task.

- [ ] **Step 6: Re-run the spec-review pressure test (Controller)**

Run the pressure test from `docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md`, Task 9 Step 5, **with skill only** (no baseline). The skill prompt becomes: "Lies `<ABSOLUTER PFAD zu skills/spec-review/SKILL.md>` und die dort genannte `loop.md` (ersetze `${CLAUDE_PLUGIN_ROOT}` durch `<ABSOLUTER PFAD zu plugins/forge>`) und befolge sie." Same pass criteria as there. On failure: sharpen `## Rolle` in `loop.md`, at most 2 times, then report.

- [ ] **Step 7: Commit**

```bash
git add plugins/forge/shared/review-loop plugins/forge/skills/spec-review/SKILL.md plugins/forge/tests/skill.test.js plugins/forge/tests/review-loop.test.js
git commit -m "refactor(forge): share the review loop between orchestrator skills

Pressure test with skill: <result>. Carried over: <sentences or none>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git mv` already staged the deletions of the old paths; `git add plugins/forge/shared/review-loop` stages the new content.

---

### Task 9: Plan-review fixtures + five reviewer agents (Controller for Step 5)

**ACs:** AC-09 (inputs), AC-10, AC-11, AC-20 (reviewer part)

**Files:**
- Create: `plugins/forge/tests/fixtures/plan-review/spec.md`
- Create: `plugins/forge/tests/fixtures/plan-review/plan.md`
- Create: `plugins/forge/tests/fixtures/plan-review/repo/CLAUDE.md`
- Create: `plugins/forge/tests/fixtures/plan-review/repo/src/orders/order-repository.js`
- Create: `plugins/forge/tests/fixtures/plan-review/repo/src/orders/order-service.js`
- Create: `plugins/forge/tests/fixtures/plan-review/repo/src/http/routes.js`
- Create: `plugins/forge/agents/plan-review-coverage.md`
- Create: `plugins/forge/agents/plan-review-feasibility.md`
- Create: `plugins/forge/agents/plan-review-architecture.md`
- Create: `plugins/forge/agents/plan-review-risks.md`
- Create: `plugins/forge/agents/plan-review-buildability.md`
- Modify: `plugins/forge/tests/agents.test.js` (append)

**Interfaces:**
- Consumes: `readAgent(name)` and `FORMAT_KEYS` in `agents.test.js` (exist); finding format from `shared/review-loop/finding-format.md`.
- Produces: agents `dv-forge:plan-review-<coverage|feasibility|architecture|risks|buildability>`. Input lines: `Plan: <abs>`, `Spec: <abs>`, and for all except coverage `Repo: <abs>`. Output: one JSON block with `"reviewer": "<kurzname>"`. Used by Task 11. The saved aggregate output from Step 5 is used by Task 10.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/agents.test.js`:

```js
const PLAN_REVIEWERS = {
  coverage: 'Read',
  feasibility: 'Read, Grep, Glob',
  architecture: 'Read, Grep, Glob',
  risks: 'Read, Grep, Glob',
  buildability: 'Read, Grep, Glob',
};

for (const [reviewer, tools] of Object.entries(PLAN_REVIEWERS)) {
  const name = `plan-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, tools);
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_FormatCalibrationDecisionsLocations`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.ok(body.includes('## W-Einträge'), 'W-Einträge fehlt');
    assert.ok(body.includes('## Kalibrierung'), 'Kalibrierung fehlt');
    assert.ok(body.includes('`Task <n>`'), 'Stellen-Schlüssel fehlt');
  });
}

test('plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed', () => {
  const { body } = readAgent('plan-review-coverage');
  assert.match(body, /keinen Code/);
  assert.match(body, /immer `red`/);
});

test('plan-review-codeReaders_Body_TakeRepoInput', () => {
  for (const reviewer of ['feasibility', 'architecture', 'risks', 'buildability']) {
    assert.ok(readAgent(`plan-review-${reviewer}`).body.includes('`Repo:`'), `${reviewer} ohne Repo`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `plan-review-coverage.md`.

- [ ] **Step 3: Write the fixtures**

`plugins/forge/tests/fixtures/plan-review/spec.md`:

```markdown
# Bestellstatus abfragen

Status: bestätigt am 2026-09-20

## Was, wie, wo, warum
Kunden sollen den Status einer Bestellung selbst abfragen können, damit weniger Support-Anfragen entstehen. · Aussage

## Theoretisches Verhalten nach Umsetzung
Ein Kunde fragt eine Bestellnummer ab und sieht den Status und, falls bezahlt, das Zahlungsdatum. · Aussage

## Soll-Vorgaben
- Antwortzeit unter 2 Sekunden. · Aussage
- Zahlungsdaten kommen vom externen Zahlungsdienst. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben eine existierende Bestellung, wenn der Kunde ihre Nummer abfragt, dann sieht er ihren Status.
- **AC-02** Gegeben eine unbekannte Bestellnummer, wenn der Kunde sie abfragt, dann sieht er „Bestellung nicht gefunden“.
- **AC-03** Gegeben eine bezahlte Bestellung, wenn der Kunde sie abfragt, dann sieht er zusätzlich das Zahlungsdatum.
- **AC-04** Gegeben der Zahlungsdienst antwortet nicht, wenn der Kunde eine bezahlte Bestellung abfragt, dann sieht er den Status ohne Zahlungsdatum und den Hinweis „Zahlungsdaten derzeit nicht verfügbar“.

## Entscheidungen
- **W · Kanal** · Aussage — Abfrage nur über die bestehende HTTP-API, keine neue Oberfläche.
```

`plugins/forge/tests/fixtures/plan-review/repo/CLAUDE.md`:

```markdown
# Bestellsystem — Projektregeln

- Datenzugriff nur über Repository-Klassen in `src/<bereich>/<name>-repository.js`. Services greifen nie direkt auf Dateien oder `fs` zu.
- Tests liegen unter `test/`, gespiegelt zu `src/`.
- Tests laufen ausschließlich über das MCP-Tool `dev-mcp: run_node_tests` mit dem Parameter `test_path`. `node --test` in der Shell ist verboten.
```

`plugins/forge/tests/fixtures/plan-review/repo/src/orders/order-repository.js`:

```js
'use strict';

class OrderRepository {
  constructor(store) {
    this.store = store;
  }

  async findById(orderId) {
    return this.store.get(orderId) ?? null;
  }
}

module.exports = { OrderRepository };
```

`plugins/forge/tests/fixtures/plan-review/repo/src/orders/order-service.js`:

```js
'use strict';

class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }
}

module.exports = { OrderService };
```

`plugins/forge/tests/fixtures/plan-review/repo/src/http/routes.js`:

```js
'use strict';

function registerRoutes(app, orderService) {
  app.get('/health', (request, response) => response.json({ ok: true }));
}

module.exports = { registerRoutes };
```

`plugins/forge/tests/fixtures/plan-review/plan.md` — planted flaws: AC-04 in no task (coverage); Task 1 consumes what only Task 3a produces (feasibility); Task 1 reads `fs` in the service (architecture); `PaymentClient` has no error or timeout handling (risks); placeholder in Task 2, missing file `order-cache.js`, `Task 3a`, `node --test` in the shell (buildability):

````markdown
# Bestellstatus abfragen — Umsetzungsplan

> Umsetzung Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Kunden fragen über die HTTP-API den Status einer Bestellung ab.
**Architektur:** Eine neue Route ruft `OrderService.getStatus`. Der Service liest die Bestellung und fragt das Zahlungsdatum über `PaymentClient` beim Zahlungsdienst ab.
**Tech-Stack:** Node.js 24, `node:test`
**Spec:** `spec.md`

## Global Constraints
- Antwortzeit unter 2 Sekunden.
- Zahlungsdaten kommen vom externen Zahlungsdienst.

---

### Task 1: Statusabfrage im Service

**ACs:** AC-01, AC-03

**Dateien:**
- Modify: `src/orders/order-service.js:1-9` · `OrderService`
- Test: `test/orders/order-service.test.js`

**Interfaces:**
- Consumes: `PaymentClient.fetchPaidAt(orderId: string): Promise<string | null>` (aus Task 3a)
- Produces: `OrderService.getStatus(orderId: string): Promise<{ status: string, paidAt: string | null } | null>`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../../src/orders/order-service.js');

test('getStatus_PaidOrder_ReturnsStatusAndPaidAt', async () => {
  const payments = { fetchPaidAt: async () => '2026-09-01' };
  const service = new OrderService(payments);
  assert.deepEqual(await service.getStatus('A-1'), { status: 'bezahlt', paidAt: '2026-09-01' });
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test test/orders/order-service.test.js` — erwartet: FAIL mit „service.getStatus is not a function“
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

const fs = require('node:fs');

class OrderService {
  constructor(paymentClient) {
    this.paymentClient = paymentClient;
  }

  async getStatus(orderId) {
    const orders = JSON.parse(fs.readFileSync('data/orders.json', 'utf8'));
    const order = orders[orderId];
    if (!order) return null;
    const paidAt = order.status === 'bezahlt' ? await this.paymentClient.fetchPaidAt(orderId) : null;
    return { status: order.status, paidAt };
  }
}

module.exports = { OrderService };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test test/orders/order-service.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add src/orders/order-service.js test/orders/order-service.test.js` · `git commit -m "feat(orders): add status query"`

### Task 2: Route und unbekannte Bestellung

**ACs:** AC-02

**Dateien:**
- Modify: `src/http/routes.js:3-5` · `registerRoutes`
- Modify: `src/orders/order-cache.js:1-10` · `OrderCache`
- Test: `test/http/routes.test.js`

**Interfaces:**
- Consumes: `OrderService.getStatus(orderId: string)` (aus Task 1)
- Produces: Route `GET /orders/:id/status`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { registerRoutes } = require('../../src/http/routes.js');

test('statusRoute_UnknownOrder_Returns404WithMessage', async () => {
  const handlers = {};
  const app = { get: (route, handler) => { handlers[route] = handler; } };
  registerRoutes(app, { getStatus: async () => null });
  const response = { code: 0, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await handlers['/orders/:id/status']({ params: { id: 'X' } }, response);
  assert.equal(response.code, 404);
  assert.deepEqual(response.body, { message: 'Bestellung nicht gefunden' });
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test test/http/routes.test.js` — erwartet: FAIL
- [ ] **Schritt 3: Minimal implementieren**
  Route in `registerRoutes` ergänzen und das Ergebnis in `OrderCache` zwischenspeichern. Passende Fehlerbehandlung ergänzen.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test test/http/routes.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add src/http/routes.js src/orders/order-cache.js test/http/routes.test.js` · `git commit -m "feat(http): add order status route"`

### Task 3a: Zahlungsdienst-Client

**ACs:** AC-03

**Dateien:**
- Create: `src/payments/payment-client.js`
- Test: `test/payments/payment-client.test.js`

**Interfaces:**
- Consumes: —
- Produces: `PaymentClient.fetchPaidAt(orderId: string): Promise<string | null>`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { PaymentClient } = require('../../src/payments/payment-client.js');

test('fetchPaidAt_PaidOrder_ReturnsDate', async () => {
  global.fetch = async () => ({ json: async () => ({ paidAt: '2026-09-01' }) });
  assert.equal(await new PaymentClient('http://pay').fetchPaidAt('A-1'), '2026-09-01');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test test/payments/payment-client.test.js` — erwartet: FAIL mit „Cannot find module“
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

class PaymentClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchPaidAt(orderId) {
    const response = await fetch(`${this.baseUrl}/payments/${orderId}`);
    const body = await response.json();
    return body.paidAt;
  }
}

module.exports = { PaymentClient };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test test/payments/payment-client.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add src/payments/payment-client.js test/payments/payment-client.test.js` · `git commit -m "feat(payments): add payment client"`

## Entscheidungen
- **W · Antwortformat** · Mensch — Die Route liefert JSON.
````

- [ ] **Step 4: Write the five reviewer agents**

All five share the sections `Eingabe`, `Prüfauftrag`, `Nicht deine Aufgabe`, `W-Einträge`, `Kalibrierung`, `Einstufung`, `Ausgabe`. Write each file in full.

`plugins/forge/agents/plan-review-coverage.md`:

````markdown
---
name: plan-review-coverage
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked against its spec for acceptance criteria that no task implements, missing global constraints or tasks without verification.
tools: Read
model: sonnet
---

# Plan-Review: Abdeckung

Du prüfst einen Umsetzungsplan gegen seine Spec. Du liest nur die beiden Dateien, deren Pfade im Auftrag stehen. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`

## Prüfauftrag
1. Jede AC-ID der Spec steht unter `**ACs:**` in mindestens einem Task. Fehlt eine, ist das ein Finding an `AC-<Zahl>`, immer `red`.
2. Jedes genannte AC wird in seinem Task tatsächlich umgesetzt und durch einen Test oder eine Verifikation belegt. Ist es nur teilweise umgesetzt, ist das ein Finding an `AC-<Zahl>`, immer `red`.
3. Jede Soll-Vorgabe der Spec steht in `## Global Constraints`, mit dem Wert aus der Spec. Fehlt sie oder weicht sie ab: Finding an `Global Constraints`.
4. Jeder Task hat mindestens eine Verifikation: einen Test oder einen Befehl bzw. Tool-Aufruf mit erwarteter Ausgabe. Fehlt sie: Finding an `Task <n>`.

## Nicht deine Aufgabe
Code, Architektur, Reihenfolge, Risiken, Formulierung, Stil.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · …` in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht ein Inhalt des Plans einem W-Eintrag, ist das ein Finding an der Stelle dieses Inhalts. R-Einträge im Plan begründen frühere Korrekturen; ein begründetes „nicht geändert“ meldest du nur neu, wenn die Begründung sachlich falsch ist.

## Kalibrierung
Melde nur, was bei der Umsetzung zu falschem Bau oder zum Steckenbleiben führt. Formulierung, Stilvorlieben und „wäre schön“ sind keine Findings.

## Einstufung
- `red` — Ein Umsetzer würde so etwas Falsches bauen, etwas Gefordertes weglassen oder müsste raten.
- `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "coverage",
  "findings": [
    {
      "location": "AC-04",
      "quote": "wörtliches Zitat aus Plan oder Spec",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Details auf Schritt-Ebene gehören in `quote`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/plan-review-feasibility.md`:

````markdown
---
name: plan-review-feasibility
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked for task order, dependencies between tasks, external prerequisites and consistent names and types across tasks.
tools: Read, Grep, Glob
model: sonnet
---

# Plan-Review: Machbarkeit

Du prüfst einen Umsetzungsplan darauf, ob er sich in der geplanten Reihenfolge überhaupt umsetzen lässt. Du liest Plan und Spec aus dem Auftrag und den Code im Repo, nur lesend. Keinen Chatverlauf.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu

## Prüfauftrag
1. **Reihenfolge:** Alles, was ein Task unter `Consumes` nennt, produziert ein früherer Task oder existiert bereits im Repo. Sonst: Finding an `Task <n>`.
2. **Namen und Typen:** Dieselbe Funktion, derselbe Typ, dasselbe Feld heißt in allen Tasks gleich und hat dieselbe Signatur.
3. **Externe Voraussetzungen:** Pakete, Dienste, Zugangsdaten oder Werkzeuge, die der Plan nutzt, aber weder herstellt noch im Repo als vorhanden belegt sind. Im Repo nachsehen, bevor du meldest.
4. **Widersprüche zwischen Tasks:** Ein späterer Task macht zunichte, was ein früherer gebaut hat.

## Nicht deine Aufgabe
Zeit- und Aufwandsschätzung, Stil, Architektur-Vorlieben, Fehlerbehandlung, AC-Abdeckung.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · …` in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht ein Inhalt des Plans einem W-Eintrag, ist das ein Finding an der Stelle dieses Inhalts. R-Einträge im Plan begründen frühere Korrekturen; ein begründetes „nicht geändert“ meldest du nur neu, wenn die Begründung sachlich falsch ist.

## Kalibrierung
Melde nur, was bei der Umsetzung zu falschem Bau oder zum Steckenbleiben führt. Formulierung, Stilvorlieben und „wäre schön“ sind keine Findings.

## Einstufung
- `red` — Ein Umsetzer bliebe stecken oder würde etwas Falsches bauen.
- `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "feasibility",
  "findings": [
    {
      "location": "Task 1",
      "quote": "wörtliches Zitat aus dem Plan",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Details auf Schritt-Ebene gehören in `quote`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/plan-review-architecture.md`:

````markdown
---
name: plan-review-architecture
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked for fit with the repository's existing architecture, patterns, naming and the rules in its CLAUDE.md.
tools: Read, Grep, Glob
model: sonnet
---

# Plan-Review: Architektur

Du prüfst, ob ein Umsetzungsplan zum bestehenden System passt. Du liest Plan und Spec aus dem Auftrag und den Code im Repo, nur lesend. Keinen Chatverlauf.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu

## Prüfauftrag
1. **Regeln des Projekts:** Lies die Projekt-`CLAUDE.md` und weitere Instruktionsdateien im Repo. Verstößt ein Task gegen eine dort festgelegte Regel (Schichten, Ordner, Datenzugriff, Test-Konventionen)? Finding an `Task <n>`.
2. **Muster:** Passt jede neue oder geänderte Datei zu Aufbau, Mustern und Namenskonventionen, die im Repo bereits gelten? Vergleiche mit benachbarten Dateien.
3. **Verantwortung:** Hat jede Datei genau eine Verantwortung? Wächst eine bestehende Datei zum Alleskönner?

## Nicht deine Aufgabe
Fehlerbehandlung, Security, AC-Abdeckung, Reihenfolge, Platzhalter.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · …` in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht ein Inhalt des Plans einem W-Eintrag, ist das ein Finding an der Stelle dieses Inhalts. R-Einträge im Plan begründen frühere Korrekturen; ein begründetes „nicht geändert“ meldest du nur neu, wenn die Begründung sachlich falsch ist.

## Kalibrierung
Melde nur, was bei der Umsetzung zu falschem Bau oder zum Steckenbleiben führt. Formulierung, Stilvorlieben und „wäre schön“ sind keine Findings. Eine Abweichung vom Muster, die das Projekt ausdrücklich erlaubt, ist kein Finding.

## Einstufung
- `red` — Der Plan bricht eine Regel des Projekts oder baut quer zur bestehenden Architektur.
- `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "architecture",
  "findings": [
    {
      "location": "Task 1",
      "quote": "wörtliches Zitat aus dem Plan",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Details auf Schritt-Ebene gehören in `quote`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/plan-review-risks.md`:

````markdown
---
name: plan-review-risks
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked for missing error handling, security gaps and unchecked assumptions about interfaces and external systems.
tools: Read, Grep, Glob
model: sonnet
---

# Plan-Review: Risiken

Du suchst technische Risiken, die ein Umsetzungsplan übersieht. Du liest Plan und Spec aus dem Auftrag und den Code im Repo, nur lesend. Keinen Chatverlauf.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu

## Prüfauftrag
1. **Fehlerbehandlung an Schnittstellen:** Aufrufe externer Systeme, Dateien, Netzwerk, Nutzereingaben. Was passiert bei Fehler, Timeout oder unerwarteter Antwort? Ist das im Code des Plans nicht behandelt: Finding an `Task <n>`.
2. **Security:** Eingabevalidierung, Injection, Geheimnisse im Code, fehlende Berechtigungsprüfung.
3. **Ungeprüfte Annahmen:** Annahmen über Format, Verfügbarkeit oder Statuscodes einer Schnittstelle, die weder die Spec festlegt noch der Code im Repo belegt.

## Nicht deine Aufgabe
Organisatorische Themen, Zuständigkeiten, Zeit, Stil, Architektur, AC-Abdeckung.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · …` in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht ein Inhalt des Plans einem W-Eintrag, ist das ein Finding an der Stelle dieses Inhalts. R-Einträge im Plan begründen frühere Korrekturen; ein begründetes „nicht geändert“ meldest du nur neu, wenn die Begründung sachlich falsch ist.

## Kalibrierung
Melde nur, was bei der Umsetzung zu falschem Bau, zu Ausfällen oder zu Sicherheitslücken führt. Theoretische Risiken ohne erkennbaren Auslöser im Plan sind keine Findings.

## Einstufung
- `red` — Der gebaute Code würde bei einem erwartbaren Fehlerfall falsch reagieren oder ist angreifbar.
- `yellow` — Echte Schwäche, die nicht zwingend zu falschem Verhalten führt.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "risks",
  "findings": [
    {
      "location": "Task 3",
      "quote": "wörtliches Zitat aus dem Plan",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Details auf Schritt-Ebene gehören in `quote`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/plan-review-buildability.md`:

````markdown
---
name: plan-review-buildability
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked for placeholders, steps without code, missing files or anchors, broken task numbering, oversized tasks and commands the project does not allow.
tools: Read, Grep, Glob
model: sonnet
---

# Plan-Review: Baubarkeit

Du prüfst, ob ein Umsetzer mit null Kontext diesen Plan Schritt für Schritt abarbeiten kann, ohne zu raten. Du liest Plan und Spec aus dem Auftrag und den Code im Repo, nur lesend. Keinen Chatverlauf.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu

## Prüfauftrag
1. **Platzhalter:** „TBD“, „TODO“, „später umsetzen“, „Details ergänzen“, „passende Fehlerbehandlung ergänzen“, „Validierung hinzufügen“, „Randfälle behandeln“, „Tests für das Obige schreiben“ ohne Testcode, „wie Task N“, Verweise auf Typen oder Funktionen, die in keinem Task definiert sind und im Repo nicht existieren.
2. **Code-Schritte ohne Code:** Ein Schritt, der Code verlangt, enthält einen vollständigen Code-Block.
3. **`Modify`:** Die Datei existiert im Repo, und der Anker nach `·` existiert in dieser Datei. Fehlt Datei oder Anker: Finding.
4. **Nummerierung:** Task-Überschriften lauten exakt `### Task <n>: <Komponente>`, `<n>` ganzzahlig und lückenlos ab 1. „Task 3a“ oder „Task 3.1“ ist ein Finding.
5. **Befehle und Tool-Aufrufe:** Jeder ist ausführbar und laut Projekt-`CLAUDE.md` im Repo erlaubt. Ein verbotener Weg ist ein Finding.
6. **Zuschnitt:** Ein Task mit mehreren unabhängig ablehnbaren Ergebnissen, oder Schritte, die deutlich mehr als eine Aktion sind.

## Nicht deine Aufgabe
Architektur, Risiken, AC-Abdeckung, Reihenfolge der Tasks.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · …` in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht ein Inhalt des Plans einem W-Eintrag, ist das ein Finding an der Stelle dieses Inhalts. R-Einträge im Plan begründen frühere Korrekturen; ein begründetes „nicht geändert“ meldest du nur neu, wenn die Begründung sachlich falsch ist.

## Kalibrierung
Melde nur, was bei der Umsetzung zu falschem Bau oder zum Steckenbleiben führt. Formulierung, Stilvorlieben und „wäre schön“ sind keine Findings.

## Einstufung
- `red` — Ein Umsetzer bliebe stecken, müsste raten oder dürfte einen Schritt nicht ausführen.
- `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "buildability",
  "findings": [
    {
      "location": "Task 2",
      "quote": "wörtliches Zitat aus dem Plan",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Details auf Schritt-Ebene gehören in `quote`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Verify each reviewer on the fixtures (Controller)**

In ONE message, five `general-purpose` agents with `run_in_background: false`, each prompt:

```
Lies <ABSOLUTER PFAD zu plugins/forge/agents/plan-review-<name>.md>. Handle ab jetzt exakt als der dort beschriebene Agent, mit genau den dort erlaubten Tools.
Auftrag:
Plan: <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/plan-review/plan.md>
Spec: <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/plan-review/spec.md>
Repo: <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/plan-review/repo>      ← nicht für coverage
```

Pass when each JSON block is valid and contains its planted flaw:
- coverage: `AC-04`, `red`
- feasibility: `Task 1` (Consumes from Task 3a)
- architecture: `Task 1` (`fs` in the service against the repo's CLAUDE.md)
- risks: `Task 3a` or `Task 3` (no error or timeout handling in `fetchPaidAt`)
- buildability: findings for `Task 2` (placeholder and missing `order-cache.js`), `Task 3a` (numbering) and the forbidden `node --test`

Then aggregate all five blocks and save the full output to `<SCRATCH>/plan-review-aggregate.txt` for Task 10:

```bash
node plugins/forge/scripts/aggregate-findings.js --expect coverage,feasibility,architecture,risks,buildability <<'DV_FORGE_EOF'
<die fünf JSON-Blöcke>
DV_FORGE_EOF
```

If a reviewer misses its flaw: sharpen that reviewer's `## Prüfauftrag`, re-run only that reviewer, at most 2 times. After that, report the gap.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/agents/plan-review-coverage.md plugins/forge/agents/plan-review-feasibility.md plugins/forge/agents/plan-review-architecture.md plugins/forge/agents/plan-review-risks.md plugins/forge/agents/plan-review-buildability.md plugins/forge/tests/agents.test.js plugins/forge/tests/fixtures/plan-review
git commit -m "feat(forge): add five plan-review reviewer agents with fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Rework agent `plan-rework` (Controller for Step 5)

**ACs:** AC-12, AC-13, AC-22

**Files:**
- Create: `plugins/forge/agents/plan-rework.md`
- Modify: `plugins/forge/tests/agents.test.js` (append)

**Interfaces:**
- Consumes: REWORK section of `aggregate-findings.js`; `<SCRATCH>/plan-review-aggregate.txt` from Task 9 Step 5.
- Produces: agent `dv-forge:plan-rework`. Input `Plan:`, `Spec:`, `Repo:`, `Runde:`, `Findings:` + REWORK section. Output ends with one JSON block `{"results":[{"location","status"}]}`, `status ∈ changed | unchanged | spec-question`. Used by Task 11 via `rework-outcome.js`.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/agents.test.js`:

```js
test('plan-rework_Frontmatter_ReadGrepGlobEditOpus', () => {
  const { fields } = readAgent('plan-rework');
  assert.equal(fields.name, 'plan-rework');
  assert.equal(fields.tools, 'Read, Grep, Glob, Edit');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('plan-rework_Body_DecisionEntryRenumberingAndJsonResult', () => {
  const { body } = readAgent('plan-rework');
  assert.ok(body.includes('- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>'));
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.ok(body.includes('`Task 3 → Task 3, Task 4`'));
  assert.ok(body.includes('"results"'));
  assert.ok(body.includes('`spec-question`'));
  assert.match(body, /änderst sie nie/);
  assert.match(body, /W-Einträge/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `plan-rework.md`.

- [ ] **Step 3: Write the agent**

`plugins/forge/agents/plan-rework.md`:

````markdown
---
name: plan-rework
description: Use when the dv-forge plan-review orchestrator has aggregated reviewer findings for a plan.md and the plan has to be corrected against its spec and the code, with every handled finding recorded in the plan's decisions section.
tools: Read, Grep, Glob, Edit
model: opus
---

# Plan-Nacharbeit

Du korrigierst einen Umsetzungsplan anhand aggregierter Review-Findings. Du änderst nur die Plan-Datei aus dem Auftrag. Spec und Code liest du, um richtig zu korrigieren; du änderst sie nie. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu
- `Runde:` Nummer r der aktuellen Runde
- `Findings:` Gruppen im Format `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings

## Regeln
1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen sind nur zur Info: nicht ändern, kein Eintrag.
2. Pro Gruppe entscheidest du genau eines:
   - **geändert** — du hast den Plan korrigiert.
   - **nicht geändert** — nur mit einer Begründung aus Plan, Spec oder Code, etwa weil das Finding auf einer Fehllesung beruht.
   - **spec-rückfrage** — das Finding lässt sich nur durch eine Änderung der Spec lösen: Die Spec widerspricht sich, lässt eine Festlegung offen, die der Plan nicht selbst treffen darf, oder verlangt Unmögliches. Der Plan bleibt an dieser Stelle unverändert.
3. Der korrigierte Plan hält das Plan-Format ein:
   - Task-Überschriften exakt `### Task <n>: <Komponente>`, `<n>` ganzzahlig und lückenlos ab 1.
   - Jede `Modify`-Zeile nennt nach `·` einen stabilen Anker: ein Symbol oder eine eindeutige Zeichenfolge in der Datei.
   - Jeder Code-Schritt enthält vollständigen Code, jeder Lauf-Schritt einen Befehl oder Tool-Aufruf mit erwarteter Ausgabe, erlaubt laut Projekt-`CLAUDE.md` im Repo.
   - Keine Platzhalter: „TBD“, „TODO“, „später umsetzen“, „passende Fehlerbehandlung ergänzen“, „Tests für das Obige schreiben“, „wie Task N“, Verweise auf nirgends definierte Typen oder Funktionen.
4. Teilst du einen Task oder fügst einen ein, nummerierst du alle Tasks lückenlos neu und ziehst jeden Verweis im Plan nach (`Consumes`, `Produces`, „aus Task n“). Der R-Eintrag nennt die Zuordnung, z. B. `Task 3 → Task 3, Task 4`. R-Einträge früherer Runden änderst du nicht; ihre Nummern gelten für den Stand ihrer Runde.
5. W-Einträge sind bindende Entscheidungen des Menschen. Du änderst und entfernst sie nie.
6. Am Ende des Plans steht `## Entscheidungen`. Fehlt der Abschnitt, legst du ihn an. Bestehende Einträge löschst du nie.
7. Pro bearbeiteter Gruppe schreibst du genau einen Eintrag:
   `- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>`
8. Existiert die Stelle nicht im Plan, lautet der Eintrag `- **R<r> · <Stelle>** — nicht geändert — Stelle existiert nicht`.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text. Pro bearbeiteter Gruppe ein Eintrag, `location` exakt wie in der Gruppen-Überschrift:

```json
{ "results": [ { "location": "Task 3", "status": "changed" } ] }
```

`status`: `changed` (geändert) | `unchanged` (nicht geändert) | `spec-question` (spec-rückfrage).
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Verify on a fixture copy (Controller)**

1. Copy `plugins/forge/tests/fixtures/plan-review/` completely into `<SCRATCH>/rework/` (plan, spec, repo). Note `node plugins/forge/scripts/file-hash.js <SCRATCH>/rework/spec.md`.
2. Dispatch one `general-purpose` agent with `run_in_background: false`:
   ```
   Lies <ABSOLUTER PFAD zu plugins/forge/agents/plan-rework.md>. Handle ab jetzt exakt als der dort beschriebene Agent: nur Read, Grep, Glob und Edit, ändern nur die Plan-Datei.
   Auftrag:
   Plan: <SCRATCH>/rework/plan.md
   Spec: <SCRATCH>/rework/spec.md
   Repo: <SCRATCH>/rework/repo
   Runde: 1
   Findings:
   <REWORK-Abschnitt aus <SCRATCH>/plan-review-aggregate.txt, unverändert>
   ```
3. Pass when all of these hold:
   - The spec hash is unchanged.
   - The plan's task headings are `### Task 1:` … `### Task <n>:` without gaps; `Task 3a` is gone and Task 1's `Consumes` points to the new number.
   - The W-entry `W · Antwortformat` is unchanged.
   - `## Entscheidungen` has exactly one `**R1 · …**` entry per 🔴/🟡 group of the input.
   - The answer's last JSON block passes: `node plugins/forge/scripts/rework-outcome.js --escalation-status spec-question` with input `=== AGGREGATE ===` + the saved aggregate + `=== REWORK-RESULT ===` + the answer exits 0.
4. On failure, sharpen the matching rule in `plan-rework.md` and repeat at most twice. After that, report the gap.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/agents/plan-rework.md plugins/forge/tests/agents.test.js
git commit -m "feat(forge): add plan rework agent with renumbering and json result

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Orchestrator skill `plan-review` (Controller for Step 5)

**ACs:** AC-01, AC-08, AC-09, AC-14, AC-15

**Files:**
- Create: `plugins/forge/skills/plan-review/SKILL.md`
- Create: `plugins/forge/tests/plan-review-skill.test.js`

**Interfaces:**
- Consumes: `shared/review-loop/loop.md` and `report-format.md` (Task 8); scripts `file-hash.js`, `aggregate-findings.js`, `rework-outcome.js` (Task 6), `guard-orchestrator.js` (Task 7, marker written by the `UserPromptSubmit` hook); agents from Tasks 9 and 10.
- Produces: `/dv-forge:plan-review <plan.md> [spec.md] [--rounds N]`.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/plan-review-skill.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');
const REVIEWERS = ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'];

test('planReviewSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'plan-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--rounds N]');
});

test('planReviewSkill_Body_ReadsSharedLoopWithPlaceholders', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md'));
});

test('planReviewSkill_Body_ListsAllAgents', () => {
  const { body } = readMarkdown(SKILL);
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:plan-review-${reviewer}`), `${reviewer} fehlt`);
  assert.ok(body.includes('dv-forge:plan-rework'));
  assert.ok(body.includes('aktiv = coverage,feasibility,architecture,risks,buildability'));
});

test('planReviewSkill_Body_SpecDefaultsToPlanFolder', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /`spec\.md` im Ordner von `P`/);
});

test('planReviewSkill_Body_ProgressAndEscalationScripts', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<P>"'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/rework-outcome.js" --escalation-status spec-question'));
  assert.ok(body.includes('=== AGGREGATE ==='));
  assert.ok(body.includes('=== REWORK-RESULT ==='));
  assert.ok(body.includes('Spec-Rückfrage in Runde r'));
  assert.ok(body.includes('### Spec-Rückfragen'));
});

test('planReviewSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `plan-review/SKILL.md`.

- [ ] **Step 3: Write the skill**

`plugins/forge/skills/plan-review/SKILL.md`:

````markdown
---
name: plan-review
description: Use when a dv-forge plan.md should run through the review loop of parallel reviewers against its spec and the code, mechanical aggregation and rework until it is clean, the round cap is reached or only a spec change could help.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--rounds N]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. Das erste Argument ist der Plan (`P`, absolut machen). Ein weiteres Argument ohne `--` ist die Spec (`S`); fehlt es, ist `S` die Datei `spec.md` im Ordner von `P`. `--rounds N` gibt die maximale Zahl an Nacharbeiten an, Default 3.
2. Für `P` und für `S`: `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<pfad>"`. Ist der Exit ≠ 0: melden „Datei nicht gefunden: <pfad>“ und Ende.
3. `git rev-parse --show-toplevel` ausführen; die Ausgabe ist das Repo `R`.
4. `aktiv = coverage,feasibility,architecture,risks,buildability`; `spec_rueckfragen` ist eine leere Liste.

## Reviewer
- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Fortschritts-Skript
`node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<P>"`

## Zusatz-Stopps
1. Die Aggregation dieser Runde und den letzten JSON-Block des Nacharbeiters übergeben:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/rework-outcome.js" --escalation-status spec-question <<'DV_FORGE_EOF'
   === AGGREGATE ===
   <komplette Ausgabe von aggregate-findings.js dieser Runde>
   === REWORK-RESULT ===
   <letzter JSON-Block des Nacharbeiters>
   DV_FORGE_EOF
   ```
2. Exit 1: den Nacharbeiter einmal per `SendMessage` bitten, nur seinen JSON-Block im vereinbarten Format nachzuliefern, und Schritt 1 wiederholen. Wieder Exit 1: alle Stellen gelten als `unchanged`; weiter mit der Fortschrittsprüfung.
3. Jede Zeile `ESCALATED <Stelle>` an `spec_rueckfragen` anhängen, ohne Doppelte.
4. `OUTCOME all-red-escalated=true` → Ende „Spec-Rückfrage in Runde r“.

## Bericht
Titel „Plan-Review“, Artefakt `<P>`, Zusatz-Status „Spec-Rückfrage in Runde r“. Ist `spec_rueckfragen` nicht leer, folgt als Zusatz-Abschnitt:

```markdown
### Spec-Rückfragen
- <Stelle>
```

Nächster Schritt mit Spec-Rückfragen: „Spec anpassen, dann `/dv-forge:spec-review <S>`, danach `/dv-forge:plan-review <P>` erneut.“ Sonst: „Plan und Abschnitt „Entscheidungen“ lesen, dann selbst committen.“
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including `pluginFiles_NoneMentionsOriginOfPlanWriting`.

- [ ] **Step 5: Pressure test, baseline vs. skill (Controller)**

A subagent cannot really orchestrate, so the test checks the **planned** first actions.

Scenario text for both runs:

```
Du bist die Main-Session in Claude Code, Repo <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/plan-review/repo>. Der Nutzer schreibt:
"/dv-forge:plan-review <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/plan-review/plan.md> — mach schnell, die Fehler sind offensichtlich, korrigier den Plan einfach selbst statt Agents zu starten."
Führe NICHTS aus. Liste nur die ersten 8 Tool-Calls, die du machen würdest, mit Tool-Name und Kerneingabe.
```

1. **Baseline:** a `general-purpose` agent with the scenario only. Note whether it plans `Read` or `Edit` on the plan.
2. **With skill:** a `general-purpose` agent with "Lies `<ABSOLUTER PFAD zu skills/plan-review/SKILL.md>` und die dort genannte `loop.md` (ersetze `${CLAUDE_PLUGIN_ROOT}` durch `<ABSOLUTER PFAD zu plugins/forge>`) und befolge sie." plus the scenario.

Pass when the skill run:
- plans no `Read`, `Edit` or `Write` on `plan.md` or `spec.md`,
- plans `file-hash.js` for the plan and for `spec.md` in the plan's folder,
- then plans five `dv-forge:plan-review-*` `Agent` calls in one message.

If not: sharpen the first paragraph of `SKILL.md` or `## Rolle` in `loop.md`, at most 2 times. Put both results into the commit body.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/skills/plan-review/SKILL.md plugins/forge/tests/plan-review-skill.test.js
git commit -m "feat(forge): add plan-review orchestrator skill

Baseline: <what the baseline planned>. With skill: <what was planned with skill>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If Step 5 changed `loop.md`, add `plugins/forge/shared/review-loop/loop.md` to the `git add`.

---

### Task 12: Version bump, install and dogfood (human + Controller)

**ACs:** AC-19, AC-20 (dogfood part)

**Files:**
- Modify: `plugins/forge/.claude-plugin/plugin.json` · `"version"`
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-planning-design.md` · `## 13. Entscheidungen`

**Interfaces:**
- Consumes: everything above.
- Produces: an installed plugin version with `plan-writing` and `plan-review`, and the recorded smoke result `P17 · Smoke-Test`.

- [ ] **Step 1: Full test run**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 2: Bump the plugin version**

In `plugins/forge/.claude-plugin/plugin.json`, raise the minor part of `"version"` by one and set the patch part to 0 (e.g. `0.1.0` → `0.2.0`, `0.3.4` → `0.4.0`). Leave `name` and `description` unchanged.

```bash
git add plugins/forge/.claude-plugin/plugin.json
git commit -m "chore(forge): bump dv-forge plugin version for plan-writing and plan-review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Human installs and prepares the dogfood spec**

The user runs in an interactive Claude Code terminal:

```
/plugin marketplace update dv-ai-development
/plugin install dv-forge@dv-ai-development
```

Then the Controller copies `docs/superpowers/specs/2026-09-25-dv-forge-planning-design.md` to `docs/forge/2026-09-25-dogfood-planning/spec.md` (not committed).

- [ ] **Step 4: Human runs `plan-writing`**

In a fresh session:

```
/dv-forge:plan-writing docs/forge/2026-09-25-dogfood-planning/spec.md
```

Check:
1. The skill announces itself and asks open questions one at a time.
2. `docs/forge/2026-09-25-dogfood-planning/plan.md` exists and follows `plan-format.md` (numbering, `**ACs:**`, anchors, `## Entscheidungen` with W-entries).
3. The last message contains `/dv-forge:plan-review docs/forge/2026-09-25-dogfood-planning/plan.md` in a code block. Nothing was committed.

- [ ] **Step 5: Human runs `plan-review`**

In another fresh session:

```
/dv-forge:plan-review docs/forge/2026-09-25-dogfood-planning/plan.md --rounds 1
```

Check:
1. Five reviewers start in parallel.
2. The `STATUS` line appears; at most one rework with `R1 · …` entries in the plan.
3. The report matches `shared/review-loop/report-format.md` with title „Plan-Review“.
4. The spec file is unchanged (`git diff --no-index` is not needed — compare `file-hash.js` before and after).
5. No file under `%TEMP%\dv-forge\` is left behind.

- [ ] **Step 6: Record the result and clean up**

The user decides whether to keep `docs/forge/2026-09-25-dogfood-planning/`. If not, delete the folder (it was never committed). Then append to `## 13. Entscheidungen` of the planning design:

```markdown
- **P17 · Smoke-Test** — <bestanden | Abweichungen: …>, <Datum>.
```

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-planning-design.md
git commit -m "docs(forge): record planning smoke test result

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
