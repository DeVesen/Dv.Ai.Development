#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');
const { scanPlan, slugOf } = require('./plan-tasks');

const ROLES = ['spec-review', 'plan-review', 'review'];
const ART_OF_ROLE = { 'spec-review': 'spec-review', 'plan-review': 'plan-review', review: 'implementation-review' };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node followup.js save <spec-review|plan-review|review> <slug> <dir> | drop <spec-review|plan-review|review> <slug>\n';
const SCOUT_HEADING = /^## Scout-Vorschläge\s*$/;
const GROUP_HEADING = /^### (🔴|🟡|🟢) (.+?)\s*$/u;
const REWORK_HEADING = /^### (🔴|🟡|🟢) (.+) \(([^()]*)\)\s*$/u;
const PROPOSAL = /^\d+\.\s+(.*)$/;
const PREFERRED = /^\*\*Bevorzugt: (\d+)\*\*/;
const FENCE = /^\s*(```|~~~)/;
const REWORK_MARK = '=== REWORK ===';

class FollowupError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.status !== 0) throw new FollowupError(`Kein Git-Repo: ${toPosix(cwd)}`);
  return path.resolve(result.stdout.trim());
}

function followupDir(repo, role, slug) {
  return path.join(repo, '.forge', 'followup', role, slug);
}

function readLines(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
}

function scoutSection(lines) {
  const start = lines.findIndex((line) => SCOUT_HEADING.test(line));
  return start === -1 ? [] : lines.slice(start);
}

function numberedScout(lines) {
  let number = 0;
  return scoutSection(lines).map((line) => {
    const heading = GROUP_HEADING.exec(line);
    if (!heading) return line;
    number += 1;
    return `### ${number} · ${heading[1]} ${heading[2]}`;
  }).join('\n').trimEnd();
}

function save(role, slug, dir) {
  const target = followupDir(repoRoot(dir), role, slug);
  const scoutFile = path.join(dir, 'scout.md');
  const scout = fs.existsSync(scoutFile) ? readLines(scoutFile) : [];
  const aggregateFile = path.join(dir, 'aggregate.md');
  if (scoutSection(scout).length > 0 && !fs.existsSync(aggregateFile)) throw new FollowupError(`aggregate.md fehlt: ${toPosix(aggregateFile)}`);
  // Eine Scout-Gruppe ohne passende Aggregat-Gruppe macht die Sicherung unbrauchbar: wie kein Scout, der Loop startet ihn neu.
  if (scoutSection(scout).length === 0 || !matchesAggregate(readLines(aggregateFile), scout)) {
    fs.rmSync(target, { recursive: true, force: true });
    return 'KEIN SCOUT';
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(aggregateFile, path.join(target, 'aggregate.md'));
  fs.copyFileSync(scoutFile, path.join(target, 'scout.md'));
  fs.writeFileSync(path.join(target, 'meta.json'), `${JSON.stringify({ rolle: role, savedAt: new Date().toISOString() })}\n`);
  return numberedScout(scout);
}

function drop(role, slug, cwd = process.cwd()) {
  fs.rmSync(followupDir(repoRoot(cwd), role, slug), { recursive: true, force: true });
}

function latest(repo, slug, roles) {
  const found = roles
    .map((role) => ({ role, dir: followupDir(repo, role, slug) }))
    .filter(({ dir }) => fs.existsSync(path.join(dir, 'meta.json')))
    .map((entry) => ({ ...entry, savedAt: String(JSON.parse(fs.readFileSync(path.join(entry.dir, 'meta.json'), 'utf8')).savedAt ?? '') }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return found[0] ?? null;
}

function appendToProposal(group, line) {
  const last = group.proposals.length - 1;
  group.proposals[last] = `${group.proposals[last]}\n${line}`;
}

function parseScout(lines) {
  const groups = [];
  let current = null;
  let inFence = false;
  for (const line of scoutSection(lines)) {
    const heading = inFence ? null : GROUP_HEADING.exec(line);
    if (heading) {
      current = { severity: heading[1], location: heading[2], proposals: [], preferred: null };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    const opensOrClosesFence = FENCE.test(line);
    const proposal = inFence || opensOrClosesFence ? null : PROPOSAL.exec(line);
    const preferred = inFence ? null : PREFERRED.exec(line);
    if (proposal) current.proposals.push(proposal[1]);
    else if (preferred) current.preferred = Number(preferred[1]);
    else if (current.proposals.length > 0 && current.preferred === null) appendToProposal(current, line);
    if (opensOrClosesFence) inFence = !inFence;
  }
  for (const group of groups) group.proposals = group.proposals.map((text) => text.trimEnd());
  return groups;
}

function parseRework(lines) {
  const start = lines.indexOf(REWORK_MARK);
  const groups = [];
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const heading = REWORK_HEADING.exec(line);
    if (heading) {
      const reviewers = heading[3].replace(/\s*·\s*hochgestuft$/, '').split(',').map((name) => name.trim()).filter(Boolean);
      groups.push({ severity: heading[1], location: heading[2], reviewers, findings: [] });
    } else if (groups.length > 0 && line.startsWith('- [')) {
      groups[groups.length - 1].findings.push(line);
    }
  }
  return groups;
}

function groupsOf(aggregateLines, scoutLines) {
  const rework = parseRework(aggregateLines);
  return parseScout(scoutLines).map((group, index) => {
    const match = rework.find((item) => item.severity === group.severity && item.location === group.location);
    if (!match) throw new FollowupError(`Keine Aggregat-Gruppe zu ${group.severity} ${group.location}`);
    return { number: index + 1, ...group, reviewers: match.reviewers, findings: match.findings };
  });
}

function matchesAggregate(aggregateLines, scoutLines) {
  try {
    groupsOf(aggregateLines, scoutLines);
    return true;
  } catch (error) {
    if (error instanceof FollowupError) return false;
    throw error;
  }
}

function loadGroups(saveDir) {
  return groupsOf(readLines(path.join(saveDir, 'aggregate.md')), readLines(path.join(saveDir, 'scout.md')));
}

// Ein Plan hat Task-Überschriften, eine Spec nicht; Spec und Plan im selben Ordner teilen den Slug.
function rolesFor(artifactPath) {
  return scanPlan(readLines(artifactPath)).tasks.length > 0 ? ['plan-review', 'review'] : ['spec-review'];
}

function slugFor(artifactPath, roles) {
  if (roles[0] !== 'spec-review') return slugOf(artifactPath);
  const absolute = path.resolve(artifactPath);
  const name = path.basename(absolute);
  return name.toLowerCase() === 'spec.md' ? path.basename(path.dirname(absolute)) : path.basename(name, path.extname(name));
}

function resolveFollowup(artifactPath, repo) {
  const roles = rolesFor(artifactPath);
  return latest(repo, slugFor(artifactPath, roles), roles);
}

function isValidCall(action, args) {
  const [role, slug] = args;
  if (!ROLES.includes(role) || !SLUG.test(slug ?? '')) return false;
  return (action === 'save' && args.length === 3) || (action === 'drop' && args.length === 2);
}

function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!isValidCall(action, args)) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    if (action === 'save') process.stdout.write(`${save(...args)}\n`);
    else drop(...args);
  } catch (error) {
    if (!(error instanceof FollowupError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  FollowupError, ROLES, ART_OF_ROLE, followupDir, save, drop, latest, loadGroups, rolesFor, slugFor, resolveFollowup,
};

if (require.main === module) main();
