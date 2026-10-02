'use strict';

// Findet die Protokolldateien einer Session: als Datei, über die Session-Kennung, als neuestes im Projektordner
// und die Protokolle ihrer Subagents.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RetroError } = require('./transcript');

const RECENT_MS = 10 * 60 * 1000;

function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function findTranscript(sessionId, projectsDir = path.join(configDir(), 'projects')) {
  const dirs = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];
  const hit = dirs.map((dir) => path.join(projectsDir, dir, `${sessionId}.jsonl`)).find((file) => fs.existsSync(file));
  if (!hit) throw new RetroError(`Transkript zur Session ${sessionId} nicht gefunden unter ${projectsDir}`);
  return hit;
}

// Der Ordneraufbau `<protokoll>/subagents/*.jsonl` steht nur hier.
function subagentFiles(transcript) {
  const dir = path.join(transcript.replace(/\.jsonl$/, ''), 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).map((name) => path.join(dir, name));
}

function projectDir(cwd, home = os.homedir()) {
  return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^A-Za-z0-9]/g, '-'));
}

// Neueste Session im Projektordner. Wurden kurz davor weitere geschrieben, ist „neueste“ mehrdeutig: Warnung.
function newestSession(dir) {
  if (!fs.existsSync(dir)) throw new RetroError(`Kein Session-Ordner: ${dir}`);
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl'))
    .map((name) => ({ file: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length === 0) throw new RetroError(`Keine Session-Datei in ${dir}`);
  const [newest, ...others] = files;
  const rivals = others.filter(({ mtime }) => newest.mtime - mtime < RECENT_MS).map(({ file }) => path.basename(file, '.jsonl'));
  const warning = rivals.length === 0 ? null
    : `Warnung: ${rivals.length} weitere Session(s) in den letzten 10 min geschrieben (${rivals.join(', ')}); gelesen wird ${path.basename(newest.file, '.jsonl')}. Eigene Session mit --session <id> wählen.`;
  return { file: newest.file, warning };
}

function sessionById(dir, id) {
  const own = path.join(dir, `${id}.jsonl`);
  if (fs.existsSync(own)) return own;
  try {
    return findTranscript(id, path.dirname(dir));
  } catch {
    throw new RetroError(`Session ${id} nicht gefunden unter ${path.dirname(dir)}`);
  }
}

function resolveSession(options) {
  if (options.file) return { file: path.resolve(options.file), warning: null };
  const dir = projectDir(options.cwd ?? process.cwd());
  if (options.session) return { file: sessionById(dir, options.session), warning: null };
  return newestSession(dir);
}


// Protokoll der eigenen Session: bei `--file` plus `--session` gehört der Snapshot zur eigenen Session.
function ownTranscriptOf(options, file) {
  if (!options.session || !options.file) return file;
  try {
    return sessionById(projectDir(options.cwd ?? process.cwd()), options.session);
  } catch {
    // Ohne eigenes Protokoll lassen sich später nur die Kosten der Retrospektive nicht messen.
    return null;
  }
}

module.exports = { findTranscript, subagentFiles, projectDir, sessionById, resolveSession, ownTranscriptOf };
