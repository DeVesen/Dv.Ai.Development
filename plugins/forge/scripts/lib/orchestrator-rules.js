'use strict';

// Liest den Wert aus shared/orchestrator-rules.md, der einen Stelle für das Maximum der Followup-Runden.
// Skripte, Skills, Brief und README nennen die Zahl nicht selbst.

const fs = require('node:fs');
const path = require('node:path');
const { FlowError } = require('./flow-error');

const RULES_FILE = path.join(__dirname, '..', '..', 'shared', 'orchestrator-rules.md');
const MAX_FOLLOWUPS_LINE = /^- Maximum Followup-Runden: (\d+)[ \t]*$/m;

class RulesError extends FlowError {}

function maxFollowups(file = RULES_FILE) {
  const match = MAX_FOLLOWUPS_LINE.exec(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
  if (!match) throw new RulesError(`Regeldatei ohne Zeile "Maximum Followup-Runden": ${file}`);
  return Number(match[1]);
}

module.exports = { RULES_FILE, RulesError, maxFollowups };
