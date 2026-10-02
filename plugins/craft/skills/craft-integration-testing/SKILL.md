---
name: craft-integration-testing
description: >
  Use when writing or reviewing integration tests, naming integration test projects,
  handling test database cleanup or rollback, or testing against real infrastructure
  such as WebApplicationFactory or TestContainers. Triggers: @craft-integration-testing,
  integration test, IntegrationTests-Projekt, DB-Zustand zurücksetzen,
  Transaction-Rollback, TestContainers, WebApplicationFactory, geteilte Infrastruktur.
  Opt-out: ohne craft-integration-testing.
---

# Integration Testing

Baut auf den Grundkonventionen von Skill `craft-unit-testing` auf
(Klassen-/Methoden-Naming, AAA-Aufbau) — hier nur Integration-spezifische Ergänzungen.

---

## Projekt-Naming

| Typ | Projekt-Suffix | Beispiel |
|-----|---------------|---------|
| Integration | `.IntegrationTests` | `Acme.OrderService.IntegrationTests` |

---

## Leitsätze

- **Integrationstests brauchen Cleanup.** DB-Zustand nach jedem Test zurücksetzen (Transaction-Rollback oder TestContainers-Neustart).
- **Keine geteilte Infrastruktur zwischen Tests.** Nie gegen geteilte Daten testen — jeder Test baut seinen eigenen Zustand auf.
- **Klassen-/Methoden-Naming, AAA-Aufbau**: identisch zu `craft-unit-testing` — keine eigene Konvention hier.

---

## Verweise

| Thema | Skill |
|-------|-------|
| Testnaming, AAA, TDD | `craft-unit-testing` |
| Clean-Code-Detailregeln für Testcode | `craft-clean-code` |

---

## Opt-out

`ohne craft-integration-testing` → Skill nicht laden.
