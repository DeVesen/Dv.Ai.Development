# Op: View-Migration

## Kontext

EF Core verwaltet Views nicht automatisch. Die View ist im DbContext als keyless Entity gemappt:

- Entity: `{backend-path}/{database-project}/Entities/{ViewEntity}.cs`
- Mapping: `modelBuilder.Entity<{ViewEntity}>().ToView("{view-name}").HasNoKey();`

Nach `migrations add` ist `Up()`/`Down()` oft leer — vollständiges `DROP VIEW IF EXISTS` + `CREATE VIEW` muss manuell in die **generierte** `.cs` eingetragen werden.

## Hard Rules

**VERBOTEN:** Zweites handgeschriebenes Migrations-Paar anlegen. SQL immer in die CLI-generierte Datei.

**VERBOTEN:** View-SQL aus einem Plan/Brief/Spec-Dokument abschreiben. Diese Dokumente können selbst veraltet sein (z. B. vor einer späteren, unabhängigen View-Migration geschrieben). **Immer** die tatsächlich letzte Migrationsdatei im `Migrations`-Ordner als Quelle nehmen — per `ls`/`git log` nach Timestamp verifizieren, nicht aus Erinnerung/Dokument annehmen. Spalte-für-Spalte gegen diese Datei diffen, bevor die neue `Up()`/`Down()` geschrieben wird (2026-08-10: genau dieser Fehler führte dazu, dass eine spätere Migration eine Spalte + einen WHERE-Filter stillschweigend wieder entfernte).

**VERBOTEN:** Eine bereits angewendete Migration nachträglich per Code-Edit "reparieren" und das für ausreichend halten. EF Core trackt angewendete Migrationen per Name in `__EFMigrationsHistory` und führt eine Migration mit geändertem Inhalt **nicht** erneut aus. Ist die fehlerhafte Migration auf irgendeiner Umgebung (auch nur lokal) schon angewendet, braucht der Fix eine **neue** Migration, die die korrekte View erneut erstellt — der Code-Edit an der alten Datei allein bleibt wirkungslos für bereits migrierte DBs.

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
| Spalten-Diff vollständig | Neue `Up()`-SELECT-Liste Spalte-für-Spalte gegen die tatsächlich letzte Migrationsdatei (nicht Plan/Brief) verglichen — nichts außer der beabsichtigten Änderung darf fehlen/abweichen |

## Reporting (Abschluss)

- Migrationsname (`{timestamp}_{Name}`)
- Betroffene View-Spalte(n)
- Ziel-DB (Host/Database-Name, **ohne** Passwort)
- Angewendet: ja/nein
- Bei Fehler `42703`: Migration nicht angewendet oder View-SQL in `Up()` fehlt/falsch
