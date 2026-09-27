#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const RESULT_LINE = /^\s*-?\s*`?Ergebnis:`?\s*(.+?)\s*$/m;

function messageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n');
}

function firstPrompt(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';
  for (const line of fs.readFileSync(transcriptPath, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.type === 'user' || entry?.message?.role === 'user') return messageText(entry.message?.content);
  }
  return '';
}

function expectedResult(transcriptPath) {
  const match = RESULT_LINE.exec(firstPrompt(transcriptPath));
  return match ? match[1].replace(/^[`"']+|[`"']+$/g, '') : null;
}

function problemWith(file) {
  if (!fs.existsSync(file)) return 'fehlt';
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return 'ist kein gültiges JSON';
  }
  if (value === null || typeof value !== 'object') return 'ist kein JSON-Objekt';
  if (!Array.isArray(value.findings) && !Array.isArray(value.results)) return 'hat weder "findings" noch "results"';
  return null;
}

function decide(input) {
  if (input.stop_hook_active) return null;
  const file = expectedResult(input.agent_transcript_path);
  if (!file) return null;
  const problem = problemWith(file);
  if (!problem) return null;
  return {
    decision: 'block',
    reason: `Deine Ergebnisdatei ${file} ${problem}. Schreib sie jetzt mit Write im vereinbarten Format, `
      + 'auch bei null Findings, und antworte danach nur mit "Ergebnis geschrieben: <pfad>".',
  };
}

function main() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    const decision = decide(raw.trim() === '' ? {} : JSON.parse(raw));
    if (decision) process.stdout.write(JSON.stringify(decision));
  } catch (error) {
    process.stderr.write(`dv-forge result-check: ${error.message}\n`);
  }
}

if (require.main === module) main();

module.exports = { expectedResult, problemWith, decide };
