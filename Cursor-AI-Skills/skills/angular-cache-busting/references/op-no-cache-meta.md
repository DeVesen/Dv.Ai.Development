# Operation: No-Cache Meta Tags (src/index.html)

**Trigger:** `meta tag cache`, `Cache-Control in index.html`, `index.html nicht cachen`.

## Umsetzung

In `src/index.html` im `<head>`-Block folgende Tags einfügen:

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

## Einschränkung

Meta-Tags sind Best-Effort — nicht so zuverlässig wie HTTP `Cache-Control`-Header vom Server.
Bei Corporate-Browsern, aggressiven Proxy-Caches oder CDNs sind sie möglicherweise unwirksam.

Siehe auch: [checklist.md](checklist.md)
