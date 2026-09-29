'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePlace } = require('./places');
const { rateFinding } = require('./rules');
const { FlowError, readJson } = require('./flow-files');

const SCRIPT_FILE = 'skript-pruefung.json';
const SCRIPT_REVIEWER = 'skript';
const SCRIPT_CATEGORY = 'skript-prüfung';
const SCRIPT_FIELDS = ['location', 'quote', 'consequence', 'rationale'];

function placeOf(finding, places) {
  const place = resolvePlace(finding.location, finding.quote, places);
  return { key: place.key, label: place.label };
}

function rateReviewer(name, findings, places, context) {
  return findings.map((finding) => {
    const place = placeOf(finding, places);
    const rating = rateFinding(finding, place, { ...context, reviewer: name });
    return { reviewer: name, category: finding.category, color: rating.color, dropped: rating.dropped, place, finding };
  });
}

function isScriptFinding(finding) {
  return finding !== null && typeof finding === 'object'
    && SCRIPT_FIELDS.every((field) => typeof finding[field] === 'string')
    && finding.location.trim() !== '';
}

function scriptFindings(file) {
  const findings = readJson(file)?.findings;
  if (!Array.isArray(findings) || !findings.every(isScriptFinding)) {
    throw new FlowError(`${SCRIPT_FILE} verletzt das Format { findings: [{ location, quote, consequence, rationale }] }: ${file}`);
  }
  return findings;
}

// Die Plan-Prüfungen aus plan-checks.js nennen ihre Prüfung und Kategorie; beide bleiben in item.finding sichtbar.
function scriptReviewer(finding) {
  return typeof finding.check === 'string' ? `${SCRIPT_REVIEWER}:${finding.check}` : SCRIPT_REVIEWER;
}

// Befunde einer Skript-Prüfung sind immer 🔴 und entfallen nie.
function scriptItems(dir, places) {
  const file = path.join(dir, SCRIPT_FILE);
  if (!fs.existsSync(file)) return [];
  return scriptFindings(file).map((finding) => ({
    reviewer: scriptReviewer(finding), category: SCRIPT_CATEGORY, color: 'red', dropped: null, script: true,
    place: placeOf(finding, places), finding,
  }));
}

function droppedList(items) {
  return items.filter((item) => item.dropped).map((item) => ({ reviewer: item.reviewer, location: item.finding.location, reason: item.dropped }));
}

module.exports = { SCRIPT_FILE, SCRIPT_CATEGORY, rateReviewer, scriptItems, droppedList };
