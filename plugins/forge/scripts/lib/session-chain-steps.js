'use strict';

// Schritte der Leit-Session, die Zustand und Ablage verbinden: Zustand setzen, Haltepunkt zeigen und im Zustand festhalten,
// ein `final` verarbeiten (Prüfung gegen git, offene Punkte, nächster Schritt), Schlussbericht zeigen, eigene Commits festhalten.
// Die Berichtsdatei einer Etappe schreibt session-chain-report.js in der Etappen-Session.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { SessionChainError, checkedEtappe, slugOfArtifact, readState, writeState, chainDir } = require('./session-chain-store');
const { toplevel } = require('./session-chain-git');
const { readParts, openPoints, mergePoints } = require('./session-chain-points');
const { recommendation, nextStep } = require('./session-chain-decide');
const { checkFinal } = require('./session-chain-check');
const { specHalt, goHalt, showstopperText, deviationText, finalReport } = require('./session-chain-text');
const { readData } = require('./session-chain-report');
const { artifactHashes } = require('./session-chain-gate');

const VALUE_KEYS = ['spec', 'plan', 'worktree', 'branch'];
const PLAN_RESULTS = ['planning', 'plan-review'];
// Etappen, die die Spec ändern dürfen; ihr Stand bei Start liegt als Kopie neben dem Zustand (`gestartet.specKopie`).
const SPEC_COPY_ETAPPEN = ['grill', 'spec-nacharbeit'];

function emptyState(slug) {
  return { slug, etappen: [], offen: [], entscheidungen: [], dateien: [], commits: [] };
}

function absolute(value) {
  return value ? toPosix(path.resolve(value)) : undefined;
}

function stateOf(cwd, slug) {
  const state = readState(cwd, slug);
  if (!state) throw new SessionChainError(`Kein Zustand für ${slug}`);
  return state;
}

// Legt den Zustand an oder ergänzt ihn um die übergebenen Werte (Basis-Branch, Workitem, Pfade). `set` ist ein neuer Einstieg
// des Menschen: offener Haltepunkt, Freigabe, erwartete und laufende Etappe gelten danach nicht mehr.
function setState(input, cwd) {
  const state = { ...(readState(cwd, input.slug) ?? emptyState(input.slug)), halt: null, freigabe: null, naechste: null, gestartet: null };
  for (const key of ['basis', 'wi', 'branch']) if (input[key]) state[key] = input[key];
  for (const key of ['spec', 'plan', 'worktree']) if (input[key]) state[key] = absolute(input[key]);
  return writeState(cwd, input.slug, state);
}

// Letztes `final` einer der Etappen `etappen` im Zustand oder null.
function lastEntry(state, etappen) {
  return [...(state.etappen ?? [])].reverse().find((entry) => etappen.includes(entry.etappe)) ?? null;
}

// Block des Haltepunkts `art` (spec | go) aus dem Zustand; `abbruch` nennt, warum die Followup-Runden der Etappe trotz 🔴 endeten.
function haltText(state, art) {
  if (art === 'spec') {
    const last = lastEntry(state, ['spec-review']);
    const result = last?.ergebnis ?? null;
    return specHalt({ result, abbruch: last?.abbruch ?? null, recommendation: recommendation('spec', result), points: state.offen });
  }
  const last = lastEntry(state, PLAN_RESULTS);
  const result = last?.ergebnis ?? null;
  return goHalt({ spec: state.spec, plan: state.plan, wi: state.wi, basis: state.basis, result, abbruch: last?.abbruch ?? null, recommendation: recommendation('go', result), points: state.offen });
}

// Kopiert die Spec beim Start von Grill und Spec-Nacharbeit nach `<Kettenordner>/spec-vor-<etappe>.md` und vermerkt den Pfad in `gestartet`;
// `check` vergleicht damit am Ende. Ohne Spec im Zustand oder bei anderen Etappen bleibt der Zustand unverändert. Ein Neustart (`--erneut`) kopiert neu.
function copySpecAtStart(state, etappe, cwd) {
  if (!SPEC_COPY_ETAPPEN.includes(etappe) || !state.spec || !fs.existsSync(state.spec) || !state.gestartet) return state;
  const target = path.join(chainDir(cwd, state.slug), `spec-vor-${etappe}.md`);
  fs.copyFileSync(state.spec, target);
  return { ...state, gestartet: { ...state.gestartet, specKopie: toPosix(target) } };
}

// Zeigt den Haltepunkt `art` und hält ihn im Zustand fest, damit ein Stopp das passende Codewort nennt; auch beim
// Einstieg `implementation`, der ohne `final` am GO-Haltepunkt beginnt.
function holdAt(slug, art, cwd) {
  const state = { ...stateOf(cwd, slug), halt: art };
  writeState(cwd, slug, state);
  return haltText(state, art);
}

// Ein Plan mit anderem Slug als die Kette landet mit seinen Berichten in einer fremden Ablage: Das hält die Kette.
function slugDeviations(data) {
  if (!data.plan) return [];
  const planSlug = slugOfArtifact({ plan: data.plan });
  return planSlug === data.slug ? [] : [`Plan ${data.plan} hat den Slug ${planSlug}, die Kette den Slug ${data.slug}; Spec und Plan gehören als spec.md und plan.md in denselben Ordner`];
}

// Schlüssel eines `final`: Session, Etappe, Commit und Hash der Bericht-Daten. Jedes Turn-Ende nach dem `final` trägt die
// Statuszeile erneut; derselbe Schlüssel zählt nur einmal. Ein neuer Commit oder neue Bericht-Daten derselben Session
// (etwa nach einem geklärten Showstopper) ergeben einen neuen Schlüssel.
function finalKey(input, etappe, hash) {
  return [input.session, etappe, input.commit, hash].join('|');
}

function blockFor(next, state, context) {
  if (next.halt === 'abweichung') return deviationText({ ...context, danach: next.danach });
  if (next.halt === 'showstopper') return showstopperText({ gruende: next.gruende, session: context.session });
  if (next.halt) return haltText(state, next.halt);
  if (next.ende) return finalReport(state);
  return '';
}

// Übernimmt die Werte des `final` in den Zustand: Pfade und Branch aus den Bericht-Daten, Basis-Branch und Workitem nur, wenn
// der Zustand sie noch nicht kennt. Läuft vor der Prüfung, weil `checkFinal` die übernommenen Werte braucht.
function adoptValues(state, input, data) {
  for (const key of VALUE_KEYS) if (data[key]) state[key] = data[key];
  if (input.basis && !state.basis) state.basis = input.basis;
  if (input.wi && !state.wi) state.wi = input.wi;
}

// Review-Etappen ohne Ergebnis-Zeile halten die Kette: Ohne sie empfähle der Haltepunkt GO (`recommendation('go', null)`), und die Leit-Session
// wüsste nicht, ob ein 🔴 offen ist.
const RESULT_REQUIRED = { 'spec-review': 'Spec-Review', planning: 'Planning', 'plan-review': 'Plan-Review' };

function resultDeviations(etappe, data) {
  return RESULT_REQUIRED[etappe] && !data.ergebnis ? [`${RESULT_REQUIRED[etappe]} meldet keine Ergebnis-Zeile (**Ergebnis:** fehlt im Bericht)`] : [];
}

function checkedFinal(etappe, state, input, data, cwd) {
  const checked = checkFinal(etappe, toplevel(cwd), {
    commit: input.commit, spec: state.spec, plan: state.plan, dateien: data.dateien ?? [], branch: state.branch, basis: state.basis, worktree: state.worktree,
    specKopie: state.gestartet?.etappe === etappe ? state.gestartet.specKopie : undefined, entscheidungen: data.entscheidungen ?? [], bericht: input.bericht,
  });
  return { ...checked, abweichungen: [...checked.abweichungen, ...resultDeviations(etappe, data), ...slugDeviations(data)] };
}

// Nächster Schritt nach dem `final`: Eine Abweichung hält die Kette; `danach` nennt, was ohne Abweichung folgte, damit der Block es für
// die Antwort `weiter` ausweist. Ein Showstopper der Umsetzung bleibt so auch hinter einer Abweichung sichtbar.
function nextAfterFinal(etappe, data, check) {
  const normal = nextStep(etappe, { result: data.ergebnis, pruefung: data.pruefung, luecken: data.luecken ?? [], acOhneTest: data.acOhneTest ?? [] });
  if (check.abweichungen.length > 0) return { halt: 'abweichung', danach: normal };
  return normal;
}

// Schreibt das `final` im Zustand fort: offene Punkte, Etappe mit Ergebnis, Entscheidungen, Dateien, aktuelle Etappe und Halt.
// Spec- und Plan-Hash halten den Stand fest, auf den sich ein späterer Haltepunkt bezieht (session-chain-gate.js).
function applyFinal(state, { etappe, input, data, check, schluessel, next, now = new Date() }) {
  state.offen = mergePoints(state.offen, etappe, openPoints(readParts(path.dirname(path.resolve(input.bericht))), etappe));
  state.etappen = [...(state.etappen ?? []), {
    etappe, session: input.session, ergebnis: data.ergebnis, abbruch: data.abbruch ?? null, tests: data.tests, commit: input.commit, geprueft: check.geprueft, bericht: toPosix(path.resolve(input.bericht)), schluessel,
    hashes: artifactHashes(state), gestartet: state.gestartet?.etappe === etappe ? state.gestartet.zeit : null, zeit: now.toISOString(),
  }];
  state.entscheidungen = [...(state.entscheidungen ?? []), ...(data.entscheidungen ?? []).map((text) => ({ etappe, text }))];
  state.dateien = [...(state.dateien ?? []), ...(data.dateien ?? []).map((pfad) => ({ etappe, pfad }))];
  state.etappe = etappe;
  state.halt = next.halt ?? null;
  state.naechste = next.start ?? next.danach?.start ?? null;
  state.gestartet = null;
  state.freigabe = null;
  return state;
}

// `dauerMs` und `offen` (Zähler je Farbe) sind Messwerte für die Ereignisliste der Kette.
function finalResult(data, next, check, text, state) {
  const entry = state.etappen.at(-1);
  const dauerMs = entry.gestartet ? Date.parse(entry.zeit) - Date.parse(entry.gestartet) : null;
  const offen = { red: 0, yellow: 0, green: 0 };
  for (const point of state.offen ?? []) if (Object.hasOwn(offen, point.farbe)) offen[point.farbe] += 1;
  return {
    slug: data.slug, ergebnis: check.abweichungen.length > 0 ? 'abweichung' : 'ok', weiter: next.start ?? (next.halt ? 'halt' : 'ende'),
    haltepunkt: next.halt ?? 'keiner', geprueft: check.geprueft, text, dauerMs, offen, abweichungen: check.abweichungen.length,
  };
}

// Verarbeitet das `final` einer Etappe. `input`: etappe, session, bericht, commit, basis, wi; `cwd`: Haupt-Checkout.
// Ein schon verarbeitetes `final` (gleicher Schlüssel) ändert nichts und liefert `weiter: 'doppelt'`.
function processFinal(input, cwd) {
  const etappe = checkedEtappe(input.etappe);
  const { data, hash } = readData(input.bericht);
  if (data.etappe !== etappe) throw new SessionChainError(`Berichtsdatei gehört zur Etappe ${data.etappe}, nicht zu ${etappe}`);
  const state = readState(cwd, data.slug) ?? emptyState(data.slug);
  const schluessel = finalKey(input, etappe, hash);
  if ((state.etappen ?? []).some((entry) => entry.schluessel === schluessel)) {
    return { slug: data.slug, ergebnis: 'ok', weiter: 'doppelt', haltepunkt: 'keiner', geprueft: [], text: '' };
  }
  adoptValues(state, input, data);
  const check = checkedFinal(etappe, state, input, data, cwd);
  const next = nextAfterFinal(etappe, data, check);
  applyFinal(state, { etappe, input, data, check, schluessel, next });
  writeState(cwd, data.slug, state);
  return finalResult(data, next, check, blockFor(next, state, { etappe, abweichungen: check.abweichungen, session: input.session }), state);
}

// Schlussbericht; `stopp` hält den Zustand als gestoppt fest und nennt das Codewort für den späteren Einstieg.
function closing(slug, stopp, cwd) {
  const state = stateOf(cwd, slug);
  if (stopp) writeState(cwd, slug, { ...state, gestoppt: true });
  return finalReport(state, { stopp });
}

// Hält einen Commit der Leit-Session im Zustand fest (Abschnitt „Geprüft“ des Schlussberichts).
function recordCommit(slug, commit, anlass, cwd) {
  const state = stateOf(cwd, slug);
  return writeState(cwd, slug, { ...state, commits: [...(state.commits ?? []), { etappe: 'leit-session', anlass, ...commit }] });
}

module.exports = { setState, copySpecAtStart, haltText, holdAt, processFinal, closing, recordCommit };
