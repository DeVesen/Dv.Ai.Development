
## Voraussetzungen

- Node, npm installiert
- Internetzugang (für `npx ng ...`)
- MCP-Server verfügbar: `ng mcp` → `get_best_practices` für aktuelle Best Practices
- Kein `next`/`rc`/Pre-Release ohne separate Freigabe
- Alle Platzhalter (`APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG`) müssen vor Ausführung aufgelöst sein

**Rolle bei neuen Projekten:** Orchestrierung, keine direkte Implementierung. Subagent erhält nur enge, nutzerfreigegebene Aufgaben.

## Operationen

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

### CLI

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `neue App`, `ng new`, `Angular-Projekt erstellen` | Neue Angular-App anlegen inkl. CLI-Check, Flags, Build-Verify, Tailwind | [references/op-create-app.md](op-create-app.md) |
| `ng generate`, `Komponente erstellen`, `neues Artefakt` | Angular-Artefakte per CLI generieren und anpassen | [references/op-generate.md](op-generate.md) |

### Orchestrierung (Prozess-Gates)

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Schritt 0 — vor CLI | Docs abgleichen (ng new, Versionen, AI-Kontext) | [references/op-docs-check.md](op-docs-check.md) |
| Schritt 1 — Anforderungsklärung | Decision Gate — alle Fragen klären (Pflicht) | [references/op-decision-gate.md](op-decision-gate.md) |
| Schritt 2 — nach Decision Gate | Implementierungsplan erstellen (vor `ng new`) | [references/op-implementation-plan.md](op-implementation-plan.md) |
| Schritt 3 — nach Nutzer-Freigabe | Subagents ausführen + Qualität prüfen | [references/op-subagents.md](op-subagents.md) |

## Referenzen

| Thema | Datei |
|-------|-------|
| Decision Gate Checkliste | [references/questionnaire.md](questionnaire.md) |
| Subagent-Vorlagen | [references/subagent-prompts.md](subagent-prompts.md) |
| Verboten & Anti-Patterns | [references/constraints.md](constraints.md) |

## Opt-out

`no-angular-new-app` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
