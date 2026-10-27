'use strict';

// Ein gültiges Paket von harness-refactoring mit Umbau als Ausgangspunkt der Prüf-Tests; jeder Test ändert genau eine Stelle.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TASK_FILE = 'plugins/werkzeug/skills/a/SKILL.md';

function lines(...rows) {
  return `${rows.join('\n')}\n`;
}

function validFiles() {
  return {
    'BEFUNDE.md': lines(
      '# Befundbericht: werkzeug',
      '',
      '**Ergebnis:** Umbau',
      '',
      '## Kettenkarte',
      '| Übergabe | Format hin | Format zurück | Leser | Hook | Bewertung |',
      '|---|---|---|---|---|---|',
      '| Skill → Skript | Argumente | Statuszeile | Skill | keiner | ✅ |',
      '',
      '## Befunde',
      `- **B-01** 🔴 \`${TASK_FILE}:12\` — Aufruf ohne Anführungszeichen bricht bei Leerzeichen. Vorschlag: Pfad quoten.`,
      '- **B-02** 🟢 `plugins/werkzeug/README.md:3` — Tippfehler ohne Folgen. Vorschlag: keiner.',
      '',
      '## Rückmeldungen',
      `- **R-01** Skript bricht bei Leerzeichen → \`${TASK_FILE}:12\``,
      '- **R-02** Session-Start dauert lange → nicht zuordenbar',
      '',
      '## Nicht zuordenbar',
      '- **R-02** App-Verhalten, im Code nicht sichtbar.',
      '',
      '## Außerhalb des Scopes',
      '',
      '## Nicht belegbar',
      '- Nachricht an den Parent kommt an: App-Verhalten.',
      '',
      '## Entscheidungen',
      '- Pfad quoten statt umbenennen: kleinster Eingriff.',
    ),
    'PRUEFPROTOKOLL.md': lines(
      '# Prüfprotokoll: werkzeug',
      '',
      '**Prüf-Subagents:** 2',
      '**Status:** abgabefähig',
      '',
      '## Alt-Block-Prüfung',
      `- T-01 \`${TASK_FILE}:12\` — gefunden`,
      '',
      '## Probelauf-Prüfung',
      '- keine Lücke',
      '',
      '## Plan-Prüfrunde 1',
      '**Offen 🔴:** 1',
      '- 🔴 T-01 ohne roten Test → Korrektur: Test ergänzt',
      '- 🔴 Welle 1 ohne Checkpoint → offen',
      '',
      '## Plan-Prüfrunde 2',
      '**Offen 🔴:** 0',
      '- keine Anmerkungen',
    ),
    'PLAN.md': lines(
      '# Plan: werkzeug',
      '',
      '## Rollen und Regeln',
      '- Orchestrator Sonnet, Task-Subagents Sonnet.',
      '## Startprüfungen',
      '- Branch, sauberes Arbeitsverzeichnis, Baseline, Task-Zahl.',
      '## Akzeptanzkriterien',
      '| AC | Kriterium | Nachweis |',
      '|---|---|---|',
      '| AC-01 | Pfad gequotet | Test: `skill_Call_QuotesPath` |',
      '| AC-02 | Kein alter Wortlaut | Suche: `rg -n "a\\|b" plugins/werkzeug` → 0 Treffer |',
      '| AC-03 | Skript meldet OK | Skript: `node plugins/werkzeug/scripts/x.js` → `OK` |',
      '## Wellen',
      '### Welle 1',
      '**Tasks:** T-01',
      '## Subagent-Prompt-Muster',
      '- Lies die Task-Datei.',
      '## Fix-Subagent',
      '- Höchstens zwei Versuche.',
      '## Nicht Teil',
      '- Umbenennungen.',
    ),
    'tasks/T-01.md': lines(
      '# T-01: Pfad quoten',
      '',
      '**Modell:** sonnet',
      '**Welle:** 1',
      '**Befunde:** B-01, R-01',
      '**ACs:** AC-01',
      '',
      '## Dateien',
      `- \`${TASK_FILE}\` · erlaubt`,
      '## Alt',
      'alt',
      '## Neu',
      'neu',
      '## TDD-Schritte',
      '1. Test rot.',
      '## Verifikation',
      '- node --test',
      '## Rückgabe',
      '- OK oder FEHLER mit Grund.',
    ),
    'START-PROMPT.md': lines(
      '# Startanweisung: werkzeug',
      '',
      '**Branch:** `feat/werkzeug`',
      '',
      '## Handgriffe',
      '- Branch anlegen: `git switch -c feat/werkzeug`',
      '',
      '---',
      '',
      '## Abbruchregeln',
      '- Branch main, master oder leer.',
      '## Wellen',
      '### Welle 1',
      '**Checkpoint:** Baseline + 1 Test',
      '**Commit:** `fix(werkzeug): quote the path`',
      '## Rückgabeformat der Task-Subagents',
      '- OK oder FEHLER mit Grund.',
      '## Fix-Subagent',
      '- Höchstens zwei Versuche.',
      '## Letzte Ausgabe',
      '- Abschlussbericht mit Status FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN',
    ),
    'ABSCHLUSS-VORLAGE.md': lines(
      '# Abschluss: werkzeug',
      '',
      '**Status:** FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN',
      '',
      '## Wellen',
      '## Tasks',
      '## Akzeptanzkriterien',
      '## Offene Punkte',
    ),
  };
}

// Ersetzt in einer Datei genau einen Wortlaut; fehlt er, scheitert der Test sofort statt still grün zu bleiben.
function replaced(files, name, from, to) {
  if (!files[name].includes(from)) throw new Error(`${name} enthält nicht: ${from}`);
  return { ...files, [name]: files[name].replace(from, to) };
}

function writePackage(files) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-paket-'));
  fs.writeFileSync(path.join(folder, '.gitignore'), '*\n');
  for (const [name, content] of Object.entries(files)) {
    if (content === null) continue;
    fs.mkdirSync(path.dirname(path.join(folder, name)), { recursive: true });
    fs.writeFileSync(path.join(folder, name), content);
  }
  return folder;
}

module.exports = { TASK_FILE, validFiles, replaced, writePackage };
