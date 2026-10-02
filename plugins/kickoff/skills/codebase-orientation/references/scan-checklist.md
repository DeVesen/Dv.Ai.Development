# Scan checklist

Read-only. Record what is found; leave out what is absent.

- **Layout**: top-level folders; where source, tests, infra, docs live.
- **Frontend / backend / devops**: is there a UI project, a server project, pipeline or deployment files (e.g. `.github/workflows`, `azure-pipelines*.yml`, Dockerfiles, Helm/K8s manifests)?
- **Stack and versions**: from manifests and lockfiles (e.g. `package.json`, `*.csproj`, `pom.xml`, `pyproject.toml`, `go.mod`), not from memory or documents.
- **Tests**: runner, location, naming; how they are started.
- **Data and storage**: connection/config hints (ORM, migrations folder, storage SDKs).
- **Auth**: libraries and config pointing at an identity provider.
- **Entry points**: main program/host, API routes folder.
- **Existing agent files**: `CLAUDE.md`, `AGENTS.md`, `.claude/`, plugin or skill hints.
- **Commands**: build, test, lint, run, found in scripts or README.

Find files with glob/search tools; use `git ls-files` to cross-check existence, since untracked files may be missed by some tools.
