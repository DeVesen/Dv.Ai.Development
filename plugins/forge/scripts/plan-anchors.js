#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./lib/posix');
const { PlanError, checkedPlan, markFences, parseFileLine, taskTitle } = require('./plan-tasks');

const MAX_HITS = 5;
const MEMBER_SEPARATOR = /\.|::|#/;

function isInside(root, relative) {
  if (path.isAbsolute(relative)) return false;
  const rel = path.relative(root, path.resolve(root, relative));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function readRepoLines(root, relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lastMember(anchor) {
  if (!MEMBER_SEPARATOR.test(anchor)) return null;
  const member = anchor.split(MEMBER_SEPARATOR).filter(Boolean).pop()?.replace(/\(\)$/, '');
  return member && member !== anchor ? member : null;
}

function hitLines(lines, matches) {
  return lines.flatMap((line, index) => (matches(line) ? [index + 1] : []));
}

function findAnchor(lines, anchor) {
  const literal = hitLines(lines, (line) => line.includes(anchor));
  if (literal.length > 0) return { hits: literal, member: null };
  const member = lastMember(anchor);
  if (!member) return { hits: [], member: null };
  const word = new RegExp(`(?<![\\w$])${escapeRegExp(member)}(?![\\w$])`);
  return { hits: hitLines(lines, (line) => word.test(line)), member };
}

function formatHits(hits) {
  const shown = hits.slice(0, MAX_HITS).join(', ');
  const more = hits.length > MAX_HITS ? ` (+${hits.length - MAX_HITS})` : '';
  return `${hits.length === 1 ? 'Zeile' : 'Zeilen'} ${shown}${more}`;
}

function checkUnanchored(entry, lines) {
  if (entry.kind === 'Create') return lines ? { mark: '❌', text: 'existiert schon' } : { mark: '✅', text: 'existiert noch nicht' };
  if (entry.kind === 'Test') {
    return lines ? { mark: '❌', text: 'bestehende Testdatei ohne Anker' } : { mark: '✅', text: 'existiert noch nicht' };
  }
  return { mark: '❌', text: 'Anker fehlt' };
}

function checkLine(root, entry, earlier) {
  if (!isInside(root, entry.path)) return { mark: '❌', text: 'außerhalb des Repos (nicht gelesen)' };
  const lines = readRepoLines(root, entry.path);
  if (entry.kind === 'Create' || !entry.anchor) return checkUnanchored(entry, lines);
  if (!lines) {
    if (earlier?.created) return { mark: '✅', text: `angelegt in Task ${earlier.created} (Anker nicht geprüft)` };
    return { mark: '❌', text: 'Datei fehlt' };
  }
  const found = findAnchor(lines, entry.anchor);
  if (found.hits.length > 0) return { mark: '✅', text: `${formatHits(found.hits)}${found.member ? ` (Glied ${found.member})` : ''}` };
  if (earlier) return { mark: '⚠', text: `Anker nicht im Bestand, Datei aus Task ${earlier.last}` };
  return { mark: '❌', text: 'Anker nicht gefunden' };
}

function formatCheck(entry, result) {
  const anchor = entry.anchor ? ` · \`${entry.anchor}\`` : '';
  return `- ${result.mark} ${entry.kind} \`${entry.path}\`${anchor} — ${result.text}`;
}

function excerpt(root, entry, number) {
  const lines = isInside(root, entry.path) ? readRepoLines(root, entry.path) : null;
  if (!lines) return null;
  const heading = `### \`${entry.path}:${entry.range.from}-${entry.range.to}\` (Task ${number})`;
  const from = Math.max(1, entry.range.from);
  if (from > lines.length) {
    return [heading, `Bereich ${entry.range.from}-${entry.range.to} außerhalb der Datei (${lines.length} Zeilen)`].join('\n');
  }
  const to = Math.min(entry.range.to, lines.length);
  const width = String(to).length;
  const body = lines.slice(from - 1, to).map((line, index) => `${String(from + index).padStart(width)} | ${line}`);
  return [heading, ...body].join('\n');
}

function remember(seen, entry, number) {
  const state = seen.get(entry.path) ?? { created: null, last: null };
  if (entry.kind === 'Create' && state.created === null) state.created = number;
  state.last = number;
  seen.set(entry.path, state);
}

function taskEntries(lines, fenced, task) {
  const entries = [];
  for (let index = task.start; index < task.end; index += 1) {
    if (fenced[index]) continue;
    const entry = parseFileLine(lines[index]);
    if (entry) entries.push(entry);
  }
  return entries;
}

function repoRoot(repo) {
  if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) throw new PlanError(`Repo nicht gefunden: ${toPosix(repo)}`);
  return fs.realpathSync.native(path.resolve(repo));
}

function buildAnchors(planPath, repo) {
  const root = repoRoot(repo);
  const { lines, tasks } = checkedPlan(planPath);
  const fenced = markFences(lines);
  const seen = new Map();
  const overview = [];
  const checks = [];
  const excerpts = [];
  for (const task of tasks) {
    overview.push(`- Task ${task.number}: ${taskTitle(lines, task)} — Zeilen ${task.start + 1}-${task.end}`);
    const entries = taskEntries(lines, fenced, task);
    const rows = entries.map((entry) => formatCheck(entry, checkLine(root, entry, seen.get(entry.path))));
    checks.push(`### Task ${task.number}`, ...(rows.length > 0 ? rows : ['Keine Dateizeilen.']), '');
    for (const entry of entries.filter((item) => item.range)) {
      const block = excerpt(root, entry, task.number);
      if (block) excerpts.push(block, '');
    }
    for (const entry of entries) remember(seen, entry, task.number);
  }
  const planName = toPosix(path.relative(root, fs.realpathSync.native(path.resolve(planPath))));
  const count = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  return [
    `# Anker-Prüfung: ${planName}`,
    `Repo: ${toPosix(root)} · Plan-Zeilen: ${count}`,
    '',
    '## Tasks',
    ...overview,
    '',
    '## Dateien',
    ...checks,
    '## Ausschnitte',
    ...(excerpts.length > 0 ? excerpts : ['Keine.', '']),
  ].join('\n');
}

function writeAnchors(planPath, repo, dir) {
  const content = buildAnchors(planPath, repo);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'anchors.md');
  fs.writeFileSync(file, content);
  return toPosix(file);
}

module.exports = { buildAnchors, writeAnchors };
