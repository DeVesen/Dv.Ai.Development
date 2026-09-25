'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LOCATION_TYPES, fileLocationType, normalizeLocation, run } = require('../scripts/aggregate-findings.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'aggregate-findings.js');
const REPO = 'C:\\Develop\\Demo';
const TYPES = [...LOCATION_TYPES, fileLocationType(REPO)];

function finding(location, severity) {
  return { location, quote: 'q', severity, consequence: 'c', rationale: 'r' };
}

function block(reviewer, findings) {
  return `\`\`\`json\n${JSON.stringify({ reviewer, findings })}\n\`\`\``;
}

test('fileLocation_Spellings_AreOneKey', () => {
  assert.equal(normalizeLocation('src\\A.ts', TYPES), 'src/a.ts');
  assert.equal(normalizeLocation('./src/a.ts', TYPES), 'src/a.ts');
  assert.equal(normalizeLocation('C:/Develop/Demo/src/a.ts:12-20', TYPES), 'src/a.ts');
  assert.equal(normalizeLocation('C:\\Develop\\Demo\\src\\a.ts:7', TYPES), 'src/a.ts');
});

test('fileLocation_OtherKeys_Unchanged', () => {
  assert.equal(normalizeLocation('AC-07', TYPES), 'ac-7');
  assert.equal(normalizeLocation('Task 03', TYPES), 'task 3');
  assert.equal(normalizeLocation('Testlauf', TYPES), 'testlauf');
  assert.equal(normalizeLocation('Global Constraints', TYPES), 'global constraints');
});

test('fileLocation_WithoutRepo_KeepsAbsolutePathWithoutLine', () => {
  assert.equal(normalizeLocation('C:/X/a.ts:3', [...LOCATION_TYPES, fileLocationType(null)]), 'c:/x/a.ts');
});

test('locationTypes_DefaultTable_StaysAcAndTask', () => {
  assert.deepEqual(LOCATION_TYPES.map((type) => type.name), ['ac', 'task']);
});

test('run_FileTypes_GroupsAcrossReviewersAndEscalates', () => {
  const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
  const { groups, status } = run(text, ['design', 'risks'], TYPES);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, 'red');
  assert.equal(status.counts.red, 1);
});

test('run_DefaultTypes_KeepsFileSpellingsApart', () => {
  const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
  assert.equal(run(text, ['design', 'risks']).groups.length, 2);
});

test('cli_RepoFlag_GroupsFileLocations', () => {
  const input = [block('design', [finding(`${REPO}\\src\\a.ts:3`, 'yellow')]), block('risks', [finding('src/a.ts', 'yellow')])].join('\n');
  const result = spawnSync(process.execPath, [SCRIPT, '--expect', 'design,risks', '--repo', REPO], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^STATUS clean=false red=1 yellow=0 green=0 failed=-/);
});
