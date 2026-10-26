'use strict';

// Commits der Leit-Session, auf Pfade beschränkt: nach dem `final` des Whiteboardings die Spec und die vom Whiteboarding gemeldeten
// Glossar- und ADR-Dateien, am Spec-Haltepunkt die von Whiteboarding und Grill gemeldeten Glossar- und ADR-Dateien, nach dem GO das
// noch Uncommittete von Spec und Plan. Die Leit-Session committet nur Markdown-Dateien; eine andere gemeldete Datei bleibt liegen
// und wird genannt. Vor dem GO-Commit muss der Basis-Branch ausgecheckt sein.

const { SessionChainError } = require('./session-chain-store');
const { gitOrThrow: git, toplevel, isDirty, relative } = require('./session-chain-git');

const MARKDOWN = /\.md$/i;
const GLOSSARY_ETAPPEN = ['whiteboarding', 'grill'];

// Commit genau dieser Dateien; nur solche mit Änderungen. Rückgabe: { hash, dateien } oder null ohne Änderung.
function commitPaths(repo, files, message) {
  const dirty = files.filter((file) => isDirty(repo, file));
  if (dirty.length === 0) return null;
  git(repo, ['add', '--', ...dirty]);
  git(repo, ['commit', '--quiet', '-m', message, '--', ...dirty]);
  return { hash: git(repo, ['rev-parse', '--short', 'HEAD']), dateien: dirty.map((file) => relative(repo, file)) };
}

// Gemeldete Dateien der Etappen `etappen` (Zustand `dateien`), getrennt in Markdown und Rest.
function reportedFiles(state, etappen) {
  const reported = [...new Set((state.dateien ?? []).filter((entry) => etappen.includes(entry.etappe)).map((entry) => entry.pfad))];
  return { md: reported.filter((file) => MARKDOWN.test(file)), andere: reported.filter((file) => !MARKDOWN.test(file)) };
}

// `anlass`: whiteboarding | spec | go; `dir`: Ordner im Haupt-Checkout. Rückgabe: { commit, nichtCommittet }.
function commitFor(anlass, dir, state, message) {
  const repo = toplevel(dir);
  if (anlass === 'whiteboarding') {
    const { md, andere } = reportedFiles(state, ['whiteboarding']);
    return { commit: commitPaths(repo, [state.spec, ...md].filter(Boolean), message), nichtCommittet: andere };
  }
  if (anlass === 'spec') {
    const { md, andere } = reportedFiles(state, GLOSSARY_ETAPPEN);
    return { commit: commitPaths(repo, md, message), nichtCommittet: andere };
  }
  if (anlass !== 'go') throw new SessionChainError(`Anlass unbekannt: ${anlass} (erlaubt: whiteboarding, spec, go)`);
  const branch = git(repo, ['branch', '--show-current']);
  if (branch !== state.basis) throw new SessionChainError(`Aktueller Branch ${branch || '(keiner)'} ist nicht der Basis-Branch ${state.basis}; die Umsetzung startet nicht.`);
  return { commit: commitPaths(repo, [state.spec, state.plan].filter(Boolean), message), nichtCommittet: [] };
}

// Nach dem `final` des Whiteboardings startet der Grill erst, wenn die Leit-Session die Spec committet hat.
function checkWhiteboardingCommitted(state, dir) {
  if (state.etappen?.at(-1)?.etappe !== 'whiteboarding' || !state.spec) return;
  if (isDirty(toplevel(dir), state.spec)) throw new SessionChainError('Spec aus dem Whiteboarding ist uncommittet: erst `commit --anlass whiteboarding`');
}

module.exports = { commitFor, checkWhiteboardingCommitted };
