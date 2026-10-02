'use strict';

// Prüft den Kopf einer SKILL.md: Fehler für Name, Beschreibung, Pflichtfelder und mehrere SKILL.md, Warnungen für Unbekanntes.

const fs = require('node:fs');
const path = require('node:path');

const NAME_PATTERN = /^[a-z0-9-]+$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
// Nur eine Warnung, deshalb muss die Liste nicht vollständig sein.
const KNOWN_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools', 'argument-hint', 'disable-model-invocation', 'user-invocable', 'model', 'context', 'agent', 'hooks']);
const SKIPPED_FOLDERS = new Set(['node_modules', '.git']);

function unquote(value) {
  const quote = value[0];
  return value.length >= 2 && (quote === '"' || quote === "'") && value.at(-1) === quote ? value.slice(1, -1) : value;
}

// Liest den Kopf zwischen den `---`-Zeilen: einfache Schlüssel, einzeilige und mehrzeilige Werte (`>`, `|`, Fortsetzungszeilen).
function parseFrontmatter(text) {
  const match = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/.exec(text.replace(/^﻿/, ''));
  if (!match) return null;
  const entries = [];
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const key = /^([A-Za-z0-9_-]+):(?:\s+(.*))?\s*$/.exec(line);
    if (key) entries.push({ key: key[1], head: (key[2] ?? '').trim(), rest: [] });
    else if (entries.length > 0) entries.at(-1).rest.push(line.trim());
  }
  const fields = {};
  for (const { key, head, rest } of entries) {
    const block = /^[>|][+-]?$/.test(head);
    const parts = [...(block ? [] : [head]), ...rest].filter((part) => part !== '');
    fields[key] = block && head.startsWith('|') ? parts.join('\n') : unquote(parts.join(' '));
  }
  return fields;
}

function skillFiles(folder, current = folder) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) return SKIPPED_FOLDERS.has(entry.name) ? [] : skillFiles(folder, full);
    return entry.name === 'SKILL.md' ? [path.relative(folder, full)] : [];
  });
}

function checkName(fields, errors) {
  const name = fields.name;
  if (name === undefined || name === '') {
    errors.push('Pflichtfeld name fehlt');
    return;
  }
  if (!NAME_PATTERN.test(name)) errors.push(`Name "${name}" erlaubt nur Kleinbuchstaben, Ziffern und Bindestriche`);
  if (name.length > NAME_MAX) errors.push(`Name ist ${name.length} Zeichen lang, erlaubt sind höchstens ${NAME_MAX}`);
}

function checkDescription(fields, errors, warnings) {
  const description = fields.description;
  if (description === undefined || description === '') {
    errors.push('Pflichtfeld description fehlt');
    return;
  }
  if (description.length > DESCRIPTION_MAX) errors.push(`Beschreibung ist ${description.length} Zeichen lang, erlaubt sind höchstens ${DESCRIPTION_MAX}`);
  if (/[<>]/.test(description)) warnings.push('Beschreibung enthält < oder >');
}

function validateSkill(folder) {
  const errors = [];
  const warnings = [];
  const skillFile = path.join(folder, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return { errors: [`SKILL.md fehlt in ${folder}`], warnings, name: null };
  for (const extra of skillFiles(folder).filter((file) => file !== 'SKILL.md')) errors.push(`Zusätzliche SKILL.md: ${extra}`);
  const fields = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
  if (fields === null) {
    errors.push('Kopf fehlt: SKILL.md beginnt nicht mit einem Kopf zwischen --- Zeilen');
    return { errors, warnings, name: null };
  }
  checkName(fields, errors);
  checkDescription(fields, errors, warnings);
  for (const key of Object.keys(fields).filter((candidate) => !KNOWN_KEYS.has(candidate))) warnings.push(`Unbekannter Schlüssel im Kopf: ${key}`);
  return { errors, warnings, name: fields.name ?? null };
}

function reportLines({ errors, warnings, name }) {
  return [
    ...errors.map((text) => `FEHLER ${text}`),
    ...warnings.map((text) => `WARNUNG ${text}`),
    errors.length === 0 ? `Skill gültig: ${name}` : `Skill ungültig: ${errors.length} Fehler`,
  ];
}

module.exports = { parseFrontmatter, validateSkill, reportLines };
