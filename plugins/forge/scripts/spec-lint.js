#!/usr/bin/env node
'use strict';

// Formprüfung einer Spec ohne KI. Ausgabe: Kopfzeile `LINT fehler=<n> warnungen=<m> …`, je Befund eine Zeile.
// Exit 1 bei mindestens einem Fehler, 2 bei falschem Aufruf. Mit --json schreibt das Skript Befunde und Kennzahlen als Datei.

const fs = require('node:fs');
const { lintSpec } = require('./lib/spec-lint');

const USAGE = 'Aufruf: node spec-lint.js <spec.md> [--json <datei>]\n';

function formatResult({ issues, metrics }) {
  const head = `LINT fehler=${metrics.fehler} warnungen=${metrics.warnungen} ac=${metrics.ac} w=${metrics.w} ohne-tag=${metrics.ohneTag}`;
  const lines = issues.map((entry) => `${entry.severity.toUpperCase()} ${entry.rule} · ${entry.location}: ${entry.message}`);
  return [head, ...lines].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf('--json');
  const json = jsonIndex === -1 ? null : args[jsonIndex + 1];
  const [spec] = jsonIndex === -1 ? args : args.filter((arg, index) => index !== jsonIndex && index !== jsonIndex + 1);
  if (!spec || (jsonIndex !== -1 && !json)) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  let text;
  try {
    text = fs.readFileSync(spec, 'utf8');
  } catch {
    process.stderr.write(`Spec nicht lesbar: ${spec}\n`);
    process.exit(2);
  }
  const result = lintSpec(text);
  if (json) fs.writeFileSync(json, `${JSON.stringify({ spec, ...result }, null, 2)}\n`);
  process.stdout.write(`${formatResult(result)}\n`);
  process.exit(result.metrics.fehler > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { formatResult };
