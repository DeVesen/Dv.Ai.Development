'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AGENTS = path.join(__dirname, '..', 'agents');
const REVIEWERS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'];
const FORMAT_KEYS = ['"reviewer"', '"findings"', '"location"', '"quote"', '"severity"', '"consequence"', '"rationale"'];

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
    assert.equal(fields.tools, 'Read');
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
  assert.equal(fields.tools, 'Read, Edit');
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

test('spec-review-scout_Frontmatter_ReadGrepGlobOpus', () => {
  const { fields } = readAgent('spec-review-scout');
  assert.equal(fields.name, 'spec-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob');
  assert.equal(fields.model, 'opus');
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
