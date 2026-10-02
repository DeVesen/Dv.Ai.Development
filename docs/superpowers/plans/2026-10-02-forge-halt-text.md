# dv-forge TP-B: Klartext-Fragen beim Anhalten Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hält ein Spec-Review für Fragen an, zeigt der Text zuerst das Ergebnis von Runde 1 in Klartext, dann je Frage Anlass, Blickwinkel, Optionen mit Folge und eine Empfehlung mit Grund; ein Skript prüft die Klartextfelder auf Kürzel und Länge.

**Architecture:** Neue Libs `plain-text.js` (Klartext-Prüfung), `reviewer-names.js` (Blickwinkel) und `halt-text.js` (Renderer). `scout-check` liest zusätzlich `Titel:`/`Beschreibung:` je Gruppe (nur `spec-review`). `questions.js` prüft das neue Fragenformat, `rework-check.js` prüft `change` und rendert über `halt-text.js`. Agent-Prompts (`spec-review-scout`, `spec-rework`) und `flow.md` folgen.

**Tech Stack:** Node.js (CommonJS, `node:test`, `node:assert/strict`), keine Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-10-02-forge-halt-text-design.md`

**Voraussetzung:** TP-A (`docs/superpowers/plans/2026-10-02-forge-stop-hook.md`) ist zusammengeführt. Dieser Plan ändert `flow.md`, Abschnitt „Anhalten", Schritt 1, an der Stelle, die TP-A ebenfalls anfasst; er setzt TP-A also voraus, damit es keinen Konflikt gibt.

**Arbeitsverzeichnis:** Alle Pfade relativ zum Repo-Root `C:\Develop\Dv.Ai.Development`. Tests laufen im Plugin-Ordner: `cd plugins/forge && node --test tests/<datei>`.

## Global Constraints

- Code, Kommentare, Doku, Dateinamen: wie im Plugin üblich (Kommentare und Markdown deutsch; Commit-Messages englisch im Conventional-Commits-Stil, Scope `forge`).
- Testnamen: `<Einheit>_<Situation>_<Erwartung>`, Aufbau Arrange/Act/Assert, `node:test`.
- Typografische Anführungszeichen („ “) nie als Literal in Code oder Tests schreiben (Werkzeuge normalisieren sie): im Code `'\u201E'` (öffnend) und `'\u201C'` (schließend). Das gilt auch für den Fuß „später“.
- Klartext-Verbote (`plainProblem`): `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>` als Wort, `F · `, `W · `; leerer Text; mehr als 400 Zeichen.
- Nur `spec-review` ändert sich. `plan-review`, `implementation-review`, `review-followup` (Quelle `nacharbeit`), die Review-Logik (`rate`, `checklist`, `verify`) und der Stop-Hook aus TP-A bleiben unverändert.
- `rework.json` ohne `change` bei `changed` in `spec-review`/`runde-1` ist ungültig; im Folge-Modus (`--quelle nacharbeit`) gilt das nicht.
- Kein Version-Bump (macht der Mensch beim Zusammenführen der drei Teile).

## Review Focus

- Ein alter Lauf mit `cases` im `rework.json` scheitert laut, nicht stumm (Task 5).
- Fällt der Scout aus, rendert der Text den Rückfall statt zu scheitern (Task 4).
- Eine einzige Frage steht im Singular („1 Frage braucht dich"), null Zähler entfallen (Task 4).
- Titel mit 1 oder 7 Wörtern und Kürzel in jedem Klartextfeld werden abgewiesen (Task 3, 5).
- Plan-Review bleibt unberührt: `scout-check` ohne `--review` oder mit `plan-review` prüft wie bisher (Task 3).

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `plugins/forge/scripts/lib/plain-text.js` (neu) | `plainProblem(text)` |
| `plugins/forge/scripts/lib/reviewer-names.js` (neu) | `reviewerLabel(review, name)`, `isKnownReviewer(review, name)` |
| `plugins/forge/scripts/lib/halt-text.js` (neu) | `renderHalt(data)`, `topicOf(specText)` |
| `plugins/forge/scripts/lib/scout-check.js` | `scoutTexts(lines)`, `checkScout(dir, review)` |
| `plugins/forge/scripts/review-flow.js` | `--review` bei `scout-check`, Usage |
| `plugins/forge/scripts/lib/questions.js` | neue Fragenform prüfen, `renderQuestions` entfällt |
| `plugins/forge/scripts/lib/rework-check.js` | `change`/`reason` prüfen, `renderHalt` einbinden |
| `plugins/forge/agents/spec-review-scout.md`, `agents/spec-rework.md` | neue Felder und Klartext-Regeln |
| `plugins/forge/shared/review-flow/flow.md` | `scout-check --review <rolle>`, Anhalten ohne eigene Antwortzeile |

---

### Task 1: Klartext-Prüfung

**Files:**
- Create: `plugins/forge/scripts/lib/plain-text.js`
- Create: `plugins/forge/tests/plain-text.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `plainProblem(text: unknown): string | null` — `null` bei gültigem Klartext, sonst ein kurzer Grund (`leer`, `Kürzel <treffer>`, `länger als 400 Zeichen (<n>)`).

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/plain-text.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { plainProblem } = require('../scripts/lib/plain-text');

test('plainProblem_PlainSentence_ReturnsNull', () => {
  assert.equal(plainProblem('Anmeldestatus und Browser-Tests'), null);
});

test('plainProblem_ShorthandInText_NamesIt', () => {
  const cases = [['Siehe AC-07 dazu', 'Kürzel AC-07'], ['Task 3 fehlt', 'Kürzel Task 3'], ['Eintrag R5 offen', 'Kürzel R5'],
    ['F · Stelle', 'Kürzel F ·'], ['Antwort W · Stelle', 'Kürzel W ·']];
  for (const [text, expected] of cases) assert.equal(plainProblem(text), expected, text);
});

test('plainProblem_LookalikesWithoutShorthand_ReturnsNull', () => {
  assert.equal(plainProblem('Der Wert R2D2 und AC/DC und Taskleiste 3 und F und W'), null);
});

test('plainProblem_EmptyOrNoText_ReturnsLeer', () => {
  for (const value of ['', '   ', undefined, null, 5]) assert.equal(plainProblem(value), 'leer');
});

test('plainProblem_ExactlyFourHundredCharacters_ReturnsNull', () => {
  assert.equal(plainProblem('x'.repeat(400)), null);
});

test('plainProblem_FourHundredOneCharacters_NamesLength', () => {
  assert.equal(plainProblem('x'.repeat(401)), 'länger als 400 Zeichen (401)');
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/plain-text.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/plain-text'`

- [ ] **Step 3: Minimal implementieren**

`plugins/forge/scripts/lib/plain-text.js`:

```js
'use strict';

// Klartext für den Menschen: keine Kürzel der Dokumente, nicht leer, höchstens 400 Zeichen.

const MAX_LENGTH = 400;
const SHORTHAND = /\bAC-\d+|\bTask \d+|\bR\d+\b|\bF · |\bW · /;

function plainProblem(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (value === '') return 'leer';
  const hit = SHORTHAND.exec(value);
  if (hit) return `Kürzel ${hit[0].trim()}`;
  return value.length > MAX_LENGTH ? `länger als ${MAX_LENGTH} Zeichen (${value.length})` : null;
}

module.exports = { plainProblem };
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/plain-text.test.js`
Expected: PASS (6 Tests)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/plain-text.js plugins/forge/tests/plain-text.test.js
git commit -m "feat(forge): check plain-language fields for shorthand and length"
```

---

### Task 2: Blickwinkel in Klartext

**Files:**
- Create: `plugins/forge/scripts/lib/reviewer-names.js`
- Create: `plugins/forge/tests/reviewer-names.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces:
  - `reviewerLabel(review: string, name: string): string` — `review` ∈ `spec-review | plan-review | implementation-review`; `skript` und `skript:<prüfung>` liefern `Skript-Prüfung`; ein unbekannter Name liefert sich selbst.
  - `isKnownReviewer(review: string, name: string): boolean`.

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/reviewer-names.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reviewerLabel, isKnownReviewer } = require('../scripts/lib/reviewer-names');

const AGENTS = path.join(__dirname, '..', 'agents');
const NOT_REVIEWERS = new Set(['scout', 'rework', 'verifier']);

test('reviewerLabel_SpecReviewer_ReturnsClearName', () => {
  assert.equal(reviewerLabel('spec-review', 'clarity'), 'Klarheit');
  assert.equal(reviewerLabel('spec-review', 'profiles'), 'Fachbegriffe');
});

test('reviewerLabel_SameShortNameInTwoFlows_FollowsTheFlow', () => {
  assert.equal(reviewerLabel('spec-review', 'feasibility'), 'Machbarkeit');
  assert.equal(reviewerLabel('plan-review', 'feasibility'), 'Reihenfolge und Machbarkeit');
  assert.equal(reviewerLabel('implementation-review', 'risks'), 'Risiken');
});

test('reviewerLabel_ScriptReviewer_ReturnsScriptCheck', () => {
  assert.equal(reviewerLabel('spec-review', 'skript'), 'Skript-Prüfung');
  assert.equal(reviewerLabel('spec-review', 'skript:begriffe'), 'Skript-Prüfung');
});

test('reviewerLabel_UnknownName_ReturnsTheNameItself', () => {
  assert.equal(reviewerLabel('spec-review', 'unbekannt'), 'unbekannt');
});

test('isKnownReviewer_KnownScriptAndUnknown_Distinguishes', () => {
  assert.equal(isKnownReviewer('spec-review', 'clarity'), true);
  assert.equal(isKnownReviewer('spec-review', 'skript:x'), true);
  assert.equal(isKnownReviewer('spec-review', 'coverage'), false);
});

test('reviewerLabel_EveryReviewerAgent_HasAnEntry', () => {
  const flows = ['spec-review', 'plan-review', 'implementation-review'];
  const reviewers = fs.readdirSync(AGENTS).filter((file) => file.endsWith('.md')).map((file) => file.slice(0, -3))
    .map((name) => flows.map((flow) => [flow, name.slice(flow.length + 1)]).find(([flow]) => name.startsWith(`${flow}-`)))
    .filter((pair) => pair && !NOT_REVIEWERS.has(pair[1]));
  assert.ok(reviewers.length >= 15, `nur ${reviewers.length} Reviewer gefunden`);
  for (const [flow, name] of reviewers) assert.equal(isKnownReviewer(flow, name), true, `${flow}-${name}`);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/reviewer-names.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/reviewer-names'`

- [ ] **Step 3: Minimal implementieren**

`plugins/forge/scripts/lib/reviewer-names.js`:

```js
'use strict';

// Blickwinkel der Reviewer in Klartext, je Ablauf; gleiche Kurznamen kommen in mehreren Abläufen vor.

const LABELS = {
  'spec-review': {
    completeness: 'Vollständigkeit', consistency: 'Widerspruchsfreiheit', feasibility: 'Machbarkeit', clarity: 'Klarheit', profiles: 'Fachbegriffe',
  },
  'plan-review': {
    coverage: 'Abdeckung der Spec', feasibility: 'Reihenfolge und Machbarkeit', architecture: 'Architektur', risks: 'Risiken', buildability: 'Umsetzbarkeit',
  },
  'implementation-review': {
    acceptance: 'Abnahmekriterien', 'plan-fidelity': 'Treue zum Plan', design: 'Aufbau', tests: 'Tests', risks: 'Risiken',
  },
};
const SCRIPT_REVIEWER = /^skript(?::|$)/;
const SCRIPT_LABEL = 'Skript-Prüfung';

function isKnownReviewer(review, name) {
  return SCRIPT_REVIEWER.test(name) || Object.hasOwn(LABELS[review] ?? {}, name);
}

function reviewerLabel(review, name) {
  if (SCRIPT_REVIEWER.test(name)) return SCRIPT_LABEL;
  return Object.hasOwn(LABELS[review] ?? {}, name) ? LABELS[review][name] : name;
}

module.exports = { reviewerLabel, isKnownReviewer };
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/reviewer-names.test.js`
Expected: PASS (6 Tests)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/reviewer-names.js plugins/forge/tests/reviewer-names.test.js
git commit -m "feat(forge): map reviewer short names to plain-language angles"
```

---

### Task 3: Scout-Felder Titel und Beschreibung (nur spec-review)

**Files:**
- Modify: `plugins/forge/scripts/lib/scout-check.js`
- Modify: `plugins/forge/scripts/review-flow.js` (Usage-Zeile und Befehl `scout-check`)
- Modify: `plugins/forge/agents/spec-review-scout.md` (Abschnitte „Auftrag", „Ausgabe")
- Modify: `plugins/forge/shared/review-flow/flow.md` (Abschnitt „Scout", Schritt 2)
- Modify: `plugins/forge/tests/review-flow-doc.test.js` (Zeile 31)
- Create: `plugins/forge/tests/scout-texts.test.js`
- Modify: `plugins/forge/tests/review-flow-round-one.test.js` (Tests anhängen)

**Interfaces:**
- Consumes: `plainProblem` (Task 1); aus `scout-check.js` vorhanden: `groupId`, `groupProblem`, `readLines`, `parseScout`, `parseRework`.
- Produces:
  - `scoutTexts(lines: string[]): Array<{ severity: string, location: string, title: string|null, description: string|null }>` — liest je Gruppe die Zeilen `Titel: …` und `Beschreibung: …`, die vor dem ersten Vorschlag stehen.
  - `checkScout(dir: string, review?: string): string` — bei `review === 'spec-review'` zusätzlich Titel und Beschreibung prüfen.
  - CLI `review-flow.js scout-check [--review <rolle>] --dir <ordner>`.

- [ ] **Step 1: Failing tests schreiben**

`plugins/forge/tests/scout-texts.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scoutTexts } = require('../scripts/lib/scout-check');
const { parseScout } = require('../scripts/followup');

const WITH_TEXTS = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Eingabe bei leerem Feld', 'Beschreibung: Offen ist, was bei leerer Eingabe gilt.', '1. D festlegen.', '   Beleg: keiner', '2. E streichen.', '**Bevorzugt: 1** — passt.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.',
];
const WITHOUT_TEXTS = WITH_TEXTS.filter((line) => !/^(Titel|Beschreibung): /.test(line));

test('scoutTexts_GroupsWithTexts_ReturnsTitleAndDescriptionPerGroup', () => {
  assert.deepEqual(scoutTexts(WITH_TEXTS), [
    { severity: '🔴', location: 'AC-04', title: 'Eingabe bei leerem Feld', description: 'Offen ist, was bei leerer Eingabe gilt.' },
    { severity: '🟡', location: 'AC-07', title: 'Eindeutige Formulierung', description: 'Der Satz hat zwei Lesarten.' },
  ]);
});

test('scoutTexts_GroupWithoutTexts_ReturnsNulls', () => {
  assert.deepEqual(scoutTexts(WITHOUT_TEXTS).map((group) => [group.title, group.description]), [[null, null], [null, null]]);
});

test('scoutTexts_TitleLineInsideProposal_IsIgnored', () => {
  const lines = ['## Scout-Vorschläge', '', '### 🔴 AC-04', '1. Text', 'Titel: im Vorschlag', '**Bevorzugt: 1** — x'];
  assert.equal(scoutTexts(lines)[0].title, null);
});

test('scoutTexts_NoScoutSection_ReturnsEmptyList', () => {
  assert.deepEqual(scoutTexts(['nichts']), []);
});

test('parseScout_WithAndWithoutTextLines_ReturnsTheSameProposals', () => {
  assert.deepEqual(parseScout(WITH_TEXTS), parseScout(WITHOUT_TEXTS));
});
```

An `plugins/forge/tests/review-flow-round-one.test.js` am Dateiende anhängen:

```js
const PLAIN_SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Eingabe bei leerem Feld', 'Beschreibung: Offen ist, was bei leerer Eingabe gilt.', '1. D festlegen.', '2. E streichen.', '**Bevorzugt: 1** — passt zum Bestand.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
].join('\n');

function scoutCheckSpec(scoutText, review = 'spec-review') {
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), scoutText);
  const args = review ? ['--review', review] : [];
  return flow('scout-check', ...args, '--dir', path.join(env.workspace, 'runde-1')).stdout;
}

test('scoutCheck_SpecReviewWithTitleAndDescription_Ok', () => {
  assert.equal(scoutCheckSpec(PLAIN_SCOUT), 'SCOUT ok\n');
});

test('scoutCheck_SpecReviewWithoutTitle_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Titel: Eingabe bei leerem Feld\n', '');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Titel fehlt\n');
});

test('scoutCheck_SpecReviewWithoutDescription_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Beschreibung: Offen ist, was bei leerer Eingabe gilt.\n', '');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Beschreibung fehlt\n');
});

test('scoutCheck_SpecReviewTitleWithOneOrSevenWords_Invalid', () => {
  assert.equal(scoutCheckSpec(PLAIN_SCOUT.replace('Eingabe bei leerem Feld', 'Eingabe')), 'SCOUT ungültig: 🔴 AC-04: Titel hat 1 Wörter statt 2 bis 6\n');
  assert.equal(scoutCheckSpec(PLAIN_SCOUT.replace('Eingabe bei leerem Feld', 'a b c d e f g')), 'SCOUT ungültig: 🔴 AC-04: Titel hat 7 Wörter statt 2 bis 6\n');
});

test('scoutCheck_SpecReviewShorthandInDescription_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Offen ist, was bei leerer Eingabe gilt.', 'Siehe AC-07 für den Fall.');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Beschreibung: Kürzel AC-07\n');
});

test('scoutCheck_SpecReviewDescriptionOverFourHundred_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Offen ist, was bei leerer Eingabe gilt.', 'x'.repeat(401));
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Beschreibung: länger als 400 Zeichen (401)\n');
});

test('scoutCheck_PlanReviewOrNoReviewWithoutTexts_StaysOk', () => {
  const plain = PLAIN_SCOUT.replace(/^(Titel|Beschreibung): .*\n/gm, '');
  assert.equal(scoutCheckSpec(plain, 'plan-review'), 'SCOUT ok\n');
  assert.equal(scoutCheckSpec(plain, null), 'SCOUT ok\n');
});
```

In `plugins/forge/tests/review-flow-doc.test.js` in der Liste in Zeile 31 `'scout-check --dir "<D>"'` ersetzen durch `'scout-check --review <rolle> --dir "<D>"'`.

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/scout-texts.test.js tests/review-flow-round-one.test.js tests/review-flow-doc.test.js`
Expected: FAIL (`scoutTexts is not a function`; `--review` bei `scout-check` liefert Exit 0, aber ohne Titel-Prüfung; Doc-Test erwartet neuen Befehl).

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/scout-check.js` ersetzen durch:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseRework, parseScout } = require('../followup');
const { readLines } = require('./flow-files');
const { plainProblem } = require('./plain-text');

const SCOUT_HEADING = /^## Scout-Vorschläge\s*$/;
const GROUP_HEADING = /^### (🔴|🟡|🟢) (.+?)\s*$/u;
const PROPOSAL = /^\d+\.\s/;
const TITLE_LINE = /^Titel: (.*)$/;
const DESCRIPTION_LINE = /^Beschreibung: (.*)$/;
const TITLE_WORDS = { min: 2, max: 6 };
const TEXT_REVIEW = 'spec-review';

function groupId(group) {
  return `${group.severity} ${group.location}`;
}

// Bevorzugt ist der Vorschlag, den genau eine Bevorzugt-Zeile mit der Nummer eines Vorschlags nennt; sonst gilt keiner als bevorzugt.
function preferredProblem(group) {
  if (group.preferredCount !== 1) return 'nicht genau ein bevorzugter Vorschlag';
  return Number.isInteger(group.preferred) && group.preferred >= 1 && group.preferred <= group.proposals.length ? null : 'kein gültiger bevorzugter Vorschlag';
}

function groupProblem(group) {
  if (!group) return 'Gruppe fehlt';
  if (group.proposals.length < 1 || group.proposals.length > 3) return `${group.proposals.length} Vorschläge statt 1 bis 3`;
  return preferredProblem(group);
}

// Titel und Beschreibung stehen direkt unter der Gruppen-Überschrift, vor dem ersten Vorschlag.
function scoutTexts(lines) {
  const start = lines.findIndex((line) => SCOUT_HEADING.test(line));
  const groups = [];
  let current = null;
  let proposalSeen = false;
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const heading = GROUP_HEADING.exec(line);
    if (heading) {
      current = { severity: heading[1], location: heading[2], title: null, description: null };
      groups.push(current);
      proposalSeen = false;
    } else if (current) {
      proposalSeen = proposalSeen || PROPOSAL.test(line);
      const title = proposalSeen ? null : TITLE_LINE.exec(line);
      const description = proposalSeen ? null : DESCRIPTION_LINE.exec(line);
      if (title && current.title === null) current.title = title[1].trim();
      if (description && current.description === null) current.description = description[1].trim();
    }
  }
  return groups;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function textsProblem(texts) {
  if (!texts?.title) return 'Titel fehlt';
  if (!texts.description) return 'Beschreibung fehlt';
  const words = wordCount(texts.title);
  if (words < TITLE_WORDS.min || words > TITLE_WORDS.max) return `Titel hat ${words} Wörter statt ${TITLE_WORDS.min} bis ${TITLE_WORDS.max}`;
  const title = plainProblem(texts.title);
  if (title) return `Titel: ${title}`;
  const description = plainProblem(texts.description);
  return description ? `Beschreibung: ${description}` : null;
}

// Jede Gruppe der Scout-Eingabe hat ein bis drei Vorschläge, genau einer bevorzugt; andere Gruppen gibt es nicht.
// Beim Spec-Review tragen sie zusätzlich Titel und Beschreibung in Klartext.
function checkScout(dir, review) {
  const expected = parseRework(readLines(path.join(dir, 'scout-eingabe.md'))).map(groupId);
  const file = path.join(dir, 'scout.md');
  if (!fs.existsSync(file)) return 'SCOUT ungültig: Ergebnisdatei fehlt';
  const lines = readLines(file);
  const groups = new Map(parseScout(lines).map((group) => [groupId(group), group]));
  const texts = review === TEXT_REVIEW ? new Map(scoutTexts(lines).map((group) => [groupId(group), group])) : null;
  const problemOf = (id) => groupProblem(groups.get(id)) ?? (texts ? textsProblem(texts.get(id)) : null);
  const wrong = expected.map((id) => [id, problemOf(id)]).find(([, problem]) => problem);
  if (wrong) return `SCOUT ungültig: ${wrong[0]}: ${wrong[1]}`;
  const extra = [...groups.keys()].filter((id) => !expected.includes(id));
  return extra.length > 0 ? `SCOUT ungültig: Gruppe nicht in der Eingabe: ${extra.join(', ')}` : 'SCOUT ok';
}

module.exports = { checkScout, preferredProblem, scoutTexts };
```

`plugins/forge/scripts/review-flow.js`:
- Usage-Zeile `'       node review-flow.js scout-check --dir <runden-ordner>',` wird `'       node review-flow.js scout-check [--review <rolle>] --dir <runden-ordner>',`.
- Der Eintrag in `COMMANDS` wird `'scout-check': (values) => checkScout(path.resolve(required(values, 'dir')), values.review),`.

`plugins/forge/shared/review-flow/flow.md`, Abschnitt „Scout", Schritt 2: `node "<PLUGIN>/scripts/review-flow.js" scout-check --dir "<D>"` wird `node "<PLUGIN>/scripts/review-flow.js" scout-check --review <rolle> --dir "<D>"` (Rest der Zeile unverändert).

`plugins/forge/agents/spec-review-scout.md`:
- In „Auftrag" nach Punkt 7 einen Punkt 8 einfügen:

```
8. Pro Gruppe schreibst du direkt unter die Überschrift zwei Zeilen: `Titel: <2 bis 6 Wörter>` und `Beschreibung: <was das Problem ist>`. Beide stehen in Klartext für einen Menschen, der die Spec nicht vor sich hat: keine Kürzel (kein `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `), keine Dateipfade, höchstens 400 Zeichen. Du beschreibst die Stelle mit Worten, zum Beispiel „Anmeldestatus und Browser-Tests“, nicht mit ihrer Nummer.
```

- Im Ausgabe-Beispiel die Gruppe um die beiden Zeilen ergänzen und danach einen Aufzählungspunkt:

```markdown
### 🔴 <Stelle>
Titel: <2 bis 6 Wörter>
Beschreibung: <Klartext, höchstens 400 Zeichen>
1. <Vorschlag>
```

(Die übrigen Zeilen des Beispiels bleiben.) Unter die Aufzählung nach dem Beispiel: `- Die Zeilen `Titel:` und `Beschreibung:` stehen direkt unter der Gruppen-Überschrift und vor dem ersten Vorschlag.`

Hinweis: Das Beispiel enthält typografische Anführungszeichen („Anmeldestatus und Browser-Tests“). Beim Einfügen per Skript `'\u201E'` und `'\u201C'` verwenden und danach per Code-Point prüfen, dass ein öffnendes `\u201E` und ein schließendes `\u201C` stehen. Der Test `agents.test.js` zählt `„` und `“` und verlangt gleiche Anzahl.

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/scout-texts.test.js tests/review-flow-round-one.test.js tests/review-flow-doc.test.js tests/agents.test.js tests/followup.test.js`
Expected: PASS. Schlägt ein Agent-Test wegen des geänderten Beispiels fehl, den Test an das neue Beispiel anpassen, nie die Prüfung abschwächen.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts plugins/forge/agents/spec-review-scout.md plugins/forge/shared/review-flow/flow.md plugins/forge/tests
git commit -m "feat(forge): require plain title and description from the spec-review scout"
```

---

### Task 4: Renderer für den Anhalten-Text

**Files:**
- Create: `plugins/forge/scripts/lib/halt-text.js`
- Create: `plugins/forge/tests/halt-text.test.js`

**Interfaces:**
- Consumes: `ICON` aus `scripts/lib/groups.js` (🔴/🟡/🟢 je `red|yellow|green`); `collapse`, `placeKey` aus `scripts/lib/places.js`; `reviewerLabel` (Task 2).
- Produces:
  - `topicOf(specText: string): string | null` — Text der ersten Überschrift `# …`.
  - `renderHalt({ topic, groups, texts, results, bundles }): string`
    - `groups`: Gruppen aus `einstufung.json`: `{ key, label, color, reviewers: string[], items: [{ finding: { consequence } }] }`
    - `texts`: Ausgabe von `scoutTexts` (Task 3)
    - `results`: `rework.json` `results[]` (`location`, `status`, `change?`, `reason?`)
    - `bundles`: `rework.json` `questions[]` im neuen Format (Spec 4.4)

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/halt-text.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderHalt, topicOf } = require('../scripts/lib/halt-text');

const LATER = 'später';
const FOOT = [
  `**Antwort:** \`1a\` · \u201E${LATER}\u201C lässt eine Frage offen.`,
  '**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.',
];

const group = (overrides) => ({
  key: 'ac-4', label: 'AC-04', color: 'red', reviewers: ['completeness', 'clarity'], items: [{ finding: { consequence: 'Folge des Findings' } }], ...overrides,
});
const bundle = (overrides) => ({
  title: 'Token-Format im Produktivsystem', affects: 'Prüfung des Tokens', why: 'Alle Messungen stammen vom Testsystem.', reviewers: ['consistency'],
  options: [{ label: 'a', text: 'Erst umsetzen, wenn gemessen ist.', consequence: 'sicher, die Umsetzung wartet.' }, { label: 'b', text: 'Sofort umsetzen.', consequence: 'schnell, es kann scheitern.' }],
  recommendation: 'a', reason: 'ein Fehler träfe sonst alle Nutzer.', places: ['AC-01'], ...overrides,
});
const TEXTS = [
  { severity: '🔴', location: 'AC-04', title: 'Anmeldestatus und Browser-Tests', description: 'Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist.' },
  { severity: '🟡', location: 'AC-07', title: 'Antwort bei fremdem Token', description: 'Offen war, ob 401 oder 403 kommt.' },
];

function input(overrides = {}) {
  return {
    topic: 'Zugriff mit dem Access-Token',
    groups: [group(), group({ key: 'ac-1', label: 'AC-01', reviewers: ['consistency'] }), group({ key: 'ac-7', label: 'AC-07', color: 'yellow', reviewers: ['clarity'] })],
    texts: TEXTS,
    results: [{ location: 'AC-04', status: 'changed', change: 'Beides steht jetzt als prüfbare Vorgabe in der Spec.' }, { location: 'AC-01', status: 'human-question', reason: 'neu' }],
    bundles: [bundle()],
    ...overrides,
  };
}

test('renderHalt_CorrectedNoticeAndOneQuestion_ShowsAgreedLayout', () => {
  // Act
  const text = renderHalt(input());

  // Assert
  assert.equal(text, [
    '## Spec-Review · Runde 1 · Zugriff mit dem Access-Token',
    '**Ergebnis:** 2 × 🔴 · 1 × 🟡 · 1 Frage braucht dich',
    '',
    '### Schon korrigiert (nichts zu tun)',
    '- 🔴 **Anmeldestatus und Browser-Tests** · Blickwinkel: Vollständigkeit, Klarheit',
    '  Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist.',
    '  Änderung: Beides steht jetzt als prüfbare Vorgabe in der Spec.',
    '',
    '### Nur zur Kenntnis (nicht bearbeitet)',
    '- 🟡 **Antwort bei fremdem Token** · Blickwinkel: Klarheit',
    '  Offen war, ob 401 oder 403 kommt.',
    '',
    '### Frage 1 von 1 · Token-Format im Produktivsystem  (betrifft: Prüfung des Tokens)',
    '**Warum gefragt** (Blickwinkel: Widerspruchsfreiheit): Alle Messungen stammen vom Testsystem.',
    '- **a)** Erst umsetzen, wenn gemessen ist. Folge: sicher, die Umsetzung wartet.',
    '- **b)** Sofort umsetzen. Folge: schnell, es kann scheitern.',
    '**Empfehlung: a**, ein Fehler träfe sonst alle Nutzer.',
    '',
    ...FOOT,
  ].join('\n'));
});

test('renderHalt_TwoQuestions_NumbersThemAndListsRecommendationsInFooter', () => {
  // Act
  const text = renderHalt(input({ bundles: [bundle(), bundle({ title: 'Zweite Frage', recommendation: 'b' })] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* 2 × 🔴 · 1 × 🟡 · 2 Fragen brauchen dich/);
  assert.match(text, /### Frage 1 von 2 · Token-Format/);
  assert.match(text, /### Frage 2 von 2 · Zweite Frage/);
  assert.ok(text.includes(`**Antwort:** \`1a, 2b\` · \u201E${LATER}\u201C lässt eine Frage offen.`));
});

test('renderHalt_RedUnchanged_ShownInNoticeWithReason', () => {
  // Arrange
  const results = [{ location: 'AC-04', status: 'unchanged', reason: 'Das Finding beruht auf einer Fehllesung.' }];

  // Act
  const text = renderHalt(input({ results, bundles: [] }));

  // Assert
  assert.ok(text.includes('### Nur zur Kenntnis (nicht bearbeitet)\n- 🔴 **Anmeldestatus und Browser-Tests** · Blickwinkel: Vollständigkeit, Klarheit\n  Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist.\n  Grund: Das Finding beruht auf einer Fehllesung.'));
  assert.equal(text.includes('### Schon korrigiert'), false);
});

test('renderHalt_NoChangedAndNoNotice_OmitsBothSections', () => {
  // Arrange
  const only = { groups: [group({ key: 'ac-1', label: 'AC-01' })], results: [{ location: 'AC-01', status: 'human-question', reason: 'neu' }] };

  // Act
  const text = renderHalt(input(only));

  // Assert
  assert.equal(text.includes('### Schon korrigiert'), false);
  assert.equal(text.includes('### Nur zur Kenntnis'), false);
  assert.match(text, /\*\*Ergebnis:\*\* 1 × 🔴 · 1 Frage braucht dich/);
});

test('renderHalt_ScoutMissing_UsesLabelAndShortenedConsequenceWithNote', () => {
  // Arrange
  const long = 'x'.repeat(500);
  const groups = [group({ items: [{ finding: { consequence: long } }] })];

  // Act
  const text = renderHalt(input({ texts: [], groups, results: [{ location: 'AC-04', status: 'changed', change: 'Geändert.' }], bundles: [] }));

  // Assert
  assert.ok(text.includes(`- 🔴 **AC-04** · Blickwinkel: Vollständigkeit, Klarheit\n  ${'x'.repeat(399)}… (ohne Scout-Beschreibung)\n  Änderung: Geändert.`));
});

test('renderHalt_NoTopic_OmitsTopicInHeading', () => {
  assert.ok(renderHalt(input({ topic: null })).startsWith('## Spec-Review · Runde 1\n'));
});

test('renderHalt_OptionTextWithLineBreaks_StaysOnOneLine', () => {
  // Arrange
  const options = [{ label: 'a', text: 'Erst\nmessen.', consequence: 'sicher,\n  aber langsam.' }, { label: 'b', text: 'Sofort.', consequence: 'schnell.' }];

  // Act
  const text = renderHalt(input({ bundles: [bundle({ options })] }));

  // Assert
  assert.ok(text.includes('- **a)** Erst messen. Folge: sicher, aber langsam.'));
});

test('topicOf_FirstLevelHeading_ReturnsItsText', () => {
  assert.equal(topicOf('Status: x\n# Demo-Spec\n\n## Teil\n# Zweite'), 'Demo-Spec');
  assert.equal(topicOf('## nur zweite Ebene'), null);
  assert.equal(topicOf('# Mit CRLF\r\n'), 'Mit CRLF');
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/halt-text.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/halt-text'`

- [ ] **Step 3: Minimal implementieren**

`plugins/forge/scripts/lib/halt-text.js`:

```js
'use strict';

// Text beim Anhalten eines Spec-Reviews: Ergebnis von Runde 1 und die gebündelten Fragen, in Klartext.

const { ICON } = require('./groups');
const { collapse, placeKey } = require('./places');
const { reviewerLabel } = require('./reviewer-names');

const FALLBACK_MAX = 400;
const FALLBACK_NOTE = ' (ohne Scout-Beschreibung)';
const OPEN_QUOTE = '\u201E';
const CLOSE_QUOTE = '\u201C';

function topicOf(specText) {
  const match = /^# (.+?)\s*$/m.exec(String(specText).replace(/\r\n/g, '\n'));
  return match ? match[1] : null;
}

function angles(reviewers) {
  return reviewers.map((name) => reviewerLabel('spec-review', name)).join(', ');
}

function shorten(text, max) {
  const flat = collapse(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

// Ohne Scout-Text (Scout ausgefallen) zeigt der Text die Stelle und die gekürzte Konsequenz des ersten Findings.
function describe(group, scouted) {
  const texts = scouted.get(`${ICON[group.color]} ${collapse(group.label)}`);
  if (texts?.title && texts.description) return texts;
  return { title: group.label, description: `${shorten(group.items[0].finding.consequence, FALLBACK_MAX)}${FALLBACK_NOTE}` };
}

function entryLines(group, scouted, extra) {
  const { title, description } = describe(group, scouted);
  return [`- ${ICON[group.color]} **${title}** · Blickwinkel: ${angles(group.reviewers)}`, `  ${description}`, ...extra.map((line) => `  ${line}`)];
}

function correctedLines(groups, outcomes, scouted) {
  return groups.filter((group) => group.color === 'red' && outcomes.get(group.key)?.status === 'changed')
    .flatMap((group) => entryLines(group, scouted, [`Änderung: ${collapse(outcomes.get(group.key).change)}`]));
}

function noticeLines(groups, outcomes, scouted) {
  return groups.flatMap((group) => {
    if (group.color === 'yellow') return entryLines(group, scouted, []);
    const outcome = outcomes.get(group.key);
    return group.color === 'red' && outcome?.status === 'unchanged' ? entryLines(group, scouted, [`Grund: ${collapse(outcome.reason)}`]) : [];
  });
}

function optionLine(option) {
  return `- **${option.label})** ${collapse(option.text)} Folge: ${collapse(option.consequence)}`;
}

function questionLines(bundle, number, total) {
  return [
    `### Frage ${number} von ${total} · ${collapse(bundle.title)}  (betrifft: ${collapse(bundle.affects)})`,
    `**Warum gefragt** (Blickwinkel: ${angles(bundle.reviewers)}): ${collapse(bundle.why)}`,
    ...bundle.options.map(optionLine),
    `**Empfehlung: ${bundle.recommendation}**, ${collapse(bundle.reason)}`,
  ];
}

function resultLine(groups, questions) {
  const count = (color) => groups.filter((group) => group.color === color).length;
  const parts = [[count('red'), '🔴'], [count('yellow'), '🟡']].filter(([number]) => number > 0).map(([number, icon]) => `${number} × ${icon}`);
  if (questions > 0) parts.push(questions === 1 ? '1 Frage braucht dich' : `${questions} Fragen brauchen dich`);
  return `**Ergebnis:** ${parts.join(' · ')}`;
}

function renderHalt({ topic, groups, texts, results, bundles }) {
  const scouted = new Map(texts.map((entry) => [`${entry.severity} ${entry.location}`, entry]));
  const outcomes = new Map(results.map((entry) => [placeKey(entry.location), entry]));
  const corrected = correctedLines(groups, outcomes, scouted);
  const notice = noticeLines(groups, outcomes, scouted);
  const answer = bundles.map((bundle, index) => `${index + 1}${bundle.recommendation}`).join(', ');
  return [
    [`## Spec-Review · Runde 1${topic ? ` · ${topic}` : ''}`, resultLine(groups, bundles.length)],
    ...(corrected.length > 0 ? [['### Schon korrigiert (nichts zu tun)', ...corrected]] : []),
    ...(notice.length > 0 ? [['### Nur zur Kenntnis (nicht bearbeitet)', ...notice]] : []),
    ...bundles.map((bundle, index) => questionLines(bundle, index + 1, bundles.length)),
    [`**Antwort:** \`${answer}\` · ${OPEN_QUOTE}später${CLOSE_QUOTE} lässt eine Frage offen.`,
      '**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.'],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderHalt, topicOf };
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/halt-text.test.js`
Expected: PASS (8 Tests)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/halt-text.js plugins/forge/tests/halt-text.test.js
git commit -m "feat(forge): render the halt text with results of round one and plain questions"
```

---

### Task 5: Neues Fragenformat prüfen und im Ablauf verwenden

**Files:**
- Modify: `plugins/forge/scripts/lib/questions.js` (`bundleShapeProblem` ersetzen, `renderBundle`/`renderQuestions`/`TEXT_FIELDS` entfernen, Exporte)
- Modify: `plugins/forge/scripts/lib/rework-check.js` (Importe, `resultsProblem`, `checkRework`)
- Modify: `plugins/forge/tests/review-questions.test.js`
- Modify: `plugins/forge/tests/review-flow-rework.test.js`
- Modify: weitere Tests, die in `spec-review` Runde 1 `status: 'changed'` ohne `change` schreiben (siehe Step 4)

**Interfaces:**
- Consumes: `plainProblem` (Task 1), `isKnownReviewer` (Task 2), `renderHalt`/`topicOf` (Task 4), `scoutTexts` (Task 3); im Code vorhanden: `readJson`, `readLines`, `readText`, `writeText`, `ROUND_ONE` aus `flow-files.js`.
- Produces: `bundleShapeProblem(bundle, index): string | null` (neue Regeln aus Spec 4.4). `rework-check` gibt bei gültigem Ergebnis `NACHARBEIT ok fragen=<n> anhalten=ja\n=== FRAGEN ===\n<renderHalt-Text>` aus und schreibt denselben Text nach `<W>/runde-1/fragen.md`.

- [ ] **Step 1: Failing tests schreiben**

`plugins/forge/tests/review-questions.test.js`: den Import ändern auf

```js
const { titleNamesPlace, openQuestions, documentQuestions, nextEntryNumber, bundleShapeProblem, bundleProblem } = require('../scripts/lib/questions');
```

die Hilfsfunktion `bundle` ersetzen durch

```js
function bundle(overrides = {}) {
  return {
    title: 'Leere Eingabe', affects: 'Eingabe prüfen', why: 'Es ist offen, was bei leerer Eingabe gilt.', reviewers: ['clarity'],
    options: [{ label: 'a', text: 'Fehler melden.', consequence: 'streng.' }, { label: 'b', text: 'Standardwert nehmen.', consequence: 'bequem.' }],
    recommendation: 'a', reason: 'Fehler fallen früh auf.', places: ['AC-04'], ...overrides,
  };
}
```

und die zwei Tests `bundleShapeProblem_NoCases_IsInvalid` und `renderQuestions_Bundle_ShowsPlacesCasesAndRecommendation` am Dateiende ersetzen durch:

```js
test('bundleShapeProblem_ValidBundle_ReturnsNull', () => {
  assert.equal(bundleShapeProblem(bundle(), 0), null);
});

test('bundleShapeProblem_MissingTextField_NamesIt', () => {
  assert.equal(bundleShapeProblem(bundle({ why: '' }), 0), 'Frage 1: why fehlt');
  assert.equal(bundleShapeProblem(bundle({ title: undefined }), 1), 'Frage 2: title fehlt');
});

test('bundleShapeProblem_ShorthandOrLengthInTextField_NamesFieldAndReason', () => {
  assert.equal(bundleShapeProblem(bundle({ affects: 'Siehe AC-07' }), 0), 'Frage 1: affects: Kürzel AC-07');
  assert.equal(bundleShapeProblem(bundle({ why: 'x'.repeat(401) }), 0), 'Frage 1: why: länger als 400 Zeichen (401)');
});

test('bundleShapeProblem_OldCasesField_AsksForNewRun', () => {
  assert.equal(bundleShapeProblem({ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) x'], recommendation: 'a' }, 0), 'rework.json im alten Format (cases); Lauf neu starten');
});

test('bundleShapeProblem_UnknownOrMissingReviewers_Invalid', () => {
  assert.equal(bundleShapeProblem(bundle({ reviewers: [] }), 0), 'Frage 1: reviewers fehlt');
  assert.equal(bundleShapeProblem(bundle({ reviewers: ['coverage'] }), 0), 'Frage 1: Reviewer unbekannt: coverage');
});

test('bundleShapeProblem_OptionCountOrLabels_Invalid', () => {
  const one = [{ label: 'a', text: 'x.', consequence: 'y.' }];
  const gap = [{ label: 'a', text: 'x.', consequence: 'y.' }, { label: 'c', text: 'x.', consequence: 'y.' }];
  assert.equal(bundleShapeProblem(bundle({ options: one }), 0), 'Frage 1: options braucht 2 bis 4 Einträge');
  assert.equal(bundleShapeProblem(bundle({ options: gap }), 0), 'Frage 1: Labels der options müssen a, b, … lückenlos sein');
});

test('bundleShapeProblem_OptionTextWithShorthand_NamesOption', () => {
  const options = [{ label: 'a', text: 'Task 3 ändern.', consequence: 'y.' }, { label: 'b', text: 'x.', consequence: 'y.' }];
  assert.equal(bundleShapeProblem(bundle({ options }), 0), 'Frage 1: options[0].text: Kürzel Task 3');
});

test('bundleShapeProblem_RecommendationWithoutMatchingOption_Invalid', () => {
  assert.equal(bundleShapeProblem(bundle({ recommendation: 'c' }), 0), 'Frage 1: recommendation passt zu keiner Option');
});
```

`plugins/forge/tests/review-flow-rework.test.js`:

a) Hilfsfunktion `bundle(places)` ersetzen durch

```js
const LATER = 'später';

function bundle(places) {
  return {
    title: 'Leere Eingabe', affects: 'Eingabe prüfen', why: 'Es ist offen, was bei leerer Eingabe gilt.', reviewers: ['consistency'],
    options: [{ label: 'a', text: 'Fehler melden.', consequence: 'streng' }, { label: 'b', text: 'Standardwert nehmen.', consequence: 'bequem' }],
    recommendation: 'a', reason: 'Fehler fallen früh auf.', places,
  };
}
```

b) In allen Tests dieser Datei, die ein Ergebnis mit `status: 'changed'` für `spec-review`/`runde-1` schreiben (also nicht die Followup-Quelle `nacharbeit` und nicht `plan-review`), jedes `{ location: '…', status: 'changed' }` zu `{ location: '…', status: 'changed', change: 'Wortlaut geschärft.' }` erweitern. Den Test `reworkCheck_FollowupSource_ExpectsChosenGroups` (Quelle `nacharbeit`) und Plan-Review-Tests nicht ändern.

c) Den Test `reworkCheck_QuestionsBundled_PausesAndWritesQuestions` ersetzen durch:

```js
test('reworkCheck_QuestionsBundled_PausesAndWritesHaltText', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?', '- **R1 · AC-07** — frage an den menschen — Gilt I?');
  writeRework(env, {
    results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }, { location: 'AC-07', status: 'human-question', reason: 'neue Regel' }],
    questions: [bundle(['AC-04', 'AC-07'])],
  });

  // Act
  const output = checkRework(env);

  // Assert
  const shown = [
    '## Spec-Review · Runde 1 · Demo-Spec',
    '**Ergebnis:** 2 × 🔴 · 1 Frage braucht dich',
    '',
    '### Frage 1 von 1 · Leere Eingabe  (betrifft: Eingabe prüfen)',
    '**Warum gefragt** (Blickwinkel: Widerspruchsfreiheit): Es ist offen, was bei leerer Eingabe gilt.',
    '- **a)** Fehler melden. Folge: streng',
    '- **b)** Standardwert nehmen. Folge: bequem',
    '**Empfehlung: a**, Fehler fallen früh auf.',
    '',
    `**Antwort:** \`1a\` · \u201E${LATER}\u201C lässt eine Frage offen.`,
    '**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.',
  ].join('\n');
  assert.equal(output, `NACHARBEIT ok fragen=2 anhalten=ja\n=== FRAGEN ===\n${shown}\n`);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'runde-1', 'fragen.md'), 'utf8'), `${shown}\n`);
});
```

(`fs` ist in dieser Testdatei bereits importiert.)

d) Neue Tests anhängen:

```js
test('reworkCheck_ChangedWithoutChange_Invalid', () => {
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: change: leer (AC-04)\n');
});

test('reworkCheck_ChangeOrUnchangedReasonWithShorthand_Invalid', () => {
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'AC-04 umformuliert.' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: change: Kürzel AC-04 (AC-04)\n');
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'Umformuliert.' }, { location: 'AC-07', status: 'unchanged', reason: 'Siehe W · Deckel' }] });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: reason: Kürzel W · (AC-07)\n');
});

test('reworkCheck_OldCasesFormat_AsksForNewRun', () => {
  const env = setup();
  prepareRework(env);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?');
  writeRework(env, {
    results: [{ location: 'AC-04', status: 'human-question', reason: 'neu' }, { location: 'AC-07', status: 'changed', change: 'Geschärft.' }],
    questions: [{ rule: 'Regel', question: 'Was gilt?', places: ['AC-04'], cases: ['a) x'], recommendation: 'a' }],
  });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: rework.json im alten Format (cases); Lauf neu starten\n');
});

test('reworkCheck_PlanReviewChangedWithoutChange_StaysOk', () => {
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'changed' }] });
  assert.equal(checkRework(env, 'plan-review'), 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/review-questions.test.js tests/review-flow-rework.test.js`
Expected: FAIL (`bundleShapeProblem` kennt das neue Format nicht, `rework-check` rendert das alte Format, `change` wird nicht geprüft).

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/questions.js`:

a) Imports ergänzen (unter den bestehenden `require`-Zeilen):

```js
const { plainProblem } = require('./plain-text');
const { isKnownReviewer } = require('./reviewer-names');
```

b) Die Zeile `const TEXT_FIELDS = ['rule', 'question', 'recommendation'];` ersetzen durch:

```js
const PLAIN_FIELDS = ['title', 'affects', 'why', 'reason'];
const OPTION_LABELS = ['a', 'b', 'c', 'd'];
```

c) `bundleShapeProblem` ersetzen durch:

```js
function optionProblem(option, index, at) {
  if (option === null || typeof option !== 'object') return `${at}: options[${index}] ist kein Objekt`;
  if (option.label !== OPTION_LABELS[index]) return `${at}: Labels der options müssen a, b, … lückenlos sein`;
  const field = ['text', 'consequence'].find((name) => plainProblem(option[name]));
  return field ? `${at}: options[${index}].${field}: ${plainProblem(option[field])}` : null;
}

function optionsProblem(options, at) {
  if (!Array.isArray(options) || options.length < 2 || options.length > OPTION_LABELS.length) return `${at}: options braucht 2 bis 4 Einträge`;
  return options.map((option, index) => optionProblem(option, index, at)).find(Boolean) ?? null;
}

function reviewersProblem(reviewers, at) {
  if (!isFilledList(reviewers)) return `${at}: reviewers fehlt`;
  const unknown = reviewers.find((name) => !isKnownReviewer('spec-review', name));
  return unknown ? `${at}: Reviewer unbekannt: ${unknown}` : null;
}

function bundleShapeProblem(bundle, index) {
  const at = `Frage ${index + 1}`;
  if (bundle === null || typeof bundle !== 'object') return `${at} ist kein Objekt`;
  if (Object.hasOwn(bundle, 'cases')) return 'rework.json im alten Format (cases); Lauf neu starten';
  const missing = PLAIN_FIELDS.find((field) => !isFilledText(bundle[field]));
  if (missing) return `${at}: ${missing} fehlt`;
  if (!isFilledList(bundle.places)) return `${at}: places fehlt`;
  const plain = PLAIN_FIELDS.find((field) => plainProblem(bundle[field]));
  if (plain) return `${at}: ${plain}: ${plainProblem(bundle[plain])}`;
  const problem = reviewersProblem(bundle.reviewers, at) ?? optionsProblem(bundle.options, at);
  if (problem) return problem;
  return bundle.options.some((option) => option.label === bundle.recommendation) ? null : `${at}: recommendation passt zu keiner Option`;
}
```

d) Die Funktionen `renderBundle` und `renderQuestions` löschen und aus `module.exports` entfernen (`renderQuestions` raus).

`plugins/forge/scripts/lib/rework-check.js`:

a) Importzeile für `questions` ändern auf `const { openQuestions, bundleShapeProblem, bundleProblem } = require('./questions');` und ergänzen:

```js
const { plainProblem } = require('./plain-text');
const { renderHalt, topicOf } = require('./halt-text');
const { scoutTexts } = require('./scout-check');
```

Die `flow-files`-Importzeile erweitern um `readLines`: `const { ROUND_ONE, readText, readLines, readJson, readAgentJson, writeText, writeJson } = require('./flow-files');`

b) Nach `entryProblem` einfügen:

```js
// Klartextfelder, die der Mensch beim Anhalten liest: nur Spec-Review in Runde 1.
function plainEntryProblem(entry, options) {
  if (options.review !== 'spec-review' || options.source !== ROUND_ONE) return null;
  const field = { changed: 'change', unchanged: 'reason' }[entry.status];
  const problem = field ? plainProblem(entry[field]) : null;
  return problem ? `${field}: ${problem} (${entry.location})` : null;
}
```

c) `resultsProblem` ersetzen durch:

```js
function resultsProblem(value, keys, options) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.results)) return 'results fehlt';
  const problem = value.results.map((entry) => entryProblem(entry, options.review) ?? plainEntryProblem(entry, options)).find(Boolean);
  return problem ?? coverageProblem(value.results, keys, 'Ausgang');
}
```

d) In `checkRework` den Aufruf `resultsProblem(value, expectedKeys(options.workspace, options.source), options.review)` ersetzen durch `resultsProblem(value, expectedKeys(options.workspace, options.source), options)`.

e) Vor `checkRework` einfügen:

```js
function haltInput(options, value) {
  const dir = path.join(options.workspace, options.source);
  return {
    topic: topicOf(readText(options.doc)),
    groups: readJson(path.join(dir, 'einstufung.json')).groups,
    texts: scoutTexts(readLines(path.join(dir, 'scout.md'))),
    results: value.results,
    bundles: value.questions,
  };
}
```

und in `checkRework` die Zeile `const shown = renderQuestions(value.questions);` ersetzen durch `const shown = renderHalt(haltInput(options, value));`.

- [ ] **Step 4: Tests laufen lassen und Folgeschäden beheben**

Run: `cd plugins/forge && node --test`
Expected: Die neuen und angepassten Tests laufen grün. Tests anderer Dateien, die für `spec-review`/`runde-1` ein `rework.json` mit `status: 'changed'` ohne `change` schreiben und `rework-check` aufrufen, schlagen mit `NACHARBEIT ungültig: change: leer (…)` fehl. Dort jeweils `change: 'Wortlaut geschärft.'` ergänzen (Kandidaten: `tests/review-flow-report.test.js`, `tests/review-flow-round-two.test.js`, `tests/rework-outcome.test.js`, `tests/review-files.test.js`, `tests/prepare.test.js`; Folge-Modus und Plan-Review-Fixtures nicht ändern). Danach läuft die gesamte Suite grün.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/questions.js plugins/forge/scripts/lib/rework-check.js plugins/forge/tests
git commit -m "feat(forge): validate plain-language questions and render the halt text"
```

---

### Task 6: Agent-Prompt und Ablauf-Text

**Files:**
- Modify: `plugins/forge/agents/spec-rework.md`
- Modify: `plugins/forge/shared/review-flow/flow.md` (Abschnitt „Anhalten", Schritt 1)
- Modify: `plugins/forge/tests/agents.test.js` (Zeilen 500 und 591)
- Modify: `plugins/forge/tests/review-flow-doc.test.js` (Test anhängen)

**Interfaces:**
- Consumes: Feldnamen aus Task 5 (`title`, `affects`, `why`, `reviewers`, `options`, `recommendation`, `reason`, `places`, `change`).
- Produces: nichts für spätere Tasks.

- [ ] **Step 1: Failing tests schreiben**

In `plugins/forge/tests/agents.test.js`:
- Zeile 500: in der Liste `['"questions"', '"places"', '"cases"', '"recommendation"', …]` den Eintrag `'"cases"'` ersetzen durch `'"options"', '"title"', '"why"', '"reviewers"', '"change"'`.
- Zeile 591: den Eintrag `'die Unterfälle und eine empfohlene Antwort'` ersetzen durch `'das Label der empfohlenen Option'`.
- Neuen Test anhängen:

```js
test('spec-rework_Body_QuestionsAndChangesInPlainLanguageWithoutShorthand', () => {
  const { body } = readAgent('spec-rework');
  for (const part of ['höchstens 400 Zeichen', '`AC-<Zahl>`', '`Task <Zahl>`', '`R<Zahl>`', '`F · `', '`W · `', '`consequence` ist die Folge dieser Option',
    '`places` (alle betroffenen Stellen wörtlich, nur intern zur Abdeckungsprüfung)', '`change`: Pflicht bei `changed`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.equal(body.includes('"cases"'), false);
  assert.equal(body.includes('"rule"'), false);
});
```

In `plugins/forge/tests/review-flow-doc.test.js` anhängen:

```js
test('flow_Pause_DoesNotAddItsOwnAnswerLine', () => {
  const pause = section(readText(FLOW), 'Anhalten');
  assert.equal(pause.includes('Antworte im Chat'), false);
  assert.ok(pause.includes('Gib den Text nach `=== FRAGEN ===` unverändert aus'));
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/agents.test.js tests/review-flow-doc.test.js`
Expected: FAIL (alte Zeile in `flow.md`, neue Felder fehlen im Agent)

- [ ] **Step 3: Texte ändern**

`plugins/forge/agents/spec-rework.md`:

a) Abschnitt „Fragen bündeln", Punkt 3 `3. Jede gebündelte Frage nennt die Regel, die Frage, alle betroffenen Stellen, die Unterfälle und eine empfohlene Antwort.` ersetzen durch:

```
3. Jede gebündelte Frage ist ein Objekt mit diesen Feldern. Alle Textfelder stehen in Klartext für einen Menschen, der die Spec nicht vor sich hat: keine Kürzel (kein `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `), keine Dateipfade, jedes Textfeld höchstens 400 Zeichen. Du beschreibst eine Stelle mit Worten, nicht mit ihrer Nummer. Felder: `title` (Titel der Frage), `affects` (was die Frage betrifft, ohne das Wort betrifft), `why` (warum gefragt, mit dem Anlass aus den Findings), `reviewers` (Kurznamen der Reviewer, die den Anlass fanden, aus den Klammern der Überschriften), `options` (2 bis 4 Objekte `{ "label", "text", "consequence" }` mit den Labels `a`, `b`, `c`, `d` lückenlos; `consequence` ist die Folge dieser Option), `recommendation` (das Label der empfohlenen Option), `reason` (Grund der Empfehlung) und `places` (alle betroffenen Stellen wörtlich, nur intern zur Abdeckungsprüfung).
```

b) Im Ausgabe-Beispiel die beiden Zeilen für `AC-04` und die Frage so ersetzen, dass das JSON lautet:

```json
{
  "results": [
    { "location": "AC-04", "status": "changed", "change": "Die Spec legt jetzt fest, wie eine leere Eingabe behandelt wird." },
    { "location": "AC-05", "status": "changed", "change": "Der Grenzwert steht jetzt als prüfbare Vorgabe in der Spec.", "evidence": "src/export.js" },
    { "location": "AC-07", "status": "human-question", "reason": "Gilt I auch ohne Eingabe?" }
  ],
  "questions": [
    {
      "title": "Leere Eingabe", "affects": "Verhalten ohne Eingabe", "why": "Es ist offen, was ohne Eingabe gilt; zwei Prüfer lesen das verschieden.",
      "reviewers": ["clarity"], "places": ["AC-07"],
      "options": [{ "label": "a", "text": "Fehler melden.", "consequence": "streng, der Nutzer merkt es sofort." }, { "label": "b", "text": "Standardwert nehmen.", "consequence": "bequem, ein Fehler fällt später auf." }],
      "recommendation": "b", "reason": "Ein Standardwert vermeidet Abbrüche und lässt sich später ändern."
    }
  ]
}
```

c) In der Aufzählung unter dem Beispiel (nach `- \`reason\` ist Pflicht bei …`) einfügen:

```
- `change`: Pflicht bei `changed`, wenn du `Findings:` bekommst (nicht im Folge-Modus mit `Vorschläge:`): ein bis drei Sätze in Klartext, was sich in der Spec geändert hat, ohne Kürzel, höchstens 400 Zeichen. Bei `unchanged` steht `reason` ebenfalls in Klartext ohne Kürzel, höchstens 400 Zeichen.
```

`plugins/forge/shared/review-flow/flow.md`, Abschnitt „Anhalten", Schritt 1: Die Teilzeichenfolge ``, darunter `Antworte im Chat; „später“ lässt eine Frage offen.` `` entfernen, sodass der Satz `Gib den Text nach `=== FRAGEN ===` unverändert aus.` bleibt (steht dort ein Vorrang-Satz aus TP-A dahinter, bleibt er stehen). Wegen der typografischen Anführungszeichen per Node-Skript ersetzen:

```bash
node -e "
const fs=require('fs');const f='plugins/forge/shared/review-flow/flow.md';let t=fs.readFileSync(f,'utf8');
const old=', darunter \`Antworte im Chat; \u201Espäter\u201C lässt eine Frage offen.\`';
if(!t.includes(old))throw new Error('Teilzeichenfolge fehlt');
fs.writeFileSync(f,t.replace(old,'.'));"
```

Danach prüfen: `grep -n "Antworte im Chat" plugins/forge/shared/review-flow/flow.md` liefert keine Zeile. Steht nach der Ersetzung `unverändert aus..` (doppelter Punkt, weil der alte Satz mit Punkt endete), den doppelten Punkt auf einen reduzieren.

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/agents.test.js tests/review-flow-doc.test.js tests/skill.test.js`
Expected: PASS. Prüft ein Agent-Test die Anführungszeichen, muss die Anzahl `„` und `“` im Body gleich bleiben.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/agents/spec-rework.md plugins/forge/shared/review-flow/flow.md plugins/forge/tests/agents.test.js plugins/forge/tests/review-flow-doc.test.js
git commit -m "docs(forge): describe plain-language questions for the spec rework and the halt step"
```

---

### Task 7: Gesamtlauf und Handprobe

**Files:** keine Änderung außer Nachbesserungen.

- [ ] **Step 1: Gesamte Suite**

Run: `cd plugins/forge && node --test`
Expected: alle Tests PASS. Fehlschläge bei Tests, die das alte Fragenformat prüften, anpassen, nie die neue Prüfung abschwächen.

- [ ] **Step 2: Handprobe des Textes**

Run (im Repo-Root, Git Bash):

```bash
cd plugins/forge && node -e "
const { renderHalt } = require('./scripts/lib/halt-text');
console.log(renderHalt({
  topic: 'Probe', texts: [],
  groups: [{ key: 'ac-4', label: 'AC-04', color: 'red', reviewers: ['clarity'], items: [{ finding: { consequence: 'Folge' } }] }],
  results: [{ location: 'AC-04', status: 'changed', change: 'Geändert.' }], bundles: []
}));"
```

Expected: Kopf `## Spec-Review · Runde 1 · Probe`, `**Ergebnis:** 1 × 🔴`, Abschnitt `### Schon korrigiert (nichts zu tun)` mit `(ohne Scout-Beschreibung)`, Fuß mit `Antwort:` (leere Code-Spanne, weil keine Frage; im echten Ablauf gibt es dann kein Anhalten).

- [ ] **Step 3: Ablauf-Probe nach dem Zusammenführen (Mensch)**

Ein `/dv-forge:spec-review` auf eine Spec laufen lassen, die eine Frage erzeugt. Beobachten: Der Anhalten-Text zeigt Kopf, „Schon korrigiert", „Nur zur Kenntnis" und jede Frage mit „Warum gefragt", Optionen mit „Folge:" und Empfehlung mit Grund; keine `AC-nn` im sichtbaren Text.

- [ ] **Step 4: Abschluss**

`git status` prüfen (nur Dateien dieses Plans). Version-Bump macht der Mensch beim Zusammenführen von TP-A, TP-B und TP-C.
