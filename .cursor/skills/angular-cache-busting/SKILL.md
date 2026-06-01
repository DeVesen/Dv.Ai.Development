---
name: angular-cache-busting
description: >
  Apply this skill whenever the user wants to fix browser caching issues in an Angular app — where users see an outdated version after a deployment and have to press Ctrl+F5 to force a reload. This skill covers ONLY changes inside the Angular app source code itself (angular.json, index.html, meta tags) — no server configuration (no nginx, no IIS, no Apache, no firebase.json). The user has no access to the server/hosting config. Trigger this skill when the user mentions: "cache", "alte Version nach Deploy", "Nutzer sehen alte App", "Ctrl+F5", "outputHashing", "browser caching Angular", "Cache-Control in index.html", "meta tag cache", or anything about users not automatically getting the latest version.
---

---

# Angular Browser Cache Busting (App-Code Only)

## Context & Constraint

The user has **no access to server or hosting configuration** (no nginx, IIS, Apache, Firebase, CDN config, etc.).
All fixes must live inside the Angular project source — changes the developer controls directly.

## Root Cause

After deploying a new Angular version, browsers may serve the old app from cache:

- `index.html` has no hash in its filename → browser caches it and reuses it
- The JS/CSS bundles DO have hashes (`main.abc123.js`) → those are fine already
- Browser serves stale `index.html` → it references old bundle hashes → user sees old app
- User has to press Ctrl+F5 to force a fresh load

The two levers available inside the app code are:

| What | Where | Effect |
|------|-------|--------|
| `outputHashing: "all"` | `angular.json` | Ensures every JS/CSS bundle filename changes when code changes |
| `<meta>` no-cache tags | `src/index.html` | Hints to browser not to cache `index.html` |

> **Important:** The `<meta>` no-cache tags are a best-effort hint — they are NOT as reliable as a real `Cache-Control` HTTP response header set by the server. Most modern browsers respect them, but it is not guaranteed. This is the best that can be done without server access.

---

## Fix 1 — Verify Output Hashing in angular.json

Open `angular.json` and confirm `outputHashing` is set to `"all"` in the production configuration:

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

**Why:** When any JS or CSS file changes, Angular generates a new hash in the filename (`main.abc123.js` → `main.xyz789.js`). The browser sees a filename it has never cached before and downloads the new version. This part usually already works — the real problem is always `index.html`.

**Values for `outputHashing`:**

| Value | Effect |
|-------|--------|
| `"all"` | Hash all JS, CSS, and media assets — recommended |
| `"bundles"` | Hash only JS/CSS bundles, not media |
| `"media"` | Hash only media files |
| `"none"` | No hashing — do not use in production |

---

## Fix 2 — Add No-Cache Meta Tags to index.html

Add these `<meta>` tags inside the `<head>` of `src/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your App</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Cache busting: instruct browser not to cache this file -->
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">

  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

**Why these three tags together:**

| Tag | Purpose |
|-----|---------|
| `Cache-Control: no-cache, no-store, must-revalidate` | Main directive — do not store, always re-validate |
| `Pragma: no-cache` | Backward compatibility for HTTP/1.0 proxies |
| `Expires: 0` | Marks the content as immediately expired |

**Limitation:** These are HTTP-equivalent meta tags. They work for most browsers, but a real `Cache-Control` HTTP response header (set by the server) is always authoritative and more reliable. If server access becomes available later, add it there too. For now, this is the best option inside the app.

---

## Checklist

- [ ] `angular.json` → production config has `"outputHashing": "all"`
- [ ] `src/index.html` → three `<meta http-equiv>` cache tags are in `<head>`
- [ ] Run a production build: `ng build --configuration production`
- [ ] Verify `dist/` contains hashed filenames: `main.xxxxxxxx.js`, `styles.xxxxxxxx.css`
- [ ] Deploy and open DevTools → Network tab → hard-reload once → then normal-reload
- [ ] On normal reload: `index.html` should show `200` (from server), not `(from disk cache)`

---

## Known Limitation & Escalation Path

If the meta tags alone are not enough (some corporate browsers, aggressive proxy caches, or CDNs may ignore them), the only reliable fix is a server-side `Cache-Control` header on `index.html`. In that case, escalate to whoever manages the hosting/server and request:

```
Cache-Control: no-cache, no-store, must-revalidate
```

applied specifically to `index.html`. All other assets (`.js`, `.css`) can keep long-lived caching — Angular's output hashing makes them safe.