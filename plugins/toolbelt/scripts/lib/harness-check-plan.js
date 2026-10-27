'use strict';

// Prüft Plan, Aufgabendateien, Startanweisung und Abschlussvorlage eines Pakets von harness-refactoring gegen das feste Paketformat.

const { linesOf, section, sectionsMatching, field, items, missingHeadings } = require('./harness-markdown');

const PLAN_HEADINGS = ['## Rollen und Regeln', '## Startprüfungen', '## Akzeptanzkriterien', '## Wellen', '## Subagent-Prompt-Muster', '## Fix-Subagent', '## Nicht Teil'];
const TASK_HEADINGS = ['## Dateien', '## Alt', '## Neu', '## TDD-Schritte', '## Verifikation', '## Rückgabe'];
const START_HEADINGS = ['## Abbruchregeln', '## Wellen', '## Rückgabeformat der Task-Subagents', '## Fix-Subagent', '## Letzte Ausgabe'];
const SUMMARY_HEADINGS = ['## Wellen', '## Tasks', '## Akzeptanzkriterien', '## Offene Punkte'];
const PROOF = /^(Test: `[^`]+`|Suche: `[^`]+` → \S.*|Skript: `[^`]+` → \S.*)$/;
const FILE_LINE = /^- `([^`]+)` · (erlaubt|verboten|unbekannt)$/;
const STATUS_LINE = 'FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN';
const BACKUP_SENTENCE = 'Je Welle ersetzt eine Backup-Kopie den Commit.';
const NO_WORK_BRANCHES = ['main', 'master'];

// Tabellenzellen; ein `\|` gehört zur Zelle, wie in Markdown-Tabellen üblich.
function cellsOf(row) {
  return row.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function checkPlan(text) {
  const errors = missingHeadings(text, PLAN_HEADINGS).map((heading) => `PLAN.md: Abschnitt fehlt: ${heading}`);
  const rows = (section(text, '## Akzeptanzkriterien') ?? []).filter((line) => /^\| AC-\d{2} \|/.test(line));
  if (rows.length === 0) errors.push('PLAN.md: AC-Tabelle ohne Zeile');
  for (const cells of rows.map(cellsOf)) {
    if (!PROOF.test(cells.at(-1))) errors.push(`PLAN.md: ${cells[0]} ohne Testnamen oder wörtlichen Such- oder Skript-Nachweis`);
  }
  return errors;
}

function parseTask(name, text) {
  const lines = linesOf(text);
  const errors = missingHeadings(text, TASK_HEADINGS).map((heading) => `${name}: Abschnitt fehlt: ${heading}`);
  const wave = Number(field(lines, 'Welle'));
  if (!Number.isInteger(wave) || wave < 1) errors.push(`${name}: Welle fehlt`);
  if (!field(lines, 'Modell')) errors.push(`${name}: Modell fehlt`);
  const files = [];
  for (const line of items(section(text, '## Dateien'))) {
    const match = FILE_LINE.exec(line);
    if (match) files.push({ pfad: match[1], angabe: match[2] });
    else errors.push(`${name}: Dateizeile ohne Pfad oder Scope-Ergebnis: ${line}`);
  }
  if (files.length === 0) errors.push(`${name}: keine Datei unter ## Dateien`);
  const findings = (field(lines, 'Befunde') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  return { name, wave, files, findings, errors };
}

// Jede Datei eines Tasks muss erlaubt sein, und die Angabe im Task muss zur Scope-Prüfung passen.
function checkTaskScope(task, classify) {
  return task.files.flatMap(({ pfad, angabe }) => {
    const { ergebnis, grund } = classify(pfad);
    return [
      ...(ergebnis === 'erlaubt' ? [] : [`${task.name}: ${pfad} ist ${ergebnis} (${grund})`]),
      ...(angabe === ergebnis ? [] : [`${task.name}: ${pfad} steht als ${angabe}, die Scope-Prüfung sagt ${ergebnis}`]),
    ];
  });
}

// Gleiche Datei trotz anderer Schreibweise (Groß- und Kleinschreibung, Schrägstrich); genannt wird die erste Schreibweise.
function ownersByFile(tasks) {
  const owners = new Map();
  for (const task of tasks) {
    for (const { pfad } of task.files) {
      const key = pfad.replace(/\\/g, '/').toLowerCase();
      const entry = owners.get(key) ?? { file: pfad, tasks: [] };
      if (!entry.tasks.includes(task)) entry.tasks.push(task);
      owners.set(key, entry);
    }
  }
  return [...owners.values()];
}

// Dieselbe Datei in zwei Tasks derselben Welle blockiert; über Wellen hinweg ist sie nur ein Hinweis.
function overlaps(tasks) {
  const errors = [];
  const warnings = [];
  for (const { file, tasks: owners } of ownersByFile(tasks)) {
    if (owners.length < 2) continue;
    const waves = new Map();
    for (const task of owners) waves.set(task.wave, [...(waves.get(task.wave) ?? []), task.name]);
    for (const [wave, names] of waves) if (names.length > 1) errors.push(`Überschneidung in Welle ${wave}: ${file} (${names.join(', ')})`);
    if (waves.size > 1) warnings.push(`Überschneidung über Wellen: ${file} (${owners.map((task) => `${task.name} Welle ${task.wave}`).join(', ')})`);
  }
  return { errors, warnings };
}

function checkBranch(lines, before, currentBranch) {
  const branch = /^`([^`]+)`$/.exec(field(lines, 'Branch') ?? '')?.[1];
  if (!branch) return ['START-PROMPT.md: Branch fehlt'];
  if (NO_WORK_BRANCHES.includes(branch)) return [`START-PROMPT.md: Branch ${branch} ist kein Arbeits-Branch`];
  if (currentBranch !== branch && !before.includes(`git switch -c ${branch}`)) {
    return [`START-PROMPT.md: aktueller Branch ist ${currentBranch || 'leer'}, vor der Linie fehlt der Handgriff git switch -c ${branch}`];
  }
  return [];
}

function checkWaves(after, waves, backupWaves) {
  const errors = [];
  const sections = sectionsMatching(after, /^### Welle (\d+)$/);
  const numbers = sections.map((entry) => Number(entry.match[1]));
  for (const wave of waves) if (!numbers.includes(wave)) errors.push(`START-PROMPT.md: Welle ${wave} fehlt unter ## Wellen`);
  for (const { match, lines } of sections) {
    const wave = Number(match[1]);
    const commits = lines.filter((line) => line.startsWith('**Commit:** ')).length;
    const backups = lines.filter((line) => line.startsWith('**Backup:** ')).length;
    if (!lines.some((line) => line.startsWith('**Checkpoint:** '))) errors.push(`START-PROMPT.md: Welle ${wave} ohne Checkpoint`);
    if (backupWaves.has(wave) && !(backups === 1 && commits === 0)) errors.push(`START-PROMPT.md: Welle ${wave} braucht genau eine Zeile **Backup:** und keinen Commit`);
    if (!backupWaves.has(wave) && !(commits === 1 && backups === 0)) errors.push(`START-PROMPT.md: Welle ${wave} braucht genau eine Zeile **Commit:**`);
  }
  if (backupWaves.size > 0 && !after.includes(BACKUP_SENTENCE)) errors.push(`START-PROMPT.md: Satz fehlt: ${BACKUP_SENTENCE}`);
  return errors;
}

// Vor der Linie stehen die Handgriffe für den Menschen, danach der Prompt für die Umsetzungs-Session.
function checkStart(text, { waves, backupWaves, currentBranch }) {
  const lines = linesOf(text);
  const divider = lines.indexOf('---');
  if (divider === -1) return ['START-PROMPT.md: Linie --- zwischen Handgriffen und Prompt fehlt'];
  const before = lines.slice(0, divider).join('\n');
  const after = lines.slice(divider + 1).join('\n');
  return [
    ...(section(before, '## Handgriffe') === null ? ['START-PROMPT.md: ## Handgriffe fehlt vor der Linie'] : []),
    ...missingHeadings(after, START_HEADINGS).map((heading) => `START-PROMPT.md: Abschnitt fehlt nach der Linie: ${heading}`),
    ...(after.includes(STATUS_LINE) ? [] : [`START-PROMPT.md: letzte Ausgabe nennt nicht ${STATUS_LINE}`]),
    ...checkBranch(lines, before, currentBranch),
    ...checkWaves(after, waves, backupWaves),
  ];
}

function checkSummary(text) {
  return [
    ...missingHeadings(text, SUMMARY_HEADINGS).map((heading) => `ABSCHLUSS-VORLAGE.md: Abschnitt fehlt: ${heading}`),
    ...(text.includes(`**Status:** ${STATUS_LINE}`) ? [] : [`ABSCHLUSS-VORLAGE.md: Zeile **Status:** ${STATUS_LINE} fehlt`]),
  ];
}

module.exports = { checkPlan, parseTask, checkTaskScope, overlaps, checkStart, checkSummary, PLAN_HEADINGS, TASK_HEADINGS, START_HEADINGS, SUMMARY_HEADINGS, STATUS_LINE, BACKUP_SENTENCE };
