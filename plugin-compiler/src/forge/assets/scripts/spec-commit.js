#!/usr/bin/env node
'use strict';

// Commit der Spec für den Spec-Review-Orchestrator.
//   preflight --spec <S> --state <ST>               Ausgabe `ORT=`, `SPEC-VORBESTAND=`, `IGNORIERT=`, `DIFF=`; Exit 1 bei anderem Ort
//   commit --spec <S> --slug <slug> [--wi <WI>]     Ausgabe `COMMIT=<hash>|nichts|ignoriert|frei`; Exit 1 bei Fehlschlag, die Spec bleibt gestaged
// `frei`: Das Projekt setzt eine Commit-Konvention; den Betreff wählt der Skill. Exit 2 bei falschem Aufruf.

const { preflight, commit, SpecCommitError } = require('./lib/spec-commit');
const { ConfigError } = require('./forge-config');
const { StateError } = require('./orchestrator-state');

const USAGE = [
  'Aufruf: node spec-commit.js preflight --spec <S> --state <ST>',
  '       node spec-commit.js commit --spec <S> --slug <slug> [--wi <WI>]',
  '',
].join('\n');
const COMMANDS = {
  preflight: { needs: ['spec', 'state'], optional: [] },
  commit: { needs: ['spec', 'slug'], optional: ['wi'] },
};

function parse(command, args) {
  const spec = COMMANDS[command];
  if (!spec) return null;
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]?.replace(/^--/, '');
    if (!args[index]?.startsWith('--') || ![...spec.needs, ...spec.optional].includes(name) || index + 1 >= args.length) return null;
    values[name] = args[index + 1];
  }
  return spec.needs.every((name) => values[name]) ? values : null;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const values = parse(command, rest);
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    if (command === 'commit') {
      process.stdout.write(`${commit(values)}\n`);
      return;
    }
    const result = preflight(values);
    process.stdout.write(`${result.output}\n`);
    process.exit(result.failed ? 1 : 0);
  } catch (error) {
    if (!(error instanceof SpecCommitError || error instanceof ConfigError || error instanceof StateError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
