'use strict';

// Icons, Rangfolge, Zellen und Gruppenformat teilt der Review-Ablauf mit aggregate-findings.js, das followup.js liest.
const {
  SEVERITY_RANK: RANK, SEVERITY_ICON: ICON, REWORK_MARK, cell, reworkHeading, reworkLine,
} = require('../aggregate-findings');
const { collapse } = require('./places');

function byRank(a, b) {
  return RANK[b.color] - RANK[a.color];
}

function withColor(group) {
  const color = [...group.items].sort(byRank)[0].color;
  const reviewers = [...new Set(group.items.map((item) => item.reviewer))];
  return { ...group, color, reviewers };
}

function byColorThenKey(a, b) {
  return byRank(a, b) || a.key.localeCompare(b.key);
}

// Findings je Stelle; die Gruppe trägt die höchste Farbe ihrer Findings. Item: { reviewer, category, color, place, finding }.
function groupRated(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.place.key)) groups.set(item.place.key, { key: item.place.key, label: item.place.label, items: [] });
    groups.get(item.place.key).items.push(item);
  }
  return [...groups.values()].map(withColor).sort(byColorThenKey);
}

function countColors(groups) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.color] += 1;
  return counts;
}

function itemLine(item) {
  return reworkLine(item.reviewer, item.category, item.finding);
}

// Die Stelle steht auf einer Zeile, sonst läse followup.js parseRework falsche oder zusätzliche Gruppen.
function groupHeading(group) {
  return reworkHeading(ICON[group.color], collapse(group.label), group.reviewers);
}

function renderGroup(group) {
  return [groupHeading(group), ...group.items.map(itemLine)].join('\n');
}

// Gruppen im Aggregat-Format, das Scout, Nacharbeit und followup.js lesen.
function renderGroups(groups) {
  return [REWORK_MARK, ...groups.map(renderGroup)].join('\n\n');
}

function consequences(group) {
  return [...group.items].sort(byRank).map((item) => `${ICON[item.color]} ${cell(item.finding.consequence)}`).join('<br>');
}

function renderTable(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) => {
    const categories = [...new Set(group.items.map((item) => item.category))].join(', ');
    return `| ${ICON[group.color]} | ${cell(group.label)} | ${categories} | ${group.reviewers.join(', ')} | ${consequences(group)} |`;
  });
  return ['| Stufe | Stelle | Kategorie | Reviewer | Konsequenzen |', '|---|---|---|---|---|', ...rows].join('\n');
}

module.exports = { ICON, REWORK_MARK, groupRated, countColors, cell, renderGroup, renderGroups, renderTable };
