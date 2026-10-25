'use strict';

// Prüfungen am Ende eines Sub-Agents der Umsetzung (SubagentStop), jede fail-open:
// - implementation-implementer: Rückgabe mit Statuszeile, Berichtsdatei, nichts Offenes im Checkout, kein Commit in .forge/
// - implementation-task-reviewer, -re-reviewer, -final-reviewer: Urteilszeile; ein positives Urteil neben einem 🔴 ist keines.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verdictOf } = require('./implementation-verdict');
const { firstPrompt } = require('../result-check');

const IMPLEMENTER = 'dv-forge:implementation-implementer';
const REVIEWERS = ['dv-forge:implementation-task-reviewer', 'dv-forge:implementation-re-reviewer', 'dv-forge:implementation-final-reviewer'];
const STATUS_LINE = /^\s*[-*]?\s*`?Status:`?\s*(done-with-concerns|done|blocked|needs-context)\b/m;
const WORKSPACE_SLUG = /\.forge\/implementation\/([A-Za-z0-9][A-Za-z0-9._-]*)\//;
const FINISHED = ['done', 'done-with-concerns'];

function promptValue(prompt, key) {
  const match = new RegExp(`^\\s*[-*]?\\s*\`?${key}:\`?\\s*(.+?)\\s*$`, 'm').exec(prompt);
  return match ? match[1].replace(/^[`"']+|[`"']+$/g, '').trim() : null;
}

function git(repo, args) {
  return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

// Dateien, die noch offen sind, ohne Vorbestand; leer, wenn nichts prüfbar ist.
function openFilesOf(repo) {
  try {
    return require('../work').openFiles(repo).open.filter((name) => !name.startsWith('.forge/'));
  } catch {
    return [];
  }
}

// Commits seit dem Basis-Tag der Umsetzung, die `.forge/` berühren; ohne lesbares Tag keine Aussage.
function forgeCommitsSince(repo, prompt) {
  const slug = WORKSPACE_SLUG.exec((promptValue(prompt, 'Brief') ?? '').replace(/\\/g, '/'))?.[1];
  if (!slug || git(repo, ['rev-parse', '--verify', '--quiet', `refs/tags/forge-base/${slug}^{commit}`]).status !== 0) return [];
  const log = git(repo, ['log', '--name-only', '--pretty=format:', `forge-base/${slug}..HEAD`]);
  if (log.status !== 0) return [];
  return [...new Set(String(log.stdout).split('\n').filter((name) => name.startsWith('.forge/')))];
}

function reportProblem(prompt, repo) {
  const target = promptValue(prompt, 'Bericht');
  if (!target) return null;
  const file = path.resolve(repo, target);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) return `Die Berichtsdatei ${target} fehlt oder ist leer. Schreib deinen Bericht dorthin.`;
  return null;
}

function implementerProblem(input) {
  const status = STATUS_LINE.exec(String(input.last_assistant_message ?? ''))?.[1];
  if (!status) return 'Deine Rückgabe hat keine Zeile `Status: done | done-with-concerns | blocked | needs-context`. Antworte im Format aus „Rückgabe“.';
  if (!FINISHED.includes(status)) return null;
  const prompt = firstPrompt(input.agent_transcript_path);
  const repo = path.resolve(input.cwd ?? '.', promptValue(prompt, 'Repo') ?? '.');
  const open = openFilesOf(repo);
  if (open.length > 0) return `Im Checkout ist noch offen: ${open.slice(0, 8).join(', ')}. Committe genau deine Dateien oder melde done-with-concerns bzw. blocked mit Grund.`;
  const forge = forgeCommitsSince(repo, prompt);
  if (forge.length > 0) return `Ein Commit berührt .forge/: ${forge.slice(0, 5).join(', ')}. Der Ordner .forge/ wird nie committet; nimm die Dateien aus dem Verlauf.`;
  return reportProblem(prompt, repo);
}

function reviewerProblem(input) {
  const result = verdictOf(input.last_assistant_message);
  if (result.problem) return `Deine Antwort hat keine gültige Urteilszeile: ${result.problem}. Antworte im Format aus „Ausgabe“.`;
  if (result.note && result.red > 0) return 'Mit 🔴 ist das Urteil nachbessern. Korrigiere die Urteilszeile oder stuf das Finding herab, falls es kein 🔴 ist.';
  return null;
}

// Grund zum Blocken oder `null`.
function agentProblem(input) {
  if (typeof input.last_assistant_message !== 'string') return null;
  if (input.agent_type === IMPLEMENTER) return implementerProblem(input);
  if (REVIEWERS.includes(input.agent_type)) return reviewerProblem(input);
  return null;
}

module.exports = { agentProblem, implementerProblem, reviewerProblem, IMPLEMENTER, REVIEWERS, promptValue };
