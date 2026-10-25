'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { IMPLEMENTATION_CATEGORIES, categoryColor } = require('../scripts/lib/implementation-categories');
const { extractReviews, readReviewDir, run } = require('../scripts/aggregate-findings.js');
const { tempDir } = require('./lib/review-flow-fixture');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'aggregate-findings.js');
const block = (value) => `\`\`\`json\n${JSON.stringify(value)}\n\`\`\``;
const finding = (overrides = {}) => ({ location: 'src/a.js', quote: 'q', consequence: 'c', rationale: 'r', ...overrides });

const CASES = Object.entries(IMPLEMENTATION_CATEGORIES).flatMap(([reviewer, categories]) => Object.entries(categories).map(([category, color]) => [reviewer, category, color]));

for (const [reviewer, category, color] of CASES) {
  test(`extractReviews_${reviewer}Category${category}_RatedAs${color}`, () => {
    // Arrange
    const text = block({ reviewer, findings: [finding({ category })] });

    // Act
    const { reviews, errors } = extractReviews(text);

    // Assert
    assert.deepEqual(errors, []);
    assert.equal(reviews[0].findings[0].severity, color);
    assert.equal(reviews[0].findings[0].category, category);
  });
}

test('categoryColor_UnknownReviewerOrCategory_ReturnsNull', () => {
  assert.equal(categoryColor('skript', 'anmerkung'), null);
  assert.equal(categoryColor('tests', 'ac-verfehlt'), null);
  assert.equal(categoryColor('tests', 'toString'), null);
});

test('extractReviews_UnknownCategory_RejectsTheBlockAndNamesTheCategory', () => {
  // Act
  const { reviews, errors } = extractReviews(block({ reviewer: 'risks', findings: [finding({ category: 'ac-verfehlt' })] }));

  // Assert
  assert.equal(reviews.length, 0);
  assert.match(errors[0], /risks/);
});

test('extractReviews_CategoryAndSeverityTogether_RejectsTheBlock', () => {
  // Act
  const { reviews, errors } = extractReviews(block({ reviewer: 'risks', findings: [finding({ category: 'fehler-verschluckt', severity: 'red' })] }));

  // Assert
  assert.equal(reviews.length, 0);
  assert.match(errors[0], /Farbe und Kategorie im Finding: src\/a\.js/);
});

test('extractReviews_SeverityOnlyOfScriptReviewer_StillAccepted', () => {
  // Act
  const { reviews, errors } = extractReviews(block({ reviewer: 'skript', findings: [finding({ severity: 'yellow' })] }));

  // Assert
  assert.deepEqual(errors, []);
  assert.equal(reviews[0].findings[0].severity, 'yellow');
  assert.equal('category' in reviews[0].findings[0], false);
});

test('extractReviews_CategoryForReviewerWithoutCategories_Rejected', () => {
  // Act
  const { reviews } = extractReviews(block({ reviewer: 'skript', findings: [finding({ category: 'anmerkung' })] }));

  // Assert
  assert.equal(reviews.length, 0);
});

test('run_TwoCategoriesOfOnePlace_GroupTakesTheHighestColor', () => {
  // Arrange
  const text = [
    block({ reviewer: 'risks', findings: [finding({ category: 'randfall-schwach' })] }),
    block({ reviewer: 'design', findings: [finding({ category: 'duplikat' })] }),
  ].join('\n');

  // Act
  const result = run(text, ['risks', 'design']);

  // Assert
  assert.equal(result.groups[0].severity, 'red');
  assert.equal(result.status.clean, false);
});

test('readReviewDir_CategoryFinding_ErgebnisJsonKeepsCategoryAndColor', () => {
  // Arrange
  const dir = tempDir('dv-forge-categories-');
  fs.writeFileSync(path.join(dir, 'tests.json'), JSON.stringify({ reviewer: 'tests', summary: 's', findings: [finding({ location: 'tests/a.test.js', category: 'test-ohne-assertion' })] }));

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--dir', dir, '--expect', 'tests'], { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const item = JSON.parse(fs.readFileSync(path.join(dir, 'ergebnis.json'), 'utf8')).groups[0].items[0];
  assert.deepEqual([item.severity, item.category], ['red', 'test-ohne-assertion']);
  assert.equal(readReviewDir(dir).reviews.length, 1);
});
