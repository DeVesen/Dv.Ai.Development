'use strict';

const path = require('node:path');
const { PLAN_CHECKS } = require('./plan-checks');
const { readContext } = require('../workspace');
const { SCRIPT_FILE } = require('./rated-items');
const { ROUND_ONE, readText, writeJson } = require('./flow-files');

// Skript-Prüfungen je Review: { name, run(text, context) → [{ location, quote, category, consequence, rationale }] }.
const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': PLAN_CHECKS };

function checkContext(options) {
  const { spec = null, repo = null } = readContext(options.workspace);
  return { doc: options.doc, spec: options.spec ?? spec, repo };
}

// Befunde der Skript-Prüfungen von Runde 1 in `<W>/runde-1/skript-pruefung.json`; `rate` liest sie über scriptItems.
function writeScriptChecks(options) {
  const text = readText(options.doc);
  const context = checkContext(options);
  const findings = SCRIPT_CHECKS[options.review].flatMap((check) => check.run(text, context).map((finding) => ({ ...finding, check: check.name })));
  writeJson(path.join(options.workspace, ROUND_ONE, SCRIPT_FILE), { findings });
  return `SKRIPT befunde=${findings.length}`;
}

module.exports = { SCRIPT_CHECKS, writeScriptChecks };
