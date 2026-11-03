#!/usr/bin/env bash
# Abnahme des Projekts plugin-compiler mit der Plugin-Druckerei (plugins/plugin-druckerei):
# Try-Deploy (Druck in Temp-Ordner, alle Prüfungen, claude plugin validate, Tests) und Vergleich mit dem eingecheckten dist/.
set -euo pipefail
cd "$(dirname "$0")/.."   # plugin-compiler/
DRUCKEREI="../plugins/plugin-druckerei/bin/druckerei"

echo "== 1/2 Try-Deploy"
out=$("$DRUCKEREI" pruefen --projekt . 2>&1) || { printf '%s\n' "$out" | grep -v '^      >'; echo "smoke: Try-Deploy rot" >&2; exit 1; }
printf '%s\n' "$out" | grep -v '^      >' | grep -v '^  [a-z].*:[0-9]*: ' || true
printf '%s\n' "$out" | grep -q '^Gegenüber dist/: 0 Dateien geändert, 0 neu, 0 entfernt\.$' \
  || { echo "smoke: dist/ entspricht nicht dem aktuellen Druck; mit druckerei deploy neu drucken" >&2; exit 1; }

echo "== 2/2 dist/ vollständig in git"
ignored=$(git ls-files --others --ignored --exclude-standard -- dist/)
untracked=$(git ls-files --others --exclude-standard -- dist/)
if [ -n "$ignored$untracked" ]; then
  echo "Dateien in dist/ sind nicht eingecheckt:" >&2
  printf '%s\n%s\n' "$ignored" "$untracked" | head -5 >&2
  exit 1
fi
git diff --exit-code --stat -- dist/
echo "smoke: ok"
