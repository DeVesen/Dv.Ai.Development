'use strict';

// Ein regelkonformer Entwurf, ein passender Snapshot und ein Protokolltext, der das Zitat des Entwurfs enthält.

const VALID = [
  '# Erfahrungsbericht Planung eines Skripts',
  '',
  '**Lauf:** Der Mensch ließ einen Plan schreiben.',
  '**Ergebnis:** Plan fertig.',
  '',
  '**Relevanz:**',
  '- dev-mcp: verzichtbar in dieser Session.',
  '',
  '## Positiv',
  '',
  '1. **Tests liefen sofort grün.** Beleg: 12 Tests.',
  '',
  '## Reibung',
  '',
  '1. **Suche im Protokoll blockiert.**',
  '   *Situation:* Ein Suchbefehl wurde abgelehnt.',
  '   *Kosten:* 2 Rückfragen.',
  '   *Ursache:* Regel fehlt.',
  '   *Besser gewesen:* Vorher fragen.',
  '   *Vorschlag:* Regel ergänzen.',
  '   *Ziel:* Skill · `acme:plan-writing` (schreibt Pläne)',
  '   *Im Projekt:* Datei `Shift.ts`. Zitat: „Suche einmal freigeben“',
  '',
  '## Sparpotenzial',
  '',
  '1. **Zeitleiste statt Textsuche.**',
  '   *Situation:* Das Protokoll wurde dreimal durchsucht.',
  '   *Ersparnis:* weniger Anfragen · Eindruck',
  '   *Besser gewesen:* Zeitleiste lesen.',
  '   *Vorschlag:* Ein Skript für Ausschnitte.',
  '   *Ziel:* Skript · neu: protokoll-ausschnitt',
  '   *Im Projekt:* nichts',
  '',
  '## Neue Ideen',
  '',
  '- keine',
  '',
  '## Kleinigkeiten',
  '',
  '- keine',
  '',
].join('\n');

const SNAPSHOT = {
  session: 's1', transcript: '', ownTranscript: null, transcriptEntries: 1, cwd: '', cut: null, labels: [], branch: 'feature/lean-retro', specs: [],
  expected: ['dev-mcp'], model: 'claude-x', skills: ['acme:plan-writing'],
  headline: 'Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents',
  numbers: '- Dauer: 10 min · Modelle: claude-x', mcp: 'Quelle: `s1.jsonl`', projectFiles: ['Shift.ts'],
};

const CORPUS = 'Der Mensch schrieb: Suche einmal   freigeben, bitte.';

module.exports = { VALID, SNAPSHOT, CORPUS };
