# dv-forge TP-C2: Abschlussbericht des Implementierungs-Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Bericht des Implementierungs-Reviews kommt aus einem Skript, ist Klartext ohne Kürzel und Dateistellen, liegt in `abschluss/bericht.md` (abgesichert durch den Stop-Hook aus TP-A), und nach einem Followup der Implementierung enthält die Sicherung nur noch offene Gruppen.

**Architecture:** `aggregate-findings.js` schreibt zusätzlich `ergebnis.json`. Der Scout liefert `Titel`/`Beschreibung`/`Empfehlung`, `scout-check` prüft sie. Ein neues Skript `implementation-report.js` (Lib `implementation-report.js`, Renderer `implementation-report-text.js`) baut Bericht und gefilterte Sicherung. `followup.js keep` reduziert die Sicherung nach einem sauberen Followup. `loop.md` und der Skill rufen das Skript auf.

**Tech Stack:** Node.js (CommonJS, `node:test`, `node:assert/strict`), keine Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-10-02-forge-implementation-report-design.md`

**Voraussetzung:** TP-A, TP-B und TP-C1 sind zusammengeführt. Dieser Plan ändert deren Dateien an benannten Stellen (`scout-check.js`, `report-text.js`, `loop.md`, `references/flow.md`).

**Arbeitsverzeichnis:** Alle Pfade relativ zum Repo-Root `C:\Develop\Dv.Ai.Development`. Tests laufen im Plugin-Ordner: `cd plugins/forge && node --test tests/<datei>`.

## Global Constraints

- Kommentare und Markdown deutsch; Commit-Messages englisch im Conventional-Commits-Stil, Scope `forge`.
- Testnamen `<Einheit>_<Situation>_<Erwartung>`, Aufbau Arrange/Act/Assert, `node:test`.
- Typografische Anführungszeichen („ “) nie als Literal in Code oder Tests; stattdessen `\u201E` (öffnend) und `\u201C` (schließend).
- Klartext-Verbote (`plainProblem`): `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `; leer; über 400 Zeichen.
- Die Konsolenausgabe und `aggregate.md` von `aggregate-findings.js` bleiben byte-gleich; nur `ergebnis.json` kommt dazu und steht auf der Liste der reservierten Dateinamen (sonst läse der Aggregator sie als Reviewer-Ergebnis).
- Der Orchestrator liest weiterhin keine geschützten Dateien; alle Ausgaben kommen aus Skripten.
- Nicht Teil dieses Plans: Skript-Bericht für das Followup der Implementierung, Nachforderungs-Hinweise, Version-Bump.

## Review Focus

- `ergebnis.json` im Rundenordner darf bei einem zweiten Lauf des Aggregators nicht als Reviewer gelten (Task 2).
- Ein fehlender oder ungültiger Scout lässt `implementation-report.js` nicht scheitern (Task 6).
- Dateinamen wie `latest.js` zählen nicht als Testdatei, `OrderTests.cs` schon (Task 6).
- `followup.js keep` mit unbekannter Nummer oder ohne Sicherung scheitert sauber, ohne die Sicherung zu beschädigen (Task 1).
- Der Orchestrator darf `implementation-report.js` im geschützten Repo starten (Task 6).

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `plugins/forge/scripts/followup.js` | `scoutBlocks` (hierher verschoben), `keep`, CLI `keep` |
| `plugins/forge/scripts/lib/scout-check.js` | importiert `scoutBlocks`; Implementierung als Rolle |
| `plugins/forge/scripts/aggregate-findings.js` | `ergebnis.json`, reservierter Dateiname |
| `plugins/forge/scripts/prepare.js` | `hinweise.json` für `implementation-review` |
| `plugins/forge/scripts/lib/report-text.js` | exportiert Hilfsfunktionen |
| `plugins/forge/scripts/lib/implementation-report-text.js` (neu) | reiner Renderer |
| `plugins/forge/scripts/lib/implementation-report.js` (neu) | liest Arbeitsbereich, schreibt `abschluss/` |
| `plugins/forge/scripts/implementation-report.js` (neu) | CLI |
| `plugins/forge/scripts/guard-orchestrator.js` | erlaubt das neue Skript |
| `plugins/forge/agents/implementation-review-scout.md` | neue Felder |
| `shared/review-loop/loop.md`, `skills/implementation-review/SKILL.md`, `skills/review-followup/references/flow.md` | Ablauftexte |

---

### Task 1: `followup.js` — `scoutBlocks` verschieben und `keep`

**Files:**
- Modify: `plugins/forge/scripts/followup.js`
- Modify: `plugins/forge/scripts/lib/scout-check.js`
- Modify: `plugins/forge/tests/followup.test.js`

**Interfaces:**
- Consumes: `scoutSection`, `GROUP_HEADING`, `loadGroups`, `followupDir`, `repoRoot`, `readLines`, `drop`, `REWORK_MARK` (alle in `followup.js`).
- Produces:
  - `scoutBlocks(lines): Map<string, string[]>` jetzt aus `followup.js` (bisher in `scout-check.js`; `scout-check.js` exportiert es weiter).
  - `keep(role, slug, numbers, cwd?)`: schreibt `aggregate.md` und `scout.md` der Sicherung nur mit den Gruppen der genannten Nummern (kommagetrennt); ohne passende Gruppe entfernt es die Sicherung; ungültige Nummern → `FollowupError('Ungültige Gruppennummern: <text>')`; fehlende Sicherung → `FollowupError('Keine Sicherung für <slug>')`.
  - CLI `followup.js keep <rolle> <slug> <nummern>`.

- [ ] **Step 1: Failing tests schreiben** (an `tests/followup.test.js` anhängen; `fs`, `path`, `makeRepo`, `writeSave`, `run`, `AGGREGATE`, `SCOUT`, `followup` sind dort schon definiert)

```js
test('keep_OneOfTwoGroups_KeepsOnlyThatGroupWithScoutBlockAndRenumbers', () => {
  const repo = makeRepo();
  const dir = writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  followup.keep('plan-review', 'demo', '2', repo);
  const aggregate = fs.readFileSync(path.join(dir, 'aggregate.md'), 'utf8');
  const scout = fs.readFileSync(path.join(dir, 'scout.md'), 'utf8');
  assert.ok(aggregate.includes('### 🟡 AC-03 (coverage)'));
  assert.equal(aggregate.includes('Task 2'), false);
  assert.ok(scout.includes('### 🟡 AC-03\n1. Schritt ergänzen\n**Bevorzugt: 1** — einziger Weg'));
  assert.equal(scout.includes('Task 2'), false);
  assert.deepEqual(followup.loadGroups(dir).map((group) => [group.number, group.location, group.preferred]), [[1, 'AC-03', 1]]);
  assert.ok(fs.existsSync(path.join(dir, 'meta.json')));
});

test('keep_BothGroups_KeepsCodeFenceInsideScoutBlock', () => {
  const repo = makeRepo();
  const dir = writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  followup.keep('plan-review', 'demo', '1,2', repo);
  assert.equal(followup.loadGroups(dir).length, 2);
  assert.ok(fs.readFileSync(path.join(dir, 'scout.md'), 'utf8').includes('```js\n1. kein Vorschlag, nur Code\n```'));
});

test('keep_NoMatchingNumber_RemovesTheSave', () => {
  const repo = makeRepo();
  const dir = writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  followup.keep('plan-review', 'demo', '9', repo);
  assert.equal(fs.existsSync(dir), false);
});

test('keep_InvalidNumbersOrNoSave_Throws', () => {
  const repo = makeRepo();
  assert.throws(() => followup.keep('plan-review', 'demo', '1', repo), /Keine Sicherung für demo/);
  const dir = writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  const before = fs.readFileSync(path.join(dir, 'scout.md'), 'utf8');
  assert.throws(() => followup.keep('plan-review', 'demo', 'a,2', repo), /Ungültige Gruppennummern: a,2/);
  assert.equal(fs.readFileSync(path.join(dir, 'scout.md'), 'utf8'), before);
});

test('cli_Keep_ExitsZeroWithSaveAndOneWithout', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'keep', 'plan-review', 'demo', '1').status, 1);
  writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  assert.equal(run(repo, 'keep', 'plan-review', 'demo', '1').status, 0);
  assert.equal(run(repo, 'keep', 'plan-review', 'demo').status, 2);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/followup.test.js`
Expected: FAIL (`followup.keep is not a function`)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/followup.js`:

a) Nach `scoutSection` einfügen (Funktion aus `scout-check.js` hierher verschoben):

```js
// Zeilen jeder Scout-Gruppe, von ihrer Überschrift bis vor die nächste; Schlüssel `<icon> <stelle>`.
function scoutBlocks(lines) {
  const blocks = new Map();
  let current = null;
  for (const line of scoutSection(lines).slice(1)) {
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

b) Nach `drop` einfügen:

```js
// Behält in der Sicherung nur die Gruppen mit den genannten Nummern (Nummern der aktuellen Sicherung); keine passende Gruppe: Sicherung weg.
function keep(role, slug, numbers, cwd = process.cwd()) {
  const dir = followupDir(repoRoot(cwd), role, slug);
  if (!fs.existsSync(path.join(dir, 'meta.json'))) throw new FollowupError(`Keine Sicherung für ${slug}`);
  const wanted = String(numbers).split(',').map((part) => part.trim()).filter(Boolean).map(Number);
  if (wanted.some((number) => !Number.isInteger(number) || number < 1)) throw new FollowupError(`Ungültige Gruppennummern: ${numbers}`);
  const kept = loadGroups(dir).filter((group) => wanted.includes(group.number));
  if (kept.length === 0) {
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }
  const blocks = scoutBlocks(readLines(path.join(dir, 'scout.md')));
  const aggregate = kept.map((group) => [`### ${group.severity} ${group.location} (${group.reviewers.join(', ')})`, ...group.findings].join('\n'));
  const scout = kept.map((group) => blocks.get(`${group.severity} ${group.location}`).join('\n').trimEnd());
  fs.writeFileSync(path.join(dir, 'aggregate.md'), `${REWORK_MARK}\n${aggregate.join('\n\n')}\n`);
  fs.writeFileSync(path.join(dir, 'scout.md'), `## Scout-Vorschläge\n\n${scout.join('\n\n')}\n`);
}
```

c) `USAGE` ergänzen: `... | drop <…> <slug> | keep <spec-review|plan-review|review> <slug> <nummern>\n` (die bestehende Zeichenkette um `| keep <spec-review|plan-review|review> <slug> <nummern>` erweitern).

d) `isValidCall`: die letzte Zeile ersetzen durch

```js
  return (action === 'save' && args.length === 3) || (action === 'drop' && args.length === 2) || (action === 'keep' && args.length === 3);
```

e) In `main` den Zweig `if (action === 'save') … else drop(...args);` ersetzen durch

```js
    if (action === 'save') process.stdout.write(`${save(...args)}\n`);
    else if (action === 'keep') keep(...args);
    else drop(...args);
```

f) Exporte: `module.exports = { …, drop?, … }` um `scoutBlocks, keep` erweitern (bestehende Liste behalten).

`plugins/forge/scripts/lib/scout-check.js`:
- Importzeile `const { parseRework, parseScout } = require('../followup');` wird `const { parseRework, parseScout, scoutBlocks } = require('../followup');`.
- Die lokale Funktion `scoutBlocks` (mit dem Kommentar „Zeilen jeder Gruppe …") löschen. Der Export `module.exports = { checkScout, preferredProblem, scoutTexts, scoutBlocks };` bleibt.

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/followup.test.js tests/scout-texts.test.js tests/review-flow-round-one.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/followup.js plugins/forge/scripts/lib/scout-check.js plugins/forge/tests/followup.test.js
git commit -m "feat(forge): keep only chosen groups in a saved followup set"
```

---

### Task 2: `ergebnis.json` im Aggregator

**Files:**
- Modify: `plugins/forge/scripts/aggregate-findings.js`
- Modify: `plugins/forge/tests/aggregate-file.test.js`

**Interfaces:**
- Produces: `<D>/ergebnis.json` mit `{ reviewers: string[], failed: string[], counts: { red, yellow, green }, groups: [{ location, severity, reviewers, items: [{ reviewer, severity, location, quote, consequence, rationale }] }] }`. `readReviewDir` überspringt die Datei.

- [ ] **Step 1: Failing tests schreiben** (an `tests/aggregate-file.test.js` anhängen; `fs`/`os` ggf. oben importieren)

```js
const fs = require('node:fs');
const os = require('node:os');

function reviewDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-agg-'));
  for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(value));
  return dir;
}

function runDirCli(dir, expect) {
  return spawnSync(process.execPath, [SCRIPT, '--dir', dir, '--expect', expect, '--round', '1'], { encoding: 'utf8' });
}

test('cli_Dir_WritesErgebnisJsonWithReviewersFailedCountsAndGroups', () => {
  const dir = reviewDir({
    design: { reviewer: 'design', summary: 's', findings: [finding('src/a.js', 'yellow')] },
    risks: { reviewer: 'risks', summary: 's', findings: [finding('src/a.js', 'red'), finding('src/b.js', 'green')] },
  });
  const result = runDirCli(dir, 'design,risks,tests');
  assert.equal(result.status, 0, result.stderr);
  const ergebnis = JSON.parse(fs.readFileSync(path.join(dir, 'ergebnis.json'), 'utf8'));
  assert.deepEqual(ergebnis.reviewers, ['design', 'risks']);
  assert.deepEqual(ergebnis.failed, ['tests']);
  assert.deepEqual(ergebnis.counts, { red: 1, yellow: 0, green: 1 });
  assert.equal(ergebnis.groups[0].severity, 'red');
  assert.deepEqual(ergebnis.groups[0].reviewers.sort(), ['design', 'risks']);
  assert.deepEqual(Object.keys(ergebnis.groups[0].items[0]).sort(), ['consequence', 'location', 'quote', 'rationale', 'reviewer', 'severity']);
});

test('cli_DirRunTwice_IgnoresErgebnisJsonAndKeepsConsoleOutputEqualToAggregateFile', () => {
  const dir = reviewDir({ design: { reviewer: 'design', summary: 's', findings: [finding('src/a.js', 'yellow')] } });
  runDirCli(dir, 'design');
  const second = runDirCli(dir, 'design');
  assert.doesNotMatch(second.stdout, /ERROR/);
  assert.equal(second.stdout, fs.readFileSync(path.join(dir, 'aggregate.md'), 'utf8'));
  assert.match(second.stdout, /=== REPORT ===[\s\S]*=== REWORK ===/);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/aggregate-file.test.js`
Expected: FAIL (`ergebnis.json` fehlt; beim zweiten Lauf `ERROR Block verletzt …` oder Reviewer `ergebnis`)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/aggregate-findings.js`:

a) `const RESERVED_FILES = new Set(['rework.json']);` wird `const RESERVED_FILES = new Set(['rework.json', 'ergebnis.json']);`.

b) Vor `parseExpected` einfügen:

```js
// Strukturierte Fassung des Ergebnisses für den Bericht (implementation-report.js).
function resultFile(result) {
  return {
    reviewers: result.reviews.map((review) => review.reviewer),
    failed: result.status.failed,
    counts: result.status.counts,
    groups: result.groups.map((group) => ({
      location: group.location,
      severity: group.severity,
      reviewers: group.reviewers,
      items: group.items.map(({ reviewer, severity, location, quote, consequence, rationale }) => ({ reviewer, severity, location, quote, consequence, rationale })),
    })),
  };
}
```

c) In `main` die Zeilen ab `const output = …` ersetzen durch:

```js
  const result = runDir(dir, parseExpected(args), types, optionValue(args, '--round'));
  const output = `${render(result)}\n`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'aggregate.md'), output);
  fs.writeFileSync(path.join(dir, 'ergebnis.json'), `${JSON.stringify(resultFile(result), null, 2)}\n`);
  process.stdout.write(output);
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/aggregate-file.test.js tests/aggregate-parse.test.js tests/aggregate-rate.test.js tests/review-loop.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/aggregate-findings.js plugins/forge/tests/aggregate-file.test.js
git commit -m "feat(forge): write a structured result file next to the aggregate"
```

---

### Task 3: Scout-Prüfung und -Prompt für die Implementierung

**Files:**
- Modify: `plugins/forge/scripts/lib/scout-check.js`
- Modify: `plugins/forge/agents/implementation-review-scout.md`
- Create: `plugins/forge/tests/implementation-scout-check.test.js`
- Modify: `plugins/forge/tests/agents.test.js`

**Interfaces:**
- Consumes: `checkScout(dir, review)` aus TP-B/TP-C1.
- Produces: `checkScout(dir, 'implementation-review')` liest die erwarteten Gruppen aus den 🔴/🟡-Gruppen von `<dir>/aggregate.md`, wenn keine `scout-eingabe.md` existiert, und prüft `Titel`/`Beschreibung`/`Empfehlung` wie bei Spec und Plan.

- [ ] **Step 1: Failing tests schreiben**

`plugins/forge/tests/implementation-scout-check.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'review-flow.js');
const FINDING = '- [risks · red] Zitat: \u201Ex\u201C · Konsequenz: k · Begründung: b';
const AGGREGATE = [
  'STATUS clean=false red=1 yellow=1 green=1 failed=-', '=== REPORT ===', 'Tabelle', '=== REWORK ===',
  '### 🔴 src/a.js (risks)', FINDING, '', '### 🟡 src/b.js (design)', FINDING, '', '### 🟢 src/c.js (tests)', FINDING, '',
].join('\n');
const SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 src/a.js', 'Titel: Fehler wird verschluckt', 'Beschreibung: Ein Fehler beim Speichern bleibt unbemerkt.', 'Empfehlung: Den Fehler melden, weil Nutzer sonst Datenverlust nicht sehen.',
  '1. Fehler melden.', '**Bevorzugt: 1** — klar.', '',
  '### 🟡 src/b.js', 'Titel: Doppelte Rundung', 'Beschreibung: Die Rundung steht an zwei Stellen.', 'Empfehlung: Die Rundung bündeln, weil Änderungen sonst doppelt nötig sind.',
  '1. Bündeln.', '**Bevorzugt: 1** — einfach.', '',
].join('\n');

function check(scout, review = 'implementation-review') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-impl-scout-'));
  fs.writeFileSync(path.join(dir, 'aggregate.md'), AGGREGATE);
  if (scout !== null) fs.writeFileSync(path.join(dir, 'scout.md'), scout);
  const args = review ? ['--review', review] : [];
  return spawnSync(process.execPath, [SCRIPT, 'scout-check', ...args, '--dir', dir], { encoding: 'utf8' }).stdout;
}

test('scoutCheck_ImplementationReviewCompleteScoutWithoutGreenGroup_Ok', () => {
  assert.equal(check(SCOUT), 'SCOUT ok\n');
});

test('scoutCheck_ImplementationReviewMissingRedOrYellowGroup_Invalid', () => {
  const withoutYellow = SCOUT.slice(0, SCOUT.indexOf('### 🟡'));
  assert.equal(check(withoutYellow), 'SCOUT ungültig: 🟡 src/b.js: Gruppe fehlt\n');
});

test('scoutCheck_ImplementationReviewMissingFileOrFields_Invalid', () => {
  assert.equal(check(null), 'SCOUT ungültig: Ergebnisdatei fehlt\n');
  assert.equal(check(SCOUT.replace('Titel: Fehler wird verschluckt\n', '')), 'SCOUT ungültig: 🔴 src/a.js: Titel fehlt\n');
  assert.equal(check(SCOUT.replace(/Empfehlung: Den Fehler[^\n]*\n/, '')), 'SCOUT ungültig: 🔴 src/a.js: Empfehlung fehlt\n');
});

test('scoutCheck_ImplementationReviewShorthandOrOverlength_Invalid', () => {
  assert.equal(check(SCOUT.replace('Ein Fehler beim Speichern bleibt unbemerkt.', 'Siehe AC-03 dazu.')), 'SCOUT ungültig: 🔴 src/a.js: Beschreibung: Kürzel AC-03\n');
  assert.equal(check(SCOUT.replace('Fehler wird verschluckt', 'Fehler')), 'SCOUT ungültig: 🔴 src/a.js: Titel hat 1 Wörter statt 2 bis 6\n');
});

test('scoutCheck_OtherRoleWithoutScoutInput_FailsLikeBefore', () => {
  assert.match(check(SCOUT, null), /Datei fehlt|SCOUT/);
});
```

(Der letzte Test dokumentiert nur, dass ohne Rolle weiter `scout-eingabe.md` verlangt wird und der Aufruf nicht abstürzt; er prüft keinen festen Wortlaut.)

In `tests/agents.test.js` anhängen:

```js
test('implementationReviewScout_Body_DescribesTitleDescriptionRecommendationInPlainLanguage', () => {
  const { body } = readAgent('implementation-review-scout');
  for (const part of ['`Titel: <2 bis 6 Wörter>`', '`Beschreibung: <was das Problem ist>`', '`Empfehlung: <Klartext>`', 'höchstens 400 Zeichen', '`AC-<Zahl>`', 'keine Dateipfade']) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(body.includes('Empfehlung: <Klartext, höchstens 400 Zeichen, mit kurzem Grund>'));
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/implementation-scout-check.test.js tests/agents.test.js`
Expected: FAIL (`Datei fehlt: …scout-eingabe.md`; Agent-Text fehlt)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/scout-check.js`:

a) `const TEXT_REVIEWS = ['spec-review', 'plan-review'];` wird `const TEXT_REVIEWS = ['spec-review', 'plan-review', 'implementation-review'];`.

b) Vor `checkScout` einfügen:

```js
// Spec und Plan: die Gruppen der Scout-Eingabe. Implementierung: keine Eingabe-Datei, erwartet sind die 🔴/🟡-Gruppen des Aggregats.
function expectedIds(dir, review) {
  const input = path.join(dir, 'scout-eingabe.md');
  if (review === 'implementation-review' && !fs.existsSync(input)) {
    return parseRework(readLines(path.join(dir, 'aggregate.md'))).filter((group) => group.severity !== '🟢').map(groupId);
  }
  return parseRework(readLines(input)).map(groupId);
}
```

c) In `checkScout` die Zeile `const expected = parseRework(readLines(path.join(dir, 'scout-eingabe.md'))).map(groupId);` ersetzen durch `const expected = expectedIds(dir, review);`.

`plugins/forge/agents/implementation-review-scout.md`:
- Im Abschnitt „Auftrag" nach Punkt 7 einfügen:

```
8. Pro Gruppe schreibst du direkt unter die Überschrift drei Zeilen: `Titel: <2 bis 6 Wörter>`, `Beschreibung: <was das Problem ist>` und `Empfehlung: <Klartext>`. Die Empfehlung nennt den bevorzugten Vorschlag mit einem kurzen Grund. Alle drei stehen in Klartext für einen Menschen, der den Code nicht vor sich hat: keine Kürzel (kein `AC-<Zahl>`, `Task <Zahl>`, `R<Zahl>`, `F · `, `W · `), keine Dateipfade, jede Zeile höchstens 400 Zeichen. Du beschreibst die Stelle mit Worten, nicht mit ihrem Dateinamen.
```

- Im Ausgabe-Beispiel die Gruppe ersetzen durch:

```markdown
### 🔴 <Stelle>
Titel: <2 bis 6 Wörter>
Beschreibung: <Klartext, höchstens 400 Zeichen>
Empfehlung: <Klartext, höchstens 400 Zeichen, mit kurzem Grund>
1. <Vorschlag>
2. <Vorschlag>
**Bevorzugt: <Nr>** — <Begründung>
```

- Als weiteren Aufzählungspunkt unter dem Beispiel: `- Die Zeilen `Titel:`, `Beschreibung:` und `Empfehlung:` stehen direkt unter der Gruppen-Überschrift und vor dem ersten Vorschlag. Die Stelle in der Überschrift bleibt der Dateiname aus der Eingabe.`

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/implementation-scout-check.test.js tests/agents.test.js tests/review-flow-round-one.test.js tests/scout-texts.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/scout-check.js plugins/forge/agents/implementation-review-scout.md plugins/forge/tests
git commit -m "feat(forge): check plain title, description and recommendation of the implementation scout"
```

---

### Task 4: `hinweise.json` für den Implementierungs-Review

**Files:**
- Modify: `plugins/forge/scripts/prepare.js` (`prepareImplementationReview`)
- Modify: `plugins/forge/tests/prepare.test.js`

**Interfaces:**
- Produces: `<W>/hinweise.json` (JSON-Liste) bei `prepare.js implementation-review`.

- [ ] **Step 1: Failing tests schreiben** (an `prepare.test.js` anhängen; Helfer `planRepo`, `commitFile`, `git`, `run`, `values` sind vorhanden)

```js
function lateCommitRepo() {
  const repo = planRepo();
  const stand = git(repo, 'rev-parse', '--short', commitFile(repo, 'src/a.ts', 'a\n', 'feat: a'));
  commitFile(repo, 'docs/forge/demo/umsetzung.md', `# Umsetzung\n\n## Stand\n- Stand: ${stand}\n- Gesamtlauf: keiner\n`, 'docs: report');
  return repo;
}

test('implementationReview_NoLateCommits_WritesEmptyHintList', () => {
  const repo = lateCommitRepo();
  const out = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~2'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out.W, 'hinweise.json'), 'utf8')), []);
});

test('implementationReview_CommitsAfterReport_WritesPlainHint', () => {
  const repo = lateCommitRepo();
  commitFile(repo, 'src/b.ts', 'b\n', 'refactor: share helper');
  const out = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~3'));
  const notes = JSON.parse(fs.readFileSync(path.join(out.W, 'hinweise.json'), 'utf8'));
  assert.equal(notes.length, 1);
  assert.match(notes[0], /^Nach dem Umsetzungsbericht \(Stand \S+\) gibt es weitere Commits: .*refactor: share helper\. Sie fehlen in den Urteilen der Umsetzung\.$/);
  assert.match([].concat(out.WARN).join('\n'), /nach dem Umsetzungsbericht/i);
});

test('implementationReview_NoReportAtAll_WritesEmptyHintList', () => {
  const repo = planRepo();
  const out = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~1'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out.W, 'hinweise.json'), 'utf8')), []);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/prepare.test.js`
Expected: FAIL (`hinweise.json` fehlt)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/prepare.js`:

a) Vor `function prepareImplementationReview` einfügen:

```js
const LATE_COMMITS = /^Commits nach dem Umsetzungsbericht \(Stand (\S+)\): ([\s\S]*)$/;
const LATE_UNKNOWN = /^Stand (\S+) des Umsetzungsberichts nicht prüfbar: ([\s\S]*)$/;

// Die Warnung zu Commits nach dem Umsetzungsbericht als Klartext mit Auswirkung (hinweise.json); die WARN-Zeile bleibt.
function plainLateHint(late) {
  const commits = LATE_COMMITS.exec(late);
  if (commits) return `Nach dem Umsetzungsbericht (Stand ${commits[1]}) gibt es weitere Commits: ${commits[2]}. Sie fehlen in den Urteilen der Umsetzung.`;
  const unknown = LATE_UNKNOWN.exec(late);
  if (unknown) return `Der Stand ${unknown[1]} des Umsetzungsberichts ließ sich nicht prüfen (${unknown[2]}). Ob Commits nach dem Bericht fehlen, ist unbekannt.`;
  return `Hinweis der Vorbereitung: ${late}`;
}
```

b) In `prepareImplementationReview` den Block

```js
  if (fs.existsSync(archivePath(plan))) {
    values.Z = archivePath(plan);
    const late = commitsAfterReport(values.Z, root);
    if (late) values.WARN = late;
  }
  return values;
```

ersetzen durch:

```js
  const hints = [];
  if (fs.existsSync(archivePath(plan))) {
    values.Z = archivePath(plan);
    const late = commitsAfterReport(values.Z, root);
    if (late) {
      values.WARN = late;
      hints.push(plainLateHint(late));
    }
  }
  fs.writeFileSync(path.join(workspace, 'hinweise.json'), `${JSON.stringify(hints, null, 2)}\n`);
  return values;
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/prepare.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/prepare.js plugins/forge/tests/prepare.test.js
git commit -m "feat(forge): record plain process hints for the implementation review"
```

---

### Task 5: Renderer des Implementierungsberichts

**Files:**
- Modify: `plugins/forge/scripts/lib/report-text.js` (Hilfsfunktionen exportieren)
- Create: `plugins/forge/scripts/lib/implementation-report-text.js`
- Create: `plugins/forge/tests/implementation-report-text.test.js`

**Interfaces:**
- Consumes: `openLines`, `section`, `stepLines`, `viewpointsPhrase` aus `report-text.js` (hier exportiert).
- Produces: `renderImplementationReport(input): string` mit
  - `plan` (Pfad für Befehle), `topic` (string|null), `openRed` (Zahl der 🔴-Gruppen), `reviewerCount`, `range` (z. B. `a1b2c3d..HEAD`), `fileCount`, `testCount`
  - `reviewerLines`: `[{ name, red, yellow, failed }]` (Anzeigenamen, Findings-Zähler)
  - `failedLabels`: string[]; `open`: `[{ color, title, angles, description, recommendation }]`; `notes`: string[]

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/implementation-report-text.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderImplementationReport } = require('../scripts/lib/implementation-report-text');

const LINES = [['Abnahmekriterien', 0, 0], ['Treue zum Plan', 0, 0], ['Aufbau', 0, 1], ['Tests', 0, 0], ['Risiken', 0, 0]]
  .map(([name, red, yellow]) => ({ name, red, yellow, failed: false }));
const HINT = {
  color: 'yellow', title: 'Rundung der Summe', angles: 'Aufbau', description: 'Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
  recommendation: 'die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
};

function base(overrides = {}) {
  return {
    plan: 'docs/forge/x/plan.md', topic: 'Bestellsumme berechnen', openRed: 0, reviewerCount: 5, range: 'a1b2c3d..HEAD', fileCount: 14, testCount: 6,
    reviewerLines: LINES, failedLabels: [], open: [], notes: [], ...overrides,
  };
}

test('renderImplementationReport_ReadyWithOneHint_ShowsAgreedLayout', () => {
  // Act
  const text = renderImplementationReport(base({
    open: [HINT], notes: ['Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.'],
  }));

  // Assert
  assert.equal(text, [
    '## Implementierungs-Review · Ergebnis · Bestellsumme berechnen',
    '**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen',
    'Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung.',
    '',
    '### Was geprüft wurde',
    '- Bereich: `a1b2c3d..HEAD`',
    '- 14 geänderte Dateien, davon 6 Tests',
    '- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken',
    '',
    '### Gefunden',
    '- Abnahmekriterien: 0 Hindernisse, 0 Hinweise',
    '- Treue zum Plan: 0 Hindernisse, 0 Hinweise',
    '- Aufbau: 0 Hindernisse, 1 Hinweis',
    '- Tests: 0 Hindernisse, 0 Hinweise',
    '- Risiken: 0 Hindernisse, 0 Hinweise',
    '',
    '### Noch offen · kein Hindernis für das Abschließen',
    '- 🟡 **Rundung der Summe** · aus: Aufbau',
    '  Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
    '  Vorschlag (empfohlen): die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
    '',
    '### Hinweise zum Ablauf',
    '- Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.',
    '',
    '### Wie es weitergeht',
    '1. Den Hinweis einarbeiten lassen (optional):',
    '   `/dv-forge:review-followup docs/forge/x/plan.md alle`',
    '2. Arbeit abschließen:',
    '   `/dv-forge:finish-work`',
  ].join('\n'));
});

test('renderImplementationReport_ReadyWithoutOpenItems_OmitsOpenAndNotesAndTopic', () => {
  // Act
  const text = renderImplementationReport(base({ topic: null, reviewerCount: 1, fileCount: 1, testCount: 0, reviewerLines: [LINES[0]] }));

  // Assert
  assert.match(text, /^## Implementierungs-Review · Ergebnis\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen\nAblauf: Prüfung aus einem Blickwinkel, keine Überarbeitung\./);
  assert.match(text, /- 1 geänderte Datei, davon 0 Tests/);
  assert.equal(text.includes('Noch offen'), false);
  assert.equal(text.includes('Hinweise zum Ablauf'), false);
  assert.match(text, /### Wie es weitergeht\n1\. Arbeit abschließen:\n   `\/dv-forge:finish-work`$/);
});

test('renderImplementationReport_Blocked_ShowsHindrancesAndRerunStep', () => {
  // Arrange
  const hindrance = { color: 'red', title: 'Fehler wird verschluckt', angles: 'Risiken', description: 'Ein Fehler bleibt unbemerkt.', recommendation: null };
  const lines = LINES.map((line) => (line.name === 'Risiken' ? { ...line, red: 2 } : line));

  // Act
  const text = renderImplementationReport(base({ openRed: 2, open: [hindrance, { ...hindrance, title: 'Zweites' }], reviewerLines: lines }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(text, /- Risiken: 2 Hindernisse, 0 Hinweise/);
  assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Fehler wird verschluckt\*\* · aus: Risiken\n  Ein Fehler bleibt unbemerkt\.\n- 🔴 \*\*Zweites\*\*/);
  assert.equal(text.includes('Vorschlag (empfohlen)'), false);
  assert.match(text, /1\. Die 2 Hindernisse einarbeiten lassen \(oder selbst beheben\):\n   `\/dv-forge:review-followup docs\/forge\/x\/plan\.md alle`\n2\. Danach erneut prüfen:\n   `\/dv-forge:implementation-review docs\/forge\/x\/plan\.md`/);
});

test('renderImplementationReport_Incomplete_NamesFailedReviewersAndOffersRerun', () => {
  // Arrange
  const lines = [...LINES.slice(0, 4), { name: 'Risiken', red: 0, yellow: 0, failed: true }];

  // Act
  const text = renderImplementationReport(base({ failedLabels: ['Risiken'], reviewerLines: lines, notes: ['Der Prüfer für Risiken ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.'] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Risiken ausgefallen/);
  assert.match(text, /- Risiken: ausgefallen/);
  assert.match(text, /1\. Den Lauf in einer frischen Session erneut starten:\n   `\/dv-forge:implementation-review docs\/forge\/x\/plan\.md`/);
});

test('renderImplementationReport_OneHindranceAndSeveralHints_UsesSingularAndPlural', () => {
  // Act
  const one = renderImplementationReport(base({ openRed: 1, open: [{ ...HINT, color: 'red' }] }));
  const many = renderImplementationReport(base({ open: [HINT, { ...HINT, title: 'Zweiter' }] }));

  // Assert
  assert.match(one, /⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(one, /1\. Das Hindernis einarbeiten lassen/);
  assert.match(many, /· 2 kleine Hinweise offen/);
  assert.match(many, /1\. Die 2 Hinweise einarbeiten lassen \(optional\):/);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/implementation-report-text.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/implementation-report-text'`

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/lib/report-text.js`:

a) Die Zeilen in `flowLine`

```js
  const count = input.reviewerCount;
  const viewpoints = count === 1 ? 'einem Blickwinkel' : `${VIEWPOINTS[count] ?? count} Blickwinkeln`;
  return `Ablauf: Prüfung aus ${viewpoints}, ${rework}, ${verify}.`;
```

ersetzen durch

```js
  return `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, ${rework}, ${verify}.`;
```

und vor `function flowLine` einfügen:

```js
function viewpointsPhrase(count) {
  return count === 1 ? 'einem Blickwinkel' : `${VIEWPOINTS[count] ?? count} Blickwinkeln`;
}
```

b) Die Exportzeile ersetzen durch `module.exports = { renderReportText, openLines, section, stepLines, viewpointsPhrase };`.

`plugins/forge/scripts/lib/implementation-report-text.js`:

```js
'use strict';

// Abschlussbericht des Implementierungs-Reviews in Klartext. Reine Funktion: Die Eingabe baut implementation-report.js.

const { openLines, section, stepLines, viewpointsPhrase } = require('./report-text');

function plural(count, one, many) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function kindOf(input, hints) {
  if (input.failedLabels.length > 0) return 'incomplete';
  if (input.openRed > 0) return 'blocked';
  return hints > 0 ? 'hints' : 'ready';
}

function resultLine(input, kind, hints) {
  if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
  if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${plural(input.openRed, 'Hindernis', 'Hindernisse')} offen`;
  const open = hints > 0 ? ` · ${hints === 1 ? '1 kleiner Hinweis' : `${hints} kleine Hinweise`} offen` : '';
  return `**Ergebnis:** ✅ Bereit zum Abschließen${open}`;
}

function checkedLines(input) {
  return [
    `- Bereich: \`${input.range}\``,
    `- ${plural(input.fileCount, 'geänderte Datei', 'geänderte Dateien')}, davon ${plural(input.testCount, 'Test', 'Tests')}`,
    `- Blickwinkel: ${input.reviewerLines.map((line) => line.name).join(', ')}`,
  ];
}

function foundLine(line) {
  if (line.failed) return `- ${line.name}: ausgefallen`;
  return `- ${line.name}: ${plural(line.red, 'Hindernis', 'Hindernisse')}, ${plural(line.yellow, 'Hinweis', 'Hinweise')}`;
}

function steps(input, kind, hints) {
  const rerun = `/dv-forge:implementation-review ${input.plan}`;
  const followup = `/dv-forge:review-followup ${input.plan} alle`;
  const finish = ['Arbeit abschließen:', '/dv-forge:finish-work'];
  if (kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
  if (kind === 'blocked') {
    const count = input.openRed === 1 ? 'Das Hindernis' : `Die ${input.openRed} Hindernisse`;
    return [[`${count} einarbeiten lassen (oder selbst beheben):`, followup], ['Danach erneut prüfen:', rerun]];
  }
  if (kind === 'hints') return [[`${hints === 1 ? 'Den Hinweis' : `Die ${hints} Hinweise`} einarbeiten lassen (optional):`, followup], finish];
  return [finish];
}

function renderImplementationReport(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const kind = kindOf(input, hintEntries.length);
  const heading = `## Implementierungs-Review · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, resultLine(input, kind, hintEntries.length), `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, keine Überarbeitung.`],
    ['### Was geprüft wurde', ...checkedLines(input)],
    ...section('Gefunden', input.reviewerLines.map(foundLine)),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section('Noch offen · kein Hindernis für das Abschließen', hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ['### Wie es weitergeht', ...stepLines(steps(input, kind, hintEntries.length))],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderImplementationReport };
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/implementation-report-text.test.js tests/report-text.test.js`
Expected: PASS (die `report-text`-Tests bestätigen, dass der Refactor das Layout nicht ändert)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/report-text.js plugins/forge/scripts/lib/implementation-report-text.js plugins/forge/tests/implementation-report-text.test.js
git commit -m "feat(forge): render the implementation review report in plain language"
```

---

### Task 6: Skript `implementation-report.js` und Guard

**Files:**
- Create: `plugins/forge/scripts/lib/implementation-report.js`
- Create: `plugins/forge/scripts/implementation-report.js`
- Modify: `plugins/forge/scripts/guard-orchestrator.js` (`ALLOWED_SCRIPTS`)
- Create: `plugins/forge/tests/implementation-report.test.js`
- Modify: `plugins/forge/tests/guard-implementation-review.test.js`

**Interfaces:**
- Consumes: `scoutTexts`, `scoutBlocks`, `checkScout` (scout-check), `reviewerLabel`, `topicOf`/`shorten` (halt-text), `renderImplementationReport` (Task 5), `reworkHeading`, `reworkLine`, `REWORK_MARK`, `SEVERITY_ICON` (aggregate-findings), `readJson`, `readText`, `readLines`, `writeText` (flow-files).
- Produces:
  - `buildReport({ dir, workspace, plan, planArg, range, packageFile }): string` — Text `ENDE <status>\n=== BERICHT ===\n<bericht>`; schreibt `<workspace>/abschluss/{aggregate.md, scout.md?, bericht.md}`.
  - CLI `node implementation-report.js --dir <D> --workspace <W> --plan <P> --bereich <B> --paket <K>`; Exit 2 bei falschem Aufruf, Exit 1 mit `dv-forge implementation-report: <grund>` bei fehlender Eingabedatei.

- [ ] **Step 1: Failing tests schreiben**

`plugins/forge/tests/implementation-report.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
const Q = (text) => `\u201E${text}\u201C`;

const YELLOW = {
  location: 'src/round.js', severity: 'yellow', reviewers: ['design'],
  items: [{ reviewer: 'design', severity: 'yellow', location: 'src/round.js:12', quote: 'q', consequence: 'Die Rundung steht doppelt', rationale: 'r' }],
};
const RED = {
  location: 'src/save.js', severity: 'red', reviewers: ['risks'],
  items: [{ reviewer: 'risks', severity: 'red', location: 'src/save.js:4', quote: 'q', consequence: 'Fehler wird verschluckt', rationale: 'r' }],
};
const GREEN = {
  location: 'src/ok.js', severity: 'green', reviewers: ['tests'],
  items: [{ reviewer: 'tests', severity: 'green', location: 'src/ok.js', quote: 'q', consequence: 'Name holpert', rationale: 'r' }],
};
const SCOUT_YELLOW = [
  '### 🟡 src/round.js', 'Titel: Rundung der Summe', 'Beschreibung: Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
  'Empfehlung: Die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.', '1. Rundung bündeln.', '**Bevorzugt: 1** — einfach.', '',
];
const SCOUT_RED = [
  '### 🔴 src/save.js', 'Titel: Fehler wird verschluckt', 'Beschreibung: Ein Fehler beim Speichern bleibt unbemerkt.',
  'Empfehlung: Den Fehler melden, weil Nutzer sonst Datenverlust nicht sehen.', '1. Fehler melden.', '**Bevorzugt: 1** — klar.', '',
];
const PACKAGE = [
  '# Review-Paket: a1b2c3d..HEAD', '', '## Commits', 'abc feat: x', '', '## Dateien',
  ' src/round.js            |  3 ++-', ' tests/round.test.js      |  5 +++++', ' src/OrderTests.cs        |  2 +-', ' src/latest.js           |  1 +',
  ' 4 files changed, 10 insertions(+), 1 deletion(-)', '', '## Diff', 'diff --git a/x b/x',
].join('\n');

function aggregateOf(groups) {
  const blocks = groups.map((group) => [`### ${{ red: '🔴', yellow: '🟡', green: '🟢' }[group.severity]} ${group.location} (${group.reviewers.join(', ')})`,
    ...group.items.map((item) => `- [${item.reviewer} · ${item.severity}] Zitat: ${Q('q')} · Konsequenz: ${item.consequence} · Begründung: r`)].join('\n'));
  return ['STATUS clean=true red=0 yellow=0 green=0 failed=-', '=== REPORT ===', 'Tabelle', '=== REWORK ===', blocks.join('\n\n'), ''].join('\n');
}

function setup({ groups = [YELLOW], reviewers = ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'], failed = [], scout = null, hints, withResult = true } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-impl-report-'));
  const dir = path.join(workspace, 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.severity] += 1;
  if (withResult) fs.writeFileSync(path.join(dir, 'ergebnis.json'), JSON.stringify({ reviewers, failed, counts, groups }));
  fs.writeFileSync(path.join(dir, 'aggregate.md'), aggregateOf(groups));
  if (scout) fs.writeFileSync(path.join(dir, 'scout.md'), ['## Scout-Vorschläge', '', ...scout].join('\n'));
  if (hints) fs.writeFileSync(path.join(workspace, 'hinweise.json'), JSON.stringify(hints));
  const plan = path.join(workspace, 'plan.md');
  fs.writeFileSync(plan, '# Bestellsumme berechnen \u2014 Plan\n\n### Task 1: Eins\n');
  const packageFile = path.join(workspace, 'review.diff');
  fs.writeFileSync(packageFile, PACKAGE);
  return { workspace, dir, plan, packageFile };
}

function report(env) {
  return spawnSync(process.execPath, [SCRIPT, '--dir', env.dir, '--workspace', env.workspace, '--plan', env.plan, '--bereich', 'a1b2c3d', '--paket', env.packageFile], { encoding: 'utf8' });
}

function read(env, ...parts) {
  return fs.readFileSync(path.join(env.workspace, 'abschluss', ...parts), 'utf8');
}

test('implementationReport_OneYellowWithValidScout_ReadyAndFilesFiltered', () => {
  // Arrange
  const env = setup({ groups: [YELLOW, GREEN], scout: SCOUT_YELLOW, hints: ['Ein Hinweis aus der Vorbereitung.'] });

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE sauber nach Review 1\n=== BERICHT ===\n## Implementierungs-Review · Ergebnis · Bestellsumme berechnen \u2014 Plan\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen\nAblauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung\./);
  assert.match(result.stdout, /- Bereich: `a1b2c3d\.\.HEAD`\n- 4 geänderte Dateien, davon 2 Tests\n- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken/);
  assert.match(result.stdout, /- Aufbau: 0 Hindernisse, 1 Hinweis\n- Tests: 0 Hindernisse, 0 Hinweise/);
  assert.match(result.stdout, /- 🟡 \*\*Rundung der Summe\*\* · aus: Aufbau\n  Die Rundung steht an zwei Stellen und kann auseinanderlaufen\.\n  Vorschlag \(empfohlen\): Die Rundung in einer Funktion bündeln/);
  assert.match(result.stdout, /### Hinweise zum Ablauf\n- Ein Hinweis aus der Vorbereitung\./);
  assert.ok(result.stdout.includes(`/dv-forge:review-followup ${env.plan} alle`));
  assert.equal(read(env, 'bericht.md'), `${result.stdout.split('=== BERICHT ===\n')[1].trimEnd()}\n`);
  const aggregate = read(env, 'aggregate.md');
  assert.ok(aggregate.includes('### 🟡 src/round.js (design)'));
  assert.equal(aggregate.includes('src/ok.js'), false);
  assert.match(read(env, 'scout.md'), /^## Scout-Vorschläge\n\n### 🟡 src\/round\.js/);
});

test('implementationReport_RedFinding_GeprueftWithHindranceAndSaveKeepsScoutBlocks', () => {
  // Arrange
  const env = setup({ groups: [RED, YELLOW], scout: [...SCOUT_RED, ...SCOUT_YELLOW] });

  // Act
  const result = report(env);

  // Assert
  assert.match(result.stdout, /^ENDE geprüft, 1 × 🔴 offen\n/);
  assert.match(result.stdout, /⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(result.stdout, /### Noch offen · Hindernis\n- 🔴 \*\*Fehler wird verschluckt\*\* · aus: Risiken/);
  assert.match(read(env, 'scout.md'), /### 🔴 src\/save\.js[\s\S]*### 🟡 src\/round\.js/);
});

test('implementationReport_FailedReviewer_UnvollstaendigWithNoteAndFailedLine', () => {
  // Arrange
  const env = setup({ groups: [], reviewers: ['acceptance', 'plan-fidelity', 'design', 'tests'], failed: ['risks'] });

  // Act
  const result = report(env);

  // Assert
  assert.match(result.stdout, /^ENDE unvollständig nach Review 1, ausgefallen: risks\n/);
  assert.match(result.stdout, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Risiken ausgefallen/);
  assert.match(result.stdout, /- Risiken: ausgefallen/);
  assert.match(result.stdout, /- Der Prüfer für Risiken ist ausgefallen\. Dieser Blickwinkel fehlt in der Prüfung\./);
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
});

test('implementationReport_ScoutMissingOrInvalid_FallbackTextNoteAndNoScoutFile', () => {
  // Arrange
  const missing = setup({ groups: [YELLOW] });
  const invalid = setup({ groups: [YELLOW], scout: SCOUT_YELLOW.filter((line) => !line.startsWith('Titel:')) });

  // Act
  const results = [report(missing), report(invalid)];

  // Assert
  for (const [index, result] of results.entries()) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- 🟡 \*\*src\/round\.js\*\* · aus: Aufbau\n  Die Rundung steht doppelt \(ohne Scout-Beschreibung\)\n/);
    assert.equal(result.stdout.includes('Vorschlag (empfohlen)'), false);
    assert.match(result.stdout, /- Der Scout hat keine gültigen Vorschläge geliefert; Beschreibungen stammen aus den Prüfergebnissen\./);
    assert.equal(fs.existsSync(path.join([missing, invalid][index].workspace, 'abschluss', 'scout.md')), false);
  }
});

test('implementationReport_NoFindingsNoHintsFile_ReadyWithoutNotes', () => {
  // Arrange
  const env = setup({ groups: [] });

  // Act
  const result = report(env);

  // Assert
  assert.match(result.stdout, /^ENDE sauber nach Review 1\n/);
  assert.equal(result.stdout.includes('Hinweise zum Ablauf'), false);
  assert.equal(read(env, 'aggregate.md'), '=== REWORK ===\n');
});

test('implementationReport_MissingErgebnis_ExitsOneWithReason', () => {
  // Arrange
  const env = setup({ withResult: false });

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge implementation-report: Datei fehlt: .*ergebnis\.json/);
});

test('implementationReport_MissingArgument_ExitsTwoWithUsage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--dir', 'x'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Aufruf: node implementation-report\.js/);
});
```


In `tests/guard-implementation-review.test.js` anhängen:

```js
test('decidePreTool_ImplementationReportScript_IsAllowedInsideProtectedRepo', () => {
  const env = setup();
  const script = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
  const command = `node "${script}" --dir "${env.cwd}/.forge/review/x/runde-1" --workspace "${env.cwd}/.forge/review/x" --plan docs/forge/x/plan.md --bereich main --paket "${env.cwd}/.forge/review/x/review.diff"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/implementation-report.test.js tests/guard-implementation-review.test.js`
Expected: FAIL (Skript fehlt; Guard blockt es)

- [ ] **Step 3: Implementieren**

`plugins/forge/scripts/guard-orchestrator.js`: in `ALLOWED_SCRIPTS` die Teilzeichenfolge `'ledger.js', 'followup.js'];` ersetzen durch `'ledger.js', 'followup.js', 'implementation-report.js'];`.

`plugins/forge/scripts/lib/implementation-report.js`:

```js
'use strict';

// Baut den Abschlussbericht des Implementierungs-Reviews und die gefilterte Sicherung (abschluss/) aus dem Arbeitsbereich.

const fs = require('node:fs');
const path = require('node:path');
const { reworkHeading, reworkLine, REWORK_MARK, SEVERITY_ICON } = require('../aggregate-findings');
const { reviewerLabel } = require('./reviewer-names');
const { topicOf, shorten } = require('./halt-text');
const { scoutTexts, scoutBlocks, checkScout } = require('./scout-check');
const { renderImplementationReport } = require('./implementation-report-text');
const { CLOSING, readText, readLines, readJson, writeText } = require('./flow-files');

const REVIEW = 'implementation-review';
const SHORT = 400;
const CANONICAL = ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'];
const TEST_PATHS = [/(^|[\\/])(tests?|__tests__)[\\/]/i, /[._-](test|spec)s?\./i, /[a-z0-9]Tests?\.[a-z0-9]+$/];
const SCOUT_NOTE = 'Der Scout hat keine gültigen Vorschläge geliefert; Beschreibungen stammen aus den Prüfergebnissen.';

function orderOf(name) {
  const index = CANONICAL.indexOf(name);
  return index === -1 ? CANONICAL.length : index;
}

function statusOf(result) {
  if (result.failed.length > 0) return `unvollständig nach Review 1, ausgefallen: ${result.failed.join(', ')}`;
  return result.counts.red === 0 ? 'sauber nach Review 1' : `geprüft, ${result.counts.red} × 🔴 offen`;
}

function changedFiles(packageText) {
  const lines = packageText.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf('## Dateien');
  const end = lines.indexOf('## Diff');
  if (start === -1) return [];
  return lines.slice(start + 1, end === -1 ? undefined : end).filter((line) => line.includes(' | ')).map((line) => line.split(' | ')[0].trim());
}

function reviewerLines(result) {
  const items = result.groups.flatMap((group) => group.items);
  const count = (name, severity) => items.filter((item) => item.reviewer === name && item.severity === severity).length;
  const label = (name) => reviewerLabel(REVIEW, name);
  const delivered = [...result.reviewers].sort((a, b) => orderOf(a) - orderOf(b))
    .map((name) => ({ order: orderOf(name), name: label(name), red: count(name, 'red'), yellow: count(name, 'yellow'), failed: false }));
  const failed = result.failed.map((name) => ({ order: orderOf(name), name: label(name), red: 0, yellow: 0, failed: true }));
  return [...delivered, ...failed].sort((a, b) => a.order - b.order).map(({ order, ...line }) => line);
}

function scoutKey(group) {
  return `${SEVERITY_ICON[group.severity]} ${group.location}`;
}

function describe(group, texts) {
  const found = texts.get(scoutKey(group));
  if (found) return { title: found.title, description: found.description, recommendation: found.recommendation };
  return { title: group.location, description: `${shorten(group.items[0].consequence, SHORT)} (ohne Scout-Beschreibung)`, recommendation: null };
}

function aggregateBlock(group) {
  return [reworkHeading(SEVERITY_ICON[group.severity], group.location, group.reviewers), ...group.items.map((item) => reworkLine(item.reviewer, item.severity, item))].join('\n');
}

function scoutState(options, open) {
  if (open.length === 0) return { valid: true, texts: new Map(), lines: [] };
  const valid = checkScout(options.dir, REVIEW) === 'SCOUT ok';
  const lines = valid ? readLines(path.join(options.dir, 'scout.md')) : [];
  return { valid, lines, texts: new Map(scoutTexts(lines).map((entry) => [`${entry.severity} ${entry.location}`, entry])) };
}

function writeClosing(options, open, scout) {
  const dir = path.join(options.workspace, CLOSING);
  fs.rmSync(dir, { recursive: true, force: true });
  writeText(path.join(dir, 'aggregate.md'), [REWORK_MARK, ...open.map(aggregateBlock)].join('\n\n'));
  const blocks = scoutBlocks(scout.lines);
  const scouted = open.map((group) => blocks.get(scoutKey(group))).filter(Boolean);
  if (scout.valid && scouted.length > 0) {
    writeText(path.join(dir, 'scout.md'), ['## Scout-Vorschläge', '', scouted.map((block) => block.join('\n').trimEnd()).join('\n\n')].join('\n'));
  }
}

function notesOf(options, result, open, scout) {
  const prepared = readJson(path.join(options.workspace, 'hinweise.json'), []);
  const failed = result.failed.map((name) => `Der Prüfer für ${reviewerLabel(REVIEW, name)} ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.`);
  return [...prepared, ...failed, ...(open.length > 0 && !scout.valid ? [SCOUT_NOTE] : [])];
}

// `options`: dir (Rundenordner), workspace (W), plan (lesbare Plan-Datei), planArg (Pfad für die Befehle), range (Basis), packageFile.
function buildReport(options) {
  const result = readJson(path.join(options.dir, 'ergebnis.json'));
  const open = result.groups.filter((group) => group.severity !== 'green');
  const scout = scoutState(options, open);
  const files = changedFiles(readText(options.packageFile));
  const status = statusOf(result);
  const text = renderImplementationReport({
    plan: options.planArg, topic: topicOf(readText(options.plan)), openRed: result.counts.red,
    reviewerCount: result.reviewers.length + result.failed.length, range: `${options.range}..HEAD`,
    fileCount: files.length, testCount: files.filter((file) => TEST_PATHS.some((pattern) => pattern.test(file))).length,
    reviewerLines: reviewerLines(result), failedLabels: result.failed.map((name) => reviewerLabel(REVIEW, name)),
    open: open.map((group) => ({ color: group.severity, ...describe(group, scout.texts), angles: group.reviewers.map((name) => reviewerLabel(REVIEW, name)).join(', ') })),
    notes: notesOf(options, result, open, scout),
  });
  writeClosing(options, open, scout);
  writeText(path.join(options.workspace, CLOSING, 'bericht.md'), text);
  return [`ENDE ${status}`, '=== BERICHT ===', text].join('\n');
}

module.exports = { buildReport, changedFiles };
```

`plugins/forge/scripts/implementation-report.js`:

```js
#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { buildReport } = require('./lib/implementation-report');
const { FlowError } = require('./lib/flow-error');

const REQUIRED = ['--dir', '--workspace', '--plan', '--bereich', '--paket'];
const USAGE = 'Aufruf: node implementation-report.js --dir <runden-ordner> --workspace <W> --plan <plan.md> --bereich <basis> --paket <datei>\n';

function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!REQUIRED.includes(args[index]) || index + 1 >= args.length) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  return REQUIRED.every((option) => values[option.slice(2)]) ? values : null;
}

function main() {
  const values = parse(process.argv.slice(2));
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${buildReport({
      dir: path.resolve(values.dir), workspace: path.resolve(values.workspace), plan: path.resolve(values.plan),
      planArg: values.plan, range: values.bereich, packageFile: path.resolve(values.paket),
    })}\n`);
  } catch (error) {
    if (!(error instanceof FlowError)) throw error;
    process.stderr.write(`dv-forge implementation-report: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/implementation-report.test.js tests/guard-implementation-review.test.js tests/guard-orchestrator.test.js`
Expected: PASS. Schlägt der Thema-Test fehl, weil die Plan-Überschrift im Test `Bestellsumme berechnen \u2014 Plan` heißt, ist das die erwartete Ausgabe (die Überschrift wird unverändert übernommen).

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts plugins/forge/tests
git commit -m "feat(forge): add the implementation report script with filtered closing files"
```

---

### Task 7: Ablauftexte

**Files:**
- Modify: `plugins/forge/shared/review-loop/loop.md`
- Modify: `plugins/forge/skills/implementation-review/SKILL.md`
- Modify: `plugins/forge/skills/review-followup/references/flow.md`
- Create: `plugins/forge/tests/implementation-report-docs.test.js`
- Modify: bestehende Doc-Tests, die die alten Texte prüfen

- [ ] **Step 1: Failing tests schreiben**

`plugins/forge/tests/implementation-report-docs.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN = path.join(__dirname, '..');
const LOOP = path.join(PLUGIN, 'shared', 'review-loop', 'loop.md');
const SKILL = path.join(PLUGIN, 'skills', 'implementation-review', 'SKILL.md');
const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');
const PRIO = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.';

function closing(text) {
  return text.slice(text.indexOf('## Abschluss'));
}

test('loop_Closing_RunsScoutCheckReportSaveShowInOrder', () => {
  const text = closing(readText(LOOP));
  const parts = ['scout-check --review implementation-review --dir "<D>"', 'implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"',
    'followup.js" save <rolle> <slug> "<W>/abschluss"', 'guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"', 'Die zwei Befehle aus \u201EJedes Ende\u201C'];
  const positions = parts.map((part) => text.indexOf(part));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(text.includes(PRIO));
  assert.ok(text.includes('die Ausgabe zeigst du nicht'));
  assert.ok(text.includes('Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>'));
});

test('loop_BuildingBlocks_ReportRowNamesTitleAndArtifactOnly', () => {
  assert.ok(readText(LOOP).includes('| Bericht | Titel und Artefakt |'));
});

test('implementationReviewSkill_Report_ComesFromScriptWithoutSelectionHint', () => {
  const { body } = readMarkdown(SKILL);
  const report = body.slice(body.indexOf('## Bericht'));
  for (const part of ['den Rest liefert `implementation-report.js`', '`<P>`, `<B>` und `<K>`', '`geprüft, k × 🔴 offen`']) assert.ok(report.includes(part), part);
  for (const gone of ['Auswahl-Hinweis', 'Auswahl: b =', 'Hinweise des Orchestrators', 'Nächster Schritt:']) assert.equal(body.includes(gone), false, gone);
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_Implementation_KeepsOnlyOpenGroupsAndOffersAlle', () => {
  const text = readText(FOLLOWUP_FLOW);
  const implementation = text.slice(text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')), text.indexOf('## Bericht'));
  assert.ok(implementation.includes('followup.js" keep review <slug> <offen>'));
  assert.ok(implementation.includes('`alle behoben, keine neuen 🔴`'));
  const next = text.slice(text.indexOf('## Nächster Schritt'));
  assert.ok(next.includes('/dv-forge:review-followup <artefakt> alle'));
  assert.equal(next.includes('mit den bisherigen Nummern'), false);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/implementation-report-docs.test.js`
Expected: FAIL (alte Texte)

- [ ] **Step 3: Texte ändern**

Per Skript (wegen typografischer Anführungszeichen), im Repo-Root. Das Skript in eine Datei schreiben und ausführen, nicht per Heredoc einbetten:

`<scratchpad>/edit-docs.js`:

```js
'use strict';

const fs = require('fs');

const OPEN = '\u201E';
const CLOSE = '\u201C';

function edit(file, steps) {
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const [from, to] of steps) {
    const found = typeof from === 'string' ? text.includes(from) : from.test(text);
    if (!found) throw new Error(`${file}: nicht gefunden: ${String(from).slice(0, 70)}`);
    text = text.replace(from, () => to);
  }
  fs.writeFileSync(file, text);
}

const root = 'plugins/forge';

edit(`${root}/shared/review-loop/loop.md`, [
  [/\| Bericht \|[^\n]*\|\n/, '| Bericht | Titel und Artefakt |\n'],
  [/\n## Abschluss\n[\s\S]*$/, `
## Abschluss
1. **Abschluss-Scout:** Nennt der Skill einen Scout und zeigt die letzte \`STATUS\`-Zeile \`red\` > 0 oder \`yellow\` > 0, startest du ihn einmal mit \`run_in_background: false\`: Eingaben aus dem Skill, dazu \`Findings: <D>/aggregate.md\` der letzten Runde und \`Ergebnis: <D>/scout.md\`. Du bewertest die Vorschläge nicht. Danach \`node "<PLUGIN>/scripts/review-flow.js" scout-check --review implementation-review --dir "<D>"\`. \`SCOUT ungültig: <grund>\`: einmal neu starten mit dem Zusatz \`Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>\`, dann weiter; das Skript behandelt einen weiter ungültigen Scout.
2. **Bericht:** \`node "<PLUGIN>/scripts/implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"\`. Die Zeile \`ENDE <status>\` ist der Status; der Text nach \`=== BERICHT ===\` ist der Bericht.
3. **Sichern:** \`node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"\`, immer; die Ausgabe zeigst du nicht.
4. Bericht im Chat: der Text nach \`=== BERICHT ===\` unverändert. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.
5. \`node "<PLUGIN>/scripts/guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"\`, dann die zwei Befehle aus ${OPEN}Jedes Ende${CLOSE}.
`],
]);

edit(`${root}/skills/implementation-review/SKILL.md`, [
  ['Jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.', 'Die `WARN`-Zeilen musst du nicht weitergeben; der Bericht enthält die Hinweise.'],
  [/\n## Bericht\n[\s\S]*$/, '\n## Bericht\nTitel `Implementierungs-Review`, Artefakt `<P>`; den Rest liefert `implementation-report.js` (Ergebnis, Prüfumfang, Offenes, Hinweise, nächste Schritte). `<P>`, `<B>` und `<K>` sind die Werte aus `prepare.js`. Status: `sauber nach Review 1`, `geprüft, k × 🔴 offen` oder `unvollständig nach Review 1, ausgefallen: <liste>`.\n'],
]);

edit(`${root}/skills/review-followup/references/flow.md`, [
  [/^3\. Ist `offen` leer: `node "<PLUGIN>\/scripts\/followup\.js" drop review <slug>`\. Sonst bleibt die alte Sicherung\. Kein Scout\.$/m,
    '3. Ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop review <slug>`. Sonst, wenn das Urteil `alle behoben, keine neuen 🔴` lautet: `node "<PLUGIN>/scripts/followup.js" keep review <slug> <offen>`. Sonst bleibt die alte Sicherung. Kein Scout.'],
  [/^- `sauber …` mit `offen` nicht leer: .*$/m, '- `sauber …` mit `offen` nicht leer: `Noch nicht umgesetzt: /dv-forge:review-followup <artefakt> alle.`'],
  [/^Auswahl: `b` = .*$/m, 'Auswahl: `alle` = alle offenen Gruppen mit dem bevorzugten Vorschlag; Expertenform `<g>:<n|b>,…` mit den Nummern der aktuellen Sicherung. Optional `--spec <pfad>` und `--base <ref>` wie beim Original-Review.'],
]);
console.log('ok');
```

Run: `node <scratchpad>/edit-docs.js` (Pfad des Scratchpad-Verzeichnisses der Session einsetzen).

Alle drei Ersetzungen betreffen `skills/review-followup/references/flow.md`; findet das Skript eine Zeile nicht, bricht es mit einer Meldung ab (dann die Zeile per `grep -n` suchen und das Muster anpassen).

- [ ] **Step 4: Bestehende Doc-Tests anpassen und laufen lassen**

Run: `cd plugins/forge && node --test tests/implementation-report-docs.test.js tests/implementation-review-skill.test.js tests/review-loop.test.js tests/review-followup-skill.test.js`
Expected: Die neuen Tests laufen grün. Alte Assertions auf die entfernten Texte schlagen fehl und werden durch gleichwertige Aussagen über den neuen Text ersetzt:
- `implementation-review-skill.test.js`: `implementationReviewSkill_Body_ReportStatusRangeAndCleanup` (prüft `<B>..HEAD` und `/dv-forge:finish-work` im Skill) auf `geprüft, k × 🔴 offen`, `<B>` und `Rolle des Arbeitsbereichs: review` beschränken; `…WarnLinesGoToOrchestratorNotes` auf den Satz `Die WARN-Zeilen musst du nicht weitergeben` ändern; `…NextStepOffersReviewFollowup` löschen (ersetzt durch den Skill-Test aus Step 1).
- `review-loop.test.js`: `loop_Closing_ScoutWritesFileAndSaveRunsBeforeCleanup` auf die neuen Teile (`Ergebnis: <D>/scout.md`, `followup.js" save <rolle> <slug> "<W>/abschluss"`, Reihenfolge `save` vor `Die zwei Befehle aus „Jedes Ende“`) umstellen; `KEIN SCOUT`, `Scout ausgefallen` und `die Ausgabe von `save`` fallen weg. Die Prüfung von `report-format.md` (`Ausgabe von followup.js save`) bleibt, weil die Datei unverändert ist.
- `review-followup-skill.test.js`: Assertions auf `<g>:<n|b>,… mit den bisherigen Nummern` und `Auswahl: \`b\` = …` auf die neuen Texte umstellen.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/shared plugins/forge/skills plugins/forge/tests
git commit -m "docs(forge): let the report script own the implementation review result and next steps"
```

---

### Task 8: Gesamtlauf und Handprobe

**Files:** keine Änderung außer Nachbesserungen.

- [ ] **Step 1: Gesamte Suite**

Run: `cd plugins/forge && node --test`
Expected: alle Tests PASS. Fehlschläge in Tests, die das alte Berichtsformat des Implementierungs-Reviews prüften, anpassen, nie Prüfungen abschwächen.

- [ ] **Step 2: Handprobe des Skripts**

Run (Git Bash, im Repo-Root):

```bash
cd plugins/forge && d=$(mktemp -d) && mkdir -p "$d/runde-1" && node -e "
const fs = require('fs');
const dir = process.argv[1];
fs.writeFileSync(dir + '/runde-1/ergebnis.json', JSON.stringify({ reviewers: ['design'], failed: [], counts: { red: 0, yellow: 1, green: 0 }, groups: [{ location: 'src/a.js', severity: 'yellow', reviewers: ['design'], items: [{ reviewer: 'design', severity: 'yellow', location: 'src/a.js:1', quote: 'q', consequence: 'Doppelte Rundung', rationale: 'r' }] }] }));
fs.writeFileSync(dir + '/runde-1/aggregate.md', '=== REWORK ===\n### 🟡 src/a.js (design)\n- [design · yellow] Zitat: x · Konsequenz: Doppelte Rundung · Begründung: r\n');
fs.writeFileSync(dir + '/plan.md', '# Probe\n');
fs.writeFileSync(dir + '/p.diff', '## Dateien\n src/a.js | 1 +\n\n## Diff\n');
" "$d" && node scripts/implementation-report.js --dir "$d/runde-1" --workspace "$d" --plan "$d/plan.md" --bereich main --paket "$d/p.diff"
```

Expected: `ENDE sauber nach Review 1`, dann `=== BERICHT ===` mit Kopf `## Implementierungs-Review · Ergebnis · Probe`, dem Abschnitt „Noch offen · kein Hindernis für das Abschließen" im Rückfalltext (`(ohne Scout-Beschreibung)`), dem Hinweis zum ungültigen Scout und den zwei Schritten (`review-followup … alle`, `finish-work`).

- [ ] **Step 3: Ablauf-Probe nach dem Zusammenführen (Mensch)**

Ein `/dv-forge:implementation-review <plan>` laufen lassen. Beobachten: Der Bericht enthält Bereich, Dateizahl, Blickwinkel, offene Punkte mit genau einem empfohlenen Vorschlag und keine Dateistellen; danach `/dv-forge:review-followup <plan> alle`. Nach einem sauberen Followup enthält die Sicherung (`.forge/followup/review/<slug>/`) nur noch die nicht gewählten Gruppen.

- [ ] **Step 4: Abschluss**

`git status` prüfen (nur Dateien dieses Plans). Kein Version-Bump; den macht der Mensch beim Zusammenführen aller Teile. Damit sind TP-A bis TP-C2 abgeschlossen.
