'use strict';

const { parseUnits, resolveUnit, quoteFromW } = require('./document-units');
const rules = require('./review-rules');
const { PLAN_CHECKS } = require('./plan-checks');

const CLOSING_QUOTE = String.fromCharCode(0x201c);

// Skript-Prüfungen je Review: { name, run(text, context) → [{ location, quote, category, consequence, rationale }] }.
const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': PLAN_CHECKS };

function runScriptChecks(text, checks, context = {}) {
  return checks.flatMap((check) => check.run(text, context).map((finding) => ({ reviewer: `skript:${check.name}`, finding, script: true })));
}

function documentOrder(model) {
  const order = new Map(model.units.map((unit, index) => [unit.canon, index]));
  return (group) => order.get(group.canon) ?? model.units.length;
}

function byColorThenPlace(model) {
  const place = documentOrder(model);
  return (a, b) => rules.COLOR_RANK[b.color] - rules.COLOR_RANK[a.color] || place(a) - place(b) || a.key.localeCompare(b.key);
}

// entries: [{ reviewer, finding, script? }]; script setzt nur runScriptChecks. Ergebnis: Gruppen je Stelle mit der höchsten Farbe ihrer Findings.
function classify(entries, { kind, text, openKeys = new Set(), verification = null, advisory = rules.ADVISORY[kind] }) {
  const model = parseUnits(text);
  const ctx = { advisory, openKeys, quoteFromW: (quote) => quoteFromW(quote, text), verification };
  const groups = new Map();
  const dropped = [];
  for (const { reviewer, finding, script = false } of entries) {
    const unit = resolveUnit(finding, model);
    const rating = rules.rateFinding(finding, reviewer, unit, ctx, script);
    if (rating.dropped) {
      dropped.push({ reviewer, key: unit.key, reason: rating.dropped });
      continue;
    }
    if (!groups.has(unit.canon)) groups.set(unit.canon, { key: unit.key, canon: unit.canon, color: 'green', items: [] });
    const group = groups.get(unit.canon);
    group.items.push({ reviewer, ...finding, script, color: rating.color, capped: rating.capped });
    if (rules.COLOR_RANK[rating.color] > rules.COLOR_RANK[group.color]) group.color = rating.color;
  }
  return { groups: [...groups.values()].sort(byColorThenPlace(model)), dropped };
}

function countColors(groups) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.color] += 1;
  return counts;
}

function reviewersOf(group) {
  return [...new Set(group.items.map((item) => item.reviewer))];
}

function cell(text) {
  return String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function heading(group) {
  return `### ${rules.COLOR_ICON[group.color]} ${group.key} (${reviewersOf(group).join(', ')})`;
}

function itemLine(item) {
  const capped = item.capped.length > 0 ? ` · höchstens 🟡: ${item.capped.join(', ')}` : '';
  return `- [${item.reviewer} · ${item.category}] Zitat: „${cell(item.quote)}${CLOSING_QUOTE} · Konsequenz: ${cell(item.consequence)} · Begründung: ${cell(item.rationale)}${capped}`;
}

function groupBlock(group) {
  return [heading(group), ...group.items.map(itemLine)].join('\n');
}

// Gruppen im Aggregat-Format, das Scout, Nacharbeit und followup.js lesen.
function reworkSection(groups) {
  return `=== REWORK ===\n${groups.length === 0 ? 'Keine Findings.' : groups.map(groupBlock).join('\n\n')}\n`;
}

function consequences(group) {
  return [...group.items].sort((a, b) => rules.COLOR_RANK[b.color] - rules.COLOR_RANK[a.color])
    .map((item) => `${rules.COLOR_ICON[item.color]} ${cell(item.consequence)}`).join('<br>');
}

function table(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) =>
    `| ${rules.COLOR_ICON[group.color]} | ${cell(group.key)} | ${group.items.length} | ${reviewersOf(group).join(', ')} | ${consequences(group)} |`);
  return ['| Stufe | Stelle | Anzahl | Reviewer | Konsequenzen |', '|---|---|---|---|---|', ...rows].join('\n');
}

function hasScript(group) {
  return group.items.some((item) => item.script);
}

module.exports = {
  SCRIPT_CHECKS, runScriptChecks, classify, countColors, reviewersOf, heading, itemLine, groupBlock, reworkSection, consequences, table, cell, hasScript,
};
