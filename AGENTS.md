# Dv.Ai.Development — Cursor Entry Point

**Source of truth for repo architecture, deploy workflow, and platform notes:** [`CLAUDE.md`](./CLAUDE.md)

Read and follow `CLAUDE.md` for all project context. Do not duplicate its content here.

---

## Where to make changes

| Topic | Edit here |
|-------|-----------|
| Directory structure, deploy flow, dual-platform behavior | `CLAUDE.md` only |
| `.claude/` conventions (what deploys where, how Claude Code loads skills/agents) | `CLAUDE.md` only |
| Skills, rules, agents (actual artifacts) | `AI-Skills/` — see [Adding or Changing a Skill / Rule / Agent](./CLAUDE.md#adding-or-changing-a-skill--rule--agent) in `CLAUDE.md` |
| MCP server implementations | `Mcp-Servers/` — see [Repository Structure](./CLAUDE.md#repository-structure) in `CLAUDE.md` |
| Cursor rules (source) | `AI-Skills/rules/*.mdc` → deploy to `.cursor/rules/` in target projects |

Do not document architecture or `.claude/` layout in this file or elsewhere — keep `CLAUDE.md` canonical.

---

## Not the same as deployed `AGENTS.md`

This file is the **meta-guide for this source repository** (`Dv.Ai.Development`).

Target projects receive a separate, operational `AGENTS.md` at their repo root when AI-Skills packages are deployed (from `AI-Skills/Readme.md`). That file holds project-specific index data: available agents, triggers, stack conventions, `{frontend-path}` / `{backend-path}`, and similar. It is unrelated to this entry-point file.
