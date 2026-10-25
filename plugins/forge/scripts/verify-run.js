#!/usr/bin/env node
'use strict';

// Führt Build, Test und Lint aus den Projekt-Einstellungen im Repo aus und schreibt das Ergebnis als Datei.
// Ausgabe: `PRUEFUNG ergebnis=<gruen|rot|docker|keine> head=<sha> offen=<n> [datei=<pfad>]`, je Lauf eine Zeile `LAUF`,
// je übersprungenem Schlüssel `UEBERSPRUNGEN`, bei Rot die letzten Zeilen der Ausgabe. Exit 1 bei `rot`, 2 bei falschem Aufruf.
// `--basis <datei>`: Basis-Lauf vor Task 1. Nur `Test`, höchstens zweimal (der zweite Lauf nur nach einem roten ersten); beide Ausgaben vollständig
// als JSON `{ laeufe: [{ exit, ausgabe }], beideRot }` in die Datei. Ausgabe `BASIS rot=nein|ja`, Exit 0. Ist nicht beideRot,
// legt das Skript neben die Datei `basis-rot.md` mit `keine` an, die der Controller den Agents als `Basis rot:` übergibt.

const fs = require('node:fs');
const path = require('node:path');
const { readConfig } = require('./forge-config');
const { KEYS, verifyRun, basisRun, formatBasis, formatVerify, writeResult } = require('./lib/verify-run');

const USAGE = [
  'Aufruf: node verify-run.js --repo <R> [--out <datei>] [--nur Build,Test,Lint] [--seit-gruen <umsetzung.md>]',
  '       node verify-run.js --repo <R> --basis <datei>',
  '',
].join('\n');
const OPTIONS = ['--repo', '--out', '--nur', '--seit-gruen', '--basis'];

function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!OPTIONS.includes(args[index]) || args[index + 1] === undefined) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  if (values.basis && (values.out || values.nur || values['seit-gruen'])) return null;
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
  if (values.basis) {
    const basis = basisRun({ repo, config });
    writeResult(values.basis, { laeufe: basis.laeufe, beideRot: basis.beideRot });
    if (!basis.beideRot) fs.writeFileSync(path.join(path.dirname(path.resolve(values.basis)), 'basis-rot.md'), 'keine\n');
    process.stdout.write(`${formatBasis(basis)}\n`);
    return;
  }
  const result = verifyRun({ repo, config, only, report: values['seit-gruen'] ?? null });
  if (values.out) writeResult(values.out, result);
  process.stdout.write(`${formatVerify(result, values.out)}\n`);
  process.exit(result.ergebnis === 'rot' ? 1 : 0);
}

if (require.main === module) main();
