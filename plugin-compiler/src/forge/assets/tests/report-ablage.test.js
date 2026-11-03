'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FlowError } = require('../scripts/lib/flow-error');
const { ablageOf } = require('../scripts/lib/report-ablage');

function workspaceWith(context) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ra-'));
  if (context !== undefined) fs.writeFileSync(path.join(dir, 'kontext.json'), JSON.stringify(context));
  return dir;
}

test('ablageOf_ContextWithAblage_ReturnsTheResolvedFolder', () => {
  // Arrange
  const dir = workspaceWith({ etappe: 'plan-review', ablage: 'ablage/plan-review' });

  // Act
  const ablage = ablageOf(dir);

  // Assert
  assert.equal(ablage, path.resolve('ablage/plan-review'));
});

test('ablageOf_WorkspaceWithoutContextOrWithEmptyAblage_ThrowsFlowErrorNamingPrepare', () => {
  for (const dir of [workspaceWith(), workspaceWith({ etappe: 'plan-review' }), workspaceWith({ ablage: '' })]) {
    // Act
    const read = () => ablageOf(dir);

    // Assert
    assert.throws(read, (error) => error instanceof FlowError && /^Ablage fehlt im Arbeitsbereich: prepare\.js legt sie in kontext\.json fest$/.test(error.message));
  }
});
