# Operation: Neue Angular-App erstellen

## Trigger-Keywords
`neue App`, `new app`, `ng new`, `Angular-Projekt erstellen`, `Bootstrap Angular`

---

## Schritte

### 1. Angular CLI prüfen
- `*nix`: `which ng` | Windows: `where ng` / PowerShell: `gcm ng`
- Fehlt → Nutzer fragen: `npm install -g @angular/cli`
- _IMPORTANT:_ Best Practices via MCP-Server: `ng mcp` → `get_best_practices`.

### 2. App erstellen
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

### 3. Build-Check

Build via **dev-angular-mcp** ausführen: `build_angular_project` zum Fehler-Check.

**VERBOTEN:** `ng build` als Shell-Kommando.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

### 4. Tailwind (optional)
`npx ng add tailwindcss`. Danach direkt Tailwind-Classes nutzen (Best Practices v4).

---

_IMPORTANT:_ Best Practices: `npx ng mcp` → `get_best_practices`.
