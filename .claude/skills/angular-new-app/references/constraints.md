# Constraints — Angular New App

## Verboten

- Stille Produkt-Entscheidungen — Defaults nur nach Nutzer-Bestätigung.
- `next`/`rc`/Pre-Release ohne separate Freigabe.
- Leere oder mehrdeutige Platzhalter in Commands: `APP_NAME`, `TARGET_DIR`, `PACKAGE_MANAGER`, `AI_CONFIG` müssen lesbar bleiben.

## Anti-Patterns

- `ng serve`/Dev-Server ohne Nutzer-Freigabe.
- Globales `@angular/cli` ohne Package-Manager-Bestätigung.
- Ein Subagent für „ganzes Produkt implementieren" — Arbeit aufteilen.
