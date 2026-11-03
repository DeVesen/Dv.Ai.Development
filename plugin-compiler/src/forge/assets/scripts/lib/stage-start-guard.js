'use strict';

// Hook auf das Start-Tool der Leit-Session (mcp__ccd_session__start_session): Der Start einer Etappe muss zum Brief passen,
// den `session-chain.js brief` im Zustand festgehalten hat (gestartet.briefHash, gestartet.modell), und die Leit-Session läuft auf Opus.
// Belegt per Experiment: PreToolUse feuert für MCP-Tools (tool_name `mcp__<server>__<tool>`), das Transkript trägt message.model.
// Nicht belegbar ist das Eingabe-Schema des Start-Tools (es gibt das Tool nur in der Desktop-App). Die Feldprüfungen laufen daher
// nur, wenn der Aufruf das dokumentierte Schema zeigt (Text-Felder `prompt` und `initiation`); sonst blockt nur die Opus-Prüfung.

const fs = require('node:fs');
const crypto = require('node:crypto');
const { readEntries } = require('./transcript');
const { readState } = require('./session-chain-store');

const SLUG_LINE = /^- Slug: (\S+)[ \t]*$/m;
const OPUS_REASON = 'Die Leit-Session muss auf Opus laufen.';

// sha256 des Brief-Texts (Text nach `=== BRIEF ===`), ohne Leerraum an den Rändern.
function briefHashOf(text) {
  return crypto.createHash('sha256').update(String(text).trim()).digest('hex');
}

// Modell der laufenden Session aus dem letzten Assistant-Eintrag; `null`, wenn nicht lesbar.
function sessionModel(transcriptPath) {
  try {
    const entries = readEntries(transcriptPath).filter((entry) => entry.type === 'assistant' && !entry.isSidechain);
    const models = entries.map((entry) => entry.message?.model).filter((model) => typeof model === 'string' && model !== '' && !model.startsWith('<'));
    return models.length > 0 ? models.at(-1) : null;
  } catch {
    return null;
  }
}

function startedState(input) {
  const slug = SLUG_LINE.exec(input.tool_input.prompt)?.[1];
  if (!slug) return null;
  try {
    return readState(input.cwd, slug);
  } catch {
    return null;
  }
}

function isModelMismatch(expected, model) {
  const given = typeof model === 'string' ? model.trim() : '';
  if (expected === 'opus') return given !== '';
  if (expected === 'sonnet') return !given.toLowerCase().includes('sonnet');
  return false;
}

function fieldProblem(toolInput, started) {
  if (started.briefHash && briefHashOf(toolInput.prompt) !== started.briefHash) {
    return 'Der prompt weicht vom Brief ab, den `session-chain.js brief` ausgegeben hat. Übergib den Text nach `=== BRIEF ===` unverändert.';
  }
  if (toolInput.use_worktree !== false) return 'Eine Etappe startet ohne Worktree: use_worktree muss false sein.';
  if (toolInput.context !== 'fresh') return 'Eine Etappe startet in einem frischen Kontext: context muss fresh sein.';
  if (started.modell && isModelMismatch(started.modell, toolInput.model)) {
    return started.modell === 'opus'
      ? 'Diese Etappe läuft auf Opus: Lass das Feld model weg.'
      : `Diese Etappe läuft auf ${started.modell}: model muss die ${started.modell}-Modell-ID enthalten.`;
  }
  return null;
}

// Verweigerungsgrund oder `null`.
function decideStart(input) {
  const model = sessionModel(input.transcript_path);
  if (model !== null && !model.toLowerCase().includes('opus')) return OPUS_REASON;
  const toolInput = input.tool_input ?? {};
  if (typeof toolInput.prompt !== 'string' || typeof toolInput.initiation !== 'string') return null;
  const started = startedState({ ...input, tool_input: toolInput })?.gestartet;
  const problem = started ? fieldProblem(toolInput, started) : null;
  return problem ? `dv-forge: Start der Etappe ${started.etappe} verweigert. ${problem}` : null;
}

module.exports = { briefHashOf, sessionModel, decideStart, OPUS_REASON };
