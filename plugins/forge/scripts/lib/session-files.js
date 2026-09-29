'use strict';

// Findet die Protokolldateien einer Session: das Protokoll über die Session-Kennung und die Protokolle ihrer Subagents.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RetroError } = require('./transcript');

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

module.exports = { findTranscript, subagentFiles };
