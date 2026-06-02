---
name: angular-new-app-extension
description: >
  Portable follow-on to [angular-new-app](../angular-new-app/SKILL.md): documentation-first
  validation, mandatory AskQuestion Decision Gate (questionnaire), written implementation plan before any
  CLI execution, and narrow subagent tasks. Use after loading angular-new-app when creating a new Angular
  workspace or app via the CLI, for greenfield scaffolding with explicit user approval, or when a cheap
  subagent should only run pre-approved ng commands.
disable-model-invocation: true
---

# Angular New App Extension

**Ladereihenfolge:** Erst [angular-new-app](../angular-new-app/SKILL.md) (Basis-CLI-Schritte); dann diese Extension (striktere Orchestrierung + Freigaben).

**Rolle:** Orchestrierung, keine direkte Implementierung. Subagent erhält nur **enge, nutzerfreigegebene** Aufgaben — [subagent-prompts.md](subagent-prompts.md).

## Verboten

- Stille Produkt-Entscheidungen — Defaults nur nach Nutzer-Bestätigung.
- `next`/`rc`/Pre-Release ohne separate Freigabe.
- Leere oder mehrdeutige Platzhalter in Commands: `APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG` müssen lesbar bleiben.

## Schritt 0 — Dokumentation zuerst

Vor CLI-Kommandos abgleichen mit:

| Topic | Quelle |
|--------|--------|
| `ng new` Optionen | [angular.dev/cli/new](https://angular.dev/cli/new) |
| Node/TS/RxJS Kompatibilität | [angular.dev/reference/versions](https://angular.dev/reference/versions) |
| Support Lifecycle | [angular.dev/reference/releases](https://angular.dev/reference/releases) |
| AI-Kontext | [best-practices.md](https://angular.dev/assets/context/best-practices.md) |

Flag-Array-Syntax für die gezielte CLI-Version bestätigen.

## Schritt 1 — Decision Gate (Pflicht)

Checkliste: [questionnaire.md](questionnaire.md). `AskQuestion` wenn verfügbar; sonst conversational. Erst nach Antworten → Implementierungsplan.

## Schritt 2 — Implementierungsplan (vor `ng new`)

Kurzer, prüfbarer Plan:
1. Workspace-Name, App-Name, Zielverzeichnis.
2. Node/Angular-Anforderungen, Package-Manager, CLI-Muster.
3. Exaktes `ng new`-Kommando als Code-Block.
4. Follow-up-Schritte (`ng build`, `ng test`; `ng serve` nur auf Wunsch).
5. Subagent-Aufteilung → [subagent-prompts.md](subagent-prompts.md).

Shell-Commands/Subagents nur nach **expliziter Nutzer-Freigabe**.

## Schritt 3 — Subagents (nach Freigabe)

Vorlagen: [subagent-prompts.md](subagent-prompts.md).

Reihenfolge: `docs-check` → `workspace-scout` → `app-skeleton` → `quality-runner`; `feature-builder` nur nach separatem Feature-Plan + Freigabe.

Parent-Agent fasst zusammen und formuliert explizite nächste Entscheidungen — kein stiller Autopilot.

## Qualität (nach Erstellung)

- Minimum: `ng build` erfolgreich (wenn angefragt).
- Tests: passende Kommandos zum gewählten `--test-runner`.

## Anti-Patterns

- `ng serve`/Dev-Server ohne Nutzer-Freigabe.
- Globales `@angular/cli` ohne Package-Manager-Bestätigung.
- Ein Subagent für „ganzes Produkt implementieren" — Arbeit aufteilen.
