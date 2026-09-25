#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const SEVERITY_RANK = { green: 1, yellow: 2, red: 3 };
const TEXT_FIELDS = ['location', 'quote', 'consequence', 'rationale'];
const JSON_BLOCK = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

const LOCATION_TYPES = [
  { name: 'ac', pattern: /^ac-0*(\d+)$/, normalize: (match) => `ac-${match[1]}` },
  { name: 'task', pattern: /^task 0*(\d+)$/, normalize: (match) => `task ${match[1]}` },
];

function collapseLocation(location) {
  return String(location).trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeLocation(location, types = LOCATION_TYPES) {
  const collapsed = collapseLocation(location);
  for (const type of types) {
    const match = type.pattern.exec(collapsed);
    if (match) return type.normalize(match);
  }
  return collapsed;
}

function isValidFinding(finding) {
  return finding !== null && typeof finding === 'object'
    && TEXT_FIELDS.every((field) => typeof finding[field] === 'string')
    && finding.location.trim() !== ''
    && Object.hasOwn(SEVERITY_RANK, finding.severity);
}

function isValidReview(review) {
  return review !== null && typeof review === 'object'
    && typeof review.reviewer === 'string' && review.reviewer !== ''
    && Array.isArray(review.findings)
    && review.findings.every(isValidFinding);
}

function parseReview(body, errors) {
  try {
    const review = JSON.parse(body);
    if (isValidReview(review)) return review;
    errors.push(`Block verletzt das Findings-Format: ${String(review?.reviewer ?? 'unbekannt')}`);
  } catch (error) {
    errors.push(`Ungültiges JSON: ${error.message}`);
  }
  return null;
}

function extractReviews(text) {
  const reviews = new Map();
  const errors = [];
  for (const [, body] of String(text).matchAll(JSON_BLOCK)) {
    const review = parseReview(body, errors);
    if (review) reviews.set(review.reviewer, review);
  }
  return { reviews: [...reviews.values()], errors };
}

const SEVERITY_ICON = { red: '🔴', yellow: '🟡', green: '🟢' };
const CLOSING_QUOTE = String.fromCharCode(0x201c);

function groupFindings(reviews) {
  const groups = new Map();
  for (const review of reviews) {
    for (const finding of review.findings) {
      const key = normalizeLocation(finding.location);
      if (!groups.has(key)) groups.set(key, { key, location: finding.location.trim(), items: [] });
      groups.get(key).items.push({ reviewer: review.reviewer, ...finding });
    }
  }
  return [...groups.values()];
}

function byRankDescending(a, b) {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
}

function rateGroup(group) {
  const highest = [...group.items].sort(byRankDescending)[0].severity;
  const reviewers = [...new Set(group.items.map((item) => item.reviewer))];
  const escalated = highest === 'yellow' && reviewers.length >= 2;
  return { ...group, reviewers, escalated, severity: escalated ? 'red' : highest };
}

function bySeverityThenKey(a, b) {
  return byRankDescending(a, b) || a.key.localeCompare(b.key);
}

function aggregate(reviews) {
  return groupFindings(reviews).map(rateGroup).sort(bySeverityThenKey);
}

function summarize(groups, reviews, expected) {
  const delivered = new Set(reviews.map((review) => review.reviewer));
  const failed = expected.filter((name) => !delivered.has(name));
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.severity] += 1;
  return { clean: counts.red === 0 && failed.length === 0, counts, failed };
}

function cell(text) {
  return String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function leadItem(group) {
  return [...group.items].sort(byRankDescending)[0];
}

function formatStatus(status) {
  const failed = status.failed.length > 0 ? status.failed.join(',') : '-';
  const { red, yellow, green } = status.counts;
  return `STATUS clean=${status.clean} red=${red} yellow=${yellow} green=${green} failed=${failed}`;
}

function formatReport(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) =>
    `| ${SEVERITY_ICON[group.severity]} | ${cell(group.location)} | ${group.reviewers.join(', ')} | ${cell(leadItem(group).consequence)} |`);
  return ['| Stufe | Stelle | Reviewer | Konsequenz |', '|---|---|---|---|', ...rows].join('\n');
}

function formatReworkGroup(group) {
  const escalation = group.escalated ? ' · hochgestuft' : '';
  const header = `### ${SEVERITY_ICON[group.severity]} ${group.location} (${group.reviewers.join(', ')}${escalation})`;
  const lines = group.items.map((item) =>
    `- [${item.reviewer} · ${item.severity}] Zitat: „${cell(item.quote)}${CLOSING_QUOTE} · Konsequenz: ${cell(item.consequence)} · Begründung: ${cell(item.rationale)}`);
  return [header, ...lines].join('\n');
}

function formatRework(groups) {
  return groups.length === 0 ? 'Keine Findings.' : groups.map(formatReworkGroup).join('\n\n');
}

function dropUnexpected(reviews, expected, errors) {
  if (expected.length === 0) return reviews;
  return reviews.filter((review) => {
    if (expected.includes(review.reviewer)) return true;
    errors.push(`Unerwarteter Reviewer verworfen: ${review.reviewer}`);
    return false;
  });
}

function run(text, expected) {
  const { reviews, errors } = extractReviews(text);
  const kept = dropUnexpected(reviews, expected, errors);
  const groups = aggregate(kept);
  return { groups, errors, status: summarize(groups, kept, expected) };
}

function render(result) {
  return [
    formatStatus(result.status),
    ...result.errors.map((error) => `ERROR ${error}`),
    '=== REPORT ===',
    formatReport(result.groups),
    '=== REWORK ===',
    formatRework(result.groups),
  ].join('\n');
}

function parseExpected(args) {
  const index = args.indexOf('--expect');
  return index === -1 ? [] : String(args[index + 1] ?? '').split(',').filter(Boolean);
}

function main() {
  const expected = parseExpected(process.argv.slice(2));
  process.stdout.write(`${render(run(fs.readFileSync(0, 'utf8'), expected))}\n`);
}

if (require.main === module) main();

module.exports = { SEVERITY_RANK, LOCATION_TYPES, normalizeLocation, extractReviews, aggregate, summarize, run, render };
