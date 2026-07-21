# Op: View-Migration

## Kontext

EF Core verwaltet Views nicht automatisch. Die View ist im DbContext als keyless Entity gemappt:

- Entity: `{backend-path}/{database-project}/Entities/{ViewEntity}.cs`
- Mapping: `modelBuilder.Entity<{ViewEntity}>().ToView("{view-name}").HasNoKey();`

Nach `migrations add` ist `Up()`/`Down()` oft leer — vollständiges `DROP VIEW IF EXISTS` + `CREATE VIEW` muss manuell in die **generierte** `.cs` eingetragen werden.

## Hard Rules

**VERBOTEN:** Zweites handgeschriebenes Migrations-Paar anlegen. SQL immer in die CLI-generierte Datei.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Workflow

1. Entity-Eigenschaft(en) am `{ViewEntity}` (und ggf. Search-Service-Spalten) anpassen.
2. `dotnet ef migrations add <Name>` — erzeugt Triplet; `Up()`/`Down()` können leer oder unvollständig sein.
3. SQL aus letzter View-Migration kopieren/anpassen und in die **generierte** `.cs` einfügen.
4. Details zu SQL-Muster und Down-Symmetrie: [view-and-sql-migrations.md](view-and-sql-migrations.md).
5. Triplet-Checkliste abschließen: [artifact-checklist.md](artifact-checklist.md).

## Kanonischer Migrationsname

`Add{Feature}To{ViewEntity}` (projektspezifisch)

## Verifikation (Pflicht)

| Check | Wie |
|-------|-----|
| Triplet vorhanden | Drei Dateien: `.cs`, `.Designer.cs`, Snapshot aktualisiert |
| View-SQL vollständig | `Up()` enthält `DROP VIEW IF EXISTS` + vollständiges `CREATE VIEW` |
| Down-Symmetrie | `Down()` stellt vorherige View-Definition wieder her |
| DB angewendet | `database update` **oder** `{startup-project}`-Neustart |
| View-Spalte existiert | Spalte in Postgres prüfen oder Such-API ohne `42703` |

## Reporting (Abschluss)

- Migrationsname (`{timestamp}_{Name}`)
- Betroffene View-Spalte(n)
- Ziel-DB (Host/Database-Name, **ohne** Passwort)
- Angewendet: ja/nein
- Bei Fehler `42703`: Migration nicht angewendet oder View-SQL in `Up()` fehlt/falsch
