#!/usr/bin/env bash
# Smoke-Test des Plugin-Compilers: bauen, dist/ gegen git prüfen, validieren, forge-Testsuite gegen dist/forge.
set -euo pipefail
cd "$(dirname "$0")/.."   # plugin-compiler/

echo "== 1/4 build (enthält die Äquivalenzprüfung dist/forge ↔ plugins/forge)"
python3 tools/build.py | grep -v '^WARNUNG'

echo "== 2/4 dist/ unverändert gegenüber git"
git diff --exit-code --stat -- dist/
ignored=$(git ls-files --others --ignored --exclude-standard -- dist/)
if [ -n "$ignored" ]; then
  echo "Dateien in dist/ werden von git ignoriert; die Prüfung wäre wirkungslos:" >&2
  echo "$ignored" | head -5 >&2
  exit 1
fi
untracked=$(git ls-files --others --exclude-standard -- dist/)
if [ -n "$untracked" ]; then
  echo "Neue, nicht eingecheckte Dateien in dist/:" >&2
  echo "$untracked" >&2
  exit 1
fi
echo "dist/ entspricht dem eingecheckten Stand."

echo "== 3/4 claude plugin validate --strict"
if command -v claude >/dev/null 2>&1; then
  claude plugin validate --strict dist | grep -E '^(√|×) '
  for plugin in dist/*/; do
    claude plugin validate --strict "$plugin" | grep -E '^(√|×) '
  done
else
  echo "HINWEIS: claude CLI nicht verfügbar, Validierung übersprungen." >&2
fi

echo "== 4/4 forge-Testsuite gegen dist/forge (dauert etwa eine Minute)"
if command -v node >/dev/null 2>&1; then
  status=0
  out=$(cd dist/forge && node --test 'tests/*.test.js' 2>&1) || status=$?
  printf '%s\n' "$out" | grep -E '^# (tests|pass|fail|skipped)'
  [ "$status" -eq 0 ] || { echo "forge-Tests rot" >&2; exit 1; }
else
  echo "HINWEIS: node nicht verfügbar, forge-Tests übersprungen." >&2
fi
echo "smoke: ok"
