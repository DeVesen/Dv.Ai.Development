# Review-Ablauf: einmal suchen, Skript entscheidet — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-09-28-review-ablauf-regelwerk/plan.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Spec- und Plan-Review laufen nach einem gemeinsamen Ablauf mit höchstens zwei Runden (Suche, Nachprüfung) und einer Nacharbeit, in dem ein Skript aus der Kategorie jedes Findings Farbe, Herabstufung, Verwerfen, Prüfliste, geänderte Bereiche und Status ableitet.
**Architektur:** Ein neues CLI `plugins/forge/scripts/review-flow.js` führt jeden mechanischen Schritt des Ablaufs aus und stützt sich auf kleine Module unter `plugins/forge/scripts/lib/` (Stellen eines Dokuments, Regelwerk, Gruppen, Fragen, Bericht). Die Orchestrator-Skills `spec-review` und `plan-review` folgen der neuen Ablauf-Doku `plugins/forge/shared/review-flow/flow.md`; das Implementierungs-Review bleibt bei `shared/review-loop/loop.md` und verliert nur die Hochstufung. Reviewer liefern eine Kategorie statt einer Farbe, je Review prüft ein neuer Nachprüfer-Agent Runde 2.
**Tech-Stack:** Node.js (CommonJS, nur `node:`-Module), `node:test`, Markdown-Agenten und -Skills des Plugins dv-forge.
**Spec:** docs/forge/2026-09-28-review-ablauf-regelwerk/spec.md
**Basis:** ee90f54

## Global Constraints
- Alle Pfade im Plan sind relativ zur Checkout-Wurzel; die Tests laufen im Ordner `plugins/forge` mit `node --test "tests/*.test.js"` (einzelne Datei: `node --test tests/<datei>.test.js`). Das Verzeichnis-Argument `node --test tests/` und `node --test` ohne Argument sind verboten: Sie finden auch Skripte unter `scripts/toolchain/` und Fixture-Tests.
- Deckel: höchstens zwei Runden je Lauf und höchstens eine Nacharbeit, für Spec- und Plan-Review gleich; kein Schalter erlaubt mehr Runden.
- Mechanisch: Farbe, Filter, Herabstufungen, Deckel, Prüfliste, geänderte Bereiche und Status bestimmt ein Skript ohne Urteil einer KI; gleiche Findings und Urteile ergeben immer dieselben Farben, denselben Ablauf und denselben Status.
- Urteil der KI nur für: ob etwas ein Finding ist und welche Kategorie, Scout-Vorschläge, Text der Nacharbeit, Bündelung der Fragen je Regel, ob eine Antwort eine Frage beantwortet, Urteile der Nachprüfung.
- Kategorien und Farben: `widerspruch` → 🔴, `fehlendes-verhalten` → 🔴, `unerfuellbar` → 🔴, `ac-fehlt-im-plan` → 🔴 (nur Plan-Review), `umsetzer-steckt-fest` → 🔴 (nur Plan-Review, auch für verbotene Befehle), `detail` → 🟡, `formulierung` → 🟢.
- Stelle: kleinste benannte Einheit (AC, Schritt, benannte Soll-Vorgabe, im Plan ein Task), sonst der Abschnitt; ein Finding über mehrere Stellen gehört zur ersten im Feld Stelle genannten, eines ohne Einheit zum Abschnitt seines Zitats; Gruppe, Filter, Prüfliste, Herabstufung und geänderter Bereich nutzen dieselbe Einheit.
- Ungültiges Finding (nur Spec- und Plan-Review): unbekannte Kategorie, fehlendes Pflichtfeld (Stelle, Zitat, Kategorie, Konsequenz, Begründung) oder eine Farbe im Finding machen das Ergebnis des Reviewers ungültig.
- Nachforderung: Liefert eine Instanz kein gültiges Ergebnis, wird sie genau einmal nachgefordert und danach genau einmal neu gestartet; danach gilt sie als ausgefallen. Für die Nacharbeit gilt das einmal für die ganze Nacharbeit.
- Höchstens 🟡: beratende Reviewer (je Review festgelegt, heute keiner), Zitat ganz aus einem W-Eintrag, eines der Wörter `Großschreibung`, `Kleinschreibung`, `ß`, `Umlaut`, `Diakritik` als ganzes Wort in irgendeinem Feld, in der Nachprüfung jedes Finding außerhalb der Prüfliste außer Widerspruch im geänderten Bereich und Befund einer Skript-Prüfung.
- Entfällt: Findings zu den Kopfzeilen `Status`, `Art`, `Workitem`, `Basis` und Findings an einer Stelle mit offener Frage (Befunde einer Skript-Prüfung ausgenommen, W-Eintrag „Skript-Befund an offener Frage“).
- Offene Frage: R-Eintrag `- **R<n> · <Stelle>** — frage an den menschen — <Frage>` im Abschnitt `Entscheidungen`, offen bis ein späterer W-Eintrag die Stelle als ganzes Wort (kein Buchstabe, keine Ziffer, kein `-`, kein `_` davor oder danach, exakte Form) im Titel nennt.
- Status in dieser Rangfolge: `unvollständig, ausgefallen: <liste>` → `Fragen offen` → `nicht bereit, k × 🔴 offen` → `sauber nach Runde 1` / `sauber nach Nachprüfung`.
- Begriffe: Runde (nicht Durchlauf), Lauf, Nachprüfung (nicht Nach-Review, Re-Review), Hinweis für ein 🟡-Finding, Kategorie.
- Das Implementierungs-Review bleibt, wie es ist, außer: zwei 🟡 an einer Stelle werden nicht mehr zu 🔴.
- Orchestratoren starten jedes Skript als einzelnen `node`-Aufruf ohne Verkettung; neue Skripte, die ein Orchestrator aufruft, stehen in `ALLOWED_SCRIPTS` von `plugins/forge/scripts/guard-orchestrator.js`.
- Skill-Bodies bleiben unter 500 Wörtern; Frontmatter nur `name`, `description` (beginnt mit „Use when“) und die vorhandenen Felder.
- Planungs-Skills: `forge-config.js get Planungs-Skills` ist leer; es gelten keine zusätzlichen Kernregeln.

---

### Task 1: Hochstufung 2 × 🟡 → 🔴 entfernen

**ACs:** AC-33, AC-34

**Dateien:**
- Modify: `plugins/forge/scripts/aggregate-findings.js:122-127` · `rateGroup`, `formatEscalated`, `formatReworkGroup`, `render`
- Modify: `plugins/forge/shared/review-loop/severity-rules.md` · `3. Stufe der Gruppe`
- Test: `plugins/forge/tests/aggregate-rate.test.js` · `aggregate_YellowFromTwoReviewers_EscalatesToRed`
- Test: `plugins/forge/tests/aggregate-file.test.js` · `run_FileTypes_GroupsAcrossReviewersAndEscalates`
- Test: `plugins/forge/tests/review-loop.test.js` · `reportFormat_Generic_TitleAndSkillSpecificParts`

**Interfaces:**
- Consumes: —
- Produces: `aggregate(reviews, types)` liefert Gruppen `{ key, location, items, reviewers, severity }` ohne Feld `escalated`; `render` gibt keine Zeile `HOCHGESTUFT` mehr aus.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/aggregate-rate.test.js` ersetzen:
  ```js
  assert.equal(group.severity, 'red');
  assert.equal(group.escalated, false);
});

test('aggregate_YellowFromTwoReviewers_EscalatesToRed', () => {
  const [group] = aggregate([
    review('consistency', [finding()]),
    review('clarity', [finding()]),
  ]);
  assert.equal(group.severity, 'red');
  assert.equal(group.escalated, true);
});
  ```
  durch:
  ```js
  assert.equal(group.severity, 'red');
});

test('aggregate_YellowFromTwoReviewers_StaysYellow', () => {
  const [group] = aggregate([
    review('consistency', [finding()]),
    review('clarity', [finding()]),
  ]);
  assert.equal(group.severity, 'yellow');
  assert.equal(Object.hasOwn(group, 'escalated'), false);
});

test('aggregate_RedWithoutCategory_StaysRed', () => {
  const [group] = aggregate([review('risks', [finding({ severity: 'red' })])]);
  assert.equal(group.severity, 'red');
});
  ```
  Im selben File ersetzen:
  ```js
  assert.equal(lines[2], 'HOCHGESTUFT -');
});

test('render_YellowFromTwoReviewers_ListsEscalatedLocation', () => {
  const text = [block(review('completeness', [finding()])), block(review('clarity', [finding()]))].join('\n');
  const lines = render(run(text, ['completeness', 'clarity'])).split('\n');
  assert.equal(lines[0], 'STATUS clean=false red=1 yellow=0 green=0 failed=-');
  assert.equal(lines[1], 'EINGELESEN completeness=0/1/0 clarity=0/1/0 · 2 Findings an 1 Stellen');
  assert.equal(lines[2], 'HOCHGESTUFT AC-07');
});
  ```
  durch:
  ```js
  assert.equal(lines[2], '=== REPORT ===');
});

test('render_YellowFromTwoReviewers_StaysYellowWithoutEscalationLine', () => {
  const text = [block(review('completeness', [finding()])), block(review('clarity', [finding()]))].join('\n');
  const output = render(run(text, ['completeness', 'clarity']));
  const lines = output.split('\n');
  assert.equal(lines[0], 'STATUS clean=true red=0 yellow=1 green=0 failed=-');
  assert.equal(lines[1], 'EINGELESEN completeness=0/1/0 clarity=0/1/0 · 2 Findings an 1 Stellen');
  assert.ok(!output.includes('HOCHGESTUFT'));
  assert.ok(!output.includes('hochgestuft'));
  assert.ok(output.includes('### 🟡 AC-07 (completeness, clarity)'));
});
  ```
  In `plugins/forge/tests/aggregate-file.test.js` ersetzen:
  ```js
test('run_FileTypes_GroupsAcrossReviewersAndEscalates', () => {
  const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
  const { groups, status } = run(text, ['design', 'risks'], TYPES);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, 'red');
  assert.equal(status.counts.red, 1);
});
  ```
  durch:
  ```js
test('run_FileTypes_GroupsAcrossReviewersAndStaysYellow', () => {
  const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
  const { groups, status } = run(text, ['design', 'risks'], TYPES);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, 'yellow');
  assert.equal(status.counts.red, 0);
  assert.equal(status.counts.yellow, 1);
});
  ```
  und `assert.match(result.stdout, /^STATUS clean=false red=1 yellow=0 green=0 failed=-/);` durch `assert.match(result.stdout, /^STATUS clean=true red=0 yellow=1 green=0 failed=-/);`.
  In `plugins/forge/tests/review-loop.test.js` direkt vor `test('reportFormat_Generic_TitleAndSkillSpecificParts', () => {` einfügen:
  ```js
test('severityRules_TwoYellow_NoLongerEscalate', () => {
  const text = readText(path.join(SHARED, 'severity-rules.md'));
  assert.ok(!text.includes('hochgestuft'));
  assert.ok(text.includes('3. Stufe der Gruppe = höchste Stufe ihrer Einzel-Findings. Zwei 🟡 an einer Stelle bleiben 🟡.'));
  assert.ok(text.includes('4. Sortierung 🔴 → 🟡 → 🟢.'));
});

  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/aggregate-rate.test.js tests/aggregate-file.test.js tests/review-loop.test.js` — erwartet: FAIL `aggregate_YellowFromTwoReviewers_StaysYellow`, `render_YellowFromTwoReviewers_StaysYellowWithoutEscalationLine`, `run_FileTypes_GroupsAcrossReviewersAndStaysYellow`, `cli_RepoFlag_GroupsFileLocations`, `severityRules_TwoYellow_NoLongerEscalate`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/aggregate-findings.js`:
  - In `rateGroup` die Zeilen `const escalated = highest === 'yellow' && reviewers.length >= 2;` und `return { ...group, reviewers, escalated, severity: escalated ? 'red' : highest };` ersetzen durch `return { ...group, reviewers, severity: highest };`.
  - Die ganze Funktion `formatEscalated` löschen.
  - In `formatReworkGroup` die Zeile `const escalation = group.escalated ? ' · hochgestuft' : '';` löschen und die Kopfzeile ersetzen durch:
    ```js
  const header = `### ${SEVERITY_ICON[group.severity]} ${group.location} (${group.reviewers.join(', ')})`;
    ```
  - In `render` die Zeile `formatEscalated(result.groups),` löschen.
  In `plugins/forge/shared/review-loop/severity-rules.md` die Punkte 3 bis 5 ersetzen durch:
  ```markdown
3. Stufe der Gruppe = höchste Stufe ihrer Einzel-Findings. Zwei 🟡 an einer Stelle bleiben 🟡.
4. Sortierung 🔴 → 🟡 → 🟢.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/aggregate-findings.js plugins/forge/shared/review-loop/severity-rules.md plugins/forge/tests/aggregate-rate.test.js plugins/forge/tests/aggregate-file.test.js plugins/forge/tests/review-loop.test.js` · `git commit -m "fix(forge): two yellow findings at one location stay yellow"`

### Task 2: Stellen eines Dokuments und offene Fragen

**ACs:** AC-25, AC-48

**Dateien:**
- Create: `plugins/forge/scripts/lib/document-units.js`
- Test: `plugins/forge/tests/document-units.test.js`

**Interfaces:**
- Consumes: `normalizeLocation(location)` aus `plugins/forge/scripts/aggregate-findings.js`
- Produces:
  - `parseUnits(text) → { units: Unit[], sectionUnits: Map<canon, Unit> }`, `Unit = { key: string, canon: string, section: string, kind: 'header'|'section'|'decisions'|'item'|'task', lines: string[] }`
  - `resolveUnit(finding, model) → { key, canon, kind, section }` (`kind: 'external'`, wenn die Stelle nicht im Dokument steht)
  - `wEntries(text) → [{ title, line, index }]`
  - `openQuestions(text) → [{ key, canon, question, index }]`
  - `quoteFromW(quote, text) → boolean`
  - `changedUnits(before, after) → [{ key, canon }]`
  - `collapse(text) → string`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/document-units.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const units = require('../scripts/lib/document-units.js');

const SPEC = [
  '# Demo',
  '',
  'Status: bestätigt am 2026-09-28',
  'Art: verankert',
  'Basis: 3ce509e',
  '',
  '## Theoretisches Verhalten nach Umsetzung',
  '1. **Runde 1, Suche:** Alle Reviewer prüfen.',
  '2. **Einstufung:** Ein Skript leitet ab.',
  '',
  'Ein neuer Lauf sucht wieder.',
  '',
  '## Soll-Vorgaben',
  '- **Deckel:** Höchstens zwei Runden.',
  '- **Kategorien und Farben:** · Aussage',
  '  - `widerspruch` → rot',
  '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-04** Gegeben C, dann D.',
  '- **AC-041** Gegeben E, dann F.',
  '',
  '## Entscheidungen',
  '- **W · Deckel** · Aussage — Zwei Runden.',
  '- **R1 · AC-04** — frage an den menschen — Gilt D auch leer?',
  '- **R1 · Soll-Vorgaben** — frage an den menschen — Welche Grenze?',
  '',
].join('\n');

const PLAN = [
  '# Demo — Umsetzungsplan',
  '',
  '**Ziel:** Demo.',
  '**Basis:** abc1234',
  '',
  '## Global Constraints',
  '- Node 20',
  '',
  '---',
  '',
  '### Task 1: Eins',
  'Schritt eins.',
  '',
  '### Task 2: Zwei',
  'Schritt zwei.',
  '',
  '## Entscheidungen',
  '- Keine Fragen an den Menschen.',
  '',
].join('\n');

const keyOf = (text, finding) => units.resolveUnit(finding, units.parseUnits(text)).key;

test('parseUnits_Spec_NamesHeaderStepsSollVorgabenAndAcs', () => {
  const keys = units.parseUnits(SPEC).units.map((unit) => `${unit.kind}:${unit.key}`);
  for (const key of ['header:Status', 'header:Art', 'header:Basis', 'item:Runde 1, Suche', 'item:Einstufung', 'item:Deckel',
    'item:Kategorien und Farben', 'item:AC-01', 'item:AC-04', 'section:Akzeptanzkriterien', 'decisions:Entscheidungen']) {
    assert.ok(keys.includes(key), `${key} fehlt`);
  }
});

test('parseUnits_Plan_TaskIsTheUnit', () => {
  const keys = units.parseUnits(PLAN).units.map((unit) => `${unit.kind}:${unit.key}`);
  for (const key of ['header:Basis', 'section:Global Constraints', 'task:Task 1', 'task:Task 2', 'decisions:Entscheidungen']) {
    assert.ok(keys.includes(key), `${key} fehlt`);
  }
});

test('resolveUnit_SeveralStellen_FirstNamedInLocationWins', () => {
  assert.equal(keyOf(SPEC, { location: 'AC-04, AC-01', quote: 'x' }), 'AC-04');
  assert.equal(keyOf(SPEC, { location: 'Deckel und AC-01', quote: 'x' }), 'Deckel');
});

test('resolveUnit_AcSpelledShort_MatchesAcOfDocument', () => {
  assert.equal(keyOf(SPEC, { location: 'ac-1', quote: 'x' }), 'AC-01');
  assert.equal(keyOf(SPEC, { location: 'AC-041', quote: 'x' }), 'AC-041');
});

test('resolveUnit_NoNamedUnit_SectionOfQuote', () => {
  assert.equal(keyOf(SPEC, { location: 'irgendwo', quote: 'Ein neuer Lauf sucht wieder.' }), 'Theoretisches Verhalten nach Umsetzung');
  assert.equal(keyOf(SPEC, { location: 'irgendwo', quote: 'Höchstens zwei Runden.' }), 'Soll-Vorgaben');
  assert.equal(keyOf(PLAN, { location: 'irgendwo', quote: 'Schritt zwei.' }), 'Task 2');
});

test('resolveUnit_HeaderLine_IsHeaderUnit', () => {
  const model = units.parseUnits(SPEC);
  assert.equal(units.resolveUnit({ location: 'Basis', quote: 'x' }, model).kind, 'header');
  assert.equal(units.resolveUnit({ location: 'Kopfzeile Status', quote: 'x' }, model).kind, 'header');
  assert.notEqual(units.resolveUnit({ location: 'Status am Ende', quote: 'Ein neuer Lauf sucht wieder.' }, model).kind, 'header');
});

test('resolveUnit_PlanReviewAcNotInPlan_KeepsAcKey', () => {
  assert.equal(keyOf(PLAN, { location: 'AC-07', quote: 'x' }), 'AC-07');
});

test('openQuestions_RWithoutLaterW_IsOpen', () => {
  assert.deepEqual(units.openQuestions(SPEC).map((question) => question.key), ['AC-04', 'Soll-Vorgaben']);
});

test('openQuestions_LaterWWithStelleInTitle_Answers', () => {
  const text = `${SPEC}- **W · AC-04 und Soll-Vorgaben** · Aussage — Ja.\n`;
  assert.deepEqual(units.openQuestions(text), []);
});

test('openQuestions_EarlierWWithSameStelle_DoesNotAnswer', () => {
  const text = SPEC.replace('- **W · Deckel** · Aussage — Zwei Runden.', '- **W · AC-04** · Aussage — Alt.');
  assert.deepEqual(units.openQuestions(text).map((question) => question.key), ['AC-04', 'Soll-Vorgaben']);
});

test('openQuestions_StelleMustBeWholeWordInExactForm', () => {
  const openAfter = (title) => units.openQuestions(`${SPEC}- **W · ${title}** · Aussage — x.\n`).map((question) => question.key);
  for (const title of ['AC-041', 'AC-04-b', 'ac-04', 'Soll']) assert.ok(openAfter(title).includes('AC-04'), title);
  assert.ok(openAfter('Soll').includes('Soll-Vorgaben'));
  for (const title of ['AC-04,', 'AC-04 und AC-07']) assert.ok(!openAfter(title).includes('AC-04'), title);
});

test('quoteFromW_WholeQuoteInsideWEntry_True', () => {
  assert.equal(units.quoteFromW('Zwei  Runden.', SPEC), true);
  assert.equal(units.quoteFromW('Höchstens zwei Runden. ↔ Zwei Runden.', SPEC), false);
  assert.equal(units.quoteFromW('', SPEC), false);
});

test('changedUnits_OnlyDecisionsChanged_Empty', () => {
  const after = `${SPEC}- **W · AC-04** · Aussage — Ja.\n`;
  assert.deepEqual(units.changedUnits(SPEC, after), []);
});

test('changedUnits_AcAndSectionTextChanged_ListsBoth', () => {
  const after = SPEC.replace('Gegeben C, dann D.', 'Gegeben C, dann E.').replace('Ein neuer Lauf sucht wieder.', 'Ein neuer Lauf sucht neu.');
  assert.deepEqual(units.changedUnits(SPEC, after).map((unit) => unit.key), ['Theoretisches Verhalten nach Umsetzung', 'AC-04']);
});

test('changedUnits_WhitespaceOnly_NotChanged', () => {
  assert.deepEqual(units.changedUnits(SPEC, SPEC.replace('Gegeben C, dann D.', 'Gegeben C,  dann D.')), []);
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/document-units.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/document-units.js'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/document-units.js`:
  ```js
'use strict';

const { normalizeLocation } = require('../aggregate-findings');

// Stellen eines Dokuments: Kopfzeile, Abschnitt, benannte Einheit (AC, Schritt, Soll-Vorgabe) oder Task.
const HEAD_KEY = 'Kopf';
const HEADER_LINE = /^\*{0,2}(Status|Art|Workitem|Basis):\*{0,2}/;
const HEADER_LOCATION = /^(?:Kopfzeile\s+)?`?(Status|Art|Workitem|Basis)`?:?$/i;
const SECTION = /^## +(.+?)\s*$/;
const TASK = /^### +Task +(\d+):/;
const NAMED_ITEM = /^(?:[-*]|\d+\.) +\*\*(.+?)\*\*/;
const NUMBERING = /^\d+(?:\.\d+)*\.?\s+/;
const W_ENTRY = /^- \*\*W · (.+?)\*\*/;
const R_QUESTION = /^- \*\*R\d+ · (.+?)\*\* — frage an den menschen — (.*)$/;
const EDGE_BEFORE = '(?<![\\p{L}\\p{N}_-])';
const EDGE_AFTER = '(?![\\p{L}\\p{N}_-])';
const PATTERN_KEY = new RegExp(`${EDGE_BEFORE}(AC-\\d+|Task \\d+)${EDGE_AFTER}`, 'iu');

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collapse(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function lines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function newUnit(key, section, kind) {
  return { key, canon: normalizeLocation(key), section, kind, lines: [] };
}

function sectionUnit(line) {
  const key = SECTION.exec(line)[1].replace(NUMBERING, '');
  const unit = newUnit(key, key, /Entscheidungen$/.test(key) ? 'decisions' : 'section');
  unit.lines.push(line);
  return unit;
}

function lineUnit(line, section, current) {
  const header = section.key === HEAD_KEY ? HEADER_LINE.exec(line) : null;
  if (header) return { unit: newUnit(header[1], HEAD_KEY, 'header'), next: section };
  const task = TASK.exec(line);
  if (task) return { unit: newUnit(`Task ${task[1]}`, `Task ${task[1]}`, 'task') };
  if (section.kind === 'decisions' || current.kind === 'task') return { target: current };
  const item = NAMED_ITEM.exec(line);
  if (item) return { unit: newUnit(item[1].replace(/:$/, '').trim(), section.key, 'item') };
  const continues = current.kind === 'item' && (line.trim() === '' || /^\s/.test(line));
  return { target: continues ? current : section };
}

function parseUnits(text) {
  let section = newUnit(HEAD_KEY, HEAD_KEY, 'section');
  let current = section;
  const units = [section];
  for (const line of lines(text)) {
    if (SECTION.test(line)) {
      section = sectionUnit(line);
      current = section;
      units.push(section);
      continue;
    }
    const { unit, next, target } = lineUnit(line, section, current);
    if (unit) {
      unit.lines.push(line);
      units.push(unit);
      current = next ?? unit;
    } else {
      target.lines.push(line);
      current = target;
    }
  }
  const sectionUnits = new Map(units.filter((unit) => unit.kind !== 'item' && unit.kind !== 'header').map((unit) => [unit.canon, unit]));
  return { units, sectionUnits };
}

function unitText(unit) {
  return unit.lines.map(collapse).filter(Boolean).join('\n');
}

function keyPattern(key, flags) {
  return new RegExp(`${EDGE_BEFORE}${escapeRegExp(key)}${EDGE_AFTER}`, flags);
}

function earliestKey(location, model) {
  let best = null;
  const consider = (key, index) => {
    if (index === -1) return;
    if (!best || index < best.index || (index === best.index && key.length > best.key.length)) best = { key, index };
  };
  for (const unit of model.units) if (unit.kind !== 'header') consider(unit.key, location.search(keyPattern(unit.key, 'iu')));
  const pattern = PATTERN_KEY.exec(location);
  if (pattern) consider(pattern[1], pattern.index);
  return best;
}

function knownUnit(key, model) {
  const canon = normalizeLocation(key);
  return model.units.find((unit) => unit.canon === canon) ?? { key, canon, kind: 'external', section: null };
}

function unitOfQuote(quote, model) {
  const parts = String(quote).split(' ↔ ').map(collapse).filter(Boolean);
  for (const part of parts) {
    const unit = model.units.find((candidate) => collapse(candidate.lines.join(' ')).includes(part));
    if (unit) return unit.kind === 'task' ? unit : model.sectionUnits.get(normalizeLocation(unit.section));
  }
  return null;
}

// Stelle eines Findings: die erste im Feld Stelle genannte Einheit, sonst der Abschnitt seines Zitats.
function resolveUnit(finding, model) {
  const location = collapse(finding.location ?? '');
  const header = HEADER_LOCATION.exec(location);
  if (header) return { key: header[1], canon: normalizeLocation(header[1]), kind: 'header', section: HEAD_KEY };
  const hit = earliestKey(location, model);
  if (hit) return knownUnit(hit.key, model);
  return unitOfQuote(finding.quote ?? '', model) ?? { key: location, canon: normalizeLocation(location), kind: 'external', section: null };
}

function numberedLines(text) {
  return lines(text).map((line, index) => ({ line, index }));
}

function wEntries(text) {
  return numberedLines(text)
    .map(({ line, index }) => ({ match: W_ENTRY.exec(line), line, index }))
    .filter(({ match }) => match)
    .map(({ match, line, index }) => ({ title: match[1], line, index }));
}

// Offen ist ein R-Eintrag „frage an den menschen“, bis ein späterer W-Eintrag seine Stelle im Titel nennt.
function openQuestions(text) {
  const entries = wEntries(text);
  return numberedLines(text)
    .map(({ line, index }) => ({ match: R_QUESTION.exec(line), index }))
    .filter(({ match }) => match)
    .map(({ match, index }) => ({ key: match[1], canon: normalizeLocation(match[1]), question: match[2], index }))
    .filter((question) => !entries.some((entry) => entry.index > question.index && keyPattern(question.key, 'u').test(entry.title)));
}

function quoteFromW(quote, text) {
  const wanted = collapse(quote);
  return wanted !== '' && wEntries(text).some((entry) => collapse(entry.line).includes(wanted));
}

function comparableUnits(text) {
  const map = new Map();
  for (const unit of parseUnits(text).units) {
    if (unit.kind !== 'decisions' && unit.kind !== 'header') map.set(unit.canon, { key: unit.key, text: unitText(unit) });
  }
  return map;
}

// Geänderte Bereiche: Stellen, deren Text sich zwischen vorher und nachher unterscheidet; Entscheidungen zählen nicht.
function changedUnits(before, after) {
  const old = comparableUnits(before);
  const now = comparableUnits(after);
  const keys = [...now.keys(), ...[...old.keys()].filter((key) => !now.has(key))];
  return keys
    .filter((key) => old.get(key)?.text !== now.get(key)?.text)
    .map((key) => ({ key: (now.get(key) ?? old.get(key)).key, canon: key }));
}

module.exports = { parseUnits, resolveUnit, wEntries, openQuestions, quoteFromW, changedUnits, collapse };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/document-units.test.js` — erwartet: PASS, 15 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/document-units.js plugins/forge/tests/document-units.test.js` · `git commit -m "feat(forge): resolve review locations, open questions and changed areas of a document"`

### Task 3: Regelwerk — Kategorie, Farbe, Herabstufung, Verwerfen

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-06, AC-07, AC-08, AC-09, AC-10, AC-20, AC-24, AC-38, AC-39, AC-47

**Dateien:**
- Create: `plugins/forge/scripts/lib/review-rules.js`
- Test: `plugins/forge/tests/review-rules.test.js`

**Interfaces:**
- Consumes: —
- Produces:
  - Konstanten `CATEGORY_COLOR`, `CATEGORIES` (`{ 'spec-review': string[], 'plan-review': string[] }`), `ADVISORY` (`{ 'spec-review': [], 'plan-review': [] }`), `COLOR_RANK`, `COLOR_ICON`, `SCRIPT_CATEGORY = 'skript-pruefung'`
  - `reviewProblem(review, kind, name) → string | null`
  - `findingProblem(finding, kind) → string | null`
  - `mentionsSpelling(finding) → boolean`
  - `rateFinding(finding, reviewer, unit, ctx) → { dropped: string } | { color: 'red'|'yellow'|'green', capped: string[] }` mit `ctx = { advisory: string[], openKeys: Set<canon>, quoteFromW(quote) → boolean, verification: { checklist: Set<canon>, changed: Set<canon> } | null }`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-rules.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../scripts/lib/review-rules.js');

const finding = (overrides = {}) => ({
  location: 'AC-07', quote: 'q', category: 'detail', consequence: 'c', rationale: 'r', ...overrides,
});
const unit = (key = 'AC-07', kind = 'item') => ({ key, canon: key.toLowerCase().replace(/-0*/, '-'), kind });
const ctx = (overrides = {}) => ({ advisory: [], openKeys: new Set(), quoteFromW: () => false, verification: null, ...overrides });
const rate = (overrides, context = ctx(), target = unit(), reviewer = 'clarity') => rules.rateFinding(finding(overrides), reviewer, target, context);

test('rateFinding_RedCategories_AreRed', () => {
  for (const category of ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'ac-fehlt-im-plan', 'umsetzer-steckt-fest']) {
    assert.equal(rate({ category }).color, 'red', category);
  }
});

test('rateFinding_DetailAndFormulierung_AreYellowAndGreen', () => {
  assert.equal(rate({ category: 'detail' }).color, 'yellow');
  assert.equal(rate({ category: 'formulierung' }).color, 'green');
});

test('reviewProblem_PlanCategoryOrUnknownInSpecReview_Invalid', () => {
  const review = (category) => ({ reviewer: 'clarity', findings: [finding({ category })] });
  assert.match(rules.reviewProblem(review('ac-fehlt-im-plan'), 'spec-review', 'clarity'), /unbekannte Kategorie: ac-fehlt-im-plan/);
  assert.match(rules.reviewProblem(review('stil'), 'spec-review', 'clarity'), /unbekannte Kategorie: stil/);
  assert.equal(rules.reviewProblem(review('ac-fehlt-im-plan'), 'plan-review', 'clarity'), null);
});

test('reviewProblem_MissingRationaleOrOtherField_Invalid', () => {
  for (const field of ['location', 'quote', 'category', 'consequence', 'rationale']) {
    const broken = finding();
    delete broken[field];
    assert.match(rules.reviewProblem({ reviewer: 'clarity', findings: [broken] }, 'spec-review', 'clarity'), new RegExp(`ohne Pflichtfeld ${field}`));
  }
  assert.match(rules.reviewProblem({ reviewer: 'clarity', findings: [finding({ rationale: '  ' })] }, 'spec-review', 'clarity'), /Pflichtfeld rationale/);
});

test('reviewProblem_FindingWithColor_Invalid', () => {
  const review = { reviewer: 'clarity', findings: [finding({ severity: 'red' })] };
  assert.match(rules.reviewProblem(review, 'spec-review', 'clarity'), /nennt eine Farbe \(severity\)/);
  assert.match(rules.reviewProblem({ reviewer: 'clarity', findings: [finding({ color: 'red' })] }, 'plan-review', 'clarity'), /Farbe/);
});

test('reviewProblem_WrongNameOrNoFindings_Invalid', () => {
  assert.match(rules.reviewProblem({ reviewer: 'x', findings: [] }, 'spec-review', 'clarity'), /passt nicht/);
  assert.match(rules.reviewProblem({ reviewer: 'clarity' }, 'spec-review', 'clarity'), /findings fehlt/);
  assert.equal(rules.reviewProblem({ reviewer: 'clarity', summary: 's', findings: [] }, 'spec-review', 'clarity'), null);
});

test('rateFinding_AdvisoryReviewerContradiction_CappedYellow', () => {
  const result = rate({ category: 'widerspruch' }, ctx({ advisory: ['profiles'] }), unit(), 'profiles');
  assert.equal(result.color, 'yellow');
  assert.deepEqual(result.capped, ['beratend']);
  assert.equal(rate({ category: 'widerspruch' }, ctx({ advisory: ['profiles'] }), unit(), 'clarity').color, 'red');
});

test('rateFinding_WholeQuoteFromWEntry_CappedYellow', () => {
  const fromW = ctx({ quoteFromW: (quote) => quote === 'Zwei Runden.' });
  assert.equal(rate({ category: 'fehlendes-verhalten', quote: 'Zwei Runden.' }, fromW).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch', quote: 'Höchstens drei. ↔ Zwei Runden.' }, fromW).color, 'red');
});

test('rateFinding_SpellingWordAsWholeWord_CappedYellow', () => {
  assert.equal(rate({ category: 'fehlendes-verhalten', consequence: 'Ein Umlaut fehlt' }).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch', rationale: '„ß“ statt „ss“' }).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch', location: 'Großschreibung' }).color, 'yellow');
});

test('rateFinding_OtherWordForms_NotCapped', () => {
  assert.equal(rate({ category: 'fehlendes-verhalten', consequence: 'Umlaute fehlen' }).color, 'red');
  assert.equal(rate({ category: 'fehlendes-verhalten', quote: 'Straße' }).color, 'red');
  assert.equal(rate({ category: 'fehlendes-verhalten', quote: 'umlaut' }).color, 'red');
});

test('rateFinding_HeaderOrOpenQuestion_Dropped', () => {
  assert.equal(rate({}, ctx(), unit('Basis', 'header')).dropped, 'Kopfzeile');
  assert.equal(rate({ category: 'widerspruch' }, ctx({ openKeys: new Set(['ac-7']) })).dropped, 'offene Frage');
});

test('rateFinding_ScriptCheckAtOpenQuestion_StaysRed', () => {
  const result = rate({ category: rules.SCRIPT_CATEGORY }, ctx({ openKeys: new Set(['ac-7']) }));
  assert.equal(result.dropped, undefined);
  assert.equal(result.color, 'red');
});

test('rateFinding_VerificationOutsideChecklist_CappedUnlessContradictionInChange', () => {
  const verification = { checklist: new Set(['ac-1']), changed: new Set(['ac-7']) };
  assert.equal(rate({ category: 'fehlendes-verhalten' }, ctx({ verification })).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch' }, ctx({ verification })).color, 'red');
  assert.equal(rate({ category: 'widerspruch' }, ctx({ verification: { checklist: new Set(), changed: new Set() } })).color, 'yellow');
  assert.equal(rate({ category: 'fehlendes-verhalten', location: 'AC-01' }, ctx({ verification }), unit('AC-01')).color, 'red');
  assert.equal(rate({ category: rules.SCRIPT_CATEGORY }, ctx({ verification: { checklist: new Set(), changed: new Set() } })).color, 'red');
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-rules.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/review-rules.js'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/review-rules.js`:
  ```js
'use strict';

// Regelwerk des Spec- und Plan-Reviews: Die KI nennt die Kategorie, dieses Modul leitet Farbe, Herabstufung und Verwerfen ab.
const CATEGORY_COLOR = {
  widerspruch: 'red',
  'fehlendes-verhalten': 'red',
  unerfuellbar: 'red',
  'ac-fehlt-im-plan': 'red',
  'umsetzer-steckt-fest': 'red',
  detail: 'yellow',
  formulierung: 'green',
};
const SHARED_CATEGORIES = ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'detail', 'formulierung'];
const CATEGORIES = {
  'spec-review': SHARED_CATEGORIES,
  'plan-review': [...SHARED_CATEGORIES, 'ac-fehlt-im-plan', 'umsetzer-steckt-fest'],
};
// Beratende Reviewer je Review; keiner ist beratend, solange ein Review keinen nennt.
const ADVISORY = { 'spec-review': [], 'plan-review': [] };
const REQUIRED_FIELDS = ['location', 'quote', 'category', 'consequence', 'rationale'];
const COLOR_FIELDS = ['severity', 'color'];
const SPELLING_WORDS = ['Großschreibung', 'Kleinschreibung', 'ß', 'Umlaut', 'Diakritik'];
const COLOR_RANK = { green: 1, yellow: 2, red: 3 };
const COLOR_ICON = { red: '🔴', yellow: '🟡', green: '🟢' };
const SCRIPT_CATEGORY = 'skript-pruefung';

function isText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function findingProblem(finding, kind) {
  if (finding === null || typeof finding !== 'object' || Array.isArray(finding)) return 'Finding ist kein Objekt';
  const where = isText(finding.location) ? finding.location.trim() : '?';
  const color = COLOR_FIELDS.find((field) => Object.hasOwn(finding, field));
  if (color) return `Finding an ${where} nennt eine Farbe (${color})`;
  const missing = REQUIRED_FIELDS.find((field) => !isText(finding[field]));
  if (missing) return `Finding an ${where} ohne Pflichtfeld ${missing}`;
  if (!CATEGORIES[kind].includes(finding.category)) return `Finding an ${where} hat eine unbekannte Kategorie: ${finding.category}`;
  return null;
}

// Grund, warum ein Reviewer-Ergebnis ungültig ist, oder null.
function reviewProblem(review, kind, name) {
  if (review === null || typeof review !== 'object' || Array.isArray(review)) return 'Ergebnis ist kein JSON-Objekt';
  if (review.reviewer !== name) return `reviewer ${String(review.reviewer)} passt nicht zu ${name}`;
  if (review.summary !== undefined && typeof review.summary !== 'string') return 'summary ist kein Text';
  if (!Array.isArray(review.findings)) return 'findings fehlt';
  for (const finding of review.findings) {
    const problem = findingProblem(finding, kind);
    if (problem) return problem;
  }
  return null;
}

function hasWholeWord(text, word) {
  return new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'u').test(String(text));
}

function mentionsSpelling(finding) {
  return REQUIRED_FIELDS.some((field) => SPELLING_WORDS.some((word) => hasWholeWord(finding[field], word)));
}

// ctx: { advisory, openKeys, quoteFromW(quote), verification: { checklist, changed } | null }; Mengen mit kanonischen Stellen.
function rateFinding(finding, reviewer, unit, ctx) {
  const script = finding.category === SCRIPT_CATEGORY;
  if (!script && unit.kind === 'header') return { dropped: 'Kopfzeile' };
  if (!script && ctx.openKeys.has(unit.canon)) return { dropped: 'offene Frage' };
  if (script) return { color: 'red', capped: [] };
  const capped = [];
  if (ctx.advisory.includes(reviewer)) capped.push('beratend');
  if (ctx.quoteFromW(finding.quote)) capped.push('Zitat aus W-Eintrag');
  if (mentionsSpelling(finding)) capped.push('Schreibweise');
  const verification = ctx.verification;
  const contradictionInChange = finding.category === 'widerspruch' && verification?.changed.has(unit.canon);
  if (verification && !verification.checklist.has(unit.canon) && !contradictionInChange) capped.push('außerhalb der Prüfliste');
  const color = CATEGORY_COLOR[finding.category];
  return { color: color === 'red' && capped.length > 0 ? 'yellow' : color, capped };
}

module.exports = {
  CATEGORY_COLOR, CATEGORIES, ADVISORY, COLOR_RANK, COLOR_ICON, SCRIPT_CATEGORY, reviewProblem, findingProblem, mentionsSpelling, rateFinding,
};
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-rules.test.js` — erwartet: PASS, 13 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/review-rules.js plugins/forge/tests/review-rules.test.js` · `git commit -m "feat(forge): derive colour, caps and drops from finding categories"`

### Task 4: Gruppen je Stelle und Skript-Prüfungen

**ACs:** AC-05, AC-11, AC-51

**Dateien:**
- Create: `plugins/forge/scripts/lib/review-groups.js`
- Test: `plugins/forge/tests/review-groups.test.js`

**Interfaces:**
- Consumes: `parseUnits`, `resolveUnit`, `quoteFromW` (Task 2); `rateFinding`, `ADVISORY`, `COLOR_RANK`, `COLOR_ICON`, `SCRIPT_CATEGORY` (Task 3)
- Produces:
  - `SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': [] }`; eine Prüfung ist `{ name: string, run(text) → [{ location, quote, consequence, rationale }] }`
  - `runScriptChecks(text, checks) → [{ reviewer: 'skript:<name>', finding }]`
  - `classify(entries, { kind, text, openKeys?, verification?, advisory? }) → { groups: Group[], dropped: [{ reviewer, key, reason }] }`, `entries = [{ reviewer, finding }]`, `Group = { key, canon, color, items: [{ reviewer, location, quote, category, consequence, rationale, color, capped }] }`
  - `countColors(groups) → { red, yellow, green }`, `reviewersOf(group)`, `heading(group)`, `itemLine(item)`, `groupBlock(group)`, `reworkSection(groups)` (beginnt mit `=== REWORK ===`), `consequences(group)`, `table(groups)`, `cell(text)`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-groups.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const groups = require('../scripts/lib/review-groups.js');

const SPEC = [
  '# Demo', '', 'Basis: 3ce509e', '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-04** Gegeben C, dann D.',
  '', '## Entscheidungen', '- **W · Deckel** · Aussage — Zwei Runden.', '',
].join('\n');

const entry = (reviewer, overrides = {}) => ({
  reviewer,
  finding: { location: 'AC-04', quote: 'Gegeben C', category: 'detail', consequence: 'c', rationale: 'r', ...overrides },
});
const classify = (entries, options = {}) => groups.classify(entries, { kind: 'spec-review', text: SPEC, ...options });

test('classify_TwoYellowFromTwoReviewers_StaysYellow', () => {
  const result = classify([entry('clarity'), entry('consistency')]);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].color, 'yellow');
  assert.deepEqual(groups.reviewersOf(result.groups[0]), ['clarity', 'consistency']);
});

test('classify_RedAndYellowAtSameStelle_GroupIsRed', () => {
  const result = classify([entry('clarity'), entry('consistency', { category: 'widerspruch' })]);
  assert.equal(result.groups[0].color, 'red');
  assert.equal(result.groups[0].items.length, 2);
});

test('classify_SameInputTwice_SameGroupsAndDrops', () => {
  const input = [entry('clarity', { location: 'AC-01', category: 'formulierung' }), entry('consistency', { category: 'widerspruch' }),
    entry('completeness', { location: 'Basis' }), entry('clarity', { location: 'AC-4' })];
  assert.deepEqual(classify(input), classify(input));
  assert.deepEqual(classify(input).groups.map((group) => `${group.color}:${group.key}`), ['red:AC-04', 'green:AC-01']);
});

test('classify_HeaderFinding_DroppedAndNotInReworkSection', () => {
  const result = classify([entry('completeness', { location: 'Basis', category: 'widerspruch' })]);
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.dropped, [{ reviewer: 'completeness', key: 'Basis', reason: 'Kopfzeile' }]);
  assert.ok(!groups.reworkSection(result.groups).includes('Basis'));
});

test('classify_RedAtOpenQuestion_Dropped', () => {
  const result = classify([entry('consistency', { category: 'widerspruch' })], { openKeys: new Set(['ac-4']) });
  assert.deepEqual(result.groups, []);
  assert.equal(result.dropped[0].reason, 'offene Frage');
});

test('runScriptChecks_Findings_AreRedScriptItems', () => {
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-01', quote: 'Gegeben A', consequence: 'k', rationale: 'b' }] }];
  const result = classify(groups.runScriptChecks(SPEC, checks), { openKeys: new Set(['ac-1']) });
  assert.equal(result.groups[0].color, 'red');
  assert.equal(result.groups[0].items[0].reviewer, 'skript:anker');
});

test('reworkSection_Groups_HeadingAndItemLineFormat', () => {
  const result = classify([entry('clarity', { category: 'widerspruch', consequence: 'Ein Umlaut fehlt' })]);
  const text = groups.reworkSection(result.groups);
  assert.ok(text.startsWith('=== REWORK ===\n### 🟡 AC-04 (clarity)\n'));
  assert.ok(text.includes('- [clarity · widerspruch] Zitat: „Gegeben C“ · Konsequenz: Ein Umlaut fehlt · Begründung: r · höchstens 🟡: Schreibweise'));
});

test('table_Groups_OneRowPerStelle', () => {
  const result = classify([entry('clarity'), entry('consistency', { category: 'widerspruch', consequence: 'a | b' })]);
  assert.equal(groups.table(result.groups).split('\n')[2], '| 🔴 | AC-04 | 2 | clarity, consistency | 🔴 a \\| b<br>🟡 c |');
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-groups.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/review-groups.js'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/review-groups.js`:
  ```js
'use strict';

const { parseUnits, resolveUnit, quoteFromW } = require('./document-units');
const rules = require('./review-rules');

const CLOSING_QUOTE = String.fromCharCode(0x201c);

// Skript-Prüfungen je Review: { name, run(text) → [{ location, quote, consequence, rationale }] }.
const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': [] };

function runScriptChecks(text, checks) {
  return checks.flatMap((check) => check.run(text).map((finding) => ({
    reviewer: `skript:${check.name}`,
    finding: { ...finding, category: rules.SCRIPT_CATEGORY },
  })));
}

function documentOrder(model) {
  const order = new Map(model.units.map((unit, index) => [unit.canon, index]));
  return (group) => order.get(group.canon) ?? model.units.length;
}

function byColorThenPlace(model) {
  const place = documentOrder(model);
  return (a, b) => rules.COLOR_RANK[b.color] - rules.COLOR_RANK[a.color] || place(a) - place(b) || a.key.localeCompare(b.key);
}

// entries: [{ reviewer, finding }]; Ergebnis: Gruppen je Stelle mit der höchsten Farbe ihrer Findings.
function classify(entries, { kind, text, openKeys = new Set(), verification = null, advisory = rules.ADVISORY[kind] }) {
  const model = parseUnits(text);
  const ctx = { advisory, openKeys, quoteFromW: (quote) => quoteFromW(quote, text), verification };
  const groups = new Map();
  const dropped = [];
  for (const { reviewer, finding } of entries) {
    const unit = resolveUnit(finding, model);
    const rating = rules.rateFinding(finding, reviewer, unit, ctx);
    if (rating.dropped) {
      dropped.push({ reviewer, key: unit.key, reason: rating.dropped });
      continue;
    }
    if (!groups.has(unit.canon)) groups.set(unit.canon, { key: unit.key, canon: unit.canon, color: 'green', items: [] });
    const group = groups.get(unit.canon);
    group.items.push({ reviewer, ...finding, color: rating.color, capped: rating.capped });
    if (rules.COLOR_RANK[rating.color] > rules.COLOR_RANK[group.color]) group.color = rating.color;
  }
  return { groups: [...groups.values()].sort(byColorThenPlace(model)), dropped };
}

function countColors(groups) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.color] += 1;
  return counts;
}

function reviewersOf(group) {
  return [...new Set(group.items.map((item) => item.reviewer))];
}

function cell(text) {
  return String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function heading(group) {
  return `### ${rules.COLOR_ICON[group.color]} ${group.key} (${reviewersOf(group).join(', ')})`;
}

function itemLine(item) {
  const capped = item.capped.length > 0 ? ` · höchstens 🟡: ${item.capped.join(', ')}` : '';
  return `- [${item.reviewer} · ${item.category}] Zitat: „${cell(item.quote)}${CLOSING_QUOTE} · Konsequenz: ${cell(item.consequence)} · Begründung: ${cell(item.rationale)}${capped}`;
}

function groupBlock(group) {
  return [heading(group), ...group.items.map(itemLine)].join('\n');
}

// Gruppen im Aggregat-Format, das Scout, Nacharbeit und followup.js lesen.
function reworkSection(groups) {
  return `=== REWORK ===\n${groups.length === 0 ? 'Keine Findings.' : groups.map(groupBlock).join('\n\n')}\n`;
}

function consequences(group) {
  return [...group.items].sort((a, b) => rules.COLOR_RANK[b.color] - rules.COLOR_RANK[a.color])
    .map((item) => `${rules.COLOR_ICON[item.color]} ${cell(item.consequence)}`).join('<br>');
}

function table(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) =>
    `| ${rules.COLOR_ICON[group.color]} | ${cell(group.key)} | ${group.items.length} | ${reviewersOf(group).join(', ')} | ${consequences(group)} |`);
  return ['| Stufe | Stelle | Anzahl | Reviewer | Konsequenzen |', '|---|---|---|---|---|', ...rows].join('\n');
}

module.exports = {
  SCRIPT_CHECKS, runScriptChecks, classify, countColors, reviewersOf, heading, itemLine, groupBlock, reworkSection, consequences, table, cell,
};
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-groups.test.js` — erwartet: PASS, 8 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/review-groups.js plugins/forge/tests/review-groups.test.js` · `git commit -m "feat(forge): group classified findings per location with script checks"`

### Task 5: Ausgänge der Nacharbeit und gebündelte Fragen

**ACs:** AC-15, AC-16, AC-41

**Dateien:**
- Create: `plugins/forge/scripts/lib/flow-questions.js`
- Test: `plugins/forge/tests/flow-questions.test.js`

**Interfaces:**
- Consumes: `normalizeLocation` aus `plugins/forge/scripts/aggregate-findings.js`
- Produces:
  - `QUESTION_STATUS = { 'spec-review': 'human-question', 'plan-review': 'spec-question' }`
  - `reworkProblems(rework, kind, expectedKeys) → string[]`, `resultProblem(result, kind) → string|null`, `coverageProblems(results, expectedKeys) → string[]`
  - `bundleProblems(rework, kind, earlierOpen) → string[]` (`earlierOpen = [{ key }]`)
  - `numbered(questions) → [{ number: 'F<n>', rule, question, locations, cases, recommendation, reason }]`
  - `formatQuestions(numberedQuestions) → string` (beginnt mit `### Fragen an den Menschen`)
  - `answersProblems(result, numberedQuestions) → string[]`
  - Format `rework.json`: `{ "results": [{ "location", "status": "changed"|"unchanged"|<QUESTION_STATUS>, "rationale"? }], "questions": [{ "rule", "question", "locations": [], "cases": [], "recommendation", "reason" }] }`; `rationale` ist bei `unchanged` Pflicht. Format `antworten.json`: `{ "answers": [{ "question": "F1", "status": "answered"|"partial"|"open" }] }`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/flow-questions.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const questions = require('../scripts/lib/flow-questions.js');

const question = (locations, overrides = {}) => ({
  rule: 'Randfall leer', question: 'Was gilt bei leerer Liste?', locations, cases: ['a) Fehler', 'b) leer anzeigen'],
  recommendation: 'b', reason: 'passt zum Bestand', ...overrides,
});
const rework = (results, bundled = []) => ({ results, questions: bundled });

test('reworkProblems_EachRedStelleExactlyOneOutcome_Valid', () => {
  const result = rework([{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged', rationale: 'W-Eintrag trägt' }]);
  assert.deepEqual(questions.reworkProblems(result, 'spec-review', ['AC-04', 'AC-07']), []);
});

test('reworkProblems_MissingDuplicateOrForeignOutcome_Named', () => {
  const result = rework([{ location: 'AC-04', status: 'changed' }, { location: 'ac-4', status: 'changed' }, { location: 'AC-09', status: 'changed' }]);
  assert.deepEqual(questions.reworkProblems(result, 'spec-review', ['AC-04', 'AC-07']), [
    'AC-04: mehr als ein Ausgang', 'AC-07: kein Ausgang',
    'AC-09: Ausgang für eine Stelle, die nicht zur Nacharbeit gehört',
  ]);
});

test('reworkProblems_UnchangedWithoutRationaleOrWrongQuestionStatus_Invalid', () => {
  assert.match(questions.reworkProblems(rework([{ location: 'AC-04', status: 'unchanged' }]), 'spec-review', ['AC-04'])[0], /ohne rationale/);
  assert.match(questions.reworkProblems(rework([{ location: 'AC-04', status: 'spec-question' }]), 'spec-review', ['AC-04'])[0], /unbekannter status/);
  assert.deepEqual(questions.reworkProblems(rework([{ location: 'Task 2', status: 'spec-question' }], [question(['Task 2'])]), 'plan-review', ['Task 2']), []);
});

test('reworkProblems_QuestionWithoutCasesOrRecommendation_Invalid', () => {
  const result = rework([{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'], { cases: [] })]);
  assert.deepEqual(questions.reworkProblems(result, 'spec-review', ['AC-04']), ['Frage 1 ohne cases']);
  const noAdvice = rework([{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'], { recommendation: '' })]);
  assert.deepEqual(questions.reworkProblems(noAdvice, 'spec-review', ['AC-04']), ['Frage 1 ohne recommendation']);
});

test('bundleProblems_OneOfThreeStellenMissing_Named', () => {
  const result = rework(['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question' })), [question(['AC-01', 'AC-04'])]);
  assert.deepEqual(questions.bundleProblems(result, 'spec-review', []), ['AC-07: fehlt in den gebündelten Fragen']);
});

test('bundleProblems_DuplicateAndUnasked_Named', () => {
  const result = rework([{ location: 'AC-01', status: 'human-question' }], [question(['AC-01']), question(['AC-01', 'AC-09'])]);
  assert.deepEqual(questions.bundleProblems(result, 'spec-review', []), ['AC-01: steht in mehr als einer gebündelten Frage', 'AC-09: hat keine Frage']);
});

test('bundleProblems_EarlierOpenQuestions_MustBeBundledToo', () => {
  const result = rework([], [question(['AC-02'])]);
  assert.deepEqual(questions.bundleProblems(result, 'spec-review', [{ key: 'AC-02' }, { key: 'AC-05' }]), ['AC-05: fehlt in den gebündelten Fragen']);
});

test('formatQuestions_Numbered_NamesStellenCasesAndRecommendation', () => {
  const text = questions.formatQuestions(questions.numbered([question(['AC-04', 'AC-07'])]));
  assert.ok(text.startsWith('### Fragen an den Menschen\n\n**F1 · Randfall leer** — Was gilt bei leerer Liste?\n'));
  assert.ok(text.includes('- Stellen: AC-04, AC-07\n- Unterfälle: a) Fehler · b) leer anzeigen\n- Empfohlen: b — passt zum Bestand'));
  assert.ok(text.includes('`F2: später` lässt F2 offen.'));
});

test('answersProblems_EachQuestionOnce_Valid', () => {
  const asked = questions.numbered([question(['AC-01']), question(['AC-04'])]);
  assert.deepEqual(questions.answersProblems({ answers: [{ question: 'F1', status: 'answered' }, { question: 'F2', status: 'open' }] }, asked), []);
  assert.deepEqual(questions.answersProblems({ answers: [{ question: 'F1', status: 'answered' }] }, asked), ['F2: kein Eintrag']);
  assert.deepEqual(questions.answersProblems({ answers: [{ question: 'F1', status: 'vielleicht' }, { question: 'F2', status: 'open' }] }, asked),
    ['F1: unbekannter status vielleicht']);
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/flow-questions.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/flow-questions.js'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/flow-questions.js`:
  ```js
'use strict';

const { normalizeLocation } = require('../aggregate-findings');

// Ausgang der Nacharbeit je 🔴-Stelle und Fragen an den Menschen, gebündelt je Regel.
const QUESTION_STATUS = { 'spec-review': 'human-question', 'plan-review': 'spec-question' };
const ANSWER_STATUS = ['answered', 'partial', 'open'];

function isText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function statusesOf(kind) {
  return ['changed', 'unchanged', QUESTION_STATUS[kind]];
}

function resultProblem(result, kind) {
  if (result === null || typeof result !== 'object') return 'Eintrag in results ist kein Objekt';
  if (!isText(result.location)) return 'Eintrag in results ohne location';
  if (!statusesOf(kind).includes(result.status)) return `${result.location}: unbekannter status ${String(result.status)}`;
  if (result.status === 'unchanged' && !isText(result.rationale)) return `${result.location}: „nicht geändert“ ohne rationale`;
  return null;
}

// Jede erwartete Stelle hat genau einen Ausgang, und es gibt keinen Ausgang für andere Stellen.
function coverageProblems(results, expectedKeys) {
  const counts = new Map();
  for (const result of results) {
    const canon = normalizeLocation(result.location);
    counts.set(canon, (counts.get(canon) ?? 0) + 1);
  }
  const expected = new Map(expectedKeys.map((key) => [normalizeLocation(key), key]));
  const problems = [];
  for (const [canon, key] of expected) {
    if (!counts.has(canon)) problems.push(`${key}: kein Ausgang`);
    else if (counts.get(canon) > 1) problems.push(`${key}: mehr als ein Ausgang`);
  }
  for (const result of results) {
    if (!expected.has(normalizeLocation(result.location))) problems.push(`${result.location}: Ausgang für eine Stelle, die nicht zur Nacharbeit gehört`);
  }
  return [...new Set(problems)];
}

function questionProblem(question, index) {
  const name = `Frage ${index + 1}`;
  if (question === null || typeof question !== 'object') return `${name} ist kein Objekt`;
  for (const field of ['rule', 'question', 'recommendation', 'reason']) if (!isText(question[field])) return `${name} ohne ${field}`;
  for (const field of ['locations', 'cases']) {
    if (!Array.isArray(question[field]) || question[field].length === 0 || !question[field].every(isText)) return `${name} ohne ${field}`;
  }
  return null;
}

// Grund, warum das Ergebnis der Nacharbeit ungültig ist; expectedKeys sind die 🔴-Stellen.
function reworkProblems(rework, kind, expectedKeys) {
  if (rework === null || typeof rework !== 'object' || !Array.isArray(rework.results)) return ['results fehlt'];
  const invalid = rework.results.map((result) => resultProblem(result, kind)).filter(Boolean);
  if (invalid.length > 0) return invalid;
  const questions = rework.questions ?? [];
  if (!Array.isArray(questions)) return ['questions ist keine Liste'];
  const badQuestions = questions.map(questionProblem).filter(Boolean);
  return [...badQuestions, ...coverageProblems(rework.results, expectedKeys)];
}

function questionKeys(rework, kind, earlierOpen) {
  const asked = rework.results.filter((result) => result.status === QUESTION_STATUS[kind]).map((result) => result.location.trim());
  return [...asked, ...earlierOpen.map((question) => question.key)];
}

// Jede Stelle mit Frage steht in genau einer gebündelten Frage; gebündelt wird nur, was eine Frage hat.
function bundleProblems(rework, kind, earlierOpen) {
  const wanted = new Map(questionKeys(rework, kind, earlierOpen).map((key) => [normalizeLocation(key), key]));
  const seen = new Map();
  for (const question of rework.questions ?? []) {
    for (const location of question.locations) {
      const canon = normalizeLocation(location);
      seen.set(canon, [...(seen.get(canon) ?? []), location]);
    }
  }
  const problems = [];
  for (const [canon, key] of wanted) {
    if (!seen.has(canon)) problems.push(`${key}: fehlt in den gebündelten Fragen`);
    else if (seen.get(canon).length > 1) problems.push(`${key}: steht in mehr als einer gebündelten Frage`);
  }
  for (const [canon, locations] of seen) if (!wanted.has(canon)) problems.push(`${locations[0]}: hat keine Frage`);
  return problems;
}

function numbered(questions) {
  return questions.map((question, index) => ({ number: `F${index + 1}`, ...question }));
}

function formatQuestions(questions) {
  const blocks = questions.map((question) => [
    `**${question.number} · ${question.rule}** — ${question.question}`,
    `- Stellen: ${question.locations.join(', ')}`,
    `- Unterfälle: ${question.cases.join(' · ')}`,
    `- Empfohlen: ${question.recommendation} — ${question.reason}`,
  ].join('\n'));
  return ['### Fragen an den Menschen', '', blocks.join('\n\n'), '',
    'Antwort im Chat je Frage, z. B. `F1: a`. `F2: später` lässt F2 offen.', ''].join('\n');
}

function answersProblems(result, questions) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.answers)) return ['answers fehlt'];
  const problems = [];
  for (const answer of result.answers) {
    if (!questions.some((question) => question.number === answer?.question)) problems.push(`Antwort zu unbekannter Frage ${String(answer?.question)}`);
    else if (!ANSWER_STATUS.includes(answer.status)) problems.push(`${answer.question}: unbekannter status ${String(answer.status)}`);
  }
  for (const question of questions) {
    const count = result.answers.filter((answer) => answer?.question === question.number).length;
    if (count !== 1) problems.push(`${question.number}: ${count === 0 ? 'kein' : 'mehr als ein'} Eintrag`);
  }
  return problems;
}

module.exports = {
  QUESTION_STATUS, reworkProblems, coverageProblems, resultProblem, bundleProblems, numbered, formatQuestions, answersProblems,
};
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/flow-questions.test.js` — erwartet: PASS, 9 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-questions.js plugins/forge/tests/flow-questions.test.js` · `git commit -m "feat(forge): check rework outcomes and bundled human questions"`

### Task 6: Status-Rangfolge und Bericht

**ACs:** AC-26, AC-27, AC-28, AC-29, AC-30, AC-43, AC-44, AC-45

**Dateien:**
- Create: `plugins/forge/scripts/lib/flow-report.js`
- Test: `plugins/forge/tests/flow-report.test.js`

**Interfaces:**
- Consumes: `table`, `consequences`, `cell` (Task 4); `SCRIPT_CATEGORY` (Task 3); `normalizeLocation`
- Produces:
  - `statusOf({ failed: string[], open: [{ canon }], verification: { offen: number } | null }) → string`
  - `report({ title, artifact, status, roundOne: { groups } | null, verification: { verdicts, groups, offen } | null, reworked: boolean, open: [{ key, canon, question }], asked: numberedQuestions }) → string`
  - `verdictTable(verdicts)`, `openLines(open, asked)`; `verdict = { key, verdict: 'erledigt'|'nicht erledigt', rationale, script: boolean }`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/flow-report.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const flowReport = require('../scripts/lib/flow-report.js');

const item = (overrides = {}) => ({
  reviewer: 'verifier', location: 'AC-12', quote: 'q', category: 'widerspruch', consequence: 'k', rationale: 'r', color: 'red', capped: [], ...overrides,
});
const group = (key, color, items) => ({ key, canon: key.toLowerCase(), color, items: items ?? [item({ color })] });
const open = (key, question = 'Frage?') => ({ key, canon: key.toLowerCase().replace(/-0*/, '-'), question });

test('statusOf_Ranking_FirstMatchWins', () => {
  assert.equal(flowReport.statusOf({ failed: ['verifier'], open: [open('AC-04')], verification: null }), 'unvollständig, ausgefallen: verifier');
  assert.equal(flowReport.statusOf({ failed: [], open: [open('AC-04')], verification: { offen: 1 } }), 'Fragen offen');
  assert.equal(flowReport.statusOf({ failed: [], open: [], verification: { offen: 2 } }), 'nicht bereit, 2 × 🔴 offen');
  assert.equal(flowReport.statusOf({ failed: [], open: [], verification: { offen: 0 } }), 'sauber nach Nachprüfung');
  assert.equal(flowReport.statusOf({ failed: [], open: [], verification: null }), 'sauber nach Runde 1');
});

test('statusOf_ReviewerFailed_ListsNames', () => {
  assert.equal(flowReport.statusOf({ failed: ['clarity', 'profiles'], open: [], verification: null }), 'unvollständig, ausgefallen: clarity, profiles');
});

const verification = {
  offen: 3,
  verdicts: [
    { key: 'AC-04', verdict: 'erledigt', rationale: 'passt', script: false },
    { key: 'AC-09', verdict: 'nicht erledigt', rationale: 'fehlt noch', script: false },
    { key: 'AC-11', verdict: 'nicht erledigt', rationale: 'Skript meldet erneut', script: true },
  ],
  groups: [
    group('AC-12', 'red'),
    group('AC-11', 'red', [item({ reviewer: 'skript:anker', category: 'skript-pruefung' })]),
    group('AC-05', 'yellow', [item({ color: 'yellow', category: 'detail' })]),
    group('AC-03', 'green', [item({ color: 'green', category: 'formulierung', consequence: 'Wortwahl' })]),
  ],
};

test('report_Verification_ShowsVerdictPerPointContradictionsScriptAndGreen', () => {
  const text = flowReport.report({
    title: 'Spec-Review', artifact: 'docs/spec.md', status: 'nicht bereit, 3 × 🔴 offen', roundOne: { groups: [] }, verification, reworked: true, open: [], asked: [],
  });
  assert.ok(text.startsWith('## Spec-Review: docs/spec.md\n\n**Status:** nicht bereit, 3 × 🔴 offen\n**Runden:** 2 · **Nacharbeiten:** 1\n'));
  assert.ok(text.includes('| AC-04 | erledigt | passt |'));
  assert.ok(text.includes('| AC-09 | nicht erledigt | fehlt noch |'));
  assert.ok(text.includes('| AC-11 | 🔴 Skript-Prüfung | Skript meldet erneut |'));
  assert.ok(text.includes('### Widersprüche\n- 🔴 AC-12 — 🔴 k'));
  assert.ok(text.includes('### Skript-Befunde\n- 🔴 AC-11 — 🔴 k'));
  assert.ok(text.includes('### Anmerkungen (🟢)\n- AC-03 — 🟢 Wortwahl'));
  assert.ok(!text.includes('AC-05 —'), 'Hinweise stehen im Scout-Abschnitt');
});

test('report_OpenQuestions_BundledWithOpenStellenOnly', () => {
  const asked = [{ number: 'F1', question: 'Grenze?', locations: ['AC-04', 'AC-07'] }, { number: 'F2', question: 'Leer?', locations: ['AC-09'] }];
  const text = flowReport.report({
    title: 'Spec-Review', artifact: 's.md', status: 'Fragen offen', roundOne: { groups: [] }, verification: null, reworked: true,
    open: [open('AC-04'), open('AC-07'), open('AC-20', 'Alt?')], asked,
  });
  assert.ok(text.includes('### Offene Fragen\n- F1 · AC-04, AC-07 — Grenze?\n- AC-20 — Alt?'));
  assert.ok(!text.includes('F2'));
});

test('report_RoundOneOnly_OneRoundNoRework', () => {
  const text = flowReport.report({
    title: 'Plan-Review', artifact: 'p.md', status: 'sauber nach Runde 1', roundOne: { groups: [group('Task 1', 'yellow')] }, verification: null, reworked: false, open: [], asked: [],
  });
  assert.ok(text.includes('**Runden:** 1 · **Nacharbeiten:** 0'));
  assert.ok(text.includes('### Runde 1\n| Stufe | Stelle | Anzahl | Reviewer | Konsequenzen |'));
  assert.ok(!text.includes('### Nachprüfung'));
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/flow-report.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/flow-report.js'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/flow-report.js`:
  ```js
'use strict';

const { normalizeLocation } = require('../aggregate-findings');
const { table, consequences, cell } = require('./review-groups');
const { SCRIPT_CATEGORY } = require('./review-rules');

// Status in fester Rangfolge; es gilt der erste, der zutrifft.
function statusOf({ failed, open, verification }) {
  if (failed.length > 0) return `unvollständig, ausgefallen: ${failed.join(', ')}`;
  if (open.length > 0) return 'Fragen offen';
  if (verification && verification.offen > 0) return `nicht bereit, ${verification.offen} × 🔴 offen`;
  return verification ? 'sauber nach Nachprüfung' : 'sauber nach Runde 1';
}

function isScriptOnly(group) {
  return group.items.every((item) => item.category === SCRIPT_CATEGORY);
}

function verdictTable(verdicts) {
  if (verdicts.length === 0) return 'Keine Punkte auf der Prüfliste.';
  const rows = verdicts.map((verdict) => {
    const shown = verdict.script && verdict.verdict === 'nicht erledigt' ? '🔴 Skript-Prüfung' : verdict.verdict;
    return `| ${cell(verdict.key)} | ${shown} | ${cell(verdict.rationale)} |`;
  });
  return ['| Stelle | Urteil | Begründung |', '|---|---|---|', ...rows].join('\n');
}

function listSection(title, groups) {
  if (groups.length === 0) return [];
  return [`### ${title}`, ...groups.map((group) => `- ${group.color === 'red' ? '🔴 ' : ''}${group.key} — ${consequences(group)}`), ''];
}

// Offene Fragen: gebündelt wie gefragt, nur mit den noch offenen Stellen; Übrige einzeln.
function openLines(open, asked) {
  const openCanon = new Set(open.map((question) => question.canon));
  const covered = new Set();
  const lines = [];
  for (const question of asked) {
    const stillOpen = question.locations.filter((location) => openCanon.has(normalizeLocation(location)));
    if (stillOpen.length === 0) continue;
    stillOpen.forEach((location) => covered.add(normalizeLocation(location)));
    lines.push(`- ${question.number} · ${stillOpen.join(', ')} — ${question.question}`);
  }
  for (const question of open) if (!covered.has(question.canon)) lines.push(`- ${question.key} — ${question.question}`);
  return lines;
}

function report({ title, artifact, status, roundOne, verification, reworked, open, asked }) {
  const rounds = (roundOne ? 1 : 0) + (verification ? 1 : 0);
  const parts = [`## ${title}: ${artifact}`, '', `**Status:** ${status}`, `**Runden:** ${rounds} · **Nacharbeiten:** ${reworked ? 1 : 0}`, ''];
  if (roundOne) parts.push('### Runde 1', table(roundOne.groups), '');
  if (verification) {
    const red = verification.groups.filter((group) => group.color === 'red');
    parts.push('### Nachprüfung', verdictTable(verification.verdicts), '');
    parts.push(...listSection('Widersprüche', red.filter((group) => !isScriptOnly(group))));
    parts.push(...listSection('Skript-Befunde', red.filter(isScriptOnly)));
  }
  const lines = openLines(open, asked);
  if (lines.length > 0) parts.push('### Offene Fragen', ...lines, '');
  const green = [...(roundOne?.groups ?? []), ...(verification?.groups ?? [])].filter((group) => group.color === 'green');
  parts.push(...listSection('Anmerkungen (🟢)', green));
  return `${parts.join('\n').trimEnd()}\n`;
}

module.exports = { statusOf, report, verdictTable, openLines };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/flow-report.test.js` — erwartet: PASS, 5 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-report.js plugins/forge/tests/flow-report.test.js` · `git commit -m "feat(forge): rank review run status and render the run report"`

### Task 7: CLI `review-flow.js` für alle Schritte des Ablaufs

**ACs:** AC-12, AC-13, AC-14, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, AC-35, AC-36, AC-37, AC-40, AC-42, AC-49, AC-50, AC-53

**Dateien:**
- Create: `plugins/forge/scripts/review-flow.js`
- Modify: `plugins/forge/scripts/followup.js:191-193` · `module.exports`
- Create: `plugins/forge/tests/lib/flow-workspace.js`
- Test: `plugins/forge/tests/review-flow-round1.test.js`
- Test: `plugins/forge/tests/review-flow-round2.test.js`

**Interfaces:**
- Consumes: alle `Produces` aus Task 2 bis 6; `parseScout(lines)`, `parseRework(lines)` aus `plugins/forge/scripts/followup.js` (in diesem Task exportiert)
- Produces — CLI `node plugins/forge/scripts/review-flow.js <befehl> …`, Arbeitsbereich `<W>` mit Unterordnern `runde-1`, `runde-2`, `nacharbeit`, `bericht` und der Kopie `<W>/dokument-vorher.md`:
  - `round1 <art> <dokument> <W> <aktiv>` → `RUNDE1 rot=<n> gelb=<n> gruen=<n> fragen=<n> ausgefallen=<liste|->`, je Fehler `ERROR <name>: <grund>`, `NEXT scout=<ja|nein> nacharbeit=<ja|nein>`; schreibt `runde-1/runde.json`, `aggregate.md`, `scout-input.md`, `nacharbeit.md` und `<W>/dokument-vorher.md`
  - `scout-check <W> <1|2>` → `SCOUT ok` | `SCOUT ungueltig` + `ERROR`-Zeilen; bei Runde 1 schreibt es `runde-1/nacharbeit.md` mit den 🔴-Stellen samt Scout-Vorschlägen neu
  - `rework-check <art> <dokument> <W>` → `NACHARBEIT ok fragen=<n> anhalten=<ja|nein>` (bei `anhalten=ja` gefolgt von `=== FRAGEN ===` und den Fragen) | `NACHARBEIT ungueltig` | `NACHARBEIT buendelung`, je mit `ERROR`-Zeilen; schreibt `runde-1/fragen.json` und `fragen.md`
  - `answers-check <W>` → `ANTWORTEN ok` | `ANTWORTEN ungueltig` + `ERROR`
  - `checklist <art> <dokument> <W>` und `followup-checklist <art> <dokument> <W>` → `PRUEFLISTE punkte=<n> skript=<n> geaendert=<n> nachpruefer=<ja|nein>` | `PRUEFLISTE ungueltig` + `ERROR` (nur followup); schreibt `runde-2/pruefliste.json` und `pruefliste.md`
  - `verify <art> <dokument> <W>` → `NACHPRUEFUNG ok offen=<k> hinweise=<n>` und `NEXT scout=<ja|nein>` | `NACHPRUEFUNG ungueltig` + `ERROR`; liest `runde-2/verifier.json` im Format `{ "reviewer": "verifier", "summary", "verdicts": [{ "location", "verdict": "erledigt"|"nicht erledigt", "rationale" }], "findings": [<Finding mit category>] }`
  - `finish <art> <dokument> <W> --title <titel> [--ausgefallen <liste>]` → `STATUS <status>`, `=== BERICHT ===`, Bericht; schreibt bei Hinweisen `bericht/aggregate.md` und `bericht/scout.md` für `followup.js save`
  - Exit 2 bei unbekanntem Befehl, unbekannter Art oder falscher Runde
  - JS-Exporte: `roundOne(kind, doc, workspace, active, checks?)`, `verify(kind, doc, workspace, checks?)`, `scoutCheck`, `reworkCheck`, `answersCheck`, `checklist`, `followupChecklist`, `finish`, `scoutProblems(inputText, scoutText)`, `SNAPSHOT = 'dokument-vorher.md'`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  `plugins/forge/tests/lib/flow-workspace.js`:
  ```js
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'review-flow.js');

const SPEC = [
  '# Demo', '', 'Status: bestätigt am 2026-09-28', 'Art: verankert', 'Basis: 3ce509e', '',
  '## Theoretisches Verhalten nach Umsetzung',
  '1. **Suche:** Alle Reviewer prüfen.',
  '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-04** Gegeben C, dann D.',
  '- **AC-07** Gegeben E, dann F.',
  '- **AC-09** Gegeben G, dann H.',
  '- **AC-12** Gegeben I, dann J.',
  '',
  '## Entscheidungen',
  '- **W · Deckel** · Aussage — Zwei Runden.',
  '',
].join('\n');

const finding = (location, category, overrides = {}) => ({
  location, quote: 'Gegeben', category, consequence: `Konsequenz ${location}`, rationale: 'weil', ...overrides,
});

function scoutFor(groups) {
  const blocks = groups.map(([icon, key]) => `### ${icon} ${key}\n1. Vorschlag A\n2. Vorschlag B\n**Bevorzugt: 1** — sicher`);
  return `## Scout-Vorschläge\n\n${blocks.join('\n\n')}\n`;
}

function flowWorkspace(text = SPEC, name = 'spec.md') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-flow-'));
  const doc = path.join(root, name);
  const workspace = path.join(root, '.forge', 'ws');
  fs.writeFileSync(doc, text);
  fs.mkdirSync(path.join(workspace, 'runde-1'), { recursive: true });
  const file = (relative) => path.join(workspace, relative);
  return {
    doc,
    workspace,
    file,
    review: (reviewer, findings) => fs.writeFileSync(file(`runde-1/${reviewer}.json`), JSON.stringify({ reviewer, summary: 's', findings })),
    json: (relative, value) => {
      fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
      fs.writeFileSync(file(relative), JSON.stringify(value));
    },
    text: (relative, value) => {
      fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
      fs.writeFileSync(file(relative), value);
    },
    read: (relative) => fs.readFileSync(file(relative), 'utf8'),
    readJson: (relative) => JSON.parse(fs.readFileSync(file(relative), 'utf8')),
    edit: (change) => fs.writeFileSync(doc, change(fs.readFileSync(doc, 'utf8'))),
    run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }),
  };
}

module.exports = { SPEC, finding, scoutFor, flowWorkspace };
  ```
  `plugins/forge/tests/review-flow-round1.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const flow = require('../scripts/review-flow.js');
const { SPEC, finding, scoutFor, flowWorkspace } = require('./lib/flow-workspace');

const OPEN_AC04 = SPEC.replace('- **W · Deckel** · Aussage — Zwei Runden.',
  '- **W · Deckel** · Aussage — Zwei Runden.\n- **R1 · AC-04** — frage an den menschen — Gilt D auch leer?');
const question = (locations) => ({ rule: 'Leere Eingabe', question: 'Was gilt leer?', locations, cases: ['a) Fehler', 'b) leer'], recommendation: 'b', reason: 'Bestand' });

test('round1_NoRedNoQuestionTwoHints_ScoutOnlyThenCleanAfterRoundOne', () => {
  const ws = flowWorkspace();
  ws.review('clarity', [finding('AC-01', 'detail'), finding('AC-07', 'detail')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, 'RUNDE1 rot=0 gelb=2 gruen=0 fragen=0 ausgefallen=-\nNEXT scout=ja nacharbeit=nein\n');
  ws.text('runde-1/scout.md', scoutFor([['🟡', 'AC-01'], ['🟡', 'AC-07']]));
  assert.equal(ws.run('scout-check', ws.workspace, '1').stdout, 'SCOUT ok\n');
  const finish = ws.run('finish', 'spec-review', ws.doc, ws.workspace, '--title', 'Spec-Review');
  assert.match(finish.stdout, /^STATUS sauber nach Runde 1\n/);
  assert.match(ws.read('bericht/scout.md'), /### 🟡 AC-01\n1\. Vorschlag A[\s\S]*### 🟡 AC-07/);
});

test('round1_RedAndYellow_ScoutSeesBothReworkOnlyRedWithProposals', () => {
  const ws = flowWorkspace();
  ws.review('consistency', [finding('AC-04', 'widerspruch'), finding('AC-07', 'detail')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  assert.match(out.stdout, /NEXT scout=ja nacharbeit=ja/);
  const input = ws.read('runde-1/scout-input.md');
  assert.ok(input.includes('### 🔴 AC-04 (consistency)') && input.includes('### 🟡 AC-07 (consistency)'));
  ws.text('runde-1/scout.md', scoutFor([['🔴', 'AC-04'], ['🟡', 'AC-07']]));
  assert.equal(ws.run('scout-check', ws.workspace, '1').stdout, 'SCOUT ok\n');
  const rework = ws.read('runde-1/nacharbeit.md');
  assert.ok(rework.includes('### 🔴 AC-04 (consistency)\n- [consistency · widerspruch]'));
  assert.ok(rework.includes('Scout-Vorschläge:\n1. Vorschlag A\n2. Vorschlag B\n**Bevorzugt: 1** — sicher'));
  assert.ok(!rework.includes('AC-07'));
});

test('round1_InvalidReviewer_ListedAsFailedWithReason', () => {
  const ws = flowWorkspace();
  ws.review('clarity', [finding('AC-01', 'detail', { severity: 'yellow' })]);
  ws.review('completeness', [finding('AC-01', 'ac-fehlt-im-plan')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity,completeness,consistency');
  assert.match(out.stdout, /ausgefallen=clarity,completeness,consistency/);
  assert.match(out.stdout, /ERROR clarity: Finding an AC-01 nennt eine Farbe \(severity\)/);
  assert.match(out.stdout, /ERROR completeness: Finding an AC-01 hat eine unbekannte Kategorie: ac-fehlt-im-plan/);
  assert.match(out.stdout, /ERROR consistency: Datei fehlt: consistency\.json/);
});

test('round1_OpenQuestionAtRedStelle_FindingDroppedQuestionAskedAgain', () => {
  const ws = flowWorkspace(OPEN_AC04);
  ws.review('consistency', [finding('AC-04', 'widerspruch')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  assert.equal(out.stdout, 'RUNDE1 rot=0 gelb=0 gruen=0 fragen=1 ausgefallen=-\nNEXT scout=nein nacharbeit=ja\n');
  assert.ok(!ws.read('runde-1/aggregate.md').includes('AC-04'));
  assert.ok(ws.read('runde-1/nacharbeit.md').includes('## Offene Fragen aus früheren Läufen\n\n- AC-04 — Gilt D auch leer?'));
});

test('round1_OpenQuestionAndOneHint_ScoutOnlyForTheHint', () => {
  const ws = flowWorkspace(OPEN_AC04);
  ws.review('clarity', [finding('AC-09', 'detail')]);
  assert.match(ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity').stdout, /NEXT scout=ja nacharbeit=ja/);
  assert.equal(ws.read('runde-1/scout-input.md'), '=== REWORK ===\n### 🟡 AC-09 (clarity)\n- [clarity · detail] Zitat: „Gegeben“ · Konsequenz: Konsequenz AC-09 · Begründung: weil\n');
});

test('roundOne_ScriptCheckFinding_IsRedAndCountsForRework', () => {
  const ws = flowWorkspace();
  ws.review('clarity', []);
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-12', quote: 'Gegeben I', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  assert.match(flow.roundOne('spec-review', ws.doc, ws.workspace, ['clarity'], checks), /rot=1[\s\S]*nacharbeit=ja/);
});

test('scoutCheck_ProposalCountOrPreferredWrong_Invalid', () => {
  const input = '=== REWORK ===\n### 🔴 AC-04 (x)\n- [x · widerspruch] a\n';
  assert.deepEqual(flow.scoutProblems(input, scoutFor([['🔴', 'AC-04']])), []);
  assert.deepEqual(flow.scoutProblems(input, '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n3. c\n4. d\n**Bevorzugt: 1** — x\n'), ['🔴 AC-04: 4 Vorschläge statt 1 bis 3']);
  assert.deepEqual(flow.scoutProblems(input, '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n'), ['🔴 AC-04: kein gültiger bevorzugter Vorschlag']);
  assert.deepEqual(flow.scoutProblems(input, '## Scout-Vorschläge\n'), ['🔴 AC-04: keine Scout-Gruppen']);
});

function reworkReady(ws, results, bundled = []) {
  ws.review('consistency', [finding('AC-04', 'widerspruch'), finding('AC-07', 'widerspruch'), finding('AC-09', 'widerspruch'), finding('AC-01', 'detail')]);
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  ws.json('runde-1/rework.json', { results, questions: bundled });
}

test('reworkCheck_EachRedOneOutcomeNoQuestion_OkWithoutHalt', () => {
  const ws = flowWorkspace();
  reworkReady(ws, ['AC-04', 'AC-07', 'AC-09'].map((location) => ({ location, status: 'changed' })));
  assert.equal(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_OutcomeForHint_Invalid', () => {
  const ws = flowWorkspace();
  reworkReady(ws, ['AC-04', 'AC-07', 'AC-09', 'AC-01'].map((location) => ({ location, status: 'changed' })));
  const out = ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout;
  assert.match(out, /^NACHARBEIT ungueltig\nERROR AC-01: Ausgang für eine Stelle, die nicht zur Nacharbeit gehört/);
});

test('reworkCheck_ThreeQuestionsOneMissingInBundles_BundlingError', () => {
  const ws = flowWorkspace();
  reworkReady(ws, ['AC-04', 'AC-07', 'AC-09'].map((location) => ({ location, status: 'human-question' })), [question(['AC-04', 'AC-07'])]);
  assert.equal(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT buendelung\nERROR AC-09: fehlt in den gebündelten Fragen\n');
});

test('reworkCheck_SpecQuestions_HaltAndShowBundledQuestions', () => {
  const ws = flowWorkspace();
  reworkReady(ws, [{ location: 'AC-04', status: 'human-question' }, { location: 'AC-07', status: 'human-question' }, { location: 'AC-09', status: 'changed' }],
    [question(['AC-04', 'AC-07'])]);
  const out = ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout;
  assert.ok(out.startsWith('NACHARBEIT ok fragen=1 anhalten=ja\n=== FRAGEN ===\n### Fragen an den Menschen\n\n**F1 · Leere Eingabe** — Was gilt leer?\n- Stellen: AC-04, AC-07\n'));
  assert.deepEqual(ws.readJson('runde-1/fragen.json').map((entry) => entry.number), ['F1']);
});

test('reworkCheck_PlanSpecQuestion_NoHalt', () => {
  const plan = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
  const ws = flowWorkspace(plan, 'plan.md');
  ws.review('coverage', [finding('Task 2', 'ac-fehlt-im-plan', { quote: 'B.' })]);
  ws.run('round1', 'plan-review', ws.doc, ws.workspace, 'coverage');
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 2', status: 'spec-question' }], questions: [question(['Task 2'])] });
  assert.equal(ws.run('rework-check', 'plan-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT ok fragen=1 anhalten=nein\n');
});

test('reworkCheck_EarlierOpenQuestionWithoutRed_MustBeBundled', () => {
  const ws = flowWorkspace(OPEN_AC04);
  ws.review('clarity', []);
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity');
  ws.json('runde-1/rework.json', { results: [], questions: [] });
  assert.equal(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT buendelung\nERROR AC-04: fehlt in den gebündelten Fragen\n');
  ws.json('runde-1/rework.json', { results: [], questions: [question(['AC-04'])] });
  assert.match(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, /^NACHARBEIT ok fragen=1 anhalten=ja/);
});

test('answersCheck_EachQuestionOnce_Ok', () => {
  const ws = flowWorkspace();
  ws.json('runde-1/fragen.json', [{ number: 'F1', ...question(['AC-04']) }, { number: 'F2', ...question(['AC-07']) }]);
  ws.json('runde-1/antworten.json', { answers: [{ question: 'F1', status: 'answered' }, { question: 'F2', status: 'open' }] });
  assert.equal(ws.run('answers-check', ws.workspace).stdout, 'ANTWORTEN ok\n');
  ws.json('runde-1/antworten.json', { answers: [{ question: 'F1', status: 'answered' }] });
  assert.equal(ws.run('answers-check', ws.workspace).stdout, 'ANTWORTEN ungueltig\nERROR F2: kein Eintrag\n');
});

test('cli_UnknownKindOrCommand_ExitsTwo', () => {
  const ws = flowWorkspace();
  assert.equal(ws.run('round1', 'implementation-review', ws.doc, ws.workspace, 'x').status, 2);
  assert.equal(ws.run('weiter', ws.workspace).status, 2);
  assert.equal(ws.run('scout-check', ws.workspace, '3').status, 2);
});
  ```
  `plugins/forge/tests/review-flow-round2.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const flow = require('../scripts/review-flow.js');
const { SPEC, finding, scoutFor, flowWorkspace } = require('./lib/flow-workspace');

const question = (locations, text = 'Was gilt leer?') => ({ rule: 'Leere Eingabe', question: text, locations, cases: ['a) Fehler', 'b) leer'], recommendation: 'b', reason: 'Bestand' });
const verdict = (location, value = 'erledigt') => ({ location, verdict: value, rationale: `Urteil ${location}` });
const addW = (title) => (text) => `${text}- **W · ${title}** · Aussage — Antwort.\n`;

// Runde 1 mit roten Stellen, Nacharbeit mit den gegebenen Ausgängen und Fragen.
function afterRework(ws, reds, results, bundled = []) {
  ws.review('consistency', reds.map((location) => finding(location, 'widerspruch')));
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  ws.json('runde-1/rework.json', { results, questions: bundled });
  ws.run('rework-check', 'spec-review', ws.doc, ws.workspace);
}

const writeQuestionEntries = (ws, keys) => ws.edit((text) => `${text}${keys.map((key) => `- **R1 · ${key}** — frage an den menschen — Was gilt leer?\n`).join('')}`);
const finish = (ws, ...extra) => ws.run('finish', 'spec-review', ws.doc, ws.workspace, '--title', 'Spec-Review', ...extra).stdout;

test('checklist_ThreeRedWithoutQuestions_ThreePointsAndVerdictEach', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07', 'AC-09'], ['AC-04', 'AC-07', 'AC-09'].map((location) => ({ location, status: 'changed' })));
  ws.edit((text) => text.replace('Gegeben C, dann D.', 'Gegeben C, dann D2.'));
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=3 skript=0 geaendert=1 nachpruefer=ja\n');
  assert.ok(ws.read('runde-2/pruefliste.md').includes('### AC-04\nHerkunft: Finding aus Runde 1\n- [consistency · widerspruch]'));
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', summary: 's', verdicts: ['AC-04', 'AC-07', 'AC-09'].map((key) => verdict(key)), findings: [] });
  assert.equal(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHPRUEFUNG ok offen=0 hinweise=0\nNEXT scout=nein\n');
  const out = finish(ws);
  assert.match(out, /^STATUS sauber nach Nachprüfung\n/);
  for (const key of ['AC-04', 'AC-07', 'AC-09']) assert.ok(out.includes(`| ${key} | erledigt | Urteil ${key} |`), key);
  assert.ok(out.includes('**Runden:** 2 · **Nacharbeiten:** 1'));
});

test('verify_TwoPointsNotDone_NotReadyTwoRed', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07'], ['AC-04', 'AC-07'].map((location) => ({ location, status: 'changed' })));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'nicht erledigt'), verdict('AC-07', 'nicht erledigt')], findings: [] });
  assert.match(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, /offen=2/);
  assert.match(finish(ws), /^STATUS nicht bereit, 2 × 🔴 offen\n/);
});

test('verify_MissingVerdictOrColor_Invalid', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07'], ['AC-04', 'AC-07'].map((location) => ({ location, status: 'changed' })));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [finding('AC-01', 'detail', { severity: 'yellow' })] });
  const out = ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout;
  assert.match(out, /^NACHPRUEFUNG ungueltig/);
  assert.match(out, /ERROR AC-07: kein Urteil/);
  assert.match(out, /ERROR Finding an AC-01 nennt eine Farbe/);
});

test('verify_ContradictionInSideChangedSection_RedInReport', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.edit((text) => text.replace('Alle Reviewer prüfen.', 'Nur ein Reviewer prüft.'));
  assert.match(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, /geaendert=1/);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')],
    findings: [finding('Suche', 'widerspruch', { quote: 'Nur ein Reviewer prüft.', consequence: 'widerspricht AC-01' })] });
  assert.match(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, /offen=1/);
  const out = finish(ws);
  assert.match(out, /^STATUS nicht bereit, 1 × 🔴 offen/);
  assert.ok(out.includes('### Widersprüche\n- 🔴 Suche — 🔴 widerspricht AC-01'));
});

test('verify_FindingOutsideChecklistNotContradiction_HintWithScoutAfterwards', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [finding('AC-12', 'fehlendes-verhalten')] });
  assert.equal(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHPRUEFUNG ok offen=0 hinweise=1\nNEXT scout=ja\n');
  assert.ok(ws.read('runde-2/scout-input.md').includes('### 🟡 AC-12 (verifier)'));
  ws.text('runde-2/scout.md', scoutFor([['🟡', 'AC-12']]));
  assert.equal(ws.run('scout-check', ws.workspace, '2').stdout, 'SCOUT ok\n');
  assert.match(finish(ws), /^STATUS sauber nach Nachprüfung/);
  assert.ok(ws.read('bericht/scout.md').includes('### 🟡 AC-12\n1. Vorschlag A\n2. Vorschlag B\n**Bevorzugt: 1** — sicher'));
});

test('checklist_OnlyDecisionsChanged_NoChangedArea', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'unchanged', rationale: 'Fehllesung' }]);
  ws.edit(addW('AC-12'));
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=1 skript=0 geaendert=0 nachpruefer=ja\n');
  assert.ok(ws.read('runde-2/pruefliste.md').includes('Keine geänderten Bereiche.'));
});

test('checklist_AnsweredQuestion_StelleOnChecklist', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  ws.edit(addW('AC-04'));
  assert.match(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, /^PRUEFLISTE punkte=1/);
  assert.equal(ws.readJson('runde-2/pruefliste.json').items[0].key, 'AC-04');
});

test('checklist_AnswerLaterForOne_OthersCheckedStatusQuestionsOpen', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07'], [{ location: 'AC-04', status: 'human-question' }, { location: 'AC-07', status: 'changed' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=1 skript=0 geaendert=0 nachpruefer=ja\n');
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-07', 'nicht erledigt')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  const out = finish(ws);
  assert.match(out, /^STATUS Fragen offen\n/);
  assert.ok(out.includes('| AC-07 | nicht erledigt | Urteil AC-07 |'));
  assert.ok(out.includes('### Offene Fragen\n- F1 · AC-04 — Was gilt leer?'));
});

test('checklist_ThreeQuestionsOneAnswered_TwoStayOpen', () => {
  const ws = flowWorkspace();
  const keys = ['AC-04', 'AC-07', 'AC-09'];
  afterRework(ws, keys, keys.map((location) => ({ location, status: 'human-question' })), keys.map((key) => question([key], `Frage ${key}?`)));
  writeQuestionEntries(ws, keys);
  ws.edit(addW('AC-04'));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  assert.deepEqual(ws.readJson('runde-2/pruefliste.json').open.map((entry) => entry.key), ['AC-07', 'AC-09']);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  const out = finish(ws);
  assert.match(out, /^STATUS Fragen offen/);
  assert.ok(out.includes('- F2 · AC-07 — Frage AC-07?\n- F3 · AC-09 — Frage AC-09?'));
});

test('checklist_EveryStelleOpenNothingChanged_NoVerifierStatusQuestionsOpen', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=0 skript=0 geaendert=0 nachpruefer=nein\n');
  assert.equal(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHPRUEFUNG ok offen=0 hinweise=0\nNEXT scout=nein\n');
  assert.match(finish(ws), /^STATUS Fragen offen/);
});

test('finish_VerifierFailedWithOpenQuestion_Incomplete', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  assert.match(finish(ws, '--ausgefallen', 'nachprüfer'), /^STATUS unvollständig, ausgefallen: nachprüfer\n/);
});

test('finish_ReviewerFailed_IncompleteWithName', () => {
  const ws = flowWorkspace();
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity');
  assert.match(finish(ws, '--ausgefallen', 'clarity'), /^STATUS unvollständig, ausgefallen: clarity\n/);
});

test('finish_GreenFinding_InReportWithoutScout', () => {
  const ws = flowWorkspace();
  ws.review('clarity', [finding('AC-01', 'formulierung', { consequence: 'Wortwahl' })]);
  assert.match(ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity').stdout, /NEXT scout=nein nacharbeit=nein/);
  const out = finish(ws);
  assert.ok(out.includes('### Anmerkungen (🟢)\n- AC-01 — 🟢 Wortwahl'));
  assert.equal(require('node:fs').existsSync(ws.file('bericht')), false);
});

test('verify_NotDoneContradictionAndScriptRed_ThreeRedOpen', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.edit((text) => text.replace('Gegeben I, dann J.', 'Gegeben I, dann K.'));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'nicht erledigt')], findings: [finding('AC-12', 'widerspruch')] });
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-01', quote: 'Gegeben A', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, checks), /offen=3/);
  assert.match(finish(ws), /^STATUS nicht bereit, 3 × 🔴 offen/);
});

test('verify_ScriptPointFromRoundOne_JudgedByScript', () => {
  const ws = flowWorkspace();
  ws.review('clarity', []);
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-12', quote: 'Gegeben I', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  flow.roundOne('spec-review', ws.doc, ws.workspace, ['clarity'], checks);
  ws.json('runde-1/rework.json', { results: [{ location: 'AC-12', status: 'unchanged', rationale: 'nicht lösbar' }], questions: [] });
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=0 skript=1 geaendert=0 nachpruefer=nein\n');
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, checks), /offen=1/);
  const out = finish(ws);
  assert.ok(out.includes('| AC-12 | 🔴 Skript-Prüfung | Skript-Prüfung meldet die Stelle erneut |'));
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, []), /offen=0/);
});

test('verify_ScriptRedOutsideChecklist_StaysRed', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [] });
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-09', quote: 'Gegeben G', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, checks), /offen=1/);
  assert.ok(finish(ws).includes('### Skript-Befunde\n- 🔴 AC-09 — 🔴 Anker fehlt'));
});

test('planReview_SpecQuestion_NoHaltCheckedOthersQuestionsOpen', () => {
  const plan = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
  const ws = flowWorkspace(plan, 'plan.md');
  ws.review('coverage', [finding('Task 1', 'ac-fehlt-im-plan', { quote: 'A.' }), finding('Task 2', 'umsetzer-steckt-fest', { quote: 'B.' })]);
  ws.run('round1', 'plan-review', ws.doc, ws.workspace, 'coverage');
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 1', status: 'changed' }, { location: 'Task 2', status: 'spec-question' }],
    questions: [question(['Task 2'], 'Spec lässt die Grenze offen?')] });
  assert.match(ws.run('rework-check', 'plan-review', ws.doc, ws.workspace).stdout, /anhalten=nein/);
  assert.equal(ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=1 skript=0 geaendert=0 nachpruefer=ja\n');
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('Task 1')], findings: [] });
  ws.run('verify', 'plan-review', ws.doc, ws.workspace);
  const out = ws.run('finish', 'plan-review', ws.doc, ws.workspace, '--title', 'Plan-Review').stdout;
  assert.match(out, /^STATUS Fragen offen/);
  assert.ok(out.includes('### Offene Fragen\n- F1 · Task 2 — Spec lässt die Grenze offen?'));
});
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-flow-round1.test.js tests/review-flow-round2.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/review-flow.js'`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/followup.js` den Export ersetzen durch:
  ```js
module.exports = {
  FollowupError, ROLES, ART_OF_ROLE, followupDir, save, drop, latest, loadGroups, rolesFor, slugFor, resolveFollowup, parseScout, parseRework,
};
  ```
  `plugins/forge/scripts/review-flow.js`:
  ```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeLocation } = require('./aggregate-findings');
const { parseScout, parseRework } = require('./followup');
const units = require('./lib/document-units');
const rules = require('./lib/review-rules');
const groupsLib = require('./lib/review-groups');
const questions = require('./lib/flow-questions');
const flowReport = require('./lib/flow-report');

const KINDS = ['spec-review', 'plan-review'];
const SNAPSHOT = 'dokument-vorher.md';
const VERDICTS = ['erledigt', 'nicht erledigt'];
const SCOUT_HEADING = /^### (🔴|🟡|🟢) (.+?)\s*$/u;
const USAGE = [
  'Aufruf: node review-flow.js round1 <art> <dokument> <arbeitsbereich> <aktiv>',
  '       node review-flow.js scout-check <arbeitsbereich> <1|2>',
  '       node review-flow.js rework-check <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js answers-check <arbeitsbereich>',
  '       node review-flow.js checklist <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js followup-checklist <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js verify <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js finish <art> <dokument> <arbeitsbereich> --title <titel> [--ausgefallen <liste>]',
  '',
].join('\n');

class UsageError extends Error {}

function roundDir(workspace, round) {
  return path.join(workspace, `runde-${round}`);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readJson(file) {
  try {
    return { value: JSON.parse(readText(file)) };
  } catch (error) {
    return { error: fs.existsSync(file) ? `ungültiges JSON: ${error.message}` : `Datei fehlt: ${path.basename(file)}` };
  }
}

function readState(file) {
  return fs.existsSync(file) ? JSON.parse(readText(file)) : null;
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function writeJson(file, value) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function yesNo(value) {
  return value ? 'ja' : 'nein';
}

function errorLines(problems) {
  return problems.map((problem) => `ERROR ${problem}`);
}

// Offene Fragen am Lauf-Anfang: nur im Spec-Review; Spec-Rückfragen früherer Läufe eines Plan-Reviews sind nicht Teil des Ablaufs.
function earlierOpen(kind, text) {
  return kind === 'spec-review' ? units.openQuestions(text).map(({ key, canon, question }) => ({ key, canon, question })) : [];
}

function readReviews(dir, names, kind) {
  const entries = [];
  const failed = [];
  const errors = [];
  for (const name of names) {
    const { value, error } = readJson(path.join(dir, `${name}.json`));
    const problem = error ?? rules.reviewProblem(value, kind, name);
    if (problem) {
      failed.push(name);
      errors.push(`${name}: ${problem}`);
      continue;
    }
    for (const finding of value.findings) entries.push({ reviewer: name, finding });
  }
  return { entries, failed, errors };
}

function reworkInput(state, scoutBlocks = new Map()) {
  const red = state.groups.filter((group) => group.color === 'red');
  const redPart = red.length === 0 ? ['Keine 🔴-Stellen.'] : red.map((group) => {
    const block = scoutBlocks.get(`🔴 ${group.key}`);
    return [groupsLib.groupBlock(group), ...(block ? ['Scout-Vorschläge:', ...block.slice(1)] : [])].join('\n');
  });
  const openPart = state.open.length === 0 ? ['Keine.'] : state.open.map((question) => `- ${question.key} — ${question.question}`);
  return ['# Nacharbeit', '', '## 🔴-Stellen', '', redPart.join('\n\n'), '', '## Offene Fragen aus früheren Läufen', '', ...openPart, ''].join('\n');
}

function roundOne(kind, doc, workspace, active, checks = groupsLib.SCRIPT_CHECKS[kind]) {
  const dir = roundDir(workspace, 1);
  const text = readText(doc);
  write(path.join(workspace, SNAPSHOT), text);
  const { entries, failed, errors } = readReviews(dir, active, kind);
  const open = earlierOpen(kind, text);
  const openKeys = new Set(open.map((question) => question.canon));
  const { groups, dropped } = groupsLib.classify([...entries, ...groupsLib.runScriptChecks(text, checks)], { kind, text, openKeys });
  const counts = groupsLib.countColors(groups);
  const scoutGroups = groups.filter((group) => group.color === 'yellow' || (counts.red > 0 && group.color === 'red'));
  const state = { kind, groups, dropped, open, counts, failed };
  writeJson(path.join(dir, 'runde.json'), state);
  write(path.join(dir, 'aggregate.md'), `=== REPORT ===\n${groupsLib.table(groups)}\n${groupsLib.reworkSection(groups)}`);
  write(path.join(dir, 'scout-input.md'), groupsLib.reworkSection(scoutGroups));
  write(path.join(dir, 'nacharbeit.md'), reworkInput(state));
  return [
    `RUNDE1 rot=${counts.red} gelb=${counts.yellow} gruen=${counts.green} fragen=${open.length} ausgefallen=${failed.join(',') || '-'}`,
    ...errorLines(errors),
    `NEXT scout=${yesNo(scoutGroups.length > 0)} nacharbeit=${yesNo(counts.red > 0 || open.length > 0)}`,
  ].join('\n');
}

function scoutBlocksOf(text) {
  const blocks = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    const heading = SCOUT_HEADING.exec(line);
    if (heading) {
      current = [line];
      blocks.set(`${heading[1]} ${heading[2]}`, current);
    } else if (current) {
      current.push(line);
    }
  }
  for (const block of blocks.values()) while (block.length > 0 && block[block.length - 1].trim() === '') block.pop();
  return blocks;
}

function scoutProblems(inputText, scoutText) {
  const wanted = parseRework(inputText.split('\n'));
  const given = parseScout(scoutText.split('\n'));
  const problems = [];
  for (const group of wanted) {
    const hit = given.filter((candidate) => candidate.severity === group.severity && candidate.location === group.location);
    const name = `${group.severity} ${group.location}`;
    if (hit.length !== 1) problems.push(`${name}: ${hit.length === 0 ? 'keine' : 'mehrere'} Scout-Gruppen`);
    else if (hit[0].proposals.length < 1 || hit[0].proposals.length > 3) problems.push(`${name}: ${hit[0].proposals.length} Vorschläge statt 1 bis 3`);
    else if (!(hit[0].preferred >= 1 && hit[0].preferred <= hit[0].proposals.length)) problems.push(`${name}: kein gültiger bevorzugter Vorschlag`);
  }
  for (const group of given) {
    if (!wanted.some((candidate) => candidate.severity === group.severity && candidate.location === group.location)) {
      problems.push(`${group.severity} ${group.location}: Scout-Gruppe ohne Eingabe`);
    }
  }
  return problems;
}

function scoutCheck(workspace, round) {
  const dir = roundDir(workspace, round);
  const scoutFile = path.join(dir, 'scout.md');
  if (!fs.existsSync(scoutFile)) return 'SCOUT ungueltig\nERROR Datei fehlt: scout.md';
  const scoutText = readText(scoutFile);
  const problems = scoutProblems(readText(path.join(dir, 'scout-input.md')), scoutText);
  if (problems.length > 0) return ['SCOUT ungueltig', ...errorLines(problems)].join('\n');
  if (round === '1') write(path.join(dir, 'nacharbeit.md'), reworkInput(readState(path.join(dir, 'runde.json')), scoutBlocksOf(scoutText)));
  return 'SCOUT ok';
}

function redKeys(state) {
  return state.groups.filter((group) => group.color === 'red').map((group) => group.key);
}

function reworkCheck(kind, doc, workspace) {
  const dir = roundDir(workspace, 1);
  const state = readState(path.join(dir, 'runde.json'));
  const { value, error } = readJson(path.join(dir, 'rework.json'));
  const invalid = error ? [error] : questions.reworkProblems(value, kind, redKeys(state));
  if (invalid.length > 0) return ['NACHARBEIT ungueltig', ...errorLines(invalid)].join('\n');
  const bundle = questions.bundleProblems(value, kind, state.open);
  if (bundle.length > 0) return ['NACHARBEIT buendelung', ...errorLines(bundle)].join('\n');
  const asked = questions.numbered(value.questions ?? []);
  writeJson(path.join(dir, 'fragen.json'), asked);
  const halt = kind === 'spec-review' && asked.length > 0;
  const lines = [`NACHARBEIT ok fragen=${asked.length} anhalten=${yesNo(halt)}`];
  if (asked.length > 0) {
    write(path.join(dir, 'fragen.md'), questions.formatQuestions(asked));
    if (halt) lines.push('=== FRAGEN ===', questions.formatQuestions(asked).trimEnd());
  }
  return lines.join('\n');
}

function answersCheck(workspace) {
  const dir = roundDir(workspace, 1);
  const asked = readState(path.join(dir, 'fragen.json')) ?? [];
  const { value, error } = readJson(path.join(dir, 'antworten.json'));
  const problems = error ? [error] : questions.answersProblems(value, asked);
  return problems.length > 0 ? ['ANTWORTEN ungueltig', ...errorLines(problems)].join('\n') : 'ANTWORTEN ok';
}

// Fragen, die die Nacharbeit in diesem Lauf gestellt hat; sie bleiben offen, weil niemand sie im Lauf beantwortet.
function askedInRun(results, kind, asked) {
  return results.filter((result) => result.status === questions.QUESTION_STATUS[kind]).map((result) => {
    const canon = normalizeLocation(result.location);
    const bundled = asked.find((question) => question.locations.some((location) => normalizeLocation(location) === canon));
    return { key: result.location.trim(), canon, question: bundled?.question ?? result.rationale ?? '' };
  });
}

// Im Spec-Review zählt das Dokument (R-Eintrag ohne späteren W-Eintrag), im Plan-Review die Spec-Rückfragen des Laufs.
function openNow(kind, text, rework, asked) {
  if (kind === 'spec-review') return units.openQuestions(text).map(({ key, canon, question }) => ({ key, canon, question }));
  return askedInRun(rework.results, kind, asked);
}

function outcomeLine(rework, key) {
  const result = rework.results.find((candidate) => normalizeLocation(candidate.location) === normalizeLocation(key));
  return result ? `Nacharbeit: ${result.status}${result.rationale ? ` — ${result.rationale}` : ''}` : 'Nacharbeit: kein Ausgang';
}

function checklistText(items, changed) {
  const points = items.filter((item) => !item.script).map((item) => [`### ${item.key}`, `Herkunft: ${item.origin}`, ...item.details].join('\n'));
  return ['# Prüfliste', '', '## Punkte', '', points.length === 0 ? 'Keine Punkte.' : points.join('\n\n'), '',
    '## Geänderte Bereiche', '', ...(changed.length === 0 ? ['Keine geänderten Bereiche.'] : changed.map((unit) => `- ${unit.key}`)), ''].join('\n');
}

function writeChecklist(workspace, doc, items, open) {
  const changed = units.changedUnits(readText(path.join(workspace, SNAPSHOT)), readText(doc));
  const verifier = items.some((item) => !item.script) || changed.length > 0;
  const dir = roundDir(workspace, 2);
  writeJson(path.join(dir, 'pruefliste.json'), { items, changed, open, nachpruefer: verifier });
  write(path.join(dir, 'pruefliste.md'), checklistText(items, changed));
  const scripted = items.filter((item) => item.script).length;
  return `PRUEFLISTE punkte=${items.length - scripted} skript=${scripted} geaendert=${changed.length} nachpruefer=${yesNo(verifier)}`;
}

function checklist(kind, doc, workspace) {
  const dir = roundDir(workspace, 1);
  const state = readState(path.join(dir, 'runde.json'));
  const rework = readState(path.join(dir, 'rework.json'));
  const asked = readState(path.join(dir, 'fragen.json')) ?? [];
  const open = openNow(kind, readText(doc), rework, asked);
  const openCanon = new Set(open.map((question) => question.canon));
  const items = state.groups.filter((group) => group.color === 'red' && !openCanon.has(group.canon)).map((group) => ({
    key: group.key, canon: group.canon, origin: 'Finding aus Runde 1',
    script: group.items.filter((item) => item.color === 'red').every((item) => item.category === rules.SCRIPT_CATEGORY),
    details: [...group.items.map(groupsLib.itemLine), outcomeLine(rework, group.key)],
  }));
  for (const question of asked) {
    for (const location of question.locations) {
      const canon = normalizeLocation(location);
      if (openCanon.has(canon) || items.some((item) => item.canon === canon)) continue;
      items.push({ key: location, canon, origin: 'beantwortete Frage', script: false, details: [`Frage: ${question.question}`] });
    }
  }
  return writeChecklist(workspace, doc, items, open);
}

function followupChecklist(kind, doc, workspace) {
  const dir = path.join(workspace, 'nacharbeit');
  const chosen = parseRework(readText(path.join(dir, 'aggregate.md')).split('\n'));
  const { value, error } = readJson(path.join(dir, 'rework.json'));
  const results = value?.results;
  const invalid = error ? [error] : !Array.isArray(results) ? ['results fehlt']
    : [...results.map((result) => questions.resultProblem(result, kind)).filter(Boolean), ...questions.coverageProblems(results, chosen.map((group) => group.location))];
  if (invalid.length > 0) return ['PRUEFLISTE ungueltig', ...errorLines(invalid)].join('\n');
  const open = askedInRun(results, kind, []);
  const openCanon = new Set(open.map((question) => question.canon));
  const items = chosen.filter((group) => !openCanon.has(normalizeLocation(group.location))).map((group) => ({
    key: group.location, canon: normalizeLocation(group.location), origin: 'gewählter Vorschlag', script: false,
    details: [...group.findings, outcomeLine(value, group.location)],
  }));
  return writeChecklist(workspace, doc, items, open);
}

function verifierProblems(result, kind, aiItems) {
  if (result === null || typeof result !== 'object') return ['Ergebnis ist kein JSON-Objekt'];
  if (result.reviewer !== 'verifier') return [`reviewer ${String(result.reviewer)} passt nicht zu verifier`];
  if (!Array.isArray(result.verdicts) || !Array.isArray(result.findings)) return ['verdicts oder findings fehlt'];
  const problems = [];
  for (const verdict of result.verdicts) {
    if (!VERDICTS.includes(verdict?.verdict) || typeof verdict?.rationale !== 'string' || verdict.rationale.trim() === '') {
      problems.push(`Urteil zu ${String(verdict?.location)} braucht verdict erledigt|nicht erledigt und rationale`);
    }
  }
  problems.push(...questions.coverageProblems(result.verdicts.filter((verdict) => typeof verdict?.location === 'string'), aiItems.map((item) => item.key))
    .map((problem) => problem.replace('Ausgang', 'Urteil')));
  for (const finding of result.findings) {
    const problem = rules.findingProblem(finding, kind);
    if (problem) problems.push(problem);
  }
  return problems;
}

function verify(kind, doc, workspace, checks = groupsLib.SCRIPT_CHECKS[kind]) {
  const dir = roundDir(workspace, 2);
  const list = readState(path.join(dir, 'pruefliste.json'));
  const aiItems = list.items.filter((item) => !item.script);
  let result = { verdicts: [], findings: [] };
  if (list.nachpruefer) {
    const { value, error } = readJson(path.join(dir, 'verifier.json'));
    const problems = error ? [error] : verifierProblems(value, kind, aiItems);
    if (problems.length > 0) return ['NACHPRUEFUNG ungueltig', ...errorLines(problems)].join('\n');
    result = value;
  }
  const text = readText(doc);
  const verification = { checklist: new Set(list.items.map((item) => item.canon)), changed: new Set(list.changed.map((unit) => unit.canon)) };
  const entries = [...result.findings.map((finding) => ({ reviewer: 'verifier', finding })), ...groupsLib.runScriptChecks(text, checks)];
  const { groups, dropped } = groupsLib.classify(entries, { kind, text, openKeys: new Set(list.open.map((question) => question.canon)), verification });
  const redScript = new Set(groups.filter((group) => group.color === 'red' && group.items.some((item) => item.category === rules.SCRIPT_CATEGORY)).map((group) => group.canon));
  const verdicts = list.items.map((item) => {
    if (item.script) {
      const again = redScript.has(item.canon);
      return { key: item.key, script: true, verdict: again ? 'nicht erledigt' : 'erledigt', rationale: again ? 'Skript-Prüfung meldet die Stelle erneut' : 'Skript-Prüfung meldet die Stelle nicht mehr' };
    }
    const verdict = result.verdicts.find((candidate) => normalizeLocation(candidate.location) === item.canon);
    return { key: item.key, script: false, verdict: verdict.verdict, rationale: verdict.rationale };
  });
  const counts = groupsLib.countColors(groups);
  const offen = verdicts.filter((verdict) => !verdict.script && verdict.verdict === 'nicht erledigt').length + counts.red;
  const hints = groups.filter((group) => group.color === 'yellow');
  writeJson(path.join(dir, 'nachpruefung.json'), { verdicts, groups, dropped, offen });
  write(path.join(dir, 'aggregate.md'), `=== REPORT ===\n${groupsLib.table(groups)}\n${groupsLib.reworkSection(groups)}`);
  write(path.join(dir, 'scout-input.md'), groupsLib.reworkSection(hints));
  return [`NACHPRUEFUNG ok offen=${offen} hinweise=${hints.length}`, `NEXT scout=${yesNo(hints.length > 0)}`].join('\n');
}

// Hinweise des Laufs mit ihren Scout-Vorschlägen für followup.js save; ohne Hinweise gibt es keine Sicherung.
function writeHints(workspace, roundOneState, verification) {
  const target = path.join(workspace, 'bericht');
  fs.rmSync(target, { recursive: true, force: true });
  const later = verification?.groups.filter((group) => group.color === 'yellow') ?? [];
  const earlier = (roundOneState?.groups ?? []).filter((group) => group.color === 'yellow' && !later.some((other) => other.canon === group.canon));
  const hints = [...earlier.map((group) => ({ group, round: 1 })), ...later.map((group) => ({ group, round: 2 }))];
  const blocks = hints.map(({ group, round }) => {
    const file = path.join(roundDir(workspace, round), 'scout.md');
    return fs.existsSync(file) ? scoutBlocksOf(readText(file)).get(`🟡 ${group.key}`) : null;
  });
  if (hints.length === 0 || blocks.some((block) => !block)) return;
  write(path.join(target, 'aggregate.md'), groupsLib.reworkSection(hints.map(({ group }) => group)));
  write(path.join(target, 'scout.md'), ['## Scout-Vorschläge', '', blocks.map((block) => block.join('\n')).join('\n\n'), ''].join('\n'));
}

function finish(kind, doc, workspace, title, failed) {
  const roundOneState = readState(path.join(roundDir(workspace, 1), 'runde.json'));
  const list = readState(path.join(roundDir(workspace, 2), 'pruefliste.json'));
  const verification = readState(path.join(roundDir(workspace, 2), 'nachpruefung.json'));
  const asked = readState(path.join(roundDir(workspace, 1), 'fragen.json')) ?? [];
  const reworked = [path.join(roundDir(workspace, 1), 'rework.json'), path.join(workspace, 'nacharbeit', 'rework.json')].some((file) => fs.existsSync(file));
  const open = list?.open ?? roundOneState?.open ?? [];
  const status = flowReport.statusOf({ failed, open, verification });
  writeHints(workspace, roundOneState, verification);
  const text = flowReport.report({ title, artifact: doc, status, roundOne: roundOneState, verification, reworked, open, asked });
  return [`STATUS ${status}`, '=== BERICHT ===', text.trimEnd()].join('\n');
}

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function kindOf(value) {
  if (!KINDS.includes(value)) throw new UsageError(`Unbekannte Art: ${value}`);
  return value;
}

const COMMANDS = {
  round1: ([kind, doc, workspace, active]) => roundOne(kindOf(kind), doc, workspace, String(active ?? '').split(',').filter(Boolean)),
  'scout-check': ([workspace, round]) => {
    if (!['1', '2'].includes(round)) throw new UsageError('scout-check braucht die Runde 1 oder 2');
    return scoutCheck(workspace, round);
  },
  'rework-check': ([kind, doc, workspace]) => reworkCheck(kindOf(kind), doc, workspace),
  'answers-check': ([workspace]) => answersCheck(workspace),
  checklist: ([kind, doc, workspace]) => checklist(kindOf(kind), doc, workspace),
  'followup-checklist': ([kind, doc, workspace]) => followupChecklist(kindOf(kind), doc, workspace),
  verify: ([kind, doc, workspace]) => verify(kindOf(kind), doc, workspace),
  finish: ([kind, doc, workspace, ...rest]) => {
    const title = option(rest, '--title');
    if (!title) throw new UsageError('finish braucht --title');
    const failed = String(option(rest, '--ausgefallen') ?? '').split(',').map((name) => name.trim()).filter((name) => name && name !== '-');
    return finish(kindOf(kind), doc, workspace, title, failed);
  },
};

function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (!Object.hasOwn(COMMANDS, command) || args.length === 0 || args.some((arg) => arg === undefined)) throw new UsageError(`Unbekannter Befehl: ${command}`);
    process.stdout.write(`${COMMANDS[command](args)}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    process.stderr.write(`dv-forge review-flow: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { roundOne, scoutCheck, reworkCheck, answersCheck, checklist, followupChecklist, verify, finish, scoutProblems, SNAPSHOT };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0` (darunter 15 Tests in `review-flow-round1.test.js`, 17 in `review-flow-round2.test.js`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/review-flow.js plugins/forge/scripts/followup.js plugins/forge/tests/lib/flow-workspace.js plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/review-flow-round2.test.js` · `git commit -m "feat(forge): add review-flow script for search round, rework and verification"`

### Task 8: Guard — `review-flow.js` erlauben und beim Anhalten nicht freigeben

**ACs:** AC-17, AC-18

**Dateien:**
- Modify: `plugins/forge/scripts/guard-orchestrator.js:14-15` · `ALLOWED_SCRIPTS`, `onPrompt`, `release`, `main`, `module.exports`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `decidePreTool_PlanReviewSubagentEditsPlan_Allows`

**Interfaces:**
- Consumes: `readMarker`, `writeMarker`, `markerPath` im selben Modul
- Produces: `pause(sessionId, tmpRoot?)` setzt im Marker `paused: true`; CLI `node plugins/forge/scripts/guard-orchestrator.js pause <SESSION>`; eine Eingabe des Menschen ohne Skill-Aufruf löscht bei `paused: true` nur das Flag, sonst gibt sie den Guard frei. `review-flow.js` steht in `ALLOWED_SCRIPTS`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/guard-orchestrator.test.js` direkt vor `test('decidePreTool_PlanReviewSubagentEditsPlan_Allows', () => {` einfügen:
  ```js
test('decidePreTool_ReviewFlowScriptNamesSpec_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/review-flow.js" round1 spec-review "${env.specPath}" "${env.cwd}/.forge/ws" clarity`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('pause_HumanAnswersAfterHalt_GuardStaysOnceThenReleases', () => {
  const env = setup();
  guard.pause(SESSION, env.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'F1: b, F2: später' }, env.tmpRoot);
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'danke' }, env.tmpRoot);
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
});

test('pause_NoMarker_CreatesNone', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  guard.pause('ohne-marker', tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath('ohne-marker', tmpRoot)), false);
});

  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/guard-orchestrator.test.js` — erwartet: FAIL `decidePreTool_ReviewFlowScriptNamesSpec_Allows`, `pause_HumanAnswersAfterHalt_GuardStaysOnceThenReleases`, `pause_NoMarker_CreatesNone`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/guard-orchestrator.js`:
  - `ALLOWED_SCRIPTS` ersetzen durch:
    ```js
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js', 'review-flow.js',
  'plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js', 'prepare.js', 'forge-config.js', 'work.js', 'ledger.js', 'followup.js'];
    ```
  - In `onPrompt` die letzte Zeile `if (!HARNESS_NOTICE.test(String(input.prompt ?? ''))) release(input.session_id, tmpRoot);` ersetzen durch:
    ```js
  if (HARNESS_NOTICE.test(String(input.prompt ?? ''))) return;
  // Beim Anhalten für Fragen an den Menschen bleibt der Guard für genau eine Antwort bestehen.
  const marker = readMarker(input.session_id, tmpRoot);
  if (marker?.paused) {
    writeMarker(input.session_id, { ...marker, paused: false }, tmpRoot);
    return;
  }
  release(input.session_id, tmpRoot);
    ```
  - Direkt nach der Funktion `release` einfügen:
    ```js
function pause(sessionId, tmpRoot) {
  const marker = readMarker(sessionId, tmpRoot);
  if (marker) writeMarker(sessionId, { ...marker, paused: true }, tmpRoot);
}
    ```
  - In `main` nach `if (event === 'release') return release(argument);` einfügen: `if (event === 'pause') return pause(argument);`
  - Den Export ersetzen durch:
    ```js
module.exports = { COMMANDS, PLUGIN_ROOT, markerPath, parseSkillCall, writeMarker, onPrompt, decidePreTool, release, pause };
    ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/guard-orchestrator.test.js` · `git commit -m "feat(forge): keep the orchestrator guard while a review run waits for answers"`

### Task 9: Ergebnis-Hook kennt `answers`

**ACs:** AC-36

**Dateien:**
- Modify: `plugins/forge/scripts/result-check.js:47` · `problemWith`
- Test: `plugins/forge/tests/review-files.test.js` · `resultCheck_InvalidJson_Blocks`

**Interfaces:**
- Consumes: —
- Produces: `problemWith(file)` akzeptiert JSON mit einer Liste `findings`, `results` oder `answers`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/review-files.test.js` direkt vor `test('resultCheck_InvalidJson_Blocks', () => {` einfügen:
  ```js
test('resultCheck_AnswersFile_AllowsStop', () => {
  const target = path.join(tmp(), 'antworten.json');
  fs.writeFileSync(target, JSON.stringify({ answers: [{ question: 'F1', status: 'open' }] }));
  assert.equal(resultCheck.decide({ agent_transcript_path: transcript(`Ergebnis: ${target}`) }), null);
});

  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-files.test.js` — erwartet: FAIL `resultCheck_AnswersFile_AllowsStop`
- [ ] **Schritt 3: Minimal implementieren**
  In `problemWith` die Zeile `if (!Array.isArray(value.findings) && !Array.isArray(value.results)) return 'hat weder "findings" noch "results"';` ersetzen durch:
  ```js
  if (!['findings', 'results', 'answers'].some((key) => Array.isArray(value[key]))) return 'hat weder "findings" noch "results" noch "answers"';
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-files.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/result-check.js plugins/forge/tests/review-files.test.js` · `git commit -m "fix(forge): accept answer files in the result hook"`

### Task 10: Reviewer vergeben eine Kategorie statt einer Farbe

**ACs:** AC-01, AC-02, AC-03, AC-39

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-completeness.md` · `## Einstufung`, `"severity": "red",`, `3. Enthält die Spec gar keine AC-IDs`
- Modify: `plugins/forge/agents/spec-review-consistency.md` · `## Einstufung`, `"severity": "red",`, `3. Ein echter Widerspruch ist`
- Modify: `plugins/forge/agents/spec-review-feasibility.md` · `## Einstufung`, `"severity": "red",`
- Modify: `plugins/forge/agents/spec-review-clarity.md` · `## Einstufung`, `"severity": "red",`, `Solche Details sind`
- Modify: `plugins/forge/agents/spec-review-profiles.md` · `## Einstufung`, `"severity": "red",`, `5. Ein falscher Begriff ist`
- Modify: `plugins/forge/agents/plan-review-coverage.md` · `## Einstufung`, `"severity": "red",`, `immer \`red\``
- Modify: `plugins/forge/agents/plan-review-feasibility.md` · `## Einstufung`, `"severity": "red",`
- Modify: `plugins/forge/agents/plan-review-architecture.md` · `## Einstufung`, `"severity": "red",`
- Modify: `plugins/forge/agents/plan-review-risks.md` · `## Einstufung`, `"severity": "red",`
- Modify: `plugins/forge/agents/plan-review-buildability.md` · `## Einstufung`, `"severity": "red",`
- Test: `plugins/forge/tests/agents.test.js` · `FORMAT_KEYS`, `plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed`

**Interfaces:**
- Consumes: Kategorien aus `CATEGORIES` (Task 3)
- Produces: Reviewer-Ergebnis `{ "reviewer", "summary", "findings": [{ "location", "quote", "category", "consequence", "rationale" }] }` ohne `severity`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/agents.test.js`:
  - `const FORMAT_KEYS = ['"reviewer"', '"summary"', '"findings"', '"location"', '"quote"', '"severity"', '"consequence"', '"rationale"'];` ersetzen durch:
    ```js
const FORMAT_KEYS = ['"reviewer"', '"summary"', '"findings"', '"location"', '"quote"', '"category"', '"consequence"', '"rationale"'];
const SPEC_CATEGORIES = ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'detail', 'formulierung'];
const PLAN_CATEGORIES = [...SPEC_CATEGORIES, 'ac-fehlt-im-plan', 'umsetzer-steckt-fest'];

function categorySection(body) {
  const start = body.indexOf('## Kategorie\n');
  return start === -1 ? '' : body.slice(start, body.indexOf('\n## ', start + 1));
}
    ```
  - In `plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed` die Zeile `assert.match(body, /immer \`red\`/);` ersetzen durch `assert.match(body, /immer Kategorie \`ac-fehlt-im-plan\`/);`.
  - Am Dateiende anhängen:
    ```js
test('specAndPlanReviewers_Body_NameCategoriesNeverColours', () => {
  const reviewers = [
    ...['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => [`spec-review-${name}`, SPEC_CATEGORIES]),
    ...['coverage', 'feasibility', 'architecture', 'risks', 'buildability'].map((name) => [`plan-review-${name}`, PLAN_CATEGORIES]),
  ];
  for (const [name, categories] of reviewers) {
    const { body } = readAgent(name);
    const section = categorySection(body);
    for (const category of categories) assert.ok(section.includes(`- \`${category}\` — `), `${name}: ${category} fehlt`);
    if (name.startsWith('spec-')) assert.ok(!section.includes('ac-fehlt-im-plan'), `${name}: Plan-Kategorie`);
    assert.ok(!body.includes('## Einstufung'), `${name}: alte Einstufung`);
    assert.ok(!body.includes('"severity"'), `${name}: severity`);
    assert.ok(!/`(red|yellow|green)`/.test(body), `${name}: Farbe als Wert`);
    assert.ok(body.includes('Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.'), `${name}: Hinweis auf ungültige Farbe`);
  }
});
    ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: FAIL `specAndPlanReviewers_Body_NameCategoriesNeverColours`, `plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed` und die `_Body_EmbedsFindingFormatWithOwnReviewerName`- bzw. `_Body_FormatCalibrationDecisionsLocations`-Tests (`"category"` fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  In jeder der fünf Dateien `plugins/forge/agents/spec-review-*.md` (ohne `spec-review-scout.md`) den ganzen Abschnitt ab `## Einstufung` bis vor `## Ausgabe` ersetzen durch:
  ```markdown
## Kategorie
Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.
- `widerspruch` — zwei Aussagen schließen sich aus.
- `fehlendes-verhalten` — eine beschriebene Funktion hat gar kein AC oder eine Aktion gar kein Ergebnis.
- `unerfuellbar` — eine Anforderung lässt sich nicht erfüllen oder setzt etwas voraus, das die Spec nie herstellt.
- `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Plan selbst entscheiden kann.
- `formulierung` — Anmerkung, Formulierung.

  ```
  In jeder der fünf Dateien `plugins/forge/agents/plan-review-*.md` (ohne `plan-review-scout.md`) den ganzen Abschnitt ab `## Einstufung` bis vor `## Ausgabe` ersetzen durch:
  ```markdown
## Kategorie
Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.
- `widerspruch` — zwei Aussagen in Plan oder Spec schließen sich aus, oder der Plan widerspricht der Spec, dem Code oder einer Regel des Projekts.
- `fehlendes-verhalten` — eine Funktion, die der Plan baut, hat gar keinen Test oder eine Aktion gar kein Ergebnis.
- `unerfuellbar` — ein Schritt lässt sich nicht erfüllen oder setzt etwas voraus, das kein Task herstellt.
- `ac-fehlt-im-plan` — ein AC der Spec fehlt im Plan oder ist nur teilweise umgesetzt.
- `umsetzer-steckt-fest` — ein Umsetzer bliebe stecken, müsste raten oder dürfte einen Schritt nicht ausführen, auch bei einem Befehl, den das Projekt verbietet.
- `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Umsetzer selbst entscheiden kann.
- `formulierung` — Anmerkung, Formulierung.

  ```
  Im JSON-Beispiel jeder dieser zehn Dateien die Zeile `      "severity": "red",` ersetzen durch `      "category": "<k>",` mit `<k>` = `fehlendes-verhalten` (completeness), `widerspruch` (consistency, clarity, profiles, plan-review-architecture), `unerfuellbar` (spec-review-feasibility, plan-review-risks), `ac-fehlt-im-plan` (coverage), `umsetzer-steckt-fest` (plan-review-feasibility, buildability). In jeder dieser Dateien die Zeile `- Alle Felder sind Strings und Pflicht.` ersetzen durch `- Alle Felder sind Strings und Pflicht. \`category\` ist genau eine Kategorie aus \`## Kategorie\`.`
  Außerdem wörtlich ersetzen:
  - `spec-review-completeness.md`: `meldest du genau ein \`red\`-Finding an der ersten Überschrift der Spec.` → `meldest du genau ein Finding der Kategorie \`fehlendes-verhalten\` an der ersten Überschrift der Spec.`
  - `spec-review-consistency.md`: `3. Ein echter Widerspruch ist \`red\`. Ein externer Verweis ist \`red\`, wenn der Bau seinen Inhalt braucht, sonst \`yellow\`.` → `3. Ein echter Widerspruch hat die Kategorie \`widerspruch\`. Ein externer Verweis hat \`unerfuellbar\`, wenn der Bau seinen Inhalt braucht, sonst \`detail\`.`
  - `spec-review-clarity.md`: `Solche Details sind \`yellow\`, außer sie widersprechen einer Anforderung.` → `Solche Details haben die Kategorie \`detail\`, außer sie widersprechen einer Anforderung; dann \`widerspruch\`.`
  - `spec-review-profiles.md`: `5. Ein falscher Begriff ist \`yellow\`, außer er macht eine Anforderung mehrdeutig, dann ist er \`red\`. Ein Widerspruch zum Ist-Stand ist \`red\`.` → `5. Ein falscher Begriff hat die Kategorie \`detail\`, außer er macht eine Anforderung mehrdeutig, dann \`widerspruch\`. Ein Widerspruch zum Ist-Stand hat \`widerspruch\`.`
  - `plan-review-coverage.md`, zweimal: `ist das ein Finding an \`AC-<Zahl>\`, immer \`red\`` → `ist das ein Finding an \`AC-<Zahl>\`, immer Kategorie \`ac-fehlt-im-plan\``
  Danach in den zehn Dateien nach `` `red` ``, `` `yellow` ``, `` `green` `` suchen; jeder weitere Treffer wird nach derselben Zuordnung ersetzt (rot → passende 🔴-Kategorie, gelb → `detail`, grün → `formulierung`).
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-completeness.md plugins/forge/agents/spec-review-consistency.md plugins/forge/agents/spec-review-feasibility.md plugins/forge/agents/spec-review-clarity.md plugins/forge/agents/spec-review-profiles.md plugins/forge/agents/plan-review-coverage.md plugins/forge/agents/plan-review-feasibility.md plugins/forge/agents/plan-review-architecture.md plugins/forge/agents/plan-review-risks.md plugins/forge/agents/plan-review-buildability.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): spec and plan reviewers report a category instead of a colour"`

### Task 11: Nachprüfer-Agenten für Spec- und Plan-Review

**ACs:** AC-22, AC-23, AC-24, AC-32

**Dateien:**
- Create: `plugins/forge/agents/spec-review-verifier.md`
- Create: `plugins/forge/agents/plan-review-verifier.md`
- Test: `plugins/forge/tests/agents.test.js` · `allReviewers_Body_WriteResultFileWithEmptyExample`

**Interfaces:**
- Consumes: `runde-2/pruefliste.md` aus `review-flow.js checklist` (Task 7): Abschnitte `## Punkte` mit `### <Stelle>`, `Herkunft: …`, Details, und `## Geänderte Bereiche`
- Produces: Ergebnis `runde-2/verifier.json` im Format aus Task 7 (`reviewer: "verifier"`, `verdicts`, `findings`)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` in `allReviewers_Body_WriteResultFileWithEmptyExample` die Zeile `const names = fs.readdirSync(AGENTS).filter((file) => /-review-/.test(file) && !file.includes('scout')).map((file) => file.slice(0, -3));` ersetzen durch:
  ```js
  const names = fs.readdirSync(AGENTS).filter((file) => /-review-/.test(file) && !file.includes('scout') && !file.includes('verifier')).map((file) => file.slice(0, -3));
  ```
  Am Dateiende anhängen:
  ```js
for (const [name, tools, inputs, categories] of [
  ['spec-review-verifier', 'Read, Write', ['- `Spec:`'], SPEC_CATEGORIES],
  ['plan-review-verifier', 'Read, Grep, Glob, Write', ['- `Plan:`', '- `Spec:`', '- `Repo:`'], PLAN_CATEGORIES],
]) {
  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, tools);
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_JudgesChecklistAndChangedAreasOnly`, () => {
    const { body } = readAgent(name);
    for (const input of [...inputs, '- `Prüfliste:`', '- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei']) assert.ok(body.includes(input), `${name}: ${input}`);
    for (const part of ['"verdicts"', '"verdict": "erledigt"', '`nicht erledigt`', 'Du suchst nicht neu', 'nur darauf, ob sein neuer Text',
      '`{"reviewer": "verifier", "summary": "<Prüfumfang>", "verdicts": [], "findings": []}`', 'Deine letzte Aktion: Schreib dein Ergebnis mit `Write`']) {
      assert.ok(body.includes(part), `${name}: ${part}`);
    }
    for (const category of categories) assert.ok(categorySection(body).includes(`- \`${category}\` — `), `${name}: ${category}`);
    assert.ok(!body.includes('"severity"'));
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
  });
}
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: FAIL `spec-review-verifier_Frontmatter_NameToolsModelDescription` mit `ENOENT`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/agents/spec-review-verifier.md`:
  ````markdown
---
name: spec-review-verifier
description: Use when the dv-forge spec-review orchestrator needs round 2 of a run judged, every checklist point done or not done after the rework, and every changed area checked for contradictions with the rest of the spec.
tools: Read, Write
model: sonnet
---

# Spec-Review: Nachprüfer

Du prüfst in Runde 2 eines Spec-Reviews nach, ob die Nacharbeit die Punkte der Prüfliste erledigt hat. Du suchst nicht neu. Du liest nur die Spec und die Prüfliste aus dem Auftrag, keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Prüfliste:` Datei mit `## Punkte` (je Punkt `### <Stelle>`, Herkunft, die Findings aus Runde 1 oder die beantwortete Frage und der Ausgang der Nacharbeit) und `## Geänderte Bereiche`
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Auftrag
1. Je Punkt genau ein Urteil: `erledigt`, wenn die Spec an dieser Stelle das Problem der Findings nicht mehr hat oder die Antwort des Menschen umsetzt, sonst `nicht erledigt`. Ein „nicht geändert“ der Nacharbeit ist `erledigt`, wenn seine Begründung sachlich trägt.
2. Jeden geänderten Bereich prüfst du nur darauf, ob sein neuer Text einer anderen Aussage der Spec widerspricht. Jeden Widerspruch meldest du als Finding der Kategorie `widerspruch` an diesem Bereich; `quote` enthält beide Zitate, getrennt durch ` ↔ `.
3. Fällt dir dabei an einer Stelle eine andere Schwäche auf, meldest du sie als Finding mit ihrer Kategorie. Du suchst solche Schwächen nicht aktiv; ein Skript stuft sie herab.
4. Einträge der Form `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding.

## Kategorie
Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.
- `widerspruch` — zwei Aussagen schließen sich aus.
- `fehlendes-verhalten` — eine beschriebene Funktion hat gar kein AC oder eine Aktion gar kein Ergebnis.
- `unerfuellbar` — eine Anforderung lässt sich nicht erfüllen oder setzt etwas voraus, das die Spec nie herstellt.
- `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Plan selbst entscheiden kann.
- `formulierung` — Anmerkung, Formulierung.

## Ausgabe
Deine letzte Aktion: Schreib dein Ergebnis mit `Write` als JSON an den Pfad aus `Ergebnis:`, auch ohne Punkte und Findings. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "reviewer": "verifier",
  "summary": "Prüfumfang in einem Satz",
  "verdicts": [
    { "location": "AC-04", "verdict": "erledigt", "rationale": "Warum" }
  ],
  "findings": [
    {
      "location": "AC-12",
      "quote": "neuer Text ↔ widersprochene Aussage",
      "category": "widerspruch",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `verdicts`: genau ein Eintrag je Punkt, `location` exakt wie in `### <Stelle>`, `verdict` ist `erledigt` oder `nicht erledigt`.
- `findings`: `location` ist `AC-<Zahl>`, der Name eines Schritts oder einer Soll-Vorgabe oder die exakte Abschnittsüberschrift. Alle Felder sind Strings und Pflicht. `category` ist genau eine Kategorie aus `## Kategorie`.
- Ohne Punkte und Findings schreibst du genau diese Form: `{"reviewer": "verifier", "summary": "<Prüfumfang>", "verdicts": [], "findings": []}`.
  ````
  `plugins/forge/agents/plan-review-verifier.md`:
  ````markdown
---
name: plan-review-verifier
description: Use when the dv-forge plan-review orchestrator needs round 2 of a run judged, every checklist point done or not done after the rework, and every changed area of the plan checked for contradictions with the rest of plan, spec and code.
tools: Read, Grep, Glob, Write
model: sonnet
---

# Plan-Review: Nachprüfer

Du prüfst in Runde 2 eines Plan-Reviews nach, ob die Nacharbeit die Punkte der Prüfliste erledigt hat. Du suchst nicht neu. Du liest Plan, Spec, die Prüfliste und, wo ein Punkt es braucht, den Code im Repo, nur lesend. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu
- `Prüfliste:` Datei mit `## Punkte` (je Punkt `### <Stelle>`, Herkunft, die Findings aus Runde 1 und der Ausgang der Nacharbeit) und `## Geänderte Bereiche`
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Auftrag
1. Je Punkt genau ein Urteil: `erledigt`, wenn der Plan an dieser Stelle das Problem der Findings nicht mehr hat, sonst `nicht erledigt`. Einen Punkt an `AC-<Zahl>` prüfst du gegen das ganze AC der Spec. Ein „nicht geändert“ der Nacharbeit ist `erledigt`, wenn seine Begründung sachlich trägt.
2. Jeden geänderten Bereich prüfst du nur darauf, ob sein neuer Text dem Rest des Plans, der Spec oder dem Code widerspricht. Jeden Widerspruch meldest du als Finding der Kategorie `widerspruch` an diesem Bereich; `quote` enthält beide Zitate, getrennt durch ` ↔ `.
3. Fällt dir dabei an einer Stelle eine andere Schwäche auf, meldest du sie als Finding mit ihrer Kategorie. Du suchst solche Schwächen nicht aktiv; ein Skript stuft sie herab.
4. W-Einträge in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding.

## Kategorie
Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.
- `widerspruch` — zwei Aussagen in Plan oder Spec schließen sich aus, oder der Plan widerspricht der Spec, dem Code oder einer Regel des Projekts.
- `fehlendes-verhalten` — eine Funktion, die der Plan baut, hat gar keinen Test oder eine Aktion gar kein Ergebnis.
- `unerfuellbar` — ein Schritt lässt sich nicht erfüllen oder setzt etwas voraus, das kein Task herstellt.
- `ac-fehlt-im-plan` — ein AC der Spec fehlt im Plan oder ist nur teilweise umgesetzt.
- `umsetzer-steckt-fest` — ein Umsetzer bliebe stecken, müsste raten oder dürfte einen Schritt nicht ausführen, auch bei einem Befehl, den das Projekt verbietet.
- `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Umsetzer selbst entscheiden kann.
- `formulierung` — Anmerkung, Formulierung.

## Ausgabe
Deine letzte Aktion: Schreib dein Ergebnis mit `Write` als JSON an den Pfad aus `Ergebnis:`, auch ohne Punkte und Findings. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "reviewer": "verifier",
  "summary": "Prüfumfang in einem Satz",
  "verdicts": [
    { "location": "Task 3", "verdict": "erledigt", "rationale": "Warum" }
  ],
  "findings": [
    {
      "location": "Task 4",
      "quote": "neuer Text ↔ widersprochene Aussage",
      "category": "widerspruch",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `verdicts`: genau ein Eintrag je Punkt, `location` exakt wie in `### <Stelle>`, `verdict` ist `erledigt` oder `nicht erledigt`.
- `findings`: `location` ist `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Alle Felder sind Strings und Pflicht. `category` ist genau eine Kategorie aus `## Kategorie`.
- Ohne Punkte und Findings schreibst du genau diese Form: `{"reviewer": "verifier", "summary": "<Prüfumfang>", "verdicts": [], "findings": []}`.
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-verifier.md plugins/forge/agents/plan-review-verifier.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): add verifier agents for round 2 of spec and plan review"`

### Task 12: Nacharbeiter — nur 🔴, drei Ausgänge, gebündelte Fragen, Antwort-Modus

**ACs:** AC-13, AC-14, AC-15, AC-17, AC-19, AC-21, AC-36, AC-37, AC-41

**Dateien:**
- Modify: `plugins/forge/agents/spec-rework.md` (ganzer Inhalt) · `# Spec-Nacharbeit`
- Modify: `plugins/forge/agents/plan-rework.md` (ganzer Inhalt) · `# Plan-Nacharbeit`
- Test: `plugins/forge/tests/agents.test.js` · `spec-rework_Body_DefinesDecisionEntryFormat`

**Interfaces:**
- Consumes: `runde-1/nacharbeit.md` (Task 7: `## 🔴-Stellen`, `## Offene Fragen aus früheren Läufen`), `runde-1/fragen.md` (Task 7)
- Produces: `rework.json` und `antworten.json` im Format aus Task 5

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` am Dateiende anhängen:
  ```js
test('reworkAgents_Body_OnlyRedStellenThreeOutcomesAndBundledQuestions', () => {
  for (const [name, question] of [['spec-rework', 'human-question'], ['plan-rework', 'spec-question']]) {
    const { body } = readAgent(name);
    for (const part of ['- `Nacharbeit:` Datei mit `## 🔴-Stellen`', 'Hinweise und 🟢-Findings bearbeitest du nicht', '"questions"', '"locations"', '"cases"',
      '"recommendation"', '"reason"', `\`${question}\``, 'Jede Stelle mit Frage steht in genau einer gebündelten Frage', 'je Regel']) {
      assert.ok(body.includes(part), `${name}: ${part}`);
    }
    assert.ok(!body.includes('Du bearbeitest jede 🔴- und jede 🟡-Gruppe'), `${name}: alte Regel`);
  }
});

test('spec-rework_Body_AnswerModeWritesWEntriesAfterREntries', () => {
  const { body } = readAgent('spec-rework');
  for (const part of ['## Antwort-Modus', '- `Fragen:`', '- `Antworten:`', '"answers"', '`answered`', '`partial`', '`open`', 'nach allen R-Einträgen',
    '- **W · <Stelle>[, <Stelle>…]** · Aussage — <Antwort>', '„später“', '## Offene Fragen aus früheren Läufen']) {
    assert.ok(body.includes(part), part);
  }
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: FAIL `reworkAgents_Body_OnlyRedStellenThreeOutcomesAndBundledQuestions`, `spec-rework_Body_AnswerModeWritesWEntriesAfterREntries`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/agents/spec-rework.md` bekommt diesen ganzen Inhalt:
  ````markdown
---
name: spec-rework
description: Use when the dv-forge spec-review orchestrator has classified reviewer findings for a spec.md and the red locations have to be corrected, human questions bundled per rule or human answers entered, with every handled location recorded in the spec's decisions section.
tools: Read, Edit, Write
model: opus
---

# Spec-Nacharbeit

Du korrigierst eine Spec. Du liest und änderst nur die Spec, deren Pfad im Auftrag steht, und liest die Dateien aus dem Auftrag. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Nacharbeit:` Datei mit `## 🔴-Stellen` (je Gruppe `### 🔴 <Stelle> (<Reviewer>)`, die Einzel-Findings und die Scout-Vorschläge) und `## Offene Fragen aus früheren Läufen`
- `Fragen:` nur im Antwort-Modus, statt `Nacharbeit:`: Datei mit den gezeigten Fragen `F<n>`
- `Antworten:` nur im Antwort-Modus: die Antwort des Menschen, wörtlich
- `Vorschläge:` nur im Folge-Modus, statt `Nacharbeit:`: Datei mit den gewählten Gruppen, je Gruppe Überschrift `### <g> · <Stufe> <Stelle> (<Reviewer>)`, Einzel-Findings, `Gewählt: Vorschlag <n>` und dessen Text
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Regeln
1. Du bearbeitest nur die 🔴-Stellen aus `Nacharbeit:`. Hinweise und 🟢-Findings bearbeitest du nicht und schreibst für sie keinen Eintrag.
2. Pro Stelle entscheidest du genau einen Ausgang: **geändert**, **nicht geändert** oder **frage an den menschen**. „Nicht geändert“ ist nur mit einer Begründung aus der Spec selbst erlaubt, etwa weil das Finding auf einer Fehllesung beruht oder weil es einer bestehenden Entscheidung widerspricht und diese trägt. Die Scout-Vorschläge helfen dir; sie binden dich nicht.
3. Vor jeder Änderung prüfst du, was sie ist. Eine **Klarstellung** schärft, was die Spec schon festlegt: Wortlaut, Messbarkeit, ein Widerspruch, dessen Auflösung aus der Spec folgt. Die schreibst du. Legt die Lösung dagegen **neues Verhalten** fest, das die Spec nicht trägt (ein neuer Fall, eine neue Regel, ein neues AC), entscheidet das nur der Mensch: Du änderst die Spec an dieser Stelle nicht und wählst `frage an den menschen`.
4. Die Spec bleibt beim WAS und in sich abgeschlossen: keine Verweise auf andere Dokumente, keine Klassen-, Datei- oder Tabellennamen.
5. AC-IDs werden nie umnummeriert. Ein neues AC bekommt die nächste freie Nummer. Ein gestrichenes AC bleibt als `- **AC-xx** (entfällt, siehe Entscheidungen)` stehen.
6. Der Abschnitt `## Entscheidungen` muss nicht der letzte Abschnitt der Spec sein. Deine Einträge hängst du ans Ende dieses Abschnitts an, auch wenn danach weitere Abschnitte folgen — nicht ans Ende der Spec. Eine Überschrift der zweiten Ebene, die auf „Entscheidungen“ endet, zählt als dieser Abschnitt. Fehlt er, legst du ihn direkt vor `## Offen, bewusst nicht weiterverfolgt (Abbruch)` an, wenn es diesen Abschnitt gibt, sonst am Ende der Spec. Bestehende Einträge löschst du nie.
7. Pro bearbeiteter Stelle schreibst du genau einen Eintrag in diesem Format, `<r>` ist 1:
   `- **R<r> · <Stelle>** — geändert | nicht geändert | frage an den menschen — <Begründung oder Frage>`
8. Existiert die Stelle nicht in der Spec, lautet der Eintrag `- **R<r> · <Stelle>** — nicht geändert — Stelle existiert nicht`.
9. Einträge der Form `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` sind bindende Entscheidungen des Menschen. Du änderst und entfernst sie nie. Verlangt ein Finding eine Änderung an einem W-Eintrag, lautet dein Eintrag `- **R<r> · <Stelle>** — nicht geändert — W-Eintrag ist bindend`.
10. Einträge des Abschnitts `## Offen, bewusst nicht weiterverfolgt (Abbruch)` löst, änderst oder entfernst du nie; Regel 3 gilt für sie nicht.
11. **Fragen bündeln:** Alle Stellen mit `frage an den menschen` und alle Stellen unter `## Offene Fragen aus früheren Läufen` bündelst du je Regel: eine Frage je Regel, mit allen betroffenen Stellen, den Unterfällen und einer empfohlenen Antwort mit Grund. Jede Stelle mit Frage steht in genau einer gebündelten Frage. Für offene Fragen früherer Läufe schreibst du keinen neuen R-Eintrag; der R-Eintrag je Stelle bleibt, auch wenn eine Frage mehrere Stellen nennt.
12. Gibt es keine 🔴-Stelle, sondern nur offene Fragen früherer Läufe, änderst du die Spec nicht und bündelst nur.

## Antwort-Modus
Bekommst du `Fragen:` und `Antworten:`, gilt:
1. Je Frage `F<n>` entscheidest du, ob die Antwort sie beantwortet: `answered` (alle Stellen), `partial` (nur ein Teil der Stellen) oder `open` (keine Antwort, unklar oder „später“). „Später“ gilt je Frage.
2. Für die beantworteten Stellen schreibst du einen W-Eintrag `- **W · <Stelle>[, <Stelle>…]** · Aussage — <Antwort>` ans Ende des Abschnitts Entscheidungen, nach allen R-Einträgen. Der Titel nennt genau die beantworteten Stellen. Sagt der Mensch „entscheide du“, gilt die Empfehlung mit Tag `delegiert` statt `Aussage`.
3. Du passt die Spec an jeder beantworteten Stelle an die Antwort an. An offenen Stellen änderst du nichts.
4. Deine letzte Aktion: Schreib mit `Write` an den Pfad aus `Ergebnis:` genau einen Eintrag je Frage und antworte danach nur mit `Ergebnis geschrieben: <pfad>`:
   ```json
   { "answers": [ { "question": "F1", "status": "answered" } ] }
   ```

## Folge-Modus
Bekommst du `Vorschläge:` statt `Nacharbeit:`, gelten die Regeln oben mit diesen Abweichungen:
1. Du bearbeitest nur die Gruppen dieser Datei, jede mit ihrer Stufe.
2. Du setzt den gewählten Vorschlag um. Scheitert er an der Spec, änderst du die Stelle nicht und begründest das.
3. Statt des R-Eintrags schreibst du pro Gruppe genau einen Eintrag `- **F · <Stelle>** — geändert | nicht geändert | frage an den menschen — Vorschlag <n>: <Begründung>`.
4. Im Ergebnis gilt: `location` ist die `<Stelle>` ohne Gruppennummer und Stufe. Bei `human-question` steht die Frage in `rationale`. `questions` entfällt.
5. Der gewählte Vorschlag ist die Entscheidung des Menschen; Regel 3 greift für ihn nicht. Du setzt ihn um und schreibst `geändert`, auch wenn er neues Verhalten festlegt. `frage an den menschen` schreibst du nur, wenn die Umsetzung über den Vorschlag hinaus weiteres neues Verhalten festlegen müsste.

## Ausgabe
Deine letzte Aktion: Schreib mit `Write` das Ergebnis als JSON an den Pfad aus `Ergebnis:`, `location` exakt wie in der Gruppen-Überschrift. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "results": [ { "location": "AC-04", "status": "changed", "rationale": "Was geändert wurde" } ],
  "questions": [
    {
      "rule": "Regel, zu der gefragt wird",
      "question": "Die Frage",
      "locations": ["AC-04", "AC-07"],
      "cases": ["a) erster Unterfall", "b) zweiter Unterfall"],
      "recommendation": "empfohlene Antwort",
      "reason": "Grund der Empfehlung"
    }
  ]
}
```

- `status`: `changed` (geändert) | `unchanged` (nicht geändert) | `human-question` (frage an den menschen). `rationale` ist bei `unchanged` Pflicht.
- `questions`: jede gebündelte Frage einmal; ohne Fragen `"questions": []`.
  ````
  `plugins/forge/agents/plan-rework.md` bekommt diesen ganzen Inhalt:
  ````markdown
---
name: plan-rework
description: Use when the dv-forge plan-review orchestrator has classified reviewer findings for a plan.md and the red locations have to be corrected against its spec and the code, spec questions bundled per rule, with every handled location recorded in the plan's decisions section.
tools: Read, Grep, Glob, Edit, Write
model: opus
---

# Plan-Nacharbeit

Du korrigierst einen Umsetzungsplan. Du änderst nur die Plan-Datei aus dem Auftrag. Spec und Code liest du, um richtig zu korrigieren; du änderst sie nie. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu
- `Nacharbeit:` Datei mit `## 🔴-Stellen` (je Gruppe `### 🔴 <Stelle> (<Reviewer>)`, die Einzel-Findings und die Scout-Vorschläge)
- `Vorschläge:` nur im Folge-Modus, statt `Nacharbeit:`: Datei mit den gewählten Gruppen, je Gruppe Überschrift `### <g> · <Stufe> <Stelle> (<Reviewer>)`, Einzel-Findings, `Gewählt: Vorschlag <n>` und dessen Text
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Regeln
1. Du bearbeitest nur die 🔴-Stellen aus `Nacharbeit:`. Hinweise und 🟢-Findings bearbeitest du nicht und schreibst für sie keinen Eintrag.
2. Pro Stelle entscheidest du genau eines:
   - **geändert** — du hast den Plan korrigiert.
   - **nicht geändert** — nur mit einer Begründung aus Plan, Spec oder Code, etwa weil das Finding auf einer Fehllesung beruht.
   - **spec-rückfrage** — das Finding lässt sich nur durch eine Änderung der Spec lösen: Die Spec widerspricht sich, lässt eine Festlegung offen, die der Plan nicht selbst treffen darf, oder verlangt Unmögliches. Der Plan bleibt an dieser Stelle unverändert.
3. Der korrigierte Plan hält das Plan-Format ein:
   - Task-Überschriften exakt `### Task <n>: <Komponente>`, `<n>` ganzzahlig und lückenlos ab 1.
   - Jede `Modify`-Zeile nennt nach `·` einen stabilen Anker: ein Symbol oder eine eindeutige Zeichenfolge in der Datei.
   - Jeder Code-Schritt enthält vollständigen Code, jeder Lauf-Schritt einen Befehl oder Tool-Aufruf mit erwarteter Ausgabe, erlaubt laut Projekt-`CLAUDE.md` im Repo.
   - Keine Platzhalter: „TBD“, „TODO“, „später umsetzen“, „passende Fehlerbehandlung ergänzen“, „Tests für das Obige schreiben“, „wie Task N“, Verweise auf nirgends definierte Typen oder Funktionen.
4. Teilst du einen Task oder fügst einen ein, nummerierst du alle Tasks lückenlos neu und ziehst jeden Verweis im Plan nach (`Consumes`, `Produces`, „aus Task n“). Der R-Eintrag nennt die Zuordnung, z. B. `Task 3 → Task 3, Task 4`. R-Einträge früherer Läufe änderst du nicht; ihre Nummern gelten für den Stand ihres Laufs.
5. W-Einträge sind bindende Entscheidungen des Menschen. Du änderst und entfernst sie nie.
6. Am Ende des Plans steht `## Entscheidungen`. Fehlt der Abschnitt, legst du ihn an. Bestehende Einträge löschst du nie.
7. Pro bearbeiteter Stelle schreibst du genau einen Eintrag, `<r>` ist 1:
   `- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>`
8. Bei einem Finding an `AC-<Zahl>` prüfst du das ganze AC aus der Spec gegen den Plan, nicht nur den zitierten Teil, und schließt alle Lücken dieses AC in derselben Nacharbeit.
9. Existiert die Stelle nicht im Plan, lautet der Eintrag `- **R<r> · <Stelle>** — nicht geändert — Stelle existiert nicht`.
10. **Fragen bündeln:** Alle Stellen mit `spec-rückfrage` bündelst du je Regel: eine Frage je Regel, mit allen betroffenen Stellen, den Unterfällen und einer empfohlenen Antwort mit Grund. Jede Stelle mit Frage steht in genau einer gebündelten Frage. Der Lauf wartet nicht auf eine Antwort.

## Folge-Modus
Bekommst du `Vorschläge:` statt `Nacharbeit:`, gelten die Regeln oben mit diesen Abweichungen:
1. Du bearbeitest nur die Gruppen dieser Datei, jede mit ihrer Stufe.
2. Du setzt den gewählten Vorschlag um. Scheitert er an Spec, Plan oder Code, änderst du die Stelle nicht und begründest das.
3. Statt des R-Eintrags schreibst du pro Gruppe genau einen Eintrag `- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>`.
4. Im Ergebnis gilt: `location` ist die `<Stelle>` ohne Gruppennummer und Stufe. Bei `spec-question` steht die Frage in `rationale`. `questions` entfällt.

## Ausgabe
Deine letzte Aktion: Schreib mit `Write` das Ergebnis als JSON an den Pfad aus `Ergebnis:`, `location` exakt wie in der Gruppen-Überschrift. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "results": [ { "location": "Task 3", "status": "changed", "rationale": "Was geändert wurde" } ],
  "questions": [
    {
      "rule": "Regel, zu der die Spec gefragt wird",
      "question": "Die Frage an die Spec",
      "locations": ["Task 3"],
      "cases": ["a) erster Unterfall", "b) zweiter Unterfall"],
      "recommendation": "empfohlene Antwort",
      "reason": "Grund der Empfehlung"
    }
  ]
}
```

- `status`: `changed` (geändert) | `unchanged` (nicht geändert) | `spec-question` (spec-rückfrage). `rationale` ist bei `unchanged` Pflicht.
- `questions`: jede gebündelte Frage einmal; ohne Fragen `"questions": []`.
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-rework.md plugins/forge/agents/plan-rework.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): rework handles only red locations and bundles questions per rule"`

### Task 13: Scouts arbeiten auf der Gruppenauswahl des Skripts

**ACs:** AC-12, AC-40, AC-50, AC-53

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-scout.md` · `description:`, `Du arbeitest nach dem letzten Review`, `- \`Findings:\``, `1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe.`
- Modify: `plugins/forge/agents/plan-review-scout.md` · `description:`, `Du berätst den Menschen nach dem letzten Review`, `- \`Findings:\``, `1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe.`
- Test: `plugins/forge/tests/agents.test.js` · `reworkAndScouts_Body_ReadFindingsFromAggregateFile`

**Interfaces:**
- Consumes: `runde-1/scout-input.md`, `runde-2/scout-input.md` (Task 7)
- Produces: `scout.md` im bestehenden Format `## Scout-Vorschläge` / `### <Stufe> <Stelle>` / `**Bevorzugt: <Nr>** — <Begründung>`, geprüft von `review-flow.js scout-check`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `reworkAndScouts_Body_ReadFindingsFromAggregateFile` die Schleife
  ```js
  for (const name of ['spec-review-scout', 'plan-review-scout', 'implementation-review-scout']) {
    assert.ok(readAgent(name).body.includes('`Findings:` Datei der letzten Aggregation'), name);
  }
  ```
  ersetzen durch:
  ```js
  for (const name of ['spec-review-scout', 'plan-review-scout']) {
    const { body } = readAgent(name);
    assert.ok(body.includes('`Findings:` Datei mit den Gruppen, die das Skript für dich ausgewählt hat'), name);
    assert.ok(body.includes('1. Du bearbeitest jede Gruppe der Datei `Findings:`'), name);
    assert.ok(body.includes('nach Runde 1 oder nach der Nachprüfung'), name);
  }
  assert.ok(readAgent('implementation-review-scout').body.includes('`Findings:` Datei der letzten Aggregation'));
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: FAIL `reworkAndScouts_Body_ReadFindingsFromAggregateFile`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/spec-review-scout.md`:
  - `description:` ersetzen durch `description: Use when a dv-forge spec-review run needs one to three concrete solution proposals, one of them recommended, for every red or yellow group the review-flow script selected, after round 1 or after the verification.`
  - `Du arbeitest nach dem letzten Review eines \`spec-review\`-Laufs.` → `Du arbeitest in einem \`spec-review\`-Lauf, nach Runde 1 oder nach der Nachprüfung.`
  - Die Eingabezeile `- \`Findings:\` …` ersetzen durch `- \`Findings:\` Datei mit den Gruppen, die das Skript für dich ausgewählt hat; du liest den Abschnitt nach \`=== REWORK ===\` mit Gruppen im Format \`### <Stufe> <Stelle> (<Reviewer>)\`, darunter die Einzel-Findings`
  - `1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen lässt du weg.` → `1. Du bearbeitest jede Gruppe der Datei \`Findings:\`, 🔴 und 🟡; das Skript hat sie ausgewählt. 🟢-Gruppen kommen darin nicht vor.`
  In `plugins/forge/agents/plan-review-scout.md`:
  - `description:` ersetzen durch `description: Use when a dv-forge plan-review run needs one to three concrete solution proposals, one of them recommended with a reason, for every red or yellow group the review-flow script selected, after round 1 or after the verification.`
  - `Du berätst den Menschen nach dem letzten Review eines Plan-Reviews.` → `Du berätst Nacharbeit und Menschen in einem Plan-Review, nach Runde 1 oder nach der Nachprüfung.`
  - Die Eingabezeile `- \`Findings:\` …` ersetzen wie beim Spec-Scout.
  - `1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen lässt du weg.` → `1. Du bearbeitest jede Gruppe der Datei \`Findings:\`, 🔴 und 🟡; das Skript hat sie ausgewählt. 🟢-Gruppen kommen darin nicht vor.`
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-scout.md plugins/forge/agents/plan-review-scout.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): scouts propose for the groups the review-flow script selects"`

### Task 14: Gemeinsame Ablauf-Doku für Spec- und Plan-Review

**ACs:** AC-12, AC-13, AC-17, AC-18, AC-21, AC-22, AC-29, AC-30, AC-46, AC-49, AC-50, AC-54

**Dateien:**
- Create: `plugins/forge/shared/review-flow/flow.md`
- Test: `plugins/forge/tests/review-flow-doc.test.js`

**Interfaces:**
- Consumes: Befehle und Ausgaben von `review-flow.js` (Task 7), `guard-orchestrator.js pause` (Task 8), `followup.js save`
- Produces: Bausteine, die jeder Orchestrator-Skill festlegt: Eingaben, Reviewer, Nacharbeiter, Nachprüfer, Scout, `<art>`, `<DOK>`, Titel, Rolle, Nächster Schritt; Ausfall-Namen `nacharbeit`, `nachprüfer`, `scout` und die Kurznamen der Reviewer.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-flow-doc.test.js`:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');

test('flow_Steps_UseReviewFlowScriptInOrder', () => {
  const text = readText(FLOW);
  const order = ['review-flow.js" round1 <art> "<DOK>" "<W>" <aktiv>', 'review-flow.js" scout-check "<W>" 1', 'review-flow.js" rework-check <art> "<DOK>" "<W>"',
    'guard-orchestrator.js" pause <SESSION>', 'review-flow.js" answers-check "<W>"', 'review-flow.js" checklist <art> "<DOK>" "<W>"',
    'review-flow.js" verify <art> "<DOK>" "<W>"', 'review-flow.js" scout-check "<W>" 2', 'review-flow.js" finish <art> "<DOK>" "<W>" --title "<Titel>"',
    'followup.js" save <rolle> <slug> "<W>/bericht"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>'];
  let at = -1;
  for (const part of order) {
    const next = text.indexOf(part);
    assert.ok(next > at, `${part} fehlt oder steht an falscher Stelle`);
    at = next;
  }
});

test('flow_Failure_OneRequestOneRestartThenFailedAndReworkBudgetOnce', () => {
  const text = readText(FLOW);
  for (const part of ['genau einmal per `SendMessage`', 'genau einmal als frische Instanz', '--ausgefallen <namen', 'einmal für die ganze Nacharbeit',
    '`nacharbeit`', '`nachprüfer`', '`scout`', 'NACHARBEIT buendelung', 'einmal zur Korrektur', 'Fällt ein Reviewer in Runde 1 aus', 'Fällt die Nacharbeit aus']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('flow_Decisions_ComeOnlyFromScriptOutput', () => {
  const text = readText(FLOW);
  for (const part of ['`NEXT scout=ja`', '`nacharbeit=nein`', '`anhalten=ja`', '`nachpruefer=ja`', '`=== FRAGEN ===`', '`=== BERICHT ===`',
    'Kein Reviewer läuft ein zweites Mal', 'run_in_background: false', 'Du liest die geprüften Dateien nicht']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.ok(!text.includes('rework-outcome.js'));
  assert.ok(!text.includes('aggregate-findings.js'));
  assert.ok(!/Cap erreicht|Stillstand/.test(text));
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-flow-doc.test.js` — erwartet: FAIL mit `ENOENT` für `flow.md`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/shared/review-flow/flow.md`:
  ````markdown
# Review-Ablauf (Spec und Plan)

Gemeinsamer Ablauf von `spec-review` und `plan-review`: Runde 1 sucht, Runde 2 prüft nur nach, es gibt höchstens eine Nacharbeit. `<PLUGIN>` und `<SESSION>` nennt dir der Skill. Er legt außerdem fest: Eingaben (Aufruf von `prepare.js`, liefert `W`, `slug`, `aktiv`), Reviewer, Nacharbeiter, Nachprüfer, Scout, `<art>` (`spec-review` oder `plan-review`), `<DOK>` (das geprüfte Dokument), `<Titel>`, `<rolle>` und den nächsten Schritt je Status.

## Rolle
Du orchestrierst, sonst nichts. Du liest die geprüften Dateien nicht, bewertest keine Findings, tippst keine Ergebnisse ab und änderst nichts selbst. Jede Entscheidung folgt aus einer Skript-Ausgabe. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Ablauf fort. Ein Hook blockt deine Zugriffe auf die geschützten Dateien.

Plugin-Dateien liest du mit `Read`. Jedes Skript startest du als einzelnen `node`-Aufruf, ohne `cat`, `&&`, `;`, `|` oder `echo` davor oder danach. Alle Agents laufen mit `run_in_background: false`; die Reviewer von Runde 1 startest du in EINER Nachricht.

`ausgefallen` ist zu Beginn leer.

## Ausfall
Meldet ein Skript eine Instanz als ungültig (`ausgefallen=` in `RUNDE1`, `ungueltig` bei den anderen Befehlen), gilt:
1. Du forderst sie genau einmal per `SendMessage` nach: `Schreib nur noch dein Ergebnis nach <pfad>, im vereinbarten Format. Fehler: <ERROR-Zeilen>`. Dann rufst du das Skript erneut auf.
2. Wieder ungültig: Du startest sie genau einmal als frische Instanz mit denselben Eingaben und dem Zusatz `Deine letzte Antwort hatte kein gültiges Ergebnis: <ERROR-Zeilen>`. Dann das Skript erneut.
3. Wieder ungültig: Sie ist ausgefallen. Ihr Name kommt in `ausgefallen`: der Kurzname des Reviewers, `nacharbeit`, `nachprüfer` oder `scout`. Weiter mit „Abschluss“.

Für die Nacharbeit gilt dieses Budget einmal für die ganze Nacharbeit, über das Bündeln vor dem Anhalten und das Eintragen nach der Antwort zusammen. Fällt ein Reviewer in Runde 1 aus, endet der Lauf sofort. Fällt die Nacharbeit aus, endet der Lauf sofort; die Nachprüfung läuft dann nicht.

## Runde 1
1. Statuszeile `Runde 1: starte <anzahl> Reviewer (<aktiv>).` Dann je Reviewer ein `Agent`-Call mit den Eingaben aus dem Skill und `Ergebnis: <W>/runde-1/<kurzname>.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" round1 <art> "<DOK>" "<W>" <aktiv>`
3. Nennt `ausgefallen=` Reviewer: Ausfall-Regel je Reviewer, dann Schritt 2 erneut.
4. Statuszeile `Runde 1: <rot> × 🔴, <gelb> × 🟡, <fragen> offene Fragen.`
5. `NEXT scout=ja`: Scout mit den Eingaben aus dem Skill, `Findings: <W>/runde-1/scout-input.md` und `Ergebnis: <W>/runde-1/scout.md`; dann `node "<PLUGIN>/scripts/review-flow.js" scout-check "<W>" 1`. `SCOUT ungueltig`: Ausfall-Regel.
6. `nacharbeit=nein`: weiter mit „Abschluss“.

## Nacharbeit
1. Statuszeile `Nacharbeit läuft.` Nacharbeiter mit den Eingaben aus dem Skill, `Nacharbeit: <W>/runde-1/nacharbeit.md` und `Ergebnis: <W>/runde-1/rework.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" rework-check <art> "<DOK>" "<W>"`
   - `NACHARBEIT ungueltig`: Ausfall-Regel.
   - `NACHARBEIT buendelung`: Du forderst den Nacharbeiter einmal zur Korrektur auf: `Die Bündelung ist fehlerhaft: <ERROR-Zeilen>. Korrigiere nur "questions" in <W>/runde-1/rework.json.` Dann Schritt 2 erneut. Wieder `NACHARBEIT buendelung`: `nacharbeit` ist ausgefallen.
3. `anhalten=ja`: Du gibst den Abschnitt nach `=== FRAGEN ===` unverändert aus, rufst `node "<PLUGIN>/scripts/guard-orchestrator.js" pause <SESSION>` auf und beendest deine Antwort. Der Arbeitsbereich bleibt.
4. Antwortet der Mensch: Nacharbeiter im Antwort-Modus mit den Eingaben aus dem Skill, `Fragen: <W>/runde-1/fragen.md`, `Antworten: <Antwort des Menschen, wörtlich>` und `Ergebnis: <W>/runde-1/antworten.json`; dann `node "<PLUGIN>/scripts/review-flow.js" answers-check "<W>"`. `ANTWORTEN ungueltig`: Ausfall-Regel mit dem Restbudget der Nacharbeit.
5. Die Schritte des Skills unter „Nach der Nacharbeit“, falls vorhanden.

## Runde 2, Nachprüfung
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <art> "<DOK>" "<W>"`
2. `nachpruefer=ja`: Nachprüfer mit den Eingaben aus dem Skill, `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/verifier.json`. Kein Reviewer läuft ein zweites Mal. Bei `nachpruefer=nein` startest du keinen Nachprüfer.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <art> "<DOK>" "<W>"`. `NACHPRUEFUNG ungueltig`: Ausfall-Regel für den Nachprüfer.
4. Statuszeile `Nachprüfung: <offen> × 🔴 offen, <hinweise> neue Hinweise.`
5. `NEXT scout=ja`: Scout mit `Findings: <W>/runde-2/scout-input.md` und `Ergebnis: <W>/runde-2/scout.md`; dann `node "<PLUGIN>/scripts/review-flow.js" scout-check "<W>" 2`. `SCOUT ungueltig`: Ausfall-Regel.

Danach gibt es keine weitere Nacharbeit und keine weitere Runde.

## Abschluss
Jedes Ende, auch nach einem Ausfall, läuft hier durch.
1. `node "<PLUGIN>/scripts/review-flow.js" finish <art> "<DOK>" "<W>" --title "<Titel>"`, bei nicht leerem `ausgefallen` mit `--ausgefallen <namen, durch Komma getrennt>`.
2. `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/bericht"`
3. Bericht im Chat: der Abschnitt nach `=== BERICHT ===` unverändert; danach `### Hinweise des Orchestrators` mit jeder `WARN`-Zeile und jeder Nachforderung oder jedem Neustart, falls vorhanden; danach die Ausgabe von `save` ab `## Scout-Vorschläge`, bei `KEIN SCOUT` nichts; zuletzt `Nächster Schritt:` mit dem Text des Skills für den Status aus der Zeile `STATUS`. Nichts committen, außer der Skill sagt es.
4. `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/review-flow-doc.test.js` — erwartet: PASS, 3 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/shared/review-flow/flow.md plugins/forge/tests/review-flow-doc.test.js` · `git commit -m "docs(forge): describe the shared two-round review flow for spec and plan"`

### Task 15: Spec-Review-Skill auf den neuen Ablauf umstellen

**ACs:** AC-12, AC-18, AC-21, AC-28, AC-29, AC-31

**Dateien:**
- Modify: `plugins/forge/skills/spec-review/SKILL.md` (ganzer Inhalt) · `# Spec-Review (Orchestrator)`
- Modify: `plugins/forge/tests/skill.test.js` (ganzer Inhalt)

**Interfaces:**
- Consumes: `plugins/forge/shared/review-flow/flow.md` (Task 14), `spec-review-verifier` (Task 11)
- Produces: Skill mit den Bausteinen aus Task 14

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/skill.test.js` bekommt diesen ganzen Inhalt:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');
const AGENTS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => `dv-forge:spec-review-${name}`);

test('skill_Frontmatter_ManualOnlyWithArgumentHintWithoutRounds', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'spec-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md> [quelle.md] [--only <reviewer,...>]');
});

test('skill_Body_ReadsSharedFlowWithBuildingBlocks', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`', '`<SESSION>` = `${CLAUDE_SESSION_ID}`', '${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md',
    '`<art>` = `spec-review`', '`<DOK>` = `<S>`', 'Titel `Spec-Review`', 'Rolle `spec-review`', '${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS',
    '## Reviewer', '## Nacharbeiter', '## Nachprüfer', '## Scout', '## Nächster Schritt']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.ok(!body.includes('review-loop/loop.md'));
  assert.ok(!body.includes('rework-outcome.js'));
  assert.ok(!body.includes('--rounds'));
});

test('skill_Body_ListsAllAgents', () => {
  const { body } = readMarkdown(SKILL);
  for (const agent of [...AGENTS, 'dv-forge:spec-rework', 'dv-forge:spec-review-verifier', 'dv-forge:spec-review-scout']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(body.includes('`Profil-Index: <PI>`'));
  assert.ok(body.includes('`Profil-Auszug: <PA>`'));
});

test('skill_Body_NextStepPerStatus', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`sauber …`', '`Fragen offen`', '`nicht bereit …`', '`unvollständig …`', '/dv-forge:plan-writing <S>', 'Spec nicht bereit',
    'Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.', '/dv-forge:review-followup <S> <auswahl>', 'der neue Lauf stellt sie wieder',
    '`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('skill_Body_StaysUnder500WordsWithPairedQuotes', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(wordCount(body) < 500);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/skill.test.js` — erwartet: FAIL `skill_Frontmatter_ManualOnlyWithArgumentHintWithoutRounds`, `skill_Body_ReadsSharedFlowWithBuildingBlocks`, `skill_Body_ListsAllAgents`, `skill_Body_NextStepPerStatus`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/skills/spec-review/SKILL.md` bekommt diesen ganzen Inhalt:
  ````markdown
---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review flow of one search round with parallel reviewers, script-based classification, at most one rework and one verification round.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--only <reviewer,...>]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm mit `<art>` = `spec-review`, `<DOK>` = `<S>`, Titel `Spec-Review` und Rolle `spec-review`. Hier steht nur, was für die Spec gilt. Du liest die Spec nicht.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Spec `S`, Projektwurzel `R`, Arbeitsbereich `W`, `slug`, `art` (`frei`/`verankert`), `profile` (`ja`/`nein`), `aktiv`, bei `ja` den Profil-Index `PI` und den Pfad des Profil-Auszugs `PA`, falls angegeben die Quelle `Q` und je Warnung eine Zeile `WARN`.
2. Jede `WARN`-Zeile kommt in die Hinweise des Orchestrators. Du liest weder Profile noch Index.
3. `aktiv` kommt aus `prepare.js`: alle Reviewer, mit `--only` nur die genannten; `profiles` nur bei `profile=ja`. Du startest genau die Reviewer aus `aktiv`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>`, `Profil-Index: <PI>`, `Profil-Auszug: <PA>`, `Repo: <R>`; nur bei `profile=ja`

Bei `art=frei` prüfen alle Reviewer nur die innere Stimmigkeit; `profile` ist dann immer `nein`.

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>`

## Nachprüfer
`dv-forge:spec-review-verifier` — `Spec: <S>`

## Scout
`dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`

## Nächster Schritt
Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

- `sauber …`: Hat `save` Scout-Vorschläge ausgegeben, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.` und der Auswahl-Hinweis. Dann `Spec ist bereit. Spec committen, dann in einer frischen Session:` und darunter in einem Code-Block `/dv-forge:plan-writing <S>`.
- `Fragen offen`: `Die offenen Fragen stehen als R-Einträge in der Spec. /dv-forge:spec-review <S> erneut; der neue Lauf stellt sie wieder.`
- `nicht bereit …`: `Spec nicht bereit. Nachprüfung und Scout-Vorschläge lesen, dann /dv-forge:review-followup <S> <auswahl> oder Spec selbst anpassen und /dv-forge:spec-review <S> erneut.` und der Auswahl-Hinweis.
- `unvollständig …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/spec-review/SKILL.md plugins/forge/tests/skill.test.js` · `git commit -m "feat(forge): spec review follows the shared two-round flow"`

### Task 16: Plan-Review-Skill auf den neuen Ablauf umstellen

**ACs:** AC-19, AC-31

**Dateien:**
- Modify: `plugins/forge/skills/plan-review/SKILL.md` (ganzer Inhalt) · `# Plan-Review (Orchestrator)`
- Modify: `plugins/forge/tests/plan-review-skill.test.js` (ganzer Inhalt)

**Interfaces:**
- Consumes: `flow.md` (Task 14), `plan-review-verifier` (Task 11), `plan-tasks.js anchors`
- Produces: Skill mit den Bausteinen aus Task 14 und dem Abschnitt „Nach der Nacharbeit“

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/plan-review-skill.test.js` bekommt diesen ganzen Inhalt:
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');
const REVIEWERS = ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'];

test('planReviewSkill_Frontmatter_ManualOnlyWithArgumentHintWithoutRounds', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'plan-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>]');
});

test('planReviewSkill_Body_ReadsSharedFlowWithBuildingBlocks', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`', '`<SESSION>` = `${CLAUDE_SESSION_ID}`', '${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md',
    '`<art>` = `plan-review`', '`<DOK>` = `<P>`', 'Titel `Plan-Review`', 'Rolle `plan-review`', '${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.ok(!body.includes('review-loop/loop.md'));
  assert.ok(!body.includes('rework-outcome.js'));
  assert.ok(!body.includes('--rounds'));
});

test('planReviewSkill_Body_ListsAllAgentsAndInputs', () => {
  const { body } = readMarkdown(SKILL);
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:plan-review-${reviewer}`), `${reviewer} fehlt`);
  for (const agent of ['dv-forge:plan-rework', 'dv-forge:plan-review-verifier', 'dv-forge:plan-review-scout']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(body.includes('`aktiv` kommt aus `prepare.js`'));
  assert.ok(body.includes('Du startest genau die Reviewer aus `aktiv`'));
  assert.ok(body.includes('`Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`'));
  assert.ok(body.includes('Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.'));
  assert.ok(body.includes('jede `WARN`-Zeile kommt in die Hinweise des Orchestrators'));
});

test('planReviewSkill_Body_AnchorsRefreshedAfterRework', () => {
  const { body } = readMarkdown(SKILL);
  const after = body.slice(body.indexOf('## Nach der Nacharbeit'), body.indexOf('## Nachprüfer'));
  assert.ok(after.includes('${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"'));
});

test('planReviewSkill_Body_NextStepPerStatusWithCommitQuestion', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`sauber …`', '`Fragen offen`', '`nicht bereit …`', '`unvollständig …`', '/dv-forge:implementation <P>', 'frischen Session',
    'git status --porcelain -- "<S>" "<P>"', 'Leere Ausgabe: keine Frage', 'Soll ich Spec und Plan jetzt committen?', 'forge-config.js" get Commit-Konvention',
    'Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.', '/dv-forge:review-followup <P> <auswahl>', 'Spec-Rückfragen',
    '`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('planReviewSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/plan-review-skill.test.js` — erwartet: FAIL `planReviewSkill_Frontmatter_ManualOnlyWithArgumentHintWithoutRounds`, `planReviewSkill_Body_ReadsSharedFlowWithBuildingBlocks`, `planReviewSkill_Body_ListsAllAgentsAndInputs`, `planReviewSkill_Body_AnchorsRefreshedAfterRework`, `planReviewSkill_Body_NextStepPerStatusWithCommitQuestion`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/skills/plan-review/SKILL.md` bekommt diesen ganzen Inhalt:
  ````markdown
---
name: plan-review
description: Use when a dv-forge plan.md should run through the review flow of one search round with parallel reviewers against its spec and the code, script-based classification, at most one rework and one verification round.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--only <reviewer,...>]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm mit `<art>` = `plan-review`, `<DOK>` = `<P>`, Titel `Plan-Review` und Rolle `plan-review`. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Plan `P`, Spec `S`, Repo `R`, Arbeitsbereich `W`, `slug`, `aktiv`, die erlaubten Befehle `Build`, `Test`, `Lint`, die Anker-Datei `A` und je Warnung eine Zeile `WARN`; jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.
2. `aktiv` kommt aus `prepare.js`: alle fünf Reviewer, mit `--only` nur die genannten. Du startest genau die Reviewer aus `aktiv`.

## Reviewer
Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.

- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`, `Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

Eine Frage an den Menschen ist hier eine Spec-Rückfrage; der Lauf hält dafür nicht an.

## Nach der Nacharbeit
Gibt es `A`: `node "${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"`.

## Nachprüfer
`dv-forge:plan-review-verifier` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nächster Schritt
Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

- `sauber …`: Hat `save` Scout-Vorschläge ausgegeben, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis. Nach dem Freigeben des Guards `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: keine Frage, beide sind committet; weiter mit dem Code-Block `/dv-forge:implementation <P>` wie unten. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`.
- `Fragen offen`: `Spec-Rückfragen offen. Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`
- `nicht bereit …`: `Plan nicht bereit. Nachprüfung und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut.` und der Auswahl-Hinweis.
- `unvollständig …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/plan-review/SKILL.md plugins/forge/tests/plan-review-skill.test.js` · `git commit -m "feat(forge): plan review follows the shared two-round flow"`

### Task 17: Review-Followup prüft nach Spec- und Plan-Review nur nach

**ACs:** AC-32, AC-52

**Dateien:**
- Modify: `plugins/forge/scripts/prepare.js:352-377` · `prepareReviewFollowup`
- Modify: `plugins/forge/skills/review-followup/references/flow.md` · `## Umsetzen`, `## Nach-Review`, `## Bericht`, `## Nächster Schritt`
- Modify: `plugins/forge/skills/review-followup/SKILL.md` · `description:`, `4. **Nach-Review, genau eine Runde:**`
- Test: `plugins/forge/tests/prepare.test.js` · `reviewFollowup_ReworkAggregate_LetsReworkOutcomeSeeEscalations`
- Test: `plugins/forge/tests/review-followup-skill.test.js` · `reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation`
- Test: `plugins/forge/tests/review-flow-followup.test.js`

**Interfaces:**
- Consumes: `review-flow.js followup-checklist`, `verify`, `finish` (Task 7); Nachprüfer (Task 11)
- Produces: `prepare.js review-followup` schreibt bei `original` `spec-review` oder `plan-review` die Kopie `<W>/dokument-vorher.md` des Artefakts.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/prepare.test.js` direkt vor `test('reviewFollowup_ReworkAggregate_LetsReworkOutcomeSeeEscalations', () => {` einfügen:
  ```js
test('reviewFollowup_PlanArtifact_WritesSnapshotForChangedAreas', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const out = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'b'));
  assert.equal(fs.readFileSync(path.join(out.W, 'dokument-vorher.md'), 'utf8'), PLAN);
});

  ```
  In `plugins/forge/tests/review-followup-skill.test.js` den Test `reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation` ersetzen durch:
  ```js
test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
  assert.ok(fs.existsSync(FLOW));
  const text = readText(FLOW);
  for (const part of ['Vorschläge: <F>', 'Ergebnis: <W>/nacharbeit/rework.json', 'review-flow.js" followup-checklist <original> "<DOK>" "<W>"',
    'review-flow.js" verify <original> "<DOK>" "<W>"', 'review-flow.js" finish <original> "<DOK>" "<W>" --title "Review-Followup (<original>)"',
    'Prüfliste: <W>/runde-2/pruefliste.md', 'Nachprüfer des Original-Skills', 'Kein Reviewer läuft',
    'followup.js" save <rolle> <slug> "<W>/bericht"', 'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"',
    'followup.js" drop review <slug>', 'Kein Scout', 'plan-tasks.js" anchors "<P>" "<R>" "<W>"', 'nicht gewählt', 'bleibt die alte Sicherung', '### Umgesetzt', 'WAHL', 'keine Änderung', 'blockiert']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.ok(!text.includes('--expect <aktiv> --round 1'));
  assert.ok(!text.includes('--dir "<W>/nacharbeit"'));
});
  ```
  `plugins/forge/tests/review-flow-followup.test.js` (Absicherung des Skript-Teils aus Task 7):
  ```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SPEC, flowWorkspace } = require('./lib/flow-workspace');

const CHOSEN = [
  '=== REWORK ===',
  '### 🟡 AC-04 (clarity)',
  '- [clarity · detail] Zitat: „Gegeben C“ · Konsequenz: k4 · Begründung: b4',
  '',
  '### 🟡 AC-07 (clarity)',
  '- [clarity · detail] Zitat: „Gegeben E“ · Konsequenz: k7 · Begründung: b7',
  '',
].join('\n');
const verdict = (location, value) => ({ location, verdict: value, rationale: `Urteil ${location}` });

function chosenTwo(results) {
  const ws = flowWorkspace();
  ws.text('dokument-vorher.md', SPEC);
  ws.text('nacharbeit/aggregate.md', CHOSEN);
  ws.json('nacharbeit/rework.json', { results });
  ws.edit((text) => text.replace('Gegeben C, dann D.', 'Gegeben C, dann D und leer.'));
  return ws;
}

const changedBoth = [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'changed' }];
const finish = (ws) => ws.run('finish', 'spec-review', ws.doc, ws.workspace, '--title', 'Review-Followup (spec-review)').stdout;

test('followupChecklist_TwoChosenStellen_VerifierJudgesBothAndChangedArea', () => {
  const ws = chosenTwo(changedBoth);
  assert.equal(ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=2 skript=0 geaendert=1 nachpruefer=ja\n');
  const list = ws.read('runde-2/pruefliste.md');
  assert.ok(list.includes('### AC-04\nHerkunft: gewählter Vorschlag') && list.includes('### AC-07') && list.includes('## Geänderte Bereiche\n\n- AC-04'));
});

test('followupVerify_OnePointNotDone_NotReadyOneRed', () => {
  const ws = chosenTwo(changedBoth);
  ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'nicht erledigt')], findings: [] });
  assert.match(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, /offen=1/);
  const out = finish(ws);
  assert.match(out, /^STATUS nicht bereit, 1 × 🔴 offen\n/);
  assert.ok(out.includes('## Review-Followup (spec-review): '));
  assert.ok(out.includes('**Runden:** 1 · **Nacharbeiten:** 1'));
});

test('followupVerify_AllDoneNoContradiction_CleanAfterVerification', () => {
  const ws = chosenTwo(changedBoth);
  ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'erledigt')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  assert.match(finish(ws), /^STATUS sauber nach Nachprüfung\n/);
});

test('followupChecklist_QuestionForOneStelle_NotOnChecklistStatusQuestionsOpen', () => {
  const ws = chosenTwo([{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'human-question', rationale: 'Grenze offen?' }]);
  assert.match(ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace).stdout, /^PRUEFLISTE punkte=1/);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  const out = finish(ws);
  assert.match(out, /^STATUS Fragen offen/);
  assert.ok(out.includes('### Offene Fragen\n- AC-07 — Grenze offen?'));
});

test('followupChecklist_ReworkMissesChosenStelle_Invalid', () => {
  const ws = chosenTwo([{ location: 'AC-04', status: 'changed' }]);
  assert.equal(ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE ungueltig\nERROR AC-07: kein Ausgang\n');
});
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/prepare.test.js tests/review-followup-skill.test.js tests/review-flow-followup.test.js` — erwartet: FAIL `reviewFollowup_PlanArtifact_WritesSnapshotForChangedAreas` (`ENOENT`) und `reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation`; die 5 Tests in `review-flow-followup.test.js` laufen schon grün, weil `followup-checklist` aus Task 7 stammt — rot ist dort ein Befund, kein Grund, Code zu ändern.
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/prepare.js` in `prepareReviewFollowup` nach der Zeile `fs.writeFileSync(path.join(values.W, 'nacharbeit', 'aggregate.md'), reworkText(chosen));` einfügen:
  ```js
  // Vorher-Stand für die geänderten Bereiche der Nachprüfung (review-flow.js followup-checklist).
  if (art !== 'implementation-review') fs.copyFileSync(artifact, path.join(values.W, 'dokument-vorher.md'));
  ```
  In `plugins/forge/skills/review-followup/references/flow.md`:
  - Unter `## Umsetzen` den ganzen Unterabschnitt `### Spec und Plan` ersetzen durch:
    ```markdown
### Spec und Plan
`<DOK>` ist `<S>` bei `original=spec-review` und `<P>` bei `original=plan-review`.
1. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, dazu `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" followup-checklist <original> "<DOK>" "<W>"`. `PRUEFLISTE ungueltig`: Ausfall-Regel aus `<PLUGIN>/shared/review-flow/flow.md` für die Nacharbeit; ausgefallen: Status `unvollständig, ausgefallen: nacharbeit`, weiter mit dem Bericht.
3. Bei `original=plan-review` und `A`: `node "<PLUGIN>/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"`.
    ```
  - Unter `## Nach-Review` den ganzen Unterabschnitt `### Spec und Plan` ersetzen durch:
    ```markdown
### Spec und Plan
Kein Reviewer läuft. Die Nachprüfung folgt Runde 2 aus `<PLUGIN>/shared/review-flow/flow.md`:
1. `nachpruefer=ja`: der Nachprüfer des Original-Skills mit dessen Eingabezeilen, `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/verifier.json`.
2. `node "<PLUGIN>/scripts/review-flow.js" verify <original> "<DOK>" "<W>"`. `NACHPRUEFUNG ungueltig`: Ausfall-Regel für den Nachprüfer.
3. `NEXT scout=ja`: der Scout des Original-Skills mit `Findings: <W>/runde-2/scout-input.md` und `Ergebnis: <W>/runde-2/scout.md`, dann `node "<PLUGIN>/scripts/review-flow.js" scout-check "<W>" 2`.
4. `node "<PLUGIN>/scripts/review-flow.js" finish <original> "<DOK>" "<W>" --title "Review-Followup (<original>)"`, bei Ausfällen mit `--ausgefallen <namen>`. Die Zeile `STATUS` ist der Status.
5. Sichern: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/bericht"`, außer `hinweise=0` und `offen` ist nicht leer: Dann bleibt die alte Sicherung, und die Gruppen aus `offen` bleiben mit ihren Nummern wählbar.
    ```
  - Unter `## Bericht` die Zeile mit `**Reviews:**` ersetzen durch `- Spec und Plan: der Abschnitt nach \`=== BERICHT ===\` aus \`finish\`, unverändert, danach die Ausgabe von \`save\` ab \`## Scout-Vorschläge\`. Implementierung: \`**Reviews:** 1 · **Nacharbeiten:** 1\`, ohne Nach-Review \`**Reviews:** 0 · **Nacharbeiten:** 1\`.` und die Zeile mit `### Letztes Review` ersetzen durch `- Implementierung: \`### Letztes Review\` mit der Antwort des Re-Reviewers unverändert.`
  - Unter `## Nächster Schritt` die Zeilen `sauber nach Nach-Review`, `…, Gruppen <offen> nicht gewählt`, `Rückfrage offen` und `Spec oder Plan offen` ersetzen durch:
    ```markdown
- Spec und Plan `sauber nach Nachprüfung` und `offen` leer: der Text des Original-Skills für `sauber …`, bei Plan einschließlich der Commit-Prüfung.
- Spec und Plan `sauber nach Nachprüfung` und `offen` nicht leer: `Gruppen <offen> nicht gewählt: /dv-forge:review-followup <artefakt> <g>:<n|b>,… mit den bisherigen Nummern.`
- Spec und Plan `Fragen offen`: der Text des Original-Skills für `Fragen offen`.
- Spec und Plan `nicht bereit …`: `Noch offen. Nachprüfung und Scout-Vorschläge oben lesen, dann /dv-forge:review-followup <artefakt> <auswahl> oder das volle Review erneut.` War `offen` nicht leer, zusätzlich `Nicht gewählte Gruppen findet nur das volle Review erneut.`
    ```
    Die Zeilen für die Implementierung und für `unvollständig` bleiben.
  In `plugins/forge/skills/review-followup/SKILL.md`:
  - `description:` ersetzen durch `description: Use when chosen scout proposals from a finished dv-forge spec-review, plan-review or implementation-review should be applied by the rework agent or the implementer and then only verified once, without any reviewer searching again.`
  - Schritt 4 ersetzen durch: `4. **Nachprüfung, genau eine Runde:** bei \`spec-review\` und \`plan-review\` der Nachprüfer des Original-Skills auf die gewählten Stellen und die geänderten Bereiche, bei \`implementation-review\` \`dv-forge:implementation-re-reviewer\` auf das Fix-Diff, wie in \`flow.md\`. Kein Reviewer läuft.`
  - In Schritt 2 `Abschluss-Scout` ersetzen durch `Nachprüfer, Scout`.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/prepare.js plugins/forge/skills/review-followup/references/flow.md plugins/forge/skills/review-followup/SKILL.md plugins/forge/tests/prepare.test.js plugins/forge/tests/review-followup-skill.test.js plugins/forge/tests/review-flow-followup.test.js` · `git commit -m "feat(forge): review-followup only verifies after spec and plan review"`

### Task 18: Keine Rundenzahl mehr für Spec- und Plan-Review

**ACs:** AC-31

**Dateien:**
- Modify: `plugins/forge/scripts/prepare.js:17-37` · `USAGE`, `DEFAULT_ROUNDS`, `FLAGS`, `parseArgs`, `rounds`, `prepareSpecReview`, `preparePlanReview`
- Test: `plugins/forge/tests/prepare.test.js` · `planReview_SpecBesidePlan_ResolvedWithForwardSlashes`, `planReview_ExplicitSpec_WinsOverHeader`, `cli_BadArguments_ExitWithTwo`

**Interfaces:**
- Consumes: —
- Produces: `prepare.js spec-review|plan-review` kennt nur noch `--only`; ein anderes Flag bricht mit Exit 2 und `Unbekanntes Argument: <flag>` ab; `N` wird für diese beiden nicht mehr ausgegeben.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/prepare.test.js`:
  - In `planReview_SpecBesidePlan_ResolvedWithForwardSlashes` `assert.equal(out.N, '3');` ersetzen durch `assert.equal(out.N, undefined);`.
  - In `planReview_ExplicitSpec_WinsOverHeader` `run(repo, 'plan-review', 'docs/forge/demo/plan.md', 'explicit.md', '--rounds', '5')` ersetzen durch `run(repo, 'plan-review', 'docs/forge/demo/plan.md', 'explicit.md')` und die Zeile `assert.equal(out.N, '5');` löschen.
  - Direkt nach `cli_BadArguments_ExitWithTwo` einfügen:
    ```js
test('specAndPlanReview_RoundsFlag_AbortsAsUnknownArgument', () => {
  const repo = planRepo();
  for (const args of [['spec-review', 'docs/forge/demo/spec.md'], ['plan-review', 'docs/forge/demo/plan.md']]) {
    const result = run(repo, ...args, '--rounds', '2');
    assert.equal(result.status, 2, args[0]);
    assert.match(result.stderr, /^Unbekanntes Argument: --rounds\n/);
  }
  assert.match(run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--only').stderr, /^Unvollständiges Argument: --only\n/);
});
    ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl (in `plugins/forge`): `node --test tests/prepare.test.js` — erwartet: FAIL `planReview_SpecBesidePlan_ResolvedWithForwardSlashes`, `specAndPlanReview_RoundsFlag_AbortsAsUnknownArgument`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/prepare.js`:
  - In `USAGE` die beiden ersten Zeilen ersetzen durch:
    ```js
  'Aufruf: node prepare.js spec-review <spec> [quelle] [--only <reviewer,...>]',
  '       node prepare.js plan-review <plan> [spec] [--only <reviewer,...>]',
    ```
  - Die Zeile `const DEFAULT_ROUNDS = '3';` und die ganze Funktion `rounds` löschen.
  - In `FLAGS` `'spec-review': ['--rounds', '--only'],` und `'plan-review': ['--rounds', '--only'],` ersetzen durch `'spec-review': ['--only'],` und `'plan-review': ['--only'],`.
  - In `parseArgs` die Zeile `if (!FLAGS[skill].includes(arg) || index + 1 >= args.length) throw new UsageError(\`Unbekanntes oder unvollständiges Argument: ${arg}\`);` ersetzen durch:
    ```js
    if (!FLAGS[skill].includes(arg)) throw new UsageError(`Unbekanntes Argument: ${arg}`);
    if (index + 1 >= args.length) throw new UsageError(`Unvollständiges Argument: ${arg}`);
    ```
  - In `prepareSpecReview` die Zeile `values.N = rounds(flags);` löschen.
  - In `preparePlanReview` `const values = { P: plan, S: resolveSpec(plan, positional[1], root), R: root, N: rounds(flags) };` ersetzen durch `const values = { P: plan, S: resolveSpec(plan, positional[1], root), R: root };`.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl (in `plugins/forge`): `node --test "tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/prepare.js plugins/forge/tests/prepare.test.js` · `git commit -m "feat(forge): spec and plan review reject a round count as unknown argument"`

## Entscheidungen
- **W · Nachprüfer je Review** · Aussage — Je Review ein eigener Nachprüfer-Agent: `spec-review-verifier` und `plan-review-verifier`, wie Scout und Nacharbeit heute je Review.
- **W · Ablauf-Doku** · Aussage — Neue Datei `shared/review-flow/flow.md` für Spec- und Plan-Review; `shared/review-loop/loop.md` bleibt für das Implementierungs-Review, nur die Hochstufung 2 × 🟡 → 🔴 fällt weg.
- **W · Offene Frage, Reihenfolge** · Aussage — Ein W-Eintrag beantwortet nur R-Einträge, die im Dokument vor ihm stehen (Antwort auf R1 · Entscheidungen der Spec). Die Nacharbeit schreibt Antworten deshalb nach allen R-Einträgen.
- **W · Skript-Befund an offener Frage** · Aussage — Befunde einer Skript-Prüfung an einer Stelle mit offener Frage entfallen nicht; sie bleiben 🔴 (Antwort auf R1 · Entfällt).
- **W · Findings der Nachprüfung** · Aussage — Der Nachprüfer meldet bei der Widerspruchsprüfung Findings mit Stelle und Kategorie; eines außerhalb der Prüfliste, das kein Widerspruch in einem geänderten Bereich ist, steht als 🟡 (Antwort auf R1 · AC-50).
- **W · Scout-Ausfall** · Aussage — Der Scout wird behandelt wie die anderen Instanzen: eine Nachforderung, ein Neustart, danach `unvollständig, ausgefallen: scout` (Antwort auf R2 · Nachforderung).
- **W · Berichtsform** · Aussage — Gezeigte Fragen: `### Fragen an den Menschen`, je Frage `**F<n> · <Regel>** — <Frage>` mit Stellen, Unterfällen, Empfehlung und Antwort im Chat je Frage. Bericht: Status, Runden und Nacharbeiten, Runde-1-Tabelle, Nachprüfung je Punkt, Widersprüche, offene Fragen, Anmerkungen (🟢), danach die Scout-Vorschläge der Hinweise.
- **E · Stellen-Erkennung** · Planer — Eine Stelle ist ein Eintrag `- **<Name>**` oder `<n>. **<Name>:**` auf oberster Ebene, ein `### Task <n>:` oder ein `## <Abschnitt>`; der Abschnitt `Entscheidungen` wird nicht zerlegt. Die Kopfzeilen erkennt das Skript nur, wenn die Stelle genau `Status`, `Art`, `Workitem` oder `Basis` heißt (optional mit `Kopfzeile` davor), damit etwa „Status am Ende“ nicht verworfen wird.
- **E · Geänderte Bereiche** · Planer — Das Skript vergleicht eine Kopie des Dokuments vor der Nacharbeit (`dokument-vorher.md`) mit dem Stand danach, Stelle für Stelle, Leerraum zählt nicht; Entscheidungen und Kopfzeilen zählen nicht.
- **E · Skript-Prüfungen** · Planer — Der Mechanismus steht (`SCRIPT_CHECKS` je Review, Befunde immer 🔴, in Runde 1 und in der Nachprüfung). Welche Prüfungen ein Review hat, legen die Specs zu Spec- und Plan-Review fest; bis dahin sind beide Listen leer.
- **E · Beratende Reviewer** · Planer — `ADVISORY` ist für beide Reviews leer, weil heute kein Review einen beratenden Reviewer führt; die Herabstufung ist trotzdem gebaut und getestet.
- **E · Farbe im Finding** · Planer — Als Farbe gilt ein Feld `severity` oder `color` im Finding. 🔴/🟡/🟢 im Text eines Zitats sind erlaubt, weil Specs diese Zeichen selbst enthalten.
- **E · Spec-Rückfragen im Plan** · Planer — Die Plan-Nacharbeit schreibt ihre R-Einträge weiter mit `spec-rückfrage`. Das Skript erkennt sie nicht als offene Fragen am Lauf-Anfang; das hält den Umgang mit Spec-Rückfragen früherer Läufe aus dem Ablauf heraus, wie die Spec es festlegt. Im Lauf gelten sie als offen.
- **E · Bündelung auch im Plan-Review** · Planer — Auch die Plan-Nacharbeit bündelt ihre Spec-Rückfragen je Regel; so gilt für beide Reviews dasselbe Format und dieselbe Skript-Prüfung.
- **E · Hochstufungszeile** · Planer — Mit der Hochstufung entfällt die Zeile `HOCHGESTUFT` in der Ausgabe von `aggregate-findings.js`; das Implementierungs-Review liest nur die Zeile `STATUS`.
- **E · rework-outcome.js bleibt** · Planer — `rework-outcome.js` wird von Spec- und Plan-Review nicht mehr benutzt, bleibt aber, weil `shared/review-loop/loop.md` des Implementierungs-Reviews darauf verweist und dieses Review unverändert bleiben soll.
- **E · Ein CLI-Task** · Planer — `review-flow.js` entsteht in einem Task (Task 7), weil alle Befehle auf denselben Zustandsdateien arbeiten und sich nicht getrennt sinnvoll reviewen lassen.
- **E · Followup-Fragen** · Planer — Im Followup gelten Fragen der Nacharbeit (Ausgang `human-question` bzw. `spec-question`) als offen im Lauf; der Lauf hält dafür nicht an.
- **E · Farbwörter in Prüfaufträgen** · Planer — Wo ein Prüfauftrag eines Reviewers heute eine Farbe nennt, ersetzt der Plan sie mechanisch durch die passende Kategorie (z. B. externer Verweis, den der Bau braucht → `unerfuellbar`). Die Specs zu Spec- und Plan-Review können diese Zuordnung schärfen.
