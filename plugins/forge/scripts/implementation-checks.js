#!/usr/bin/env node
'use strict';

// Skript-Prüfungen des Implementierungs-Reviews: Plan↔Diff, mechanische Code-Hinweise (alle 🟡) und, falls gegeben, das Ergebnis von verify-run.js.
// Schreibt ein Reviewer-Ergebnis `skript` im Findings-Format; aggregate-findings.js liest es mit `--skript`.
// Ausgabe: `SKRIPT befunde=<n>` und die Zeilen des Plan-Abgleichs. Exit 2 bei falschem Aufruf, 1 bei Fehler.

const fs = require('node:fs');
const path = require('node:path');
const { planDiff, formatPlanDiff, planDiffFindings } = require('./lib/plan-diff');
const { codeHints } = require('./lib/code-hints');

const USAGE = 'Aufruf: node implementation-checks.js --plan <P> --repo <R> --base <B> --out <datei> [--testlauf <pruefung.json>]\n';
const OPTIONS = ['--plan', '--repo', '--base', '--out', '--testlauf'];

function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!OPTIONS.includes(args[index]) || args[index + 1] === undefined) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  return values.plan && values.repo && values.base && values.out ? values : null;
}

// Ein roter Lauf aus verify-run.js ist 🔴 an der Stelle `Testlauf`, mit der letzten Ausgabezeile als Zitat.
function testFindings(file) {
  if (!file || !fs.existsSync(file)) return [];
  const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (result.laeufe ?? []).filter((run) => run.exit !== 0 && !(result.ergebnis === 'docker' && run.docker)).map((run) => ({
    location: 'Testlauf',
    quote: `Quelle: ${run.befehl} → exit ${run.exit}: ${String(run.ausgabe).split('\n').filter(Boolean).at(-1) ?? ''}`,
    severity: 'red',
    consequence: `${run.schluessel} ist rot auf ${String(result.head).slice(0, 12)}.`,
    rationale: 'Skript-Prüfung verify-run.js',
  }));
}

function main() {
  const values = parse(process.argv.slice(2));
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  const repo = path.resolve(values.repo);
  try {
    const diff = planDiff(values.plan, repo, values.base);
    const findings = [...planDiffFindings(diff, repo), ...codeHints(repo, values.base), ...testFindings(values.testlauf)];
    const summary = `Plan↔Diff: ${diff.planned} geplante, ${diff.changed} geänderte Dateien${values.testlauf ? '; Testlauf aus verify-run.js' : ''}`;
    fs.mkdirSync(path.dirname(path.resolve(values.out)), { recursive: true });
    fs.writeFileSync(values.out, `${JSON.stringify({ reviewer: 'skript', summary, findings }, null, 2)}\n`);
    process.stdout.write(`${[`SKRIPT befunde=${findings.length}`, ...formatPlanDiff(diff)].join('\n')}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { testFindings };
