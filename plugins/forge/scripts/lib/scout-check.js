'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseRework, parseScout } = require('../followup');
const { readLines } = require('./flow-files');

function groupId(group) {
  return `${group.severity} ${group.location}`;
}

// Bevorzugt ist der Vorschlag, den genau eine Bevorzugt-Zeile mit der Nummer eines Vorschlags nennt; sonst gilt keiner als bevorzugt.
function preferredProblem(group) {
  if (group.preferredCount !== 1) return 'nicht genau ein bevorzugter Vorschlag';
  return Number.isInteger(group.preferred) && group.preferred >= 1 && group.preferred <= group.proposals.length ? null : 'kein gültiger bevorzugter Vorschlag';
}

function groupProblem(group) {
  if (!group) return 'Gruppe fehlt';
  if (group.proposals.length < 1 || group.proposals.length > 3) return `${group.proposals.length} Vorschläge statt 1 bis 3`;
  return preferredProblem(group);
}

// Jede Gruppe der Scout-Eingabe hat ein bis drei Vorschläge, genau einer bevorzugt; andere Gruppen gibt es nicht.
function checkScout(dir) {
  const expected = parseRework(readLines(path.join(dir, 'scout-eingabe.md'))).map(groupId);
  const file = path.join(dir, 'scout.md');
  if (!fs.existsSync(file)) return 'SCOUT ungültig: Ergebnisdatei fehlt';
  const groups = new Map(parseScout(readLines(file)).map((group) => [groupId(group), group]));
  const wrong = expected.map((id) => [id, groupProblem(groups.get(id))]).find(([, problem]) => problem);
  if (wrong) return `SCOUT ungültig: ${wrong[0]}: ${wrong[1]}`;
  const extra = [...groups.keys()].filter((id) => !expected.includes(id));
  return extra.length > 0 ? `SCOUT ungültig: Gruppe nicht in der Eingabe: ${extra.join(', ')}` : 'SCOUT ok';
}

module.exports = { checkScout, preferredProblem };
