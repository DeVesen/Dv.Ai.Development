#!/usr/bin/env bash
# install-skill.sh — Linux/macOS equivalent of install-skill.ps1
#
# Installs skill packages into .cursor and optionally .claude directories.
# Rules (.mdc) are Cursor-only and never deployed to .claude.
#
# NOTE: Interactive MCP configuration (Docker/simple) is not supported here.
#       Use install-skill.ps1 on Windows for interactive MCP setup.
#       After install, configure .cursor/mcp.json manually if needed.
#
#       Placeholder parameters ({frontend-path} etc.) are not substituted.
#       After install, replace placeholders in agents/, rules/, and skills/ manually.
#       install-skill.ps1 also does NOT substitute placeholders — only update-skill.ps1 does.

set -euo pipefail

# Pre-flight: python3 is required for JSON parsing
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 is required but not found." >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGES_DIR="$SCRIPT_DIR/packages"

DRY_RUN=false
TARGET_CURSOR=""
TARGET_CLAUDE=""
PACKAGE_NAME=""
INSTALLED_PACKAGES=""

# ---------------------------------------------------------------------------
# JSON helpers (python3)
# ---------------------------------------------------------------------------

json_array() {
    local file="$1" key="$2"
    python3 - "$file" "$key" <<'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    for x in d.get(sys.argv[2], []):
        print(x)
except Exception as e:
    print(f"ERROR: failed to parse {sys.argv[1]}: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
}

json_string() {
    local file="$1" key="$2"
    python3 - "$file" "$key" <<'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get(sys.argv[2], ''))
except Exception as e:
    print(f"ERROR: failed to parse {sys.argv[1]}: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
}

json_has_mcp() {
    local file="$1"
    python3 - "$file" <<'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print('yes' if d.get('mcp') else '')
except Exception as e:
    print(f"ERROR: failed to parse {sys.argv[1]}: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
}

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

copy_asset() {
    local src="$1" dst="$2"
    if [[ "$DRY_RUN" == true ]]; then
        echo "  [DRY] $dst"
        return
    fi
    mkdir -p "$(dirname "$dst")"
    if [[ -d "$src" ]]; then
        rm -rf "$dst"
        cp -rL "$src" "$dst"
    else
        cp -f "$src" "$dst"
    fi
    echo "  + $dst"
}

is_installed() { [[ " $INSTALLED_PACKAGES " == *" $1 "* ]]; }

# ---------------------------------------------------------------------------
# Install one package (recursively resolves dependsOn)
# ---------------------------------------------------------------------------

install_package() {
    local name="$1"
    is_installed "$name" && return
    INSTALLED_PACKAGES="$INSTALLED_PACKAGES $name"

    local manifest="$PACKAGES_DIR/$name.json"
    if [[ ! -f "$manifest" ]]; then
        local available; available=$(for f in "$PACKAGES_DIR"/*.json; do basename "$f" .json; done | sort | tr '\n' ' ')
        echo "ERROR: Package '$name' not found. Available: $available" >&2
        exit 1
    fi

    echo
    echo "-> $name"
    local desc; desc=$(json_string "$manifest" description)
    [[ -n "$desc" ]] && echo "   $desc"

    # Capture json_array output via variable assignment so set -e catches parse errors.
    # Process substitution < <(...) does not propagate exit codes under set -e.
    local out

    # Dependencies first
    out=$(json_array "$manifest" dependsOn)
    while IFS= read -r dep; do
        [[ -n "$dep" ]] && install_package "$dep"
    done <<< "$out"

    # Rules → Cursor only (.mdc has no Claude Code equivalent)
    out=$(json_array "$manifest" rules)
    while IFS= read -r r; do
        [[ -z "$r" ]] && continue
        copy_asset "$SCRIPT_DIR/$r" "$TARGET_CURSOR/rules/$(basename "$r")"
    done <<< "$out"

    # Skills → Cursor + Claude Code
    out=$(json_array "$manifest" skills)
    while IFS= read -r s; do
        [[ -z "$s" ]] && continue
        local leaf; leaf=$(basename "$s")
        copy_asset "$SCRIPT_DIR/$s" "$TARGET_CURSOR/skills/$leaf"
        [[ -n "$TARGET_CLAUDE" ]] && copy_asset "$SCRIPT_DIR/$s" "$TARGET_CLAUDE/skills/$leaf"
    done <<< "$out"

    # Agents → Cursor + Claude Code
    out=$(json_array "$manifest" agents)
    while IFS= read -r a; do
        [[ -z "$a" ]] && continue
        local leaf; leaf=$(basename "$a")
        copy_asset "$SCRIPT_DIR/$a" "$TARGET_CURSOR/agents/$leaf"
        [[ -n "$TARGET_CLAUDE" ]] && copy_asset "$SCRIPT_DIR/$a" "$TARGET_CLAUDE/agents/$leaf"
    done <<< "$out"

    # References → Cursor + Claude Code
    out=$(json_array "$manifest" references)
    while IFS= read -r ref; do
        [[ -z "$ref" ]] && continue
        local leaf; leaf=$(basename "$ref")
        copy_asset "$SCRIPT_DIR/$ref" "$TARGET_CURSOR/references/$leaf"
        [[ -n "$TARGET_CLAUDE" ]] && copy_asset "$SCRIPT_DIR/$ref" "$TARGET_CLAUDE/references/$leaf"
    done <<< "$out"

    # Docs (AGENTS.md etc.) → Cursor only
    out=$(json_array "$manifest" docs)
    while IFS= read -r doc; do
        [[ -z "$doc" ]] && continue
        copy_asset "$SCRIPT_DIR/$doc" "$TARGET_CURSOR/$(basename "$doc")"
    done <<< "$out"

    # MCP config warning
    local has_mcp; has_mcp=$(json_has_mcp "$manifest")
    if [[ -n "$has_mcp" ]]; then
        echo "  [WARN] '$name' has MCP configuration — not configured automatically."
        echo "         Configure $TARGET_CURSOR/mcp.json manually, or use install-skill.ps1 on Windows."
    fi
}

# ---------------------------------------------------------------------------
# List packages
# ---------------------------------------------------------------------------

list_packages() {
    echo
    echo "Available packages:"
    echo
    for f in $(ls "$PACKAGES_DIR"/*.json 2>/dev/null | sort); do
        local name; name=$(basename "$f" .json)
        local desc; desc=$(json_string "$f" description)
        local deps; deps=$(json_array "$f" dependsOn | tr '\n' ' ' | sed 's/[[:space:]]*$//')
        printf "  %s%s\n" "$name" "${deps:+ [needs: $deps]}"
        [[ -n "$desc" ]] && printf "    %s\n" "$desc"
    done
    echo
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

usage() {
    cat <<EOF

USAGE: $(basename "$0") <PackageName|all> <TargetCursorPath> [TargetClaudePath] [--dry-run] [--list]

  PackageName      Package to install (without .json), or 'all'
  TargetCursorPath Absolute path to the target project's .cursor directory
  TargetClaudePath Optional: absolute path to the target project's .claude directory
                   When provided: skills, agents, references also deployed for Claude Code
                   Rules (.mdc) are Cursor-only — never deployed to .claude

  --dry-run        Show what would be copied without copying anything
  --list           List all available packages and exit

EXAMPLES:
  $(basename "$0") --list
  $(basename "$0") planning-workflow /project/.cursor
  $(basename "$0") planning-workflow /project/.cursor /project/.claude
  $(basename "$0") all /project/.cursor /project/.claude
  $(basename "$0") all /project/.cursor /project/.claude --dry-run

NOTE: Placeholder parameters ({frontend-path} etc.) are not substituted automatically.
      After install, replace placeholders in agents/, rules/, and skills/ manually.
      Only update-skill.ps1 (Windows) performs interactive parameter substitution.

      MCP configuration is Windows/PowerShell only — see install-skill.ps1.

EOF
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --list)    list_packages; exit 0 ;;
        --help|-h) usage; exit 0 ;;
        --*)       echo "ERROR: Unknown option: $1" >&2; usage; exit 1 ;;
        *)
            if   [[ -z "$PACKAGE_NAME"   ]]; then PACKAGE_NAME="$1"
            elif [[ -z "$TARGET_CURSOR"  ]]; then TARGET_CURSOR="$1"
            elif [[ -z "$TARGET_CLAUDE"  ]]; then TARGET_CLAUDE="$1"
            else echo "ERROR: Unexpected argument: $1" >&2; usage; exit 1
            fi
            shift ;;
    esac
done

[[ -z "$PACKAGE_NAME" ]]  && { echo "ERROR: PackageName is required." >&2;     usage; exit 1; }
[[ -z "$TARGET_CURSOR" ]] && { echo "ERROR: TargetCursorPath is required." >&2; usage; exit 1; }

if [[ "$DRY_RUN" == false ]]; then
    [[ ! -d "$TARGET_CURSOR" ]] && { echo "ERROR: Target path not found: $TARGET_CURSOR" >&2; exit 1; }
    [[ -n "$TARGET_CLAUDE" && ! -d "$TARGET_CLAUDE" ]] && { echo "ERROR: Claude target path not found: $TARGET_CLAUDE" >&2; exit 1; }
fi

TARGET_CURSOR="${TARGET_CURSOR%/}"
TARGET_CLAUDE="${TARGET_CLAUDE%/}"

[[ "$DRY_RUN" == true ]] && echo "[DRY RUN — no files will be copied]"

if [[ "$PACKAGE_NAME" == "all" ]]; then
    echo "Installing all packages..."
    for f in $(ls "$PACKAGES_DIR"/*.json 2>/dev/null | sort); do
        install_package "$(basename "$f" .json)"
    done
else
    install_package "$PACKAGE_NAME"
fi

echo
echo "Done."
