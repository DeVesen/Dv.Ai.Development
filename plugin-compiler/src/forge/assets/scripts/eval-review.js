#!/usr/bin/env node
'use strict';

// Wertet Review-Läufe gegen ein Golden-Set aus evals/ aus. Läufe kommen als einstufung.json, ergebnis.json oder als
// reviews.jsonl (je Zeile ein Lauf; nur Zeilen des Reviews aus dem Golden-Set, mit --letzte nur die letzten n).
// Ausgabe: `EVAL fall=… laeufe=… recall=… precision=… belegquote=… stabilitaet=…`, dann `VERFEHLT`/`ZUSATZ` je Lauf.

const fs = require('node:fs');
const { evaluate, formatEvaluation } = require('./lib/eval-review');

const USAGE = 'Aufruf: node eval-review.js --golden <evals/fall.json> --lauf <datei>... [--letzte <n>] [--json <datei>]\n';

function parse(args) {
  const values = { lauf: [] };
  for (let index = 0; index < args.length; index += 2) {
    const [name, value] = [args[index], args[index + 1]];
    if (value === undefined) return null;
    if (name === '--lauf') values.lauf.push(value);
    else if (['--golden', '--letzte', '--json'].includes(name)) values[name.slice(2)] = value;
    else return null;
  }
  return values.golden && values.lauf.length > 0 ? values : null;
}

function runsOf(file, review) {
  const text = fs.readFileSync(file, 'utf8');
  if (!file.endsWith('.jsonl')) return [JSON.parse(text)];
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((run) => run.review === review);
}

function main() {
  const values = parse(process.argv.slice(2));
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  const golden = JSON.parse(fs.readFileSync(values.golden, 'utf8'));
  let runs = values.lauf.flatMap((file) => runsOf(file, golden.review));
  if (values.letzte) runs = runs.slice(-Number(values.letzte));
  if (runs.length === 0) {
    process.stderr.write(`Kein Lauf für ${golden.review} gefunden\n`);
    process.exit(1);
  }
  const summary = evaluate(golden, runs);
  if (values.json) fs.writeFileSync(values.json, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${formatEvaluation(summary)}\n`);
}

if (require.main === module) main();
