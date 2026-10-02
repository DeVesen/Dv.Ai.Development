'use strict';

// Ersatz für dotnet: gibt eine vorgegebene Ausgabe aus und merkt sich die Argumente.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FAKE = [
  "const fs = require('node:fs');",
  "fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(process.argv.slice(2)));",
  "process.stdout.write(fs.readFileSync(process.env.FAKE_OUTPUT, 'utf8'));",
  "setTimeout(() => process.exit(Number(process.env.FAKE_EXIT ?? 0)), Number(process.env.FAKE_SLEEP_MS ?? 0));",
].join('\n');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fakeEnv(dir, output, exitCode) {
  const outputFile = path.join(dir, 'fake-output.txt');
  fs.writeFileSync(outputFile, output);
  return { FAKE_OUTPUT: outputFile, FAKE_EXIT: String(exitCode), FAKE_ARGS: path.join(dir, 'fake-args.json') };
}

// Legt eine ausführbare Datei "dotnet" in einen eigenen PATH-Ordner (nur POSIX).
function fakeDotnet(output, exitCode = 0) {
  const dir = tempDir('dv-forge-dotnet-');
  const script = path.join(dir, 'dotnet');
  fs.writeFileSync(script, `#!${process.execPath}\n${FAKE}\n`);
  fs.chmodSync(script, 0o755);
  const env = { ...process.env, ...fakeEnv(dir, output, exitCode), PATH: `${dir}${path.delimiter}${process.env.PATH}` };
  return { dir, env, args: () => JSON.parse(fs.readFileSync(env.FAKE_ARGS, 'utf8')) };
}

module.exports = { tempDir, fakeDotnet };
