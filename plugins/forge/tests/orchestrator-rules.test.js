'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { maxFollowups, RulesError, RULES_FILE } = require('../scripts/lib/orchestrator-rules');

function rulesFile(text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-rules-')), 'orchestrator-rules.md');
  fs.writeFileSync(file, text);
  return file;
}

test('maxFollowups_ShippedRulesFile_ReturnsTwo', () => {
  // Act
  const max = maxFollowups();

  // Assert
  assert.equal(max, 2);
});

test('maxFollowups_OtherNumberInTheLine_IsParsedFromTheFile', () => {
  // Arrange
  const file = rulesFile(`# Regeln\n\n## Followup-Runden\n- ${['Maximum Followup', '-Runden: '].join('')}3\n`);

  // Act
  const max = maxFollowups(file);

  // Assert
  assert.equal(max, 3);
});

test('maxFollowups_FileWithoutMaximumLine_ThrowsRulesError', () => {
  // Arrange
  const file = rulesFile('# Regeln\n');

  // Act
  const read = () => maxFollowups(file);

  // Assert
  assert.throws(read, (error) => error instanceof RulesError && /Maximum Followup-Runden/.test(error.message));
});

test('rulesFile_Sections_NameFollowupGitCommitsOutputAndRedFlags', () => {
  // Arrange
  const text = fs.readFileSync(RULES_FILE, 'utf8').replace(/\r\n/g, '\n');

  // Assert
  for (const heading of ['## Followup-Runden', '## Git-Verbote', '## Commits', '## Ausgabe', '## Rote Flaggen']) {
    assert.ok(text.includes(`${heading}\n`), `${heading} fehlt`);
  }
});
