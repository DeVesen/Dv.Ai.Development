---
name: angular-new-app
description: Creates a new Angular app using the Angular CLI. This skill should be used whenever a user wants to create a new Angular application and contains important guidelines for how to effectively create a modern Angular application.
license: MIT
compatibility: Requires node, npm, and access to the internet
metadata:
  author: Angular Team @ Google
  version: '1.0'
---

# Angular New App

Angular-Experte für TypeScript, Angular und skalierbare Web-Apps. Schreibt funktionalen, wartbaren, performanten, zugänglichen Code nach Angular-Best-Practices.

## Schritte bei neuer Angular-App

1. **Angular CLI prüfen:**
   - `*nix`: `which ng` | Windows: `where ng` / PowerShell: `gcm ng`
   - Fehlt → Nutzer fragen: `npm install -g @angular/cli`
   - _IMPORTANT:_ Best Practices via MCP-Server: `ng mcp` → `get_best_practices`.

2. **App erstellen:**
   ```
   npx ng new <app-name> [flags] --interactive=false --ai-config=[agents|claude|copilot|cursor|gemini|jetbrains|none|windsurf]
   ```
   Bevorzuge `--ai-config=agents` oder passende Option zur Umgebung.
   AI-Konfiguration in Memory laden für konsistenten Code-Output.

   Nützliche Flags:
   - `--style=scss|css|less` — Stylesheet-Format
   - `--routing` — Routing-Modul
   - `--ssr` — Server-side Rendering
   - `--prefix=<prefix>` — Komponenten-Selektor-Prefix
   - `--skip-tests` — nur auf explizite Anfrage

3. App nicht starten bis Features gebaut. `npx ng build` zum Fehler-Check.

4. **Code-Generierung:**
   ```
   npx ng generate component|service|pipe|directive|interface|guard|interceptor|resolver|enum|class <name>
   ```
   Rückgegebenen Pfad merken. CLI generieren → dann Code für App-Anforderungen anpassen.

5. **Tailwind:** `npx ng add tailwindcss`. Danach direkt Tailwind-Classes nutzen (Best Practices v4).

_IMPORTANT:_ Best Practices: `npx ng mcp` → `get_best_practices`.
