# dv-forge TP-C1: Abschlussbericht für Spec-, Plan-Review und Followup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Abschlussbericht von `spec-review`, `plan-review` und `review-followup` (Spec/Plan) ist Klartext ohne Kürzel (Änderungen, Entscheidungen, Offenes mit einem empfohlenen Vorschlag, Hinweise, nächste Schritte); nur offene Gruppen werden gesichert; `alle` setzt alle offenen Punkte um.

**Architecture:** Neue Libs `open-groups.js` (welche Gruppen offen sind), `closing.js` (Sicherung `abschluss/`), `report-data.js` (liest den Arbeitsbereich, baut die Eingabe) und `report-text.js` (reiner Renderer). `flow-report.js` orchestriert nur noch. Scout, Nacharbeit und Antworten liefern neue Klartextfelder; `prepare.js` schreibt `hinweise.json`, `sicherung-vorher/` und `followup.json` und kennt `alle`.

**Tech Stack:** Node.js (CommonJS, `node:test`, `node:assert/strict`), keine Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-10-02-forge-closing-report-design.md`

**Voraussetzung:** TP-A und TP-B sind zusammengeführt (`plain-text.js`, `reviewer-names.js`, `halt-text.js`, `scoutTexts`, `bericht.md`, `show`). Dieser Plan ändert deren Dateien an benannten Stellen.

**Arbeitsverzeichnis:** Alle Pfade relativ zum Repo-Root `C:\Develop\Dv.Ai.Development`. Tests laufen im Plugin-Ordner: `cd plugins/forge && node --test tests/<datei>`.

## Global Constraints

- Kommentare und Markdown deutsch; Commit-Messages englisch im Conventional-Commits-Stil, Scope `forge`.
- Testnamen `<Einheit>_<Situation>_<Erwartung>`, Aufbau Arrange/Act/Assert, `node:test`.
- Typografische Anführungszeichen („ “) nie als Literal in Code oder Tests (Werkzeuge normalisieren sie); stattdessen `\u201E` (öffnend) und `\u201C` (schließend).
- Klartext-Verbote (`plainProblem`): `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `; leer; über 400 Zeichen.
- Die Review-Logik (`rate`, `checklist`, `verify`, `flowStatus`) und die erste Ausgabezeile `ENDE <status>` bleiben unverändert.
- Der Orchestrator liest weiterhin keine geschützten Dateien; alle Ausgaben kommen aus Skripten.
- Nicht Teil dieses Plans: `implementation-review`, Followup der Implementierung (TP-C2). Kein Version-Bump.

## Review Focus

- Eine bereits korrigierte (`erledigt`) oder per Antwort entschiedene Gruppe darf weder im Bericht noch in `abschluss/scout.md` erscheinen (Task 4, 6).
- Scout-Ausfall und fehlende Scout-Texte lassen `report` nicht scheitern (Task 6).
- Alte Arbeitsbereiche ohne `hinweise.json` oder `reviewers` brechen `report` nicht (Task 6).
- `alle` und `b` wählen nur gesicherte Gruppen; `1:2` bleibt gültig (Task 7).
- Plan-Review ohne `--spec` im Aufruf von `report` erzeugt keinen Schritt mit leerem Pfad (Task 5).

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `plugins/forge/scripts/lib/open-groups.js` (neu) | offene Gruppen aus Runden bzw. Followup; Anzeige-Normalform |
| `plugins/forge/scripts/lib/closing.js` (neu) | `openGroupsOf`, `writeClosing` (`abschluss/aggregate.md`, `scout.md`) |
| `plugins/forge/scripts/lib/report-text.js` (neu) | `renderReportText(input)` |
| `plugins/forge/scripts/lib/report-data.js` (neu) | `buildInput(options, data, status, open)` |
| `plugins/forge/scripts/lib/flow-report.js` | nur noch `flowStatus`, `collect`, `report` |
| `plugins/forge/scripts/lib/scout-check.js` | `Empfehlung`, `scoutBlocks`, Plan-Review |
| `plugins/forge/scripts/lib/rework-check.js` | Klartextfelder aller Quellen, `answers-check` |
| `plugins/forge/scripts/lib/round-one.js` | `reviewers` in `einstufung.json` |
| `plugins/forge/scripts/lib/halt-text.js` | exportiert zusätzlich `shorten` |
| `plugins/forge/scripts/prepare.js` | `hinweise.json`, `alle`, `sicherung-vorher/`, `followup.json` |
| Agents `spec-review-scout`, `plan-review-scout`, `spec-rework`, `plan-rework` | neue Felder und Regeln |
| `shared/review-flow/flow.md`, `skills/spec-review`, `skills/plan-review`, `skills/review-followup` | Ablauftexte |

---

### Task 1: Scout — `Empfehlung`, Plan-Review, Blöcke

**Files:**
- Modify: `plugins/forge/scripts/lib/scout-check.js`
- Modify: `plugins/forge/agents/spec-review-scout.md`, `plugins/forge/agents/plan-review-scout.md`
- Modify: `plugins/forge/tests/scout-texts.test.js`, `plugins/forge/tests/review-flow-round-one.test.js`, `plugins/forge/tests/agents.test.js`

**Interfaces:**
- Consumes: `scoutTexts`, `checkScout`, `plainProblem` (aus TP-B).
- Produces:
  - `scoutTexts(lines)` liefert zusätzlich `recommendation: string | null`.
  - `scoutBlocks(lines): Map<string, string[]>` — Schlüssel `<icon> <stelle>`, Wert die Zeilen der Gruppe von der Überschrift bis vor die nächste.
  - `checkScout(dir, review)` prüft bei `spec-review` **und** `plan-review` zusätzlich `Empfehlung`.

- [ ] **Step 1: Failing tests schreiben**

In `plugins/forge/tests/scout-texts.test.js` die Konstante `WITH_TEXTS` ersetzen durch (Zeilen `Empfehlung:` ergänzt) und die Importzeile um `scoutBlocks` erweitern:

```js
const { scoutTexts, scoutBlocks } = require('../scripts/lib/scout-check');
```

```js
const WITH_TEXTS = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Eingabe bei leerem Feld', 'Beschreibung: Offen ist, was bei leerer Eingabe gilt.', 'Empfehlung: Fehler melden, weil das früh auffällt.',
  '1. D festlegen.', '   Beleg: keiner', '2. E streichen.', '**Bevorzugt: 1** — passt.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', 'Empfehlung: Eine Lesart festlegen, weil Tests sonst streiten.',
  '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.',
];
const WITHOUT_TEXTS = WITH_TEXTS.filter((line) => !/^(Titel|Beschreibung|Empfehlung): /.test(line));
```

Den Test `scoutTexts_GroupsWithTexts_ReturnsTitleAndDescriptionPerGroup` ersetzen durch:

```js
test('scoutTexts_GroupsWithTexts_ReturnsTitleDescriptionAndRecommendationPerGroup', () => {
  assert.deepEqual(scoutTexts(WITH_TEXTS), [
    { severity: '🔴', location: 'AC-04', title: 'Eingabe bei leerem Feld', description: 'Offen ist, was bei leerer Eingabe gilt.', recommendation: 'Fehler melden, weil das früh auffällt.' },
    { severity: '🟡', location: 'AC-07', title: 'Eindeutige Formulierung', description: 'Der Satz hat zwei Lesarten.', recommendation: 'Eine Lesart festlegen, weil Tests sonst streiten.' },
  ]);
});
```

und den Test `scoutTexts_GroupWithoutTexts_ReturnsNulls` so ändern, dass er `[group.title, group.description, group.recommendation]` gegen `[[null, null, null], [null, null, null]]` prüft. Anhängen:

```js
test('scoutBlocks_TwoGroups_ReturnsLinesPerGroupHeading', () => {
  const blocks = scoutBlocks(WITH_TEXTS);
  assert.deepEqual([...blocks.keys()], ['🔴 AC-04', '🟡 AC-07']);
  assert.equal(blocks.get('🟡 AC-07')[0], '### 🟡 AC-07');
  assert.ok(blocks.get('🔴 AC-04').includes('2. E streichen.'));
  assert.equal(blocks.get('🔴 AC-04').includes('### 🟡 AC-07'), false);
});

test('scoutBlocks_NoScoutSection_ReturnsEmptyMap', () => {
  assert.equal(scoutBlocks(['nichts']).size, 0);
});
```

In `plugins/forge/tests/review-flow-round-one.test.js`:
- In `PLAIN_SCOUT` (am Dateiende, aus TP-B) nach jeder `Beschreibung:`-Zeile eine Zeile `Empfehlung: Variante eins wählen, weil sie das Risiko senkt.` einfügen.
- Den Test `scoutCheck_PlanReviewOrNoReviewWithoutTexts_StaysOk` ersetzen durch:

```js
test('scoutCheck_PlanReviewWithAllTexts_Ok', () => {
  assert.equal(scoutCheckSpec(PLAIN_SCOUT, 'plan-review'), 'SCOUT ok\n');
});

test('scoutCheck_PlanReviewWithoutTitle_InvalidAndImplementationReviewAndNoReviewStayOk', () => {
  const plain = PLAIN_SCOUT.replace(/^(Titel|Beschreibung|Empfehlung): .*\n/gm, '');
  assert.equal(scoutCheckSpec(plain, 'plan-review'), 'SCOUT ungültig: 🔴 AC-04: Titel fehlt\n');
  assert.equal(scoutCheckSpec(plain, 'implementation-review'), 'SCOUT ok\n');
  assert.equal(scoutCheckSpec(plain, null), 'SCOUT ok\n');
});

test('scoutCheck_SpecReviewWithoutRecommendation_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Empfehlung: Variante eins wählen, weil sie das Risiko senkt.\n', '');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Empfehlung fehlt\n');
});

test('scoutCheck_SpecReviewRecommendationWithShorthand_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Variante eins wählen, weil sie das Risiko senkt.', 'Task 3 ändern.');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Empfehlung: Kürzel Task 3\n');
});
```

In `plugins/forge/tests/agents.test.js` anhängen:

```js
test('scouts_SpecAndPlan_DescribeTitleDescriptionRecommendationInPlainLanguage', () => {
  for (const name of ['spec-review-scout', 'plan-review-scout']) {
    const { body } = readAgent(name);
    for (const part of ['`Titel: <2 bis 6 Wörter>`', '`Beschreibung: <was das Problem ist>`', '`Empfehlung: <Klartext>`', 'höchstens 400 Zeichen', '`AC-<Zahl>`', '`Task <Zahl>`']) {
      assert.ok(body.includes(part), `${name}: ${part}`);
    }
    assert.ok(body.includes('Empfehlung: <Klartext, höchstens 400 Zeichen, mit kurzem Grund>'), `${name}: Beispiel`);
  }
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/scout-texts.test.js tests/review-flow-round-one.test.js tests/agents.test.js`
Expected: FAIL (`scoutBlocks is not a function`, kein `recommendation`, Plan-Review ohne Prüfung, Agent-Texte fehlen).

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/scout-check.js`:

a) Nach `DESCRIPTION_LINE` einfügen: `const RECOMMENDATION_LINE = /^Empfehlung: (.*)$/;` und `const TEXT_REVIEWS = ['spec-review', 'plan-review'];` (ersetzt `const TEXT_REVIEW = 'spec-review';`).

b) In `scoutTexts` das Gruppenobjekt auf `{ severity, location, title: null, description: null, recommendation: null }` erweitern und im `else if (current)`-Zweig ergänzen:

```js
      const recommendation = proposalSeen ? null : RECOMMENDATION_LINE.exec(line);
      if (recommendation && current.recommendation === null) current.recommendation = recommendation[1].trim();
```

c) `textsProblem` ersetzen durch:

```js
function textsProblem(texts) {
  if (!texts?.title) return 'Titel fehlt';
  if (!texts.description) return 'Beschreibung fehlt';
  const words = wordCount(texts.title);
  if (words < TITLE_WORDS.min || words > TITLE_WORDS.max) return `Titel hat ${words} Wörter statt ${TITLE_WORDS.min} bis ${TITLE_WORDS.max}`;
  const title = plainProblem(texts.title);
  if (title) return `Titel: ${title}`;
  const description = plainProblem(texts.description);
  if (description) return `Beschreibung: ${description}`;
  if (!texts.recommendation) return 'Empfehlung fehlt';
  const recommendation = plainProblem(texts.recommendation);
  return recommendation ? `Empfehlung: ${recommendation}` : null;
}
```

d) In `checkScout` die Zeile `const texts = review === TEXT_REVIEW ? …` ändern in `const texts = TEXT_REVIEWS.includes(review) ? new Map(scoutTexts(lines).map((group) => [groupId(group), group])) : null;`.

e) Vor `module.exports` einfügen:

```js
// Zeilen jeder Gruppe, von ihrer Überschrift bis vor die nächste; Grundlage der Sicherung offener Gruppen.
function scoutBlocks(lines) {
  const start = lines.findIndex((line) => SCOUT_HEADING.test(line));
  const blocks = new Map();
  let current = null;
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const heading = GROUP_HEADING.exec(line);
    if (heading) {
      current = [line];
      blocks.set(`${heading[1]} ${heading[2]}`, current);
    } else if (current) {
      current.push(line);
    }
  }
  return blocks;
}
```

und die Exporte auf `module.exports = { checkScout, preferredProblem, scoutTexts, scoutBlocks };` erweitern.

`plugins/forge/agents/spec-review-scout.md`: Punkt 8 im Abschnitt „Auftrag" (aus TP-B) so ersetzen, dass er lautet:

```
8. Pro Gruppe schreibst du direkt unter die Überschrift drei Zeilen: `Titel: <2 bis 6 Wörter>`, `Beschreibung: <was das Problem ist>` und `Empfehlung: <Klartext>`. Die Empfehlung nennt den bevorzugten Vorschlag mit einem kurzen Grund. Alle drei stehen in Klartext für einen Menschen, der die Spec nicht vor sich hat: keine Kürzel (kein `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `), keine Dateipfade, jede Zeile höchstens 400 Zeichen. Du beschreibst die Stelle mit Worten, nicht mit ihrer Nummer.
```

Im Ausgabe-Beispiel nach `Beschreibung: <Klartext, höchstens 400 Zeichen>` die Zeile `Empfehlung: <Klartext, höchstens 400 Zeichen, mit kurzem Grund>` einfügen; den Aufzählungspunkt unter dem Beispiel ändern in: `- Die Zeilen `Titel:`, `Beschreibung:` und `Empfehlung:` stehen direkt unter der Gruppen-Überschrift und vor dem ersten Vorschlag.`

`plugins/forge/agents/plan-review-scout.md`: im Abschnitt „Auftrag" nach Punkt 6 einfügen:

```
7. Pro Gruppe schreibst du direkt unter die Überschrift drei Zeilen: `Titel: <2 bis 6 Wörter>`, `Beschreibung: <was das Problem ist>` und `Empfehlung: <Klartext>`. Die Empfehlung nennt den bevorzugten Vorschlag mit einem kurzen Grund. Alle drei stehen in Klartext für einen Menschen, der den Plan nicht vor sich hat: keine Kürzel (kein `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `), keine Dateipfade, jede Zeile höchstens 400 Zeichen. Du beschreibst die Stelle mit Worten, nicht mit ihrer Nummer.
```

Im Ausgabe-Beispiel des Plan-Scouts die Gruppe ergänzen zu:

```markdown
### 🔴 <Stelle>
Titel: <2 bis 6 Wörter>
Beschreibung: <Klartext, höchstens 400 Zeichen>
Empfehlung: <Klartext, höchstens 400 Zeichen, mit kurzem Grund>
1. <Vorschlag>
2. <Vorschlag>
**Bevorzugt: <Nr>** — <Begründung>
```

und als weiteren Aufzählungspunkt unter dem Beispiel: `- Die Zeilen `Titel:`, `Beschreibung:` und `Empfehlung:` stehen direkt unter der Gruppen-Überschrift und vor dem ersten Vorschlag.`

Hinweis: Enthalten die eingefügten Texte typografische Anführungszeichen, per Skript mit `\u201E`/`\u201C` einfügen und die Anzahl öffnender und schließender Zeichen im Body gleich halten (der Agent-Test zählt sie).

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/scout-texts.test.js tests/review-flow-round-one.test.js tests/agents.test.js tests/followup.test.js`
Expected: PASS. Schlägt ein bestehender Plan-Scout-Agent-Test wegen des geänderten Beispiels fehl, den Test an das neue Beispiel anpassen, die Prüfung nicht abschwächen.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/scout-check.js plugins/forge/agents plugins/forge/tests
git commit -m "feat(forge): add a plain recommendation line to the spec and plan scouts"
```

---

### Task 2: Klartextfelder von Nacharbeit und Antworten

**Files:**
- Modify: `plugins/forge/scripts/lib/rework-check.js`
- Modify: `plugins/forge/agents/spec-rework.md`, `plugins/forge/agents/plan-rework.md`
- Modify: Tests mit `status: 'changed'`/`'answered'`-Fixtures; `plugins/forge/tests/review-flow-rework.test.js`, `plugins/forge/tests/agents.test.js`

**Interfaces:**
- Consumes: `plainProblem` (TP-B), `checkRework`/`checkAnswers` (TP-B-Stand).
- Produces: `rework-check` verlangt für beide Reviews und alle Quellen `change` (bei `changed`), `reason` (bei `unchanged` und `spec-question`) als Klartext; `answers-check` verlangt `decision` und `change` bei `answered`. Meldungen: `NACHARBEIT ungültig: <feld>: <grund> (<stelle>)`, `ANTWORTEN ungültig: <feld>: <grund> (<stelle>)`.

- [ ] **Step 1: Bestehende Fixtures an die neue Pflicht anpassen**

Run (im Repo-Root):

```bash
node - <<'JS'
const fs = require('fs');
const files = ['review-flow-rework', 'review-flow-report', 'review-flow-round-two', 'review-flow-plan-checks', 'review-files']
  .map((name) => `plugins/forge/tests/${name}.test.js`).filter((file) => fs.existsSync(file));
const change = "change: 'Wortlaut geschärft.'";
const answer = "decision: 'F gilt immer.', change: 'Die Spec legt F fest.'";
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/status: 'changed', evidence:/g, `status: 'changed', ${change}, evidence:`)
    .replace(/status: 'changed' \}/g, `status: 'changed', ${change} }`)
    .replace(/status: 'answered' \}/g, `status: 'answered', ${answer} }`);
  fs.writeFileSync(file, text);
}
console.log(files.join('\n'));
JS
```

Expected: die Dateiliste. (Ein Eintrag, der schon ein `change` trägt, bleibt unberührt, weil der Treffer `status: 'changed' }` dann nicht passt.)

- [ ] **Step 2: Failing tests schreiben**

In `plugins/forge/tests/review-flow-rework.test.js`:

a) Den Test `reworkCheck_PlanReviewChangedWithoutChange_StaysOk` (TP-B) ersetzen durch:

```js
test('reworkCheck_PlanReviewChangedWithoutChange_Invalid', () => {
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'changed' }] });
  assert.equal(checkRework(env, 'plan-review'), 'NACHARBEIT ungültig: change: leer (Task 1)\n');
});

test('reworkCheck_PlanSpecQuestionReasonWithShorthand_Invalid', () => {
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'spec-question', reason: 'Siehe AC-07' }] });
  assert.equal(checkRework(env, 'plan-review'), 'NACHARBEIT ungültig: reason: Kürzel AC-07 (Task 1)\n');
});

test('reworkCheck_FollowupSourceChangedWithoutChange_Invalid', () => {
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: \u201Ex\u201C\n');
  writeRework(env, { results: [{ location: 'AC-07', status: 'changed' }] }, 'nacharbeit');
  assert.equal(checkRework(env, 'spec-review', 'nacharbeit'), 'NACHARBEIT ungültig: change: leer (AC-07)\n');
});
```

b) Anhängen:

```js
test('answersCheck_AnsweredWithoutDecisionOrChangeOrWithShorthand_Invalid', () => {
  const env = answersSetup();
  addEntries(env, '- **W · AC-04** · Aussage \u2014 Antwort auf \u201ER1 · AC-04\u201C: F gilt immer.');
  const file = path.join(env.workspace, 'runde-1', 'antworten.json');
  const check = () => flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
  const rest = [{ location: 'AC-01', status: 'open' }, { location: 'AC-07', status: 'open' }];
  writeJsonFile(file, { results: [{ location: 'AC-04', status: 'answered', change: 'Die Spec legt F fest.' }, ...rest] });
  assert.equal(check(), 'ANTWORTEN ungültig: decision: leer (AC-04)\n');
  writeJsonFile(file, { results: [{ location: 'AC-04', status: 'answered', decision: 'F gilt immer.', change: 'Siehe AC-07' }, ...rest] });
  assert.equal(check(), 'ANTWORTEN ungültig: change: Kürzel AC-07 (AC-04)\n');
});
```

In `plugins/forge/tests/agents.test.js` anhängen:

```js
test('reworkAgents_Body_ChangeFieldAlsoInFollowupModeAndAnswersCarryDecision', () => {
  const spec = readAgent('spec-rework').body;
  const plan = readAgent('plan-rework').body;
  for (const part of ['`change`: Pflicht bei `changed`', '"decision"', '"change"', 'höchstens 400 Zeichen']) assert.ok(spec.includes(part), `spec-rework: ${part}`);
  for (const part of ['`change`: Pflicht bei `changed`', '"change"', 'höchstens 400 Zeichen', '`AC-<Zahl>`']) assert.ok(plan.includes(part), `plan-rework: ${part}`);
  assert.equal(spec.includes('(nicht im Folge-Modus'), false);
});
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/review-flow-rework.test.js tests/agents.test.js`
Expected: FAIL (Plan und Folge-Quelle werden nicht geprüft, `answers-check` kennt `decision` nicht, Agent-Texte fehlen).

- [ ] **Step 4: Implementieren**

`plugins/forge/scripts/lib/rework-check.js`:

a) `plainEntryProblem` (aus TP-B) ersetzen durch:

```js
// Klartextfelder, die der Mensch im Bericht liest: für beide Reviews und alle Quellen.
const PLAIN_FIELD_OF_STATUS = { changed: 'change', unchanged: 'reason', 'spec-question': 'reason' };

function plainEntryProblem(entry) {
  const field = PLAIN_FIELD_OF_STATUS[entry.status];
  const problem = field ? plainProblem(entry[field]) : null;
  return problem ? `${field}: ${problem} (${entry.location})` : null;
}
```

b) In `resultsProblem` den Aufruf `plainEntryProblem(entry, options)` zu `plainEntryProblem(entry)` ändern. (Die Signatur von `resultsProblem(value, keys, options)` aus TP-B bleibt.)

c) `answersProblem` so erweitern, dass nach der Zeile `if (wrong) return …` eingefügt wird:

```js
  const plain = value.results.map(plainAnswerProblem).find(Boolean);
  if (plain) return plain;
```

und vor `answersProblem` die Funktion:

```js
function plainAnswerProblem(entry) {
  if (entry.status !== 'answered') return null;
  const field = ['decision', 'change'].find((name) => plainProblem(entry[name]));
  return field ? `${field}: ${plainProblem(entry[field])} (${entry.location})` : null;
}
```

`plugins/forge/agents/spec-rework.md`:
- Den Aufzählungspunkt `- `change`: Pflicht bei `changed`, wenn du `Findings:` bekommst (nicht im Folge-Modus mit `Vorschläge:`): …` ersetzen durch: `- `change`: Pflicht bei `changed` (auch im Folge-Modus mit `Vorschläge:`): ein bis drei Sätze in Klartext, was sich in der Spec geändert hat, ohne Kürzel, höchstens 400 Zeichen. Bei `unchanged` steht `reason` ebenfalls in Klartext ohne Kürzel, höchstens 400 Zeichen.`
- Im Abschnitt „Antworten eintragen" Punkt 4 und das JSON-Beispiel ersetzen durch:

```
4. Deine letzte Aktion: Schreib mit `Write` an den Pfad aus `Ergebnis:` je Stelle mit Frage einen Eintrag und antworte danach nur mit `Ergebnis geschrieben: <pfad>`. Bei `answered` stehen zwei Klartextfelder (keine Kürzel, jedes höchstens 400 Zeichen): `decision` (die gewählte Option in Klartext, so wie der Mensch sie sagen würde) und `change` (was die Spec jetzt festlegt).
```

```json
{ "results": [ { "location": "AC-04", "status": "answered", "decision": "Sofort umsetzen und das Risiko akzeptieren.", "change": "Die Spec legt jetzt fest, dass am Testsystem umgesetzt wird." }, { "location": "AC-07", "status": "open" } ] }
```

`plugins/forge/agents/plan-rework.md`: unter dem JSON-Beispiel des Abschnitts „Ausgabe" das Beispiel ersetzen durch

```json
{ "results": [ { "location": "Task 3", "status": "changed", "change": "Der Schritt nennt jetzt den vollständigen Befehl." }, { "location": "Task 5", "status": "spec-question", "reason": "Die Spec legt die Reihenfolge nicht fest." } ] }
```

und den Absatz danach ergänzen um: `- `change`: Pflicht bei `changed` (auch im Folge-Modus): ein bis drei Sätze in Klartext, was sich im Plan geändert hat. `reason` bei `unchanged` und `spec-question` ebenfalls in Klartext. Alle drei Textfelder ohne Kürzel (kein `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `) und höchstens 400 Zeichen.`

- [ ] **Step 5: Tests laufen lassen und Folgeschäden beheben**

Run: `cd plugins/forge && node --test`
Expected: Alle Tests, die ein `rework.json` oder `antworten.json` erzeugen und `rework-check`/`answers-check` aufrufen, laufen. Meldet ein Test `NACHARBEIT ungültig: change: leer` oder `ANTWORTEN ungültig: decision: leer`, die Fixture dort um die Felder aus Step 1 ergänzen (nicht die Prüfung abschwächen). Tests, die die alten Texte aus `agents.test.js` prüfen und an den geänderten Absätzen scheitern, an die neuen Texte anpassen.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/scripts/lib/rework-check.js plugins/forge/agents plugins/forge/tests
git commit -m "feat(forge): require plain change, decision and reason fields from rework and answers"
```

---

### Task 3: `reviewers` in der Einstufung und `hinweise.json`

**Files:**
- Modify: `plugins/forge/scripts/lib/round-one.js` (Zeile mit `writeJson(… 'einstufung.json' …)`)
- Modify: `plugins/forge/scripts/prepare.js` (`prepareSpecReview`, `preparePlanReview`)
- Modify: `plugins/forge/tests/review-flow-round-one.test.js`, `plugins/forge/tests/prepare.test.js`

**Interfaces:**
- Produces: `runde-1/einstufung.json` enthält `reviewers: string[]` (die erwarteten Reviewer-Kurznamen). `prepare.js` schreibt `<W>/hinweise.json` (JSON-Liste von Strings) für `spec-review` und `plan-review`.

- [ ] **Step 1: Failing tests schreiben**

In `plugins/forge/tests/review-flow-round-one.test.js` anhängen:

```js
test('rate_AnyRun_WritesExpectedReviewersIntoEinstufung', () => {
  const env = setup();
  writeReviewer(env, 'consistency', []);
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency,clarity');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-1', 'einstufung.json')).reviewers, ['consistency', 'clarity']);
});
```

In `plugins/forge/tests/prepare.test.js` anhängen:

```js
function hints(out) {
  return JSON.parse(fs.readFileSync(path.join(out.W, 'hinweise.json'), 'utf8'));
}

test('specReview_NoWarnings_WritesEmptyHintList', () => {
  const repo = planRepo();
  assert.deepEqual(hints(values(run(repo, 'spec-review', 'docs/forge/demo/spec.md'))), []);
});

test('specReview_OnlyProfilesWithoutProfiles_WritesPlainHint', () => {
  const repo = planRepo();
  const out = values(run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--only', 'clarity,profiles'));
  assert.deepEqual(hints(out), ['Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen oder die Spec als frei gekennzeichnet ist. Diese Prüfung fehlt.']);
});

test('specReview_DuplicateProfiles_WritesPlainHintWithOriginalWarning', () => {
  const repo = planRepo();
  commitFile(repo, 'docs/glossary/domain-terms.md', '# Fachbegriffe\n\nKunde heißt Auftraggeber.\n', 'glossary');
  commitFile(repo, 'docs/application/orders/domain-terms.md', '# Begriffe Bestellung\n\nAnders.\n', 'profile');
  const notes = hints(values(run(repo, 'spec-review', 'docs/forge/demo/spec.md')));
  assert.equal(notes.length, 1);
  assert.match(notes[0], /^Mehrere Profile heißen gleich: gleichnamige Profile an mehreren Orten: .*\. Der Prüfer für Fachbegriffe kann dadurch ein falsches Profil lesen\.$/);
});

test('planReview_NoWarnings_WritesEmptyHintList', () => {
  assert.deepEqual(hints(values(run(planRepo(), 'plan-review', 'docs/forge/demo/plan.md'))), []);
});

test('planReview_AnchorCheckFails_WritesPlainHint', () => {
  const repo = planRepo(PLAN.replace('### Task 1: Eins', '### Task 2: Zwei'));
  const notes = hints(values(run(repo, 'plan-review', 'docs/forge/demo/plan.md')));
  assert.equal(notes.length, 1);
  assert.match(notes[0], /^Die automatische Prüfung der Stellen im Plan ist fehlgeschlagen \(Task-Nummerierung.*\)\. Der Plan wurde ohne diese Prüfung bewertet\.$/);
});
```

(`readJsonFile` in der Round-One-Testdatei ist bereits importiert: `const { …, readJsonFile } = require('./lib/review-flow-fixture');` — falls nicht, in der Importzeile ergänzen.)

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/review-flow-round-one.test.js tests/prepare.test.js`
Expected: FAIL (`reviewers` fehlt; `hinweise.json` fehlt)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/round-one.js`: die Zeile `writeJson(path.join(dir, 'einstufung.json'), { groups, dropped: droppedList(items), failed, questions });` ersetzen durch:

```js
  writeJson(path.join(dir, 'einstufung.json'), { groups, dropped: droppedList(items), failed, questions, reviewers: options.expected });
```

`plugins/forge/scripts/prepare.js`:

a) Nach `function prepareSpecReview` einfügen (vor der Funktion):

```js
// Hinweise zum Ablauf in Klartext mit Auswirkung; der Bericht (report) zeigt sie dem Menschen.
function writeHints(workspace, notes) {
  fs.writeFileSync(path.join(workspace, 'hinweise.json'), `${JSON.stringify(notes, null, 2)}\n`);
}
```

b) In `prepareSpecReview`: neben `const warnings = [];` die Liste `const hints = [];` anlegen. Die Zeile `warnings.push(...profiles.warnings);` bleibt und bekommt darunter:

```js
    hints.push(...profiles.warnings.map((warning) => `Mehrere Profile heißen gleich: ${warning}. Der Prüfer für Fachbegriffe kann dadurch ein falsches Profil lesen.`));
```

Die Zeile `if (flags['--only'] && active.length < chosen.length) warnings.push('profiles nicht aktiv: keine Profile oder freie Spec');` wird zu

```js
  if (flags['--only'] && active.length < chosen.length) {
    warnings.push('profiles nicht aktiv: keine Profile oder freie Spec');
    hints.push('Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen oder die Spec als frei gekennzeichnet ist. Diese Prüfung fehlt.');
  }
```

und direkt vor `if (warnings.length > 0) values.WARN = warnings;` die Zeile `writeHints(values.W, hints);`.

c) In `preparePlanReview` die Zeilen

```js
  try {
    values.A = writeAnchors(plan, root, values.W);
  } catch (error) {
    values.WARN = [`Anker-Prüfung fehlgeschlagen: ${error.message}`];
  }
```

ersetzen durch:

```js
  const hints = [];
  try {
    values.A = writeAnchors(plan, root, values.W);
  } catch (error) {
    values.WARN = [`Anker-Prüfung fehlgeschlagen: ${error.message}`];
    hints.push(`Die automatische Prüfung der Stellen im Plan ist fehlgeschlagen (${error.message}). Der Plan wurde ohne diese Prüfung bewertet.`);
  }
  writeHints(values.W, hints);
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/review-flow-round-one.test.js tests/prepare.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/round-one.js plugins/forge/scripts/prepare.js plugins/forge/tests
git commit -m "feat(forge): record reviewers and plain process hints in the workspace"
```

---

### Task 4: Offene Gruppen

**Files:**
- Create: `plugins/forge/scripts/lib/open-groups.js`
- Create: `plugins/forge/tests/open-groups.test.js`

**Interfaces:**
- Consumes: `renderGroup`, `ICON` aus `groups.js`; `placeKey`, `collapse` aus `places.js`.
- Produces:
  - `answeredKeys(answers: Array): Set<string>` — `placeKey` aller Einträge mit `status: 'answered'`.
  - `verdictMap(two: object|null): Map<string, string>` — `placeKey(location)` → Urteil (`erledigt` | `nicht erledigt`) aus `runde-2/einstufung.json`.
  - `fromSaved(group): OpenGroup` — aus einer Gruppe von `followup.loadGroups`.
  - `openFromRounds({ one, two, answered }): OpenGroup[]`
  - `openFromFollowup({ saved, chosen, two }): OpenGroup[]` — `saved`: Ausgabe von `loadGroups`, `chosen`: `Set` der Gruppennummern.
  - `OpenGroup = { color: 'red'|'yellow', label, key, reviewers: string[], consequence: string, scoutKey: string, block: string }`; `block` ist die Gruppe im Aggregat-Format (`### <icon> <stelle> (<reviewer>)` plus Finding-Zeilen), `scoutKey` die Überschrift der Scout-Gruppe `<icon> <stelle>`.

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/open-groups.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { answeredKeys, verdictMap, fromSaved, openFromRounds, openFromFollowup } = require('../scripts/lib/open-groups');

const rated = (key, label, color, extra = {}) => ({
  key, label, color, reviewers: ['clarity'],
  items: [{ reviewer: 'clarity', category: 'detail', color, place: { key, label }, finding: { quote: 'q', consequence: `Folge ${label}`, rationale: 'g' } }], ...extra,
});
const verdict = (location, value) => ({ location, verdict: value, rationale: 'r', source: 'ki' });

test('answeredKeys_AnsweredAndOpen_ReturnsOnlyAnsweredKeys', () => {
  const keys = answeredKeys([{ location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }, null]);
  assert.deepEqual([...keys], ['ac-4']);
});

test('verdictMap_Verdicts_MapsPlaceKeyToVerdict', () => {
  const map = verdictMap({ verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'nicht erledigt')] });
  assert.equal(map.get('ac-4'), 'erledigt');
  assert.equal(map.get('ac-7'), 'nicht erledigt');
  assert.equal(verdictMap(null).size, 0);
});

test('openFromRounds_DoneRedAnsweredYellowAndGreen_AreNotOpen', () => {
  const one = { groups: [rated('ac-1', 'AC-01', 'red'), rated('ac-4', 'AC-04', 'red'), rated('ac-7', 'AC-07', 'yellow'), rated('ac-8', 'AC-08', 'yellow'), rated('ac-9', 'AC-09', 'green')] };
  const two = { verdicts: [verdict('AC-01', 'erledigt'), verdict('AC-04', 'nicht erledigt')], groups: [] };
  const open = openFromRounds({ one, two, answered: new Set(['ac-8']) });
  assert.deepEqual(open.map((group) => `${group.color}:${group.label}`), ['red:AC-04', 'yellow:AC-07']);
});

test('openFromRounds_RedWithoutVerdictWhileVerified_IsNotOpenBecauseQuestionCoversIt', () => {
  const one = { groups: [rated('ac-4', 'AC-04', 'red')] };
  assert.deepEqual(openFromRounds({ one, two: { verdicts: [], groups: [] }, answered: new Set() }), []);
});

test('openFromRounds_NoVerification_AllRedAndYellowExceptAnsweredAreOpen', () => {
  const one = { groups: [rated('ac-4', 'AC-04', 'red'), rated('ac-7', 'AC-07', 'yellow'), rated('ac-8', 'AC-08', 'red')] };
  const open = openFromRounds({ one, two: null, answered: new Set(['ac-8']) });
  assert.deepEqual(open.map((group) => group.label), ['AC-04', 'AC-07']);
});

test('openFromRounds_RoundTwoGroups_AreOpenAndReplaceSamePlaceFromRoundOne', () => {
  const one = { groups: [rated('ac-7', 'AC-07', 'yellow')] };
  const two = { verdicts: [], groups: [rated('ac-7', 'AC-07', 'yellow', { reviewers: ['nachprüfer'] }), rated('ac-2', 'AC-02', 'red'), rated('ac-3', 'AC-03', 'green')] };
  const open = openFromRounds({ one, two, answered: new Set() });
  assert.deepEqual(open.map((group) => `${group.color}:${group.label}:${group.reviewers}`), ['red:AC-02:clarity', 'yellow:AC-07:nachprüfer']);
});

test('openFromRounds_Group_CarriesBlockScoutKeyAndConsequence', () => {
  const [group] = openFromRounds({ one: { groups: [rated('ac-7', 'AC-07', 'yellow')] }, two: null, answered: new Set() });
  assert.equal(group.scoutKey, '🟡 AC-07');
  assert.equal(group.consequence, 'Folge AC-07');
  assert.match(group.block, /^### 🟡 AC-07 \(clarity\)\n- \[clarity · detail\]/);
});

const saved = (number, severity, location, extra = {}) => ({
  number, severity, location, reviewers: ['clarity'], proposals: ['x'], preferred: 1,
  findings: [`- [clarity · detail] Zitat: \u201Ex\u201C · Konsequenz: Folge ${location} · Begründung: b`], ...extra,
});

test('fromSaved_SavedGroup_BuildsOpenGroupWithConsequenceFromFindingLine', () => {
  const group = fromSaved(saved(2, '🟡', 'AC-07'));
  assert.equal(group.color, 'yellow');
  assert.equal(group.consequence, 'Folge AC-07');
  assert.equal(group.scoutKey, '🟡 AC-07');
  assert.equal(group.block.split('\n')[0], '### 🟡 AC-07 (clarity)');
});

test('openFromFollowup_UnchosenNotDoneAndFresh_AreOpenChosenDoneIsNot', () => {
  const groups = [saved(1, '🔴', 'AC-01'), saved(2, '🟡', 'AC-02'), saved(3, '🟡', 'AC-03'), saved(4, '🟡', 'AC-04')];
  const two = { verdicts: [verdict('AC-01', 'erledigt'), verdict('AC-02', 'nicht erledigt')], groups: [rated('ac-9', 'AC-09', 'red')] };
  const open = openFromFollowup({ saved: groups, chosen: new Set([1, 2]), two });
  assert.deepEqual(open.map((group) => `${group.color}:${group.label}`), ['red:AC-02', 'red:AC-09', 'yellow:AC-03', 'yellow:AC-04']);
  assert.equal(open[0].scoutKey, '🟡 AC-02');
});

test('openFromFollowup_NoVerification_ChosenGroupsStayOpen', () => {
  const open = openFromFollowup({ saved: [saved(1, '🔴', 'AC-01'), saved(2, '🟡', 'AC-02')], chosen: new Set([1]), two: null });
  assert.deepEqual(open.map((group) => group.label), ['AC-01', 'AC-02']);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/open-groups.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/open-groups'`

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/open-groups.js`:

```js
'use strict';

// Offene Gruppen am Ende eines Laufs: was noch zu tun bleibt und deshalb gesichert und im Bericht genannt wird.

const { ICON, renderGroup } = require('./groups');
const { collapse, placeKey } = require('./places');

const COLOR_OF_ICON = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
const RANK = { red: 0, yellow: 1, green: 2 };
const CONSEQUENCE = /Konsequenz: (.*?) · Begründung:/;

function answeredKeys(answers) {
  return new Set(answers.filter((entry) => entry?.status === 'answered' && typeof entry.location === 'string').map((entry) => placeKey(entry.location)));
}

function verdictMap(two) {
  return new Map((two?.verdicts ?? []).map((verdict) => [placeKey(verdict.location), verdict.verdict]));
}

function fromRated(group) {
  return {
    color: group.color, label: group.label, key: group.key, reviewers: group.reviewers,
    consequence: group.items[0].finding.consequence, scoutKey: `${ICON[group.color]} ${collapse(group.label)}`, block: renderGroup(group),
  };
}

function fromSaved(group) {
  return {
    color: COLOR_OF_ICON[group.severity], label: group.location, key: placeKey(group.location), reviewers: group.reviewers,
    consequence: CONSEQUENCE.exec(group.findings[0] ?? '')?.[1] ?? '', scoutKey: `${group.severity} ${group.location}`,
    block: [`### ${group.severity} ${group.location} (${group.reviewers.join(', ')})`, ...group.findings].join('\n'),
  };
}

// Pro Stelle und Farbe bleibt die letzte Gruppe; rot steht vor gelb.
function dedupe(groups) {
  const byKey = new Map(groups.map((group) => [`${group.color}:${group.key}`, group]));
  return [...byKey.values()].sort((a, b) => RANK[a.color] - RANK[b.color]);
}

function openInRoundOne(group, state) {
  if (group.color === 'green' || state.answered.has(group.key)) return false;
  if (group.color === 'yellow' || !state.verified) return true;
  return state.verdicts.get(group.key) === 'nicht erledigt';
}

// Runde 1: gelbe Hinweise ohne Antwort und 🔴 mit Urteil nicht erledigt; Nachprüfung: alle nicht grünen Gruppen.
// Eine 🔴 ohne Urteil bei vorhandener Nachprüfung hängt an einer offenen Frage und steht dort, nicht hier.
function openFromRounds({ one, two, answered }) {
  const state = { answered, verified: two !== null, verdicts: verdictMap(two) };
  const first = (one?.groups ?? []).filter((group) => openInRoundOne(group, state));
  const second = (two?.groups ?? []).filter((group) => group.color !== 'green');
  return dedupe([...first, ...second].map(fromRated));
}

// Followup: nicht gewählte Gruppen, gewählte ohne bestätigte Umsetzung (dann 🔴) und neue Gruppen der Nachprüfung.
function openFromFollowup({ saved, chosen, two }) {
  const verdicts = verdictMap(two);
  const unchosen = saved.filter((group) => !chosen.has(group.number)).map(fromSaved);
  const notDone = saved
    .filter((group) => chosen.has(group.number) && (two === null || verdicts.get(placeKey(group.location)) === 'nicht erledigt'))
    .map((group) => ({ ...fromSaved(group), color: 'red' }));
  const fresh = (two?.groups ?? []).filter((group) => group.color !== 'green').map(fromRated);
  return dedupe([...unchosen, ...notDone, ...fresh]);
}

module.exports = { answeredKeys, verdictMap, fromSaved, openFromRounds, openFromFollowup };
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/open-groups.test.js`
Expected: PASS (10 Tests)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/open-groups.js plugins/forge/tests/open-groups.test.js
git commit -m "feat(forge): decide which groups are still open at the end of a review"
```

---

### Task 5: Renderer des Berichts

**Files:**
- Create: `plugins/forge/scripts/lib/report-text.js`
- Create: `plugins/forge/tests/report-text.test.js`

**Interfaces:**
- Consumes: nichts (reine Funktion).
- Produces: `renderReportText(input): string` mit
  - `input.review`: `'spec-review' | 'plan-review'`; `input.followup`: boolean; `input.title`, `input.topic` (string|null), `input.artifact`, `input.spec` (string|null)
  - `input.status`: `flowStatus`-Text; `input.openRed`: Zahl; `input.reviewerCount`: Zahl; `input.reworked`, `input.verified`: boolean; `input.chosenCount`: Zahl; `input.failedLabels`: string[]
  - `input.changes`: `[{ ok: true|false|null, title, angles, description, change: string|null, evidence: string|null, choice: number|null }]`
  - `input.decisions`: `[{ title, decision }]`; `input.questions`: string[] (fertige Zeilen ohne `- `)
  - `input.open`: `[{ color: 'red'|'yellow', title, angles, description, recommendation: string|null }]`; `input.notes`: string[]

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/report-text.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderReportText } = require('../scripts/lib/report-text');

function base(overrides = {}) {
  return {
    review: 'spec-review', followup: false, title: 'Spec-Review', topic: 'Zugriff mit dem Access-Token', artifact: 'docs/specs/x.md', spec: null,
    status: 'sauber nach Nachprüfung', openRed: 0, reviewerCount: 5, reworked: true, verified: true, chosenCount: 0, failedLabels: [],
    changes: [], decisions: [], questions: [], open: [], notes: [], ...overrides,
  };
}

const CHANGE = {
  ok: true, title: 'Anmeldestatus und Browser-Tests', angles: 'Vollständigkeit, Klarheit', description: 'Es fehlte, woran die App erkennt, dass jemand angemeldet ist.',
  change: 'Beides ist jetzt als prüfbare Vorgabe ergänzt.', evidence: null, choice: null,
};
const HINT = { color: 'yellow', title: 'Antwort bei fremdem Token', angles: 'Klarheit', description: 'Offen ist, ob 401 oder 403 kommt.', recommendation: 'immer 401, weil das Frontend nur danach erneuert.' };

test('renderReportText_ReadyWithOneHint_ShowsAgreedLayout', () => {
  // Act
  const text = renderReportText(base({
    changes: [CHANGE], decisions: [{ title: 'Token-Format', decision: 'sofort umsetzen, Risiko akzeptiert' }], open: [HINT],
    notes: ['Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.'],
  }));

  // Assert
  assert.equal(text, [
    '## Spec-Review · Ergebnis · Zugriff mit dem Access-Token',
    '**Ergebnis:** ✅ Bereit zum Planen · 1 kleiner Hinweis offen',
    'Ablauf: Prüfung aus fünf Blickwinkeln, eine Überarbeitung, eine Nachprüfung.',
    '',
    '### Was sich in der Spec geändert hat',
    '- ✅ **Anmeldestatus und Browser-Tests** · gefunden aus: Vollständigkeit, Klarheit',
    '  Es fehlte, woran die App erkennt, dass jemand angemeldet ist.',
    '  Änderung: Beides ist jetzt als prüfbare Vorgabe ergänzt.',
    '  Nachprüfung: bestätigt.',
    '',
    '### Deine Entscheidungen',
    '- **Token-Format:** sofort umsetzen, Risiko akzeptiert',
    '',
    '### Noch offen · kein Hindernis für den Plan',
    '- 🟡 **Antwort bei fremdem Token** · aus: Klarheit',
    '  Offen ist, ob 401 oder 403 kommt.',
    '  Vorschlag (empfohlen): immer 401, weil das Frontend nur danach erneuert.',
    '',
    '### Hinweise zum Ablauf',
    '- Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.',
    '',
    '### Wie es weitergeht',
    '1. Den Hinweis einarbeiten lassen (optional):',
    '   `/dv-forge:review-followup docs/specs/x.md alle`',
    '2. Spec committen.',
    '3. In einer frischen Session den Plan schreiben:',
    '   `/dv-forge:plan-writing docs/specs/x.md`',
  ].join('\n'));
});

test('renderReportText_ReadyWithoutAnything_OmitsEmptySectionsAndTopic', () => {
  // Act
  const text = renderReportText(base({ topic: null, reworked: false, verified: false, reviewerCount: 1 }));

  // Assert
  assert.equal(text, [
    '## Spec-Review · Ergebnis',
    '**Ergebnis:** ✅ Bereit zum Planen',
    'Ablauf: Prüfung aus einem Blickwinkel, keine Überarbeitung, keine Nachprüfung.',
    '',
    '### Wie es weitergeht',
    '1. Spec committen.',
    '2. In einer frischen Session den Plan schreiben:',
    '   `/dv-forge:plan-writing docs/specs/x.md`',
  ].join('\n'));
});

test('renderReportText_PlanReviewReadyWithTwoHints_UsesPlanWording', () => {
  // Act
  const text = renderReportText(base({ review: 'plan-review', title: 'Plan-Review', artifact: 'docs/p/plan.md', open: [HINT, { ...HINT, title: 'Zweiter Hinweis' }] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 2 kleine Hinweise offen/);
  assert.match(text, /### Noch offen · kein Hindernis für die Umsetzung/);
  assert.match(text, /1\. Die 2 Hinweise einarbeiten lassen \(optional\):\n   `\/dv-forge:review-followup docs\/p\/plan\.md alle`\n2\. Spec und Plan committen \(ich frage dich danach\)\.\n3\. In einer frischen Session umsetzen:\n   `\/dv-forge:implementation docs\/p\/plan\.md`/);
  assert.equal(text.includes('Was sich'), false);
});

test('renderReportText_Blocked_ShowsHindrancesAndRerunStep', () => {
  // Arrange
  const hindrance = { color: 'red', title: 'Token-Format', angles: 'Widerspruchsfreiheit', description: 'Das Format ist nicht belegt.', recommendation: null };

  // Act
  const text = renderReportText(base({ status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [hindrance, { ...hindrance, title: 'Zweites' }] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Token-Format\*\* · aus: Widerspruchsfreiheit\n  Das Format ist nicht belegt\.\n- 🔴 \*\*Zweites\*\*/);
  assert.equal(text.includes('Vorschlag (empfohlen)'), false);
  assert.match(text, /1\. Die 2 Hindernisse einarbeiten lassen \(oder das Dokument selbst anpassen\):\n   `\/dv-forge:review-followup docs\/specs\/x\.md alle`\n2\. Danach erneut prüfen:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`/);
});

test('renderReportText_QuestionsOpen_SpecAndPlanSteps', () => {
  // Act
  const spec = renderReportText(base({ status: 'Fragen offen', questions: ['**Leere Eingabe** (betrifft: Eingabe)', '**Zweite Frage** (betrifft: Ablauf)'] }));
  const plan = renderReportText(base({ review: 'plan-review', status: 'Fragen offen', artifact: 'docs/p/plan.md', spec: 'docs/p/spec.md', questions: ['Die Spec legt X nicht fest.'] }));

  // Assert
  assert.match(spec, /\*\*Ergebnis:\*\* ❓ 2 Fragen offen/);
  assert.match(spec, /### Offene Fragen\n- \*\*Leere Eingabe\*\* \(betrifft: Eingabe\)\n- \*\*Zweite Frage\*\*/);
  assert.match(spec, /1\. Die Fragen beantworten, indem du die Prüfung erneut startest:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`/);
  assert.match(plan, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
  assert.match(plan, /### Offene Fragen\n- Die Spec legt X nicht fest\./);
  assert.match(plan, /1\. Die Spec anpassen\.\n2\. Die Spec prüfen:\n   `\/dv-forge:spec-review docs\/p\/spec\.md`\n3\. Danach den Plan erneut prüfen:\n   `\/dv-forge:plan-review docs\/p\/plan\.md`/);
});

test('renderReportText_PlanQuestionsWithoutSpecPath_SkipsTheSpecStep', () => {
  // Act
  const text = renderReportText(base({ review: 'plan-review', status: 'Fragen offen', artifact: 'docs/p/plan.md', questions: ['Frage?'] }));

  // Assert
  assert.match(text, /1\. Die Spec anpassen\.\n2\. Danach den Plan erneut prüfen:/);
  assert.equal(text.includes('null'), false);
});

test('renderReportText_Incomplete_NamesFailedAndOffersRerun', () => {
  // Act
  const text = renderReportText(base({ status: 'unvollständig, ausgefallen: nachprüfer', failedLabels: ['Nachprüfung', 'Klarheit'] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Nachprüfung, Klarheit ausgefallen/);
  assert.match(text, /1\. Den Lauf in einer frischen Session erneut starten:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`/);
});

test('renderReportText_ChangeVariants_ShowEvidenceChoiceAndVerdict', () => {
  // Act
  const text = renderReportText(base({
    changes: [{ ...CHANGE, ok: false, evidence: 'src/export.js', choice: 2 }, { ...CHANGE, title: 'Ohne Urteil', ok: null, change: null }],
  }));

  // Assert
  assert.match(text, /- ⚠️ \*\*Anmeldestatus und Browser-Tests\*\*[^\n]*\n  Es fehlte[^\n]*\n  Änderung: Beides[^\n]*\n  Beleg: src\/export\.js\n  Gewählt: Vorschlag 2\n  Nachprüfung: nicht erledigt\./);
  assert.match(text, /- ⚠️ \*\*Ohne Urteil\*\*[^\n]*\n  Es fehlte[^\n]*\n  Nachprüfung: nicht erfolgt\./);
});

test('renderReportText_Followup_ShowsFollowupFlowLineAndNoDecisions', () => {
  // Act
  const text = renderReportText(base({ followup: true, title: 'Review-Followup (spec-review)', chosenCount: 1, changes: [CHANGE], decisions: [{ title: 'X', decision: 'y' }] }));
  const several = renderReportText(base({ followup: true, chosenCount: 3, verified: false }));

  // Assert
  assert.match(text, /^## Review-Followup \(spec-review\) · Ergebnis · Zugriff mit dem Access-Token\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen\nAblauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
  assert.equal(text.includes('Deine Entscheidungen'), false);
  assert.match(several, /Ablauf: 3 gewählte Vorschläge umgesetzt, keine Nachprüfung\./);
});

test('renderReportText_Blocks_AreSeparatedByOneBlankLine', () => {
  // Act
  const text = renderReportText(base({ changes: [CHANGE], notes: ['Hinweis.'] }));

  // Assert
  assert.equal(/\n\n\n/.test(text), false);
  assert.ok(text.split('\n\n').length >= 4);
});
```


- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/report-text.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/report-text'`

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/report-text.js`:

```js
'use strict';

// Abschlussbericht eines Spec-, Plan-Reviews oder Followups in Klartext. Reine Funktion: Die Eingabe baut report-data.js.

const READY = { 'spec-review': 'Bereit zum Planen', 'plan-review': 'Bereit zur Umsetzung' };
const DOCUMENT_IN = { 'spec-review': 'in der Spec', 'plan-review': 'im Plan' };
const NEXT_FOR = { 'spec-review': 'den Plan', 'plan-review': 'die Umsetzung' };
const VIEWPOINTS = ['', 'einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs'];
const ICON = { red: '🔴', yellow: '🟡' };

function kindOf(input, hints) {
  if (input.status.startsWith('unvollständig')) return 'incomplete';
  if (input.status === 'Fragen offen') return 'questions';
  if (input.status.startsWith('nicht bereit')) return 'blocked';
  return hints > 0 ? 'hints' : 'ready';
}

function resultLine(input, kind, hints) {
  const count = (number, one, many) => (number === 1 ? one : many);
  if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
  if (kind === 'questions') return `**Ergebnis:** ❓ ${count(input.questions.length, '1 Frage', `${input.questions.length} Fragen`)} offen`;
  if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${count(input.openRed, '1 Hindernis', `${input.openRed} Hindernisse`)} offen`;
  const open = hints > 0 ? ` · ${count(hints, '1 kleiner Hinweis', `${hints} kleine Hinweise`)} offen` : '';
  return `**Ergebnis:** ✅ ${READY[input.review]}${open}`;
}

function flowLine(input) {
  const rework = input.reworked ? 'eine Überarbeitung' : 'keine Überarbeitung';
  const verify = input.verified ? 'eine Nachprüfung' : 'keine Nachprüfung';
  if (input.followup) {
    const chosen = input.chosenCount === 1 ? '1 gewählter Vorschlag' : `${input.chosenCount} gewählte Vorschläge`;
    return `Ablauf: ${chosen} umgesetzt, ${verify}.`;
  }
  const count = input.reviewerCount;
  const viewpoints = count === 1 ? 'einem Blickwinkel' : `${VIEWPOINTS[count] ?? count} Blickwinkeln`;
  return `Ablauf: Prüfung aus ${viewpoints}, ${rework}, ${verify}.`;
}

function changeLines(change) {
  const mark = change.ok === true ? '✅' : '⚠️';
  const verdict = { true: 'bestätigt.', false: 'nicht erledigt.', null: 'nicht erfolgt.' }[String(change.ok)];
  return [
    `- ${mark} **${change.title}** · gefunden aus: ${change.angles}`,
    `  ${change.description}`,
    ...(change.change ? [`  Änderung: ${change.change}`] : []),
    ...(change.evidence ? [`  Beleg: ${change.evidence}`] : []),
    ...(change.choice ? [`  Gewählt: Vorschlag ${change.choice}`] : []),
    `  Nachprüfung: ${verdict}`,
  ];
}

function openLines(entry) {
  return [
    `- ${ICON[entry.color]} **${entry.title}** · aus: ${entry.angles}`,
    `  ${entry.description}`,
    ...(entry.recommendation ? [`  Vorschlag (empfohlen): ${entry.recommendation}`] : []),
  ];
}

function closingSteps(input) {
  const artifact = input.artifact;
  return input.review === 'spec-review'
    ? ['Spec committen.', ['In einer frischen Session den Plan schreiben:', `/dv-forge:plan-writing ${artifact}`]]
    : ['Spec und Plan committen (ich frage dich danach).', ['In einer frischen Session umsetzen:', `/dv-forge:implementation ${artifact}`]];
}

function questionSteps(input) {
  const rerun = `/dv-forge:${input.review} ${input.artifact}`;
  if (input.review === 'spec-review') return [['Die Fragen beantworten, indem du die Prüfung erneut startest:', rerun]];
  return [
    'Die Spec anpassen.',
    ...(input.spec ? [['Die Spec prüfen:', `/dv-forge:spec-review ${input.spec}`]] : []),
    ['Danach den Plan erneut prüfen:', rerun],
  ];
}

function steps(input, kind, hints) {
  const rerun = `/dv-forge:${input.review} ${input.artifact}`;
  const followup = `/dv-forge:review-followup ${input.artifact} alle`;
  if (kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
  if (kind === 'questions') return questionSteps(input);
  if (kind === 'blocked') {
    const count = input.openRed === 1 ? 'Das Hindernis' : `Die ${input.openRed} Hindernisse`;
    return [[`${count} einarbeiten lassen (oder das Dokument selbst anpassen):`, followup], ['Danach erneut prüfen:', rerun]];
  }
  if (kind === 'hints') {
    const count = hints === 1 ? 'Den Hinweis' : `Die ${hints} Hinweise`;
    return [[`${count} einarbeiten lassen (optional):`, followup], ...closingSteps(input)];
  }
  return closingSteps(input);
}

function stepLines(list) {
  return list.flatMap((step, index) => {
    const [text, command] = Array.isArray(step) ? step : [step, null];
    return [`${index + 1}. ${text}`, ...(command ? [`   \`${command}\``] : [])];
  });
}

function section(title, lines) {
  return lines.length > 0 ? [[`### ${title}`, ...lines]] : [];
}

function renderReportText(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const kind = kindOf(input, hintEntries.length);
  const heading = `## ${input.title} · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, resultLine(input, kind, hintEntries.length), flowLine(input)],
    ...section(`Was sich ${DOCUMENT_IN[input.review]} geändert hat`, input.changes.flatMap(changeLines)),
    ...section('Deine Entscheidungen', input.decisions.map((entry) => `- **${entry.title}:** ${entry.decision}`)),
    ...section('Offene Fragen', input.questions.map((line) => `- ${line}`)),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section(`Noch offen · kein Hindernis für ${NEXT_FOR[input.review]}`, hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ['### Wie es weitergeht', ...stepLines(steps(input, kind, hintEntries.length))],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderReportText };
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/report-text.test.js`
Expected: PASS. Schlägt ein Test wegen einer Zeichenfolge im erwarteten Text fehl, den Renderer an die Beispiele aus der Spec angleichen, nicht umgekehrt.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/report-text.js plugins/forge/tests/report-text.test.js
git commit -m "feat(forge): render the closing report in plain language"
```

---

### Task 6: Eingabe des Berichts, Sicherung und `report`

**Files:**
- Create: `plugins/forge/scripts/lib/closing.js`
- Create: `plugins/forge/scripts/lib/report-data.js`
- Modify: `plugins/forge/scripts/lib/flow-report.js` (ersetzt `renderReport`, `writeClosing`, `report`)
- Modify: `plugins/forge/scripts/lib/halt-text.js` (Export `shorten`)
- Modify: `plugins/forge/tests/review-flow-report.test.js`

**Interfaces:**
- Consumes: Task 4 (`openFromRounds`, `openFromFollowup`, `answeredKeys`, `verdictMap`, `fromSaved`), Task 5 (`renderReportText`), Task 1 (`scoutTexts`, `scoutBlocks`), TP-B (`topicOf`, `reviewerLabel`), im Code: `loadGroups` (`followup.js`), `readAttempts`, `failedInstances` (`attempts.js`), `collect`/`flowStatus` (`flow-report.js`).
- Produces:
  - `openGroupsOf(options, data): OpenGroup[]` und `writeClosing(options, open)` (in `closing.js`).
  - `buildInput(options, data, status, open): object` (Eingabe von `renderReportText`; in `report-data.js`).
  - `report(options)` schreibt `abschluss/aggregate.md`, `abschluss/scout.md` (nur wenn mindestens eine offene Gruppe einen Scout-Block hat), `abschluss/bericht.md`; die Ausgabe bleibt `ENDE <status>\n=== BERICHT ===\n<text>`.

- [ ] **Step 1: Alte Berichtstests entfernen**

Run (Repo-Root):

```bash
node - <<'JS'
const fs = require('fs');
const file = 'plugins/forge/tests/review-flow-report.test.js';
let text = fs.readFileSync(file, 'utf8');
const names = [
  'report_TwoHintsWithoutRework_CleanAfterRoundOneAndClosingForFollowup',
  'report_ReworkFailedWithInvalidEntries_ListsValidEvidenceWithoutCrash',
  'report_ReworkResultNoJson_ReportsWithoutEvidenceSection',
  'report_AllDone_CleanAfterVerificationWithVerdicts',
  'report_ReworkWroteNewBehaviourAtTwoPlaces_ListsBothWithEvidence',
  'report_ReworkWithoutEvidence_NoEvidenceSection',
  'report_TwoNotDone_NichtBereitTwo',
  'report_NotDoneContradictionAndScript_NichtBereitThree',
  'report_QuestionOpenAndPointNotDone_FragenOffenShowsPoint',
  'report_TwoOpenQuestions_ListsBothWithPlaces',
  'report_GreenFinding_ListedWithoutScoutAndNotInClosing',
  'report_ScoutFailed_NotedWithoutChangingStatus',
  'report_PlanSpecQuestion_FragenOffenWithQuestion',
  'report_FollowupWithNotDonePoint_NichtBereitOne',
  'report_FollowupReworkWithEvidence_ListsIt',
];
for (const name of names) {
  const start = text.indexOf(`test('${name}'`);
  if (start === -1) throw new Error(`Test fehlt: ${name}`);
  const next = text.indexOf('\ntest(', start + 1);
  text = text.slice(0, start) + (next === -1 ? '' : text.slice(next + 1));
}
fs.writeFileSync(file, text);
JS
```

Expected: keine Fehlermeldung.

- [ ] **Step 2: Neue Tests schreiben** (am Dateiende von `review-flow-report.test.js` anhängen)

```js
const QUESTION_BUNDLE = {
  title: 'Leere Eingabe', affects: 'Eingabe prüfen', why: 'Es ist offen, was bei leerer Eingabe gilt.', reviewers: ['clarity'],
  options: [{ label: 'a', text: 'Fehler melden.', consequence: 'streng' }, { label: 'b', text: 'Standardwert nehmen.', consequence: 'bequem' }],
  recommendation: 'a', reason: 'Fehler fallen früh auf.', places: ['AC-04'],
};
const CHANGE = 'Wortlaut geschärft.';

function checkedFile(env, ...parts) {
  return path.join(env.workspace, ...parts);
}

test('report_TwoHintsWithoutRework_ReadyWithTwoHintsAndClosingKeepsBothGroups', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' }), finding({ location: 'AC-07' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 AC-01\n1. a\n**Bevorzugt: 1** — x\n\n### 🟡 AC-07\n1. b\n**Bevorzugt: 1** — y\n');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n=== BERICHT ===\n## Spec-Review · Ergebnis · Demo-Spec\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen · 2 kleine Hinweise offen\nAblauf: Prüfung aus einem Blickwinkel, keine Überarbeitung, keine Nachprüfung\./);
  assert.match(output, /### Noch offen · kein Hindernis für den Plan\n- 🟡 \*\*AC-01\*\* · aus: Klarheit\n  Folge \(ohne Scout-Beschreibung\)/);
  assert.match(fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8'), /### 🟡 AC-01[\s\S]*### 🟡 AC-07/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'bericht.md'), 'utf8'), `${output.split('=== BERICHT ===\n')[1].trimEnd()}\n`);
});

test('report_ScoutTexts_ShowTitleDescriptionAndRecommendationOfOpenGroup', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-07' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), [
    '## Scout-Vorschläge', '', '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.',
    'Empfehlung: Eine Lesart festlegen, weil Tests sonst streiten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
  ].join('\n'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /- 🟡 \*\*Eindeutige Formulierung\*\* · aus: Klarheit\n  Der Satz hat zwei Lesarten\.\n  Vorschlag \(empfohlen\): Eine Lesart festlegen, weil Tests sonst streiten\./);
});

test('report_ReworkFailedWithInvalidEntries_UnvollstaendigWithNoteAndNoChangeSection', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [null, { status: 'changed' }, { location: ' AC-04 ', status: 'changed', evidence: ' src/export.js ' }], questions: [] });
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nacharbeit'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Überarbeitung ausgefallen/);
  assert.doesNotMatch(output, /### Was sich/);
  assert.match(output, /- Die Überarbeitung ist ausgefallen\. Das Dokument wurde nicht überarbeitet\./);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*AC-04\*\*/);
});

test('report_ReworkResultNoJson_ReportsWithoutChangeSection', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), '{kaputt');
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nacharbeit'));

  // Act
  const result = runReport(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);
  assert.doesNotMatch(result.stdout, /### Was sich/);
});

test('report_AllDone_CleanAfterVerificationWithoutOpenSections', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ✅ Bereit zum Planen\nAblauf: Prüfung aus einem Blickwinkel, eine Überarbeitung, eine Nachprüfung\./);
  assert.doesNotMatch(output, /### Noch offen/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
});

test('report_ChangedAndConfirmed_ShowsChangeVerdictAndEvidence', () => {
  // Arrange
  const env = setup();
  const results = [
    { location: 'AC-04', status: 'changed', change: CHANGE, evidence: 'src/export.js' },
    { location: 'AC-07', status: 'changed', change: CHANGE, evidence: 'docs/glossary/terms.md · Export' },
    { location: 'AC-01', status: 'changed', change: CHANGE },
  ];
  const verdicts = ['AC-01', 'AC-04', 'AC-07'].map((location) => VERDICT(location, 'erledigt'));
  runWithVerification(env, [RED('AC-01'), RED('AC-04'), RED('AC-07')], results, { verdicts, findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Was sich in der Spec geändert hat\n- ✅ \*\*AC-04\*\* · gefunden aus: Widerspruchsfreiheit\n  Folge \(ohne Scout-Beschreibung\)\n  Änderung: Wortlaut geschärft\.\n  Beleg: src\/export\.js\n  Nachprüfung: bestätigt\./);
  assert.equal(output.match(/Beleg:/g).length, 2);
  assert.doesNotMatch(output, /### Noch offen/);
});

test('report_TwoNotDone_NichtBereitWithTwoHindrances', () => {
  // Arrange
  const env = setup();
  const results = [{ location: 'AC-04', status: 'changed', change: CHANGE }, { location: 'AC-07', status: 'changed', change: CHANGE }];
  runWithVerification(env, [RED('AC-04'), RED('AC-07')], results, { verdicts: [VERDICT('AC-04', 'nicht erledigt'), VERDICT('AC-07', 'nicht erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 2 × 🔴 offen\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(output, /- ⚠️ \*\*AC-04\*\*[\s\S]*Nachprüfung: nicht erledigt\./);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*AC-04\*\*[^\n]*\n[^\n]*\n- 🔴 \*\*AC-07\*\*/);
  assert.match(output, /1\. Die 2 Hindernisse einarbeiten lassen/);
});

test('report_NotDoneVerifierFindingAndScriptFinding_ThreeHindrancesWithPlainAngles', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'runde-2', 'skript-pruefung.json'), { findings: [{ location: 'AC-01', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  const verification = { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [finding({ location: 'Deckel', quote: 'Höchstens drei Runden.', category: 'widerspruch' })] };
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'Höchstens zwei Runden.', 'Höchstens drei Runden.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: CHANGE }], questions: [] });
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 3 × 🔴 offen\n/);
  assert.match(output, /- 🔴 \*\*Deckel\*\* · aus: Nachprüfung/);
  assert.match(output, /- 🔴 \*\*AC-01\*\* · aus: Skript-Prüfung/);
});

test('report_QuestionOpenAndPointNotDone_FragenOffenListsQuestionAndHindrance', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed', change: CHANGE }], { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [] });
  addEntries(env, '- **R1 · AC-07** — frage an den menschen — Gilt I?');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
  assert.match(output, /### Offene Fragen\n- \*\*AC-07\*\*: Gilt I\?/);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*AC-04\*\*/);
});

test('report_TwoOpenQuestions_ListsBothFallbackLines', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — F?\n- **R1 · AC-07** — frage an den menschen — I?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /\*\*Ergebnis:\*\* ❓ 2 Fragen offen/);
  assert.match(output, /### Offene Fragen\n- \*\*AC-04\*\*: F\?\n- \*\*AC-07\*\*: I\?/);
});

test('report_GreenFinding_NotShownAndNotInClosing', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01', category: 'formulierung', consequence: 'Satz holpert' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.doesNotMatch(output, /Satz holpert|Anmerkungen/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
  assert.equal(fs.existsSync(checkedFile(env, 'abschluss', 'scout.md')), false);
});

test('report_ScoutFailed_NotedWithoutChangingStatus', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'scout'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n/);
  assert.match(output, /### Hinweise zum Ablauf\n- Der Scout ist ausgefallen\. Es gibt keine Lösungsvorschläge; Beschreibungen stammen aus den Prüfergebnissen\./);
});

test('report_AttemptsAndPreparedHints_ListedInPlainLanguage', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  writeJsonFile(path.join(env.workspace, 'hinweise.json'), ['Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.']);
  nextAttempt(env.workspace, 'clarity');
  ['NACHFORDERN', 'NEUSTART'].forEach(() => nextAttempt(env.workspace, 'nachprüfer'));
  nextAttempt(env.workspace, 'nacharbeit', 'buendelung');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /- Der Prüfer für Fachbegriffe wurde nicht gestartet/);
  assert.match(output, /- Der Prüfer für Klarheit hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt\./);
  assert.match(output, /- Die Nachprüfung musste neu gestartet werden, weil die Antwort nicht gültig war\./);
  assert.match(output, /- Die Bündelung der Fragen musste korrigiert werden\./);
});

test('report_PlanSpecQuestion_FragenOffenWithReasonLine', () => {
  // Arrange
  const env = setup('# Plan\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  writeReviewer(env, 'coverage', [finding({ location: 'Task 1', quote: 'Text.', category: 'ac-fehlt-im-plan' })]);
  flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'coverage');
  flow('rework-input', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'Task 1', status: 'spec-question', reason: 'Spec lässt X offen' }] });
  flow('rework-check', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);
  flow('verify', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env, 'plan-review');

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /### Offene Fragen\n- Spec lässt X offen/);
  assert.match(output, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
});

function answeredRun(env) {
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }], questions: [QUESTION_BUNDLE] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  addEntries(env, '- **W · AC-04** · Aussage \u2014 Antwort auf \u201ER1 · AC-04\u201C: F gilt immer.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-04', status: 'answered', decision: 'F gilt immer.', change: 'Die Spec legt jetzt fest, dass F immer gilt.' }] });
  flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
}

test('report_AnsweredQuestion_ShowsDecisionAndChangeAndKeepsGroupOutOfOpen', () => {
  // Arrange
  const env = setup();
  answeredRun(env);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n/);
  assert.match(output, /### Was sich in der Spec geändert hat\n- ✅ \*\*Leere Eingabe\*\* · gefunden aus: Klarheit\n  Die Spec legt jetzt fest, dass F immer gilt\.\n  Nachprüfung: bestätigt\./);
  assert.match(output, /### Deine Entscheidungen\n- \*\*Leere Eingabe:\*\* F gilt immer\./);
  assert.doesNotMatch(output, /### Noch offen/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
});

test('report_QuestionLaterAnswered_ListsBundleTitleUnderOpenQuestions', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }], questions: [QUESTION_BUNDLE] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /### Offene Fragen\n- \*\*Leere Eingabe\*\* \(betrifft: Eingabe prüfen\)/);
});

const BLOCK_AC04 = '### 🔴 AC-04 (consistency)\n- [consistency · widerspruch] Zitat: \u201Ex\u201C · Konsequenz: Folge A · Begründung: b';
const BLOCK_AC07 = '### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: \u201Ex\u201C · Konsequenz: Folge B · Begründung: b';
const SAVED_AGGREGATE = `=== REWORK ===\n${BLOCK_AC04}\n\n${BLOCK_AC07}\n`;
const SAVED_SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Grenzwert festlegen', 'Beschreibung: Der Grenzwert ist nicht bestimmt.', 'Empfehlung: Den Wert festlegen, weil Tests ihn brauchen.', '1. D festlegen.', '**Bevorzugt: 1** — klar.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', 'Empfehlung: Eine Lesart festlegen, weil Tests sonst streiten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
].join('\n');

function followupRun(env, { chosen, open, results, verdicts }) {
  flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'aggregate.md'), SAVED_AGGREGATE);
  writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'scout.md'), SAVED_SCOUT);
  writeJsonFile(path.join(env.workspace, 'followup.json'), { gewaehlt: chosen, offen: open });
  const blocks = chosen.map((entry) => (entry.stelle === 'AC-04' ? BLOCK_AC04 : BLOCK_AC07));
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), `=== REWORK ===\n${blocks.join('\n\n')}\n`);
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results });
  const source = ['--quelle', 'nacharbeit'];
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts, findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', 'docs/x/spec.md', ...source).stdout;
}

test('report_FollowupDoneAndOneUnchosen_ShowsChangeChoiceAndKeepsUnchosenOpen', () => {
  // Arrange
  const env = setup();
  const chosen = [{ nummer: 1, stufe: '🔴', stelle: 'AC-04', vorschlag: 1 }];
  const open = [{ nummer: 2, stufe: '🟡', stelle: 'AC-07' }];

  // Act
  const output = followupRun(env, {
    chosen, open, results: [{ location: 'AC-04', status: 'changed', change: 'Der Grenzwert steht jetzt in der Spec.', evidence: 'src/export.js' }], verdicts: [VERDICT('AC-04', 'erledigt')],
  });

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n=== BERICHT ===\n## Review-Followup \(spec-review\) · Ergebnis · Demo-Spec\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen · 1 kleiner Hinweis offen\nAblauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
  assert.match(output, /- ✅ \*\*Grenzwert festlegen\*\* · gefunden aus: Widerspruchsfreiheit\n  Der Grenzwert ist nicht bestimmt\.\n  Änderung: Der Grenzwert steht jetzt in der Spec\.\n  Beleg: src\/export\.js\n  Gewählt: Vorschlag 1\n  Nachprüfung: bestätigt\./);
  assert.match(output, /### Noch offen · kein Hindernis für den Plan\n- 🟡 \*\*Eindeutige Formulierung\*\*[^\n]*\n[^\n]*\n  Vorschlag \(empfohlen\): Eine Lesart festlegen/);
  assert.doesNotMatch(output, /Deine Entscheidungen/);
  const scout = fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8');
  assert.match(scout, /### 🟡 AC-07/);
  assert.doesNotMatch(scout, /AC-04/);
});

test('report_FollowupChosenNotDone_ShowsWarningAndKeepsGroupAsHindranceWithItsSeverityHeading', () => {
  // Arrange
  const env = setup();
  const chosen = [{ nummer: 2, stufe: '🟡', stelle: 'AC-07', vorschlag: 1 }];

  // Act
  const output = followupRun(env, {
    chosen, open: [{ nummer: 1, stufe: '🔴', stelle: 'AC-04' }], results: [{ location: 'AC-07', status: 'changed', change: 'Der Satz hat jetzt eine Lesart.' }], verdicts: [VERDICT('AC-07', 'nicht erledigt')],
  });

  // Assert
  assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n/);
  assert.match(output, /- ⚠️ \*\*Eindeutige Formulierung\*\*[\s\S]*Nachprüfung: nicht erledigt\./);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*Grenzwert festlegen\*\*[\s\S]*- 🔴 \*\*Eindeutige Formulierung\*\*/);
  assert.match(fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8'), /### 🔴 AC-04[\s\S]*### 🟡 AC-07/);
});
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/review-flow-report.test.js`
Expected: FAIL (alte Renderer, kein `bericht`-Aufbau)

- [ ] **Step 4: Implementieren**

`plugins/forge/scripts/lib/halt-text.js`: die letzte Zeile ändern in `module.exports = { renderHalt, topicOf, shorten };`.

`plugins/forge/scripts/lib/closing.js` (neu):

```js
'use strict';

// Sicherung am Ende eines Reviews: nur offene Gruppen gelangen in abschluss/ und damit zu followup.js save.

const fs = require('node:fs');
const path = require('node:path');
const { REWORK_MARK } = require('./groups');
const { loadGroups } = require('../followup');
const { scoutBlocks } = require('./scout-check');
const { openFromRounds, openFromFollowup, answeredKeys } = require('./open-groups');
const { ROUND_ONE, ROUND_TWO, CLOSING, readJson, readLines, readAgentJson, writeText } = require('./flow-files');

const SCOUT_HEADING = '## Scout-Vorschläge';
const BEFORE = 'sicherung-vorher';

function isFollowup(options) {
  return fs.existsSync(path.join(options.workspace, 'followup.json'));
}

function answersOf(options) {
  const { value } = readAgentJson(path.join(options.workspace, ROUND_ONE, 'antworten.json'));
  return Array.isArray(value?.results) ? value.results : [];
}

function openGroupsOf(options, data) {
  if (!isFollowup(options)) return openFromRounds({ one: data.one, two: data.two, answered: answeredKeys(answersOf(options)) });
  const followup = readJson(path.join(options.workspace, 'followup.json'));
  const chosen = new Set(followup.gewaehlt.map((entry) => entry.nummer));
  return openFromFollowup({ saved: loadGroups(path.join(options.workspace, BEFORE)), chosen, two: data.two });
}

// Spätere Scout-Dateien überschreiben frühere Blöcke derselben Gruppe.
function scoutBlocksOf(options) {
  const blocks = new Map();
  for (const dir of [BEFORE, ROUND_ONE, ROUND_TWO]) {
    for (const [key, block] of scoutBlocks(readLines(path.join(options.workspace, dir, 'scout.md')))) blocks.set(key, block);
  }
  return blocks;
}

function writeClosing(options, open) {
  const dir = path.join(options.workspace, CLOSING);
  fs.rmSync(dir, { recursive: true, force: true });
  const blocks = scoutBlocksOf(options);
  const scouted = open.map((group) => blocks.get(group.scoutKey)).filter(Boolean);
  writeText(path.join(dir, 'aggregate.md'), [REWORK_MARK, ...open.map((group) => group.block)].join('\n\n'));
  if (scouted.length > 0) {
    writeText(path.join(dir, 'scout.md'), [SCOUT_HEADING, '', scouted.map((block) => block.join('\n').trimEnd()).join('\n\n')].join('\n'));
  }
}

module.exports = { openGroupsOf, writeClosing };
```

`plugins/forge/scripts/lib/report-data.js` (neu):

```js
'use strict';

// Liest den Arbeitsbereich und baut die Eingabe des Berichts; der Text selbst entsteht in report-text.js.

const path = require('node:path');
const { ICON } = require('./groups');
const { collapse, placeKey } = require('./places');
const { reviewerLabel } = require('./reviewer-names');
const { topicOf, shorten } = require('./halt-text');
const { scoutTexts } = require('./scout-check');
const { readAttempts } = require('./attempts');
const { loadGroups } = require('../followup');
const { verdictMap, fromSaved } = require('./open-groups');
const { ROUND_ONE, ROUND_TWO, readText, readLines, readJson, readAgentJson } = require('./flow-files');

const BEFORE = 'sicherung-vorher';
const SHORT = 400;
const VERIFIER = 'nachprüfer';
const INSTANCE_NAMES = { nacharbeit: 'Die Überarbeitung', [VERIFIER]: 'Die Nachprüfung', scout: 'Der Scout', 'scout-nachpruefung': 'Der Scout' };
const FAILED_LABELS = { nacharbeit: 'Überarbeitung', [VERIFIER]: 'Nachprüfung' };
const SCOUT_IMPACT = 'Es gibt keine Lösungsvorschläge; Beschreibungen stammen aus den Prüfergebnissen.';
const IMPACTS = {
  nacharbeit: 'Das Dokument wurde nicht überarbeitet.', [VERIFIER]: 'Die Korrekturen sind nicht nachgeprüft.', scout: SCOUT_IMPACT, 'scout-nachpruefung': SCOUT_IMPACT,
};
const REVIEWER_IMPACT = 'Dieser Blickwinkel fehlt in der Prüfung.';

function unique(list) {
  return [...new Set(list)];
}

function angles(review, names) {
  return names.map((name) => (name === VERIFIER ? 'Nachprüfung' : reviewerLabel(review, name))).join(', ');
}

function instanceName(review, name) {
  return INSTANCE_NAMES[name] ?? `Der Prüfer für ${reviewerLabel(review, name)}`;
}

function attemptNote(review, id, used) {
  const [kind, ...rest] = id.split(':');
  const name = rest.join(':');
  if (kind === 'buendelung') return used >= 2 ? 'Die Bündelung der Fragen konnte nicht korrigiert werden.' : 'Die Bündelung der Fragen musste korrigiert werden.';
  const label = instanceName(review, name);
  if (used === 1) return `${label} hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt.`;
  if (used === 2) return `${label} musste neu gestartet werden, weil die Antwort nicht gültig war.`;
  return `${label} ist ausgefallen. ${IMPACTS[name] ?? REVIEWER_IMPACT}`;
}

function notesOf(options) {
  const prepared = readJson(path.join(options.workspace, 'hinweise.json'), []);
  const attempts = Object.entries(readAttempts(options.workspace)).map(([id, used]) => attemptNote(options.review, id, used));
  return [...prepared, ...attempts];
}

function scoutIndex(options) {
  const index = new Map();
  for (const dir of [BEFORE, ROUND_ONE, ROUND_TWO]) {
    for (const entry of scoutTexts(readLines(path.join(options.workspace, dir, 'scout.md')))) index.set(`${entry.severity} ${entry.location}`, entry);
  }
  return index;
}

// `group` ist eine Einstufung-Gruppe (items) oder eine OpenGroup (consequence, scoutKey).
function described(group, index) {
  const found = index.get(group.scoutKey ?? `${ICON[group.color]} ${collapse(group.label)}`);
  if (found?.title && found.description) return { title: found.title, description: found.description, recommendation: found.recommendation ?? null };
  const consequence = group.consequence ?? group.items?.[0]?.finding?.consequence ?? '';
  return { title: group.label, description: `${shorten(consequence, SHORT)} (ohne Scout-Beschreibung)`, recommendation: null };
}

// null: kein Urteil vorhanden.
function verdictOk(verdicts, keys) {
  const found = keys.map((key) => verdicts.get(key)).filter(Boolean);
  return found.length === 0 ? null : found.every((verdict) => verdict === 'erledigt');
}

function reworkChanges(options, data, ctx) {
  if (data.failed.includes('nacharbeit')) return [];
  return ctx.rework.results.filter((entry) => entry?.status === 'changed' && typeof entry.location === 'string').flatMap((entry) => {
    const key = placeKey(entry.location);
    const group = (data.one?.groups ?? []).find((candidate) => candidate.key === key);
    if (!group) return [];
    const texts = described(group, ctx.index);
    return [{
      ok: verdictOk(ctx.verdicts, [key]), title: texts.title, angles: angles(options.review, group.reviewers), description: texts.description,
      change: entry.change ?? '', evidence: entry.evidence ?? null, choice: null,
    }];
  });
}

function answeredBundles(ctx) {
  return ctx.bundles.filter((bundle) => Array.isArray(bundle?.places)).map((bundle) => {
    const keys = bundle.places.map(placeKey).filter((key) => ctx.answers.has(key));
    return { bundle, keys, entries: keys.map((key) => ctx.answers.get(key)) };
  }).filter((item) => item.keys.length > 0);
}

function answeredChanges(options, ctx) {
  return answeredBundles(ctx).map(({ bundle, keys, entries }) => ({
    ok: verdictOk(ctx.verdicts, keys), title: bundle.title, angles: angles(options.review, bundle.reviewers ?? []),
    description: unique(entries.map((entry) => entry.change)).join(' '), change: null, evidence: null, choice: null,
  }));
}

function decisionsOf(ctx) {
  return answeredBundles(ctx).map(({ bundle, entries }) => ({ title: bundle.title, decision: unique(entries.map((entry) => entry.decision)).join('; ') }));
}

function followupChanges(options, ctx) {
  return ctx.followup.gewaehlt.flatMap((chosen) => {
    const key = placeKey(chosen.stelle);
    const saved = ctx.saved.find((group) => group.number === chosen.nummer);
    const result = ctx.rework.results.find((entry) => typeof entry?.location === 'string' && placeKey(entry.location) === key);
    if (!saved || result?.status !== 'changed') return [];
    const texts = described(fromSaved(saved), ctx.index);
    return [{
      ok: verdictOk(ctx.verdicts, [key]), title: texts.title, angles: angles(options.review, saved.reviewers), description: texts.description,
      change: result.change ?? '', evidence: result.evidence ?? null, choice: chosen.vorschlag,
    }];
  });
}

function questionLines(options, data, ctx) {
  if (options.review === 'plan-review') return data.questions.map((question) => shorten(question.question, SHORT));
  const lines = data.questions.map((question) => {
    const bundle = ctx.bundles.find((candidate) => Array.isArray(candidate?.places) && candidate.places.some((place) => placeKey(place) === question.key));
    return bundle ? `**${bundle.title}** (betrifft: ${bundle.affects})` : `**${question.place}**: ${shorten(question.question, SHORT)}`;
  });
  return unique(lines);
}

function reviewerCount(one) {
  const named = one?.reviewers ?? unique((one?.groups ?? []).flatMap((group) => group.reviewers));
  return Math.max(1, named.length);
}

function failedLabel(options, name) {
  return FAILED_LABELS[name] ?? reviewerLabel(options.review, name);
}

function context(options, data) {
  const followup = readJson(path.join(options.workspace, 'followup.json'), null);
  const { value } = readAgentJson(path.join(options.workspace, options.source, 'rework.json'));
  const rework = { results: Array.isArray(value?.results) ? value.results : [], questions: Array.isArray(value?.questions) ? value.questions : [] };
  const answered = readAgentJson(path.join(options.workspace, ROUND_ONE, 'antworten.json')).value?.results;
  const answers = new Map((Array.isArray(answered) ? answered : [])
    .filter((entry) => entry?.status === 'answered' && typeof entry.location === 'string').map((entry) => [placeKey(entry.location), entry]));
  return {
    index: scoutIndex(options), verdicts: verdictMap(data.two), rework, bundles: rework.questions, answers, followup,
    saved: followup ? loadGroups(path.join(options.workspace, BEFORE)) : [],
  };
}

function buildInput(options, data, status, open) {
  const ctx = context(options, data);
  return {
    review: options.review, followup: ctx.followup !== null, title: options.title, artifact: options.artifact, spec: options.spec,
    topic: topicOf(readText(options.doc)), status, openRed: data.openRed, reviewerCount: reviewerCount(data.one),
    reworked: data.reworked, verified: data.checked, chosenCount: ctx.followup?.gewaehlt.length ?? 0,
    failedLabels: data.failed.map((name) => failedLabel(options, name)),
    changes: ctx.followup ? followupChanges(options, ctx) : [...reworkChanges(options, data, ctx), ...answeredChanges(options, ctx)],
    decisions: ctx.followup ? [] : decisionsOf(ctx), questions: questionLines(options, data, ctx),
    open: open.map((group) => ({ color: group.color, ...described(group, ctx.index), angles: angles(options.review, group.reviewers) })),
    notes: notesOf(options),
  };
}

module.exports = { buildInput };
```

`plugins/forge/scripts/lib/flow-report.js` ersetzen durch:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openQuestions } = require('./questions');
const { failedInstances } = require('./attempts');
const { openGroupsOf, writeClosing } = require('./closing');
const { buildInput } = require('./report-data');
const { renderReportText } = require('./report-text');
const { ROUND_ONE, ROUND_TWO, CLOSING, FlowError, readText, readJson, writeText } = require('./flow-files');

// Rangfolge: unvollständig → Fragen offen → nicht bereit → sauber.
function flowStatus({ failed, openQuestions: questions, openRed, reworked }) {
  if (failed.length > 0) return `unvollständig, ausgefallen: ${failed.join(', ')}`;
  if (questions > 0) return 'Fragen offen';
  if (openRed > 0) return `nicht bereit, ${openRed} × 🔴 offen`;
  return reworked ? 'sauber nach Nachprüfung' : 'sauber nach Runde 1';
}

function questionsAtEnd(options) {
  if (options.review === 'plan-review') return readJson(path.join(options.workspace, options.source, 'fragen.json'), []);
  return openQuestions(readText(options.doc));
}

function redGroupCount(one) {
  return (one?.groups ?? []).filter((group) => group.color === 'red').length;
}

// Offene 🔴: aus der Nachprüfung; ohne Nacharbeit die 🔴-Gruppen aus Runde 1. Eine Nacharbeit ohne Nachprüfung
// und ohne Ausfall ist ein fehlender Schritt und darf den Status nicht ins Positive kippen.
function openRedOf(one, two, reworked, failed) {
  if (two) return two.openRed;
  if (reworked && failed.length === 0) throw new FlowError('Nachprüfung fehlt: runde-2/einstufung.json');
  return redGroupCount(one);
}

function collect(options) {
  const failed = failedInstances(options.workspace).filter((name) => !name.startsWith('scout'));
  const one = readJson(path.join(options.workspace, ROUND_ONE, 'einstufung.json'), null);
  const two = readJson(path.join(options.workspace, ROUND_TWO, 'einstufung.json'), null);
  const reworked = fs.existsSync(path.join(options.workspace, options.source, 'rework.json'));
  return {
    one, two, reworked, failed,
    openRed: openRedOf(one, two, reworked, failed),
    checked: fs.existsSync(path.join(options.workspace, ROUND_TWO, 'pruefliste.json')),
    questions: questionsAtEnd(options),
  };
}

function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  const open = openGroupsOf(options, data);
  const text = renderReportText(buildInput(options, data, status, open));
  writeClosing(options, open);
  writeText(path.join(options.workspace, CLOSING, 'bericht.md'), text);
  return [`ENDE ${status}`, '=== BERICHT ===', text].join('\n');
}

module.exports = { flowStatus, report };
```

Hinweis: `collect` nutzte bisher `failedInstances` samt `scoutFailed`; der Scout-Ausfall steht jetzt in den Hinweisen (`attemptNote`). Die Variable `ROUND_ONE`/`ROUND_TWO`-Importe stimmen mit `flow-files.js` überein.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/review-flow-report.test.js tests/followup.test.js tests/review-flow-round-two.test.js`
Expected: PASS. Fehlschläge zuerst gegen die Erwartung im Test prüfen (Zeichenfolge, Reihenfolge der Gruppen, Fallback-Text) und den Renderer oder die Erwartung an die Spec angleichen.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/scripts/lib plugins/forge/tests/review-flow-report.test.js
git commit -m "feat(forge): build the plain closing report from the workspace and save only open groups"
```

---

### Task 7: Folgebefehl `alle`, `sicherung-vorher/` und `followup.json`

**Files:**
- Modify: `plugins/forge/scripts/prepare.js` (`SELECTION`, `selectionPairs`, Usage-Zeile, Meldung, `prepareReviewFollowup`)
- Modify: `plugins/forge/tests/prepare.test.js`

**Interfaces:**
- Consumes: `loadGroups` (liefert Gruppen mit `number`, `severity`, `location`), `saved.dir` im Preparer.
- Produces:
  - `prepare.js review-followup <artefakt> alle` und `… b` wählen alle gesicherten Gruppen mit bevorzugtem Vorschlag.
  - `<W>/sicherung-vorher/aggregate.md` und `scout.md` (Kopien der Sicherung), `<W>/followup.json` mit `{ gewaehlt: [{ nummer, stufe, stelle, vorschlag }], offen: [{ nummer, stufe, stelle }] }`.

- [ ] **Step 1: Failing tests schreiben** (an `prepare.test.js` anhängen)

```js
test('reviewFollowup_Alle_ChoosesAllGroupsWithPreferredProposal', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const out = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'alle'));
  assert.equal(out.gruppen, '1,2');
  assert.equal(out.offen, '');
  assert.deepEqual([].concat(out.WAHL), ['1 · 🔴 Task 2 · Vorschlag 2', '2 · 🟡 AC-03 · Vorschlag 1']);
});

test('reviewFollowup_B_BehavesLikeAlle', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const alle = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'alle'));
  const preferred = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'b'));
  assert.deepEqual(preferred.WAHL, alle.WAHL);
  assert.equal(preferred.gruppen, alle.gruppen);
});

test('reviewFollowup_AlleWithGroupLackingPreferred_ExitsOneNamingGroup', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z', FOLLOWUP_AGGREGATE, FOLLOWUP_SCOUT.replace('**Bevorzugt: 1** — einziger Weg\n', ''));
  const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'alle');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Gruppe 2 hat keinen bevorzugten Vorschlag/);
});

test('reviewFollowup_ExpertSelection_StaysValid', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  assert.equal(run(repo, 'review-followup', 'docs/forge/demo/plan.md', '1:2,2:1').status, 0);
});

test('reviewFollowup_AllChosen_WritesPriorSaveAndFollowupJson', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const out = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'alle'));
  assert.equal(fs.readFileSync(path.join(out.W, 'sicherung-vorher', 'aggregate.md'), 'utf8'), FOLLOWUP_AGGREGATE);
  assert.equal(fs.readFileSync(path.join(out.W, 'sicherung-vorher', 'scout.md'), 'utf8'), FOLLOWUP_SCOUT);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out.W, 'followup.json'), 'utf8')), {
    gewaehlt: [{ nummer: 1, stufe: '🔴', stelle: 'Task 2', vorschlag: 2 }, { nummer: 2, stufe: '🟡', stelle: 'AC-03', vorschlag: 1 }],
    offen: [],
  });
});

test('reviewFollowup_OneChosen_ListsTheOtherAsOpenInFollowupJson', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const out = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', '2:1'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out.W, 'followup.json'), 'utf8')), {
    gewaehlt: [{ nummer: 2, stufe: '🟡', stelle: 'AC-03', vorschlag: 1 }],
    offen: [{ nummer: 1, stufe: '🔴', stelle: 'Task 2' }],
  });
});

test('reviewFollowup_BadSelectionText_MentionsAlleInMessage', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'x');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /erlaubt: alle, b, <n>/);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/prepare.test.js`
Expected: FAIL (`alle` ungültig, Dateien fehlen)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/prepare.js`:

a) Die Usage-Zeile `(auswahl: b | <n> | <g>:<n|b>,...)` ersetzen durch `(auswahl: alle | b | <n> | <g>:<n|b>,...)`.

b) `const SELECTION = /^(?:b|\d+|\d+:(?:\d+|b)(?:,\d+:(?:\d+|b))*)$/;` ersetzen durch `const SELECTION = /^(?:alle|b|\d+|\d+:(?:\d+|b)(?:,\d+:(?:\d+|b))*)$/;`.

c) In `selectionPairs` die erste Zeile ersetzen durch:

```js
  if (!text.includes(':')) return groups.map((group) => [String(group.number), text === 'alle' ? 'b' : text]);
```

d) In `parseSelection` die Meldung auf `(erlaubt: alle, b, <n>, <g>:<n|b>,...)` ändern.

e) In `prepareReviewFollowup` direkt nach `fs.writeFileSync(path.join(values.W, 'nacharbeit', 'aggregate.md'), reworkText(chosen));` einfügen:

```js
  writeFollowupContext(values.W, saved.dir, groups, chosen);
```

und vor `const PREPARERS = {` die Funktion:

```js
// Stand der Sicherung und Auswahl für den Bericht des Followups: Kopie der Sicherung, gewählte und offene Gruppen.
function writeFollowupContext(workspace, savedDir, groups, chosen) {
  const before = path.join(workspace, 'sicherung-vorher');
  fs.mkdirSync(before, { recursive: true });
  for (const name of ['aggregate.md', 'scout.md']) fs.copyFileSync(path.join(savedDir, name), path.join(before, name));
  const numbers = chosen.map(({ group }) => group.number);
  const context = {
    gewaehlt: chosen.map(({ group, choice }) => ({ nummer: group.number, stufe: group.severity, stelle: group.location, vorschlag: choice })),
    offen: groups.filter((group) => !numbers.includes(group.number)).map((group) => ({ nummer: group.number, stufe: group.severity, stelle: group.location })),
  };
  fs.writeFileSync(path.join(workspace, 'followup.json'), `${JSON.stringify(context, null, 2)}\n`);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/prepare.test.js tests/followup.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/prepare.js plugins/forge/tests/prepare.test.js
git commit -m "feat(forge): add the alle selection and record the prior save for the followup report"
```

---

### Task 8: Ablauftexte und Skills

**Files:**
- Modify: `plugins/forge/shared/review-flow/flow.md`
- Modify: `plugins/forge/skills/spec-review/SKILL.md`, `skills/plan-review/SKILL.md`
- Modify: `plugins/forge/skills/review-followup/SKILL.md`, `skills/review-followup/references/flow.md`
- Create: `plugins/forge/tests/closing-report-docs.test.js`
- Modify: bestehende Doc-Tests, die die alten Texte prüfen

**Interfaces:** keine Code-Schnittstellen.

- [ ] **Step 1: Failing tests schreiben**

`plugins/forge/tests/closing-report-docs.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN = path.join(__dirname, '..');
const FLOW = path.join(PLUGIN, 'shared', 'review-flow', 'flow.md');
const SPEC_SKILL = path.join(PLUGIN, 'skills', 'spec-review', 'SKILL.md');
const PLAN_SKILL = path.join(PLUGIN, 'skills', 'plan-review', 'SKILL.md');
const FOLLOWUP_SKILL = path.join(PLUGIN, 'skills', 'review-followup', 'SKILL.md');
const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');

function section(text, title) {
  const start = text.indexOf(`## ${title}\n`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test('flow_End_PrintsReportTextOnlyAndDropsOrchestratorAppendices', () => {
  const end = section(readText(FLOW), 'Ende');
  const report = end.split('\n').find((line) => line.startsWith('3. Bericht im Chat:'));
  assert.ok(report, 'Schritt 3 fehlt');
  assert.ok(report.includes('der Text nach `=== BERICHT ===` unverändert'));
  for (const gone of ['Hinweise des Orchestrators', 'Zusatz-Abschnitte', 'Nächster Schritt:', 'Ausgabe von `save`']) assert.equal(report.includes(gone), false, gone);
  assert.ok(report.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.'));
  assert.ok(readText(FLOW).includes('| Bericht | Titel und Artefakt |'));
});

test('specReviewSkill_Report_ComesFromReportWithoutSelectionHintOrNextStepText', () => {
  const text = readText(SPEC_SKILL);
  const report = section(text, 'Bericht');
  assert.ok(report.includes('den Rest liefert `report`'));
  for (const gone of ['Auswahl-Hinweis', 'Nächster Schritt:', 'Auswahl: b =']) assert.equal(text.includes(gone), false, gone);
  assert.equal(text.includes('Hinweise des Orchestrators'), false);
});

test('planReviewSkill_Report_KeepsCommitCheckAndDropsSelectionHint', () => {
  const text = readText(PLAN_SKILL);
  const report = section(text, 'Bericht');
  for (const part of ['den Rest liefert `report`', 'git status --porcelain -- "<S>" "<P>"', 'Soll ich Spec und Plan jetzt committen?', 'forge-config.js" get Commit-Konvention']) {
    assert.ok(report.includes(part), `${part} fehlt`);
  }
  for (const gone of ['Auswahl-Hinweis', 'Auswahl: b =', 'Hinweise des Orchestrators']) assert.equal(text.includes(gone), false, gone);
});

test('reviewFollowupSkill_HintAcceptsAlleAndShowsReportFromScript', () => {
  const { fields, body } = readMarkdown(FOLLOWUP_SKILL);
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <alle|auswahl>');
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_SpecAndPlan_ReportFromScriptAndSaveAlways', () => {
  const text = readText(FOLLOWUP_FLOW);
  const verification = text.slice(text.indexOf('## Nachprüfung'), text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')));
  assert.ok(verification.includes('6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.'));
  assert.equal(verification.includes('entfällt `save`'), false);
  const report = section(text, 'Bericht');
  assert.ok(report.includes('- Spec und Plan: der Text nach `=== BERICHT ===` unverändert.'));
  const specPlanLine = report.split('\n').find((line) => line.startsWith('- Spec und Plan:'));
  assert.equal(specPlanLine.includes('Umgesetzt'), false);
  assert.ok(section(text, 'Nächster Schritt').includes('Bei Spec und Plan steht der nächste Schritt im Bericht'));
});
```


- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/closing-report-docs.test.js`
Expected: FAIL (alte Texte)

- [ ] **Step 3: Texte ändern**

Per Node-Skript (wegen typografischer Anführungszeichen und exakter Ersetzungen), im Repo-Root:

```bash
node - <<'JS'
const fs = require('fs');
function edit(file, steps) {
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const [from, to] of steps) {
    if (typeof from === 'string') {
      if (!text.includes(from)) throw new Error(`${file}: Teilzeichenfolge fehlt: ${from.slice(0, 60)}`);
      text = text.replace(from, to);
    } else {
      if (!from.test(text)) throw new Error(`${file}: Muster fehlt: ${from}`);
      text = text.replace(from, to);
    }
  }
  fs.writeFileSync(file, text);
}
const root = 'plugins/forge';

edit(`${root}/shared/review-flow/flow.md`, [
  ['| Bericht | Titel, Artefakt, Zusatz-Abschnitte, nächster Schritt je Status |', '| Bericht | Titel und Artefakt |'],
  [/^3\. Bericht im Chat:.*$/m, '3. Bericht im Chat: der Text nach `=== BERICHT ===` unverändert. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.'],
]);

edit(`${root}/skills/spec-review/SKILL.md`, [
  ['2. Jede `WARN`-Zeile kommt in die Hinweise des Orchestrators. Du liest weder Profile noch Index.', '2. Die `WARN`-Zeilen musst du nicht weitergeben; der Bericht enthält die Hinweise. Du liest weder Profile noch Index.'],
  [/\n## Bericht\n[\s\S]*$/, '\n## Bericht\nTitel `Spec-Review`, Artefakt `<S>`; den Rest liefert `report` (Ergebnis, Entscheidungen, Offenes, Hinweise, nächste Schritte).\n'],
]);

edit(`${root}/skills/plan-review/SKILL.md`, [
  ['und je Warnung eine Zeile `WARN`; jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.', 'und je Warnung eine Zeile `WARN` (der Bericht enthält die Hinweise).'],
  [/\n## Bericht\n[\s\S]*$/, '\n## Bericht\nTitel `Plan-Review`, Artefakt `<P>`; den Rest liefert `report`. Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen.\n\nCommit-Prüfung nach dem Freigeben des Guards, bei `sauber nach Runde 1` und `sauber nach Nachprüfung`: `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: beide sind committet, keine Frage. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Bei Nein oder ohne Antwort: kein Commit. Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben.\n'],
]);

edit(`${root}/skills/review-followup/SKILL.md`, [
  ['argument-hint: <spec.md|plan.md> <auswahl>', 'argument-hint: <spec.md|plan.md> <alle|auswahl>'],
]);

edit(`${root}/skills/review-followup/references/flow.md`, [
  [/^6\. Sicherung: .*$/m, '6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.'],
  [/^- Spec und Plan: .*$/m, '- Spec und Plan: der Text nach `=== BERICHT ===` unverändert.'],
  ['## Nächster Schritt\n', '## Nächster Schritt\nBei Spec und Plan steht der nächste Schritt im Bericht; die folgenden Zeilen gelten für die Implementierung.\n'],
]);
JS
```

Wichtig: Das Skript ersetzt `^3\. Bericht im Chat:.*$` nur im ersten Treffer; stellt sicher, dass es im Abschnitt „Ende" liegt (dort steht der einzige Schritt mit diesem Anfang). Das Muster `\n## Bericht\n[\s\S]*$` in den beiden Skills ersetzt den Abschnitt „Bericht" bis zum Dateiende; steht dahinter ein weiterer Abschnitt, vorher prüfen (`grep -n "^## " plugins/forge/skills/spec-review/SKILL.md plugins/forge/skills/plan-review/SKILL.md`) und das Muster auf den Abschnitt begrenzen.

Wenn der Schritt-6-Text in `references/flow.md` hinter dem Anhalten-Text aus TP-A noch die Zeile „Meldet `attempt` für `nacharbeit` … ohne `save` und ohne `drop`" enthält, bleibt sie unverändert (sie betrifft den Ausfall).

- [ ] **Step 4: Bestehende Doc-Tests anpassen und laufen lassen**

Run: `cd plugins/forge && node --test tests/closing-report-docs.test.js tests/review-flow-doc.test.js tests/skill.test.js tests/plan-review-skill.test.js tests/review-followup-skill.test.js`
Expected: Die neuen Tests laufen grün. Bestehende Assertions auf die entfernten Texte (`Hinweise des Orchestrators`, `Auswahl-Hinweis`, `Nächster Schritt: <Text des Skills …>`, `jede `WARN`-Zeile kommt in die Hinweise des Orchestrators`, alter `argument-hint`) schlagen fehl. Jede davon ersetzen durch die entsprechende Assertion auf den neuen Text (siehe Step 3); nie die Prüfung streichen, ohne eine gleichwertige Aussage über den neuen Text zu machen. Der Test `flow_End_ReportEndsWithNextStepOfSkillForStatus` in `review-flow-doc.test.js` wird durch den ersten Test von `closing-report-docs.test.js` ersetzt und kann gelöscht werden. In `review-followup-skill.test.js` den Hint-Test auf `'<spec.md|plan.md> <alle|auswahl>'` ändern.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/shared plugins/forge/skills plugins/forge/tests
git commit -m "docs(forge): let the report script own results and next steps in the review flows"
```

---

### Task 9: Gesamtlauf und Handprobe

**Files:** keine Änderung außer Nachbesserungen.

- [ ] **Step 1: Gesamte Suite**

Run: `cd plugins/forge && node --test`
Expected: alle Tests PASS. Fehlschläge in Tests, die alte Berichts- oder Fragenformate prüften, anpassen, nie Prüfungen abschwächen.

- [ ] **Step 2: README prüfen**

Run: `grep -rn "Auswahl\|review-followup\|<auswahl>" plugins/forge/README.md plugins/README.md README.md`
Expected: Nennt eine Stelle die Auswahl-Syntax `b`/`1:2,3:1` als einzige Form, `alle` ergänzen (eine Zeile, deutsch).

- [ ] **Step 3: Handprobe des Berichts**

Run (Git Bash, im Repo-Root):

```bash
cd plugins/forge && node -e "
const { renderReportText } = require('./scripts/lib/report-text');
console.log(renderReportText({
  review: 'spec-review', followup: false, title: 'Spec-Review', topic: 'Probe', artifact: 'docs/x/spec.md', spec: null,
  status: 'nicht bereit, 1 × 🔴 offen', openRed: 1, reviewerCount: 5, reworked: true, verified: true, chosenCount: 0, failedLabels: [],
  changes: [], decisions: [], questions: [],
  open: [{ color: 'red', title: 'Token-Format', angles: 'Widerspruchsfreiheit', description: 'Das Format ist nicht belegt.', recommendation: 'Erst messen, weil sonst alles scheitern kann.' }],
  notes: []
}));"
```

Expected: Kopf `## Spec-Review · Ergebnis · Probe`, `⛔ Noch nicht bereit · 1 Hindernis offen`, Abschnitt `### Noch offen · Hindernis`, `Vorschlag (empfohlen): …`, zwei Schritte mit `review-followup … alle` und `spec-review …`.

- [ ] **Step 4: Ablauf-Probe nach dem Zusammenführen (Mensch)**

Ein `/dv-forge:spec-review` bis zum Ende laufen lassen, dann `/dv-forge:review-followup <spec> alle`. Beobachten: Der Bericht enthält keine `AC-nn` (außer in Fallback-Texten bei Scout-Ausfall), nennt die Änderungen, zeigt offene Punkte mit genau einem empfohlenen Vorschlag, und `alle` setzt nur diese offenen Punkte um.

- [ ] **Step 5: Abschluss**

`git status` prüfen (nur Dateien dieses Plans). Kein Version-Bump; den macht der Mensch beim Zusammenführen aller Teile. Offen bleibt TP-C2 (Implementierungs-Review).
