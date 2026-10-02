'use strict';

// Kurzfassung nach dem Bericht: Befunde, Kosten der Retrospektive, Workitem-Kandidat und Befehl zum Vormerken.

const fs = require('node:fs');
const path = require('node:path');
const { readEntries, tokensOf } = require('./transcript');
const { requestsOf } = require('./retro-requests');
const { thousands } = require('./retro-format');
const { parseDraft, findingsOf } = require('./retro-draft');
const { readConfig, workitemOf, branchWorkitem } = require('../forge-config');

const FINDING_SECTIONS = ['Positiv', 'Reibung', 'Sparpotenzial'];
const SHOWN_FINDINGS = 3;

function findingSummary(text) {
  const draft = parseDraft(text);
  const bySection = FINDING_SECTIONS.map((section) => [section, findingsOf(draft.sections.get(section)).map((finding) => finding.title)]);
  const total = bySection.reduce((sum, [, titles]) => sum + titles.length, 0);
  return [
    `Befunde: ${total} (${bySection.map(([section, titles]) => `${section} ${titles.length}`).join(', ')})`,
    ...bySection.map(([section, titles]) => `${section}: ${titles.slice(0, SHOWN_FINDINGS).join(' · ') || 'keine'}`),
  ];
}

function sumTokens(requests) {
  return requests.map((request) => tokensOf(request.usage)).reduce((total, tokens) => ({
    input: total.input + tokens.input, cached: total.cached + tokens.cached, output: total.output + tokens.output,
  }), { input: 0, cached: 0, output: 0 });
}

// Kosten der Retrospektive: alle Anfragen nach dem Stand des Snapshots (`fromEntryNo`), gemessen vor der ersten
// Modell-Anfrage der Retrospektive; der Slash-Befehl selbst löst keine Anfrage aus. Gezählt nur im Protokoll der
// eigenen Session; `null` heißt, das eigene Protokoll wurde nicht gefunden, ein fremdes Protokoll ersetzt es nie.
function retroCost(transcript, fromEntryNo) {
  if (transcript === null) return 'Kosten der Retrospektive: nicht messbar (eigenes Protokoll nicht gefunden)';
  if (!transcript || !fs.existsSync(transcript)) return 'Kosten der Retrospektive: nicht messbar (Protokoll fehlt)';
  const requests = requestsOf(readEntries(transcript).filter((entry) => entry.entryNo > fromEntryNo));
  const sum = sumTokens(requests);
  return `Kosten der Retrospektive: ${requests.length} Anfragen · Tokens ${thousands(sum.input)} neu verarbeitet, ${thousands(sum.cached)} aus dem Cache, ${thousands(sum.output)} Ausgabe`;
}

function configOf(cwd) {
  try {
    return readConfig(cwd).config;
  } catch {
    // Ohne Projekt-Einstellungen (kein Git-Repo) gibt es keinen Kandidaten aus dem Branch.
    return {};
  }
}

// Zuerst die Workitem-Zeile einer Spec der Session, dann das Workitem-Muster im Branch, sonst „keiner“.
function workitemCandidate(snapshot, cwd) {
  const fromSpec = (snapshot.specs ?? []).map((spec) => [spec, workitemOf(path.resolve(cwd, spec))]).find(([, workitem]) => workitem);
  if (fromSpec) return `${fromSpec[1]} (aus Spec ${fromSpec[0]})`;
  const found = branchWorkitem(configOf(cwd), snapshot.branch);
  return found ? `${found} (aus Branch ${snapshot.branch})` : 'keiner';
}

// `transcriptEntries` zählt im ausgewerteten Protokoll; nur wenn das das eigene ist, markiert es den Start der Retrospektive.
function costOf(snapshot) {
  if (snapshot.ownTranscript !== null && snapshot.transcript !== snapshot.ownTranscript) {
    return 'Kosten der Retrospektive: nicht messbar (eigenes Protokoll ist nicht das ausgewertete)';
  }
  return retroCost(snapshot.ownTranscript, snapshot.transcriptEntries);
}

function summaryLines({ file, cwd, text, snapshot }) {
  return [
    `Bericht: ${file}`,
    'Prüfung: 0 Verstöße',
    ...findingSummary(text),
    costOf(snapshot),
    `Workitem-Kandidat: ${workitemCandidate(snapshot, cwd)}`,
    `Vormerken: git add "${path.relative(cwd, file).split(path.sep).join('/')}"`,
  ];
}

module.exports = { findingSummary, retroCost, workitemCandidate, summaryLines };
