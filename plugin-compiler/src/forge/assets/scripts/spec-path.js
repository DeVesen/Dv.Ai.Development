#!/usr/bin/env node
'use strict';

// Zielpfad der Spec beim Whiteboarding: `Spec-Ablage` mit `<datum>` und `<slug>`. Ausgabe `PFAD=<relativ zur Repo-Wurzel>` und
// `BASIS=<Kurzhash von HEAD>` (für den Kopf der Spec). Exit 1, wenn der Ort schon existiert (mit Vorschlag `<slug>-2`), 2 bei falschem Aufruf.

const { specPath, SpecPathError } = require('./lib/spec-path');
const { ConfigError } = require('./forge-config');

const USAGE = 'Aufruf: node spec-path.js --slug <slug> [--datum <YYYY-MM-DD>]\n';

function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--slug', '--datum'].includes(args[index]) || args[index + 1] === undefined) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  return values.slug ? values : null;
}

function main() {
  const values = parse(process.argv.slice(2));
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    const result = specPath(values);
    process.stdout.write(`PFAD=${result.pfad}\nBASIS=${result.basis}\n`);
  } catch (error) {
    if (!(error instanceof SpecPathError || error instanceof ConfigError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
