'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { FlowError } = require('./flow-error');

const ROUND_ONE = 'runde-1';
const ROUND_TWO = 'runde-2';
const FOLLOWUP = 'nacharbeit';
const CLOSING = 'abschluss';

function readText(file) {
  if (!fs.existsSync(file)) throw new FlowError(`Datei fehlt: ${file}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readLines(file) {
  return fs.existsSync(file) ? readText(file).split('\n') : [];
}

function parseJson(text, file) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
  }
}

// Vom Skript oder Orchestrator geschriebene Datei; kaputtes JSON bricht als FlowError mit Exit 1 ab.
function readJson(file, fallback) {
  if (!fs.existsSync(file) && fallback !== undefined) return fallback;
  return parseJson(readText(file), file);
}

// Ergebnis eines Agenten: fehlt die Datei oder ist sie kein JSON, steht der Grund in `problem`.
function readAgentJson(file) {
  if (!fs.existsSync(file)) return { value: null, problem: 'Ergebnisdatei fehlt' };
  try {
    return { value: JSON.parse(readText(file)), problem: null };
  } catch (error) {
    return { value: null, problem: `kein gültiges JSON: ${error.message}` };
  }
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

function writeJson(file, value) {
  writeText(file, JSON.stringify(value, null, 2));
}

module.exports = {
  ROUND_ONE, ROUND_TWO, FOLLOWUP, CLOSING, FlowError, readText, readLines, readJson, readAgentJson, writeText, writeJson,
};
