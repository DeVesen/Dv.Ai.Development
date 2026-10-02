'use strict';

const { normalizeLocation } = require('../aggregate-findings');

const HEAD_LABEL = 'Kopf';
const HEADER_KEYS = new Set(['status', 'art', 'workitem', 'basis']);
const SECTION = /^## (.+?)\s*$/;
const TASK = /^### (Task \d+)\b/;
const SUBHEADING = /^#{3,6} /;
const AC_ITEM = /^- \*\*(AC-\d+)\*\*/;
const STEP_ITEM = /^\d+\. \*\*(.+?)\*\*/;
const LABEL_ITEM = /^- \*\*(.+?)\*\*/;
const ENTRY_LABEL = /^(?:W|E|F|R\d+) · /;
const LIST_ITEM = /^(?:[-*] |\d+\. )/;
const FENCE = /^\s*(?:```|~~~)/;
const DECISIONS = /Entscheidungen$/;

function placeKey(label) {
  return normalizeLocation(label);
}

function isHeaderKey(key) {
  return HEADER_KEYS.has(key);
}

function isDecisionSection(label) {
  return DECISIONS.test(label);
}

function collapse(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function splitLines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function openPlace(places, label, section, isTask = false) {
  const key = placeKey(label);
  if (!places.has(key)) places.set(key, { key, label, section, isTask, lines: [] });
  return places.get(key);
}

function sectionPlace(places, state) {
  return openPlace(places, state.section, state.section);
}

// Name eines AC, eines Schritts oder einer Soll-Vorgabe; Einträge unter Entscheidungen sind keine Stellen.
function namedItem(line) {
  const match = AC_ITEM.exec(line) ?? STEP_ITEM.exec(line) ?? LABEL_ITEM.exec(line);
  if (!match) return null;
  const label = match[1].replace(/:$/, '').trim();
  return ENTRY_LABEL.test(label) ? null : label;
}

function startsNewBlock(line, state) {
  if (line.trim() === '') return false;
  return LIST_ITEM.test(line) || (state.afterBlank && !/^\s/.test(line));
}

function headingPlace(line, state, places) {
  const section = SECTION.exec(line);
  if (section) {
    state.section = section[1];
    return sectionPlace(places, state);
  }
  const task = TASK.exec(line);
  if (task) return openPlace(places, task[1], state.section, true);
  return SUBHEADING.test(line) || line.trim() === '---' ? sectionPlace(places, state) : null;
}

// Heißt eine benannte Einheit wie ein Abschnitt, trägt sie den Abschnitt als Präfix, damit beide getrennt bleiben.
function itemLabel(named, state) {
  return state.sectionKeys.has(placeKey(named)) ? `${state.section} · ${named}` : named;
}

function itemPlace(line, state, places) {
  const named = namedItem(line);
  if (named) return openPlace(places, itemLabel(named, state), state.section);
  return startsNewBlock(line, state) ? sectionPlace(places, state) : state.current;
}

function placeFor(line, state, places) {
  if (state.inFence) return state.current;
  const heading = headingPlace(line, state, places);
  if (heading) return heading;
  if (state.current.isTask) return state.current;
  return itemPlace(line, state, places);
}

function trackLine(line, state) {
  if (FENCE.test(line)) state.inFence = !state.inFence;
  if (!state.inFence) state.afterBlank = line.trim() === '';
}

// Stellen eines Dokuments: Kopf, Abschnitte, ACs, Schritte, benannte Soll-Vorgaben und Tasks, je Schlüssel ihr Text.
function sectionKeys(lines) {
  const keys = new Set();
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const section = inFence ? null : SECTION.exec(line);
    if (section) keys.add(placeKey(section[1]));
  }
  return keys;
}

function parsePlaces(text) {
  const places = new Map();
  const lines = splitLines(text);
  const state = { section: HEAD_LABEL, sectionKeys: sectionKeys(lines), current: null, inFence: false, afterBlank: false };
  state.current = openPlace(places, HEAD_LABEL, HEAD_LABEL);
  for (const line of lines) {
    state.current = placeFor(line, state, places);
    state.current.lines.push(line);
    trackLine(line, state);
  }
  return new Map([...places].map(([key, place]) => [key, { key, label: place.label, section: place.section, text: place.lines.join('\n').trim() }]));
}

function sectionOfQuote(quote, places) {
  const needle = collapse(quote);
  if (needle === '') return null;
  const hit = [...places.values()].find((place) => collapse(place.text).includes(needle));
  return hit ? places.get(placeKey(hit.section)) ?? hit : null;
}

// Ganze Stelle, sonst die erste genannte Stelle, sonst der Abschnitt des Zitats, sonst die Stelle wie genannt.
function resolvePlace(location, quote, places) {
  const whole = placeKey(location);
  if (places.has(whole)) return places.get(whole);
  const first = String(location).split(/,|;| und /).map(placeKey).find((key) => places.has(key));
  if (first) return places.get(first);
  return sectionOfQuote(quote, places) ?? { key: whole, label: collapse(location) };
}

function changedPlaces(beforeText, afterText) {
  const before = parsePlaces(beforeText);
  const after = parsePlaces(afterText);
  const keys = [...new Set([...before.keys(), ...after.keys()])];
  return keys
    .map((key) => after.get(key) ?? before.get(key))
    .filter((place) => !isDecisionSection(place.section))
    .filter((place) => before.get(place.key)?.text !== after.get(place.key)?.text)
    .map((place) => place.label);
}

function decisionLines(text) {
  return [...parsePlaces(text).values()]
    .filter((place) => isDecisionSection(place.section))
    .flatMap((place) => place.text.split('\n'))
    .filter((line) => line.startsWith('- **'));
}

module.exports = { placeKey, isHeaderKey, isDecisionSection, collapse, parsePlaces, resolvePlace, changedPlaces, decisionLines };
