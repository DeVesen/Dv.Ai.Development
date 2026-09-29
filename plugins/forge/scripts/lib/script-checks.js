'use strict';

const path = require('node:path');
const { PLAN_CHECKS } = require('./plan-checks');
const { readContext } = require('../workspace');
const { SCRIPT_FILE } = require('./rated-items');
const { readText, writeJson } = require('./flow-files');

// Skript-Prüfungen je Review: { name, run(text, context) → [{ location, quote, category, consequence, rationale }] }.
const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': PLAN_CHECKS };

function checkContext(options) {
  const { spec = null, repo = null } = readContext(options.workspace);
  return { doc: options.doc, spec: options.spec ?? spec, repo };
}

// Befunde der Skript-Prüfungen in `<W>/<runde>/skript-pruefung.json` (Runde 1 oder Nachprüfung); `rate` und `verify` lesen sie über scriptItems.
function writeScriptChecks(options) {
  const text = readText(options.doc);
  const context = checkContext(options);
  const findings = SCRIPT_CHECKS[options.review].flatMap((check) => check.run(text, context).map((finding) => ({ ...finding, check: check.name })));
  writeJson(path.join(options.workspace, options.round, SCRIPT_FILE), { findings });
  return `SKRIPT befunde=${findings.length}`;
}

module.exports = { SCRIPT_CHECKS, writeScriptChecks };
