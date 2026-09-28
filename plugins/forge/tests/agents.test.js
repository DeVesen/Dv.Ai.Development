'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AGENTS = path.join(__dirname, '..', 'agents');
const REVIEWERS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'];
const FORMAT_KEYS = ['"reviewer"', '"summary"', '"findings"', '"location"', '"quote"', '"severity"', '"consequence"', '"rationale"'];

function readAgent(name) {
  const text = fs.readFileSync(path.join(AGENTS, `${name}.md`), 'utf8');
  const [, frontmatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  const fields = Object.fromEntries(frontmatter.split(/\r?\n/).map((line) => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { fields, body };
}

for (const reviewer of REVIEWERS) {
  const name = `spec-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, 'Read, Write');
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_EmbedsFindingFormatWithOwnReviewerName`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.match(body, /keinen Code/);
    assert.ok(body.includes('## W-Einträge'), 'W-Einträge fehlt');
    assert.ok(body.includes('Offen, bewusst nicht weiterverfolgt (Abbruch)'), 'Abbruch-Abschnitt-Regel fehlt');
    assert.ok(body.includes('kein Finding und keine Lücke'), 'Abbruch-Abschnitt-Regel fehlt');
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
  });
}

test('spec-rework_Frontmatter_ReadEditOpus', () => {
  const { fields } = readAgent('spec-rework');
  assert.equal(fields.name, 'spec-rework');
  assert.equal(fields.tools, 'Read, Edit, Write');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('spec-rework_Body_DefinesDecisionEntryFormat', () => {
  const { body } = readAgent('spec-rework');
  assert.ok(body.includes('- **R<r> · <Stelle>** — geändert | nicht geändert — <Begründung>'));
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.match(body, /keinen Code/);
  assert.ok(body.includes('W-Eintrag ist bindend'));
  assert.ok(body.includes('ans Ende dieses Abschnitts an, auch wenn danach weitere Abschnitte folgen'), 'Regel zu nachfolgenden Abschnitten fehlt');
  assert.ok(body.includes('Regel 3 gilt für sie nicht'), 'Regel zum Abbruch-Abschnitt fehlt');
  assert.ok(body.includes('Fehlt er, legst du ihn direkt vor `## Offen, bewusst nicht weiterverfolgt (Abbruch)` an'), 'Anlage-Ort bei Abbruch fehlt');
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('spec-review-scout_Frontmatter_ReadGrepGlobSonnet', () => {
  const { fields } = readAgent('spec-review-scout');
  assert.equal(fields.name, 'spec-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob');
  assert.equal(fields.model, 'sonnet');
  assert.match(fields.description, /^Use when/);
});

test('spec-review-scout_Body_DefinesProposalFormat', () => {
  const { body } = readAgent('spec-review-scout');
  assert.ok(body.includes('## Scout-Vorschläge'));
  assert.ok(body.includes('**Bevorzugt: <Nr>** — <Begründung>'));
  assert.ok(body.includes('W-Eintrag'));
  assert.match(body, /änderst keine Datei/);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

const PLAN_REVIEWERS = {
  coverage: 'Read, Write',
  feasibility: 'Read, Grep, Glob, Write',
  architecture: 'Read, Grep, Glob, Write',
  risks: 'Read, Grep, Glob, Write',
  buildability: 'Read, Grep, Glob, Write, ToolSearch',
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
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
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
test('plan-rework_Frontmatter_ReadGrepGlobEditOpus', () => {
  const { fields } = readAgent('plan-rework');
  assert.equal(fields.name, 'plan-rework');
  assert.equal(fields.tools, 'Read, Grep, Glob, Edit, Write');
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
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
});
test('plan-review-scout_Frontmatter_ReadGrepGlobSonnet', () => {
  const { fields } = readAgent('plan-review-scout');
  assert.equal(fields.name, 'plan-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob');
  assert.equal(fields.model, 'sonnet');
  assert.match(fields.description, /^Use when/);
});

test('plan-review-scout_Body_FormatProposalsPreferredAndNoEdits', () => {
  const { body } = readAgent('plan-review-scout');
  assert.ok(body.includes('## Scout-Vorschläge'));
  assert.ok(body.includes('**Bevorzugt: <Nr>** — <Begründung>'));
  assert.match(body, /1 bis 3/);
  assert.match(body, /änderst keine Datei/);
  assert.match(body, /🟢-Gruppen/);
  assert.match(body, /Spec so ändern/);
  assert.ok(body.includes('`Repo:`'));
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
});

test('allReviewers_Body_WriteResultFileWithEmptyExample', () => {
  const names = fs.readdirSync(AGENTS).filter((file) => /-review-/.test(file) && !file.includes('scout')).map((file) => file.slice(0, -3));
  assert.equal(names.length, 15);
  for (const name of names) {
    const { body } = readAgent(name);
    const short = /"reviewer": "([a-z-]+)"/.exec(body)[1];
    assert.ok(body.includes('- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei'), `${name}: Eingabe Ergebnis fehlt`);
    assert.ok(body.includes('Deine letzte Aktion: Schreib dein Ergebnis mit `Write`'), `${name}: letzte Aktion fehlt`);
    assert.ok(body.includes('auch bei null Findings'), name);
    assert.ok(body.includes(`\`{"reviewer": "${short}", "summary": "<Prüfumfang>", "findings": []}\``), `${name}: Leer-Beispiel fehlt`);
    assert.ok(!body.includes('Beende deine Antwort mit genau einem JSON-Block'), `${name}: alter Ausgabeweg`);
  }
});

test('reworkAndScouts_Body_ReadFindingsFromAggregateFile', () => {
  for (const name of ['spec-rework', 'plan-rework']) {
    const { body } = readAgent(name);
    assert.ok(body.includes('- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei'), name);
    assert.ok(body.includes('"results"'), name);
  }
  for (const name of ['spec-review-scout', 'plan-review-scout', 'implementation-review-scout']) {
    assert.ok(readAgent(name).body.includes('`Findings:` Datei der letzten Aggregation'), name);
  }
});

test('plan-review-buildability_Body_GatesSchemaAndForeignCode', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.match(body, /\*\*Gates verdrahtet:\*\*/);
  assert.match(body, /per `ToolSearch`/);
  assert.match(body, /Das prüft nur dieser Reviewer/);
  for (const name of ['feasibility', 'architecture', 'risks', 'coverage']) {
    assert.match(readAgent(`plan-review-${name}`).body, /prüft `buildability`/, name);
  }
});
