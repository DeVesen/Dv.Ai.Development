# Op: Test Policy

## Test policy

- **Integration-style / behavior tests** (multi-unit flows, router, HTTP chain, user-visible flows): treat them as **specifications of desired behavior**. If they fail after a refactor, **first** assume production code may be wrong or the refactor changed observable behavior unintentionally — do **not** "fix" tests to match a new implementation without confirming the intended product behavior.
- **Unit tests** (`*.spec.ts` tied to one component/service): may change when **public API** or observable behavior intentionally changes, or when replacing brittle DOM assertions with harnesses/mocks — keep them aligned with the **intended** contract, not with accidental implementation details.
- **Review test value** — flag tests that burn time without guarding real behavior: duplicated coverage, over-mocked integration, flaky timers. Prefer **stable** fakes: `HttpTestingController`, `RouterTestingHarness` / focused router mocks, Material harnesses where applicable.

See also: [testing policy (reference)](.claude/skills/angular-developer-extension/references/testing.md) — unit vs integration stance, public API, refactor test stance; TestBed/HTTP/harness mechanics → [Angular Developer](.claude/skills/angular-developer/SKILL.md).
