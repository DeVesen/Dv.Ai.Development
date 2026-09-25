#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { normalizeLocation } = require('./aggregate-findings.js');

const AGGREGATE_MARK = '=== AGGREGATE ===';
const RESULT_MARK = '=== REWORK-RESULT ===';
const RED_GROUP = /^### 🔴 (.+) \([^()]*\)$/;
const JSON_BLOCK = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

function splitInput(text) {
  const source = String(text);
  const aggregateAt = source.indexOf(AGGREGATE_MARK);
  const resultAt = source.indexOf(RESULT_MARK);
  if (aggregateAt === -1 || resultAt === -1 || resultAt < aggregateAt) {
    throw new Error(`Eingabe braucht ${AGGREGATE_MARK} und danach ${RESULT_MARK}`);
  }
  return {
    aggregate: source.slice(aggregateAt + AGGREGATE_MARK.length, resultAt),
    result: source.slice(resultAt + RESULT_MARK.length),
  };
}

function redLocations(aggregate) {
  return aggregate.split(/\r?\n/)
    .map((line) => RED_GROUP.exec(line.trimEnd()))
    .filter(Boolean)
    .map((match) => match[1]);
}

function isValidEntry(entry) {
  return entry !== null && typeof entry === 'object'
    && typeof entry.location === 'string' && entry.location.trim() !== ''
    && typeof entry.status === 'string' && entry.status !== '';
}

function parseResults(result) {
  const blocks = [...String(result).matchAll(JSON_BLOCK)];
  if (blocks.length === 0) throw new Error('Kein JSON-Block in der Rückgabe des Nacharbeiters');
  const parsed = JSON.parse(blocks[blocks.length - 1][1]);
  const valid = parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.results)
    && parsed.results.every(isValidEntry);
  if (!valid) throw new Error('JSON-Block verletzt das Rückgabe-Format');
  return parsed.results;
}

function evaluate(text, escalationStatus) {
  const { aggregate, result } = splitInput(text);
  const results = parseResults(result);
  const statusByKey = new Map(results.map((entry) => [normalizeLocation(entry.location), entry.status]));
  const reds = redLocations(aggregate);
  const allRedEscalated = reds.length > 0
    && reds.every((location) => statusByKey.get(normalizeLocation(location)) === escalationStatus);
  const escalated = results.filter((entry) => entry.status === escalationStatus).map((entry) => entry.location.trim());
  return { allRedEscalated, escalated };
}

function render(outcome) {
  return [
    `OUTCOME all-red-escalated=${outcome.allRedEscalated} escalated=${outcome.escalated.length}`,
    ...outcome.escalated.map((location) => `ESCALATED ${location}`),
  ].join('\n');
}

function parseStatus(args) {
  const index = args.indexOf('--escalation-status');
  const value = index === -1 ? '' : String(args[index + 1] ?? '');
  return value.startsWith('--') ? '' : value;
}

function main() {
  const status = parseStatus(process.argv.slice(2));
  if (!status) {
    process.stderr.write('Aufruf: node rework-outcome.js --escalation-status <status> < eingabe\n');
    process.exit(2);
  }
  try {
    process.stdout.write(`${render(evaluate(fs.readFileSync(0, 'utf8'), status))}\n`);
  } catch (error) {
    process.stderr.write(`dv-forge rework-outcome: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { evaluate, render, parseStatus };
