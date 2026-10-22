'use strict';

// Prüfung eines `final` gegen git, bevor die nächste Etappe startet. Liefert, was geprüft wurde (`geprueft`), und jede
// Abweichung (`abweichungen`); eine Abweichung hält die Kette. Pfade in Meldungen sind relativ zur Checkout-Wurzel.

const fs = require('node:fs');
const { toPosix } = require('./posix');
const { git, isDirty, sameDir, worktreeListed, relative } = require('./session-chain-git');
const { SessionChainError } = require('./session-chain-store');

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

function commitChecks(repo, values, expected) {
  if (!values.commit || values.commit === 'none') return { geprueft: [], abweichungen: [] };
  if (!git(repo, ['cat-file', '-e', `${values.commit}^{commit}`]).ok) return { geprueft: [], abweichungen: [`Commit ${values.commit} existiert nicht`] };
  const files = git(repo, ['show', '--name-only', '--format=', values.commit]).out.split('\n').filter(Boolean);
  const allowed = expected === null ? null : new Set(expected.filter(Boolean).map((file) => relative(repo, file)));
  const foreign = allowed === null ? [] : files.filter((file) => !allowed.has(file));
  return {
    geprueft: [`Commit ${values.commit}: ${files.join(', ') || 'ohne Dateien'}`],
    abweichungen: foreign.map((file) => `Commit ${values.commit} enthält ${file} außerhalb der erwarteten Dateien`),
  };
}

function committedChecks(repo, etappe, values) {
  const result = { geprueft: [], abweichungen: [] };
  for (const key of MUST_BE_COMMITTED[etappe] ?? []) {
    const file = relative(repo, values[key]);
    try {
      const dirty = isDirty(repo, file);
      (dirty ? result.abweichungen : result.geprueft).push(dirty ? `${file} ist uncommittet` : `${file} ist committet`);
    } catch (error) {
      if (!(error instanceof SessionChainError)) throw error;
      result.abweichungen.push(`${file} konnte nicht geprüft werden: ${error.message}`);
    }
  }
  return result;
}

// Umsetzung: Branch, Commits seit dem Basis-Branch, Worktree.
function implementationChecks(repo, values) {
  const result = { geprueft: [], abweichungen: [] };
  if (!git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${values.branch}`]).ok) {
    result.abweichungen.push(`Branch ${values.branch ?? '-'} existiert nicht`);
    return result;
  }
  const count = Number(git(repo, ['rev-list', '--count', `${values.basis}..${values.branch}`]).out || 0);
  if (count > 0) result.geprueft.push(`Branch ${values.branch}: ${count} Commits seit ${values.basis}`);
  else result.abweichungen.push(`Branch ${values.branch} hat keine Commits seit ${values.basis}`);
  if (values.worktree && !sameDir(values.worktree, repo)) {
    const listed = worktreeListed(repo, values.worktree);
    (listed ? result.geprueft : result.abweichungen).push(listed ? `Worktree ${toPosix(values.worktree)} besteht` : `Worktree ${toPosix(values.worktree)} fehlt`);
  }
  return result;
}

// Abschluss: Upstream, kein Vorsprung davor, Worktree entfernt.
function finishChecks(repo, values) {
  const result = { geprueft: [], abweichungen: [] };
  const upstream = git(repo, ['rev-parse', '--abbrev-ref', `${values.branch}@{upstream}`]);
  if (!upstream.ok) result.abweichungen.push(`Branch ${values.branch} hat keinen Upstream`);
  else {
    const ahead = Number(git(repo, ['rev-list', '--count', `${upstream.out}..${values.branch}`]).out || 0);
    result.geprueft.push(`Branch ${values.branch} hat Upstream ${upstream.out}`);
    (ahead === 0 ? result.geprueft : result.abweichungen).push(ahead === 0 ? `Branch ${values.branch} hat keinen Vorsprung vor ${upstream.out}` : `Branch ${values.branch} hat ${ahead} Commits Vorsprung vor ${upstream.out}`);
  }
  if (values.worktree && !sameDir(values.worktree, repo)) {
    const gone = !worktreeListed(repo, values.worktree) && !fs.existsSync(values.worktree);
    (gone ? result.geprueft : result.abweichungen).push(gone ? `Worktree ${toPosix(values.worktree)} ist entfernt` : `Worktree ${toPosix(values.worktree)} besteht noch`);
  }
  return result;
}

const EXTRA = { umsetzung: implementationChecks, abschluss: finishChecks };

// `values`: commit, spec, plan, dateien (Glossar/ADR), branch, basis, worktree; `repo`: Haupt-Checkout.
function checkFinal(etappe, repo, values) {
  const parts = [
    commitChecks(repo, values, EXPECTED[etappe]({ ...values, dateien: values.dateien ?? [] })),
    committedChecks(repo, etappe, values),
    ...(EXTRA[etappe] ? [EXTRA[etappe](repo, values)] : []),
  ];
  return { geprueft: parts.flatMap((part) => part.geprueft), abweichungen: parts.flatMap((part) => part.abweichungen) };
}

module.exports = { checkFinal };
