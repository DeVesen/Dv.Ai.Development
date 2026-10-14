'use strict';

// Validiert die Urteile je Kriterium, berechnet Gesamturteil und Lückenliste
// und gibt das Ergebnis als Markdown aus.
// Aufruf: node dor-verdict.js <urteile.json | -> [--catalog <pfad>]
// Bei ungültiger Eingabe: Fehlerliste auf stderr, Exit-Code 1.

const fs = require('node:fs');
const { loadCatalog, DEFAULT_CATALOG } = require('./lib/catalog');

const ARTEN = ['Requirement', 'Steps', 'Spec', 'Plan', 'Workitem'];
const UMFAENGE = ['Einzel', 'Paket'];
const URTEILE = ['erfüllt', 'nicht erfüllt', 'nicht zutreffend', 'nicht prüfbar', 'bewusst abgewichen'];
const LUECKEN_URTEILE = ['nicht erfüllt', 'nicht prüfbar', 'bewusst abgewichen'];
const ABWEICHUNG_FELDER = ['was', 'warum', 'verantwortlich', 'massnahme'];
const SCHLUSSSATZ = '„Ready“ vergibt erst der Review durch Mensch oder Team.';

const filled = (value) => typeof value === 'string' && value.trim() !== '';

function validateHeader(input) {
  const errors = [];
  if (!ARTEN.includes(input.art)) errors.push(`art muss eine von ${ARTEN.join(', ')} sein`);
  if (!UMFAENGE.includes(input.umfang)) errors.push(`umfang muss eine von ${UMFAENGE.join(', ')} sein`);
  if (typeof input.hatUI !== 'boolean') errors.push('hatUI muss true oder false sein');
  if (!Array.isArray(input.quellen) || !input.quellen.every(filled)) {
    errors.push('quellen muss eine Liste benannter Artefakte sein');
  } else if (input.umfang === 'Paket' && input.quellen.length < 2) {
    errors.push('umfang Paket braucht mindestens zwei quellen');
  } else if (input.umfang === 'Einzel' && input.quellen.length !== 1) {
    errors.push('umfang Einzel braucht genau eine quelle');
  }
  if ('gesamturteil' in input) errors.push('gesamturteil wird berechnet und darf nicht geliefert werden');
  if (!Array.isArray(input.urteile)) errors.push('urteile muss eine Liste sein');
  return errors;
}

function validateCoverage(urteile, catalog) {
  const errors = [];
  const known = new Set(catalog.criteria.map((criterion) => criterion.id));
  const seen = new Set();
  for (const urteil of urteile) {
    if (!known.has(urteil.id)) errors.push(`${urteil.id}: unbekannte Kriterien-ID`);
    else if (seen.has(urteil.id)) errors.push(`${urteil.id}: mehrfach bewertet`);
    seen.add(urteil.id);
  }
  for (const criterion of catalog.criteria) {
    if (!seen.has(criterion.id)) errors.push(`${criterion.id}: nicht bewertet`);
  }
  return errors;
}

function validateEvidence(urteil, input) {
  if (urteil.urteil !== 'erfüllt') return [];
  if (!filled(urteil.fundstelle) && !filled(urteil.nachweis)) {
    return [`${urteil.id}: erfüllt braucht fundstelle oder nachweis`];
  }
  const namesSource = input.quellen.some((quelle) => (urteil.fundstelle || '').includes(quelle));
  if (input.umfang === 'Paket' && filled(urteil.fundstelle) && !namesSource) {
    return [`${urteil.id}: fundstelle muss im Paket das Artefakt nennen (${input.quellen.join(', ')})`];
  }
  return [];
}

function validateSpecialVerdicts(urteil, criterion, input) {
  const errors = [];
  if (urteil.urteil === 'nicht zutreffend' && urteil.bestaetigt !== true) {
    errors.push(`${urteil.id}: nicht zutreffend ist erst nach Bestätigung des Menschen gültig (bestaetigt: true)`);
  }
  if (urteil.urteil === 'nicht zutreffend' && criterion.alwaysChecked && input.hatUI === false) {
    errors.push(`${urteil.id}: Data-Flow- und Architekturprüfung bleibt auch ohne UI-Anteil Pflicht`);
  }
  if (urteil.urteil === 'bewusst abgewichen') {
    const abweichung = urteil.abweichung || {};
    const missing = ABWEICHUNG_FELDER.filter((feld) => !filled(abweichung[feld]));
    if (missing.length > 0) errors.push(`${urteil.id}: abweichung braucht ${missing.join(', ')}`);
  }
  return errors;
}

function validateVerdicts(input, catalog) {
  const byId = new Map(catalog.criteria.map((criterion) => [criterion.id, criterion]));
  const errors = [];
  for (const urteil of input.urteile) {
    if (!URTEILE.includes(urteil.urteil)) {
      errors.push(`${urteil.id}: urteil "${urteil.urteil}" ungültig; erlaubt: ${URTEILE.join(', ')}`);
      continue;
    }
    if (!filled(urteil.begruendung)) errors.push(`${urteil.id}: begruendung fehlt`);
    errors.push(...validateEvidence(urteil, input));
    const criterion = byId.get(urteil.id);
    if (criterion) errors.push(...validateSpecialVerdicts(urteil, criterion, input));
  }
  return errors;
}

function collectWarnings(input, catalog) {
  const verdicts = new Map(input.urteile.map((urteil) => [urteil.id, urteil.urteil]));
  const warnings = [];
  for (const criterion of catalog.criteria) {
    const verdict = verdicts.get(criterion.id);
    if (input.hatUI && criterion.onlyWithoutUi && verdict !== 'nicht zutreffend') {
      warnings.push(`${criterion.id} gilt nur ohne UI-Anteil, das Artefakt hat UI: erwartet nicht zutreffend (bestätigt)`);
    }
    if (!input.hatUI && criterion.uiOnly && verdict !== 'nicht zutreffend') {
      warnings.push(`${criterion.id} gilt nur mit UI-Anteil, das Artefakt hat keinen: nicht zutreffend vorschlagen und Bestätigung einholen`);
    }
  }
  return warnings;
}

function validate(input, catalog) {
  const headerErrors = validateHeader(input);
  if (!Array.isArray(input.urteile)) return { errors: headerErrors, warnings: [] };
  const errors = [...headerErrors, ...validateCoverage(input.urteile, catalog), ...validateVerdicts(input, catalog)];
  const applicable = input.urteile.filter((urteil) => urteil.urteil !== 'nicht zutreffend');
  if (errors.length === 0 && applicable.length === 0) errors.push('kein zutreffendes Kriterium');
  return { errors, warnings: errors.length === 0 ? collectWarnings(input, catalog) : [] };
}

function aggregate(input, catalog) {
  const byId = new Map(input.urteile.map((urteil) => [urteil.id, urteil]));
  const rows = catalog.criteria.map((criterion) => ({ criterion, urteil: byId.get(criterion.id) }));
  const gaps = rows.filter((row) => LUECKEN_URTEILE.includes(row.urteil.urteil));
  const gesamt = rows.every((row) => ['erfüllt', 'nicht zutreffend'].includes(row.urteil.urteil))
    ? 'bereit für den Review'
    : 'nicht bereit';
  return { rows, gaps, gesamt };
}

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function describeRow(urteil) {
  const parts = [urteil.begruendung];
  if (filled(urteil.fundstelle)) parts.push(`Fundstelle: ${urteil.fundstelle}`);
  else if (urteil.urteil !== 'nicht zutreffend') parts.push('Fundstelle: keine');
  if (filled(urteil.nachweis)) parts.push(`Nachweis: ${urteil.nachweis}`);
  return parts.join(' · ');
}

function renderGap({ criterion, urteil }) {
  const nachfrage = filled(urteil.nachfrage) ? ` — Nachfrage: ${urteil.nachfrage}` : '';
  return `- ${criterion.id} — ${urteil.urteil}: ${urteil.begruendung}${nachfrage}`;
}

function renderDeviation({ criterion, urteil }) {
  const a = urteil.abweichung;
  return `- ${criterion.id} — was: ${a.was}; warum: ${a.warum}; verantwortlich: ${a.verantwortlich}; Maßnahme: ${a.massnahme}`;
}

function renderNotes(input, catalog, warnings) {
  const notes = catalog.duplicates.map(
    (pair) => `${pair.a} und ${pair.b} stehen inhaltlich doppelt im Katalog; je einmal bewertet, Katalog unverändert.`,
  );
  return [...notes, ...warnings].map((note) => `- ${note}`);
}

function render(input, catalog, warnings) {
  const { rows, gaps, gesamt } = aggregate(input, catalog);
  const deviations = rows.filter((row) => row.urteil.urteil === 'bewusst abgewichen');
  const lines = [
    `**Art:** ${input.art} · **Umfang:** ${input.umfang} (${input.quellen.join(', ')})`,
    '',
    '| ID | Kriterium | Urteil | Begründung / Fundstelle |',
    '|---|---|---|---|',
    ...rows.map(
      ({ criterion, urteil }) =>
        `| ${criterion.id} | ${cell(criterion.text)} | ${urteil.urteil} | ${cell(describeRow(urteil))} |`,
    ),
    '',
    `**Gesamturteil:** ${gesamt}`,
    '',
    '**Lücken:**',
    ...(gaps.length > 0 ? gaps.map(renderGap) : ['- keine']),
    '',
    '**Abweichungen:**',
    ...(deviations.length > 0 ? deviations.map(renderDeviation) : ['- keine']),
    '',
    '**Hinweise:**',
    ...renderNotes(input, catalog, warnings),
    '',
    SCHLUSSSATZ,
  ];
  return `${lines.join('\n')}\n`;
}

function readInput(source) {
  const text = source === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(source, 'utf8');
  return JSON.parse(text);
}

function main(argv) {
  const source = argv.find((arg, index) => index === 0 && arg !== '--catalog');
  const catalogFlag = argv.indexOf('--catalog');
  const catalogPath = catalogFlag === -1 ? DEFAULT_CATALOG : argv[catalogFlag + 1];
  if (!source) {
    process.stderr.write('FEHLER: Aufruf: node dor-verdict.js <urteile.json | -> [--catalog <pfad>]\n');
    return 2;
  }
  try {
    const catalog = loadCatalog(catalogPath);
    const input = readInput(source);
    const { errors, warnings } = validate(input, catalog);
    if (errors.length > 0) {
      process.stderr.write(`${errors.map((error) => `FEHLER: ${error}`).join('\n')}\n`);
      return 1;
    }
    process.stdout.write(render(input, catalog, warnings));
    return 0;
  } catch (error) {
    process.stderr.write(`FEHLER: ${error.message}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { validate, aggregate, render, main };
