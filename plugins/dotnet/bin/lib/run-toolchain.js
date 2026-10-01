'use strict';

// Startet das Toolchain-Skript, das zum Namen des Start-Befehls passt: dv-dotnet-test → scripts/toolchain/dotnet-test.js.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOLCHAIN_DIR = path.join(__dirname, '..', '..', 'scripts', 'toolchain');

function scriptFor(starterFile) {
  return path.join(TOOLCHAIN_DIR, `${path.basename(starterFile).replace(/^dv-/, '')}.js`);
}

// Meldung, wenn das Skript nicht starten konnte oder durch ein Signal endete; sonst null.
function failureMessage(starterFile, result) {
  const command = path.basename(starterFile);
  if (result.error) return `${command}: Start fehlgeschlagen: ${result.error.message}`;
  if (result.signal) return `${command}: beendet durch Signal ${result.signal}`;
  return null;
}

// Gibt den Exit-Code des Skripts zurück; fehlt das Skript, startet es nicht oder endet es durch ein Signal, 1 mit Meldung auf stderr.
function run(starterFile, args = process.argv.slice(2)) {
  const script = scriptFor(starterFile);
  if (!fs.existsSync(script)) {
    process.stderr.write(`${path.basename(starterFile)}: Skript nicht gefunden: ${script}\n`);
    return 1;
  }
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  const failure = failureMessage(starterFile, result);
  if (failure === null) return result.status;
  process.stderr.write(`${failure}\n`);
  return 1;
}

module.exports = { run, scriptFor, failureMessage };
