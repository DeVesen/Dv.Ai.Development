#!/usr/bin/env bash
# Azure DevOps login for the current project. Run by the user, never by an agent.
# Uses <main checkout>/.claude/azure as AZURE_CONFIG_DIR for this process only,
# logs in to the tenant from .claude/ado.json and checks the identity afterwards.

set -euo pipefail
SETUP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ado-setup.js"

if ! CONFIG_JSON="$(node "$SETUP" show)"; then
  echo "Keine gueltige .claude/ado.json gefunden. Zuerst die Einrichtung ueber den Skill ado-cli ausfuehren." >&2
  exit 1
fi

field() {
  printf '%s' "$CONFIG_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(String(JSON.parse(d)[process.argv[1]])))' "$1"
}

CONFIG_DIR="$(field configDir)"
TENANT="$(field tenantId)"
USER_NAME="$(field user)"

export AZURE_CONFIG_DIR="$CONFIG_DIR"
mkdir -p "$CONFIG_DIR"
echo "Projekt-Config-Ordner: $CONFIG_DIR"
echo "Anmeldung an Tenant $TENANT als $USER_NAME"

az login --tenant "$TENANT" --allow-no-subscriptions > /dev/null
node "$SETUP" check-identity
