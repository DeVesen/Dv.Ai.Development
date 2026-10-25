'use strict';

// Prüfung eines `final` gegen git, bevor die nächste Etappe startet. Liefert, was geprüft wurde (`geprueft`), und jede
// Abweichung (`abweichungen`); eine Abweichung hält die Kette. Pfade in Meldungen sind relativ zur Checkout-Wurzel.

const fs = require('node:fs');
const { toPosix } = require('./posix');
const { git, isDirty, sameDir, worktreeListed, relative } = require('./session-chain-git');
const { SessionChainError } = require('./session-chain-store');
const { lintSpec } = require('./spec-lint');

// Dateien, die ein Commit der Etappe enthalten darf; null = beliebig (Code der Umsetzung).
const EXPECTED = {
  whiteboarding: (values) => [values.spec, ...values.dateien],
  grill: (values) => [values.spec, ...values.dateien],
  'spec-review': (values) => [values.spec],
  'spec-nacharbeit': (values) => [values.spec],
  planning: (values) => [values.spec, values.plan],
  'plan-review': (values) => [values.spec, values.plan],
  'plan-nacharbeit': (values) => [values.spec, values.plan],
  umsetzung: () => null,
  abschluss: () => null,
};
// Artefakte, die nach der Etappe committet sein müssen.
const MUST_BE_COMMITTED = { 'spec-review': ['spec'], 'spec-nacharbeit': ['spec'] };
// Werte, die die Etappe melden muss, mit der Meldung bei Fehlen; ohne sie stünde im nächsten Haltepunkt `undefined`.
const REQUIRED = { planning: [['plan', 'Planning meldet keinen Plan (--plan fehlt)']] };

function emptyResult() {
  return { geprueft: [], abweichungen: [] };
}

// Hängt `textOk` an `geprueft`, wenn `ok`, sonst `textFail` an `abweichungen`.
function record(result, ok, textOk, textFail) {
  (ok ? result.geprueft : result.abweichungen).push(ok ? textOk : textFail);
}

// Der gemeldete Commit muss auf dem Stand liegen, den die Kette fortsetzt: in der Umsetzung auf ihrem Branch, sonst auf HEAD
// des Haupt-Checkouts. Ein alter Commit oder einer von einem anderen Branch belegt die Etappe nicht.
function commitRef(etappe, values) {
  return ['umsetzung', 'abschluss'].includes(etappe) && values.branch ? `refs/heads/${values.branch}` : 'HEAD';
}

function commitChecks(repo, values, expected, ref = 'HEAD') {
  if (!values.commit || values.commit === 'none') return emptyResult();
  if (!git(repo, ['cat-file', '-e', `${values.commit}^{commit}`]).ok) return { ...emptyResult(), abweichungen: [`Commit ${values.commit} existiert nicht`] };
  if (!git(repo, ['merge-base', '--is-ancestor', values.commit, ref]).ok) {
    return { ...emptyResult(), abweichungen: [`Commit ${values.commit} liegt nicht auf ${ref.replace(/^refs\/heads\//, '')}`] };
  }
  const files = git(repo, ['show', '--name-only', '--format=', values.commit]).out.split('\n').filter(Boolean);
  const allowed = expected === null ? null : new Set(expected.filter(Boolean).map((file) => relative(repo, file)));
  const foreign = allowed === null ? [] : files.filter((file) => !allowed.has(file));
  return {
    geprueft: [`Commit ${values.commit}: ${files.join(', ') || 'ohne Dateien'}`],
    abweichungen: foreign.map((file) => `Commit ${values.commit} enthält ${file} außerhalb der erwarteten Dateien`),
  };
}

function committedChecks(repo, etappe, values) {
  const result = emptyResult();
  for (const key of MUST_BE_COMMITTED[etappe] ?? []) {
    const file = relative(repo, values[key]);
    try {
      record(result, !isDirty(repo, file), `${file} ist committet`, `${file} ist uncommittet`);
    } catch (error) {
      if (!(error instanceof SessionChainError)) throw error;
      result.abweichungen.push(`${file} konnte nicht geprüft werden: ${error.message}`);
    }
  }
  return result;
}

// Umsetzung: Branch, Commits seit dem Basis-Branch, Worktree.
function implementationChecks(repo, values) {
  const result = emptyResult();
  if (!git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${values.branch}`]).ok) {
    result.abweichungen.push(`Branch ${values.branch ?? '-'} existiert nicht`);
    return result;
  }
  const count = Number(git(repo, ['rev-list', '--count', `${values.basis}..${values.branch}`]).out || 0);
  if (count > 0) result.geprueft.push(`Branch ${values.branch}: ${count} Commits seit ${values.basis}`);
  else result.abweichungen.push(`Branch ${values.branch} hat keine Commits seit ${values.basis}`);
  if (values.worktree && !sameDir(values.worktree, repo)) {
    record(result, worktreeListed(repo, values.worktree), `Worktree ${toPosix(values.worktree)} besteht`, `Worktree ${toPosix(values.worktree)} fehlt`);
  }
  return result;
}

// Abschluss: Upstream, kein Vorsprung davor, Worktree entfernt.
function finishChecks(repo, values) {
  const result = emptyResult();
  const upstream = git(repo, ['rev-parse', '--abbrev-ref', `${values.branch}@{upstream}`]);
  if (!upstream.ok) result.abweichungen.push(`Branch ${values.branch} hat keinen Upstream`);
  else {
    const ahead = Number(git(repo, ['rev-list', '--count', `${upstream.out}..${values.branch}`]).out || 0);
    result.geprueft.push(`Branch ${values.branch} hat Upstream ${upstream.out}`);
    record(result, ahead === 0, `Branch ${values.branch} hat keinen Vorsprung vor ${upstream.out}`, `Branch ${values.branch} hat ${ahead} Commits Vorsprung vor ${upstream.out}`);
  }
  if (values.worktree && !sameDir(values.worktree, repo)) {
    const gone = !worktreeListed(repo, values.worktree) && !fs.existsSync(values.worktree);
    record(result, gone, `Worktree ${toPosix(values.worktree)} ist entfernt`, `Worktree ${toPosix(values.worktree)} besteht noch`);
  }
  return result;
}

// Pflichtwerte der Etappe, die in `values` fehlen.
function requiredChecks(etappe, values) {
  return { ...emptyResult(), abweichungen: (REQUIRED[etappe] ?? []).filter(([key]) => !values[key]).map(([, text]) => text) };
}

// Etappen, die die Spec schreiben: Formfehler halten die Kette, Warnungen nennt nur `geprueft`.
function specFormatChecks(repo, values) {
  const result = emptyResult();
  if (!values.spec || !fs.existsSync(values.spec)) return result;
  const { issues, metrics } = lintSpec(fs.readFileSync(values.spec, 'utf8'));
  const file = relative(repo, values.spec);
  result.geprueft.push(`Spec-Format ${file}: ${metrics.fehler} Fehler, ${metrics.warnungen} Warnungen`);
  result.abweichungen.push(...issues.filter((entry) => entry.severity === 'fehler')
    .map((entry) => `Spec-Format ${file}: ${entry.rule} · ${entry.location}: ${entry.message}`));
  return result;
}

const EXTRA = {
  whiteboarding: specFormatChecks, grill: specFormatChecks, 'spec-nacharbeit': specFormatChecks,
  umsetzung: implementationChecks, abschluss: finishChecks,
};

// `values`: commit, spec, plan, dateien (Glossar/ADR), branch, basis, worktree; `repo`: Haupt-Checkout.
function checkFinal(etappe, repo, values) {
  const parts = [
    commitChecks(repo, values, EXPECTED[etappe]({ ...values, dateien: values.dateien ?? [] }), commitRef(etappe, values)),
    committedChecks(repo, etappe, values),
    requiredChecks(etappe, values),
    ...(EXTRA[etappe] ? [EXTRA[etappe](repo, values)] : []),
  ];
  return { geprueft: parts.flatMap((part) => part.geprueft), abweichungen: parts.flatMap((part) => part.abweichungen) };
}

module.exports = { checkFinal, EXPECTED };
