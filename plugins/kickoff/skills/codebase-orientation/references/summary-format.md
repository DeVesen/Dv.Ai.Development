# Summary format

## CLAUDE.md block (target: at most about 25 lines)

```markdown
## Project at a glance
- Purpose: <one line>
- Layout: frontend `<path>` · backend `<path>` · pipelines `<path>` · tests `<path>`
- Frontend: <framework + version>, tests <runner>, structure <one line rule>
- Backend: <language/framework + version>, style <monolith/modular/...>, tests <runner>
- Data: <db> via <access>; files in <storage>
- Auth: <provider/mechanism>; roles come from <source>
- Rules: <the 3-5 rules agents most often break>
- Commands: build `<cmd>` · test `<cmd>` · run `<cmd>`
- Details: <docs-dir>/architecture-checklist.md, architecture-concept.md
```

Drop lines that do not apply. Unknown items are asked, not guessed.

## Detail files (only when the block would exceed its size)

Place under the docs folder from the Kickoff block. Split by topic (e.g. `backend-structure.md`, `frontend-structure.md`, `operations.md`), each starting with the facts agents need and linking back to the concept for reasons. Keep status labels from the source documents.

## Findings list

Shown to the user with the proposal: mismatches between documents and repo, missing information, and anything the block deliberately omits.
