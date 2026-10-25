'use strict';

// Erkennt verbotene git-Aufrufe in einem Shell-Befehl (Bash/PowerShell), ohne die Shell auszuführen.
// Ein kleiner, Anführungszeichen-bewusster Zerleger: Text in Quotes oder Heredocs zählt nie als Befehl.

const WRAPPERS = new Set(['sudo', 'env', 'command', 'time', 'exec', 'nohup', 'nice']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'pwsh', 'powershell']);
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
const HEREDOC = /<<-?\s*(?:'([A-Za-z_]\w*)'|"([A-Za-z_]\w*)"|([A-Za-z_]\w*))/;
const VALUE_GLOBALS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const COMMIT_VALUE_FLAGS = new Set(['-m', '-F', '-C', '-c', '-t', '--message', '--file', '--author', '--date']);

// Zerlegt in Segmente (getrennt durch ; && || | & Zeilenumbruch $( ) und Backtick) aus Wörtern ohne Quotes.
function segmentsOf(command) {
  const text = String(command ?? '');
  const segments = [];
  let words = [];
  let word = null;
  let quote = null;
  let pendingHeredocs = [];
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) segments.push(words);
    words = [];
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      else if (char === '\\' && quote === '"' && index + 1 < text.length) { word += text[index + 1]; index += 1; }
      else word += char;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; word = word ?? ''; continue; }
    if (char === '\\' && index + 1 < text.length) { word = (word ?? '') + text[index + 1]; index += 1; continue; }
    if (char === '\n' || char === '\r') {
      const heredocs = pendingHeredocs;
      pendingHeredocs = [];
      endSegment();
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      for (const term of heredocs) index = skipHeredoc(text, index, term);
      continue;
    }
    if (char === '<' && text[index + 1] === '<' && text[index + 2] !== '<') {
      const found = HEREDOC.exec(text.slice(index));
      if (found && found.index === 0) {
        pendingHeredocs.push(found[1] ?? found[2] ?? found[3]);
        index += found[0].length - 1;
        continue;
      }
    }
    if (';&|`()'.includes(char)) { endSegment(); continue; }
    if (/\s/.test(char)) { endWord(); continue; }
    word = (word ?? '') + char;
  }
  endSegment();
  return segments;
}

// Springt hinter die Terminator-Zeile; Rückgabe: Index des letzten übersprungenen Zeichens.
function skipHeredoc(text, from, term) {
  let position = from;
  while (position + 1 < text.length) {
    const next = text.indexOf('\n', position + 1);
    const lineEnd = next === -1 ? text.length : next;
    const line = text.slice(position + 1, lineEnd).replace(/\r$/, '');
    position = lineEnd;
    if (line.trim() === term) return position;
    if (next === -1) break;
  }
  return text.length;
}

function isGit(token) {
  return /^(?:.*[\\/])?git(?:\.exe)?$/i.test(token);
}

// Wörter ab dem Programm: Zuweisungen und Wrapper (sudo, env, …) übersprungen.
function programWords(words) {
  let index = 0;
  while (index < words.length && (ASSIGNMENT.test(words[index]) || WRAPPERS.has(words[index]))) index += 1;
  return words.slice(index);
}

function gitCall(words) {
  const [program, ...rest] = programWords(words);
  if (!program || !isGit(program)) return null;
  let index = 0;
  while (index < rest.length && rest[index].startsWith('-')) {
    index += VALUE_GLOBALS.has(rest[index]) ? 2 : 1;
  }
  return { sub: rest[index], args: rest.slice(index + 1) };
}

function innerCommand(words) {
  const [program, ...rest] = programWords(words);
  if (!program || !SHELLS.has(program.replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase())) return null;
  const flag = rest.findIndex((token) => /^-(?:c|command)$/i.test(token));
  return flag === -1 ? null : rest[flag + 1] ?? null;
}

function commitUsesAll(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (COMMIT_VALUE_FLAGS.has(arg)) { index += 1; continue; }
    if (arg === '--all') return true;
    if (/^-[a-zA-Z]+$/.test(arg) && arg.slice(1).includes('a')) return true;
  }
  return false;
}

function addsEverything(args) {
  return args.some((arg) => arg === '-A' || arg === '--all' || arg === '.');
}

// Grund (kurzer Text) für einen verbotenen git-Aufruf oder `null`. `agent`: engere Liste für den Umsetzer-Agent
// (kein Push, Merge, Rebase, reset --hard, Sammel-Staging, --no-verify; Ortswechsel und Stash bleiben erlaubt).
function forbiddenGit(call, { noCommit, agent }) {
  const { sub, args } = call;
  if (args.includes('--no-verify')) return 'git … --no-verify';
  if (agent) return forbiddenForAgent(call);
  if (['push', 'checkout', 'switch', 'merge', 'rebase'].includes(sub)) return `git ${sub}`;
  if (sub === 'worktree' && args[0] !== 'list') return 'git worktree';
  if (sub === 'stash' && !['list', 'show'].includes(args[0])) return 'git stash';
  if (sub === 'reset' && args.includes('--hard')) return 'git reset --hard';
  if (sub === 'add' && addsEverything(args)) return 'git add -A / .';
  if (sub === 'commit' && commitUsesAll(args)) return 'git commit -a';
  if (sub === 'commit' && noCommit) return 'git commit';
  return null;
}

function forbiddenForAgent({ sub, args }) {
  if (['push', 'merge', 'rebase'].includes(sub)) return `git ${sub}`;
  if (sub === 'reset' && args.includes('--hard')) return 'git reset --hard';
  if (sub === 'add' && addsEverything(args)) return 'git add -A / .';
  return null;
}

function forbiddenIn(command, options = {}, depth = 0) {
  for (const words of segmentsOf(command)) {
    const call = gitCall(words);
    const reason = call ? forbiddenGit(call, options) : null;
    if (reason) return reason;
    const inner = depth < 3 ? innerCommand(words) : null;
    const innerReason = inner ? forbiddenIn(inner, options, depth + 1) : null;
    if (innerReason) return innerReason;
  }
  return null;
}

module.exports = { segmentsOf, forbiddenIn };
