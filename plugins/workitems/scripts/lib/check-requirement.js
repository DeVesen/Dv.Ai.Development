'use strict';

// Prüft einen Stand-Block (Requirement + Steps) gegen die Leitplanken aus limits.json.
// Fehler = kaputte Struktur, Warnungen = Leitplanke überschritten oder Feld leer.

const ABBREVIATIONS = /\b(?:z\.\s?B\.|d\.\s?h\.|u\.\s?a\.|bzw\.|ca\.|ggf\.|usw\.|etc\.|vgl\.)/gi;
const LIMIT_KEYS = {
  requirement: ['zielSaetze', 'stepsMax', 'acMin', 'acMax', 'negativeAcMin'],
  step: ['zielSaetze', 'acMin', 'acMax', 'negativeAcMin'],
};
const REQUIREMENT_FIELDS = ['Ziel', 'Nutzen', 'Nutzer', 'Scope', 'Nicht-Ziele', 'Abhängigkeiten', 'Annahmen / Risiken / Offene Punkte', 'Akzeptanzkriterien'];
const STEP_FIELD = /^(Ziel|Akzeptanzkriterien|Abhängig von):\s*(.*)$/;
const LIST_ITEM = /^(?:[-*]|\d+\.)\s+(.*)$/;
const CRITERION = /^(?:(?:[-*]|\d+\.)\s+)?AC-(\d+)\s+(.*)$/;

// `bare`: Im Requirement stehen die Kriterien ohne Aufzählungszeichen, jede Zeile zählt.
function parseCriterion(line, bare = false) {
  const trimmed = line.trim();
  const withId = CRITERION.exec(trimmed);
  const item = withId ?? LIST_ITEM.exec(trimmed) ?? (bare && trimmed ? [trimmed, trimmed] : null);
  if (!item) return null;
  const text = withId ? withId[2] : item[1];
  return { idText: withId ? withId[1] : null, text: text.replace(/^\(negativ\)\s*/i, '').trim(), negative: /^\(negativ\)/i.test(text) };
}

function parseDependencies(value) {
  if (/^[–—-]?$/.test(value.trim())) return [];
  return [...value.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

function emptyStep(nr, title) {
  return { nr, titel: title, ziel: '', kriterien: [], abhaengig: [] };
}

// Liest eine Zeile eines Steps; `state.inCriteria` merkt, ob gerade Kriterien folgen.
function readStepLine(step, line, state) {
  const trimmed = line.trim();
  const field = STEP_FIELD.exec(trimmed);
  if (field) {
    state.inCriteria = field[1] === 'Akzeptanzkriterien';
    if (field[1] === 'Ziel') step.ziel = field[2];
    if (field[1] === 'Abhängig von') step.abhaengig = parseDependencies(field[2]);
    return;
  }
  const criterion = state.inCriteria ? parseCriterion(trimmed) : null;
  if (criterion) step.kriterien.push(criterion);
}

function parseSteps(lines) {
  const steps = [];
  const state = { inCriteria: false };
  for (const line of lines) {
    const start = /^(\d+)\.\s+(.+)$/.exec(line);
    if (start) {
      steps.push(emptyStep(Number(start[1]), start[2].trim()));
      state.inCriteria = false;
    } else if (steps.length > 0) {
      readStepLine(steps.at(-1), line, state);
    }
  }
  return steps;
}

function parseRequirementLines(lines) {
  const requirement = { felder: {}, kriterien: [] };
  const fieldPattern = new RegExp(`^(${REQUIREMENT_FIELDS.map((name) => name.replace(/[/]/g, '\\/')).join('|')}):\\s*(.*)$`);
  let inCriteria = false;
  for (const line of lines) {
    const field = fieldPattern.exec(line.trim());
    if (field) {
      inCriteria = field[1] === 'Akzeptanzkriterien';
      requirement.felder[field[1]] = field[2].trim();
      continue;
    }
    const criterion = inCriteria ? parseCriterion(line, true) : null;
    if (criterion) requirement.kriterien.push(criterion);
  }
  return requirement;
}

function parse(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^##\s+Requirement:/.test(line));
  if (headerIndex === -1) return null;
  const stepsIndex = lines.findIndex((line, index) => index > headerIndex && /^###\s+Steps\s*$/.test(line));
  const requirementEnd = stepsIndex === -1 ? lines.length : stepsIndex;
  const requirement = parseRequirementLines(lines.slice(headerIndex + 1, requirementEnd));
  requirement.titel = lines[headerIndex].replace(/^##\s+Requirement:\s*/, '').trim();
  const steps = stepsIndex === -1 ? [] : parseSteps(lines.slice(stepsIndex + 1));
  return { requirement, steps, hasStepsSection: stepsIndex !== -1 };
}

function sentenceCount(text) {
  const cleaned = text.replace(ABBREVIATIONS, 'x');
  return (cleaned.match(/[.!?](?:\s|$)/g) ?? []).length || (cleaned.trim() ? 1 : 0);
}

function finding(level, where, message) {
  return { level, where, message };
}

function checkCriteria(where, criteria, limits) {
  const findings = [];
  const count = criteria.length;
  if (count < limits.acMin || count > limits.acMax) {
    findings.push(finding('warn', where, `${count} Kriterien, erlaubt sind ${limits.acMin} bis ${limits.acMax}`));
  }
  const negatives = criteria.filter((criterion) => criterion.negative).length;
  if (negatives < limits.negativeAcMin) {
    findings.push(finding('warn', where, `${negatives} Negativ-Kriterien, mindestens ${limits.negativeAcMin} verlangt`));
  }
  return findings;
}

function checkGoal(where, goal, limit) {
  if (!goal.trim()) return [finding('error', where, 'Ziel fehlt')];
  const sentences = sentenceCount(goal);
  return sentences > limit ? [finding('warn', where, `Ziel hat ${sentences} Sätze, erlaubt sind ${limit}`)] : [];
}

function checkRequirementFields(requirement) {
  const findings = [];
  for (const name of REQUIREMENT_FIELDS.filter((field) => field !== 'Ziel')) {
    if (!(name in requirement.felder)) findings.push(finding('warn', 'requirement', `Feld „${name}" fehlt`));
  }
  if ('Nutzen' in requirement.felder && !requirement.felder.Nutzen) findings.push(finding('warn', 'requirement', 'Nutzen ist leer'));
  return findings;
}

// Die IDs laufen lückenlos von AC-01 über Requirement und alle Steps, so wie es der DoR-Lint verlangt.
function checkCriterionIds(model) {
  const all = [...model.requirement.kriterien, ...model.steps.flatMap((step) => step.kriterien)];
  const findings = [];
  for (const criterion of all.filter((item) => item.idText === null)) {
    findings.push(finding('error', 'kriterien', `Kriterium ohne AC-ID: ${criterion.text}`));
  }
  const withId = all.filter((item) => item.idText !== null);
  for (const criterion of withId.filter((item) => item.idText.length !== 2)) {
    findings.push(finding('error', 'kriterien', `AC-${criterion.idText} ist nicht zweistellig`));
  }
  const deviation = withId.findIndex((item, index) => Number(item.idText) !== index + 1);
  if (deviation !== -1) {
    const expected = String(deviation + 1).padStart(2, '0');
    findings.push(finding('error', 'kriterien', `AC-IDs nicht lückenlos ab AC-01: erwartet AC-${expected}, gefunden AC-${withId[deviation].idText}`));
  }
  return findings;
}

function hasCycle(steps) {
  const edges = new Map(steps.map((step) => [step.nr, step.abhaengig]));
  const visiting = new Set();
  const done = new Set();
  const visit = (nr) => {
    if (done.has(nr)) return false;
    if (visiting.has(nr)) return true;
    visiting.add(nr);
    const cyclic = (edges.get(nr) ?? []).some((next) => edges.has(next) && visit(next));
    visiting.delete(nr);
    done.add(nr);
    return cyclic;
  };
  return steps.some((step) => visit(step.nr));
}

function checkStepStructure(steps) {
  const findings = [];
  const numbers = steps.map((step) => step.nr);
  const expected = steps.map((_, index) => index + 1);
  if (numbers.join() !== expected.join()) {
    findings.push(finding('error', 'steps', `Nummerierung ist nicht 1 bis ${steps.length} in Reihenfolge: ${numbers.join(', ')}`));
  }
  for (const step of steps) {
    for (const dependency of step.abhaengig) {
      if (dependency === step.nr) findings.push(finding('error', `step ${step.nr}`, 'hängt von sich selbst ab'));
      else if (!numbers.includes(dependency)) findings.push(finding('error', `step ${step.nr}`, `hängt von unbekanntem Step ${dependency} ab`));
    }
  }
  if (hasCycle(steps)) findings.push(finding('error', 'steps', 'Abhängigkeiten enthalten einen Zyklus'));
  return findings;
}

function checkLimitsShape(limits) {
  const missing = [];
  for (const [section, keys] of Object.entries(LIMIT_KEYS)) {
    for (const key of keys) {
      if (typeof limits?.[section]?.[key] !== 'number') missing.push(`${section}.${key}`);
    }
  }
  return missing;
}

function check(text, limits) {
  const missing = checkLimitsShape(limits);
  if (missing.length > 0) throw new Error(`limits.json unvollständig: ${missing.join(', ')}`);
  const model = parse(text);
  if (!model) return [finding('error', 'block', 'Kein Stand-Block: Zeile „## Requirement: <Titel>" fehlt')];
  const { requirement, steps } = model;
  const findings = [
    ...checkGoal('requirement', requirement.felder.Ziel ?? '', limits.requirement.zielSaetze),
    ...checkRequirementFields(requirement),
    ...checkCriteria('requirement', requirement.kriterien, limits.requirement),
    ...checkCriterionIds(model),
  ];
  if (!model.hasStepsSection || steps.length === 0) findings.push(finding('warn', 'requirement', 'Keine Steps vorhanden'));
  if (steps.length > limits.requirement.stepsMax) {
    findings.push(finding('warn', 'requirement', `${steps.length} Steps, erlaubt sind höchstens ${limits.requirement.stepsMax}: Requirement teilen`));
  }
  findings.push(...checkStepStructure(steps));
  for (const step of steps) {
    const where = `step ${step.nr}`;
    findings.push(...checkGoal(where, step.ziel, limits.step.zielSaetze));
    findings.push(...checkCriteria(where, step.kriterien, limits.step));
  }
  return findings;
}

function reportLines(findings) {
  if (findings.length === 0) return ['OK: keine Befunde'];
  const label = { error: 'FEHLER', warn: 'WARNUNG' };
  return findings.map((item) => `${label[item.level]} ${item.where}: ${item.message}`);
}

module.exports = { parse, check, reportLines, sentenceCount };
