'use strict';

const { normalizeLocation } = require('../aggregate-findings');
const { table, consequences, cell, hasScript } = require('./review-groups');

// Status in fester Rangfolge; es gilt der erste, der zutrifft.
function statusOf({ failed, open, verification }) {
  if (failed.length > 0) return `unvollständig, ausgefallen: ${failed.join(', ')}`;
  if (open.length > 0) return 'Fragen offen';
  if (verification && verification.offen > 0) return `nicht bereit, ${verification.offen} × 🔴 offen`;
  return verification ? 'sauber nach Nachprüfung' : 'sauber nach Runde 1';
}

function verdictTable(verdicts) {
  if (verdicts.length === 0) return 'Keine Punkte auf der Prüfliste.';
  const rows = verdicts.map((verdict) => {
    const shown = verdict.script && verdict.verdict === 'nicht erledigt' ? '🔴 Skript-Prüfung' : verdict.verdict;
    return `| ${cell(verdict.key)} | ${shown} | ${cell(verdict.rationale)} |`;
  });
  return ['| Stelle | Urteil | Begründung |', '|---|---|---|', ...rows].join('\n');
}

function listSection(title, groups) {
  if (groups.length === 0) return [];
  return [`### ${title}`, ...groups.map((group) => `- ${group.color === 'red' ? '🔴 ' : ''}${group.key} — ${consequences(group)}`), ''];
}

// Offene Fragen: gebündelt wie gefragt, nur mit den noch offenen Stellen; Übrige einzeln.
function openLines(open, asked) {
  const openCanon = new Set(open.map((question) => question.canon));
  const covered = new Set();
  const lines = [];
  for (const question of asked) {
    const stillOpen = question.locations.filter((location) => openCanon.has(normalizeLocation(location)));
    if (stillOpen.length === 0) continue;
    stillOpen.forEach((location) => covered.add(normalizeLocation(location)));
    lines.push(`- ${question.number} · ${stillOpen.join(', ')} — ${question.question}`);
  }
  for (const question of open) if (!covered.has(question.canon)) lines.push(`- ${question.key} — ${question.question}`);
  return lines;
}

function report({ title, artifact, status, roundOne, verification, reworked, open, asked }) {
  const rounds = (roundOne ? 1 : 0) + (verification ? 1 : 0);
  const parts = [`## ${title}: ${artifact}`, '', `**Status:** ${status}`, `**Runden:** ${rounds} · **Nacharbeiten:** ${reworked ? 1 : 0}`, ''];
  if (roundOne) parts.push('### Runde 1', table(roundOne.groups), '');
  if (verification) {
    const red = verification.groups.filter((group) => group.color === 'red');
    parts.push('### Nachprüfung', verdictTable(verification.verdicts), '');
    parts.push(...listSection('Widersprüche', red.filter((group) => !hasScript(group))));
    parts.push(...listSection('Skript-Befunde', red.filter(hasScript)));
  }
  const lines = openLines(open, asked);
  if (lines.length > 0) parts.push('### Offene Fragen', ...lines, '');
  const green = [...(roundOne?.groups ?? []), ...(verification?.groups ?? [])].filter((group) => group.color === 'green');
  parts.push(...listSection('Anmerkungen (🟢)', green));
  return `${parts.join('\n').trimEnd()}\n`;
}

module.exports = { statusOf, report, verdictTable, openLines };
