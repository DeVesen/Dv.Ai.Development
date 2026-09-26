#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
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

function findBalancedObjectEnd(text, start) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findBareResultsObjects(text) {
  const found = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '{') { i++; continue; }
    const end = findBalancedObjectEnd(text, i);
    if (end === -1) { i++; continue; }
    let parsed;
    try {
      parsed = JSON.parse(text.slice(i, end + 1));
    } catch {
      parsed = undefined;
    }
    if (parsed === undefined) { i++; continue; }
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      && Object.prototype.hasOwnProperty.call(parsed, 'results')) {
      found.push(parsed);
    }
    i = end + 1;
  }
  return found;
}

function parseResults(result) {
  const text = String(result);
  const blocks = [...text.matchAll(JSON_BLOCK)];
  let parsed;
  if (blocks.length > 0) {
    parsed = JSON.parse(blocks[blocks.length - 1][1]);
  } else {
    const bareObjects = findBareResultsObjects(text);
    if (bareObjects.length === 0) throw new Error('Kein JSON-Block in der Rückgabe des Nacharbeiters');
    if (bareObjects.length > 1) throw new Error('Mehrdeutige Rückgabe: mehrere JSON-Objekte mit "results" ohne json-Fence');
    parsed = bareObjects[0];
  }
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

function readDir(dir) {
  const aggregateFile = path.join(dir, 'aggregate.md');
  const reworkFile = path.join(dir, 'rework.json');
  if (!fs.existsSync(aggregateFile)) throw new Error(`Aggregation fehlt: ${aggregateFile}`);
  if (!fs.existsSync(reworkFile)) throw new Error(`Ergebnis des Nacharbeiters fehlt: ${reworkFile}`);
  const aggregate = fs.readFileSync(aggregateFile, 'utf8');
  const result = `\`\`\`json\n${fs.readFileSync(reworkFile, 'utf8').trim()}\n\`\`\``;
  return `${AGGREGATE_MARK}\n${aggregate}\n${RESULT_MARK}\n${result}\n`;
}

function roundDir(workspace, round) {
  return path.join(workspace, `runde-${round}`);
}

function redKeys(dir) {
  const file = path.join(dir, 'aggregate.md');
  if (!fs.existsSync(file)) return [];
  return redLocations(fs.readFileSync(file, 'utf8')).map((location) => normalizeLocation(location));
}

function changedKeys(dir) {
  const file = path.join(dir, 'rework.json');
  if (!fs.existsSync(file)) return [];
  try {
    return parseResults(fs.readFileSync(file, 'utf8'))
      .filter((entry) => entry.status === 'changed')
      .map((entry) => normalizeLocation(entry.location));
  } catch {
    return [];
  }
}

function progress(workspace, round) {
  const before = new Set(redKeys(roundDir(workspace, round)));
  const after = new Set(redKeys(roundDir(workspace, round + 1)));
  const fixed = changedKeys(roundDir(workspace, round)).filter((key) => before.has(key) && !after.has(key));
  return { progress: fixed.length > 0, fixed };
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

const USAGE = 'Aufruf: node rework-outcome.js --escalation-status <status> [--dir <runden-ordner>] < eingabe\n'
  + '       node rework-outcome.js progress --dir <arbeitsbereich> --round <r>\n';

function optionValue(args, name) {
  const index = args.indexOf(name);
  const value = index === -1 ? null : args[index + 1] ?? null;
  return value && !value.startsWith('--') ? value : null;
}

function runProgress(args) {
  const dir = optionValue(args, '--dir');
  const round = optionValue(args, '--round');
  if (!dir || !/^\d+$/.test(round ?? '')) return null;
  const outcome = progress(dir, Number(round));
  return [`PROGRESS ${outcome.progress}`, ...outcome.fixed.map((key) => `FIXED ${key}`)].join('\n');
}

function runEscalation(args) {
  const status = parseStatus(args);
  if (!status) return null;
  const dir = optionValue(args, '--dir');
  return render(evaluate(dir ? readDir(dir) : fs.readFileSync(0, 'utf8'), status));
}

function main() {
  const args = process.argv.slice(2);
  try {
    const output = args[0] === 'progress' ? runProgress(args) : runEscalation(args);
    if (output === null) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    process.stdout.write(`${output}\n`);
  } catch (error) {
    process.stderr.write(`dv-forge rework-outcome: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { evaluate, render, parseStatus, readDir, progress };
