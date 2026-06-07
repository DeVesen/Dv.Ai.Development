#!/usr/bin/env bash
# install-skill.sh — Linux/macOS equivalent of install-skill.ps1
#
# Installs skill packages into .cursor and optionally .claude directories.
# Rules (.mdc) are Cursor-only and never deployed to .claude.
#
# NOTE: Interactive MCP configuration (Docker/simple) is not supported here.
#       Use install-skill.ps1 on Windows for interactive MCP setup.
#       After install, configure .cursor/mcp.json manually if needed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGES_DIR="$SCRIPT_DIR/packages"

DRY_RUN=false
TARGET_CURSOR=""
TARGET_CLAUDE=""
PACKAGE_NAME=""
INSTALLED_PACKAGES=""

# ---------------------------------------------------------------------------
# JSON helpers (python3 required)
# ---------------------------------------------------------------------------

_py() { python3 -c "$1" 2>/dev/null; }

json_array() {
    local file="$1" key="$2"
    _py "
import json
d = json.load(open('$file'))
for x in d.get('$key', []):
    print(x)
"
}

json_string() {
    local file="$1" key="$2"
    _py "import json; d = json.load(open('$file')); print(d.get('$key', ''))"
}

json_has_mcp() {
    local file="$1"
    _py "import json; d = json.load(open('$file')); print('yes' if d.get('mcp') else '')"
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
        cp -r "$src" "$dst"
    else
        cp -f "$src" "$dst"
    fi
    echo "  + $dst"
}

is_installed() { echo " $INSTALLED_PACKAGES " | grep -qw " $1 "; }

# ---------------------------------------------------------------------------
# Install one package (recursively resolves dependsOn)
# ---------------------------------------------------------------------------

install_package() {
    local name="$1"
    is_installed "$name" && return
    INSTALLED_PACKAGES="$INSTALLED_PACKAGES $name"

    local manifest="$PACKAGES_DIR/$name.json"
    if [[ ! -f "$manifest" ]]; then
        local available; available=$(ls "$PACKAGES_DIR"/*.json 2>/dev/null | xargs -I{} basename {} .json | tr '\n' ' ')
        echo "ERROR: Package '$name' not found. Available: $available" >&2
        exit 1
    fi

    echo
    echo "-> $name"
    local desc; desc=$(json_string "$manifest" description)
    [[ -n "$desc" ]] && echo "   $desc"

    # Dependencies first
    while IFS= read -r dep; do
        [[ -n "$dep" ]] && install_package "$dep"
    done < <(json_array "$manifest" dependsOn)

    # Rules → Cursor only (.mdc has no Claude Code equivalent)
    while IFS= read -r r; do
        [[ -z "$r" ]] && continue
        copy_asset "$SCRIPT_DIR/$r" "$TARGET_CURSOR/rules/$(basename "$r")"
    done < <(json_array "$manifest" rules)

    # Skills → Cursor + Claude Code
    while IFS= read -r s; do
        [[ -z "$s" ]] && continue
        local leaf; leaf=$(basename "$s")
        copy_asset "$SCRIPT_DIR/$s" "$TARGET_CURSOR/skills/$leaf"
        [[ -n "$TARGET_CLAUDE" ]] && copy_asset "$SCRIPT_DIR/$s" "$TARGET_CLAUDE/skills/$leaf"
    done < <(json_array "$manifest" skills)

    # Agents → Cursor + Claude Code
    while IFS= read -r a; do
        [[ -z "$a" ]] && continue
        local leaf; leaf=$(basename "$a")
        copy_asset "$SCRIPT_DIR/$a" "$TARGET_CURSOR/agents/$leaf"
        [[ -n "$TARGET_CLAUDE" ]] && copy_asset "$SCRIPT_DIR/$a" "$TARGET_CLAUDE/agents/$leaf"
    done < <(json_array "$manifest" agents)

    # References → Cursor + Claude Code
    while IFS= read -r ref; do
        [[ -z "$ref" ]] && continue
        local leaf; leaf=$(basename "$ref")
        copy_asset "$SCRIPT_DIR/$ref" "$TARGET_CURSOR/references/$leaf"
        [[ -n "$TARGET_CLAUDE" ]] && copy_asset "$SCRIPT_DIR/$ref" "$TARGET_CLAUDE/references/$leaf"
    done < <(json_array "$manifest" references)

    # Docs (AGENTS.md etc.) → Cursor only
    while IFS= read -r doc; do
        [[ -z "$doc" ]] && continue
        copy_asset "$SCRIPT_DIR/$doc" "$TARGET_CURSOR/$(basename "$doc")"
    done < <(json_array "$manifest" docs)

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
    for f in "$PACKAGES_DIR"/*.json; do
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
  $(basename "$0") planning-workflow /project/.cursor
  $(basename "$0") planning-workflow /project/.cursor /project/.claude
  $(basename "$0") all /project/.cursor /project/.claude
  $(basename "$0") all /project/.cursor /project/.claude --dry-run
  $(basename "$0") --list

NOTE: Placeholder parameters ({frontend-path} etc.) are not substituted automatically.
      After install, replace placeholders in agents/, rules/, and skills/ manually
      or use update-skill.ps1 on Windows for interactive parameter prompts.

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
    for f in "$PACKAGES_DIR"/*.json; do
        install_package "$(basename "$f" .json)"
    done
else
    install_package "$PACKAGE_NAME"
fi

echo
echo "Done."
