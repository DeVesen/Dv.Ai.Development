#!/usr/bin/env sh
# GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/spec-review.yaml, Regeln R-050
#
# Gate der Etappe spec-review (UserPromptSubmit): Startet der Mensch /angular:spec-review, prüft das Skript,
# ob die Pflichtartefakte vorliegen. Fehlt eines, blockiert es den Aufruf mit Exit-Code 2.
# Ein Fehler im Hook selbst blockiert nie (Exit 0), wie in dv-forge und dv-angular.

input=$(cat)

field() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r --arg k "$1" '.[$k] // ""'
  elif command -v python3 >/dev/null 2>&1; then
    printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get(sys.argv[1]) or "")' "$1"
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s)[process.argv[1]];console.log(v==null?"":v)})' "$1"
  else
    echo "angular gate-spec-review: weder jq noch python3 noch node gefunden, Gate übersprungen" >&2
    exit 0
  fi
}

prompt=$(field prompt | sed -n '1{s/^[[:space:]]*//;p;}') || exit 0
command='/angular:spec-review'
case "$prompt" in
  "$command"|"$command "*) ;;
  *) exit 0 ;;
esac

cwd=$(field cwd) || exit 0
[ -n "$cwd" ] || cwd=$(pwd)
args=${prompt#"$command"}
set -f
# shellcheck disable=SC2086
set -- $args
set +f

if [ $# -eq 0 ]; then
  echo "angular gate-spec-review (R-050): Pfad zu spec.md fehlt. Aufruf: $command <spec.md>" >&2
  exit 2
fi

case "$1" in
  /*) first=$1 ;;
  *) first="$cwd/$1" ;;
esac
dir=$(dirname "$first")
missing=""
[ -f "$first" ] || missing="$missing
  - spec.md nicht gefunden: $first"

if [ -n "$missing" ]; then
  {
    echo "angular gate-spec-review: Pflichtartefakte fehlen.$missing"
    echo "R-050 Pflichtartefakte vor dem Start: Jede Etappe arbeitet auf dem Artefakt ihrer Vorgänger; Grill und Plan-Writing enden in dv-forge bei fehlender Spec mit „Spec nicht gefunden“."
  } >&2
  exit 2
fi
exit 0
