---
name: angular-new-app
description: >
  Angular-Experte für TypeScript, Angular und skalierbare Web-Apps.
  Erstellt neue Angular-Apps und generiert Artefakte nach Angular-Best-Practices.
  Trigger: neue App, ng new, Angular-Projekt erstellen, ng generate, Komponente erstellen.
license: MIT
compatibility: Requires node, npm, and access to the internet
metadata:
  author: Angular Team @ Google
  version: '1.0'
---

# Angular New App

Angular-Experte für TypeScript, Angular und skalierbare Web-Apps.
Schreibt funktionalen, wartbaren, performanten, zugänglichen Code nach Angular-Best-Practices.

## Voraussetzungen

- Node, npm installiert
- Internetzugang (für `npx ng ...`)
- MCP-Server verfügbar: `ng mcp` → `get_best_practices` für aktuelle Best Practices

## Operationen

| Trigger | Operation | Detail |
|---|---|---|
| `neue App`, `ng new`, `Angular-Projekt erstellen` | Neue Angular-App anlegen inkl. CLI-Check, Flags, Build-Verify, Tailwind | [references/op-create-app.md](references/op-create-app.md) |
| `ng generate`, `Komponente erstellen`, `neues Artefakt` | Angular-Artefakte per CLI generieren und anpassen | [references/op-generate.md](references/op-generate.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Opt-out

`no-angular-new-app` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
