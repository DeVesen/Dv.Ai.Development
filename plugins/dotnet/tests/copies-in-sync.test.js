'use strict';

// Plugins teilen keine Dateien; drei Dateien liegen deshalb byte-gleich in dv-dotnet und dv-angular.
// Dieser Test hält die Kopien gleich: Läuft eine auseinander, schlägt er fehl.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOTNET_ROOT = path.join(__dirname, '..');
const ANGULAR_ROOT = path.join(__dirname, '..', '..', 'angular');
const COPIES = [
  path.join('scripts', 'lib', 'project-setup.js'),
  path.join('bin', 'lib', 'run-toolchain.js'),
  path.join('tests', 'lib', 'markdown.js'),
];
// Ein installiertes Plugin hat keinen Nachbarn, mit dem es sich vergleichen ließe.
const WITHOUT_NEIGHBOUR = { skip: fs.existsSync(ANGULAR_ROOT) ? false : 'plugins/angular fehlt neben plugins/dotnet' };

for (const copy of COPIES) {
  test(`copy_${path.basename(copy)}_IsByteIdenticalInBothPlugins`, WITHOUT_NEIGHBOUR, () => {
    const dotnetFile = path.join(DOTNET_ROOT, copy);
    const angularFile = path.join(ANGULAR_ROOT, copy);

    const identical = fs.readFileSync(dotnetFile).equals(fs.readFileSync(angularFile));

    assert.ok(identical, `${dotnetFile} und ${angularFile} sind nicht gleich: Kopie in beiden Plugins ändern`);
  });
}
