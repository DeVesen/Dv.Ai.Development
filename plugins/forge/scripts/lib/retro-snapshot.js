'use strict';

// Angaben zur Session für den Snapshot (Spec-Pfade, angefasste Projekt-Dateien, Branch, Skills) und sein Zusammenbau.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SPEC_FILE = /(?:^|[\\/])spec[^\\/]*\.md$|[\\/]specs[\\/][^\\/]+\.md$/i;
const GENERIC_FILES = new Set(['CLAUDE.md', 'README.md', 'AGENTS.md', 'package.json', 'spec.md', 'plan.md']);
const PATH_INPUTS = ['file_path', 'notebook_path', 'path'];

function namedPaths(entries) {
  return entries.filter((entry) => entry.type === 'assistant' && Array.isArray(entry.message?.content))
    .flatMap((entry) => entry.message.content.filter((part) => part.type === 'tool_use')
      .flatMap((part) => PATH_INPUTS.map((key) => part.input?.[key]).filter(Boolean).map((value) => ({ entryNo: entry.entryNo, value: String(value) }))));
}

// Spec-Pfade der Session aus Tool-Aufrufen und Eingaben des Menschen, zuletzt genannte zuerst.
function specPaths(entries, humans) {
  const words = humans.flatMap((event) => event.text.split(/\s+/).map((value) => ({ entryNo: event.entryNo, value })));
  const named = [...namedPaths(entries), ...words].filter(({ value }) => SPEC_FILE.test(value)).sort((a, b) => b.entryNo - a.entryNo);
  return [...new Set(named.map(({ value }) => value))];
}

function comparable(file) {
  return process.platform === 'win32' ? file.toLowerCase() : file;
}

function insidePlugin(file, root) {
  for (let dir = path.dirname(file); comparable(dir).startsWith(comparable(root)) && dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.claude-plugin', 'plugin.json'))) return true;
  }
  return false;
}

function isProjectFile(file, root) {
  const inside = comparable(file).startsWith(comparable(`${root}${path.sep}`));
  return inside && !file.includes(`${path.sep}.claude${path.sep}`) && !insidePlugin(file, root);
}

// Dateinamen des Projekts, die die Session anfasste; Plugin-Dateien, `.claude` und allgemeine Namen zählen nicht.
function projectFiles(entries, cwd) {
  const root = path.resolve(cwd);
  const files = namedPaths(entries).map(({ value }) => path.resolve(root, value)).filter((file) => isProjectFile(file, root));
  return [...new Set(files.map((file) => path.basename(file)))].filter((name) => !GENERIC_FILES.has(name) && /\.\w+$/.test(name));
}

function branchOf(entries, cwd) {
  const named = entries.map((entry) => entry.gitBranch).filter(Boolean).pop();
  if (named) return named;
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function skillsOf(facts) {
  const commands = facts.humans.map((event) => event.text.match(/^\/(\S+)/)?.[1]).filter(Boolean);
  return [...new Set([...facts.skills.keys(), ...commands])];
}

const MCP_HEADING = /^## MCP-Nutzung \(gemessen\)\n/;

// Nur Zusammenbau: Zeilen und Zahlen kommen fertig aus session-facts.js, die Angaben zur Session aus den Funktionen oben.
function buildSnapshot({ id, transcript, ownTranscript, transcriptEntries, cwd, range, facts, headline, numbers, mcp, expect }) {
  return {
    session: id,
    transcript,
    ownTranscript,
    transcriptEntries,
    cwd,
    cut: range.cutTime,
    labels: range.labels,
    branch: branchOf(range.entries, cwd),
    specs: specPaths(range.entries, facts.humans),
    expected: expect,
    model: [...facts.models].join(', '),
    skills: skillsOf(facts),
    headline,
    numbers,
    mcp: mcp.replace(MCP_HEADING, '').trim(),
    projectFiles: projectFiles(range.entries, cwd),
  };
}

module.exports = { specPaths, projectFiles, branchOf, skillsOf, buildSnapshot };
