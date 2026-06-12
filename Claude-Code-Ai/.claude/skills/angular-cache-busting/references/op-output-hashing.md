# Operation: Output Hashing (angular.json)

**Trigger:** `outputHashing`, Bundle-Hashes fehlen, JS/CSS ohne Hash-Suffix im `dist/`.

## Root Cause

`index.html` hat keinen Hash im Dateinamen → Browser cached sie und lädt sie wieder.
JS/CSS-Bundles haben bereits Hashes (`main.abc123.js`) — die sind OK, sofern `outputHashing` aktiv ist.
Browser liefert stale `index.html` → referenziert alte Bundle-Hashes → Nutzer sieht alte App.

| Hebel | Wo | Effekt |
|-------|----|----|
| `outputHashing: "all"` | `angular.json` | Bundle-Dateinamen ändern sich bei Code-Änderung |
| `<meta>` no-cache Tags | `src/index.html` | Browser-Hinweis `index.html` nicht cachen |

> `<meta>`-Tags sind Best-Effort — nicht so zuverlässig wie HTTP `Cache-Control`-Header vom Server.

## Umsetzung

In `angular.json` unter dem `production`-Build-Target:

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

## Verifikation

Nach `ng build --configuration production` prüfen:
- `dist/` enthält Hashes: `main.xxxxxxxx.js`, `styles.xxxxxxxx.css`

Siehe auch: [checklist.md](checklist.md)
