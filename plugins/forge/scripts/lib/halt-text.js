'use strict';

// Text beim Anhalten eines Spec-Reviews: Ergebnis von Runde 1 und die gebündelten Fragen, in Klartext.

const { ICON } = require('./groups');
const { collapse, placeKey } = require('./places');
const { reviewerLabel } = require('./reviewer-names');
const { textsProblem } = require('./scout-check');

const FALLBACK_MAX = 400;
const FALLBACK_NOTE = ' (ohne Scout-Beschreibung)';
const OPEN_QUOTE = '\u201E';
const CLOSE_QUOTE = '\u201C';

function topicOf(specText) {
  const match = /^# (.+?)\s*$/m.exec(String(specText).replace(/\r\n/g, '\n'));
  return match ? match[1] : null;
}

function angles(reviewers) {
  return reviewers.map((name) => reviewerLabel('spec-review', name)).join(', ');
}

function shorten(text, max) {
  const flat = collapse(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

// Ohne gültigen Scout-Text (Scout ausgefallen oder Text unbrauchbar) zeigt der Text die Stelle und die gekürzte Konsequenz des ersten Findings.
function describe(group, scouted) {
  const texts = scouted.get(`${ICON[group.color]} ${collapse(group.label)}`);
  if (texts && textsProblem(texts) === null) return texts;
  return { title: group.label, description: `${shorten(group.items[0].finding.consequence, FALLBACK_MAX)}${FALLBACK_NOTE}` };
}

function entryLines(group, scouted, extra) {
  const { title, description } = describe(group, scouted);
  return [`- ${ICON[group.color]} **${title}** · Blickwinkel: ${angles(group.reviewers)}`, `  ${description}`, ...extra.map((line) => `  ${line}`)];
}

function correctedLines(groups, outcomes, scouted) {
  return groups.filter((group) => group.color === 'red' && outcomes.get(group.key)?.status === 'changed')
    .flatMap((group) => entryLines(group, scouted, [`Änderung: ${collapse(outcomes.get(group.key).change)}`]));
}

function noticeLines(groups, outcomes, scouted) {
  return groups.flatMap((group) => {
    if (group.color === 'yellow') return entryLines(group, scouted, []);
    const outcome = outcomes.get(group.key);
    return group.color === 'red' && outcome?.status === 'unchanged' ? entryLines(group, scouted, [`Grund: ${collapse(outcome.reason)}`]) : [];
  });
}

function optionLine(option) {
  return `- **${option.label})** ${collapse(option.text)} Folge: ${collapse(option.consequence)}`;
}

function questionLines(bundle, number, total) {
  return [
    `### Frage ${number} von ${total} · ${collapse(bundle.title)}  (betrifft: ${collapse(bundle.affects)})`,
    `**Warum gefragt**${bundle.reviewers.length > 0 ? ` (Blickwinkel: ${angles(bundle.reviewers)})` : ''}: ${collapse(bundle.why)}`,
    ...bundle.options.map(optionLine),
    `**Empfehlung: ${bundle.recommendation}**, ${collapse(bundle.reason)}`,
  ];
}

function resultLine(groups, questions) {
  const count = (color) => groups.filter((group) => group.color === color).length;
  const parts = [[count('red'), '🔴'], [count('yellow'), '🟡']].filter(([number]) => number > 0).map(([number, icon]) => `${number} × ${icon}`);
  if (questions > 0) parts.push(questions === 1 ? '1 Frage braucht dich' : `${questions} Fragen brauchen dich`);
  return `**Ergebnis:** ${parts.join(' · ')}`;
}

function renderHalt({ topic, groups, texts, results, bundles }) {
  const scouted = new Map(texts.map((entry) => [`${entry.severity} ${entry.location}`, entry]));
  const outcomes = new Map(results.map((entry) => [placeKey(entry.location), entry]));
  const corrected = correctedLines(groups, outcomes, scouted);
  const notice = noticeLines(groups, outcomes, scouted);
  const answer = bundles.map((bundle, index) => `${index + 1}${bundle.recommendation}`).join(', ');
  return [
    [`## Spec-Review · Runde 1${topic ? ` · ${topic}` : ''}`, resultLine(groups, bundles.length)],
    ...(corrected.length > 0 ? [['### Schon korrigiert (nichts zu tun)', ...corrected]] : []),
    ...(notice.length > 0 ? [['### Nur zur Kenntnis (nicht bearbeitet)', ...notice]] : []),
    ...bundles.map((bundle, index) => questionLines(bundle, index + 1, bundles.length)),
    [`**Antwort:** \`${answer}\` · ${OPEN_QUOTE}später${CLOSE_QUOTE} lässt eine Frage offen.`,
      '**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.'],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderHalt, topicOf };
