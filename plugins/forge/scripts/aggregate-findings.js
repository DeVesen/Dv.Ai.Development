#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

function fileLocationType(repoRoot) {
  const prefix = repoRoot ? `${collapseLocation(repoRoot).replace(/\\/g, '/').replace(/\/+$/, '')}/` : null;
  return {
    name: 'file',
    pattern: /^\S*\.[a-z0-9]+(?::\d+(?:-\d+)?)?$/,
    normalize: (match) => {
      const value = match[0].replace(/\\/g, '/').replace(/:\d+(?:-\d+)?$/, '');
      const relative = prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value;
      return relative.replace(/^(?:\.\/)+/, '');
    },
  };
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
    && (review.summary === undefined || typeof review.summary === 'string')
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

const RESERVED_FILES = new Set(['rework.json']);

function readReviewFile(file, errors, reasons) {
  const name = path.basename(file, '.json');
  const review = parseReview(fs.readFileSync(file, 'utf8'), errors);
  if (!review) {
    reasons.set(name, 'Ergebnis ungültig');
    return null;
  }
  if (review.reviewer !== name) {
    errors.push(`Dateiname ${name}.json passt nicht zu reviewer ${review.reviewer}`);
    reasons.set(name, 'Ergebnis ungültig');
    return null;
  }
  return review;
}

function readReviewDir(dir) {
  const errors = [];
  const reasons = new Map();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith('.json') && !RESERVED_FILES.has(name)) : [];
  const reviews = files.map((name) => readReviewFile(path.join(dir, name), errors, reasons)).filter(Boolean);
  return { reviews, errors, reasons };
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

function groupFindings(reviews, types = LOCATION_TYPES) {
  const groups = new Map();
  for (const review of reviews) {
    for (const finding of review.findings) {
      const key = normalizeLocation(finding.location, types);
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
  return { ...group, reviewers, severity: highest };
}

function bySeverityThenKey(a, b) {
  return byRankDescending(a, b) || a.key.localeCompare(b.key);
}

function aggregate(reviews, types = LOCATION_TYPES) {
  return groupFindings(reviews, types).map(rateGroup).sort(bySeverityThenKey);
}

function summarize(groups, reviews, expected) {
  const delivered = new Set(reviews.map((review) => review.reviewer));
  const failed = expected.filter((name) => !delivered.has(name));
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.severity] += 1;
  return { clean: counts.red === 0 && failed.length === 0, counts, failed };
}

function formatScope(reviews, status, options = {}) {
  const round = options.round ? ` in Review ${options.round}` : '';
  const reasons = options.reasons ?? new Map();
  const delivered = reviews.map((review) => `- ${review.reviewer}: ${cell(review.summary ?? 'keine Zusammenfassung')}`);
  const failed = status.failed.map((name) => `- ${name}: ausgefallen${round} — ${reasons.get(name) ?? 'Ergebnisdatei fehlt'}`);
  const lines = [...delivered, ...failed];
  return lines.length === 0 ? [] : ['### Prüfumfang', ...lines, ''];
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

// Was jeder Reviewer geliefert hat (rot/gelb/grün), bevor Findings je Stelle zusammengelegt werden.
function formatRead(reviews, groups) {
  const perReviewer = reviews.map((review) => {
    const count = (severity) => review.findings.filter((finding) => finding.severity === severity).length;
    return `${review.reviewer}=${count('red')}/${count('yellow')}/${count('green')}`;
  });
  const total = reviews.reduce((sum, review) => sum + review.findings.length, 0);
  return `EINGELESEN ${perReviewer.join(' ') || '-'} · ${total} Findings an ${groups.length} Stellen`;
}

function consequences(group) {
  return [...group.items].sort(byRankDescending)
    .map((item) => `${SEVERITY_ICON[item.severity]} ${cell(item.consequence)}`)
    .join('<br>');
}

function formatTable(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) =>
    `| ${SEVERITY_ICON[group.severity]} | ${cell(group.location)} | ${group.items.length} | ${group.reviewers.join(', ')} | ${consequences(group)} |`);
  return ['| Stufe | Stelle | Anzahl | Reviewer | Konsequenzen |', '|---|---|---|---|---|', ...rows].join('\n');
}

function formatReport(groups, reviews = [], status = { failed: [] }, options = {}) {
  return [...formatScope(reviews, status, options), formatTable(groups)].join('\n');
}

function formatReworkGroup(group) {
  const header = `### ${SEVERITY_ICON[group.severity]} ${group.location} (${group.reviewers.join(', ')})`;
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

function evaluate({ reviews, errors, reasons }, expected, types = LOCATION_TYPES, round = null) {
  const kept = dropUnexpected(reviews, expected, errors);
  const groups = aggregate(kept, types);
  return { groups, errors, reviews: kept, reasons, round, status: summarize(groups, kept, expected) };
}

function run(text, expected, types = LOCATION_TYPES) {
  return evaluate(extractReviews(text), expected, types);
}

function runDir(dir, expected, types = LOCATION_TYPES, round = null) {
  return evaluate(readReviewDir(dir), expected, types, round);
}

function render(result) {
  return [
    formatStatus(result.status),
    formatRead(result.reviews, result.groups),
    ...result.errors.map((error) => `ERROR ${error}`),
    '=== REPORT ===',
    formatReport(result.groups, result.reviews, result.status, { round: result.round, reasons: result.reasons }),
    '=== REWORK ===',
    formatRework(result.groups),
  ].join('\n');
}

function parseExpected(args) {
  const index = args.indexOf('--expect');
  return index === -1 ? [] : String(args[index + 1] ?? '').split(',').filter(Boolean);
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function parseRepo(args) {
  return optionValue(args, '--repo');
}

function locationTypesFor(repoRoot) {
  return repoRoot ? [...LOCATION_TYPES, fileLocationType(repoRoot)] : LOCATION_TYPES;
}

function main() {
  const args = process.argv.slice(2);
  const types = locationTypesFor(parseRepo(args));
  const dir = optionValue(args, '--dir');
  if (!dir) {
    process.stdout.write(`${render(run(fs.readFileSync(0, 'utf8'), parseExpected(args), types))}\n`);
    return;
  }
  const output = `${render(runDir(dir, parseExpected(args), types, optionValue(args, '--round')))}\n`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'aggregate.md'), output);
  process.stdout.write(output);
}

if (require.main === module) main();

module.exports = {
  SEVERITY_RANK, LOCATION_TYPES, fileLocationType, normalizeLocation, extractReviews, readReviewDir, aggregate, summarize, run, runDir, render,
};
