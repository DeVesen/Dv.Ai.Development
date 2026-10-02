---
name: project-brief
description: Use when a project manager or product owner starts a software project and needs the business frame captured before architecture work — goal, scope, expected load, budget, deployment target, pipeline style — or when someone says "project brief", "Projektstart aufnehmen", "was ist das Ziel und die Last", "Projekt aufnehmen", "Rahmendaten fürs Projekt", "Budget, Last und Cloud-Ziel festhalten".
---

# Project Brief

Captures the frame a project manager already knows, so the architect starts from facts instead of a blank page. Output feeds `architecture-design`, which also works without it.

Read `${CLAUDE_PLUGIN_ROOT}/shared/conventions.md` first.

## Flow

1. **Collect material**: ask once for requirements, mails, workshop notes, `.md`/PDF files. Read them; propose what they answer as DERIVED.
2. **Ask the remaining topics**, one per message, with recommendation:
   - Purpose, goal, who benefits, success criteria
   - Scope in / explicitly out
   - Volume: users, data, growth, availability expectations
   - Budget, timeline, team (size, roles, AI use)
   - Customer constraints and customer decisions still open
   - Deployment: cloud or not, which; environments
   - Delivery: pipeline needed? style (e.g. GitHub Actions, Azure DevOps YAML, other)
   - Compliance and data protection constraints
   Depth stops at business level. Technology and structure questions belong to the architect; park them as OPEN notes for `architecture-design`.
3. **Write on request** to the `project-brief` path from the Kickoff block, with status labels per statement and a list of open points.

Never commit. Skip topics the user cannot answer yet by marking them OPEN with an owner.
