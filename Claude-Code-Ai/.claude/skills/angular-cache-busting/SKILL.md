---
name: angular-cache-busting
description: >
  Apply this skill whenever the user wants to fix browser caching issues in an Angular app — where users see an outdated version after a deployment and have to press Ctrl+F5 to force a reload. This skill covers ONLY changes inside the Angular app source code itself (angular.json, index.html, meta tags) — no server configuration (no nginx, no IIS, no Apache, no firebase.json). The user has no access to the server/hosting config. Trigger this skill when the user mentions: "cache", "alte Version nach Deploy", "Nutzer sehen alte App", "Ctrl+F5", "outputHashing", "browser caching Angular", "Cache-Control in index.html", "meta tag cache", or anything about users not automatically getting the latest version.
---

# Angular Browser Cache Busting (App-Code Only)

**Constraint:** Kein Server-/Hosting-Zugriff (kein nginx, IIS, Apache, Firebase, CDN). Alle Fixes im Angular-Projektquellcode.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| `outputHashing`, Bundle ohne Hash, alte Bundles nach Deploy | Output Hashing in `angular.json` konfigurieren | [references/op-output-hashing.md](references/op-output-hashing.md) |
| `meta tag cache`, `Cache-Control in index.html`, `index.html nicht cachen` | No-Cache Meta-Tags in `src/index.html` einfügen | [references/op-no-cache-meta.md](references/op-no-cache-meta.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Link |
|-------|------|
| Deploy-Checkliste & Eskalation | [references/checklist.md](references/checklist.md) |

## Opt-out

`kein cache busting` → Skill nicht laden.

Keine Code-Beispiele ohne explizite Nachfrage.
