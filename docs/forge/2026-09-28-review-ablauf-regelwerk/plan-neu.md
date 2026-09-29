# Review-Ablauf: einmal suchen, Skript entscheidet — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-09-28-review-ablauf-regelwerk/plan-neu.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Spec- und Plan-Review laufen nach einem gemeinsamen Ablauf mit Runde 1 (Suche), höchstens einer Nacharbeit und Runde 2 (Nachprüfung), in dem das Skript `review-flow.js` aus der Kategorie jedes Findings Farbe, Verwerfen, Herabstufung, Prüfliste, geänderte Bereiche und Status ableitet.
**Architektur:** Das neue CLI `plugins/forge/scripts/review-flow.js` führt jeden mechanischen Schritt aus und stützt sich auf kleine Module unter `plugins/forge/scripts/lib/` (Stellen, Regelwerk, Gruppen, Fragen, Versuche, Runde 1, Nacharbeit, Runde 2, Bericht). Die Orchestrator-Skills `spec-review` und `plan-review` folgen der neuen Ablauf-Doku `plugins/forge/shared/review-flow/flow.md`, Reviewer liefern eine Kategorie statt einer Farbe, je Review prüft ein neuer Nachprüfer-Agent Runde 2. Das Implementierungs-Review bleibt bei `shared/review-loop/loop.md` und verliert nur die Hochstufung.
**Tech-Stack:** Node.js (CommonJS, nur `node:`-Module), `node:test`, Markdown-Agenten und -Skills des Plugins dv-forge.
**Spec:** docs/forge/2026-09-28-review-ablauf-regelwerk/spec.md
**Basis:** 3ce509e

## Global Constraints
- Checkout: Der Plan setzt auf dem Stand `3ce509e` auf (siehe „W · Plan-Basis“). Alle Pfade sind relativ zur Checkout-Wurzel. Tests laufen aus der Checkout-Wurzel mit `node --test plugins/forge/tests/<datei>.test.js`, der Gesamtlauf mit `node --test "plugins/forge/tests/*.test.js"`. Das Verzeichnis-Argument `node --test plugins/forge/tests/` und `node --test` ohne Argument sind verboten, weil sie auch Skripte unter `scripts/toolchain/` und Fixture-Tests finden. Im Stand `3ce509e` schlagen im Gesamtlauf schon zwei Tests fehl (`cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest`, `cli_Skeleton_ExistingTarget_RefusesAndKeepsFile`); sie gehören nicht zu diesem Plan.
- Deckel: Höchstens zwei Runden je Lauf und höchstens eine Nacharbeit, für Spec- und Plan-Review gleich. Kein Schalter erlaubt mehr Runden.
- Mechanisch: Farbe, Filter, Herabstufungen, den Deckel, Prüfliste, geänderte Bereiche und Status bestimmt ein Skript ohne Urteil einer KI. Gleiche Findings und gleiche Urteile ergeben immer die gleichen Farben, den gleichen Ablauf und den gleichen Status.
- Urteil der KI: Nur die KI entscheidet, ob etwas ein Finding ist und welche Kategorie es hat. Außerdem liefert sie die Scout-Vorschläge, den Text der Nacharbeit, die Bündelung der Fragen je Regel, das Urteil, ob eine Antwort des Menschen eine Frage beantwortet, und die Urteile der Nachprüfung.
- Kategorien und Farben: `widerspruch` → 🔴; `fehlendes-verhalten` → 🔴 (nur wenn eine beschriebene Funktion gar kein AC hat oder eine Aktion gar kein Ergebnis; das Skript leitet ohne eigene Prüfung 🔴 ab); `unerfuellbar` → 🔴; `ac-fehlt-im-plan` → 🔴, nur im Plan-Review; `umsetzer-steckt-fest` → 🔴, nur im Plan-Review, auch bei einem verbotenen Befehl; `detail` → 🟡; `formulierung` → 🟢.
- Stelle: die kleinste benannte Einheit — ein AC, ein Schritt oder eine benannte Soll-Vorgabe, im Plan ein Task; sonst der Abschnitt. Ein Finding über mehrere Stellen gehört zur ersten Stelle in seinem Feld Stelle, ein Finding ohne benannte Einheit zum Abschnitt seines Zitats. Gruppe, Filter, Prüfliste, Herabstufung und geänderter Bereich nutzen dieselbe Einheit.
- Ungültiges Finding (nur Spec- und Plan-Review): eine unbekannte Kategorie, eine Plan-Kategorie im Spec-Review, ein fehlendes Pflichtfeld (Stelle, Zitat, Kategorie, Konsequenz, Begründung) oder eine Farbe im Finding macht das Ergebnis des Reviewers ungültig; er wird nachgefordert.
- Nachforderung: Ohne gültiges Ergebnis wird eine Instanz genau einmal nachgefordert und danach genau einmal neu gestartet; danach gilt sie als ausgefallen. Für den Scout gilt dasselbe, sein Ausfall ändert den Status nicht, der Bericht vermerkt „Scout ausgefallen“.
- Höchstens 🟡: Findings beratender Reviewer (das Review legt sie fest, ohne beratende greift die Regel nicht); Findings, deren ganzes Zitat aus einem W-Eintrag stammt; Findings mit einem der Wörter `Großschreibung`, `Kleinschreibung`, `ß`, `Umlaut`, `Diakritik` als ganzes Wort in irgendeinem Feld (kein Buchstabe unmittelbar davor oder danach); in der Nachprüfung jedes Finding außerhalb der Prüfliste, außer einem Widerspruch in einem geänderten Bereich und außer dem Befund einer Skript-Prüfung.
- Entfällt: Findings zu den Kopfzeilen `Status`, `Art`, `Workitem`, `Basis`; Findings an einer Stelle mit offener Frage, außer dem Befund einer Skript-Prüfung.
- Offene Frage: `- **R<n> · <Stelle>** — frage an den menschen — <Frage>` im Abschnitt `Entscheidungen`; offen, bis ein W-Eintrag dieselbe Stelle als ganzes Wort im Titel trägt (davor und danach weder Buchstabe noch Ziffer noch `-` noch `_`) und den R-Eintrag im Text als `Antwort auf „R<n> · <Stelle>“` nennt. Eine Stelle aus mehreren Wörtern, etwa ein Abschnittsname, steht mit allen Wörtern in derselben Reihenfolge im Titel. Nennt ein W-Eintrag mehrere Stellen im Titel, beantwortet er jede, deren R-Eintrag er nennt. Die Nacharbeit schreibt je Stelle mit Frage genau einen R-Eintrag, auch wenn die Frage gebündelt mehrere Stellen nennt. Im Plan-Review steht eine Spec-Rückfrage in derselben Form im Plan.
- Bündelung prüfen: Jede Stelle mit Frage steht in genau einer gebündelten Frage; fehlerhaft → eine Korrektur, danach ausgefallen.
- Skript-Prüfungen laufen in Runde 1 und in der Nachprüfung; ihre Befunde bleiben 🔴 und zählen zu den offenen 🔴.
- Geänderter Bereich: eine Stelle, die die Nacharbeit geändert hat, auch nebenbei; Änderungen im Abschnitt `Entscheidungen` zählen nicht.
- Status, erster zutreffender gilt: `unvollständig, ausgefallen: <liste>` → `Fragen offen` → `nicht bereit, k × 🔴 offen` (k = nicht erledigte Punkte + Widersprüche + 🔴 der Skript-Prüfungen) → `sauber nach Runde 1` bzw. `sauber nach Nachprüfung`.
- Begriffe: Runde (nicht: Durchlauf), Lauf, Nachprüfung (nicht: Nach-Review, Re-Review), Hinweis für ein 🟡-Finding, Kategorie.
- Implementierungs-Review: bleibt, wie es ist; seine Reviewer vergeben weiter eine Farbe. Nur die Hochstufung von 2 × 🟡 auf 🔴 entfällt, überall.
- Sprache: Code-Kommentare, Doku, Agenten und Skill-Texte auf Deutsch wie im Bestand; Bezeichner und Commit-Messages englisch (Conventional Commits, Scope `forge`).
- unit-integration-testing: Tests heißen `<Methode>_<Situation>_<Erwartung>`; neue Testdateien sind nach Arrange-Act-Assert mit den Kommentaren `// Arrange`, `// Act`, `// Assert` aufgebaut, Act ist eine Zeile; neue Tests in bestehenden Testdateien folgen dem Stil der Datei. Ein Test prüft ein Verhalten; Tests teilen keinen Zustand (jeder legt eigene Temp-Ordner an).
- software-design-principles: Integration und Operation getrennt (IOSP) — ein `if` delegiert an benannte Funktionen, Guard Clauses ausgenommen; keine Verschachtelung über zwei Ebenen; kleine Funktionen mit einer Aufgabe; höchstens vier Parameter, keine Bool-Schalter; kein toter Code, keine verschluckten Fehler.
- superpowers:writing-skills: Skill- und Agent-Frontmatter nur mit den vorhandenen Feldern, `description` beginnt mit „Use when…“ und fasst keinen Ablauf zusammen; SKILL.md-Body unter 500 Wörtern, Details in `references/` oder `shared/`; keine `@`-Links; keine Änderung an Skill oder Agent ohne vorher fehlschlagenden Test.

---

### Task 1: Hochstufung entfernen

**ACs:** AC-33, AC-34

**Dateien:**
- Modify: `plugins/forge/scripts/aggregate-findings.js:122-127` · `rateGroup`
- Modify: `plugins/forge/scripts/aggregate-findings.js:178-181` · `formatEscalated`
- Modify: `plugins/forge/scripts/aggregate-findings.js:235-246` · `render`
- Modify: `plugins/forge/scripts/aggregate-findings.js:200-206` · `formatReworkGroup`
- Modify: `plugins/forge/shared/review-loop/severity-rules.md` · `4. Nennen ≥ 2 verschiedene Reviewer`
- Test: `plugins/forge/tests/aggregate-rate.test.js` · `aggregate_YellowFromTwoReviewers_EscalatesToRed`
- Test: `plugins/forge/tests/aggregate-file.test.js` · `run_FileTypes_GroupsAcrossReviewersAndEscalates`
- Test: `plugins/forge/tests/review-loop.test.js` · `findingFormat_Generic_LocationKeysIncludeTask`

**Interfaces:**
- Consumes: —
- Produces: `aggregate(reviews, types)` liefert Gruppen ohne Feld `escalated`; `render(result)` hat keine Zeile `HOCHGESTUFT` mehr, Zeile 3 ist `=== REPORT ===`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/aggregate-rate.test.js` ersetzt du den Test `aggregate_MixedSeverities_GroupTakesHighest` und den Test `aggregate_YellowFromTwoReviewers_EscalatesToRed` durch:
  ```javascript
  test('aggregate_MixedSeverities_GroupTakesHighest', () => {
    const [group] = aggregate([
      review('consistency', [finding({ severity: 'green' })]),
      review('consistency', [finding({ severity: 'red' })]),
    ]);
    assert.equal(group.severity, 'red');
  });

  test('aggregate_YellowFromTwoReviewers_StaysYellow', () => {
    const [group] = aggregate([
      review('consistency', [finding()]),
      review('clarity', [finding()]),
    ]);
    assert.equal(group.severity, 'yellow');
  });

  test('aggregate_RedWithoutCategory_StaysRed', () => {
    const [group] = aggregate([review('risks', [finding({ severity: 'red' })])]);
    assert.equal(group.severity, 'red');
  });
  ```
  Im Test `render_CountsPerReviewer_ShowWhatWasReadBeforeGrouping` ersetzt du die Zeile `assert.equal(lines[2], 'HOCHGESTUFT -');` durch `assert.equal(lines[2], '=== REPORT ===');`. Den Test `render_YellowFromTwoReviewers_ListsEscalatedLocation` ersetzt du durch:
  ```javascript
  test('render_YellowFromTwoReviewers_StaysYellowWithoutEscalationLine', () => {
    const text = [block(review('completeness', [finding()])), block(review('clarity', [finding()]))].join('\n');
    const output = render(run(text, ['completeness', 'clarity']));
    assert.equal(output.split('\n')[0], 'STATUS clean=true red=0 yellow=1 green=0 failed=-');
    assert.doesNotMatch(output, /HOCHGESTUFT|hochgestuft/);
  });
  ```
  In `plugins/forge/tests/aggregate-file.test.js` ersetzt du den Test `run_FileTypes_GroupsAcrossReviewersAndEscalates` durch:
  ```javascript
  test('run_FileTypes_GroupsAcrossReviewersAsOneYellowGroup', () => {
    const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
    const { groups, status } = run(text, ['design', 'risks'], TYPES);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].severity, 'yellow');
    assert.equal(status.counts.yellow, 1);
  });
  ```
  und im Test `cli_RepoFlag_GroupsFileLocations` die Zeile `assert.match(result.stdout, /^STATUS clean=false red=1 yellow=0 green=0 failed=-/);` durch `assert.match(result.stdout, /^STATUS clean=true red=0 yellow=1 green=0 failed=-/);`.
  In `plugins/forge/tests/review-loop.test.js` fügst du direkt vor dem Test `findingFormat_Generic_LocationKeysIncludeTask` ein:
  ```javascript
  test('severityRules_TwoYellowAtOnePlace_StayYellowWithoutEscalation', () => {
    const text = readText(path.join(SHARED, 'severity-rules.md'));
    assert.ok(text.includes('Zwei 🟡 an einer Stelle bleiben 🟡.'));
    assert.doesNotMatch(text, /hochgestuft|≥ 2 verschiedene Reviewer/);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/aggregate-rate.test.js plugins/forge/tests/aggregate-file.test.js plugins/forge/tests/review-loop.test.js` — erwartet: FAIL `aggregate_YellowFromTwoReviewers_StaysYellow`, `render_CountsPerReviewer_ShowWhatWasReadBeforeGrouping`, `render_YellowFromTwoReviewers_StaysYellowWithoutEscalationLine`, `run_FileTypes_GroupsAcrossReviewersAsOneYellowGroup`, `cli_RepoFlag_GroupsFileLocations`, `severityRules_TwoYellowAtOnePlace_StayYellowWithoutEscalation`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/aggregate-findings.js` ersetzt du `rateGroup` durch:
  ```javascript
  function rateGroup(group) {
    const severity = [...group.items].sort(byRankDescending)[0].severity;
    const reviewers = [...new Set(group.items.map((item) => item.reviewer))];
    return { ...group, reviewers, severity };
  }
  ```
  Du löschst die Funktion `formatEscalated` ganz und in `render` die Zeile `    formatEscalated(result.groups),`. In `formatReworkGroup` ersetzt du die ersten beiden Zeilen des Rumpfs durch:
  ```javascript
    const header = `### ${SEVERITY_ICON[group.severity]} ${group.location} (${group.reviewers.join(', ')})`;
  ```
  In `plugins/forge/shared/review-loop/severity-rules.md` ersetzt du die beiden Zeilen
  ```markdown
  4. Nennen ≥ 2 verschiedene Reviewer eine 🟡-Gruppe, wird sie 🔴 („hochgestuft“).
  5. Sortierung 🔴 → 🟡 → 🟢.
  ```
  durch
  ```markdown
  4. Sortierung 🔴 → 🟡 → 🟢. Zwei 🟡 an einer Stelle bleiben 🟡.
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/aggregate-rate.test.js plugins/forge/tests/aggregate-file.test.js plugins/forge/tests/aggregate-parse.test.js plugins/forge/tests/review-loop.test.js plugins/forge/tests/followup.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/aggregate-findings.js plugins/forge/shared/review-loop/severity-rules.md plugins/forge/tests/aggregate-rate.test.js plugins/forge/tests/aggregate-file.test.js plugins/forge/tests/review-loop.test.js` · `git commit -m "fix(forge): two yellow findings at one place stay yellow"`

---

### Task 2: Stellen eines Dokuments

**ACs:** AC-23, AC-25

**Dateien:**
- Create: `plugins/forge/scripts/lib/places.js`
- Create: `plugins/forge/tests/lib/review-flow-fixture.js`
- Test: `plugins/forge/tests/review-places.test.js`

**Interfaces:**
- Consumes: `normalizeLocation(location)` aus `plugins/forge/scripts/aggregate-findings.js` (bestehend; `AC-7` → `ac-7`, `Task 03` → `task 3`, sonst getrimmt, Leerraum vereinheitlicht, klein).
- Produces: in `plugins/forge/scripts/lib/places.js`:
  - `placeKey(label: string): string` — Schlüssel einer Stelle (`normalizeLocation`).
  - `isHeaderKey(key: string): boolean` — `true` für `status`, `art`, `workitem`, `basis`.
  - `isDecisionSection(label: string): boolean` — `true`, wenn der Abschnittsname auf `Entscheidungen` endet.
  - `collapse(text: string): string` — Leerraum zu einem Leerzeichen, getrimmt.
  - `parsePlaces(text: string): Map<string, { key: string, label: string, section: string, text: string }>` — Stellen in Reihenfolge: `Kopf` (alles vor dem ersten `## `), je `## `-Abschnitt eine Stelle, darin je `- **AC-<n>**`, je `<n>. **<Name>:**` und je `- **<Name>:**` (nicht `W · `, `E · `, `F · `, `R<n> · `) eine eigene Stelle, im Plan je `### Task <n>` eine Stelle bis zur nächsten Überschrift oder `---`; Code-Blöcke gehören zur Stelle, in der sie stehen. Heißt eine benannte Einheit wie ein Abschnitt, lautet ihr Name `<Abschnitt> · <Name>`.
  - `resolvePlace(location: string, quote: string, places: Map): { key: string, label: string }` — ganze Stelle, sonst erste bekannte Stelle aus `location` (Trenner `,`, `;`, ` und `), sonst Abschnitt, in dem das Zitat steht, sonst `location` selbst, mit Leerraum und Zeilenumbrüchen zu einem Leerzeichen zusammengezogen.
  - `changedPlaces(beforeText: string, afterText: string): string[]` — Namen der Stellen mit anderem Text, ohne Stellen aus Abschnitten `…Entscheidungen`.
  - `decisionLines(text: string): string[]` — Zeilen `- **…` der Abschnitte `…Entscheidungen`.
- Produces: in `plugins/forge/tests/lib/review-flow-fixture.js`: `SCRIPT`, `SPEC` (Beispiel-Spec mit `Kopf`, `Was, wie, wo, warum`, Soll-Vorgaben `Deckel` und `Schreibweise`, `AC-01`, `AC-04`, `AC-07`, W-Eintrag `W · Deckel`), `finding(overrides)`, `tempDir(prefix)`, `setup(spec?) → { workspace, doc }`, `writeJsonFile(file, value)`, `writeReviewer(env, name, findings, round?)`, `flow(...args) → spawnSync-Ergebnis von review-flow.js`, `rate(env, expect, extra?)`, `readJsonFile(file)`, `editDoc(env, from, to)` (ersetzt im Dokument den ersten Treffer von `from`), `addEntries(env, ...entries)` (fügt Einträge direkt vor `- **W · Deckel**` ein), `runUntilRework(env, findings, review = 'spec-review')` (Reviewer `consistency` liefert `findings`, dann `rate` und `rework-input`). Die Tests der Tasks 8, 9 und 10 importieren diese Helfer und definieren sie nicht selbst.

- [ ] **Schritt 1: Fehlschlagenden Test und Test-Hilfe schreiben**
  `plugins/forge/tests/lib/review-flow-fixture.js`:
```javascript
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'review-flow.js');

const SPEC = [
  '# Demo-Spec',
  '',
  'Status: bestätigt am 2026-01-01',
  'Art: verankert',
  'Basis: abc1234',
  '',
  '## Was, wie, wo, warum',
  'Ein Demo-Dokument für den Review-Ablauf.',
  '',
  '## Soll-Vorgaben',
  '- **Deckel:** Höchstens zwei Runden.',
  '- **Schreibweise:** Begriffe wie im Glossar.',
  '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, wenn B, dann C.',
  '- **AC-04** Gegeben D, wenn E, dann F.',
  '- **AC-07** Gegeben G, wenn H, dann I.',
  '',
  '## Entscheidungen',
  '- **W · Deckel** · Aussage — Zwei Runden, keine dritte.',
  '',
].join('\n');

function finding(overrides = {}) {
  return { location: 'AC-01', quote: 'Gegeben A, wenn B, dann C.', category: 'detail', consequence: 'Folge', rationale: 'Grund', ...overrides };
}

function tempDir(prefix = 'dv-forge-flow-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Arbeitsbereich mit Spec-Datei; `spec` ersetzt den Standardtext.
function setup(spec = SPEC) {
  const workspace = tempDir();
  const doc = path.join(tempDir('dv-forge-doc-'), 'spec.md');
  fs.writeFileSync(doc, spec);
  return { workspace, doc };
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

function writeReviewer(env, name, findings, round = 'runde-1') {
  writeJsonFile(path.join(env.workspace, round, `${name}.json`), { reviewer: name, summary: 's', findings });
}

function flow(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function rate(env, expect, extra = []) {
  return flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', expect, ...extra);
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function editDoc(env, from, to) {
  fs.writeFileSync(env.doc, fs.readFileSync(env.doc, 'utf8').replace(from, to));
}

// Einträge unter Entscheidungen, direkt vor dem W-Eintrag der Beispiel-Spec.
function addEntries(env, ...entries) {
  editDoc(env, '- **W · Deckel**', [...entries, '- **W · Deckel**'].join('\n'));
}

// Runde 1 mit einem Reviewer `consistency` einstufen und die Eingabe der Nacharbeit schreiben.
function runUntilRework(env, findings, review = 'spec-review') {
  writeReviewer(env, 'consistency', findings);
  flow('rate', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');
  flow('rework-input', '--review', review, '--dir', env.workspace, '--doc', env.doc);
}

module.exports = {
  SCRIPT, SPEC, finding, tempDir, setup, writeJsonFile, writeReviewer, flow, rate, readJsonFile, editDoc, addEntries, runUntilRework,
};
```
  `plugins/forge/tests/review-places.test.js`:
````javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePlaces, resolvePlace, changedPlaces, decisionLines } = require('../scripts/lib/places');
const { SPEC } = require('./lib/review-flow-fixture');

const PLAN = [
  '# Demo — Umsetzungsplan',
  '',
  '**Ziel:** Demo.',
  '',
  '## Global Constraints',
  '- Nur node:-Module.',
  '',
  '---',
  '',
  '### Task 1: Eins',
  '',
  '- Create: `a.js`',
  '',
  '```markdown',
  '## Entscheidungen',
  '```',
  '',
  '### Task 2: Zwei',
  'Text zwei.',
  '',
  '## Entscheidungen',
  '- Keine Fragen an den Menschen.',
  '',
].join('\n');

test('parsePlaces_Spec_NamesHeadAcsSollVorgabenAndSections', () => {
  // Act
  const labels = [...parsePlaces(SPEC).values()].map((place) => place.label);

  // Assert
  assert.deepEqual(labels, ['Kopf', 'Was, wie, wo, warum', 'Soll-Vorgaben', 'Deckel', 'Schreibweise', 'Akzeptanzkriterien', 'AC-01', 'AC-04', 'AC-07', 'Entscheidungen']);
});

test('parsePlaces_Plan_TaskKeepsListsAndFencedHeadings', () => {
  // Act
  const places = parsePlaces(PLAN);

  // Assert
  assert.match(places.get('task 1').text, /- Create: `a.js`[\s\S]*## Entscheidungen/);
  assert.equal(places.get('entscheidungen').text, '## Entscheidungen\n- Keine Fragen an den Menschen.');
});

test('parsePlaces_ItemNamedLikeSection_GetsSectionPrefix', () => {
  // Arrange
  const text = '## Soll-Vorgaben\n- **Entscheidungen:** Änderungen dort zählen nicht.\n\n## Entscheidungen\n- **W · X** · Aussage — y\n';

  // Act
  const labels = [...parsePlaces(text).values()].map((place) => place.label);

  // Assert
  assert.deepEqual(labels, ['Kopf', 'Soll-Vorgaben', 'Soll-Vorgaben · Entscheidungen', 'Entscheidungen']);
});

test('parsePlaces_NumberedStep_UsesBoldNameWithoutColon', () => {
  // Arrange
  const text = '## Theoretisches Verhalten nach Umsetzung\n1. **Runde 1, Suche:** Alle prüfen.\n2. **Einstufung:** Ein Skript stuft ein.\n\nEin neuer Lauf sucht wieder.\n';

  // Act
  const places = parsePlaces(text);

  // Assert
  assert.equal(places.get('runde 1, suche').text, '1. **Runde 1, Suche:** Alle prüfen.');
  assert.match(places.get('theoretisches verhalten nach umsetzung').text, /Ein neuer Lauf sucht wieder\./);
});

test('resolvePlace_SeveralPlacesInLocation_TakesFirstKnownPlace', () => {
  // Act
  const place = resolvePlace('AC-7, AC-04', 'x', parsePlaces(SPEC));

  // Assert
  assert.equal(place.label, 'AC-07');
});

test('resolvePlace_UnnamedLocation_TakesSectionOfQuote', () => {
  // Act
  const place = resolvePlace('Randfall', 'Höchstens zwei Runden.', parsePlaces(SPEC));

  // Assert
  assert.equal(place.label, 'Soll-Vorgaben');
});

test('resolvePlace_UnknownLocationAndQuote_KeepsLocationAsGiven', () => {
  // Act
  const place = resolvePlace('AC-99', 'nirgends', parsePlaces(SPEC));

  // Assert
  assert.deepEqual(place, { key: 'ac-99', label: 'AC-99' });
});

test('resolvePlace_UnknownLocationWithLineBreak_LabelOnOneLine', () => {
  // Act
  const place = resolvePlace('Rand\n### 🔴 Fall', 'nirgends', parsePlaces(SPEC));

  // Assert
  assert.deepEqual(place, { key: 'rand ### 🔴 fall', label: 'Rand ### 🔴 Fall' });
});

test('changedPlaces_AcAndDecisionChanged_ListsOnlyAc', () => {
  // Arrange
  const after = SPEC.replace('dann F.', 'dann G.').replace('- **W · Deckel**', '- **R1 · AC-04** — geändert — x\n- **W · Deckel**');

  // Act
  const changed = changedPlaces(SPEC, after);

  // Assert
  assert.deepEqual(changed, ['AC-04']);
});

test('changedPlaces_OnlyDecisionsChanged_ListsNothing', () => {
  // Arrange
  const after = SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — nicht geändert — x\n- **W · Deckel**');

  // Act
  const changed = changedPlaces(SPEC, after);

  // Assert
  assert.deepEqual(changed, []);
});

test('decisionLines_Spec_ReturnsEntriesOfDecisionSection', () => {
  // Act
  const lines = decisionLines(SPEC);

  // Assert
  assert.deepEqual(lines, ['- **W · Deckel** · Aussage — Zwei Runden, keine dritte.']);
});
````
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-places.test.js` — erwartet: FAIL `Cannot find module '../scripts/lib/places'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/places.js`:
````javascript
'use strict';

const { normalizeLocation } = require('../aggregate-findings');

const HEAD_LABEL = 'Kopf';
const HEADER_KEYS = new Set(['status', 'art', 'workitem', 'basis']);
const SECTION = /^## (.+?)\s*$/;
const TASK = /^### (Task \d+)\b/;
const SUBHEADING = /^#{3,6} /;
const AC_ITEM = /^- \*\*(AC-\d+)\*\*/;
const STEP_ITEM = /^\d+\. \*\*(.+?)\*\*/;
const LABEL_ITEM = /^- \*\*(.+?)\*\*/;
const ENTRY_LABEL = /^(?:W|E|F|R\d+) · /;
const LIST_ITEM = /^(?:[-*] |\d+\. )/;
const FENCE = /^\s*(?:```|~~~)/;
const DECISIONS = /Entscheidungen$/;

function placeKey(label) {
  return normalizeLocation(label);
}

function isHeaderKey(key) {
  return HEADER_KEYS.has(key);
}

function isDecisionSection(label) {
  return DECISIONS.test(label);
}

function collapse(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function splitLines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function openPlace(places, label, section, isTask = false) {
  const key = placeKey(label);
  if (!places.has(key)) places.set(key, { key, label, section, isTask, lines: [] });
  return places.get(key);
}

function sectionPlace(places, state) {
  return openPlace(places, state.section, state.section);
}

// Name eines AC, eines Schritts oder einer Soll-Vorgabe; Einträge unter Entscheidungen sind keine Stellen.
function namedItem(line) {
  const match = AC_ITEM.exec(line) ?? STEP_ITEM.exec(line) ?? LABEL_ITEM.exec(line);
  if (!match) return null;
  const label = match[1].replace(/:$/, '').trim();
  return ENTRY_LABEL.test(label) ? null : label;
}

function startsNewBlock(line, state) {
  if (line.trim() === '') return false;
  return LIST_ITEM.test(line) || (state.afterBlank && !/^\s/.test(line));
}

function headingPlace(line, state, places) {
  const section = SECTION.exec(line);
  if (section) {
    state.section = section[1];
    return sectionPlace(places, state);
  }
  const task = TASK.exec(line);
  if (task) return openPlace(places, task[1], state.section, true);
  return SUBHEADING.test(line) || line.trim() === '---' ? sectionPlace(places, state) : null;
}

// Heißt eine benannte Einheit wie ein Abschnitt, trägt sie den Abschnitt als Präfix, damit beide getrennt bleiben.
function itemLabel(named, state) {
  return state.sectionKeys.has(placeKey(named)) ? `${state.section} · ${named}` : named;
}

function itemPlace(line, state, places) {
  const named = namedItem(line);
  if (named) return openPlace(places, itemLabel(named, state), state.section);
  return startsNewBlock(line, state) ? sectionPlace(places, state) : state.current;
}

function placeFor(line, state, places) {
  if (state.inFence) return state.current;
  const heading = headingPlace(line, state, places);
  if (heading) return heading;
  if (state.current.isTask) return state.current;
  return itemPlace(line, state, places);
}

function trackLine(line, state) {
  if (FENCE.test(line)) state.inFence = !state.inFence;
  if (!state.inFence) state.afterBlank = line.trim() === '';
}

// Stellen eines Dokuments: Kopf, Abschnitte, ACs, Schritte, benannte Soll-Vorgaben und Tasks, je Schlüssel ihr Text.
function sectionKeys(lines) {
  const keys = new Set();
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const section = inFence ? null : SECTION.exec(line);
    if (section) keys.add(placeKey(section[1]));
  }
  return keys;
}

function parsePlaces(text) {
  const places = new Map();
  const lines = splitLines(text);
  const state = { section: HEAD_LABEL, sectionKeys: sectionKeys(lines), current: null, inFence: false, afterBlank: false };
  state.current = openPlace(places, HEAD_LABEL, HEAD_LABEL);
  for (const line of lines) {
    state.current = placeFor(line, state, places);
    state.current.lines.push(line);
    trackLine(line, state);
  }
  return new Map([...places].map(([key, place]) => [key, { key, label: place.label, section: place.section, text: place.lines.join('\n').trim() }]));
}

function sectionOfQuote(quote, places) {
  const needle = collapse(quote);
  if (needle === '') return null;
  const hit = [...places.values()].find((place) => collapse(place.text).includes(needle));
  return hit ? places.get(placeKey(hit.section)) ?? hit : null;
}

// Ganze Stelle, sonst die erste genannte Stelle, sonst der Abschnitt des Zitats, sonst die Stelle wie genannt.
function resolvePlace(location, quote, places) {
  const whole = placeKey(location);
  if (places.has(whole)) return places.get(whole);
  const first = String(location).split(/,|;| und /).map(placeKey).find((key) => places.has(key));
  if (first) return places.get(first);
  return sectionOfQuote(quote, places) ?? { key: whole, label: collapse(location) };
}

function changedPlaces(beforeText, afterText) {
  const before = parsePlaces(beforeText);
  const after = parsePlaces(afterText);
  const keys = [...new Set([...before.keys(), ...after.keys()])];
  return keys
    .map((key) => after.get(key) ?? before.get(key))
    .filter((place) => !isDecisionSection(place.section))
    .filter((place) => before.get(place.key)?.text !== after.get(place.key)?.text)
    .map((place) => place.label);
}

function decisionLines(text) {
  return [...parsePlaces(text).values()]
    .filter((place) => isDecisionSection(place.section))
    .flatMap((place) => place.text.split('\n'))
    .filter((line) => line.startsWith('- **'));
}

module.exports = { placeKey, isHeaderKey, isDecisionSection, collapse, parsePlaces, resolvePlace, changedPlaces, decisionLines };
````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-places.test.js` — erwartet: PASS (11 Tests)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/places.js plugins/forge/tests/lib/review-flow-fixture.js plugins/forge/tests/review-places.test.js` · `git commit -m "feat(forge): parse places of a spec or plan for the review flow"`

---

### Task 3: Regelwerk der Kategorien

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11, AC-24, AC-38, AC-39, AC-47

**Dateien:**
- Create: `plugins/forge/scripts/lib/rules.js`
- Test: `plugins/forge/tests/review-rules.test.js`

**Interfaces:**
- Consumes: `placeKey`, `isHeaderKey`, `collapse` aus `plugins/forge/scripts/lib/places.js` (Task 2); `finding(overrides)` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2).
- Produces: in `plugins/forge/scripts/lib/rules.js`:
  - `CATEGORIES: { 'spec-review': Record<string, 'red'|'yellow'|'green'>, 'plan-review': Record<string, 'red'|'yellow'|'green'> }`
  - `isReview(review: string): boolean`
  - `findingProblem(finding: object, review: string): string | null` — Texte `Finding ist kein Objekt`, `Farbe im Finding: <location>`, `Pflichtfeld fehlt: <feld> (<location>)`, `Kategorie unbekannt: <kategorie> (<location>)`.
  - `resultProblem(result: object, review: string, name: string): string | null` — zusätzlich `Ergebnis ist kein JSON-Objekt`, `reviewer passt nicht zum Dateinamen: <reviewer>`, `findings fehlt`.
  - `rateFinding(finding, place: { key, label }, context): { color: 'red'|'yellow'|'green'|null, dropped: 'Kopfzeile'|'offene Frage'|null }` mit `context = { review, reviewer, advisory: Set<string>, wEntries: string[], openKeys: Set<string>, phase: 'suche'|'nachpruefung', checklistKeys: Set<string>, changedKeys: Set<string> }`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-rules.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findingProblem, resultProblem, rateFinding } = require('../scripts/lib/rules');
const { finding } = require('./lib/review-flow-fixture');

const PLACE = { key: 'ac-1', label: 'AC-01' };
const W_ENTRY = '- **W · Deckel** · Aussage — Zwei Runden, keine dritte.';

function context(overrides = {}) {
  return {
    review: 'spec-review', reviewer: 'clarity', advisory: new Set(), wEntries: [W_ENTRY], openKeys: new Set(),
    phase: 'suche', checklistKeys: new Set(), changedKeys: new Set(), ...overrides,
  };
}

function colorOf(overrides, contextOverrides = {}, place = PLACE) {
  return rateFinding(finding(overrides), place, context(contextOverrides)).color;
}

for (const category of ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar']) {
  test(`rateFinding_SpecCategory${category}_IsRed`, () => {
    // Act
    const color = colorOf({ category });

    // Assert
    assert.equal(color, 'red');
  });
}

for (const category of ['ac-fehlt-im-plan', 'umsetzer-steckt-fest']) {
  test(`rateFinding_PlanCategory${category}_IsRed`, () => {
    // Act
    const color = colorOf({ category, location: 'Task 1' }, { review: 'plan-review' });

    // Assert
    assert.equal(color, 'red');
  });
}

test('rateFinding_DetailAndFormulierung_AreYellowAndGreen', () => {
  // Act
  const colors = [colorOf({ category: 'detail' }), colorOf({ category: 'formulierung' })];

  // Assert
  assert.deepEqual(colors, ['yellow', 'green']);
});

test('findingProblem_PlanCategoryInSpecReview_IsInvalid', () => {
  // Act
  const problem = findingProblem(finding({ category: 'ac-fehlt-im-plan' }), 'spec-review');

  // Assert
  assert.equal(problem, 'Kategorie unbekannt: ac-fehlt-im-plan (AC-01)');
});

test('findingProblem_UnknownCategory_IsInvalid', () => {
  // Act
  const problem = findingProblem(finding({ category: 'stil' }), 'plan-review');

  // Assert
  assert.equal(problem, 'Kategorie unbekannt: stil (AC-01)');
});

test('findingProblem_MissingRationale_IsInvalid', () => {
  // Arrange
  const { rationale, ...withoutRationale } = finding();

  // Act
  const problem = findingProblem(withoutRationale, 'spec-review');

  // Assert
  assert.equal(problem, 'Pflichtfeld fehlt: rationale (AC-01)');
});

test('findingProblem_ColorInFinding_IsInvalid', () => {
  // Act
  const problem = findingProblem(finding({ severity: 'red' }), 'spec-review');

  // Assert
  assert.equal(problem, 'Farbe im Finding: AC-01');
});

test('resultProblem_ReviewerNameDiffers_IsInvalid', () => {
  // Act
  const problem = resultProblem({ reviewer: 'spec-review-clarity', findings: [] }, 'spec-review', 'clarity');

  // Assert
  assert.equal(problem, 'reviewer passt nicht zum Dateinamen: spec-review-clarity');
});

test('rateFinding_AdvisoryReviewerContradiction_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'widerspruch' }, { advisory: new Set(['clarity']) });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_WholeQuoteFromWEntry_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'fehlendes-verhalten', quote: 'Zwei Runden, keine dritte.' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_QuoteSetsSpecSentenceAgainstWEntry_StaysRed', () => {
  // Act
  const color = colorOf({ category: 'widerspruch', quote: 'Höchstens drei Runden. ↔ Zwei Runden, keine dritte.' });

  // Assert
  assert.equal(color, 'red');
});

test('rateFinding_WordUmlautInText_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'fehlendes-verhalten', rationale: 'Der Umlaut fehlt.' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_SharpSInQuotes_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'widerspruch', consequence: '„ß“ statt „ss“' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_WordsUmlauteAndStrasse_StayRed', () => {
  // Act
  const colors = [
    colorOf({ category: 'fehlendes-verhalten', rationale: 'Umlaute im Namen' }),
    colorOf({ category: 'widerspruch', quote: 'Straße' }),
  ];

  // Assert
  assert.deepEqual(colors, ['red', 'red']);
});

test('rateFinding_HeaderBasis_IsDropped', () => {
  // Act
  const rating = rateFinding(finding({ location: 'Basis', category: 'widerspruch' }), PLACE, context());

  // Assert
  assert.deepEqual(rating, { color: null, dropped: 'Kopfzeile' });
});

test('rateFinding_PlaceWithOpenQuestion_IsDropped', () => {
  // Act
  const rating = rateFinding(finding({ category: 'widerspruch' }), PLACE, context({ openKeys: new Set(['ac-1']) }));

  // Assert
  assert.deepEqual(rating, { color: null, dropped: 'offene Frage' });
});

test('rateFinding_VerificationOutsideChecklist_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'fehlendes-verhalten' }, { phase: 'nachpruefung' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_VerificationContradictionInChangedArea_StaysRed', () => {
  // Act
  const color = colorOf({ category: 'widerspruch' }, { phase: 'nachpruefung', changedKeys: new Set(['ac-1']) });

  // Assert
  assert.equal(color, 'red');
});

test('rateFinding_SameInputTwice_SameRating', () => {
  // Arrange
  const input = finding({ category: 'widerspruch', rationale: 'Umlaut' });

  // Act
  const ratings = [rateFinding(input, PLACE, context()), rateFinding(input, PLACE, context())];

  // Assert
  assert.deepEqual(ratings[0], ratings[1]);
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-rules.test.js` — erwartet: FAIL `Cannot find module '../scripts/lib/rules'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/rules.js`:
```javascript
'use strict';

const { placeKey, isHeaderKey, collapse } = require('./places');

const SPEC_CATEGORIES = {
  widerspruch: 'red', 'fehlendes-verhalten': 'red', unerfuellbar: 'red', detail: 'yellow', formulierung: 'green',
};
const CATEGORIES = {
  'spec-review': SPEC_CATEGORIES,
  'plan-review': { ...SPEC_CATEGORIES, 'ac-fehlt-im-plan': 'red', 'umsetzer-steckt-fest': 'red' },
};
const REQUIRED_FIELDS = ['location', 'quote', 'category', 'consequence', 'rationale'];
const SPELLING_WORDS = /(?<!\p{L})(?:Großschreibung|Kleinschreibung|ß|Umlaut|Diakritik)(?!\p{L})/u;

function isReview(review) {
  return Object.hasOwn(CATEGORIES, review);
}

function findingProblem(finding, review) {
  if (finding === null || typeof finding !== 'object' || Array.isArray(finding)) return 'Finding ist kein Objekt';
  const where = String(finding.location ?? '?');
  if (Object.hasOwn(finding, 'severity')) return `Farbe im Finding: ${where}`;
  const missing = REQUIRED_FIELDS.find((field) => typeof finding[field] !== 'string' || finding[field].trim() === '');
  if (missing) return `Pflichtfeld fehlt: ${missing} (${where})`;
  if (!Object.hasOwn(CATEGORIES[review], finding.category)) return `Kategorie unbekannt: ${finding.category} (${where})`;
  return null;
}

function resultProblem(result, review, name) {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) return 'Ergebnis ist kein JSON-Objekt';
  if (result.reviewer !== name) return `reviewer passt nicht zum Dateinamen: ${result.reviewer}`;
  if (!Array.isArray(result.findings)) return 'findings fehlt';
  return result.findings.map((finding) => findingProblem(finding, review)).find(Boolean) ?? null;
}

function isSpellingFinding(finding) {
  return Object.values(finding).some((value) => typeof value === 'string' && SPELLING_WORDS.test(value));
}

function isQuoteFromWEntry(quote, wEntries) {
  const needle = collapse(quote);
  return needle !== '' && wEntries.some((entry) => collapse(entry).includes(needle));
}

function isOutsideChecklist(finding, place, context) {
  if (context.phase !== 'nachpruefung' || context.checklistKeys.has(place.key)) return false;
  return !(finding.category === 'widerspruch' && context.changedKeys.has(place.key));
}

function capsAtYellow(finding, place, context) {
  return context.advisory.has(context.reviewer)
    || isQuoteFromWEntry(finding.quote, context.wEntries)
    || isSpellingFinding(finding)
    || isOutsideChecklist(finding, place, context);
}

// Farbe eines gültigen Findings der KI an seiner Stelle; `dropped` nennt den Grund, wenn es entfällt.
function rateFinding(finding, place, context) {
  if (isHeaderKey(placeKey(finding.location))) return { color: null, dropped: 'Kopfzeile' };
  if (context.openKeys.has(place.key)) return { color: null, dropped: 'offene Frage' };
  const color = CATEGORIES[context.review][finding.category];
  const capped = color === 'red' && capsAtYellow(finding, place, context);
  return { color: capped ? 'yellow' : color, dropped: null };
}

module.exports = { CATEGORIES, isReview, findingProblem, resultProblem, rateFinding };
```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-rules.test.js` — erwartet: PASS (22 Tests)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/rules.js plugins/forge/tests/review-rules.test.js` · `git commit -m "feat(forge): derive finding colors from categories with drop and cap rules"`

---

### Task 4: Gruppen je Stelle

**ACs:** AC-05, AC-51

**Dateien:**
- Create: `plugins/forge/scripts/lib/groups.js`
- Modify: `plugins/forge/scripts/aggregate-findings.js` · `formatReworkGroup`
- Modify: `plugins/forge/scripts/aggregate-findings.js` · `render`
- Modify: `plugins/forge/scripts/aggregate-findings.js` · `module.exports`
- Modify: `plugins/forge/scripts/followup.js:191-193` · `module.exports`
- Test: `plugins/forge/tests/review-groups.test.js`

**Interfaces:**
- Consumes: `finding(overrides)` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2); `collapse` aus `plugins/forge/scripts/lib/places.js` (Task 2); `SEVERITY_RANK` aus `plugins/forge/scripts/aggregate-findings.js` (bestehend).
- Produces: in `plugins/forge/scripts/aggregate-findings.js` zusätzlich exportiert, damit Aggregat und Review-Ablauf ein Format teilen: `SEVERITY_ICON`, `REWORK_MARK = '=== REWORK ==='`, `cell(text)`, `reworkHeading(icon, location, reviewers): string` (`### <icon> <Stelle> (<reviewer, …>)`), `reworkLine(reviewer, tag, finding): string` (`- [<reviewer> · <tag>] Zitat: „…“ · Konsequenz: … · Begründung: …`). `formatReworkGroup` und `render` nutzen sie; die Ausgabe von `aggregate-findings.js` bleibt Zeichen für Zeichen gleich.
- Produces: in `plugins/forge/scripts/lib/groups.js`:
  - `ICON` (= `SEVERITY_ICON`), `REWORK_MARK` (aus `aggregate-findings.js` weitergereicht)
  - `groupRated(items: Array<{ reviewer, category, color, place: { key, label }, finding, script? }>): Array<{ key, label, items, color, reviewers: string[] }>` — höchste Farbe je Stelle, sortiert 🔴 → 🟡 → 🟢, dann Schlüssel.
  - `countColors(groups): { red: number, yellow: number, green: number }`
  - `cell(text): string` (aus `aggregate-findings.js` weitergereicht), `renderGroup(group): string`, `renderGroups(groups): string` (Aggregat-Format über `reworkHeading` und `reworkLine`: `=== REWORK ===`, `### <icon> <Stelle> (<reviewer>)` mit der Stelle auf einer Zeile, Zeilen `- [<reviewer> · <kategorie>] Zitat: „…“ · Konsequenz: … · Begründung: …`), `renderTable(groups): string` (Spalten `Stufe | Stelle | Kategorie | Reviewer | Konsequenzen`).
- Produces: in `plugins/forge/scripts/followup.js`: zusätzlich exportiert `parseScout(lines: string[]): Array<{ severity, location, proposals: string[], preferred: number|null }>` und `parseRework(lines: string[]): Array<{ severity, location, reviewers: string[], findings: string[] }>` (beide bestehend, bisher nicht exportiert).

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-groups.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { groupRated, countColors, renderGroups, renderTable } = require('../scripts/lib/groups');
const { parseRework } = require('../scripts/followup');
const { finding } = require('./lib/review-flow-fixture');

function item(reviewer, color, key = 'ac-4', label = 'AC-04') {
  return { reviewer, category: color === 'red' ? 'widerspruch' : 'detail', color, place: { key, label }, finding: finding({ location: label }) };
}

test('groupRated_TwoYellowFromTwoReviewers_StaysYellow', () => {
  // Act
  const [group] = groupRated([item('clarity', 'yellow'), item('consistency', 'yellow')]);

  // Assert
  assert.equal(group.color, 'yellow');
});

test('groupRated_RedAndYellowAtSamePlace_IsRed', () => {
  // Act
  const [group] = groupRated([item('clarity', 'yellow'), item('consistency', 'red')]);

  // Assert
  assert.equal(group.color, 'red');
});

test('groupRated_SeveralPlaces_SortedRedYellowGreen', () => {
  // Act
  const groups = groupRated([item('a', 'green', 'ac-1', 'AC-01'), item('a', 'yellow', 'ac-2', 'AC-02'), item('a', 'red', 'ac-3', 'AC-03')]);

  // Assert
  assert.deepEqual(groups.map((group) => group.color), ['red', 'yellow', 'green']);
});

test('countColors_Groups_CountsPerColor', () => {
  // Act
  const counts = countColors(groupRated([item('a', 'red', 'ac-1'), item('a', 'yellow', 'ac-2'), item('b', 'yellow', 'ac-3')]));

  // Assert
  assert.deepEqual(counts, { red: 1, yellow: 2, green: 0 });
});

test('renderGroups_Groups_ReadableByFollowupParser', () => {
  // Arrange
  const text = renderGroups(groupRated([item('clarity', 'yellow'), item('consistency', 'red', 'ac-7', 'AC-07')]));

  // Act
  const parsed = parseRework(text.split('\n'));

  // Assert
  assert.deepEqual(parsed.map((group) => [group.severity, group.location, group.reviewers]), [['🔴', 'AC-07', ['consistency']], ['🟡', 'AC-04', ['clarity']]]);
});

test('renderGroups_LabelWithLineBreak_HeadingStaysOneLine', () => {
  // Arrange
  const text = renderGroups(groupRated([item('clarity', 'yellow', 'x ### 🔴 y', 'X\n### 🔴 Y')]));

  // Act
  const parsed = parseRework(text.split('\n'));

  // Assert
  assert.deepEqual(parsed.map((group) => group.location), ['X ### 🔴 Y']);
});

test('renderTable_Group_ShowsCategoryColumn', () => {
  // Act
  const table = renderTable(groupRated([item('clarity', 'red')]));

  // Assert
  assert.equal(table.split('\n')[2], '| 🔴 | AC-04 | widerspruch | clarity | 🔴 Folge |');
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-groups.test.js` — erwartet: FAIL `Cannot find module '../scripts/lib/groups'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/groups.js`:
```javascript
'use strict';

// Icons, Rangfolge, Zellen und Gruppenformat teilt der Review-Ablauf mit aggregate-findings.js, das followup.js liest.
const {
  SEVERITY_RANK: RANK, SEVERITY_ICON: ICON, REWORK_MARK, cell, reworkHeading, reworkLine,
} = require('../aggregate-findings');
const { collapse } = require('./places');

function byRank(a, b) {
  return RANK[b.color] - RANK[a.color];
}

function withColor(group) {
  const color = [...group.items].sort(byRank)[0].color;
  const reviewers = [...new Set(group.items.map((item) => item.reviewer))];
  return { ...group, color, reviewers };
}

function byColorThenKey(a, b) {
  return byRank(a, b) || a.key.localeCompare(b.key);
}

// Findings je Stelle; die Gruppe trägt die höchste Farbe ihrer Findings. Item: { reviewer, category, color, place, finding }.
function groupRated(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.place.key)) groups.set(item.place.key, { key: item.place.key, label: item.place.label, items: [] });
    groups.get(item.place.key).items.push(item);
  }
  return [...groups.values()].map(withColor).sort(byColorThenKey);
}

function countColors(groups) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.color] += 1;
  return counts;
}

function itemLine(item) {
  return reworkLine(item.reviewer, item.category, item.finding);
}

// Die Stelle steht auf einer Zeile, sonst läse followup.js parseRework falsche oder zusätzliche Gruppen.
function groupHeading(group) {
  return reworkHeading(ICON[group.color], collapse(group.label), group.reviewers);
}

function renderGroup(group) {
  return [groupHeading(group), ...group.items.map(itemLine)].join('\n');
}

// Gruppen im Aggregat-Format, das Scout, Nacharbeit und followup.js lesen.
function renderGroups(groups) {
  return [REWORK_MARK, ...groups.map(renderGroup)].join('\n\n');
}

function consequences(group) {
  return [...group.items].sort(byRank).map((item) => `${ICON[item.color]} ${cell(item.finding.consequence)}`).join('<br>');
}

function renderTable(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) => {
    const categories = [...new Set(group.items.map((item) => item.category))].join(', ');
    return `| ${ICON[group.color]} | ${cell(group.label)} | ${categories} | ${group.reviewers.join(', ')} | ${consequences(group)} |`;
  });
  return ['| Stufe | Stelle | Kategorie | Reviewer | Konsequenzen |', '|---|---|---|---|---|', ...rows].join('\n');
}

module.exports = { ICON, REWORK_MARK, groupRated, countColors, cell, renderGroup, renderGroups, renderTable };
```
  In `plugins/forge/scripts/aggregate-findings.js`:
  - Direkt nach der Zeile `const CLOSING_QUOTE = String.fromCharCode(0x201c);` fügst du ein:
  ```javascript
  const REWORK_MARK = '=== REWORK ===';
  ```
  - `formatReworkGroup` ersetzt du ganz durch:
  ```javascript
  function reworkHeading(icon, location, reviewers) {
    return `### ${icon} ${location} (${reviewers.join(', ')})`;
  }

  function reworkLine(reviewer, tag, finding) {
    const quote = `${String.fromCharCode(0x201e)}${cell(finding.quote)}${CLOSING_QUOTE}`;
    return `- [${reviewer} · ${tag}] Zitat: ${quote} · Konsequenz: ${cell(finding.consequence)} · Begründung: ${cell(finding.rationale)}`;
  }

  function formatReworkGroup(group) {
    const lines = group.items.map((item) => reworkLine(item.reviewer, item.severity, item));
    return [reworkHeading(SEVERITY_ICON[group.severity], group.location, group.reviewers), ...lines].join('\n');
  }
  ```
  - In `render` wird die Zeile `    '=== REWORK ===',` zu `    REWORK_MARK,`.
  - Im `module.exports` wird die Zeile `  SEVERITY_RANK, LOCATION_TYPES, fileLocationType, normalizeLocation, extractReviews, readReviewDir, aggregate, summarize, run, runDir, render,` zu:
  ```javascript
    SEVERITY_RANK, LOCATION_TYPES, fileLocationType, normalizeLocation, extractReviews, readReviewDir, aggregate, summarize, run, runDir, render,
    SEVERITY_ICON, REWORK_MARK, cell, reworkHeading, reworkLine,
  ```
  In `plugins/forge/scripts/followup.js` ersetzt du im `module.exports` die Zeile
  ```javascript
    FollowupError, ROLES, ART_OF_ROLE, followupDir, save, drop, latest, loadGroups, rolesFor, slugFor, resolveFollowup,
  ```
  durch
  ```javascript
    FollowupError, ROLES, ART_OF_ROLE, followupDir, save, drop, latest, loadGroups, rolesFor, slugFor, resolveFollowup, parseScout, parseRework,
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-groups.test.js plugins/forge/tests/followup.test.js plugins/forge/tests/aggregate-rate.test.js plugins/forge/tests/aggregate-file.test.js plugins/forge/tests/aggregate-parse.test.js` — erwartet: PASS (die Aggregat-Tests belegen, dass die Ausgabe von `aggregate-findings.js` gleich bleibt)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/groups.js plugins/forge/scripts/aggregate-findings.js plugins/forge/scripts/followup.js plugins/forge/tests/review-groups.test.js` · `git commit -m "feat(forge): group rated findings per place with highest color"`

---

### Task 5: Offene Fragen und Bündelung

**ACs:** AC-15, AC-16, AC-48, AC-56

**Dateien:**
- Create: `plugins/forge/scripts/lib/questions.js`
- Test: `plugins/forge/tests/review-questions.test.js`

**Interfaces:**
- Consumes: `placeKey`, `decisionLines` aus `plugins/forge/scripts/lib/places.js` (Task 2); `SPEC` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2).
- Produces: in `plugins/forge/scripts/lib/questions.js`:
  - `titleNamesPlace(title: string, place: string): boolean`
  - `openQuestions(text: string): Array<{ id: 'R<n>', place: string, key: string, question: string }>`
  - `documentQuestions(options: { review }, text: string)` — im Spec-Review `openQuestions(text)`, im Plan-Review `[]` (R-Einträge `frage an den menschen` früherer Läufe sind dort Spec-Rückfragen und werden nicht ausgewertet). Runde 1 und die Eingabe der Nacharbeit (Task 7) importieren sie von hier.
  - `wEntryLines(text: string): string[]` — alle Zeilen `- **W · …` unter Entscheidungen.
  - `nextEntryNumber(text: string): number` — höchste R-Nummer unter Entscheidungen plus 1, ohne R-Eintrag 1.
  - `bundleShapeProblem(bundle: object, index: number): string | null` — Pflicht: `rule`, `question`, `recommendation` (Text), `places`, `cases` (nicht leere Textlisten).
  - `bundleProblem(bundles, questionKeys: string[]): string | null` — `Stelle fehlt in den Fragen: …` bzw. `Stelle doppelt in den Fragen: …`.
  - `renderQuestions(bundles): string` — `### Fragen an den Menschen`, je Frage `**Frage <i> — <rule>**`, Frage, `Stellen: …`, `Unterfälle: …`, `Empfehlung: …`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-questions.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { titleNamesPlace, openQuestions, documentQuestions, nextEntryNumber, bundleShapeProblem, bundleProblem, renderQuestions } = require('../scripts/lib/questions');
const { SPEC } = require('./lib/review-flow-fixture');

const QUESTION = '- **R2 · AC-04** — frage an den menschen — Gilt F auch bei leerem D?';

function specWith(...entries) {
  return SPEC.replace('- **W · Deckel**', [...entries, '- **W · Deckel**'].join('\n'));
}

function bundle(overrides = {}) {
  return { rule: 'Leere Eingabe', question: 'Was gilt?', places: ['AC-04'], cases: ['a) leer', 'b) Leerzeichen'], recommendation: 'a', ...overrides };
}

test('openQuestions_REntryWithoutWEntry_IsOpen', () => {
  // Act
  const open = openQuestions(specWith(QUESTION));

  // Assert
  assert.deepEqual(open, [{ id: 'R2', place: 'AC-04', key: 'ac-4', question: 'Gilt F auch bei leerem D?' }]);
});

test('openQuestions_WEntryNamesPlaceAndREntry_IsAnswered', () => {
  // Act
  const open = openQuestions(specWith(QUESTION, '- **W · AC-04** · Aussage — Antwort auf „R2 · AC-04“: ja.'));

  // Assert
  assert.deepEqual(open, []);
});

test('openQuestions_WEntryWithPlaceButWithoutREntry_StaysOpen', () => {
  // Arrange
  const text = specWith('- **R1 · Nachforderung** — frage an den menschen — Was gilt?', '- **W · Nachforderung** · Aussage — Eine Nachforderung.');

  // Act
  const open = openQuestions(text);

  // Assert
  assert.deepEqual(open.map((question) => question.place), ['Nachforderung']);
});

test('openQuestions_WEntryWithAsciiQuotes_IsAnswered', () => {
  // Act
  const open = openQuestions(specWith(QUESTION, '- **W · AC-04** · Aussage — Antwort auf "R2 · AC-04": ja.'));

  // Assert
  assert.deepEqual(open, []);
});

test('openQuestions_WEntryNamesTwoPlaces_AnswersBoth', () => {
  // Arrange
  const text = specWith(QUESTION, '- **R2 · AC-07** — frage an den menschen — Und I?', '- **W · AC-04 und AC-07** · Aussage — Antwort auf „R2 · AC-04“ und „R2 · AC-07“.');

  // Act
  const open = openQuestions(text);

  // Assert
  assert.deepEqual(open, []);
});

test('documentQuestions_SpecAndPlanReview_OnlySpecReviewCountsQuestions', () => {
  // Arrange
  const text = specWith(QUESTION);

  // Act
  const counts = [documentQuestions({ review: 'spec-review' }, text).length, documentQuestions({ review: 'plan-review' }, text).length];

  // Assert
  assert.deepEqual(counts, [1, 0]);
});

test('titleNamesPlace_LongerIdOrSuffix_DoesNotMatch', () => {
  // Act
  const matches = [titleNamesPlace('AC-041', 'AC-04'), titleNamesPlace('AC-04-b', 'AC-04'), titleNamesPlace('AC-04, AC-07', 'AC-04')];

  // Assert
  assert.deepEqual(matches, [false, false, true]);
});

test('nextEntryNumber_HighestR2_ReturnsThree', () => {
  // Act
  const next = nextEntryNumber(specWith(QUESTION, '- **R1 · AC-07** — geändert — x'));

  // Assert
  assert.equal(next, 3);
});

test('bundleProblem_OneOfThreePlacesMissing_NamesIt', () => {
  // Act
  const problem = bundleProblem([bundle({ places: ['AC-01', 'AC-04'] })], ['ac-1', 'ac-4', 'ac-7']);

  // Assert
  assert.equal(problem, 'Stelle fehlt in den Fragen: ac-7');
});

test('bundleProblem_PlaceInTwoQuestions_NamesIt', () => {
  // Act
  const problem = bundleProblem([bundle(), bundle({ rule: 'Andere' })], ['ac-4']);

  // Assert
  assert.equal(problem, 'Stelle doppelt in den Fragen: ac-4');
});

test('bundleShapeProblem_NoCases_IsInvalid', () => {
  // Act
  const problem = bundleShapeProblem(bundle({ cases: [] }), 0);

  // Assert
  assert.equal(problem, 'Frage 1: cases fehlt');
});

test('renderQuestions_Bundle_ShowsPlacesCasesAndRecommendation', () => {
  // Act
  const text = renderQuestions([bundle({ places: ['AC-04', 'AC-07'] })]);

  // Assert
  assert.equal(text, [
    '### Fragen an den Menschen', '',
    '**Frage 1 — Leere Eingabe**', 'Was gilt?', 'Stellen: AC-04, AC-07', 'Unterfälle: a) leer b) Leerzeichen', 'Empfehlung: a',
  ].join('\n'));
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-questions.test.js` — erwartet: FAIL `Cannot find module '../scripts/lib/questions'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/questions.js`:
```javascript
'use strict';

const { placeKey, decisionLines } = require('./places');

const R_QUESTION = /^- \*\*(R\d+) · (.+?)\*\* — frage an den menschen — (.*)$/;
const W_ENTRY = /^- \*\*W · (.+?)\*\*(.*)$/;
const R_NUMBER = /^- \*\*R(\d+) · /;
const PLACE_EDGE = '[\\p{L}\\p{N}_-]';
const TEXT_FIELDS = ['rule', 'question', 'recommendation'];

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleNamesPlace(title, place) {
  return new RegExp(`(?<!${PLACE_EDGE})${escapeRegex(place)}(?!${PLACE_EDGE})`, 'u').test(title);
}

// Schreibwerkzeuge machen aus „…“ gern "…" oder „…”; jede dieser Formen nennt den R-Eintrag.
function textNamesEntry(text, id, place) {
  return new RegExp(`["„]${escapeRegex(`${id} · ${place}`)}["“”]`, 'u').test(text);
}

function wEntries(lines) {
  return lines.map((line) => W_ENTRY.exec(line)).filter(Boolean).map(([, title, text]) => ({ title, text }));
}

function isAnswered(question, entries) {
  return entries.some((entry) => titleNamesPlace(entry.title, question.place) && textNamesEntry(entry.text, question.id, question.place));
}

function openQuestions(text) {
  const lines = decisionLines(text);
  const entries = wEntries(lines);
  return lines.map((line) => R_QUESTION.exec(line)).filter(Boolean)
    .map(([, id, place, question]) => ({ id, place, key: placeKey(place), question }))
    .filter((question) => !isAnswered(question, entries));
}

// Offene Fragen aus dem Dokument zählen nur im Spec-Review; Spec-Rückfragen früherer Läufe wertet das Plan-Review nicht aus.
function documentQuestions(options, text) {
  return options.review === 'spec-review' ? openQuestions(text) : [];
}

function wEntryLines(text) {
  return decisionLines(text).filter((line) => W_ENTRY.test(line));
}

function nextEntryNumber(text) {
  const numbers = decisionLines(text).map((line) => R_NUMBER.exec(line)).filter(Boolean).map((match) => Number(match[1]));
  return Math.max(0, ...numbers) + 1;
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isFilledList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isFilledText);
}

function bundleShapeProblem(bundle, index) {
  if (bundle === null || typeof bundle !== 'object') return `Frage ${index + 1} ist kein Objekt`;
  const missing = TEXT_FIELDS.find((field) => !isFilledText(bundle[field]));
  if (missing) return `Frage ${index + 1}: ${missing} fehlt`;
  if (!isFilledList(bundle.places)) return `Frage ${index + 1}: places fehlt`;
  if (!isFilledList(bundle.cases)) return `Frage ${index + 1}: cases fehlt`;
  return null;
}

// Jede Stelle mit Frage steht in genau einer gebündelten Frage.
function bundleProblem(bundles, questionKeys) {
  const named = bundles.flatMap((bundle) => bundle.places.map(placeKey));
  const count = (key) => named.filter((item) => item === key).length;
  const missing = questionKeys.filter((key) => count(key) === 0);
  if (missing.length > 0) return `Stelle fehlt in den Fragen: ${missing.join(', ')}`;
  const doubled = questionKeys.filter((key) => count(key) > 1);
  return doubled.length > 0 ? `Stelle doppelt in den Fragen: ${doubled.join(', ')}` : null;
}

function renderBundle(bundle, index) {
  return [
    `**Frage ${index + 1} — ${bundle.rule}**`,
    bundle.question,
    `Stellen: ${bundle.places.join(', ')}`,
    `Unterfälle: ${bundle.cases.join(' ')}`,
    `Empfehlung: ${bundle.recommendation}`,
  ].join('\n');
}

function renderQuestions(bundles) {
  return ['### Fragen an den Menschen', ...bundles.map(renderBundle)].join('\n\n');
}

module.exports = {
  titleNamesPlace, openQuestions, documentQuestions, wEntryLines, nextEntryNumber, bundleShapeProblem, bundleProblem, renderQuestions,
};
```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-questions.test.js` — erwartet: PASS (12 Tests)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/questions.js plugins/forge/tests/review-questions.test.js` · `git commit -m "feat(forge): read open questions and check their bundling"`

---

### Task 6: Nachforderung, Neustart, Ausfall

**ACs:** AC-29, AC-30, AC-46, AC-54

**Dateien:**
- Create: `plugins/forge/scripts/lib/flow-error.js`
- Create: `plugins/forge/scripts/lib/attempts.js`
- Test: `plugins/forge/tests/review-attempts.test.js`

**Interfaces:**
- Consumes: `tempDir(prefix)` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2).
- Produces: in `plugins/forge/scripts/lib/flow-error.js`: `class FlowError extends Error` — Fehler im Ablauf, den `review-flow.js` (Task 7) als `dv-forge review-flow: <grund>` mit Exit 1 meldet; `flow-files.js` (Task 7) re-exportiert die Klasse.
- Produces: in `plugins/forge/scripts/lib/attempts.js`:
  - `readAttempts(workspace: string): Record<string, number>` — Inhalt von `<workspace>/versuche.json`, ohne Datei `{}`; kaputtes JSON → `FlowError` mit `kein gültiges JSON: <datei>: <grund>`.
  - `isKind(kind: string): boolean` — `instanz` oder `buendelung`.
  - `nextAttempt(workspace: string, instance: string, kind = 'instanz'): 'NACHFORDERN'|'NEUSTART'|'AUSGEFALLEN'|'KORRIGIEREN'` — Folge `instanz`: `NACHFORDERN`, `NEUSTART`, `AUSGEFALLEN`; Folge `buendelung`: `KORRIGIEREN`, `AUSGEFALLEN`; Zähler in `<workspace>/versuche.json`.
  - `failedInstances(workspace: string): string[]` — Instanzen mit `AUSGEFALLEN`, jede einmal, in Reihenfolge des ersten Versuchs.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-attempts.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readAttempts, nextAttempt, failedInstances } = require('../scripts/lib/attempts');
const { FlowError } = require('../scripts/lib/flow-error');
const { tempDir } = require('./lib/review-flow-fixture');

test('nextAttempt_InstanceThreeTimes_RequestsRestartsThenFails', () => {
  // Arrange
  const workspace = tempDir();

  // Act
  const steps = [nextAttempt(workspace, 'clarity'), nextAttempt(workspace, 'clarity'), nextAttempt(workspace, 'clarity')];

  // Assert
  assert.deepEqual(steps, ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN']);
});

test('nextAttempt_BundlingTwice_CorrectsThenFailsRework', () => {
  // Arrange
  const workspace = tempDir();
  nextAttempt(workspace, 'nacharbeit', 'buendelung');

  // Act
  const step = nextAttempt(workspace, 'nacharbeit', 'buendelung');

  // Assert
  assert.equal(step, 'AUSGEFALLEN');
  assert.deepEqual(failedInstances(workspace), ['nacharbeit']);
});

test('nextAttempt_ReworkBeforeAndAfterPause_SharesOneCounter', () => {
  // Arrange
  const workspace = tempDir();
  nextAttempt(workspace, 'nacharbeit');
  nextAttempt(workspace, 'nacharbeit');

  // Act
  const step = nextAttempt(workspace, 'nacharbeit');

  // Assert
  assert.equal(step, 'AUSGEFALLEN');
});

test('failedInstances_OnlyRequested_ListsNothing', () => {
  // Arrange
  const workspace = tempDir();
  nextAttempt(workspace, 'nachprüfer');

  // Act
  const failed = failedInstances(workspace);

  // Assert
  assert.deepEqual(failed, []);
});

test('readAttempts_BrokenJson_FlowError', () => {
  // Arrange
  const workspace = tempDir();
  fs.writeFileSync(path.join(workspace, 'versuche.json'), '{"instanz:clarity": 1');

  // Act
  const read = () => readAttempts(workspace);

  // Assert
  assert.throws(read, (error) => error instanceof FlowError && /^kein gültiges JSON: .*versuche\.json: /.test(error.message));
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-attempts.test.js` — erwartet: FAIL `Cannot find module '../scripts/lib/attempts'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/flow-error.js`:
```javascript
'use strict';

// Fehler im Ablauf; review-flow.js meldet ihn als `dv-forge review-flow: <grund>` mit Exit 1.
class FlowError extends Error {}

module.exports = { FlowError };
```
  `plugins/forge/scripts/lib/attempts.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { FlowError } = require('./flow-error');

const FILE = 'versuche.json';
const SEQUENCES = {
  instanz: ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'],
  buendelung: ['KORRIGIEREN', 'AUSGEFALLEN'],
};

function isKind(kind) {
  return Object.hasOwn(SEQUENCES, kind);
}

// Ein beschädigter Zähler bricht kontrolliert ab: Er ist der einzige Schutz gegen endlose Nachforderungen.
function readAttempts(workspace) {
  const file = path.join(workspace, FILE);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
  }
}

// Nächster Schritt für eine Instanz ohne gültiges Ergebnis; der Zähler liegt im Arbeitsbereich und überdauert das Anhalten.
function nextAttempt(workspace, instance, kind = 'instanz') {
  const sequence = SEQUENCES[kind];
  const attempts = readAttempts(workspace);
  const id = `${kind}:${instance}`;
  const used = Math.min((attempts[id] ?? 0) + 1, sequence.length);
  fs.writeFileSync(path.join(workspace, FILE), `${JSON.stringify({ ...attempts, [id]: used })}\n`);
  return sequence[used - 1];
}

function failedInstances(workspace) {
  const failed = Object.entries(readAttempts(workspace))
    .filter(([id, used]) => SEQUENCES[id.split(':')[0]].length === used)
    .map(([id]) => id.slice(id.indexOf(':') + 1));
  return [...new Set(failed)];
}

module.exports = { readAttempts, isKind, nextAttempt, failedInstances };
```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-attempts.test.js` — erwartet: PASS (5 Tests)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-error.js plugins/forge/scripts/lib/attempts.js plugins/forge/tests/review-attempts.test.js` · `git commit -m "feat(forge): count retry, restart and failure per review instance"`

---

### Task 7: Runde 1 und das CLI `review-flow.js`

**ACs:** AC-04, AC-10, AC-11, AC-12, AC-13, AC-20, AC-37, AC-40, AC-53, AC-55

**Dateien:**
- Create: `plugins/forge/scripts/lib/flow-files.js` (importiert `FlowError` aus `plugins/forge/scripts/lib/flow-error.js`, Task 6)
- Create: `plugins/forge/scripts/lib/rated-items.js`
- Create: `plugins/forge/scripts/lib/round-one.js`
- Create: `plugins/forge/scripts/lib/rework-input.js`
- Create: `plugins/forge/scripts/lib/scout-check.js`
- Create: `plugins/forge/scripts/review-flow.js`
- Test: `plugins/forge/tests/review-flow-round-one.test.js`

**Interfaces:**
- Consumes: `parsePlaces`, `resolvePlace` (Task 2); `resultProblem`, `rateFinding`, `isReview` (Task 3); `groupRated`, `countColors`, `renderGroups`, `renderGroup`, `renderTable`, `REWORK_MARK` (Task 4); `parseScout`, `parseRework` aus `followup.js` (Task 4); `documentQuestions`, `wEntryLines`, `nextEntryNumber` (Task 5); `isKind`, `nextAttempt`, `FlowError` aus `plugins/forge/scripts/lib/flow-error.js` (Task 6); Test-Hilfe aus Task 2.
- Produces: diese Module, Dateien und Schritte:
  - `plugins/forge/scripts/lib/flow-files.js`: `ROUND_ONE = 'runde-1'`, `ROUND_TWO = 'runde-2'`, `FOLLOWUP = 'nacharbeit'`, `CLOSING = 'abschluss'`, `FlowError` (Re-Export aus `flow-error.js`, Task 6), `readText(file)` (wirft `FlowError`, LF), `readLines(file)` (fehlende Datei → `[]`), `readJson(file, fallback?)` (kein JSON → `FlowError`), `readAgentJson(file): { value, problem }`, `writeText(file, text)`, `writeJson(file, value)`.
  - `plugins/forge/scripts/lib/rated-items.js`: `SCRIPT_CATEGORY = 'skript-prüfung'`, `rateReviewer(name, findings, places, context): Item[]`, `scriptItems(dir, places): Item[]` (liest `<dir>/skript-pruefung.json` `{ findings: [{ location, quote, consequence, rationale }] }`, immer `color: 'red'`, `script: true`; andere Form → `FlowError`), `droppedList(items): Array<{ reviewer, location, reason }>`. `Item = { reviewer, category, color, dropped, place: { key, label }, finding, script? }`.
  - `plugins/forge/scripts/lib/round-one.js`: `rateRoundOne({ review, workspace, doc, spec, expected: string[], advisory: string[] }): string` — nur die Einstufung von Runde 1; welche offenen Fragen zählen, entscheidet `documentQuestions` aus `questions.js` (Task 5).
  - `plugins/forge/scripts/lib/rework-input.js`: alles, was die Nacharbeit vorbereitet: `snapshot(workspace, doc): string` (`EINTRAG R<n>`, schreibt `<workspace>/vorher.md`), `writeReworkInput({ review, workspace, doc }): string`.
  - Dateien in `<W>/runde-1/`: `einstufung.json` `{ groups, dropped, failed: [{ name, problem }], questions }`, `aggregate.md` (Tabelle und Gruppen), `scout-eingabe.md` (Gruppen für den Scout), `nacharbeit-eingabe.md` (nur 🔴-Gruppen mit `Scout-Vorschläge:` und `## Offene Fragen`).
  - `plugins/forge/scripts/lib/scout-check.js`: `checkScout(dir): 'SCOUT ok' | 'SCOUT ungültig: <grund>'`.
  - `plugins/forge/scripts/review-flow.js`: `run(args: string[]): string`, `class UsageError`; Schritte `rate`, `attempt`, `scout-check`, `snapshot`, `rework-input`; Ausgabe von `rate`: `STATUS red=<n> yellow=<n> green=<n> fragen=<n> failed=<liste|->`, je ungültigem Reviewer `FEHLT <name> — <grund>`, ohne Ausfall `WEITER scout=<rot-und-gelb|hinweise|keiner> nacharbeit=<ja|nein>`. Exit 2 bei falschem Aufruf, auch bei einem Namen in `--expect`, `--beratend` oder `--instanz`, der nicht nur aus Kleinbuchstaben, Ziffern und einzelnen `-` besteht (kein `.`, kein Pfadtrenner). Exit 1 bei `FlowError` mit `dv-forge review-flow: <grund>` auf stderr.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-flow-round-one.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SPEC, finding, setup, writeJsonFile, writeReviewer, flow, rate, readJsonFile } = require('./lib/review-flow-fixture');

const SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', '1. D festlegen.', '2. E streichen.', '**Bevorzugt: 1** — passt zum Bestand.', '',
  '### 🟡 AC-07', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
].join('\n');

test('rate_TwoHintsNoRedNoQuestion_ScoutForHintsWithoutRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' }), finding({ location: 'AC-07' })]);

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.stdout, 'STATUS red=0 yellow=2 green=0 fragen=0 failed=-\nWEITER scout=hinweise nacharbeit=nein\n');
});

test('rate_RedFinding_ScoutForRedAndYellowThenRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' })]);

  // Act
  const result = rate(env, 'consistency');

  // Assert
  assert.equal(result.stdout.split('\n')[1], 'WEITER scout=rot-und-gelb nacharbeit=ja');
  assert.match(fs.readFileSync(path.join(env.workspace, 'runde-1', 'scout-eingabe.md'), 'utf8'), /### 🔴 AC-04[\s\S]*### 🟡 AC-07/);
});

test('rate_UnknownCategory_ReviewerFailsWithReason', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ category: 'ac-fehlt-im-plan' })]);

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.stdout, 'STATUS red=0 yellow=0 green=0 fragen=0 failed=clarity\nFEHLT clarity — Ergebnis ungültig: Kategorie unbekannt: ac-fehlt-im-plan (AC-01)\n');
});

test('rate_MissingResultFile_ReviewerFails', () => {
  // Arrange
  const env = setup();

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.match(result.stdout, /^FEHLT clarity — Ergebnis ungültig: Ergebnisdatei fehlt$/m);
});

test('rate_FindingAtBasisHeader_NeitherInReportNorInRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'Basis', quote: 'Basis: abc1234', category: 'widerspruch' })]);

  // Act
  rate(env, 'consistency');

  // Assert
  const aggregate = fs.readFileSync(path.join(env.workspace, 'runde-1', 'aggregate.md'), 'utf8');
  assert.equal(aggregate, 'Keine Findings.\n\n=== REWORK ===\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-1', 'einstufung.json')).dropped, [{ reviewer: 'consistency', location: 'Basis', reason: 'Kopfzeile' }]);
});

test('rate_RedAtPlaceWithOpenQuestion_DroppedAndQuestionCounted', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Gilt F?\n- **W · Deckel**'));
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Act
  const result = rate(env, 'consistency');

  // Assert
  assert.equal(result.stdout, 'STATUS red=0 yellow=0 green=0 fragen=1 failed=-\nWEITER scout=keiner nacharbeit=ja\n');
});

test('rate_ScriptFindingAtPlaceWithOpenQuestion_StaysRed', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Gilt F?\n- **W · Deckel**'));
  writeReviewer(env, 'consistency', []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ location: 'AC-04', quote: 'x', consequence: 'doppelte ID', rationale: 'Skript' }] });

  // Act
  const result = rate(env, 'consistency');

  // Assert
  assert.equal(result.stdout.split('\n')[0], 'STATUS red=1 yellow=0 green=0 fragen=1 failed=-');
});

test('rate_AdvisoryReviewer_ContradictionIsYellow', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'profiles', [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Act
  const result = rate(env, 'profiles', ['--beratend', 'profiles']);

  // Assert
  assert.equal(result.stdout.split('\n')[0], 'STATUS red=0 yellow=1 green=0 fragen=0 failed=-');
});

test('rate_SameResultsTwice_SameFilesAndOutput', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'Basis' }), finding({ location: 'AC-07', category: 'formulierung' })]);
  const first = rate(env, 'clarity').stdout;
  const firstFile = fs.readFileSync(path.join(env.workspace, 'runde-1', 'einstufung.json'), 'utf8');

  // Act
  const second = rate(env, 'clarity').stdout;

  // Assert
  assert.equal(second, first);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'runde-1', 'einstufung.json'), 'utf8'), firstFile);
});

test('reworkInput_RedAndYellowPlace_OnlyRedWithScoutProposals', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' }), finding({ location: 'AC-01', category: 'formulierung' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT);

  // Act
  const result = flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'NACHARBEIT stellen=1 fragen=0\nEINTRAG R1\n');
  const input = fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8');
  assert.match(input, /### 🔴 AC-04 \(consistency\)\n- \[consistency · widerspruch\][^\n]*\nScout-Vorschläge:\n1\. D festlegen\.\n2\. E streichen\.\n\*\*Bevorzugt: 1\*\*/);
  assert.doesNotMatch(input, /AC-07|AC-01/);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'vorher.md'), 'utf8'), SPEC);
});

test('reworkInput_OpenQuestionWithoutRed_ListsQuestionOnly', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R2 · AC-04** — frage an den menschen — Gilt F?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', []);
  rate(env, 'clarity');

  // Act
  const result = flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'NACHARBEIT stellen=0 fragen=1\nEINTRAG R3\n');
  assert.match(fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8'), /Keine 🔴-Stellen\.\n\n## Offene Fragen\n- R2 · AC-04 — Gilt F\?/);
});

test('rate_PlanReviewWithQuestionEntryOfEarlierRun_FindingStaysAndNoQuestion', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Legt die Spec F fest?\n- **W · Deckel**'));
  writeReviewer(env, 'risks', [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Act
  const result = flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'risks');

  // Assert
  assert.equal(result.stdout.split('\n')[0], 'STATUS red=1 yellow=0 green=0 fragen=0 failed=-');
});

test('reworkInput_PlanReviewWithQuestionEntryOfEarlierRun_ListsNoQuestion', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Legt die Spec F fest?\n- **W · Deckel**'));
  writeReviewer(env, 'risks', []);
  flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'risks');

  // Act
  const result = flow('rework-input', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'NACHARBEIT stellen=0 fragen=0\nEINTRAG R2\n');
});

test('scoutCheck_OneToThreeProposalsOnePreferred_Ok', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT);

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ok\n');
});

test('scoutCheck_FourProposals_Invalid', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n3. c\n4. d\n**Bevorzugt: 1** — x\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ungültig: 🔴 AC-04: 4 Vorschläge statt 1 bis 3\n');
});

test('scoutCheck_HintOnlyScope_RedGroupNotExpected', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-01** — frage an den menschen — Gilt C?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', [finding({ location: 'AC-07' })]);
  rate(env, 'clarity');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 AC-07\n1. H schärfen.\n**Bevorzugt: 1** — eindeutig.\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ok\n');
});

test('snapshot_SpecWithoutDecisions_EntryStartsAtOne', () => {
  // Arrange
  const env = setup(SPEC.replace(/## Entscheidungen[\s\S]*$/, ''));

  // Act
  const result = flow('snapshot', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'EINTRAG R1\n');
});

test('attempt_Cli_PrintsNextStep', () => {
  // Arrange
  const env = setup();

  // Act
  const result = flow('attempt', '--dir', env.workspace, '--instanz', 'clarity');

  // Assert
  assert.equal(result.stdout, 'NACHFORDERN\n');
});

test('cli_UnknownStepOrReview_ExitsWithTwo', () => {
  // Arrange
  const env = setup();

  // Act
  const results = [flow('rounds'), flow('rate', '--review', 'implementation-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'a')];

  // Assert
  assert.deepEqual(results.map((result) => result.status), [2, 2]);
});

test('cli_NameWithPathParts_ExitsWithTwo', () => {
  // Arrange
  const env = setup();

  // Act
  const results = [rate(env, '../clarity'), rate(env, 'clarity', ['--beratend', 'a/b']), flow('attempt', '--dir', env.workspace, '--instanz', '..\\x')];

  // Assert
  assert.deepEqual(results.map((result) => result.status), [2, 2, 2]);
});

test('attempt_InstanceNameWithUmlaut_Accepted', () => {
  // Arrange
  const env = setup();

  // Act
  const result = flow('attempt', '--dir', env.workspace, '--instanz', 'nachprüfer');

  // Assert
  assert.equal(result.stdout, 'NACHFORDERN\n');
});

test('rate_ScriptCheckFileNoJson_ExitsWithOneAndReason', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), 'kein json');

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: kein gültiges JSON: /);
});

test('rate_ScriptFindingWithoutLocation_ExitsWithOneAndReason', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ quote: 'x', consequence: 'y', rationale: 'z' }] });

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: skript-pruefung\.json verletzt das Format/);
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round-one.test.js` — erwartet: FAIL `rate_TwoHintsNoRedNoQuestion_ScoutForHintsWithoutRework` (Skript `review-flow.js` fehlt, `stdout` ist leer)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/flow-files.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { FlowError } = require('./flow-error');

const ROUND_ONE = 'runde-1';
const ROUND_TWO = 'runde-2';
const FOLLOWUP = 'nacharbeit';
const CLOSING = 'abschluss';

function readText(file) {
  if (!fs.existsSync(file)) throw new FlowError(`Datei fehlt: ${file}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readLines(file) {
  return fs.existsSync(file) ? readText(file).split('\n') : [];
}

function parseJson(text, file) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
  }
}

// Vom Skript oder Orchestrator geschriebene Datei; kaputtes JSON bricht als FlowError mit Exit 1 ab.
function readJson(file, fallback) {
  if (!fs.existsSync(file) && fallback !== undefined) return fallback;
  return parseJson(readText(file), file);
}

// Ergebnis eines Agenten: fehlt die Datei oder ist sie kein JSON, steht der Grund in `problem`.
function readAgentJson(file) {
  if (!fs.existsSync(file)) return { value: null, problem: 'Ergebnisdatei fehlt' };
  try {
    return { value: JSON.parse(readText(file)), problem: null };
  } catch (error) {
    return { value: null, problem: `kein gültiges JSON: ${error.message}` };
  }
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

function writeJson(file, value) {
  writeText(file, JSON.stringify(value, null, 2));
}

module.exports = {
  ROUND_ONE, ROUND_TWO, FOLLOWUP, CLOSING, FlowError, readText, readLines, readJson, readAgentJson, writeText, writeJson,
};
```
  `plugins/forge/scripts/lib/rated-items.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePlace } = require('./places');
const { rateFinding } = require('./rules');
const { FlowError, readJson } = require('./flow-files');

const SCRIPT_FILE = 'skript-pruefung.json';
const SCRIPT_REVIEWER = 'skript';
const SCRIPT_CATEGORY = 'skript-prüfung';
const SCRIPT_FIELDS = ['location', 'quote', 'consequence', 'rationale'];

function placeOf(finding, places) {
  const place = resolvePlace(finding.location, finding.quote, places);
  return { key: place.key, label: place.label };
}

function rateReviewer(name, findings, places, context) {
  return findings.map((finding) => {
    const place = placeOf(finding, places);
    const rating = rateFinding(finding, place, { ...context, reviewer: name });
    return { reviewer: name, category: finding.category, color: rating.color, dropped: rating.dropped, place, finding };
  });
}

function isScriptFinding(finding) {
  return finding !== null && typeof finding === 'object'
    && SCRIPT_FIELDS.every((field) => typeof finding[field] === 'string')
    && finding.location.trim() !== '';
}

function scriptFindings(file) {
  const findings = readJson(file)?.findings;
  if (!Array.isArray(findings) || !findings.every(isScriptFinding)) {
    throw new FlowError(`${SCRIPT_FILE} verletzt das Format { findings: [{ location, quote, consequence, rationale }] }: ${file}`);
  }
  return findings;
}

// Befunde einer Skript-Prüfung sind immer 🔴 und entfallen nie.
function scriptItems(dir, places) {
  const file = path.join(dir, SCRIPT_FILE);
  if (!fs.existsSync(file)) return [];
  return scriptFindings(file).map((finding) => ({
    reviewer: SCRIPT_REVIEWER, category: SCRIPT_CATEGORY, color: 'red', dropped: null, script: true,
    place: placeOf(finding, places), finding,
  }));
}

function droppedList(items) {
  return items.filter((item) => item.dropped).map((item) => ({ reviewer: item.reviewer, location: item.finding.location, reason: item.dropped }));
}

module.exports = { SCRIPT_CATEGORY, rateReviewer, scriptItems, droppedList };
```
  `plugins/forge/scripts/lib/round-one.js`:
```javascript
'use strict';

const path = require('node:path');
const { parsePlaces } = require('./places');
const { resultProblem } = require('./rules');
const { documentQuestions, wEntryLines } = require('./questions');
const { groupRated, countColors, renderGroups, renderTable } = require('./groups');
const { rateReviewer, scriptItems, droppedList } = require('./rated-items');
const { ROUND_ONE, readText, readAgentJson, writeText, writeJson } = require('./flow-files');

function readReviewerResult(dir, name, review) {
  const { value, problem } = readAgentJson(path.join(dir, `${name}.json`));
  const invalid = problem ?? resultProblem(value, review, name);
  return invalid ? { name, problem: `Ergebnis ungültig: ${invalid}` } : { name, findings: value.findings };
}

function wEntriesOf(options) {
  const spec = options.spec ? wEntryLines(readText(options.spec)) : [];
  return [...wEntryLines(readText(options.doc)), ...spec];
}

function scoutScope(counts) {
  if (counts.red > 0) return 'rot-und-gelb';
  return counts.yellow > 0 ? 'hinweise' : 'keiner';
}

function scoutGroups(groups, scope) {
  if (scope === 'rot-und-gelb') return groups.filter((group) => group.color !== 'green');
  return groups.filter((group) => group.color === 'yellow');
}

function statusLines(counts, questions, failed) {
  const names = failed.map((entry) => entry.name).join(',') || '-';
  return [
    `STATUS red=${counts.red} yellow=${counts.yellow} green=${counts.green} fragen=${questions} failed=${names}`,
    ...failed.map((entry) => `FEHLT ${entry.name} — ${entry.problem}`),
  ];
}

function nextLine(counts, questions) {
  const rework = counts.red > 0 || questions > 0 ? 'ja' : 'nein';
  return `WEITER scout=${scoutScope(counts)} nacharbeit=${rework}`;
}

// Runde 1 einstufen: gültige Ergebnisse lesen, jedes Finding bewerten, je Stelle gruppieren, Dateien für Scout und Nacharbeit schreiben.
function rateRoundOne(options) {
  const dir = path.join(options.workspace, ROUND_ONE);
  const text = readText(options.doc);
  const places = parsePlaces(text);
  const questions = documentQuestions(options, text);
  const context = {
    review: options.review, advisory: new Set(options.advisory), wEntries: wEntriesOf(options),
    openKeys: new Set(questions.map((question) => question.key)), phase: 'suche', checklistKeys: new Set(), changedKeys: new Set(),
  };
  const results = options.expected.map((name) => readReviewerResult(dir, name, options.review));
  const failed = results.filter((result) => result.problem);
  const items = [
    ...results.filter((result) => result.findings).flatMap((result) => rateReviewer(result.name, result.findings, places, context)),
    ...scriptItems(dir, places),
  ];
  const groups = groupRated(items.filter((item) => !item.dropped));
  const counts = countColors(groups);
  writeJson(path.join(dir, 'einstufung.json'), { groups, dropped: droppedList(items), failed, questions });
  writeText(path.join(dir, 'aggregate.md'), `${renderTable(groups)}\n\n${renderGroups(groups)}`);
  writeText(path.join(dir, 'scout-eingabe.md'), renderGroups(scoutGroups(groups, scoutScope(counts))));
  const lines = statusLines(counts, questions.length, failed);
  return (failed.length > 0 ? lines : [...lines, nextLine(counts, questions.length)]).join('\n');
}

module.exports = { rateRoundOne };
```
  `plugins/forge/scripts/lib/rework-input.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { nextEntryNumber, documentQuestions } = require('./questions');
const { renderGroup, REWORK_MARK } = require('./groups');
const { parseScout } = require('../followup');
const { ROUND_ONE, readText, readLines, readJson, writeText } = require('./flow-files');

// Stand vor der Nacharbeit sichern und die Nummer ihrer R-Einträge vergeben.
function snapshot(workspace, doc) {
  const text = readText(doc);
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(workspace, 'vorher.md'), text);
  return `EINTRAG R${nextEntryNumber(text)}`;
}

function proposalsByGroup(file) {
  return new Map(parseScout(readLines(file)).map((group) => [`${group.severity} ${group.location}`, group]));
}

function proposalLines(group, proposals) {
  const scouted = proposals.get(`🔴 ${group.label}`);
  if (!scouted) return ['Scout-Vorschläge: keine'];
  return ['Scout-Vorschläge:', ...scouted.proposals.map((text, index) => `${index + 1}. ${text}`), `**Bevorzugt: ${scouted.preferred}**`];
}

function questionLines(questions) {
  if (questions.length === 0) return [];
  return ['', '## Offene Fragen', ...questions.map((question) => `- ${question.id} · ${question.place} — ${question.question}`)];
}

// Eingabe der Nacharbeit: nur die 🔴-Stellen mit Findings und Scout-Vorschlägen, dazu alle offenen Fragen des Dokuments.
function writeReworkInput(options) {
  const dir = path.join(options.workspace, ROUND_ONE);
  const reds = readJson(path.join(dir, 'einstufung.json')).groups.filter((group) => group.color === 'red');
  const proposals = proposalsByGroup(path.join(dir, 'scout.md'));
  const questions = documentQuestions(options, readText(options.doc));
  const blocks = reds.map((group) => [renderGroup(group), ...proposalLines(group, proposals)].join('\n'));
  const body = blocks.length > 0 ? blocks.join('\n\n') : 'Keine 🔴-Stellen.';
  writeText(path.join(dir, 'nacharbeit-eingabe.md'), [REWORK_MARK, '', body, ...questionLines(questions)].join('\n'));
  return [`NACHARBEIT stellen=${reds.length} fragen=${questions.length}`, snapshot(options.workspace, options.doc)].join('\n');
}

module.exports = { snapshot, writeReworkInput };
```
  `plugins/forge/scripts/lib/scout-check.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseRework, parseScout } = require('../followup');
const { readLines } = require('./flow-files');

function groupId(group) {
  return `${group.severity} ${group.location}`;
}

function groupProblem(group) {
  if (!group) return 'Gruppe fehlt';
  if (group.proposals.length < 1 || group.proposals.length > 3) return `${group.proposals.length} Vorschläge statt 1 bis 3`;
  return Number.isInteger(group.preferred) && group.preferred >= 1 && group.preferred <= group.proposals.length ? null : 'kein gültiger bevorzugter Vorschlag';
}

// Jede Gruppe der Scout-Eingabe hat ein bis drei Vorschläge, genau einer bevorzugt; andere Gruppen gibt es nicht.
function checkScout(dir) {
  const expected = parseRework(readLines(path.join(dir, 'scout-eingabe.md'))).map(groupId);
  const file = path.join(dir, 'scout.md');
  if (!fs.existsSync(file)) return 'SCOUT ungültig: Ergebnisdatei fehlt';
  const groups = new Map(parseScout(readLines(file)).map((group) => [groupId(group), group]));
  const wrong = expected.map((id) => [id, groupProblem(groups.get(id))]).find(([, problem]) => problem);
  if (wrong) return `SCOUT ungültig: ${wrong[0]}: ${wrong[1]}`;
  const extra = [...groups.keys()].filter((id) => !expected.includes(id));
  return extra.length > 0 ? `SCOUT ungültig: Gruppe nicht in der Eingabe: ${extra.join(', ')}` : 'SCOUT ok';
}

module.exports = { checkScout };
```
  `plugins/forge/scripts/review-flow.js`:
```javascript
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isReview } = require('./lib/rules');
const { isKind, nextAttempt } = require('./lib/attempts');
const { rateRoundOne } = require('./lib/round-one');
const { snapshot, writeReworkInput } = require('./lib/rework-input');
const { checkScout } = require('./lib/scout-check');
const { ROUND_ONE, FOLLOWUP, FlowError } = require('./lib/flow-files');

const USAGE = [
  'Aufruf: node review-flow.js rate --review <spec-review|plan-review> --dir <W> --doc <datei> [--spec <datei>] --expect <a,b> [--beratend <a,b>]',
  '       node review-flow.js attempt --dir <W> --instanz <name> [--art instanz|buendelung]',
  '       node review-flow.js scout-check --dir <runden-ordner>',
  '       node review-flow.js snapshot --dir <W> --doc <datei>',
  '       node review-flow.js rework-input --review <..> --dir <W> --doc <datei>',
  '',
].join('\n');
const VALUE_OPTIONS = ['--review', '--dir', '--doc', '--spec', '--expect', '--beratend', '--instanz', '--art', '--quelle', '--titel', '--artefakt'];
const SOURCES = [ROUND_ONE, FOLLOWUP];
// Namen werden Dateinamen im Arbeitsbereich: kein `.`, kein Pfadtrenner.
const INSTANCE_NAME = /^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$/u;

class UsageError extends Error {}

function parseOptions(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!VALUE_OPTIONS.includes(args[index]) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${args[index]}`);
    values[args[index].slice(2)] = args[index + 1];
  }
  return values;
}

function list(value) {
  return String(value ?? '').split(',').map((name) => name.trim()).filter(Boolean);
}

function required(values, name) {
  if (!values[name]) throw new UsageError(`--${name} fehlt`);
  return values[name];
}

function checkedName(name, option) {
  if (!INSTANCE_NAME.test(name)) throw new UsageError(`--${option}: ungültiger Name: ${name}`);
  return name;
}

function names(value, option) {
  return list(value).map((name) => checkedName(name, option));
}

function existing(file, label) {
  if (!fs.existsSync(file)) throw new FlowError(`${label} nicht gefunden: ${file}`);
  return path.resolve(file);
}

// Gemeinsame Optionen der Schritte, die ein Review und sein Dokument brauchen.
function flowOptions(values) {
  const review = required(values, 'review');
  if (!isReview(review)) throw new UsageError(`--review erlaubt: spec-review, plan-review; nicht ${review}`);
  const source = values.quelle ?? ROUND_ONE;
  if (!SOURCES.includes(source)) throw new UsageError(`--quelle erlaubt: ${SOURCES.join(', ')}`);
  return {
    review, source,
    workspace: path.resolve(required(values, 'dir')),
    doc: existing(required(values, 'doc'), 'Dokument'),
    spec: values.spec ? existing(values.spec, 'Spec') : null,
  };
}

function attempt(values) {
  const kind = values.art ?? 'instanz';
  if (!isKind(kind)) throw new UsageError(`--art erlaubt: instanz, buendelung; nicht ${kind}`);
  return nextAttempt(path.resolve(required(values, 'dir')), checkedName(required(values, 'instanz'), 'instanz'), kind);
}

const COMMANDS = {
  rate: (values) => rateRoundOne({ ...flowOptions(values), expected: names(required(values, 'expect'), 'expect'), advisory: names(values.beratend, 'beratend') }),
  attempt,
  'scout-check': (values) => checkScout(path.resolve(required(values, 'dir'))),
  snapshot: (values) => snapshot(path.resolve(required(values, 'dir')), existing(required(values, 'doc'), 'Dokument')),
  'rework-input': (values) => writeReworkInput(flowOptions(values)),
};

function run(args) {
  const [command, ...rest] = args;
  if (!Object.hasOwn(COMMANDS, command)) throw new UsageError(`Unbekannter Schritt: ${command ?? '-'}`);
  return COMMANDS[command](parseOptions(rest));
}

function main() {
  try {
    process.stdout.write(`${run(process.argv.slice(2))}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    if (!(error instanceof FlowError)) throw error;
    process.stderr.write(`dv-forge review-flow: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { run, UsageError };
```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round-one.test.js` — erwartet: PASS (23 Tests)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-files.js plugins/forge/scripts/lib/rated-items.js plugins/forge/scripts/lib/round-one.js plugins/forge/scripts/lib/rework-input.js plugins/forge/scripts/lib/scout-check.js plugins/forge/scripts/review-flow.js plugins/forge/tests/review-flow-round-one.test.js` · `git commit -m "feat(forge): rate round one of the review flow by script"`

---

### Task 8: Nacharbeit und Antworten prüfen

**ACs:** AC-15, AC-16, AC-19, AC-36, AC-41, AC-46

**Dateien:**
- Create: `plugins/forge/scripts/lib/rework-check.js`
- Modify: `plugins/forge/scripts/review-flow.js` · `const { snapshot, writeReworkInput } = require('./lib/rework-input');`
- Modify: `plugins/forge/scripts/review-flow.js` · `USAGE`
- Modify: `plugins/forge/scripts/review-flow.js` · `COMMANDS`
- Test: `plugins/forge/tests/review-flow-rework.test.js`

**Interfaces:**
- Consumes: `ROUND_ONE`, `readText`, `readLines`, `readJson`, `readAgentJson`, `writeText`, `writeJson` (Task 7); `placeKey` (Task 2); `openQuestions`, `bundleShapeProblem`, `bundleProblem`, `renderQuestions` (Task 5); `parseRework` (Task 4); `flowOptions(values)` in `review-flow.js` (Task 7); `finding`, `setup`, `writeJsonFile`, `flow`, `readJsonFile`, `addEntries`, `runUntilRework` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2).
- Produces: diese Module, Dateien und Schritte:
  - `plugins/forge/scripts/lib/rework-check.js`: `checkRework({ review, workspace, doc, source }): string` — `NACHARBEIT ungültig: <grund>`, `BUENDELUNG fehlerhaft: <grund>`, `NACHARBEIT ok fragen=<n> anhalten=nein` oder `NACHARBEIT ok fragen=<n> anhalten=ja`, gefolgt von `=== FRAGEN ===` und den gezeigten Fragen; schreibt `<W>/<source>/fragen.json` `[{ place, key, question }]` und bei `anhalten=ja` `fragen.md`. `checkAnswers({ workspace, doc }): string` — `ANTWORTEN ok beantwortet=<n> offen=<n>` oder `ANTWORTEN ungültig: <grund>`.
  - Ergebnis der Nacharbeit `<W>/<source>/rework.json`: `{ results: [{ location, status: 'changed'|'unchanged'|'human-question'|'spec-question', reason? }], questions?: [{ rule, question, places, cases, recommendation }] }`; `reason` Pflicht bei `unchanged`, `human-question`, `spec-question`.
  - Antworten `<W>/runde-1/antworten.json`: `{ results: [{ location, status: 'answered'|'open' }] }`.
  - `review-flow.js`: Schritte `rework-check` und `answers-check`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-flow-rework.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { finding, setup, writeJsonFile, flow, readJsonFile, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

function prepareRework(env, review = 'spec-review', findings = [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]) {
  runUntilRework(env, findings, review);
}

function writeRework(env, value, source = 'runde-1') {
  writeJsonFile(path.join(env.workspace, source, 'rework.json'), value);
}

function checkRework(env, review = 'spec-review', source = 'runde-1') {
  return flow('rework-check', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--quelle', source).stdout;
}

function bundle(places) {
  return { rule: 'Regel', question: 'Was gilt?', places, cases: ['a) x', 'b) y'], recommendation: 'a' };
}

test('reworkCheck_EveryRedPlaceOneOutcome_Ok', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_RedPlaceWithoutOutcome_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Ausgang fehlt: ac-7\n');
});

test('reworkCheck_UnchangedWithoutReason_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: reason fehlt (AC-07)\n');
});

test('reworkCheck_QuestionsBundled_PausesAndWritesQuestions', () => {
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
  assert.match(output, /^NACHARBEIT ok fragen=2 anhalten=ja\n=== FRAGEN ===\n### Fragen an den Menschen\n\n\*\*Frage 1 — Regel\*\*\nWas gilt\?\nStellen: AC-04, AC-07\nUnterfälle: a\) x b\) y\nEmpfehlung: a\n$/);
});

test('reworkCheck_OneOfThreeQuestionPlacesMissing_BundlingFaulty', () => {
  // Arrange
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-01', category: 'widerspruch' }), finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]);
  addEntries(env, '- **R1 · AC-01** — frage an den menschen — C?', '- **R1 · AC-04** — frage an den menschen — F?', '- **R1 · AC-07** — frage an den menschen — I?');
  const asked = ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question', reason: 'neu' }));
  writeRework(env, { results: asked, questions: [bundle(['AC-01', 'AC-04'])] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'BUENDELUNG fehlerhaft: Stelle fehlt in den Fragen: ac-7\n');
});

test('reworkCheck_QuestionWithoutREntry_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'human-question', reason: 'neu' }, { location: 'AC-07', status: 'changed' }], questions: [] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: R-Eintrag fehlt: AC-04\n');
});

test('reworkCheck_PlanSpecQuestion_CountsWithoutPause', () => {
  // Arrange
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'spec-question', reason: 'Spec legt X nicht fest' }] });

  // Act
  const output = checkRework(env, 'plan-review');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=1 anhalten=nein\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-1', 'fragen.json')), [{ place: 'Task 1', key: 'task 1', question: 'Spec legt X nicht fest' }]);
});

test('reworkCheck_FollowupSource_ExpectsChosenGroups', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: „x“\n');
  writeRework(env, { results: [{ location: 'AC-07', status: 'changed' }] }, 'nacharbeit');

  // Act
  const output = checkRework(env, 'spec-review', 'nacharbeit');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

function answersSetup() {
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-01', category: 'widerspruch' }), finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]);
  addEntries(env, '- **R1 · AC-01** — frage an den menschen — C?', '- **R1 · AC-04** — frage an den menschen — F?', '- **R1 · AC-07** — frage an den menschen — I?');
  const asked = ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question', reason: 'neu' }));
  writeRework(env, { results: asked, questions: [bundle(['AC-01', 'AC-04', 'AC-07'])] });
  checkRework(env);
  return env;
}

test('answersCheck_OneAnsweredOneUnclearOneLater_OneAnsweredTwoOpen', () => {
  // Arrange
  const env = answersSetup();
  addEntries(env, '- **W · AC-04** · Aussage — Antwort auf „R1 · AC-04“: F gilt immer.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-01', status: 'open' }, { location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }] });

  // Act
  const result = flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'ANTWORTEN ok beantwortet=1 offen=2\n');
});

test('answersCheck_AnsweredWithoutWEntry_Invalid', () => {
  // Arrange
  const env = answersSetup();
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-01', status: 'open' }, { location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }] });

  // Act
  const result = flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'ANTWORTEN ungültig: Antwort passt nicht zum Dokument: AC-04\n');
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-rework.test.js` — erwartet: FAIL `reworkCheck_EveryRedPlaceOneOutcome_Ok` (`Unbekannter Schritt: rework-check`)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/rework-check.js`:
```javascript
'use strict';

const path = require('node:path');
const { placeKey } = require('./places');
const { openQuestions, bundleShapeProblem, bundleProblem, renderQuestions } = require('./questions');
const { parseRework } = require('../followup');
const { ROUND_ONE, readText, readLines, readJson, readAgentJson, writeText, writeJson } = require('./flow-files');

const STATUSES = {
  'spec-review': ['changed', 'unchanged', 'human-question'],
  'plan-review': ['changed', 'unchanged', 'spec-question'],
};
const QUESTION_STATUS = { 'spec-review': 'human-question', 'plan-review': 'spec-question' };
const NEEDS_REASON = new Set(['unchanged', 'human-question', 'spec-question']);
const ANSWER_STATUSES = ['answered', 'open'];

function inputFile(workspace, source) {
  return path.join(workspace, source, source === ROUND_ONE ? 'nacharbeit-eingabe.md' : 'aggregate.md');
}

function expectedKeys(workspace, source) {
  return parseRework(readLines(inputFile(workspace, source))).map((group) => placeKey(group.location));
}

function entryProblem(entry, review) {
  if (entry === null || typeof entry !== 'object' || typeof entry.location !== 'string' || entry.location.trim() === '') return 'Eintrag ohne location';
  if (!STATUSES[review].includes(entry.status)) return `status unbekannt: ${entry.status} (${entry.location})`;
  if (NEEDS_REASON.has(entry.status) && !(typeof entry.reason === 'string' && entry.reason.trim() !== '')) return `reason fehlt (${entry.location})`;
  return null;
}

// Je erwarteter Stelle genau ein Ausgang.
function coverageProblem(results, keys, noun) {
  const named = results.map((entry) => placeKey(entry.location));
  const missing = keys.filter((key) => !named.includes(key));
  if (missing.length > 0) return `${noun} fehlt: ${missing.join(', ')}`;
  const doubled = keys.filter((key) => named.filter((item) => item === key).length > 1);
  return doubled.length > 0 ? `${noun} doppelt: ${doubled.join(', ')}` : null;
}

function resultsProblem(value, keys, review) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.results)) return 'results fehlt';
  return value.results.map((entry) => entryProblem(entry, review)).find(Boolean) ?? coverageProblem(value.results, keys, 'Ausgang');
}

// Fragen nach der Nacharbeit: in der Spec die offenen R-Einträge, im Plan die Spec-Rückfragen des Ergebnisses.
function questionsAfter(options, results) {
  const asked = results.filter((entry) => entry.status === QUESTION_STATUS[options.review]);
  if (options.review === 'plan-review') return asked.map((entry) => ({ place: entry.location, key: placeKey(entry.location), question: entry.reason }));
  return openQuestions(readText(options.doc));
}

function missingEntryProblem(options, results, questions) {
  if (options.review !== 'spec-review') return null;
  const open = questions.map((question) => question.key);
  const missing = results.filter((entry) => entry.status === 'human-question' && !open.includes(placeKey(entry.location)));
  return missing.length > 0 ? `R-Eintrag fehlt: ${missing.map((entry) => entry.location).join(', ')}` : null;
}

function mustBundle(options) {
  return options.review === 'spec-review' && options.source === ROUND_ONE;
}

function bundlesProblem(value) {
  if (!Array.isArray(value.questions)) return 'questions fehlt';
  return value.questions.map(bundleShapeProblem).find(Boolean) ?? null;
}

// Ergebnis der Nacharbeit prüfen; in Runde 1 eines Spec-Reviews auch die Bündelung der Fragen.
function checkRework(options) {
  const dir = path.join(options.workspace, options.source);
  const { value, problem } = readAgentJson(path.join(dir, 'rework.json'));
  const invalid = problem ?? resultsProblem(value, expectedKeys(options.workspace, options.source), options.review);
  if (invalid) return `NACHARBEIT ungültig: ${invalid}`;
  const questions = questionsAfter(options, value.results);
  const missing = missingEntryProblem(options, value.results, questions);
  if (missing) return `NACHARBEIT ungültig: ${missing}`;
  writeJson(path.join(dir, 'fragen.json'), questions);
  if (!mustBundle(options) || questions.length === 0) return `NACHARBEIT ok fragen=${questions.length} anhalten=nein`;
  const shape = bundlesProblem(value);
  if (shape) return `NACHARBEIT ungültig: ${shape}`;
  const bundling = bundleProblem(value.questions, questions.map((question) => question.key));
  if (bundling) return `BUENDELUNG fehlerhaft: ${bundling}`;
  const shown = renderQuestions(value.questions);
  writeText(path.join(dir, 'fragen.md'), shown);
  return [`NACHARBEIT ok fragen=${questions.length} anhalten=ja`, '=== FRAGEN ===', shown].join('\n');
}

function answersProblem(value, asked) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.results)) return 'results fehlt';
  const wrong = value.results.find((entry) => typeof entry?.location !== 'string' || !ANSWER_STATUSES.includes(entry.status));
  if (wrong) return `Eintrag ungültig: ${JSON.stringify(wrong)}`;
  return coverageProblem(value.results, asked.map((question) => question.key), 'Antwort');
}

function mismatchProblem(results, openKeys) {
  const wrong = results.filter((entry) => (entry.status === 'answered') === openKeys.has(placeKey(entry.location)));
  return wrong.length > 0 ? `Antwort passt nicht zum Dokument: ${wrong.map((entry) => entry.location).join(', ')}` : null;
}

// Nach der Antwort des Menschen: Das Dokument entscheidet, welche Fragen beantwortet sind.
function checkAnswers(options) {
  const dir = path.join(options.workspace, ROUND_ONE);
  const asked = readJson(path.join(dir, 'fragen.json'));
  const { value, problem } = readAgentJson(path.join(dir, 'antworten.json'));
  const openKeys = new Set(openQuestions(readText(options.doc)).map((question) => question.key));
  const invalid = problem ?? answersProblem(value, asked) ?? mismatchProblem(value.results, openKeys);
  if (invalid) return `ANTWORTEN ungültig: ${invalid}`;
  const answered = asked.filter((question) => !openKeys.has(question.key)).length;
  return `ANTWORTEN ok beantwortet=${answered} offen=${asked.length - answered}`;
}

module.exports = { checkRework, checkAnswers };
```
  In `plugins/forge/scripts/review-flow.js` fügst du direkt nach der Zeile `const { snapshot, writeReworkInput } = require('./lib/rework-input');` ein:
  ```javascript
  const { checkRework, checkAnswers } = require('./lib/rework-check');
  ```
  In `USAGE` fügst du direkt nach der Zeile mit `node review-flow.js rework-input` ein:
  ```javascript
    '       node review-flow.js rework-check --review <..> --dir <W> --doc <datei> [--quelle runde-1|nacharbeit]',
    '       node review-flow.js answers-check --review spec-review --dir <W> --doc <datei>',
  ```
  In `COMMANDS` fügst du direkt nach dem Eintrag `'rework-input': …` ein:
  ```javascript
    'rework-check': (values) => checkRework(flowOptions(values)),
    'answers-check': (values) => checkAnswers(flowOptions(values)),
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-rework.test.js plugins/forge/tests/review-flow-round-one.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/rework-check.js plugins/forge/scripts/review-flow.js plugins/forge/tests/review-flow-rework.test.js` · `git commit -m "feat(forge): check rework outcomes, question bundling and answers by script"`

---

### Task 9: Nachprüfung — Prüfliste, geänderte Bereiche, Urteile

**ACs:** AC-17, AC-21, AC-22, AC-23, AC-24, AC-25, AC-35, AC-42, AC-49, AC-50

**Dateien:**
- Create: `plugins/forge/scripts/lib/round-two.js`
- Modify: `plugins/forge/scripts/review-flow.js` · `const { checkRework, checkAnswers } = require('./lib/rework-check');`
- Modify: `plugins/forge/scripts/review-flow.js` · `USAGE`
- Modify: `plugins/forge/scripts/review-flow.js` · `COMMANDS`
- Test: `plugins/forge/tests/review-flow-round-two.test.js`

**Interfaces:**
- Consumes: `placeKey`, `parsePlaces`, `changedPlaces` (Task 2); `findingProblem` (Task 3); `groupRated`, `countColors`, `renderGroups` (Task 4); `openQuestions`, `wEntryLines` (Task 5); `rateReviewer`, `scriptItems`, `droppedList`, Datei-Hilfen (Task 7); `parseRework` (Task 4); `fragen.json` aus Task 8; `finding`, `setup`, `writeJsonFile`, `flow`, `readJsonFile`, `editDoc`, `addEntries`, `runUntilRework` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2).
- Produces: diese Module, Dateien und Schritte:
  - `plugins/forge/scripts/lib/round-two.js`: `buildChecklist({ review, workspace, doc, source }): string` — `PRUEFLISTE punkte=<ki> skript=<n> bereiche=<n>` und `NACHPRUEFER ja|nein`; schreibt `<W>/runde-2/pruefliste.json` `{ items: [{ key, label, source: 'ki'|'skript', lines }], changed: string[] }` und `pruefliste.md` (`# Prüfliste`, `## Punkte` mit `### <Stelle>`, `## Geänderte Bereiche`). `verifyRoundTwo({ review, workspace, doc, spec, source }): string` — `NACHPRUEFUNG ungültig: <grund>` oder `NACHPRUEFUNG ok offen=<k> hinweise=<n>` und `WEITER scout=hinweise|keiner`; schreibt `<W>/runde-2/einstufung.json` `{ verdicts, groups, dropped, openRed }` und `scout-eingabe.md`.
  - Ergebnis des Nachprüfers `<W>/runde-2/nachpruefung.json`: `{ verdicts: [{ location, verdict: 'erledigt'|'nicht erledigt', rationale }], findings: [<Finding mit category>] }`.
  - `review-flow.js`: Schritte `checklist` und `verify`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-flow-round-two.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { finding, setup, writeJsonFile, flow, readJsonFile, editDoc, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

const RED = (location) => finding({ location, quote: 'x', category: 'widerspruch' });

function finishRework(env, results, questions = []) {
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results, questions });
  return flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
}

function checklist(env) {
  return flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
}

function verify(env, verification) {
  if (verification) writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  return flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
}

function checklistItems(env) {
  return readJsonFile(path.join(env.workspace, 'runde-2', 'pruefliste.json')).items.map((item) => `${item.label}:${item.source}`);
}

test('checklist_ThreeRedPlacesWithoutQuestion_ExactlyTheseThree', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-01'), RED('AC-04'), RED('AC-07')]);
  editDoc(env, 'dann C.', 'dann C2.');
  finishRework(env, ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'changed' })));

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=3 skript=0 bereiche=1\nNACHPRUEFER ja\n');
  assert.deepEqual(checklistItems(env), ['AC-01:ki', 'AC-04:ki', 'AC-07:ki']);
});

test('checklist_AnsweredQuestion_PlaceOnChecklist', () => {
  // Arrange
  const env = setup();
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — F?');
  runUntilRework(env, []);
  finishRework(env, [], [{ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) ja'], recommendation: 'a' }]);
  addEntries(env, '- **W · AC-04** · Aussage — Antwort auf „R1 · AC-04“: ja.');

  // Act
  checklist(env);

  // Assert
  assert.deepEqual(checklistItems(env), ['AC-04:ki']);
});

test('checklist_RedWithAnsweredQuestion_PlaceOnceOnChecklist', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — F?');
  finishRework(env, [{ location: 'AC-04', status: 'human-question', reason: 'neu' }], [{ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) ja'], recommendation: 'a' }]);
  addEntries(env, '- **W · AC-04** · Aussage — Antwort auf „R1 · AC-04“: ja.');

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=1 skript=0 bereiche=0\nNACHPRUEFER ja\n');
  assert.deepEqual(checklistItems(env), ['AC-04:ki']);
});

test('checklist_QuestionAnsweredLater_NotOnChecklistAndNoVerifierWithoutChanges', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — F?');
  finishRework(env, [{ location: 'AC-04', status: 'human-question', reason: 'neu' }], [{ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) ja'], recommendation: 'a' }]);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=0 skript=0 bereiche=0\nNACHPRUEFER nein\n');
});

test('checklist_ReworkChangedOnlyDecisions_NoArea', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — nicht geändert — Fehllesung');
  finishRework(env, [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }]);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=1 skript=0 bereiche=0\nNACHPRUEFER ja\n');
});

test('checklist_ScriptFindingOfRoundOne_JudgedByScript', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ location: 'AC-07', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  finishRework(env, [{ location: 'AC-07', status: 'changed' }]);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=0 skript=1 bereiche=0\nNACHPRUEFER nein\n');
});

test('verify_ContradictionInSideChangedArea_StaysRed', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'Höchstens zwei Runden.', 'Höchstens drei Runden.');
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [finding({ location: 'Deckel', quote: 'Höchstens drei Runden.', category: 'widerspruch' })] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ok offen=1 hinweise=0\nWEITER scout=keiner\n');
});

test('verify_FindingOutsideChecklist_IsHintForScout', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  finishRework(env, [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [finding({ location: 'AC-07', category: 'fehlendes-verhalten' })] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ok offen=0 hinweise=1\nWEITER scout=hinweise\n');
  assert.match(fs.readFileSync(path.join(env.workspace, 'runde-2', 'scout-eingabe.md'), 'utf8'), /### 🟡 AC-07 \(nachprüfer\)/);
});

test('verify_ScriptReportsAgain_PointNotDoneAndRed', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ location: 'AC-07', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  finishRework(env, [{ location: 'AC-07', status: 'changed' }]);
  checklist(env);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'skript-pruefung.json'), { findings: [{ location: 'AC-07', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });

  // Act
  const output = verify(env);

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ok offen=1 hinweise=0\nWEITER scout=keiner\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-2', 'einstufung.json')).verdicts, [{ location: 'AC-07', source: 'skript', rationale: 'Skript-Prüfung', verdict: 'nicht erledigt' }]);
});

test('verify_MissingVerdict_Invalid', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04'), RED('AC-07')]);
  finishRework(env, [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ungültig: Urteil fehlt oder doppelt: AC-07\n');
});

test('verify_VerdictForPlaceNotOnChecklist_Invalid', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }, { location: 'AC-07', verdict: 'nicht erledigt', rationale: 'x' }], findings: [] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ungültig: Urteil ohne Punkt der Prüfliste: AC-07\n');
});

test('verify_FindingWithColor_Invalid', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [finding({ severity: 'red' })] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ungültig: Farbe im Finding: AC-01\n');
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round-two.test.js` — erwartet: FAIL `checklist_ThreeRedPlacesWithoutQuestion_ExactlyTheseThree` (`Unbekannter Schritt: checklist`)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/round-two.js`:
```javascript
'use strict';

const path = require('node:path');
const { placeKey, parsePlaces, changedPlaces } = require('./places');
const { findingProblem } = require('./rules');
const { openQuestions, wEntryLines } = require('./questions');
const { groupRated, countColors, renderGroups } = require('./groups');
const { rateReviewer, scriptItems, droppedList } = require('./rated-items');
const { parseRework } = require('../followup');
const { ROUND_ONE, ROUND_TWO, readText, readLines, readJson, readAgentJson, writeText, writeJson } = require('./flow-files');

const VERDICTS = ['erledigt', 'nicht erledigt'];
const VERIFIER = 'nachprüfer';

function sourceDir(options) {
  return path.join(options.workspace, options.source);
}

// Stellen mit offener Frage: in der Spec laut R- und W-Einträgen, im Plan die Spec-Rückfragen dieses Laufs.
function openKeysNow(options, text) {
  if (options.review === 'plan-review') return new Set(readJson(path.join(sourceDir(options), 'fragen.json'), []).map((question) => question.key));
  return new Set(openQuestions(text).map((question) => question.key));
}

function itemLines(items) {
  return items.map((item) => `- [${item.reviewer} · ${item.category}] ${item.finding.consequence}`);
}

function redItems(group) {
  const ai = group.items.filter((item) => !item.script);
  const script = group.items.filter((item) => item.script);
  return [
    ...(ai.length > 0 ? [{ key: group.key, label: group.label, source: 'ki', lines: itemLines(ai) }] : []),
    ...(script.length > 0 ? [{ key: group.key, label: group.label, source: 'skript', lines: itemLines(script) }] : []),
  ];
}

// Runde 1: die 🔴-Stellen; Folge-Modus: die gewählten Stellen.
function baseItems(options) {
  if (options.source === ROUND_ONE) {
    const { groups } = readJson(path.join(sourceDir(options), 'einstufung.json'));
    return groups.filter((group) => group.color === 'red').flatMap(redItems);
  }
  return parseRework(readLines(path.join(sourceDir(options), 'aggregate.md')))
    .map((group) => ({ key: placeKey(group.location), label: group.location, source: 'ki', lines: group.findings }));
}

function answeredItems(options, openKeys) {
  return readJson(path.join(sourceDir(options), 'fragen.json'), [])
    .filter((question) => !openKeys.has(question.key))
    .map((question) => ({ key: question.key, label: question.place, source: 'ki', lines: [`- Frage beantwortet: ${question.question}`] }));
}

function withoutDuplicates(items) {
  return items.filter((item, index) => items.findIndex((other) => other.key === item.key && other.source === item.source) === index);
}

function renderChecklist(aiItems, changed) {
  const points = aiItems.length > 0 ? aiItems.map((item) => [`### ${item.label}`, ...item.lines].join('\n')) : ['Keine Punkte.'];
  const areas = changed.length > 0 ? changed.map((label) => `- ${label}`) : ['Keine.'];
  return ['# Prüfliste', '', '## Punkte', '', points.join('\n\n'), '', '## Geänderte Bereiche', '', ...areas].join('\n');
}

// Prüfliste der Nachprüfung und geänderte Bereiche; Stellen mit offener Frage stehen nicht darauf.
function buildChecklist(options) {
  const text = readText(options.doc);
  const openKeys = openKeysNow(options, text);
  const base = baseItems(options).filter((item) => !openKeys.has(item.key));
  const items = withoutDuplicates([...base, ...answeredItems(options, openKeys)]);
  const changed = changedPlaces(readText(path.join(options.workspace, 'vorher.md')), text);
  const dir = path.join(options.workspace, ROUND_TWO);
  const aiItems = items.filter((item) => item.source === 'ki');
  writeJson(path.join(dir, 'pruefliste.json'), { items, changed });
  writeText(path.join(dir, 'pruefliste.md'), renderChecklist(aiItems, changed));
  const verifier = aiItems.length > 0 || changed.length > 0 ? 'ja' : 'nein';
  return `PRUEFLISTE punkte=${aiItems.length} skript=${items.length - aiItems.length} bereiche=${changed.length}\nNACHPRUEFER ${verifier}`;
}

function verdictProblem(verdicts, aiItems) {
  const wrong = verdicts.find((verdict) => typeof verdict?.location !== 'string' || !VERDICTS.includes(verdict.verdict) || typeof verdict.rationale !== 'string');
  if (wrong) return `Urteil ungültig: ${JSON.stringify(wrong)}`;
  const named = verdicts.map((verdict) => placeKey(verdict.location));
  const listed = new Set(aiItems.map((item) => item.key));
  // Urteile außerhalb der Prüfliste würden k in `nicht bereit, k × 🔴 offen` verfälschen.
  const extra = verdicts.filter((verdict, index) => !listed.has(named[index]));
  if (extra.length > 0) return `Urteil ohne Punkt der Prüfliste: ${extra.map((verdict) => verdict.location).join(', ')}`;
  const missing = aiItems.filter((item) => named.filter((key) => key === item.key).length !== 1);
  return missing.length > 0 ? `Urteil fehlt oder doppelt: ${missing.map((item) => item.label).join(', ')}` : null;
}

function verifierProblem(value, review, aiItems) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.verdicts) || !Array.isArray(value.findings)) return 'verdicts oder findings fehlt';
  return verdictProblem(value.verdicts, aiItems) ?? value.findings.map((finding) => findingProblem(finding, review)).find(Boolean) ?? null;
}

function readVerifier(dir, review, aiItems, needed) {
  if (!needed) return { verdicts: [], findings: [], problem: null };
  const { value, problem } = readAgentJson(path.join(dir, 'nachpruefung.json'));
  const invalid = problem ?? verifierProblem(value, review, aiItems);
  return invalid ? { problem: invalid } : { ...value, problem: null };
}

function scriptVerdicts(items, scripted) {
  return items.filter((item) => item.source === 'skript').map((item) => ({
    location: item.label, source: 'skript', rationale: 'Skript-Prüfung',
    verdict: scripted.some((finding) => finding.place.key === item.key) ? 'nicht erledigt' : 'erledigt',
  }));
}

// Nachprüfung auswerten: Urteile je Punkt, Findings herabstufen, Befunde der Skript-Prüfungen bleiben 🔴.
function verifyRoundTwo(options) {
  const dir = path.join(options.workspace, ROUND_TWO);
  const checklist = readJson(path.join(dir, 'pruefliste.json'));
  const aiItems = checklist.items.filter((item) => item.source === 'ki');
  const verifier = readVerifier(dir, options.review, aiItems, aiItems.length > 0 || checklist.changed.length > 0);
  if (verifier.problem) return `NACHPRUEFUNG ungültig: ${verifier.problem}`;
  const text = readText(options.doc);
  const places = parsePlaces(text);
  const spec = options.spec ? wEntryLines(readText(options.spec)) : [];
  const context = {
    review: options.review, advisory: new Set(), wEntries: [...wEntryLines(text), ...spec], openKeys: openKeysNow(options, text),
    phase: 'nachpruefung', checklistKeys: new Set(checklist.items.map((item) => item.key)), changedKeys: new Set(checklist.changed.map(placeKey)),
  };
  const scripted = scriptItems(dir, places);
  const items = [...rateReviewer(VERIFIER, verifier.findings, places, context), ...scripted];
  const groups = groupRated(items.filter((item) => !item.dropped));
  const verdicts = [...verifier.verdicts.map((verdict) => ({ ...verdict, source: 'ki' })), ...scriptVerdicts(checklist.items, scripted)];
  const notDone = verifier.verdicts.filter((verdict) => verdict.verdict === 'nicht erledigt').length;
  const counts = countColors(groups);
  const openRed = notDone + counts.red;
  writeJson(path.join(dir, 'einstufung.json'), { verdicts, groups, dropped: droppedList(items), openRed });
  writeText(path.join(dir, 'scout-eingabe.md'), renderGroups(groups.filter((group) => group.color === 'yellow')));
  const scout = counts.yellow > 0 ? 'hinweise' : 'keiner';
  return `NACHPRUEFUNG ok offen=${openRed} hinweise=${counts.yellow}\nWEITER scout=${scout}`;
}

module.exports = { buildChecklist, verifyRoundTwo };
```
  In `plugins/forge/scripts/review-flow.js` fügst du direkt nach der Zeile `const { checkRework, checkAnswers } = require('./lib/rework-check');` ein:
  ```javascript
  const { buildChecklist, verifyRoundTwo } = require('./lib/round-two');
  ```
  In `USAGE` fügst du direkt nach der Zeile mit `node review-flow.js answers-check` ein:
  ```javascript
    '       node review-flow.js checklist --review <..> --dir <W> --doc <datei> [--quelle runde-1|nacharbeit]',
    '       node review-flow.js verify --review <..> --dir <W> --doc <datei> [--spec <datei>] [--quelle runde-1|nacharbeit]',
  ```
  In `COMMANDS` fügst du direkt nach dem Eintrag `'answers-check': …` ein:
  ```javascript
    checklist: (values) => buildChecklist(flowOptions(values)),
    verify: (values) => verifyRoundTwo(flowOptions(values)),
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round-two.test.js plugins/forge/tests/review-flow-rework.test.js plugins/forge/tests/review-flow-round-one.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/round-two.js plugins/forge/scripts/review-flow.js plugins/forge/tests/review-flow-round-two.test.js` · `git commit -m "feat(forge): build the verification checklist and rate round two by script"`

---

### Task 10: Status und Bericht

**ACs:** AC-12, AC-14, AC-18, AC-19, AC-26, AC-27, AC-28, AC-37, AC-43, AC-44, AC-45, AC-52

**Dateien:**
- Create: `plugins/forge/scripts/lib/flow-report.js`
- Modify: `plugins/forge/scripts/review-flow.js` · `const { checkScout } = require('./lib/scout-check');`
- Modify: `plugins/forge/scripts/review-flow.js` · `USAGE`
- Modify: `plugins/forge/scripts/review-flow.js` · `COMMANDS`
- Test: `plugins/forge/tests/review-flow-report.test.js`

**Interfaces:**
- Consumes: `openQuestions` (Task 5); `ICON`, `cell`, `renderGroups`, `renderTable` (Task 4); `SCRIPT_CATEGORY`, `FlowError` aus `flow-files.js` (Task 7); `failedInstances`, `nextAttempt` (Task 6); Dateien aus Task 7 bis 9; `SPEC`, `finding`, `setup`, `writeJsonFile`, `writeReviewer`, `flow`, `editDoc`, `addEntries`, `runUntilRework` aus `plugins/forge/tests/lib/review-flow-fixture.js` (Task 2).
- Produces: diese Module, Dateien und Schritte:
  - `plugins/forge/scripts/lib/flow-report.js`: `flowStatus({ failed: string[], openQuestions: number, openRed: number, reworked: boolean }): string`; `report({ review, workspace, doc, source, title, artifact }): string` — die offenen 🔴 kommen aus `runde-2/einstufung.json` (`openRed`); fehlt die Datei nach einer Nacharbeit ohne Ausfall, wirft `report` `FlowError('Nachprüfung fehlt: runde-2/einstufung.json')`; fehlt sie ohne Nacharbeit, zählen die 🔴-Gruppen aus `runde-1/einstufung.json`. Erste Zeile `ENDE <status>`, dann `=== BERICHT ===` und der Bericht (`## <Titel>: <Artefakt>`, `**Status:**`, `**Runden:** <n> · **Nacharbeiten:** <m>`, `### Runde 1`, `### Nachprüfung`, `### Widersprüche`, `### Skript-Prüfungen`, `### Weitere 🔴 der Nachprüfung`, `### Hinweise der Nachprüfung`, `### Offene Fragen`, `### Anmerkungen (🟢)`, `### Scout`, jeder nur mit Inhalt); schreibt `<W>/abschluss/aggregate.md` (alle 🔴- und 🟡-Gruppen) und, wenn ein Scout lief, `<W>/abschluss/scout.md` (Vorschläge aus Runde 1 und Nachprüfung) für `followup.js save`.
  - `review-flow.js`: Schritt `report --titel <text> --artefakt <pfad>`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-flow-report.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { flowStatus } = require('../scripts/lib/flow-report');
const { nextAttempt } = require('../scripts/lib/attempts');
const { SPEC, finding, setup, writeJsonFile, writeReviewer, flow, editDoc, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

const RED = (location) => finding({ location, quote: 'x', category: 'widerspruch' });
const VERDICT = (location, verdict) => ({ location, verdict, rationale: verdict === 'erledigt' ? 'ok' : 'F fehlt noch' });

function status(overrides) {
  return flowStatus({ failed: [], openQuestions: 0, openRed: 0, reworked: true, ...overrides });
}

function runReport(env, review = 'spec-review') {
  return flow('report', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--titel', 'Spec-Review', '--artefakt', 'docs/x/spec.md');
}

function report(env, review = 'spec-review') {
  return runReport(env, review).stdout;
}

// Ganzer Lauf bis nach der Nachprüfung; `verification` ist das Ergebnis des Nachprüfers.
function runWithVerification(env, findings, results, verification) {
  runUntilRework(env, findings);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results, questions: [] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  if (verification) writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
}

test('flowStatus_FailedAndQuestion_UnvollstaendigFirst', () => {
  // Act
  const text = status({ failed: ['nachprüfer'], openQuestions: 1, openRed: 2 });

  // Assert
  assert.equal(text, 'unvollständig, ausgefallen: nachprüfer');
});

test('flowStatus_QuestionAndNotDone_FragenOffen', () => {
  // Act
  const text = status({ openQuestions: 1, openRed: 1 });

  // Assert
  assert.equal(text, 'Fragen offen');
});

test('flowStatus_ThreeOpenRed_NichtBereitWithSum', () => {
  // Act
  const text = status({ openRed: 3 });

  // Assert
  assert.equal(text, 'nicht bereit, 3 × 🔴 offen');
});

test('flowStatus_NothingOpen_CleanAfterRoundOneOrVerification', () => {
  // Act
  const texts = [status({ reworked: false }), status({})];

  // Assert
  assert.deepEqual(texts, ['sauber nach Runde 1', 'sauber nach Nachprüfung']);
});

test('report_TwoHintsWithoutRework_CleanAfterRoundOneAndClosingForFollowup', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' }), finding({ location: 'AC-07' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 AC-01\n1. a\n**Bevorzugt: 1** — x\n\n### 🟡 AC-07\n1. b\n**Bevorzugt: 1** — y\n');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n=== BERICHT ===\n## Spec-Review: docs\/x\/spec\.md\n\n\*\*Status:\*\* sauber nach Runde 1\n\*\*Runden:\*\* 1 · \*\*Nacharbeiten:\*\* 0/);
  assert.match(fs.readFileSync(path.join(env.workspace, 'abschluss', 'scout.md'), 'utf8'), /### 🟡 AC-01[\s\S]*### 🟡 AC-07/);
});

test('report_NoRedInRoundOneWithoutRework_CleanAfterRoundOne', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n/);
});

test('report_RedInRoundOneWithoutRoundTwo_NichtBereitWithRedOfRoundOne', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [RED('AC-04')]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n/);
});

test('report_ReworkWithoutRoundTwo_ExitsWithOneAndReason', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed' }], questions: [] });

  // Act
  const result = runReport(env);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: Nachprüfung fehlt: runde-2\/einstufung\.json/);
});

test('report_AllDone_CleanAfterVerificationWithVerdicts', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n/);
  assert.match(output, /### Nachprüfung\n\| Stelle \| Urteil \|\n\|---\|---\|\n\| AC-04 \| erledigt \|/);
});

test('report_TwoNotDone_NichtBereitTwo', () => {
  // Arrange
  const env = setup();
  const results = [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'changed' }];
  runWithVerification(env, [RED('AC-04'), RED('AC-07')], results, { verdicts: [VERDICT('AC-04', 'nicht erledigt'), VERDICT('AC-07', 'nicht erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 2 × 🔴 offen\n/);
  assert.match(output, /\| AC-04 \| nicht erledigt — F fehlt noch \|/);
});

test('report_NotDoneContradictionAndScript_NichtBereitThree', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'runde-2', 'skript-pruefung.json'), { findings: [{ location: 'AC-01', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  const verification = { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [finding({ location: 'Deckel', quote: 'Höchstens drei Runden.', category: 'widerspruch' })] };
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'Höchstens zwei Runden.', 'Höchstens drei Runden.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed' }], questions: [] });
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 3 × 🔴 offen\n/);
  assert.match(output, /### Widersprüche\n- 🔴 Deckel: Folge/);
  assert.match(output, /### Skript-Prüfungen\n- 🔴 AC-01: doppelt/);
});

test('report_QuestionOpenAndPointNotDone_FragenOffenShowsPoint', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed' }], { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [] });
  addEntries(env, '- **R1 · AC-07** — frage an den menschen — Gilt I?');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /\| AC-04 \| nicht erledigt — F fehlt noch \|/);
  assert.match(output, /### Offene Fragen\n- AC-07: Gilt I\?/);
});

test('report_TwoOpenQuestions_ListsBothWithPlaces', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — F?\n- **R1 · AC-07** — frage an den menschen — I?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Offene Fragen\n- AC-04: F\?\n- AC-07: I\?/);
});

test('report_VerifierFailedWithOpenQuestion_Unvollstaendig', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-07** — frage an den menschen — I?\n- **W · Deckel**'));
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nachprüfer'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE unvollständig, ausgefallen: nachprüfer\n/);
});

test('report_GreenFinding_ListedWithoutScoutAndNotInClosing', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01', category: 'formulierung', consequence: 'Satz holpert' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Anmerkungen \(🟢\)\n- 🟢 AC-01: Satz holpert/);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
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
  assert.match(output, /### Scout\n- Scout ausgefallen/);
});

test('report_PlanSpecQuestion_FragenOffenWithQuestion', () => {
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
  assert.match(output, /### Offene Fragen\n- Task 1: Spec lässt X offen/);
});

test('report_FollowupWithNotDonePoint_NichtBereitOne', () => {
  // Arrange
  const env = setup();
  flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: „x“\n');
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results: [{ location: 'AC-07', status: 'changed' }] });
  const source = ['--quelle', 'nacharbeit'];
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [VERDICT('AC-07', 'nicht erledigt')], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);

  // Act
  const output = flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', 'docs/x/spec.md', ...source).stdout;

  // Assert
  assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n=== BERICHT ===\n## Review-Followup \(spec-review\): docs\/x\/spec\.md/);
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-report.test.js` — erwartet: FAIL `Cannot find module '../scripts/lib/flow-report'`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/flow-report.js`:
```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openQuestions } = require('./questions');
const { ICON, cell, renderGroups, renderTable } = require('./groups');
const { SCRIPT_CATEGORY } = require('./rated-items');
const { failedInstances } = require('./attempts');
const { ROUND_ONE, ROUND_TWO, CLOSING, FlowError, readText, readLines, readJson, writeText } = require('./flow-files');

const SCOUT_HEADING = '## Scout-Vorschläge';

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
  const attempts = failedInstances(options.workspace);
  const failed = attempts.filter((name) => !name.startsWith('scout'));
  const one = readJson(path.join(options.workspace, ROUND_ONE, 'einstufung.json'), null);
  const two = readJson(path.join(options.workspace, ROUND_TWO, 'einstufung.json'), null);
  const reworked = fs.existsSync(path.join(options.workspace, options.source, 'rework.json'));
  return {
    one, two, reworked, failed,
    openRed: openRedOf(one, two, reworked, failed),
    checked: fs.existsSync(path.join(options.workspace, ROUND_TWO, 'pruefliste.json')),
    questions: questionsAtEnd(options),
    scoutFailed: attempts.some((name) => name.startsWith('scout')),
  };
}

function groupLine(group) {
  const consequences = group.items.map((item) => cell(item.finding.consequence)).join('; ');
  return `- ${ICON[group.color]} ${group.label}: ${consequences}`;
}

function listSection(title, lines) {
  return lines.length > 0 ? [`### ${title}`, ...lines, ''] : [];
}

function verdictRow(verdict) {
  const text = verdict.verdict === 'nicht erledigt' ? `nicht erledigt — ${cell(verdict.rationale)}` : 'erledigt';
  return `| ${cell(verdict.location)} | ${text} |`;
}

function verdictSection(two) {
  if (!two) return [];
  const rows = two.verdicts.length > 0 ? two.verdicts.map(verdictRow) : ['| – | keine Punkte |'];
  return ['### Nachprüfung', '| Stelle | Urteil |', '|---|---|', ...rows, ''];
}

const isContradiction = (item) => item.category === 'widerspruch';
const isScript = (item) => item.category === SCRIPT_CATEGORY;
const isOtherRed = (item) => item.color === 'red' && !isContradiction(item) && !isScript(item);

function redOfTwo(two, predicate) {
  return (two?.groups ?? []).filter((group) => group.color === 'red' && group.items.some(predicate));
}

function greenGroups(data) {
  return [...(data.one?.groups ?? []), ...(data.two?.groups ?? [])].filter((group) => group.color === 'green');
}

function header(data, options, status) {
  const rounds = (data.one ? 1 : 0) + (data.checked ? 1 : 0);
  return [
    `## ${options.title}: ${options.artifact}`, '',
    `**Status:** ${status}`,
    `**Runden:** ${rounds} · **Nacharbeiten:** ${data.reworked ? 1 : 0}`, '',
  ];
}

function renderReport(data, options, status) {
  return [
    ...header(data, options, status),
    ...(data.one ? ['### Runde 1', renderTable(data.one.groups), ''] : []),
    ...verdictSection(data.two),
    ...listSection('Widersprüche', redOfTwo(data.two, isContradiction).map(groupLine)),
    ...listSection('Skript-Prüfungen', redOfTwo(data.two, isScript).map(groupLine)),
    ...listSection('Weitere 🔴 der Nachprüfung', redOfTwo(data.two, isOtherRed).map(groupLine)),
    ...listSection('Hinweise der Nachprüfung', (data.two?.groups ?? []).filter((group) => group.color === 'yellow').map(groupLine)),
    ...listSection('Offene Fragen', data.questions.map((question) => `- ${question.place}: ${question.question}`)),
    ...listSection('Anmerkungen (🟢)', greenGroups(data).map(groupLine)),
    ...listSection('Scout', data.scoutFailed ? ['- Scout ausgefallen'] : []),
  ].join('\n').trimEnd();
}

function scoutBody(file) {
  const lines = readLines(file);
  const start = lines.indexOf(SCOUT_HEADING);
  return start === -1 ? [] : lines.slice(start + 1);
}

// Sicherung für review-followup: alle Gruppen mit Scout-Vorschlägen aus Runde 1 und Nachprüfung.
function writeClosing(options, data) {
  const dir = path.join(options.workspace, CLOSING);
  fs.rmSync(dir, { recursive: true, force: true });
  const bodies = [ROUND_ONE, ROUND_TWO].flatMap((round) => scoutBody(path.join(options.workspace, round, 'scout.md')));
  const groups = [...(data.one?.groups ?? []), ...(data.two?.groups ?? [])].filter((group) => group.color !== 'green');
  writeText(path.join(dir, 'aggregate.md'), renderGroups(groups));
  if (bodies.some((line) => line.trim() !== '')) writeText(path.join(dir, 'scout.md'), [SCOUT_HEADING, ...bodies].join('\n'));
}

function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  writeClosing(options, data);
  return [`ENDE ${status}`, '=== BERICHT ===', renderReport(data, options, status)].join('\n');
}

module.exports = { flowStatus, report };
```
  In `plugins/forge/scripts/review-flow.js` fügst du direkt nach der Zeile `const { checkScout } = require('./lib/scout-check');` ein:
  ```javascript
  const { report } = require('./lib/flow-report');
  ```
  In `USAGE` fügst du direkt nach der Zeile mit `node review-flow.js verify` ein:
  ```javascript
    '       node review-flow.js report --review <..> --dir <W> --doc <datei> --titel <text> --artefakt <pfad> [--quelle runde-1|nacharbeit]',
  ```
  In `COMMANDS` fügst du direkt nach dem Eintrag `verify: …` ein:
  ```javascript
    report: (values) => report({ ...flowOptions(values), title: required(values, 'titel'), artifact: required(values, 'artefakt') }),
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-report.test.js plugins/forge/tests/review-flow-round-two.test.js plugins/forge/tests/review-flow-rework.test.js plugins/forge/tests/review-flow-round-one.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-report.js plugins/forge/scripts/review-flow.js plugins/forge/tests/review-flow-report.test.js` · `git commit -m "feat(forge): derive review status by rank and render the report by script"`

---

### Task 11: Rundenzahl als unbekanntes Argument

**ACs:** AC-31

**Dateien:**
- Modify: `plugins/forge/scripts/prepare.js:17-24` · `USAGE`
- Modify: `plugins/forge/scripts/prepare.js:26` · `DEFAULT_ROUNDS`
- Modify: `plugins/forge/scripts/prepare.js:31-37` · `FLAGS`
- Modify: `plugins/forge/scripts/prepare.js:119-123` · `rounds`
- Modify: `plugins/forge/scripts/prepare.js:188-218` · `prepareSpecReview`
- Modify: `plugins/forge/scripts/prepare.js:220-238` · `preparePlanReview`
- Test: `plugins/forge/tests/prepare.test.js` · `planReview_SpecBesidePlan_ResolvedWithForwardSlashes`

**Interfaces:**
- Consumes: —
- Produces: `prepare.js spec-review` und `prepare.js plan-review` liefern keine Zeile `N=` mehr; `--rounds` endet mit Exit 2 und `Unbekanntes oder unvollständiges Argument: --rounds`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/prepare.test.js` ersetzt du im Test `planReview_SpecBesidePlan_ResolvedWithForwardSlashes` die Zeile `assert.equal(out.N, '3');` durch `assert.equal(out.N, undefined);`. Im Test `planReview_ExplicitSpec_WinsOverHeader` ersetzt du den Aufruf durch `const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md', 'explicit.md'));` und löschst die Zeile `assert.equal(out.N, '5');`. Direkt vor dem Test `specReview_ProfilesFound_WritesIndexAndWarnsOnDuplicates` fügst du ein:
  ```javascript
  test('specAndPlanReview_RoundsArgument_AbortWithUnknownArgument', () => {
    const repo = planRepo();
    const results = [
      run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--rounds', '2'),
      run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--rounds', '2'),
    ];
    for (const result of results) {
      assert.equal(result.status, 2);
      assert.match(result.stderr, /^Unbekanntes oder unvollständiges Argument: --rounds$/m);
    }
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/prepare.test.js` — erwartet: FAIL `planReview_SpecBesidePlan_ResolvedWithForwardSlashes`, `specAndPlanReview_RoundsArgument_AbortWithUnknownArgument`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/prepare.js`:
  - `USAGE`: `'Aufruf: node prepare.js spec-review <spec> [quelle] [--rounds N] [--only <reviewer,...>]',` wird `'Aufruf: node prepare.js spec-review <spec> [quelle] [--only <reviewer,...>]',`; `'       node prepare.js plan-review <plan> [spec] [--rounds N] [--only <reviewer,...>]',` wird `'       node prepare.js plan-review <plan> [spec] [--only <reviewer,...>]',`.
  - Die Zeile `const DEFAULT_ROUNDS = '3';` löschst du.
  - `FLAGS`: `'spec-review': ['--rounds', '--only'],` wird `'spec-review': ['--only'],`, `'plan-review': ['--rounds', '--only'],` wird `'plan-review': ['--only'],`.
  - Die Funktion `rounds(flags)` löschst du ganz.
  - In `prepareSpecReview` löschst du die Zeile `values.N = rounds(flags);`.
  - In `preparePlanReview` wird `const values = { P: plan, S: resolveSpec(plan, positional[1], root), R: root, N: rounds(flags) };` zu:
  ```javascript
    const values = { P: plan, S: resolveSpec(plan, positional[1], root), R: root };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/prepare.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/prepare.js plugins/forge/tests/prepare.test.js` · `git commit -m "feat(forge): spec and plan review reject a round count as unknown argument"`

---

### Task 12: Guard — Skript erlaubt, Anhalten für Antworten

**ACs:** AC-17, AC-18, AC-36

**Dateien:**
- Modify: `plugins/forge/scripts/guard-orchestrator.js:14-15` · `ALLOWED_SCRIPTS`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:172-180` · `onPrompt`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:317-324` · `main`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:336` · `module.exports`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `decidePreTool_SubagentReadsSpec_Allows`

**Interfaces:**
- Consumes: —
- Produces: `pause(sessionId: string, tmpRoot?: string): void` — setzt im bestehenden Marker `paused: true`; ohne Marker nichts. `onPrompt` gibt bei `paused: true` nicht frei, sondern setzt `paused: false`; die nächste Eingabe gibt frei. CLI: `node guard-orchestrator.js pause <SESSION>`. `review-flow.js` steht in `ALLOWED_SCRIPTS`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/guard-orchestrator.test.js` fügst du direkt vor dem Test `decidePreTool_SubagentReadsSpec_Allows` ein:
  ```javascript
  test('decidePreTool_ShellCommandIsReviewFlow_Allows', () => {
    const env = setup();
    const command = `node "/plugins/forge/scripts/review-flow.js" rate --review spec-review --doc "${env.specPath}"`;
    assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
  });

  test('onPrompt_AnswerAfterPause_KeepsProtectionUntilNextPrompt', () => {
    const env = setup();
    guard.pause(SESSION, env.tmpRoot);
    guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'AC-04: ja, immer' }, env.tmpRoot);
    assert.notEqual(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
    guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'Danke, und jetzt bitte X' }, env.tmpRoot);
    assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
  });

  test('pause_NoMarker_WritesNone', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
    guard.pause('nobody', tmpRoot);
    assert.equal(fs.existsSync(guard.markerPath('nobody', tmpRoot)), false);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/guard-orchestrator.test.js` — erwartet: FAIL `decidePreTool_ShellCommandIsReviewFlow_Allows`, `onPrompt_AnswerAfterPause_KeepsProtectionUntilNextPrompt`, `pause_NoMarker_WritesNone`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/guard-orchestrator.js` ersetzt du `ALLOWED_SCRIPTS` durch:
  ```javascript
  const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js',
    'plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js', 'prepare.js', 'forge-config.js', 'work.js', 'ledger.js', 'followup.js',
    'review-flow.js'];
  ```
  In `onPrompt` ersetzt du die letzte Zeile `  if (!HARNESS_NOTICE.test(String(input.prompt ?? ''))) release(input.session_id, tmpRoot);` und die schließende Klammer durch:
  ```javascript
    if (HARNESS_NOTICE.test(String(input.prompt ?? ''))) return;
    const marker = readMarker(input.session_id, tmpRoot);
    // Die Antwort des Menschen auf angehaltene Fragen gibt den Guard nicht frei, erst die Eingabe danach.
    if (marker?.paused) {
      writeMarker(input.session_id, { ...marker, paused: false }, tmpRoot);
      return;
    }
    release(input.session_id, tmpRoot);
  }

  function pause(sessionId, tmpRoot) {
    const marker = readMarker(sessionId, tmpRoot);
    if (marker) writeMarker(sessionId, { ...marker, paused: true }, tmpRoot);
  }
  ```
  In `main` fügst du direkt nach `  if (event === 'release') return release(argument);` ein:
  ```javascript
    if (event === 'pause') return pause(argument);
  ```
  `module.exports` wird:
  ```javascript
  module.exports = { COMMANDS, PLUGIN_ROOT, markerPath, parseSkillCall, writeMarker, onPrompt, decidePreTool, release, pause };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/guard-orchestrator.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/guard-orchestrator.test.js` · `git commit -m "feat(forge): guard allows review-flow and keeps protection across an answered pause"`

---

### Task 13: Reviewer liefern eine Kategorie statt einer Farbe

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-38, AC-39

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-completeness.md` · `## Einstufung`
- Modify: `plugins/forge/agents/spec-review-consistency.md` · `## Einstufung`
- Modify: `plugins/forge/agents/spec-review-feasibility.md` · `## Einstufung`
- Modify: `plugins/forge/agents/spec-review-clarity.md` · `## Einstufung`
- Modify: `plugins/forge/agents/spec-review-profiles.md` · `## Einstufung`
- Modify: `plugins/forge/agents/plan-review-coverage.md` · `## Einstufung`
- Modify: `plugins/forge/agents/plan-review-feasibility.md` · `## Einstufung`
- Modify: `plugins/forge/agents/plan-review-architecture.md` · `## Einstufung`
- Modify: `plugins/forge/agents/plan-review-risks.md` · `## Einstufung`
- Modify: `plugins/forge/agents/plan-review-buildability.md` · `## Einstufung`
- Test: `plugins/forge/tests/agents.test.js` · `FORMAT_KEYS`

**Interfaces:**
- Consumes: Kategorien aus `CATEGORIES` in `plugins/forge/scripts/lib/rules.js` (Task 3).
- Produces: Jeder Reviewer schreibt Findings mit `"category"` statt `"severity"`; Spec-Reviewer kennen 5, Plan-Reviewer 7 Kategorien.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` ersetzt du die Zeile `const FORMAT_KEYS = [...]` durch:
  ```javascript
  const FORMAT_KEYS = ['"reviewer"', '"summary"', '"findings"', '"location"', '"quote"', '"category"', '"consequence"', '"rationale"'];
  const SPEC_CATEGORIES = ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'detail', 'formulierung'];
  const PLAN_CATEGORIES = [...SPEC_CATEGORIES, 'ac-fehlt-im-plan', 'umsetzer-steckt-fest'];
  const COLOR_WORD = /`(?:red|yellow|green)`|"severity"/;
  ```
  In der Schleife `for (const reviewer of REVIEWERS)` fügst du nach dem Test `${name}_Body_EmbedsFindingFormatWithOwnReviewerName` ein:
  ```javascript
    test(`${name}_Body_NamesSpecCategoriesWithoutColor`, () => {
      const { body } = readAgent(name);
      assert.ok(body.includes('## Kategorie'));
      for (const category of SPEC_CATEGORIES) assert.ok(body.includes(`- \`${category}\` — `), category);
      assert.ok(!body.includes('ac-fehlt-im-plan'));
      assert.doesNotMatch(body, COLOR_WORD);
    });
  ```
  In der Schleife `for (const [reviewer, tools] of Object.entries(PLAN_REVIEWERS))` fügst du nach dem Test `${name}_Body_FormatCalibrationDecisionsLocations` ein:
  ```javascript
    test(`${name}_Body_NamesPlanCategoriesWithoutColor`, () => {
      const { body } = readAgent(name);
      assert.ok(body.includes('## Kategorie'));
      for (const category of PLAN_CATEGORIES) assert.ok(body.includes(`- \`${category}\` — `), category);
      assert.doesNotMatch(body, COLOR_WORD);
    });
  ```
  Den Test `plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed` ersetzt du durch:
  ```javascript
  test('plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysAcFehltImPlan', () => {
    const { body } = readAgent('plan-review-coverage');
    assert.match(body, /keinen Code/);
    assert.match(body, /immer Kategorie `ac-fehlt-im-plan`/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-clarity_Body_NamesSpecCategoriesWithoutColor`, `plan-review-coverage_Body_NamesPlanCategoriesWithoutColor`, `plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysAcFehltImPlan` und die übrigen `…Categories…`-Tests
- [ ] **Schritt 3: Minimal implementieren**
  **In jeder der fünf Dateien `plugins/forge/agents/spec-review-{completeness,consistency,feasibility,clarity,profiles}.md`:**
  1. Den Abschnitt
  ```markdown
  ## Einstufung
  - `red` — Ein Planer oder Implementierer würde so etwas Falsches bauen oder müsste raten.
  - `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
  - `green` — Anmerkung, Formulierung.
  ```
  ersetzt du durch
  ```markdown
  ## Kategorie
  Jedes Finding bekommt genau eine Kategorie, keine Farbe:
  - `widerspruch` — zwei Aussagen schließen sich aus.
  - `fehlendes-verhalten` — eine beschriebene Funktion hat gar kein AC oder eine Aktion gar kein Ergebnis.
  - `unerfuellbar` — eine Anforderung lässt sich nicht erfüllen.
  - `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Plan selbst entscheiden kann.
  - `formulierung` — Wortwahl, Stil, Anmerkung.

  Eine andere Kategorie oder ein Feld `severity` macht dein Ergebnis ungültig.
  ```
  2. Im JSON-Beispiel wird `      "severity": "red",` zu `      "category": "widerspruch",`.
  3. `` - `location`: `AC-<Zahl>` oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor. `` wird:
  ```markdown
  - `location`: `AC-<Zahl>`, der fett gesetzte Name eines Schritts oder einer Soll-Vorgabe ohne Doppelpunkt oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor; betrifft ein Finding mehrere Stellen, steht die erste zuerst.
  ```
  4. `- Alle Felder sind Strings und Pflicht.` wird `- Alle Felder sind Strings und Pflicht, keines leer.`

  **Zusätzlich in den Prüfaufträgen:**
  - `spec-review-completeness.md`: `` meldest du genau ein `red`-Finding an der ersten Überschrift der Spec. `` wird `` meldest du genau ein Finding der Kategorie `fehlendes-verhalten` an der ersten Überschrift der Spec. ``
  - `spec-review-consistency.md`: `` 3. Ein echter Widerspruch ist `red`. Ein externer Verweis ist `red`, wenn der Bau seinen Inhalt braucht, sonst `yellow`. `` wird `` 3. Ein echter Widerspruch hat die Kategorie `widerspruch`. Ein externer Verweis ist `unerfuellbar`, wenn der Bau seinen Inhalt braucht, sonst `detail`. ``
  - `spec-review-clarity.md`: `` Solche Details sind `yellow`, außer sie widersprechen einer Anforderung. `` wird `` Solche Details haben die Kategorie `detail`, außer sie widersprechen einer Anforderung, dann `widerspruch`. ``
  - `spec-review-profiles.md`: `` 5. Ein falscher Begriff ist `yellow`, außer er macht eine Anforderung mehrdeutig, dann ist er `red`. Ein Widerspruch zum Ist-Stand ist `red`. `` wird `` 5. Ein falscher Begriff ist `detail`, außer er macht eine Anforderung mehrdeutig, dann ist er `widerspruch`. Ein Widerspruch zum Ist-Stand ist `widerspruch`. ``

  **In jeder der fünf Dateien `plugins/forge/agents/plan-review-{coverage,feasibility,architecture,risks,buildability}.md`:**
  1. Den ganzen Abschnitt `## Einstufung` (Überschrift und die drei Zeilen `red`, `yellow`, `green`; ihr Wortlaut unterscheidet sich je Datei) ersetzt du durch
  ```markdown
  ## Kategorie
  Jedes Finding bekommt genau eine Kategorie, keine Farbe:
  - `widerspruch` — zwei Aussagen in Plan, Spec oder Code schließen sich aus.
  - `fehlendes-verhalten` — eine beschriebene Funktion hat gar kein AC oder eine Aktion gar kein Ergebnis.
  - `unerfuellbar` — eine Anforderung lässt sich nicht erfüllen.
  - `ac-fehlt-im-plan` — ein AC der Spec fehlt im Plan oder ist nur teilweise umgesetzt.
  - `umsetzer-steckt-fest` — der Umsetzer bliebe stecken, müsste raten oder dürfte einen Schritt nicht ausführen, auch bei einem Befehl, den das Projekt verbietet.
  - `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Plan selbst entscheiden kann.
  - `formulierung` — Wortwahl, Stil, Anmerkung.

  Eine andere Kategorie oder ein Feld `severity` macht dein Ergebnis ungültig.
  ```
  2. Im JSON-Beispiel wird `      "severity": "red",` zu `      "category": "widerspruch",`.
  3. `` - `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`. Details auf Schritt-Ebene gehören in `quote`. `` wird:
  ```markdown
  - `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`; betrifft ein Finding mehrere Stellen, steht die erste zuerst. Details auf Schritt-Ebene gehören in `quote`.
  ```
  4. `- Alle Felder sind Strings und Pflicht.` wird `- Alle Felder sind Strings und Pflicht, keines leer.`

  **Zusätzlich in `plan-review-coverage.md`:** In Prüfauftrag 1 wird `` immer `red`. `` zu `` immer Kategorie `ac-fehlt-im-plan`. ``, in Prüfauftrag 2 wird `` immer `red`; `` zu `` immer Kategorie `ac-fehlt-im-plan`; ``.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-completeness.md plugins/forge/agents/spec-review-consistency.md plugins/forge/agents/spec-review-feasibility.md plugins/forge/agents/spec-review-clarity.md plugins/forge/agents/spec-review-profiles.md plugins/forge/agents/plan-review-coverage.md plugins/forge/agents/plan-review-feasibility.md plugins/forge/agents/plan-review-architecture.md plugins/forge/agents/plan-review-risks.md plugins/forge/agents/plan-review-buildability.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): spec and plan reviewers name a category instead of a color"`

---

### Task 14: Nachprüfer-Agenten

**ACs:** AC-22, AC-23, AC-32

**Dateien:**
- Create: `plugins/forge/agents/spec-review-verifier.md`
- Create: `plugins/forge/agents/plan-review-verifier.md`
- Test: `plugins/forge/tests/agents.test.js` · `allReviewers_Body_WriteResultFileWithEmptyExample`

**Interfaces:**
- Consumes: Format von `nachpruefung.json` und `pruefliste.md` aus Task 9; `COLOR_WORD` in `agents.test.js` aus Task 13.
- Produces: Agenten `dv-forge:spec-review-verifier` (Eingaben `Spec:`, `Prüfliste:`, `Ergebnis:`) und `dv-forge:plan-review-verifier` (Eingaben `Plan:`, `Spec:`, `Repo:`, `Prüfliste:`, `Ergebnis:`). Beide Namen treffen die Guard-Regel `REVIEW_AGENT` und schreiben nur in `.forge/`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` ersetzt du im Test `allReviewers_Body_WriteResultFileWithEmptyExample` die erste Zeile durch:
  ```javascript
    const names = fs.readdirSync(AGENTS).filter((file) => /-review-/.test(file) && !file.includes('scout') && !file.includes('verifier')).map((file) => file.slice(0, -3));
  ```
  Ans Ende der Datei hängst du an:
  ```javascript
  for (const [name, tools] of [['spec-review-verifier', 'Read, Write'], ['plan-review-verifier', 'Read, Grep, Glob, Write']]) {
    test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
      const { fields } = readAgent(name);
      assert.equal(fields.name, name);
      assert.equal(fields.tools, tools);
      assert.equal(fields.model, 'sonnet');
      assert.match(fields.description, /^Use when/);
    });

    test(`${name}_Body_JudgesChecklistAndChangedAreasOnly`, () => {
      const { body } = readAgent(name);
      for (const part of ['- `Prüfliste:`', '- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei', '"verdicts"', '`erledigt` | `nicht erledigt`',
        'Du suchst keine neuen Findings', '"category": "widerspruch"', '`{"verdicts": [], "findings": []}`', 'Deine letzte Aktion: Schreib dein Ergebnis mit `Write`']) {
        assert.ok(body.includes(part), `${name}: ${part} fehlt`);
      }
      assert.doesNotMatch(body, COLOR_WORD);
      assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
    });
  }
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-verifier_Frontmatter_NameToolsModelDescription`, `plan-review-verifier_Frontmatter_NameToolsModelDescription` (Datei fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/agents/spec-review-verifier.md`:
````markdown
---
name: spec-review-verifier
description: Use when a dv-forge spec-review or review-followup run has reworked a spec.md and needs every checklist item judged done or not done and the changed areas checked for contradictions, without a fresh search.
tools: Read, Write
model: sonnet
---

# Spec-Review: Nachprüfer

Du prüfst nach, du suchst nicht neu. Du liest nur die Spec und die Prüfliste aus dem Auftrag. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf. Du änderst keine Datei außer deiner Ergebnisdatei.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Prüfliste:` Datei mit den Punkten unter `## Punkte` (je Punkt `### <Stelle>` und die Findings dazu) und den Stellen unter `## Geänderte Bereiche`
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Auftrag
1. Je Punkt genau ein Urteil: `erledigt`, wenn die Spec an dieser Stelle das Finding jetzt auflöst oder die beantwortete Frage umsetzt, sonst `nicht erledigt`. `rationale` nennt in einem Satz, woran du das festmachst.
2. Je geändertem Bereich prüfst du nur, ob der neue Text dem Rest der Spec widerspricht. Jeder Widerspruch ist ein Finding der Kategorie `widerspruch` an diesem Bereich.
3. Sonst meldest du nichts. Du suchst keine neuen Findings, auch nicht an den Punkten.
4. Einträge der Form `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` sind bindende Entscheidungen des Menschen. Text, der einem W-Eintrag folgt, ist kein Widerspruch.

## Ausgabe
Deine letzte Aktion: Schreib dein Ergebnis mit `Write` als JSON an den Pfad aus `Ergebnis:`. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "verdicts": [
    { "location": "AC-04", "verdict": "erledigt", "rationale": "AC-04 nennt jetzt den Fall ohne Eingabe." }
  ],
  "findings": [
    {
      "location": "Deckel",
      "quote": "wörtliches Zitat aus dem geänderten Bereich",
      "category": "widerspruch",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Welcher Satz dem neuen Text widerspricht"
    }
  ]
}
```

- `location` eines Urteils ist exakt die Überschrift des Punkts ohne `###`.
- `verdict`: `erledigt` | `nicht erledigt`.
- Findings: alle Felder Strings und Pflicht, keines leer, kein Feld `severity`.
- Ohne Punkte und ohne Widerspruch schreibst du genau diese Form: `{"verdicts": [], "findings": []}`.
````
  `plugins/forge/agents/plan-review-verifier.md`:
````markdown
---
name: plan-review-verifier
description: Use when a dv-forge plan-review or review-followup run has reworked a plan.md and needs every checklist item judged done or not done against spec and code and the changed areas checked for contradictions, without a fresh search.
tools: Read, Grep, Glob, Write
model: sonnet
---

# Plan-Review: Nachprüfer

Du prüfst nach, du suchst nicht neu. Du liest Plan, Spec, die Prüfliste und, wo ein Punkt es verlangt, den Code im Repo, nur lesend. Du änderst keine Datei außer deiner Ergebnisdatei. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu
- `Prüfliste:` Datei mit den Punkten unter `## Punkte` (je Punkt `### <Stelle>` und die Findings dazu) und den Stellen unter `## Geänderte Bereiche`
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Auftrag
1. Je Punkt genau ein Urteil: `erledigt`, wenn der Plan an dieser Stelle das Finding jetzt auflöst, sonst `nicht erledigt`. Beruft sich die Lösung auf ein Symbol oder eine Datei, prüfst du sie im Code nach. `rationale` nennt in einem Satz, woran du das festmachst.
2. Je geändertem Bereich prüfst du nur, ob der neue Text dem Rest des Plans oder der Spec widerspricht. Jeder Widerspruch ist ein Finding der Kategorie `widerspruch` an diesem Bereich.
3. Sonst meldest du nichts. Du suchst keine neuen Findings, auch nicht an den Punkten.
4. W-Einträge in Spec und Plan sind bindende Entscheidungen des Menschen. Text, der einem W-Eintrag folgt, ist kein Widerspruch.

## Ausgabe
Deine letzte Aktion: Schreib dein Ergebnis mit `Write` als JSON an den Pfad aus `Ergebnis:`. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "verdicts": [
    { "location": "Task 3", "verdict": "nicht erledigt", "rationale": "Schritt 3 ruft weiter die entfernte Funktion auf." }
  ],
  "findings": [
    {
      "location": "Task 5",
      "quote": "wörtliches Zitat aus dem geänderten Bereich",
      "category": "widerspruch",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Welcher Satz dem neuen Text widerspricht"
    }
  ]
}
```

- `location` eines Urteils ist exakt die Überschrift des Punkts ohne `###`.
- `verdict`: `erledigt` | `nicht erledigt`.
- Findings: alle Felder Strings und Pflicht, keines leer, kein Feld `severity`.
- Ohne Punkte und ohne Widerspruch schreibst du genau diese Form: `{"verdicts": [], "findings": []}`.
````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-verifier.md plugins/forge/agents/plan-review-verifier.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): add verifier agents for round two of spec and plan review"`

---

### Task 15: Nacharbeit und Scout im neuen Ablauf

**ACs:** AC-13, AC-14, AC-15, AC-17, AC-36, AC-37, AC-40, AC-41, AC-53

**Dateien:**
- Modify: `plugins/forge/agents/spec-rework.md` · `name: spec-rework` (Schritt 3 ersetzt die ganze Datei)
- Modify: `plugins/forge/agents/plan-rework.md` · `name: plan-rework` (Schritt 3 ersetzt die ganze Datei)
- Modify: `plugins/forge/agents/spec-review-scout.md` · `## Auftrag`
- Modify: `plugins/forge/agents/plan-review-scout.md` · `## Auftrag`
- Test: `plugins/forge/tests/agents.test.js` · `reworkAndScouts_Body_ReadFindingsFromAggregateFile`

**Interfaces:**
- Consumes: `nacharbeit-eingabe.md`, `rework.json`, `antworten.json` aus Task 7 und 8; `scout-eingabe.md` aus Task 7 und 9.
- Produces: `dv-forge:spec-rework` und `dv-forge:plan-rework` nehmen `Eintrag: R<n>` und bearbeiten nur die 🔴-Stellen; `spec-rework` bündelt Fragen (`questions`) und trägt `Antworten des Menschen:` als W-Einträge ein. Die Scouts bearbeiten genau die Gruppen ihrer Eingabe.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js`:
  - Im Test `spec-rework_Body_DefinesDecisionEntryFormat` wird `'- **R<r> · <Stelle>** — geändert | nicht geändert | frage an den menschen — <Begründung oder Frage>'` zu `'- **R<n> · <Stelle>** — geändert | nicht geändert | frage an den menschen — <Begründung oder Frage>'`.
  - Im Test `plan-rework_Body_DecisionEntryRenumberingAndJsonResult` wird `'- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>'` zu `'- **R<n> · <Stelle>** — geändert | nicht geändert — <Begründung>'`.
  - Im Test `plan-review-scout_Body_FormatProposalsPreferredAndNoEdits` wird `  assert.match(body, /🟢-Gruppen/);` zu ``   assert.ok(body.includes('1. Du bearbeitest jede Gruppe aus `Findings:`, sonst keine.')); ``.
  - Im Test `reworkAndScouts_Body_ReadFindingsFromAggregateFile` ersetzt du die zweite Schleife durch:
  ```javascript
    for (const name of ['spec-review-scout', 'plan-review-scout']) {
      assert.ok(readAgent(name).body.includes('- `Findings:` Datei mit den Gruppen, zu denen du Vorschläge machst'), name);
    }
    assert.ok(readAgent('implementation-review-scout').body.includes('`Findings:` Datei der letzten Aggregation'));
  ```
  - Ans Ende der Datei hängst du an:
  ```javascript
  test('spec-rework_Body_BundlesQuestionsAndEntersAnswers', () => {
    const { body } = readAgent('spec-rework');
    for (const part of ['- `Eintrag:`', 'Hinweise und 🟢-Findings bekommst du nicht.', '## Fragen bündeln', 'Jede Stelle mit Frage steht in genau einer gebündelten Frage.',
      'die Unterfälle und eine empfohlene Antwort', '## Antworten eintragen', '„später“ gilt je Frage', 'Antwort auf „R<n> · <Stelle>“', '"questions"', '"status": "answered"']) {
      assert.ok(body.includes(part), `${part} fehlt`);
    }
  });

  test('plan-rework_Body_OnlyRedPlacesAndSpecQuestionWithReason', () => {
    const { body } = readAgent('plan-rework');
    assert.ok(body.includes('- `Eintrag:`'));
    assert.ok(body.includes('Hinweise und 🟢-Findings bekommst du nicht.'));
    assert.ok(body.includes('`reason` ist Pflicht bei `unchanged` und `spec-question`'));
  });

  test('plan-rework_Body_SpecQuestionWrittenAsQuestionToTheHuman', () => {
    const { body } = readAgent('plan-rework');
    assert.ok(body.includes('Bei einer spec-rückfrage lautet er wie jede Frage an den Menschen `- **R<n> · <Stelle>** — frage an den menschen — <Rückfrage>`.'));
    assert.ok(body.includes('Bei `spec-rückfrage` schreibst du zusätzlich den R-Eintrag aus Regel 7.'));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-rework_Body_DefinesDecisionEntryFormat`, `plan-rework_Body_DecisionEntryRenumberingAndJsonResult`, `plan-review-scout_Body_FormatProposalsPreferredAndNoEdits`, `reworkAndScouts_Body_ReadFindingsFromAggregateFile`, `spec-rework_Body_BundlesQuestionsAndEntersAnswers`, `plan-rework_Body_OnlyRedPlacesAndSpecQuestionWithReason`, `plan-rework_Body_SpecQuestionWrittenAsQuestionToTheHuman`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/agents/spec-rework.md` ersetzt du ganz durch:
````markdown
---
name: spec-rework
description: Use when the dv-forge spec-review orchestrator has aggregated reviewer findings for a spec.md and the spec has to be corrected and every handled finding recorded in its decisions section.
tools: Read, Edit, Write
model: opus
---

# Spec-Nacharbeit

Du korrigierst eine Spec an den 🔴-Stellen eines Reviews. Du liest und änderst nur die Spec, deren Pfad im Auftrag steht, und schreibst deine Ergebnisdateien. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Eintrag:` Kennung deiner R-Einträge, z. B. `R3`; im Folgenden `R<n>`
- `Findings:` Datei mit den 🔴-Stellen nach `=== REWORK ===`, je Stelle `### 🔴 <Stelle> (<Reviewer>)`, die Einzel-Findings und die Scout-Vorschläge; danach unter `## Offene Fragen` die offenen Fragen früherer Läufe
- `Vorschläge:` nur im Folge-Modus, statt `Findings:`: Datei mit den gewählten Gruppen, je Gruppe Überschrift `### <g> · <Stufe> <Stelle> (<Reviewer>)`, Einzel-Findings, `Gewählt: Vorschlag <n>` und dessen Text
- `Antworten des Menschen:` nur nach dem Anhalten, wörtlich aus dem Chat
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Regeln
1. Du bearbeitest jede Stelle aus `Findings:`, sonst keine. Hinweise und 🟢-Findings bekommst du nicht.
2. Pro Stelle entscheidest du genau eines: **geändert**, **nicht geändert** oder **frage an den menschen**. „Nicht geändert“ ist nur mit einer Begründung aus der Spec selbst erlaubt, etwa weil das Finding auf einer Fehllesung beruht oder weil es einer bestehenden Entscheidung widerspricht und diese trägt. Die Scout-Vorschläge sind eine Hilfe; du bist nicht an sie gebunden.
3. Vor jeder Änderung prüfst du, was sie ist. Eine **Klarstellung** schärft, was die Spec schon festlegt: Wortlaut, Messbarkeit, ein Widerspruch, dessen Auflösung aus der Spec folgt. Die schreibst du. Legt die Lösung dagegen **neues Verhalten** fest, das die Spec nicht trägt (ein neuer Fall, eine neue Regel, ein neues AC), entscheidet das nur der Mensch: Du änderst die Spec an dieser Stelle nicht und schreibst `frage an den menschen` mit der Frage und den naheliegenden Antworten.
4. Die Spec bleibt beim WAS und in sich abgeschlossen: keine Verweise auf andere Dokumente, keine Klassen-, Datei- oder Tabellennamen.
5. AC-IDs werden nie umnummeriert. Ein neues AC bekommt die nächste freie Nummer. Ein gestrichenes AC bleibt als `- **AC-xx** (entfällt, siehe Entscheidungen)` stehen.
6. Der Abschnitt `## Entscheidungen` muss nicht der letzte Abschnitt der Spec sein. Deine Einträge hängst du ans Ende dieses Abschnitts an, auch wenn danach weitere Abschnitte folgen — nicht ans Ende der Spec. Eine Überschrift der zweiten Ebene, die auf „Entscheidungen“ endet, zählt als dieser Abschnitt. Fehlt er, legst du ihn direkt vor `## Offen, bewusst nicht weiterverfolgt (Abbruch)` an, wenn es diesen Abschnitt gibt, sonst am Ende der Spec. Bestehende Einträge löschst du nie.
7. Pro Stelle schreibst du genau einen Eintrag in diesem Format:
   `- **R<n> · <Stelle>** — geändert | nicht geändert | frage an den menschen — <Begründung oder Frage>`
8. Existiert die Stelle nicht in der Spec, lautet der Eintrag `- **R<n> · <Stelle>** — nicht geändert — Stelle existiert nicht`.
9. Einträge der Form `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` sind bindende Entscheidungen des Menschen. Du änderst und entfernst sie nie. Verlangt ein Finding eine Änderung an einem W-Eintrag, lautet dein Eintrag `- **R<n> · <Stelle>** — nicht geändert — W-Eintrag ist bindend`.
10. Einträge des Abschnitts `## Offen, bewusst nicht weiterverfolgt (Abbruch)` löst, änderst oder entfernst du nie; Regel 3 gilt für sie nicht.

## Fragen bündeln
1. Jede Stelle mit Frage bekommt genau einen R-Eintrag `frage an den menschen`, auch wenn eine gebündelte Frage mehrere Stellen nennt.
2. Du bündelst die Fragen je Regel: die Fragen deiner Stellen und jede Frage unter `## Offene Fragen`. Jede Stelle mit Frage steht in genau einer gebündelten Frage.
3. Jede gebündelte Frage nennt die Regel, die Frage, alle betroffenen Stellen, die Unterfälle und eine empfohlene Antwort.

## Antworten eintragen
Bekommst du `Antworten des Menschen:`, bearbeitest du nur diese Antworten.
1. Je Stelle mit Frage entscheidest du: beantwortet oder offen. Offen bleibt eine Frage ohne Antwort, mit unklarer Antwort oder mit „später“; „später“ gilt je Frage. Beantwortet eine Antwort nur einen Teil der Stellen einer gebündelten Frage, gilt nur dieser Teil als beantwortet.
2. Je beantworteter Stelle schreibst du ans Ende des Abschnitts Entscheidungen einen Eintrag `- **W · <Stelle>** · Aussage — Antwort auf „R<n> · <Stelle>“: <Antwort>` und passt die Spec an die Antwort an. Nennt ein W-Eintrag mehrere Stellen, trägt er jede im Titel und jeden R-Eintrag im Text.
3. Offene Fragen lässt du, wie sie sind.
4. Deine letzte Aktion: Schreib mit `Write` an den Pfad aus `Ergebnis:` je Stelle mit Frage einen Eintrag und antworte danach nur mit `Ergebnis geschrieben: <pfad>`.

```json
{ "results": [ { "location": "AC-04", "status": "answered" }, { "location": "AC-07", "status": "open" } ] }
```

## Folge-Modus
Bekommst du `Vorschläge:` statt `Findings:`, gelten die Regeln oben mit diesen Abweichungen:
1. Du bearbeitest nur die Gruppen dieser Datei, jede mit ihrer Stufe.
2. Du setzt den gewählten Vorschlag um. Scheitert er an der Spec, änderst du die Stelle nicht und begründest das.
3. Statt des R-Eintrags schreibst du pro Gruppe genau einen Eintrag `- **F · <Stelle>** — geändert | nicht geändert | frage an den menschen — Vorschlag <n>: <Begründung>`. Bei `frage an den menschen` schreibst du zusätzlich den R-Eintrag aus Regel 7.
4. Im Ergebnis gilt: `location` ist die `<Stelle>` ohne Gruppennummer und Stufe.
5. Der gewählte Vorschlag ist die Entscheidung des Menschen; Regel 3 greift für ihn nicht. Du setzt ihn um und schreibst `geändert`, auch wenn er neues Verhalten festlegt. `frage an den menschen` schreibst du nur, wenn die Umsetzung über den Vorschlag hinaus weiteres neues Verhalten festlegen müsste.
6. Du bündelst keine Fragen: `questions` bleibt leer.

## Ausgabe
Deine letzte Aktion: Schreib mit `Write` pro bearbeiteter Stelle einen Eintrag als JSON an den Pfad aus `Ergebnis:`, `location` exakt wie in der Überschrift. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{
  "results": [
    { "location": "AC-04", "status": "changed" },
    { "location": "AC-07", "status": "human-question", "reason": "Gilt I auch ohne Eingabe?" }
  ],
  "questions": [
    { "rule": "Leere Eingabe", "question": "Was gilt ohne Eingabe?", "places": ["AC-07"], "cases": ["a) Fehler", "b) Standardwert"], "recommendation": "b) Standardwert" }
  ]
}
```

- `status`: `changed` (geändert) | `unchanged` (nicht geändert) | `human-question` (frage an den menschen).
- `reason` ist Pflicht bei `unchanged` und `human-question`.
- `questions`: die gebündelten Fragen; ohne Fragen `[]`.
````
  `plugins/forge/agents/plan-rework.md` ersetzt du ganz durch:
````markdown
---
name: plan-rework
description: Use when the dv-forge plan-review orchestrator has aggregated reviewer findings for a plan.md and the plan has to be corrected against its spec and the code, with every handled finding recorded in the plan's decisions section.
tools: Read, Grep, Glob, Edit, Write
model: opus
---

# Plan-Nacharbeit

Du korrigierst einen Umsetzungsplan an den 🔴-Stellen eines Reviews. Du änderst nur die Plan-Datei aus dem Auftrag. Spec und Code liest du, um richtig zu korrigieren; du änderst sie nie. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`
- `Repo:` Wurzel des Repos; Pfade im Plan sind relativ dazu
- `Eintrag:` Kennung deiner R-Einträge, z. B. `R3`; im Folgenden `R<n>`
- `Findings:` Datei mit den 🔴-Stellen nach `=== REWORK ===`, je Stelle `### 🔴 <Stelle> (<Reviewer>)`, die Einzel-Findings und die Scout-Vorschläge
- `Vorschläge:` nur im Folge-Modus, statt `Findings:`: Datei mit den gewählten Gruppen, je Gruppe Überschrift `### <g> · <Stufe> <Stelle> (<Reviewer>)`, Einzel-Findings, `Gewählt: Vorschlag <n>` und dessen Text
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

## Regeln
1. Du bearbeitest jede Stelle aus `Findings:`, sonst keine. Hinweise und 🟢-Findings bekommst du nicht.
2. Pro Stelle entscheidest du genau eines:
   - **geändert** — du hast den Plan korrigiert.
   - **nicht geändert** — nur mit einer Begründung aus Plan, Spec oder Code, etwa weil das Finding auf einer Fehllesung beruht.
   - **spec-rückfrage** — das Finding lässt sich nur durch eine Änderung der Spec lösen: Die Spec widerspricht sich, lässt eine Festlegung offen, die der Plan nicht selbst treffen darf, oder verlangt Unmögliches. Der Plan bleibt an dieser Stelle unverändert.
   Die Scout-Vorschläge sind eine Hilfe; du bist nicht an sie gebunden.
3. Der korrigierte Plan hält das Plan-Format ein:
   - Task-Überschriften exakt `### Task <n>: <Komponente>`, `<n>` ganzzahlig und lückenlos ab 1.
   - Jede `Modify`-Zeile nennt nach `·` einen stabilen Anker: ein Symbol oder eine eindeutige Zeichenfolge in der Datei.
   - Jeder Code-Schritt enthält vollständigen Code, jeder Lauf-Schritt einen Befehl oder Tool-Aufruf mit erwarteter Ausgabe, erlaubt laut Projekt-`CLAUDE.md` im Repo.
   - Keine Platzhalter: „TBD“, „TODO“, „später umsetzen“, „passende Fehlerbehandlung ergänzen“, „Tests für das Obige schreiben“, „wie Task N“, Verweise auf nirgends definierte Typen oder Funktionen.
4. Teilst du einen Task oder fügst einen ein, nummerierst du alle Tasks lückenlos neu und ziehst jeden Verweis im Plan nach (`Consumes`, `Produces`, „aus Task n“). Der R-Eintrag nennt die Zuordnung, z. B. `Task 3 → Task 3, Task 4`. R-Einträge früherer Läufe änderst du nicht; ihre Nummern gelten für den Stand ihres Laufs.
5. W-Einträge sind bindende Entscheidungen des Menschen. Du änderst und entfernst sie nie.
6. Am Ende des Plans steht `## Entscheidungen`. Fehlt der Abschnitt, legst du ihn an. Bestehende Einträge löschst du nie.
7. Pro Stelle schreibst du genau einen Eintrag:
   `- **R<n> · <Stelle>** — geändert | nicht geändert — <Begründung>`
   Bei einer spec-rückfrage lautet er wie jede Frage an den Menschen `- **R<n> · <Stelle>** — frage an den menschen — <Rückfrage>`.
8. Bei einem Finding an `AC-<Zahl>` prüfst du das ganze AC aus der Spec gegen den Plan, nicht nur den zitierten Teil, und schließt alle Lücken dieses AC in derselben Nacharbeit.
9. Existiert die Stelle nicht im Plan, lautet der Eintrag `- **R<n> · <Stelle>** — nicht geändert — Stelle existiert nicht`.

## Folge-Modus
Bekommst du `Vorschläge:` statt `Findings:`, gelten die Regeln oben mit diesen Abweichungen:
1. Du bearbeitest nur die Gruppen dieser Datei, jede mit ihrer Stufe.
2. Du setzt den gewählten Vorschlag um. Scheitert er an Spec, Plan oder Code, änderst du die Stelle nicht und begründest das.
3. Statt des R-Eintrags schreibst du pro Gruppe genau einen Eintrag `- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>`. Bei `spec-rückfrage` schreibst du zusätzlich den R-Eintrag aus Regel 7.
4. Im Ergebnis gilt: `location` ist die `<Stelle>` ohne Gruppennummer und Stufe.

## Ausgabe
Deine letzte Aktion: Schreib mit `Write` pro bearbeiteter Stelle einen Eintrag als JSON an den Pfad aus `Ergebnis:`, `location` exakt wie in der Überschrift. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

```json
{ "results": [ { "location": "Task 3", "status": "changed" }, { "location": "Task 5", "status": "spec-question", "reason": "Die Spec legt die Reihenfolge nicht fest." } ] }
```

`status`: `changed` (geändert) | `unchanged` (nicht geändert) | `spec-question` (spec-rückfrage). `reason` ist Pflicht bei `unchanged` und `spec-question`; bei `spec-question` ist er die Rückfrage an den Menschen.
````
  In `plugins/forge/agents/spec-review-scout.md`:
  - `description: Use when a dv-forge spec-review run has finished its last review and the remaining red or yellow findings need one to three concrete solution proposals each, derived from the spec and the existing code, with one proposal recommended.` wird `description: Use when a dv-forge spec-review run hands over red or yellow finding groups that need one to three concrete solution proposals each, derived from the spec and the existing code, with one proposal recommended.`
  - `` Du arbeitest nach dem letzten Review eines `spec-review`-Laufs. `` wird `` Du arbeitest in einem `spec-review`-Lauf, vor der Nacharbeit oder nach der Nachprüfung. ``
  - Die Eingabezeile `` - `Findings:` Datei der letzten Aggregation; du liest den Abschnitt nach `=== REWORK ===` mit Gruppen im Format `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings `` wird `` - `Findings:` Datei mit den Gruppen, zu denen du Vorschläge machst; nach `=== REWORK ===` je Gruppe `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings ``
  - `1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen lässt du weg.` wird `` 1. Du bearbeitest jede Gruppe aus `Findings:`, sonst keine. ``

  In `plugins/forge/agents/plan-review-scout.md`:
  - `description: Use when a dv-forge plan-review run has ended and every remaining red or yellow finding of its last review needs one to three concrete solution proposals, one of them recommended with a reason, before the report goes to the human.` wird `description: Use when a dv-forge plan-review run hands over red or yellow finding groups that need one to three concrete solution proposals each, one of them recommended with a reason.`
  - `Du berätst den Menschen nach dem letzten Review eines Plan-Reviews.` wird `Du berätst in einem Plan-Review, vor der Nacharbeit oder nach der Nachprüfung.`
  - Die Eingabezeile `` - `Findings:` … `` wird wie beim Spec-Scout zu `` - `Findings:` Datei mit den Gruppen, zu denen du Vorschläge machst; nach `=== REWORK ===` je Gruppe `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings ``
  - `1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen lässt du weg.` wird `` 1. Du bearbeitest jede Gruppe aus `Findings:`, sonst keine. ``
  - Die Zeile `` - Gibt es keine 🔴- oder 🟡-Gruppe, steht in der Datei nur `## Scout-Vorschläge` und darunter `Keine offenen Findings.` `` löschst du.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-rework.md plugins/forge/agents/plan-rework.md plugins/forge/agents/spec-review-scout.md plugins/forge/agents/plan-review-scout.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): rework handles red places only and scouts take the groups they are given"`

---

### Task 16: Ablauf-Doku `shared/review-flow/flow.md`

**ACs:** AC-12, AC-18, AC-19, AC-21, AC-22, AC-26, AC-27, AC-29, AC-30, AC-44, AC-46, AC-49, AC-50, AC-53, AC-54

**Dateien:**
- Create: `plugins/forge/shared/review-flow/flow.md`
- Test: `plugins/forge/tests/review-flow-doc.test.js`

**Interfaces:**
- Consumes: Schritte und Ausgabezeilen von `review-flow.js` aus Task 7 bis 10 (Exit 1 mit `dv-forge review-flow: <grund>` aus Task 7); `guard-orchestrator.js pause` aus Task 12; `followup.js save` (bestehend); die Abschnitte `## Rolle` und `## Hintergrund oder Vordergrund` in `plugins/forge/shared/review-loop/loop.md` (bestehend, bleiben unverändert und gelten für beide Abläufe).
- Produces: Bausteine, die ein Orchestrator-Skill nennen muss: `Eingaben`, `Reviewer`, `Beratend`, `Skript-Prüfungen`, `Nacharbeiter`, `Nachprüfer`, `Scout`, `Bericht`; Platzhalter `<DOC>` und `<FLAGS>`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/review-flow-doc.test.js`:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, wordCount } = require('./lib/markdown');

const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');

function section(text, title) {
  const start = text.indexOf(`## ${title}\n`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test('flow_BuildingBlocks_AllNamed', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  for (const block of ['Eingaben', 'Reviewer', 'Beratend', 'Skript-Prüfungen', 'Nacharbeiter', 'Nachprüfer', 'Scout', 'Bericht']) {
    assert.ok(text.includes(`| ${block} |`), `${block} fehlt`);
  }
});

test('flow_Steps_CallEveryReviewFlowCommand', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  for (const command of ['rate <FLAGS> --expect <aktiv>', 'scout-check --dir "<D>"', 'rework-input <FLAGS>', 'rework-check <FLAGS>', 'answers-check <FLAGS>',
    'checklist <FLAGS>', 'verify <FLAGS>', 'report <FLAGS> --titel', 'attempt --dir "<W>" --instanz <name>', 'attempt --dir "<W>" --instanz nacharbeit --art buendelung']) {
    assert.ok(text.includes(`node "<PLUGIN>/scripts/review-flow.js" ${command}`), `${command} fehlt`);
  }
});

test('flow_Retry_RequestRestartFailed', () => {
  // Act
  const retry = section(readText(FLOW), 'Nachfordern');

  // Assert
  for (const part of ['`NACHFORDERN`', '`SendMessage`', '`NEUSTART`', '`AUSGEFALLEN`', 'ohne seine Vorschläge weiter']) assert.ok(retry.includes(part), `${part} fehlt`);
});

test('flow_Pause_ShowsQuestionsPausesGuardAndForwardsAnswers', () => {
  // Act
  const pause = section(readText(FLOW), 'Anhalten');

  // Assert
  for (const part of ['=== FRAGEN ===', 'guard-orchestrator.js" pause <SESSION>', 'Antworten des Menschen: <antwort wörtlich>', 'Ergebnis: <W>/runde-1/antworten.json',
    'der Zähler gilt für die ganze Nacharbeit']) {
    assert.ok(pause.includes(part), `${part} fehlt`);
  }
});

test('flow_Verification_NoReviewerAgainAndNoFurtherRework', () => {
  // Act
  const verification = section(readText(FLOW), 'Nachprüfung');

  // Assert
  for (const part of ['Prüfliste: <W>/runde-2/pruefliste.md', 'Ergebnis: <W>/runde-2/nachpruefung.json', '`NACHPRUEFER nein`: Er startet nicht.',
    'Kein Reviewer läuft ein zweites Mal.', 'Es gibt keine weitere Nacharbeit und keine weitere Runde.', 'Instanz `scout-nachpruefung`']) {
    assert.ok(verification.includes(part), `${part} fehlt`);
  }
});

test('flow_End_ReportSaveCleanupRelease', () => {
  // Act
  const end = section(readText(FLOW), 'Ende');

  // Assert
  const order = ['review-flow.js" report', 'followup.js" save <rolle> <slug> "<W>/abschluss"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>'];
  const positions = order.map((part) => end.indexOf(part));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('flow_Role_ReferencesLoopRulesInsteadOfCopyingThem', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  const role = section(text, 'Rolle');
  for (const part of ['`<PLUGIN>/shared/review-loop/loop.md`', 'Rolle', 'Hintergrund oder Vordergrund', 'gibt die Antwort des Menschen den Hook nicht frei', 'mit Exit 1']) {
    assert.ok(role.includes(part), `${part} fehlt`);
  }
  assert.doesNotMatch(text, /Du orchestrierst, sonst nichts|Nie `run_in_background: true`|der Hook blockt jede Verkettung/);
  assert.match(text, /in EINER Nachricht je aktivem Reviewer einen `Agent`-Call/);
});

test('flow_Text_NoRoundCapOrStandstillLeft', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.doesNotMatch(text, /Cap erreicht|Stillstand|--rounds|hochgestuft/);
  assert.ok(wordCount(text) < 1000);
});
```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-doc.test.js` — erwartet: FAIL `flow_BuildingBlocks_AllNamed` (`ENOENT … flow.md`)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/shared/review-flow/flow.md`:
```markdown
# Review-Ablauf

Gemeinsamer Ablauf von Spec- und Plan-Review: Runde 1 sucht, danach gibt es höchstens eine Nacharbeit, Runde 2 prüft nur nach. Jede Entscheidung trifft `review-flow.js`; du führst aus, was seine Zeilen sagen. `<PLUGIN>` und `<SESSION>` nennt dir der aufrufende Skill. Er legt außerdem fest:

| Baustein | Bedeutung |
|---|---|
| Eingaben | Aufruf von `prepare.js`; er liefert u. a. `W`, `slug` und `aktiv`. Dazu das geprüfte Dokument `<DOC>` und die Rolle |
| Reviewer | Agent-Namen mit ihren Eingaben; ihre Kurznamen bilden `aktiv` |
| Beratend | Kurznamen beratender Reviewer oder „Keine“ |
| Skript-Prüfungen | Befehle, die `<D>/skript-pruefung.json` schreiben, oder „Keine“ |
| Nacharbeiter | Agent-Name und seine Eingaben |
| Nachprüfer | Agent-Name und seine Eingaben |
| Scout | Agent-Name und seine Eingaben |
| Bericht | Titel, Artefakt, Zusatz-Abschnitte, nächster Schritt je Status |

`<FLAGS>` steht für `--review <rolle> --dir "<W>" --doc "<DOC>"`, im Plan-Review dazu `--spec "<S>"`.

## Rolle
Vor Runde 1 liest du `<PLUGIN>/shared/review-loop/loop.md`, Abschnitte „Rolle“ und „Hintergrund oder Vordergrund“. Deine Rolle, die Werkzeuge ohne Verkettung und die Regel für Agents im Vordergrund gelten hier unverändert; sie stehen nur dort. Davon abweichend gilt hier:
- Nach `pause` (siehe „Anhalten“) gibt die Antwort des Menschen den Hook nicht frei, erst seine Eingabe danach.
- Ergebnisse laufen nur über Dateien im Arbeitsbereich `W`.
- Endet ein Aufruf von `review-flow.js` mit Exit 1, gibst du seine Zeile `dv-forge review-flow: <grund>` unverändert aus und führst von „Ende“ nur Schritt 4 aus.

## Nachfordern
Liefert eine Instanz kein gültiges Ergebnis: `node "<PLUGIN>/scripts/review-flow.js" attempt --dir "<W>" --instanz <name>`. `<name>` ist der Kurzname des Reviewers, `nacharbeit`, `nachprüfer`, `scout` oder `scout-nachpruefung`.
- `NACHFORDERN`: per `SendMessage`: `Schreib nur noch dein Ergebnis nach <pfad>, im vereinbarten Format. Grund: <grund>`
- `NEUSTART`: eine frische Instanz mit denselben Eingaben und dem Zusatz `Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>`
- `AUSGEFALLEN`: Reviewer, Nacharbeit und Nachprüfer → „Ende“. Der Scout fällt ohne Folgen aus; der Lauf geht ohne seine Vorschläge weiter.

Danach wiederholst du den Prüfschritt, der das Ergebnis abgelehnt hat.

## Runde 1
`D = <W>/runde-1`.
1. Statuszeile `Runde 1: starte <anzahl> Reviewer (<aktiv>).` Dann in EINER Nachricht je aktivem Reviewer einen `Agent`-Call, jeder als frische Instanz, mit genau den Eingaben aus dem Skill und `Ergebnis: <D>/<kurzname>.json`. Danach die Skript-Prüfungen des Skills.
2. `node "<PLUGIN>/scripts/review-flow.js" rate <FLAGS> --expect <aktiv>`, bei beratenden Reviewern dazu `--beratend <kurznamen>`.
3. Je Zeile `FEHLT <name> — <grund>`: nachfordern, dann Schritt 2.
4. Statuszeile `Runde 1: <red> × 🔴, <yellow> × 🟡, <fragen> offene Fragen.`
5. Zeile `WEITER scout=<s> nacharbeit=<n>`: Ist `s` nicht `keiner`, läuft der Scout mit `D` und Instanz `scout`. Dann bei `n = nein` → „Ende“, sonst → „Nacharbeit“.

## Scout
1. Scout: Eingaben aus dem Skill, dazu `Findings: <D>/scout-eingabe.md` und `Ergebnis: <D>/scout.md`. Du bewertest die Vorschläge nicht.
2. `node "<PLUGIN>/scripts/review-flow.js" scout-check --dir "<D>"`. `SCOUT ungültig: <grund>`: nachfordern, dann Schritt 2.

## Nacharbeit
Genau eine je Lauf.
1. `node "<PLUGIN>/scripts/review-flow.js" rework-input <FLAGS>`. Die Zeile `EINTRAG R<n>` nennt die Kennung der Einträge.
2. Statuszeile `Nacharbeit läuft.` Nacharbeiter: Eingaben aus dem Skill, dazu `Eintrag: R<n>`, `Findings: <W>/runde-1/nacharbeit-eingabe.md` und `Ergebnis: <W>/runde-1/rework.json`.
3. `node "<PLUGIN>/scripts/review-flow.js" rework-check <FLAGS>`:
   - `NACHARBEIT ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`, dann Schritt 3.
   - `BUENDELUNG fehlerhaft: <grund>`: `node "<PLUGIN>/scripts/review-flow.js" attempt --dir "<W>" --instanz nacharbeit --art buendelung`. `KORRIGIEREN`: per `SendMessage` `Deine Bündelung der Fragen ist fehlerhaft: <grund>. Korrigier questions in <W>/runde-1/rework.json.`, dann Schritt 3. `AUSGEFALLEN` → „Ende“.
   - `NACHARBEIT ok … anhalten=ja` → „Anhalten“.
   - `NACHARBEIT ok … anhalten=nein` → „Nachprüfung“.

## Anhalten
1. Gib den Text nach `=== FRAGEN ===` unverändert aus, darunter `Antworte im Chat; „später“ lässt eine Frage offen.`
2. `node "<PLUGIN>/scripts/guard-orchestrator.js" pause <SESSION>`. Dann endet deine Antwort.
3. Nach der Antwort des Menschen: per `SendMessage` an den Nacharbeiter `Antworten des Menschen: <antwort wörtlich>` und `Ergebnis: <W>/runde-1/antworten.json`. Erreicht die Nachricht ihn nicht, gilt das als ungültiges Ergebnis.
4. `node "<PLUGIN>/scripts/review-flow.js" answers-check <FLAGS>`. `ANTWORTEN ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`; der Zähler gilt für die ganze Nacharbeit. Ein Neustart bekommt die Eingaben aus Schritt 2 der Nacharbeit ohne `Findings:`, dazu `Antworten des Menschen: <antwort wörtlich>` und `Ergebnis: <W>/runde-1/antworten.json`. Dann Schritt 4.
5. Weiter mit „Nachprüfung“.

## Nachprüfung
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <FLAGS>`. Statuszeile `Nachprüfung: <punkte> Punkte, <skript> Skript-Punkte, <bereiche> geänderte Bereiche.` Danach die Skript-Prüfungen des Skills mit `D = <W>/runde-2`.
2. `NACHPRUEFER ja`: Nachprüfer mit den Eingaben aus dem Skill, dazu `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/nachpruefung.json`. `NACHPRUEFER nein`: Er startet nicht. Kein Reviewer läuft ein zweites Mal.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <FLAGS>`. `NACHPRUEFUNG ungültig: <grund>`: nachfordern mit Instanz `nachprüfer`, dann Schritt 3.
4. `WEITER scout=hinweise`: Scout mit `D = <W>/runde-2` und Instanz `scout-nachpruefung`.
5. Weiter mit „Ende“. Es gibt keine weitere Nacharbeit und keine weitere Runde.

## Ende
Jedes Ende, auch nach einem Ausfall:
1. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "<Titel>" --artefakt "<Artefakt>"`. Die Zeile `ENDE <status>` wählt den nächsten Schritt.
2. `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`.
3. Bericht im Chat: der Text nach `=== BERICHT ===` unverändert; dann `### Hinweise des Orchestrators` mit jeder `WARN`-Zeile und jeder nachgeforderten oder neu gestarteten Instanz, falls es sie gibt; dann die Zusatz-Abschnitte des Skills; dann die Ausgabe von `save`, außer sie lautet `KEIN SCOUT`; zuletzt `Nächster Schritt: <Text des Skills für den Status>`. Nichts committen.
4. `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.
```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-doc.test.js` — erwartet: PASS (8 Tests)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/shared/review-flow/flow.md plugins/forge/tests/review-flow-doc.test.js` · `git commit -m "docs(forge): describe the shared two-round flow for spec and plan review"`

---

### Task 17: Spec- und Plan-Review folgen dem neuen Ablauf

**ACs:** AC-12, AC-18, AC-19, AC-26, AC-27, AC-29, AC-30, AC-31, AC-44

**Dateien:**
- Modify: `plugins/forge/skills/spec-review/SKILL.md` · `name: spec-review` (Schritt 3 ersetzt die ganze Datei)
- Modify: `plugins/forge/skills/plan-review/SKILL.md` · `name: plan-review` (Schritt 3 ersetzt die ganze Datei)
- Modify: `plugins/forge/shared/review-loop/loop.md` · `Gemeinsamer Ablauf aller dv-forge-Orchestrator-Skills.`
- Modify: `plugins/forge/tests/skill.test.js` · `const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');` (Schritt 1 ersetzt die ganze Datei)
- Modify: `plugins/forge/tests/plan-review-skill.test.js` · `const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');` (Schritt 1 ersetzt die ganze Datei)
- Test: `plugins/forge/tests/review-loop.test.js` · `findingFormat_Generic_LocationKeysIncludeTask`

**Interfaces:**
- Consumes: `flow.md` und seine Bausteine (Task 16); Agenten aus Task 13 bis 15; `prepare.js` ohne `N` (Task 11).
- Produces: `/dv-forge:spec-review <spec.md> [quelle.md] [--only …]` und `/dv-forge:plan-review <plan.md> [spec.md] [--only …]` nach `shared/review-flow/flow.md`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  `plugins/forge/tests/skill.test.js` ersetzt du ganz durch:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');
const AGENTS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => `dv-forge:spec-review-${name}`);

test('skill_Frontmatter_ManualOnlyWithoutRoundsArgument', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'spec-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md> [quelle.md] [--only <reviewer,...>]');
});

test('skill_Body_DefinesPluginRootSessionAndReadsSharedFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS'));
  assert.ok(!body.includes('review-loop/loop.md'));
});

test('skill_Body_NamesEveryBuildingBlockOfTheFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const agent of [...AGENTS, 'dv-forge:spec-rework', 'dv-forge:spec-review-verifier', 'dv-forge:spec-review-scout']) assert.ok(body.includes(agent), `${agent} fehlt`);
  for (const heading of ['## Beratend\nKeine.', '## Skript-Prüfungen\nKeine.', '## Nachprüfer\n`dv-forge:spec-review-verifier`', '## Scout\n`dv-forge:spec-review-scout`']) {
    assert.ok(body.includes(heading), `${heading} fehlt`);
  }
  assert.ok(body.includes('Dokument `<DOC>` = `<S>`, Rolle `spec-review`'));
});

test('skill_Body_ProfilesReviewerGetsIndexAndExcerpt', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`Profil-Index: <PI>`'));
  assert.ok(body.includes('`Profil-Auszug: <PA>`'));
});

test('skill_Body_NextStepPerStatus', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const status of ['- `Fragen offen`:', '- `sauber nach Runde 1` und `sauber nach Nachprüfung`:', '- `nicht bereit, …`:', '- `unvollständig, …`:']) assert.ok(body.includes(status), `${status} fehlt`);
  assert.ok(body.includes('/dv-forge:plan-writing <S>'));
  assert.ok(body.includes('Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.'));
  assert.ok(body.includes('`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`'));
  assert.match(body, /Spec nicht bereit/);
});

test('skill_Body_NoRoundCapOrOldStops', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.doesNotMatch(body, /--rounds|Cap erreicht|Stillstand|rework-outcome\.js|Zusatz-Stopps|Abschluss-Scout/);
});

test('skill_Body_StaysUnder500WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 500);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});
```
  `plugins/forge/tests/plan-review-skill.test.js` ersetzt du ganz durch:
```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');
const REVIEWERS = ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'];

test('planReviewSkill_Frontmatter_ManualOnlyWithoutRoundsArgument', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'plan-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>]');
});

test('planReviewSkill_Body_ReadsSharedFlowWithPlaceholders', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS'));
});

test('planReviewSkill_Body_NamesEveryBuildingBlockOfTheFlow', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:plan-review-${reviewer}`), `${reviewer} fehlt`);
  for (const heading of ['## Beratend\nKeine.', '## Skript-Prüfungen\nKeine.', '## Nacharbeiter\n`dv-forge:plan-rework`', '## Nachprüfer\n`dv-forge:plan-review-verifier`', '## Scout\n`dv-forge:plan-review-scout`']) {
    assert.ok(body.includes(heading), `${heading} fehlt`);
  }
  assert.ok(body.includes('`aktiv` kommt aus `prepare.js`'));
  assert.ok(body.includes('Du startest genau die Reviewer aus `aktiv`'));
  assert.ok(body.includes('Dokument `<DOC>` = `<P>`, Rolle `plan-review`'));
});

test('planReviewSkill_Body_AnchorFileAndCommandsGoToReviewers', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('die Anker-Datei `A`'));
  assert.ok(body.includes('jede `WARN`-Zeile kommt in die Hinweise des Orchestrators'));
  assert.ok(body.includes('Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.'));
  assert.ok(body.includes('`Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`'));
});

test('planReviewSkill_Body_SpecQuestionDoesNotPause', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Eine Spec-Rückfrage hält den Lauf nicht an'));
  assert.ok(body.includes('- `Fragen offen`: `Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`'));
});

test('planReviewSkill_Body_CleanReportHandsOverToImplementation', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('/dv-forge:implementation <P>'));
  assert.match(body, /frischen Session/);
  assert.match(body, /Soll ich Spec und Plan jetzt committen\?/);
  assert.ok(body.includes('forge-config.js" get Commit-Konvention'));
  assert.ok(body.includes('git status --porcelain -- "<S>" "<P>"'));
  assert.match(body, /Leere Ausgabe: keine Frage/);
});

test('planReviewSkill_Body_NextStepOffersReviewFollowup', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('/dv-forge:review-followup <P> <auswahl>'));
  assert.ok(body.includes('Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.'));
  assert.ok(body.includes('`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`'));
});

test('planReviewSkill_Body_NoRoundCapOrOldStops', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.doesNotMatch(body, /--rounds|Cap erreicht|Stillstand|rework-outcome\.js|Zusatz-Stopps|Abschluss-Scout/);
});

test('planReviewSkill_Body_StaysUnder500Words', () => {
  // Act
  const words = wordCount(readMarkdown(SKILL).body);

  // Assert
  assert.ok(words < 500, `${words} Wörter`);
});
```
  In `plugins/forge/tests/review-loop.test.js` fügst du direkt vor dem Test `findingFormat_Generic_LocationKeysIncludeTask` ein:
  ```javascript
  test('loop_Intro_PointsSpecAndPlanToSharedFlow', () => {
    const text = readText(path.join(SHARED, 'loop.md'));
    assert.ok(text.includes('Spec- und Plan-Review folgen `shared/review-flow/flow.md`.'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/review-loop.test.js` — erwartet: FAIL `skill_Frontmatter_ManualOnlyWithoutRoundsArgument`, `planReviewSkill_Frontmatter_ManualOnlyWithoutRoundsArgument`, `loop_Intro_PointsSpecAndPlanToSharedFlow` und die übrigen neuen Skill-Tests
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/skills/spec-review/SKILL.md` ersetzt du ganz durch:
```markdown
---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review of parallel reviewers, one rework and one verification round, with a script deciding colors, stops and status.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--only <reviewer,...>]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm. Hier steht nur, was für die Spec gilt. Du liest die Spec nicht.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Spec `S`, Projektwurzel `R`, Arbeitsbereich `W`, `slug`, `art` (`frei`/`verankert`), `profile` (`ja`/`nein`), `aktiv`, bei `ja` den Profil-Index `PI` und den Pfad des Profil-Auszugs `PA`, falls angegeben die Quelle `Q` und je Warnung eine Zeile `WARN`.
2. Jede `WARN`-Zeile kommt in die Hinweise des Orchestrators. Du liest weder Profile noch Index.
3. `aktiv` kommt aus `prepare.js`: alle Reviewer, mit `--only` nur die genannten; `profiles` nur bei `profile=ja`. Du startest genau die Reviewer aus `aktiv`. Dokument `<DOC>` = `<S>`, Rolle `spec-review`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>`, `Profil-Index: <PI>`, `Profil-Auszug: <PA>`, `Repo: <R>`; nur bei `profile=ja`

Bei `art=frei` prüfen alle Reviewer nur die innere Stimmigkeit; `profile` ist dann immer `nein`.

## Beratend
Keine.

## Skript-Prüfungen
Keine.

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>`

## Nachprüfer
`dv-forge:spec-review-verifier` — `Spec: <S>`

## Scout
`dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`

## Bericht
Titel `Spec-Review`, Artefakt `<S>`.

Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

Nächster Schritt:
- `Fragen offen`: `Offene Fragen beantworten: /dv-forge:spec-review <S> erneut; der Lauf stellt sie wieder.`
- `sauber nach Runde 1` und `sauber nach Nachprüfung`: Zeigt der Bericht Scout-Vorschläge, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.` und der Auswahl-Hinweis. Dann `Spec ist bereit. Spec committen, dann in einer frischen Session:` und darunter in einem Code-Block `/dv-forge:plan-writing <S>`.
- `nicht bereit, …`: `Spec nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <S> <auswahl> oder Spec selbst anpassen und /dv-forge:spec-review <S> erneut.` und der Auswahl-Hinweis.
- `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
```
  `plugins/forge/skills/plan-review/SKILL.md` ersetzt du ganz durch:
```markdown
---
name: plan-review
description: Use when a dv-forge plan.md should run through the review of parallel reviewers against its spec and the code, one rework and one verification round, with a script deciding colors, stops and status.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--only <reviewer,...>]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Plan `P`, Spec `S`, Repo `R`, Arbeitsbereich `W`, `slug`, `aktiv`, die erlaubten Befehle `Build`, `Test`, `Lint`, die Anker-Datei `A` und je Warnung eine Zeile `WARN`; jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.
2. `aktiv` kommt aus `prepare.js`: alle fünf Reviewer, mit `--only` nur die genannten. Du startest genau die Reviewer aus `aktiv`. Dokument `<DOC>` = `<P>`, Rolle `plan-review`.

## Reviewer
Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.

- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`, `Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`

## Beratend
Keine.

## Skript-Prüfungen
Keine.

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nachprüfer
`dv-forge:plan-review-verifier` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Bericht
Titel `Plan-Review`, Artefakt `<P>`. Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen.

Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

Nächster Schritt:
- `Fragen offen`: `Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`
- `sauber nach Runde 1` und `sauber nach Nachprüfung`: Zeigt der Bericht Scout-Vorschläge, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis. Nach dem Freigeben des Guards `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: keine Frage, beide sind committet; weiter mit dem Code-Block `/dv-forge:implementation <P>` wie unten. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`.
- `nicht bereit, …`: `Plan nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.` und der Auswahl-Hinweis.
- `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
```
  In `plugins/forge/shared/review-loop/loop.md` wird `Gemeinsamer Ablauf aller dv-forge-Orchestrator-Skills.` zu `` Ablauf des Implementierungs-Reviews; Spec- und Plan-Review folgen `shared/review-flow/flow.md`. Die Abschnitte „Rolle“ und „Hintergrund oder Vordergrund“ gelten für beide Abläufe. ``
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/review-loop.test.js plugins/forge/tests/implementation-review-skill.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/spec-review/SKILL.md plugins/forge/skills/plan-review/SKILL.md plugins/forge/shared/review-loop/loop.md plugins/forge/tests/skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/review-loop.test.js` · `git commit -m "feat(forge): spec and plan review follow the shared two-round flow"`

---

### Task 18: Review-Followup prüft nach Spec- und Plan-Review nur nach

**ACs:** AC-32, AC-52

**Dateien:**
- Modify: `plugins/forge/skills/review-followup/SKILL.md` · `name: review-followup` (Schritt 3 ersetzt die ganze Datei)
- Modify: `plugins/forge/skills/review-followup/references/flow.md` · `# Review-Followup: Ablauf im Einzelnen` (Schritt 3 ersetzt die ganze Datei)
- Test: `plugins/forge/tests/review-followup-skill.test.js` · `reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation`

**Interfaces:**
- Consumes: `review-flow.js snapshot`, `rework-check`, `checklist`, `verify`, `report` mit `--quelle nacharbeit` (Task 7 bis 10); Nachprüfer (Task 14); Nacharbeiter im Folge-Modus (Task 15); `flow.md` Abschnitte Nachfordern und Scout (Task 16); `prepare.js review-followup` (bestehend, schreibt `<W>/nacharbeit/aggregate.md`).
- Produces: `/dv-forge:review-followup` endet nach Spec- und Plan-Review mit `ENDE <status>` nach derselben Rangfolge wie das Review; das Implementierungs-Review bleibt unverändert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/review-followup-skill.test.js`:
  - Im Test `reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde` wird `'genau eine Runde',` zu `'Nachprüfung, genau eine', 'kein Reviewer läuft', 'shared/review-flow/flow.md',`.
  - Den Test `reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation` ersetzt du durch:
  ```javascript
  test('reviewFollowupFlow_Reference_SpecAndPlanWithoutReviewerRound', () => {
    const text = readText(FLOW);
    assert.doesNotMatch(text, /--expect <aktiv>|--round 1|plan-tasks\.js" anchors/);
  });

  test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
    assert.ok(fs.existsSync(FLOW));
    const text = readText(FLOW);
    for (const part of ['Vorschläge: <F>', 'Eintrag: R<n>', 'Ergebnis: <W>/nacharbeit/rework.json', '--quelle nacharbeit', 'review-flow.js" snapshot --dir "<W>" --doc "<DOC>"',
      'review-flow.js" rework-check <FLAGS>', 'review-flow.js" checklist <FLAGS>', 'review-flow.js" verify <FLAGS>', 'review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)"',
      'Prüfliste: <W>/runde-2/pruefliste.md', 'Kein Reviewer läuft.', 'followup.js" save <rolle> <slug> "<W>/abschluss"', 'followup.js" drop <rolle> <slug>',
      'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"', 'followup.js" drop review <slug>', 'Kein Scout', 'nicht gewählt',
      'bleibt die alte Sicherung', '### Umgesetzt', 'WAHL', 'keine Änderung', 'blockiert', '- `Fragen offen`:', '- `nicht bereit, …`:', '- `unvollständig, …`:']) {
      assert.ok(text.includes(part), `${part} fehlt`);
    }
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-followup-skill.test.js` — erwartet: FAIL `reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde`, `reviewFollowupFlow_Reference_SpecAndPlanWithoutReviewerRound`, `reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/skills/review-followup/SKILL.md` ersetzt du ganz durch:
```markdown
---
name: review-followup
description: Use when chosen scout proposals from a finished dv-forge spec-review, plan-review or implementation-review should be applied by the rework agent or the implementer and then verified once, without a fresh search by the reviewers.
disable-model-invocation: true
argument-hint: <spec.md|plan.md> <auswahl>
---

# Review-Followup (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Du orchestrierst wie in `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md`, Abschnitt Rolle: Du liest weder Artefakt, Spec noch Code, bewertest nichts und änderst nichts selbst; ein Hook blockt das. Plugin-Dateien liest du mit `Read`, jedes Skript startest du als einzelnen `node`-Aufruf ohne Verkettung. Die Einzelheiten jedes Schritts stehen in `${CLAUDE_PLUGIN_ROOT}/skills/review-followup/references/flow.md`; lies die Datei vor Schritt 1.

Auswahl: `b` = bevorzugter Vorschlag je Gruppe, `<n>` = Vorschlag n überall, `<g>:<n|b>,…` = je Gruppe; die Gruppen-Nummern stehen im Scout-Abschnitt des letzten Berichts. Optional `--spec <pfad>` und `--base <ref>` wie beim Original-Review.

## Ablauf
1. **Eingaben:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst Zeilen `<Name>=<Wert>` wie beim Original-Review, dazu `original` (die Art des Original-Reviews), `F`, `gruppen`, `offen` (nicht gewählte Gruppen), je Gruppe `WAHL` und bei `original=implementation-review` `FIX_BASE`. Jede `WARN`-Zeile kommt in die Hinweise.
2. **Original lesen:** `Read` auf `${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md`. Von dort nimmst du die Eingabezeilen der Abschnitte Nacharbeiter, Nachprüfer und Scout, bei `implementation-review` des Abschnitts Abschluss-Scout, sowie die Texte für `Nächster Schritt`.
3. **Umsetzen:** bei `spec-review` und `plan-review` der Nacharbeiter des Original-Skills im Folge-Modus, bei `implementation-review` `dv-forge:implementation-implementer`, wie in `flow.md`.
4. **Nachprüfung, genau eine:** bei `spec-review` und `plan-review` der Nachprüfer des Original-Skills; kein Reviewer läuft. Bei `implementation-review` `dv-forge:implementation-re-reviewer` auf das Fix-Diff. Beides wie in `flow.md`.
5. **Bericht** mit Titel `Review-Followup (<original>)`, Artefakt das erste Argument, Status, Abschnitten und nächstem Schritt laut `flow.md`. Du committest nichts.
6. **Ende**, auch nach einem Fehler: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove <rolle> <slug>` mit der Rolle des Original-Reviews (`spec-review`, `plan-review` oder `review`), dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`.

Alle Agents laufen mit `run_in_background: false`.
```
  `plugins/forge/skills/review-followup/references/flow.md` ersetzt du ganz durch:
```markdown
# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `original`, `offen`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht. Bei Spec und Plan gilt: `<DOC>` ist `<S>` bei `original=spec-review` und `<P>` bei `original=plan-review`; `<FLAGS>` = `--review <original> --dir "<W>" --doc "<DOC>" --quelle nacharbeit`, bei `plan-review` dazu `--spec "<S>"`. Nachfordern und den Scout führst du aus wie in `<PLUGIN>/shared/review-flow/flow.md`, Abschnitte Nachfordern und Scout.

## Umsetzen

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" snapshot --dir "<W>" --doc "<DOC>"`. Die Zeile `EINTRAG R<n>` nennt die Kennung der Einträge.
2. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, dazu `Eintrag: R<n>`, `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
3. `node "<PLUGIN>/scripts/review-flow.js" rework-check <FLAGS>`. `NACHARBEIT ungültig: <grund>`: nachfordern mit Instanz `nacharbeit`, dann Schritt 3.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise.

## Nachprüfung

### Spec und Plan
1. `node "<PLUGIN>/scripts/review-flow.js" checklist <FLAGS>`.
2. `NACHPRUEFER ja`: Nachprüfer des Original-Skills mit dessen Eingabezeilen, dazu `Prüfliste: <W>/runde-2/pruefliste.md` und `Ergebnis: <W>/runde-2/nachpruefung.json`. Kein Reviewer läuft.
3. `node "<PLUGIN>/scripts/review-flow.js" verify <FLAGS>`. `NACHPRUEFUNG ungültig: <grund>`: nachfordern mit Instanz `nachprüfer`, dann Schritt 3.
4. `WEITER scout=hinweise`: Scout des Original-Skills mit `D = <W>/runde-2` und Instanz `scout-nachpruefung`.
5. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)" --artefakt "<artefakt>"`. Die Zeile `ENDE <status>` ist der Status; der Text nach `=== BERICHT ===` ist der Bericht.
6. Sicherung: Lief ein Scout, `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe ist der Scout-Abschnitt des Berichts. Lief keiner und ist `offen` nicht leer, entfällt `save`: Dann bleibt die alte Sicherung, und die Gruppen aus `offen` bleiben mit ihren Nummern wählbar. Lief keiner und ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop <rolle> <slug>`.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit dem Bericht.
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. Ist `offen` leer: `node "<PLUGIN>/scripts/followup.js" drop review <slug>`. Sonst bleibt die alte Sicherung. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, Gruppen <offen> nicht gewählt`; sonst `offen nach Nach-Review`.

## Bericht
- Spec und Plan: der Bericht aus `report`, dann `### Hinweise des Orchestrators`, falls vorhanden, dann `### Umgesetzt` mit je `WAHL`-Zeile einem Punkt `- <WAHL>`, dann der Scout-Abschnitt aus Schritt 6.
- Implementierung: nach `<PLUGIN>/shared/review-loop/report-format.md` mit `**Reviews:** 1 · **Nacharbeiten:** 1`, ohne Nach-Review `**Reviews:** 0 · **Nacharbeiten:** 1`; `### Letztes Review` ist die Antwort des Re-Reviewers unverändert; dazu `### Umgesetzt` wie oben.

## Nächster Schritt
- `sauber nach Nachprüfung` oder `sauber nach Nach-Review`, `offen` leer: der Text des Original-Skills für `sauber`, bei Plan einschließlich der Commit-Prüfung.
- `sauber …` mit `offen` nicht leer: `Gruppen <offen> noch nicht umgesetzt: /dv-forge:review-followup <artefakt> <g>:<n|b>,… mit den bisherigen Nummern.`
- `Fragen offen`: der Text des Original-Skills für `Fragen offen`.
- `nicht bereit, …`: `Noch offen. Scout-Vorschläge oben lesen, dann /dv-forge:review-followup <artefakt> <auswahl> oder das volle Review erneut.` War `offen` nicht leer und lief ein Scout, zusätzlich `Nicht gewählte Gruppen findet nur das volle Review erneut.`
- Implementierung offen, `keine Änderung` oder `blockiert`: `/dv-forge:implementation-review <P> erneut.`
- `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS bis auf die zwei bekannten Fehlschläge aus Global Constraints
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/review-followup/SKILL.md plugins/forge/skills/review-followup/references/flow.md plugins/forge/tests/review-followup-skill.test.js` · `git commit -m "feat(forge): review-followup only verifies after spec and plan review"`

## Entscheidungen
- **W · Plan-Basis** · Aussage — Neu planen gegen die Spec-Basis `3ce509e`, als wäre nichts umgesetzt; der betroffene Code wurde in diesem Stand gelesen. Die Umsetzung setzt auf einem Checkout mit Stand `3ce509e` auf.
- **W · Plan-Pfad** · Aussage — Der neue Plan liegt als `plan-neu.md` neben dem bestehenden `plan.md`, der unverändert bleibt.
- **W · Skript-Prüfungen** · Aussage — Nur die Mechanik: Der Ablauf nimmt Befunde aus `<D>/skript-pruefung.json` entgegen; kein Review liefert heute eine Skript-Prüfung (beide Skills: „Keine“). Die ACs dazu belegen Tests mit Beispieldaten.
- **W · Berichtsform** · Aussage — `review-flow.js` rendert den Bericht in festen Abschnitten (Status, Runden/Nacharbeiten, Runde 1 als Tabelle mit Kategorie, Nachprüfung als Tabelle Stelle/Urteil, Widersprüche, offene Fragen, Anmerkungen 🟢, Scout-Vorschläge über `followup.js save`); die Fragen beim Anhalten erscheinen als nummerierte Blöcke `**Frage <i> — <Regel>**` mit `Stellen:`, `Unterfälle:`, `Empfehlung:`.
- **W · Planungs-Skills** · Aussage — Es gelten `unit-integration-testing`, `software-design-principles` und `superpowers:writing-skills`.
- **E · Farbe im Finding** · Planer — Eine Farbe im Finding ist ein Feld `severity`; eine Farbangabe in `category` ist eine unbekannte Kategorie. Grund: `severity` ist das bisherige Farbfeld aller Reviewer.
- **E · Kopfzeilen** · Planer — Ein Finding gilt als Finding zu einer Kopfzeile, wenn sein `location` `Status`, `Art`, `Workitem` oder `Basis` lautet. Grund: Die Reviewer nennen die Stelle im Feld `location`; so bleibt der Filter mechanisch.
- **E · Zitat aus W-Eintrag** · Planer — „Ganzes Zitat aus einem W-Eintrag“ heißt: Das Zitat (Leerraum vereinheitlicht) steht vollständig in einer einzigen W-Zeile des Dokuments, im Plan-Review auch der Spec. Grund: einfachste mechanische Lesart; ein Zitat, das einen Spec-Satz einem W-Eintrag gegenüberstellt, steht in keiner einzelnen W-Zeile (AC-08).
- **E · Anführungszeichen beim Abgleich** · Planer — `Antwort auf „R<n> · <Stelle>“` wird auch mit `"`, `”` oder `"…"` erkannt. Grund: Schreibwerkzeuge von Agenten normalisieren `“` oft zu ASCII oder `”`; sonst blieben beantwortete Fragen offen.
- **E · Kennung der R-Einträge** · Planer — Jeder Lauf schreibt seine R-Einträge mit `R<n>`, `n` = höchste R-Nummer unter Entscheidungen plus 1 (`EINTRAG R<n>` aus `rework-input` bzw. `snapshot`). Grund: Mit nur einer Nacharbeit je Lauf trüge sonst jeder Lauf `R1`, und Antworten nennten mehrdeutige R-Einträge.
- **E · Versuchszähler** · Planer — Nachforderung, Neustart und Ausfall zählt `review-flow.js attempt` in `<W>/versuche.json`, je Instanz; der Zähler der Nacharbeit gilt über das Anhalten hinweg. Die Scout-Instanzen heißen `scout` und `scout-nachpruefung`; ihr Ausfall erscheint im Bericht unter `### Scout`, nicht im Status.
- **E · Befunde der Skript-Prüfungen** · Planer — Sie haben die Kategorie `skript-prüfung`, werden nie verworfen und nie herabgestuft. Grund: „bleiben 🔴 und zählen zu den offenen 🔴“ in Runde 1 und Nachprüfung.
- **E · Start des Nachprüfers** · Planer — Er startet, wenn die Prüfliste einen Punkt der KI hat oder es einen geänderten Bereich gibt; Punkte aus Skript-Prüfungen beurteilt das Skript. Grund: Ohne beides hat er nichts zu beurteilen (Schritt 9).
- **E · Spec-Rückfrage im Plan** · Planer — Sie bleibt ein R-Eintrag `— spec-rückfrage —` wie bisher; innerhalb des Laufs gilt sie über `rework.json` (`status: spec-question`, Frage in `reason`) und `fragen.json` als offen. R-Einträge früherer Läufe wertet das Plan-Review nicht aus. Grund: Ihr Umgang aus früheren Läufen ist nicht Teil der Spec.
- **E · Anhalten und Guard** · Planer — Vor dem Anhalten ruft der Orchestrator `guard-orchestrator.js pause <SESSION>`; die Antwort des Menschen gibt den Schutz nicht frei, erst die Eingabe danach. Grund: Sonst liefe das Eintragen der Antworten und die Nachprüfung ohne Schutz der Spec.
- **E · Review-Followup hält nicht an** · Planer — Stellt die Nacharbeit im Folge-Modus eine Frage, schreibt sie zusätzlich einen R-Eintrag; der Lauf hält nicht an, der Status lautet `Fragen offen`. Grund: Die Spec legt Anhalten nur für den Review-Lauf fest.
- **E · Kategorien in bestehenden Prüfaufträgen** · Planer — Ein externer Verweis, den der Bau braucht, ist `unerfuellbar` (sonst `detail`); ein Begriff, der eine Anforderung mehrdeutig macht, ist `widerspruch` (sonst `detail`). Grund: nächste Entsprechung der bisherigen Farbregeln in der Kategorienliste; die Prüfaufträge selbst bleiben unverändert.
- **E · Beratende Reviewer** · Planer — `rate --beratend <kurznamen>`; Spec- und Plan-Review führen „Keine“. Grund: Die Spec lässt die Wahl dem jeweiligen Review.
- **E · Nachprüfer-Agenten** · Planer — `spec-review-verifier` und `plan-review-verifier`. Grund: Der Name trifft die bestehende Guard-Regel für Review-Agenten, die nur in `.forge/` schreiben dürfen.
- **E · Anker nach der Nacharbeit** · Planer — `plan-tasks.js anchors` läuft im Plan-Review und im Followup nicht mehr nach der Nacharbeit. Grund: Es gibt keine zweite Reviewer-Runde, die die Anker liest.
- **E · rework-outcome.js** · Planer — bleibt unverändert; Spec- und Plan-Review rufen es nicht mehr auf, `loop.md` des Implementierungs-Reviews nennt es weiter. Grund: kein Umbau außerhalb des Umfangs.
- **E · Instanznamen im Status** · Planer — `unvollständig, ausgefallen: <liste>` nennt Reviewer mit Kurznamen, dazu `nacharbeit` und `nachprüfer`.
- **R1 · Task 16** — geändert — `flow.md`, Abschnitt Rolle, kopiert Rolle, Werkzeuge und Hintergrund-Regel nicht mehr aus `loop.md`, sondern verweist auf dessen Abschnitte „Rolle“ und „Hintergrund oder Vordergrund“ und nennt nur die Abweichungen (Hook nach `pause`, Dateien in `W`, Exit 1 von `review-flow.js`). Der Test `flow_Agents_ForegroundOnly` wird zu `flow_Role_ReferencesLoopRulesInsteadOfCopyingThem`. Task 17 ergänzt in `loop.md`, dass beide Abschnitte für beide Abläufe gelten. Dass `flow.md` und `review-flow-doc.test.js` schon existieren, liegt am Arbeitsstand: Laut W · Plan-Basis setzt die Umsetzung auf `3ce509e` auf, dort gibt es beide Dateien nicht, `Create` ist dort richtig.
- **R1 · Task 4** — geändert — `groups.js` führt keine eigene Fassung von Rangfolge, Icons, Anführungszeichen, `cell` und Gruppenformat mehr. Task 4 exportiert aus `aggregate-findings.js` `SEVERITY_ICON`, `REWORK_MARK`, `cell`, `reworkHeading` und `reworkLine`, `formatReworkGroup` und `render` nutzen sie, `groups.js` übernimmt sie. Die Aggregat-Tests laufen in Schritt 4 mit. Die Überschrift einer Gruppe zieht die Stelle auf eine Zeile zusammen, `resolvePlace` (Task 2) tut das schon für unbekannte Stellen. Neue Tests: `renderGroups_LabelWithLineBreak_HeadingStaysOneLine` und `resolvePlace_UnknownLocationWithLineBreak_LabelOnOneLine`, Task 2 hat damit 11 Tests. Dass `review-groups.test.js` schon existiert, liegt am Arbeitsstand; laut W · Plan-Basis fehlt die Datei in `3ce509e`.
- **R1 · Task 7** — geändert — `snapshot` und `writeReworkInput` stehen im neuen Modul `lib/rework-input.js`, `round-one.js` stuft nur noch ein. Task 8 verankert seine Einfügung in `review-flow.js` an der neuen require-Zeile. `readJson` wandelt kaputtes JSON in `FlowError`, `scriptItems` prüft die Form von `skript-pruefung.json` und bricht sonst mit `FlowError` ab (Exit 1). Für diesen Abbruch nennt `flow.md` (Task 16) den Weg. Namen aus `--expect`, `--beratend` und `--instanz` müssen `^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$` treffen, sonst Exit 2. `nachprüfer` bleibt gültig. Dazu 4 neue Tests, 21 insgesamt. `--dir` bleibt ohne Wurzelprüfung: Tests und `prepare.js` legen Arbeitsbereiche an verschiedenen Orten an, und `report` löscht nur den festen Unterordner `abschluss`. Dass `review-flow.js` schon existiert, liegt am Arbeitsstand; laut W · Plan-Basis fehlt die Datei in `3ce509e`.
- **R1 · Task 1** — nicht geändert — W · Plan-Basis ist bindend: Der Plan setzt auf `3ce509e` auf, als wäre nichts umgesetzt. Dort gibt es `formatEscalated`, die Zeile `HOCHGESTUFT`, die Regel `4. Nennen ≥ 2 verschiedene Reviewer` und die Tests `aggregate_YellowFromTwoReviewers_EscalatesToRed` und `run_FileTypes_GroupsAcrossReviewersAndEscalates`. Der aktuelle Arbeitsstand enthält die Umsetzung des bisherigen `plan.md` schon. Das steht auch unter „Checkout“ in den Global Constraints.
- **R1 · Task 10** — nicht geändert — `flow-report.js` stammt aus dem Arbeitsstand mit dem umgesetzten `plan.md`. Laut W · Plan-Basis und „Checkout“ in den Global Constraints setzt die Umsetzung auf `3ce509e` auf, dort fehlt die Datei. `Create` ist richtig.
- **R1 · Task 11** — nicht geändert — Im Stand `3ce509e` (W · Plan-Basis) hat `prepare.js` noch `DEFAULT_ROUNDS` und `rounds(flags)`. Erst der umgesetzte `plan.md` im aktuellen Arbeitsstand hat sie entfernt.
- **R1 · Task 13** — nicht geändert — Im Stand `3ce509e` (W · Plan-Basis) haben alle zehn Reviewer-Agenten noch `## Einstufung` mit `red`/`yellow`/`green`. Das `## Kategorie` im aktuellen Arbeitsstand ist schon die Umsetzung des bisherigen `plan.md`.
- **R1 · Task 14** — nicht geändert — Beide Nachprüfer-Agenten fehlen im Stand `3ce509e` (W · Plan-Basis, „Checkout“ in den Global Constraints). Sie existieren nur im aktuellen Arbeitsstand, weil der bisherige `plan.md` dort umgesetzt ist. `Create` ist richtig.
- **R1 · Task 15** — geändert — Der Anker `ganze Datei` ist keine Zeichenfolge in der Datei. Jetzt stehen dort `name: spec-rework` bzw. `name: plan-rework`, dazu der Hinweis, dass Schritt 3 die ganze Datei ersetzt.
- **R1 · Task 17** — geändert — Statt `ganze Datei` stehen jetzt echte Anker: `name: spec-review`, `name: plan-review` und in den Testdateien die Zeile `const SKILL = path.join(__dirname, '..', 'skills', '<skill>', 'SKILL.md');`. Dazu der Hinweis, welcher Schritt die ganze Datei ersetzt.
- **R1 · Task 18** — geändert — Statt `ganze Datei` stehen jetzt die Anker `name: review-followup` und `# Review-Followup: Ablauf im Einzelnen`, dazu der Hinweis, dass Schritt 3 die ganze Datei ersetzt.
- **R1 · Task 3** — nicht geändert — `review-rules.test.js` fehlt im Stand `3ce509e` (W · Plan-Basis) und stammt aus der Umsetzung des bisherigen `plan.md` im aktuellen Arbeitsstand. Der Task legt die Datei dort neu an, deshalb steht bei `Test` kein Anker.
- **R1 · Task 9** — geändert — `verdictProblem` lehnt jetzt ein Urteil an einer Stelle ab, die nicht auf der Prüfliste steht (`Urteil ohne Punkt der Prüfliste: <stellen>`). So kann ein abweichender Nachprüfer `notDone` und k nicht verfälschen. Neuer Test: `verify_VerdictForPlaceNotOnChecklist_Invalid`.
- **R2 · Task 1** — nicht geändert — Wie R1 · Task 1: W · Plan-Basis ist bindend, die Umsetzung setzt auf `3ce509e` auf („Checkout“ in den Global Constraints). Dort stehen `formatEscalated`, die Regel `4. Nennen ≥ 2 verschiedene Reviewer` und die Tests `aggregate_YellowFromTwoReviewers_EscalatesToRed` und `run_FileTypes_GroupsAcrossReviewersAndEscalates`. Die Anker-Prüfung lief gegen den Arbeitsstand, in dem der bisherige `plan.md` schon umgesetzt ist.
- **R2 · Task 10** — nicht geändert — Wie R1 · Task 10: `flow-report.js` fehlt im Stand `3ce509e` (W · Plan-Basis), `Create` ist dort richtig. Die Datei im Arbeitsstand stammt aus dem umgesetzten `plan.md`.
- **R2 · Task 11** — nicht geändert — Wie R1 · Task 11: Im Stand `3ce509e` (W · Plan-Basis) hat `prepare.js` noch `DEFAULT_ROUNDS` und `rounds`; erst der umgesetzte `plan.md` im Arbeitsstand hat sie entfernt.
- **R2 · Task 13** — nicht geändert — Wie R1 · Task 13: Im Stand `3ce509e` (W · Plan-Basis) tragen alle zehn Reviewer-Agenten noch `## Einstufung`; `## Kategorie` im Arbeitsstand ist die Umsetzung des bisherigen `plan.md`.
- **R2 · Task 14** — nicht geändert — Wie R1 · Task 14: `spec-review-verifier.md` und `plan-review-verifier.md` fehlen im Stand `3ce509e` (W · Plan-Basis), `Create` ist dort richtig.
- **R2 · Task 16** — nicht geändert — Wie R1 · Task 16: `flow.md` und `review-flow-doc.test.js` fehlen im Stand `3ce509e` (W · Plan-Basis); `Create` und die Test-Zeile ohne Anker sind dort richtig, weil der Task beide Dateien neu anlegt.
- **R2 · Task 3** — nicht geändert — Wie R1 · Task 3: `review-rules.test.js` fehlt im Stand `3ce509e` (W · Plan-Basis); der Task legt die Datei neu an, deshalb trägt die Test-Zeile keinen Anker.
- **R2 · Task 4** — nicht geändert — Wie R1 · Task 4: `review-groups.test.js` fehlt im Stand `3ce509e` (W · Plan-Basis); der Task legt die Datei neu an, deshalb trägt die Test-Zeile keinen Anker.
- **R2 · Task 7** — nicht geändert — Wie R1 · Task 7: `review-flow.js` fehlt im Stand `3ce509e` (W · Plan-Basis), `Create` ist dort richtig; die Tasks 8 bis 10 bauen per Modify auf der Datei auf, die Task 7 dort anlegt.
- **R2 · Global Constraints** — geändert — „Offene Frage“ nennt jetzt auch die übrigen Teile der Soll-Vorgabe: Eine Stelle aus mehreren Wörtern steht mit allen Wörtern in derselben Reihenfolge im Titel, ein W-Eintrag mit mehreren Stellen im Titel beantwortet jede, deren R-Eintrag er nennt, und der R-Eintrag je Stelle gilt auch bei gebündelter Frage. Dazu kommt der Hinweis, dass eine Spec-Rückfrage im Plan dieselbe Form hat (siehe R2 · Task 15).
- **R2 · Task 12** — nicht geändert — Der Befund beschreibt den Arbeitsstand, in dem der bisherige `plan.md` umgesetzt ist. Laut W · Plan-Basis und „Checkout“ in den Global Constraints setzt die Umsetzung auf `3ce509e` auf, und der Code wurde in diesem Stand gelesen. `pause` und das `paused`-Verhalten kamen erst mit der Umsetzung des bisherigen `plan.md` in `guard-orchestrator.js`. Auf `3ce509e` fügen die Schritte sie also zum ersten Mal ein, und die Rot-Prüfung schlägt fehl, wie der Plan es erwartet. Derselbe Grund wie bei R1 · Task 1, Task 10, Task 11, Task 13 und Task 14.
- **R2 · Task 15** — geändert — Nach Schritt 8 der Spec steht eine Spec-Rückfrage „wie jede Frage an den Menschen“ als R-Eintrag im Plan, im Format aus „Offene Frage“. `plan-rework` Regel 7 schreibt sie deshalb als `— frage an den menschen — <Rückfrage>`, im Folge-Modus zusätzlich zum F-Eintrag. Der Status `spec-question` in `rework.json` bleibt. Damit überholt dieser Eintrag das Format aus „E · Spec-Rückfrage im Plan“. Damit solche Einträge früherer Läufe im Plan-Review keine Findings verwerfen und keine Nacharbeit auslösen, liefert `documentQuestions` in `round-one.js` (Task 7) im Plan-Review `[]`. `rateRoundOne` und `writeReworkInput` nutzen es. Der Umgang mit früheren Rückfragen bleibt so, wie „E · Spec-Rückfrage im Plan“ ihn festlegt. Neue Tests: `plan-rework_Body_SpecQuestionWrittenAsQuestionToTheHuman` (Task 15), `rate_PlanReviewWithQuestionEntryOfEarlierRun_FindingStaysAndNoQuestion` und `reworkInput_PlanReviewWithQuestionEntryOfEarlierRun_ListsNoQuestion` (Task 7, jetzt 23 Tests).
- **F · Task 10** — geändert — Vorschlag 1: (a) `editDoc`, `addEntries` und `runUntilRework(env, findings, review = 'spec-review')` stehen jetzt in `tests/lib/review-flow-fixture.js` (Task 2, Produces ergänzt). Die Tests der Tasks 8, 9 und 10 importieren sie, statt sie selbst zu definieren. `prepareRework` (Task 8) und `runWithVerification` (Task 10) rufen `runUntilRework` auf, und die Consumes-Zeilen nennen die Helfer. (b) `collect` in `flow-report.js` berechnet `openRed` über `openRedOf`. Gibt es `runde-2/einstufung.json`, gilt deren `openRed`. Fehlt die Datei nach einer Nacharbeit, wirft `collect` `FlowError('Nachprüfung fehlt: runde-2/einstufung.json')`. Ohne Nacharbeit zählen die 🔴-Gruppen aus Runde 1. Abweichend vom Vorschlag wirft `collect` nicht, wenn eine Instanz ausgefallen ist: Laut `flow.md` „Ende“ läuft `report` auch nach einem Ausfall von Nacharbeit oder Nachprüfer, und dann muss `unvollständig, ausgefallen: …` erscheinen. Neue Tests: `report_NoRedInRoundOneWithoutRework_CleanAfterRoundOne`, `report_RedInRoundOneWithoutRoundTwo_NichtBereitWithRedOfRoundOne` und `report_ReworkWithoutRoundTwo_ExitsWithOneAndReason`.
- **F · Task 6** — geändert — Vorschlag 2: `FlowError` steht jetzt im neuen Modul `lib/flow-error.js` (Task 6). `readAttempts` wird exportiert und wandelt kaputtes JSON in `versuche.json` in einen `FlowError` mit `kein gültiges JSON: <datei>: <grund>` um. `review-flow.js` meldet ihn deshalb mit Exit 1, auch bei `attempt` und `report`. `flow-files.js` (Task 7) importiert die Klasse und exportiert sie weiter, `flow-report.js` bezieht sie von dort. Neuer Test: `readAttempts_BrokenJson_FlowError`, Task 6 hat damit 5 Tests.
- **F · Task 7** — geändert — Vorschlag 1: `documentQuestions(options, text)` steht jetzt in `lib/questions.js` (Task 5, Produces ergänzt, dazu der neue Test `documentQuestions_SpecAndPlanReview_OnlySpecReviewCountsQuestions`, Task 5 hat damit 12 Tests). `round-one.js` und `rework-input.js` importieren die Funktion aus `questions.js`. `round-one.js` exportiert nur noch `rateRoundOne`, und `rework-input.js` hängt nicht mehr an `round-one.js`. Die Interfaces-Zeilen von Task 7 sind angepasst. Die Module aus Task 8 (`rework-check.js`) und Task 9 (`round-two.js`) rufen `documentQuestions` nicht auf. Sie lesen die Fragen mit `openQuestions` bzw. `fragen.json` und brauchen deshalb keinen Import. Damit gilt R2 · Task 15 mit neuem Ort der Funktion weiter.
- **F · Task 9** — geändert — Vorschlag 1: Im Test `checklist_AnsweredQuestion_PlaceOnChecklist` steht der R1-Eintrag an AC-04 jetzt vor `runUntilRework(env, [])` im Dokument. Runde 1 hat also kein 🔴, `finishRework` liefert `results: []`, und nach der W-Antwort stammt `AC-04:ki` nur aus `answeredItems`. Der bisherige Fall mit 🔴 heißt jetzt `checklist_RedWithAnsweredQuestion_PlaceOnceOnChecklist`. Er prüft zusätzlich `PRUEFLISTE punkte=1 skript=0 bereiche=0` und belegt damit, dass `withoutDuplicates` die Stelle nur einmal aufnimmt.
