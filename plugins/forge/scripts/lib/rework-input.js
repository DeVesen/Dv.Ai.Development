'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { nextEntryNumber, documentQuestions } = require('./questions');
const { renderGroup, REWORK_MARK } = require('./groups');
const { parseScout } = require('../followup');
const { ROUND_ONE, readText, readLines, readJson, writeText } = require('./flow-files');

// Stand vor der Nacharbeit sichern und die Nummer ihrer R-Einträge vergeben.
function snapshot(workspace, doc) {
  const text = readText(doc);
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(workspace, 'vorher.md'), text);
  return `EINTRAG R${nextEntryNumber(text)}`;
}

function proposalsByGroup(file) {
  return new Map(parseScout(readLines(file)).map((group) => [`${group.severity} ${group.location}`, group]));
}

function proposalLines(group, proposals) {
  const scouted = proposals.get(`🔴 ${group.label}`);
  if (!scouted) return ['Scout-Vorschläge: keine'];
  return ['Scout-Vorschläge:', ...scouted.proposals.map((text, index) => `${index + 1}. ${text}`), `**Bevorzugt: ${scouted.preferred}**`];
}

function questionLines(questions) {
  if (questions.length === 0) return [];
  return ['', '## Offene Fragen', ...questions.map((question) => `- ${question.id} · ${question.place} — ${question.question}`)];
}

// Eingabe der Nacharbeit: nur die 🔴-Stellen mit Findings und Scout-Vorschlägen, dazu alle offenen Fragen des Dokuments.
function writeReworkInput(options) {
  const dir = path.join(options.workspace, ROUND_ONE);
  const reds = readJson(path.join(dir, 'einstufung.json')).groups.filter((group) => group.color === 'red');
  const proposals = proposalsByGroup(path.join(dir, 'scout.md'));
  const questions = documentQuestions(options, readText(options.doc));
  const blocks = reds.map((group) => [renderGroup(group), ...proposalLines(group, proposals)].join('\n'));
  const body = blocks.length > 0 ? blocks.join('\n\n') : 'Keine 🔴-Stellen.';
  writeText(path.join(dir, 'nacharbeit-eingabe.md'), [REWORK_MARK, '', body, ...questionLines(questions)].join('\n'));
  return [`NACHARBEIT stellen=${reds.length} fragen=${questions.length}`, snapshot(options.workspace, options.doc)].join('\n');
}

module.exports = { snapshot, writeReworkInput };
