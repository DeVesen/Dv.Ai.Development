#!/usr/bin/env bash
# Smoke-Test des Plugin-Compilers: bauen, prüfen, dass dist/ dem eingecheckten Stand entspricht, validieren.
set -euo pipefail
cd "$(dirname "$0")/.."   # plugin-compiler/

echo "== 1/3 build"
python3 tools/build.py

echo "== 2/3 dist/ unverändert gegenüber git"
git diff --exit-code -- dist/
untracked=$(git ls-files --others --exclude-standard -- dist/)
if [ -n "$untracked" ]; then
  echo "Neue, nicht eingecheckte Dateien in dist/:" >&2
  echo "$untracked" >&2
  exit 1
fi
echo "dist/ entspricht dem eingecheckten Stand."

echo "== 3/3 claude plugin validate --strict"
if command -v claude >/dev/null 2>&1; then
  claude plugin validate --strict dist
  for plugin in dist/*/; do
    claude plugin validate --strict "$plugin"
  done
else
  echo "HINWEIS: claude CLI nicht verfügbar, Validierung übersprungen." >&2
fi
echo "smoke: ok"
