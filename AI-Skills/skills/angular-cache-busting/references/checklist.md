# Checkliste & Eskalation

## Deploy-Checkliste

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
