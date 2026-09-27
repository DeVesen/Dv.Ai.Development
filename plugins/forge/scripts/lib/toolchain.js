'use strict';

// Übersetzt "dv-forge: <plattform>-<kommando>" in den Aufruf des Skripts unter scripts/toolchain/.
// So stehen in CLAUDE.md und Plänen keine maschinenabhängigen Plugin-Pfade.
// Zieht später mit den Skripten in forge-dotnet und forge-angular.

const path = require('node:path');
const { toPosix } = require('./posix');

const REFERENCE = /\bdv-forge:\s*((?:angular|dotnet)-(?:build|test|lint))\b/g;
const TOOLCHAIN_DIR = path.join(__dirname, '..', 'toolchain');

function resolveToolchain(text) {
  return String(text).replace(REFERENCE, (_, name) => `node "${toPosix(path.join(TOOLCHAIN_DIR, `${name}.js`))}"`);
}

module.exports = { resolveToolchain };
