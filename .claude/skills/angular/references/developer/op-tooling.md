# Operation: Tooling

**Trigger-Keywords:** `CLI`, `ng generate`, `ng serve`, `ng build`, `migration`, `schematic`, `MCP`, `Angular MCP`, `modernisierung`, `update`

## Relevante Referenzen

| Thema | Datei |
|-------|-------|
| CLI: Apps, Generate, Serve, Build | [cli.md](cli.md) |
| Modernisierungs-Migrationen | [migrations.md](migrations.md) |
| Angular MCP Server | [mcp.md](mcp.md) |

## Build/Test/Lint (Pflicht)

| Aktion | Aufruf | Verboten |
|--------|--------|----------|
| Build | `dv-angular-build --root <angular-ordner>` | `ng build` direkt |
| Test | `dv-angular-test --root <angular-ordner>` | `ng test` direkt |
| Lint | `dv-angular-lint --root <angular-ordner>` | `ng lint` direkt |

Die Skripte liefern nur Fehler und eine Zusammenfassung, das volle Log liegt in einer Datei. Warnungen mit `--show warnings`.

## Scaffolding

`ng generate` über die Shell, Regeln in [op-generate.md](../new-app/op-generate.md). Danach die erstellten Dateien lesen und projektspezifisch anpassen.

> **Abgrenzung:** `@angular/cli mcp` ist der offizielle Angular-Dokumentations-MCP ([mcp.md](mcp.md)).
