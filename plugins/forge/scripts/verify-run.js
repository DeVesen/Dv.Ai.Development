#!/usr/bin/env node
'use strict';

// Führt Build, Test und Lint aus den Projekt-Einstellungen im Repo aus und schreibt das Ergebnis als Datei.
// Ausgabe: `PRUEFUNG ergebnis=<gruen|rot|docker|keine> head=<sha> offen=<n> [datei=<pfad>]`, je Lauf eine Zeile `LAUF`,
// je übersprungenem Schlüssel `UEBERSPRUNGEN`, bei Rot die letzten Zeilen der Ausgabe. Exit 1 bei `rot`, 2 bei falschem Aufruf.

const path = require('node:path');
const { readConfig } = require('./forge-config');
const { KEYS, verifyRun, formatVerify, writeResult } = require('./lib/verify-run');

const USAGE = 'Aufruf: node verify-run.js --repo <R> [--out <datei>] [--nur Build,Test,Lint] [--seit-gruen <umsetzung.md>]\n';
const OPTIONS = ['--repo', '--out', '--nur', '--seit-gruen'];

function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!OPTIONS.includes(args[index]) || args[index + 1] === undefined) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  return values.repo ? values : null;
}

function onlyKeys(value) {
  if (!value) return KEYS;
  const keys = value.split(',').map((key) => KEYS.find((name) => name.toLowerCase() === key.trim().toLowerCase()));
  return keys.every(Boolean) ? keys : null;
}

function main() {
  const values = parse(process.argv.slice(2));
  const only = values ? onlyKeys(values.nur) : null;
  if (!values || !only) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  const repo = path.resolve(values.repo);
  const { config } = readConfig(repo);
  const result = verifyRun({ repo, config, only, report: values['seit-gruen'] ?? null });
  if (values.out) writeResult(values.out, result);
  process.stdout.write(`${formatVerify(result, values.out)}\n`);
  process.exit(result.ergebnis === 'rot' ? 1 : 0);
}

if (require.main === module) main();
