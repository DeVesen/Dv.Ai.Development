'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { secretViolations, withFileNameSource, relativeToProject } = require('../scripts/lib/retro-secrets');

test('secretViolations_KeyAsEndOfVariableName_ReportedAndMasked', () => {
  for (const assignment of ['API_TOKEN=abcdefgh1234', 'DB_PASSWORD=geheim-12345', 'NPM_TOKEN=npm_abcdefgh', 'CLIENT_SECRET=s3cr3t-wert-1']) {
    const found = secretViolations(`- 2× ${assignment} npm publish`);

    assert.deepEqual(found, ['Geheimnis im Bericht: Schlüssel mit Wert in Zeile 1: - 2× *** npm publish'], assignment);
  }
});

test('secretViolations_CountsAndShortValues_None', () => {
  assert.deepEqual(secretViolations('- Tokens: 1200000 · Token: nein\n- Tokens neu 2k Hauptsession'), []);
});

test('withFileNameSource_AbsolutePath_OnlyFileName', () => {
  assert.equal(withFileNameSource('Quelle: `C:\\Users\\max\\.claude\\projects\\p\\s1.jsonl` · 2 Tool-Aufrufe'), 'Quelle: `s1.jsonl` · 2 Tool-Aufrufe');
});

test('relativeToProject_WindowsProject_RelativeInBothSeparatorsAndOthersKept', () => {
  const text = '- 3× C:\\Users\\max\\repo\\src\\Shift.ts\n- 2 Tokens · Read c:/users/max/repo/docs/a.md\n- 1× C:\\Users\\max\\repo2\\b.md';

  const result = relativeToProject(text, 'C:\\Users\\max\\repo');

  assert.equal(result, '- 3× src\\Shift.ts\n- 2 Tokens · Read docs/a.md\n- 1× C:\\Users\\max\\repo2\\b.md');
});

test('relativeToProject_PosixProject_CaseSensitive', () => {
  assert.equal(relativeToProject('- 2× /home/max/repo/a.md und /home/max/Repo/b.md', '/home/max/repo/'), '- 2× a.md und /home/max/Repo/b.md');
});

test('relativeToProject_NoOrRootFolder_TextUnchanged', () => {
  assert.equal(relativeToProject('- 1× /a/b.md', undefined), '- 1× /a/b.md');
  assert.equal(relativeToProject('- 1× /a/b.md', '/'), '- 1× /a/b.md');
});
