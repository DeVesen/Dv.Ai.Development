'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseRework, parseScout, scoutBlocks, SCOUT_HEADING, GROUP_HEADING, PROPOSAL } = require('../followup');
const { readLines } = require('./flow-files');
const { plainProblem } = require('./plain-text');

const TITLE_LINE = /^Titel: (.*)$/;
const DESCRIPTION_LINE = /^Beschreibung: (.*)$/;
const RECOMMENDATION_LINE = /^Empfehlung: (.*)$/;
const TITLE_WORDS = { min: 2, max: 6 };
const TEXT_REVIEWS = ['spec-review', 'plan-review', 'implementation-review'];

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

// Titel, Beschreibung und Empfehlung stehen direkt unter der Gruppen-Überschrift, vor dem ersten Vorschlag.
function scoutTexts(lines) {
  const start = lines.findIndex((line) => SCOUT_HEADING.test(line));
  const groups = [];
  let current = null;
  let proposalSeen = false;
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const heading = GROUP_HEADING.exec(line);
    if (heading) {
      current = { severity: heading[1], location: heading[2], title: null, description: null, recommendation: null };
      groups.push(current);
      proposalSeen = false;
    } else if (current) {
      proposalSeen = proposalSeen || PROPOSAL.test(line);
      const title = proposalSeen ? null : TITLE_LINE.exec(line);
      const description = proposalSeen ? null : DESCRIPTION_LINE.exec(line);
      if (title && current.title === null) current.title = title[1].trim();
      if (description && current.description === null) current.description = description[1].trim();
      const recommendation = proposalSeen ? null : RECOMMENDATION_LINE.exec(line);
      if (recommendation && current.recommendation === null) current.recommendation = recommendation[1].trim();
    }
  }
  return groups;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function textsProblem(texts) {
  if (!texts?.title) return 'Titel fehlt';
  if (!texts.description) return 'Beschreibung fehlt';
  const words = wordCount(texts.title);
  if (words < TITLE_WORDS.min || words > TITLE_WORDS.max) return `Titel hat ${words} Wörter statt ${TITLE_WORDS.min} bis ${TITLE_WORDS.max}`;
  const title = plainProblem(texts.title);
  if (title) return `Titel: ${title}`;
  const description = plainProblem(texts.description);
  if (description) return `Beschreibung: ${description}`;
  if (!texts.recommendation) return 'Empfehlung fehlt';
  const recommendation = plainProblem(texts.recommendation);
  return recommendation ? `Empfehlung: ${recommendation}` : null;
}

// Spec und Plan: die Gruppen der Scout-Eingabe. Implementierung: keine Eingabe-Datei, erwartet sind die 🔴/🟡-Gruppen des Aggregats.
function expectedIds(dir, review) {
  const input = path.join(dir, 'scout-eingabe.md');
  if (review === 'implementation-review' && !fs.existsSync(input)) {
    return parseRework(readLines(path.join(dir, 'aggregate.md'))).filter((group) => group.severity !== '🟢').map(groupId);
  }
  return parseRework(readLines(input)).map(groupId);
}

// Jede Gruppe der Scout-Eingabe hat ein bis drei Vorschläge, genau einer bevorzugt; andere Gruppen gibt es nicht.
// Beim Spec-, Plan- und Implementierungs-Review tragen sie zusätzlich Titel, Beschreibung und Empfehlung in Klartext.
function checkScout(dir, review) {
  const expected = expectedIds(dir, review);
  const file = path.join(dir, 'scout.md');
  if (!fs.existsSync(file)) return 'SCOUT ungültig: Ergebnisdatei fehlt';
  const lines = readLines(file);
  const groups = new Map(parseScout(lines).map((group) => [groupId(group), group]));
  const texts = TEXT_REVIEWS.includes(review) ? new Map(scoutTexts(lines).map((group) => [groupId(group), group])) : null;
  const problemOf = (id) => groupProblem(groups.get(id)) ?? (texts ? textsProblem(texts.get(id)) : null);
  const wrong = expected.map((id) => [id, problemOf(id)]).find(([, problem]) => problem);
  if (wrong) return `SCOUT ungültig: ${wrong[0]}: ${wrong[1]}`;
  const extra = [...groups.keys()].filter((id) => !expected.includes(id));
  return extra.length > 0 ? `SCOUT ungültig: Gruppe nicht in der Eingabe: ${extra.join(', ')}` : 'SCOUT ok';
}

module.exports = { checkScout, preferredProblem, scoutTexts, scoutBlocks, textsProblem };
