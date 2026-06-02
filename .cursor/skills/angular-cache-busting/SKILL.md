---
name: angular-cache-busting
description: >
  Apply this skill whenever the user wants to fix browser caching issues in an Angular app — where users see an outdated version after a deployment and have to press Ctrl+F5 to force a reload. This skill covers ONLY changes inside the Angular app source code itself (angular.json, index.html, meta tags) — no server configuration (no nginx, no IIS, no Apache, no firebase.json). The user has no access to the server/hosting config. Trigger this skill when the user mentions: "cache", "alte Version nach Deploy", "Nutzer sehen alte App", "Ctrl+F5", "outputHashing", "browser caching Angular", "Cache-Control in index.html", "meta tag cache", or anything about users not automatically getting the latest version.
---

# Angular Browser Cache Busting (App-Code Only)

**Constraint:** Kein Server-/Hosting-Zugriff (kein nginx, IIS, Apache, Firebase, CDN). Alle Fixes im Angular-Projektquellcode.

## Root Cause

`index.html` hat keinen Hash im Dateinamen → Browser cached sie und lädt sie wieder. JS/CSS-Bundles haben bereits Hashes (`main.abc123.js`) — die sind OK. Browser liefert stale `index.html` → referenziert alte Bundle-Hashes → Nutzer sieht alte App.

| Hebel | Wo | Effekt |
|-------|----|----|
| `outputHashing: "all"` | `angular.json` | Bundle-Dateinamen ändern sich bei Code-Änderung |
| `<meta>` no-cache Tags | `src/index.html` | Browser-Hinweis `index.html` nicht cachen |

> `<meta>`-Tags sind Best-Effort — nicht so zuverlässig wie HTTP `Cache-Control`-Header vom Server.

## Fix 1 — Output Hashing (angular.json)

```json
{
  "projects": {
    "YOUR_APP_NAME": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "outputHashing": "all"
            }
          }
        }
      }
    }
  }
}
```

| Wert | Effekt |
|------|--------|
| `"all"` | Alle JS, CSS, Media — empfohlen |
| `"bundles"` | Nur JS/CSS |
| `"media"` | Nur Media |
| `"none"` | Kein Hashing — nicht für Produktion |

## Fix 2 — No-Cache Meta Tags (src/index.html)

```html
<head>
  <!-- Cache busting -->
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
</head>
```

| Tag | Zweck |
|-----|-------|
| `Cache-Control` | Hauptdirektive — nicht speichern, immer re-validieren |
| `Pragma` | HTTP/1.0-Kompatibilität |
| `Expires: 0` | Sofort abgelaufen |

## Checkliste

- [ ] `angular.json` production: `"outputHashing": "all"`
- [ ] `src/index.html`: drei `<meta http-equiv>` Cache-Tags in `<head>`
- [ ] `ng build --configuration production`
- [ ] `dist/` enthält Hashes: `main.xxxxxxxx.js`, `styles.xxxxxxxx.css`
- [ ] Deploy; DevTools → Network → Hard-Reload → dann Normal-Reload
- [ ] Normal-Reload: `index.html` zeigt `200` (vom Server), nicht `(from disk cache)`

## Eskalation

Meta-Tags reichen nicht (Corporate-Browser, aggressive Proxy-Caches, CDNs) → Server-seitiger `Cache-Control`-Header auf `index.html`:
```
Cache-Control: no-cache, no-store, must-revalidate
```
Alle anderen Assets (`.js`, `.css`) können langen Cache behalten — Output-Hashing macht sie sicher.
