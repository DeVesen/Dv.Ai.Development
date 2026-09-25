#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node base-tag.js ensure|resolve <slug>\n';

class TagError extends Error {}

function git(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function tagName(slug) {
  return `forge-base/${slug}`;
}

function tagCommit(slug, cwd) {
  const result = git(cwd, ['rev-parse', '--verify', '--quiet', `refs/tags/${tagName(slug)}^{commit}`]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function ensureTag(slug, cwd = process.cwd()) {
  const existing = tagCommit(slug, cwd);
  if (existing === null) {
    const created = git(cwd, ['tag', tagName(slug), 'HEAD']);
    if (created.status !== 0) {
      throw new TagError(`Tag ${tagName(slug)} konnte nicht gesetzt werden: ${String(created.stderr).trim()}`);
    }
    return { action: 'created', commit: tagCommit(slug, cwd) };
  }
  if (git(cwd, ['merge-base', '--is-ancestor', existing, 'HEAD']).status !== 0) {
    throw new TagError(`Tag ${tagName(slug)} ist kein Vorfahre von HEAD — der Plan läuft auf einem anderen Branch.`);
  }
  return { action: 'kept', commit: existing };
}

function resolveTag(slug, cwd = process.cwd()) {
  if (tagCommit(slug, cwd) === null) throw new TagError(`Kein Basis-Tag ${tagName(slug)} — --base <ref> angeben.`);
  return tagName(slug);
}

const COMMANDS = {
  ensure: (slug) => {
    const { action, commit } = ensureTag(slug);
    return `${action} ${tagName(slug)} ${commit}`;
  },
  resolve: (slug) => resolveTag(slug),
};

function main() {
  const [command, slug] = process.argv.slice(2);
  if (!Object.hasOwn(COMMANDS, command) || !SLUG.test(slug ?? '')) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${COMMANDS[command](slug)}\n`);
  } catch (error) {
    if (!(error instanceof TagError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { TagError, tagName, ensureTag, resolveTag };
