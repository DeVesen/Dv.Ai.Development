'use strict';

// Ersatz für dotnet und die Angular CLI: gibt eine vorgegebene Ausgabe aus und merkt sich die Argumente.

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

// Legt ein Angular-Projekt mit angular.json und einer falschen CLI unter node_modules an.
function fakeAngular(angularJson, output, exitCode = 0, { withBuilderPackages = true } = {}) {
  const dir = tempDir('dv-forge-ng-');
  fs.writeFileSync(path.join(dir, 'angular.json'), JSON.stringify(angularJson));
  const bin = path.join(dir, 'node_modules', '@angular', 'cli', 'bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'ng.js'), `${FAKE}\n`);
  const builders = Object.values(angularJson.projects ?? {}).flatMap((project) => Object.values(project.architect ?? project.targets ?? {}))
    .map((target) => String(target.builder ?? '').split(':')[0]).filter(Boolean);
  for (const name of withBuilderPackages ? builders : []) {
    fs.mkdirSync(path.join(dir, 'node_modules', name), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', name, 'package.json'), JSON.stringify({ name }));
  }
  const env = { ...process.env, ...fakeEnv(dir, output, exitCode) };
  return { dir, env, args: () => JSON.parse(fs.readFileSync(env.FAKE_ARGS, 'utf8')) };
}

module.exports = { tempDir, fakeDotnet, fakeAngular };
