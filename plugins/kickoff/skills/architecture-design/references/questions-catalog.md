# Question catalog

Keep the order; later topics build on earlier ones. One question per message with recommendation, reason, alternatives. The bullets are checkpoints and sample offers, not requirements: pick what fits, drop what does not, add what is missing. Whatever supplied material already answers is presented as DERIVED instead of asked.

## Contents
1. Context and scope
2. Infrastructure and operations
3. Architecture style
4. Design principles
5. Backend technology
6. Frontend technology
7. Backend structure on disk
8. Frontend structure on disk
9. Cross-cutting: data, files, security, auth, tests
10. Wrap-up

## 1. Context and scope
Goal, budget, team (size, roles, AI use), what is explicitly **not** built, volume (users, data, growth), customer constraints, open customer decisions. Why first: team size and volume decide style and operating effort later.

## 2. Infrastructure and operations
Target platform (cloud? which; containers/orchestrator), reference system, environments, pipeline (style: e.g. GitHub Actions or Azure DevOps YAML; delivery steps), database (choice and who approves), file storage, sign-in, health endpoint, migration strategy, permissions of the application account.

## 3. Architecture style
Monolith, modular monolith, services. Decide by team size, volume, scaling needs, consistency needs, operating cost. A service means an autonomous deployable with its own project and data; do not use the word loosely. Small team + low volume usually points to a modular monolith. If modular monolith: state the extraction rule (a single gate to the outside, a replaceable transport behind an interface) so a module can leave later. If several deployables: which one is the only entry point, what may talk to what, and who is allowed to reach data (typical rule: nothing outside the gate service touches the database or internal services such as an AI service).

## 4. Design principles
Rank them, since they conflict: e.g. DDD before IODA/IOSP, SOLID, YAGNI, KISS, repository pattern for every external access, hexagonal, interfaces only at seams and where something is injected, orchestrators that only delegate.

## 5. Backend technology
Language and framework with a **checked** current/LTS version, endpoint style, communication kind (REST, streaming, RPC only with real need), persistence/ORM and access layer, transaction boundary, interface style between frontend and backend.

## 6. Frontend technology
Framework and version, state approach, test runner, rule "frontend talks only to its own backend" with its exceptions (e.g. redirect to the identity provider).

## 7. Backend structure on disk
Naming prefix; flat vs nested; one unit per business area; contract/interface placement per module (own project, shared project, or folder — weigh compiler enforcement, cycles, extraction); layers as folders or projects; where endpoints live; shared kernel holds technology only; auth separated; test projects (location, naming, integration tests, architecture tests). Source-of-truth locations should be nameable in one line each.

## 8. Frontend structure on disk
Feature principle (a feature is a closed business area, not necessarily a backend module); where services, repositories and state live; component file layout; shared-component rule (dumb components used by more than one feature sit in a shared area, base and extended blocks separate; single-feature components stay in the feature); lint rules for import boundaries since no compiler enforces them.

## 9. Cross-cutting
- Persistence and read models; files (storage, mapping table, delete, replace, access); concurrent editing; error handling.
- **Transport security**: HTTPS everywhere incl. internal hops if required, HSTS, CORS, API gateway.
- **Authentication**: managed identity provider vs own authority service; which party issues tokens; library vs service for token handling; token flow for the frontend; user table separate from the provider; roles from the backend rather than from the token.
- **Authorization**: model (roles, policies, object-level rules); checks on three levels (endpoint, use case, list); 404 instead of 403 for foreign objects with server-side logging.
- **Endpoint hardening**: all locked except health, input validation, injection, upload and import hardening, rate limits.
- Tests: pyramid, architecture tests, what is automated.

## 10. Wrap-up
Collect open points with owner. Mark module dependencies as DERIVED to check. Offer deliverables (`deliverables.md`).
