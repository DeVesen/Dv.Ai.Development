# Artefakt-Checkliste — EF-Migrationen

## Triplet vor Commit/PR

Für jede **neue** Migration müssen alle drei Punkte erfüllt sein:

| # | Artefakt | Pfad-Muster |
|---|----------|-------------|
| 1 | Migration | `{database-project}/Migrations/{timestamp}_{Name}.cs` |
| 2 | Designer | `{database-project}/Migrations/{timestamp}_{Name}.Designer.cs` |
| 3 | Snapshot | `{database-project}/Migrations/{DbContext}ModelSnapshot.cs` (geändert) |

**Schnellcheck (PowerShell, CWD `{backend-path}`):**

```powershell
Get-ChildItem {database-project}/Migrations/*_<YourMigrationName>*
```

Erwartung: genau **zwei** Dateien (`.cs` und `.Designer.cs`) plus Snapshot-Diff in Git.

## Verbotene Muster

| Muster | Risiko |
|--------|--------|
| Nur `{timestamp}_{Name}.cs` angelegt | Migration wird von EF/`Migrate()` ignoriert oder Kette inkonsistent |
| Nur `{DbContext}ModelSnapshot.cs` manuell geändert | Modell und DB divergieren; oft **`PendingModelChangesWarning`** bei `Migrate()` |
| Migration-`.cs` manuell (z. B. `nullable: true`) ohne erneutes `migrations add` | Snapshot und Runtime-Modell divergieren |
| Timestamp per Hand ohne `migrations add` | Kein gültiger Designer, keine Kette |
| Historische `.cs` **ohne** `.Designer.cs` im Repo als Vorlage | Altteil — **nicht** kopieren |

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Orphan-Migration reparieren

Wenn eine fehlerhafte `.cs` ohne Designer existiert und noch **nicht** deployed:

1. Fehlerhafte `Migrations/*.cs` (ohne Paar) löschen.
2. Snapshot ggf. per `git checkout` auf letzten guten Stand zurücksetzen.
3. Entity/Model korrekt halten.
4. `dotnet ef migrations add <Name>` erneut — siehe [cli-commands.md](cli-commands.md).

Wenn bereits auf gemeinsamer DB angewendet: **nicht** still löschen — Rollback-/Forward-Strategie mit Team abstimmen.

## Symptom → Ursache

| Symptom | Wahrscheinliche Ursache | Maßnahme |
|---------|-------------------------|----------|
| `Npgsql.PostgresException: 42703: column … does not exist` | View in DB ohne neue Spalte; Migration nicht angewendet oder View-SQL fehlt in `Up()` | `migrations list` / `__EFMigrationsHistory`; View-SQL prüfen; `database update` oder Service-Neustart |
| Build grün, Suche schlägt zur Laufzeit fehl | Unit-Tests mocken DB; echte View nicht migriert | DB-Checkliste (nicht nur `dotnet test`) |
| `migrations add` erzeugt leeres `Up()` bei View-Entity | Normal bei `ToView` — SQL manuell in **generierte** Datei | [view-and-sql-migrations.md](view-and-sql-migrations.md) |
| Design-Time: Connection failed | Leere `{DbContext}Factory` | `--connection` aus `appsettings.Development.json` |
| `InvalidOperationException` / `PendingModelChangesWarning` bei `db.Database.Migrate()` | Entity-Modell ≠ letzter Snapshot (häufig manuelle Snapshot-/Migration-Korrektur) | `dotnet ef migrations has-pending-model-changes`; dann `migrations add` (leere Sync-Migration ist OK); erneut prüfen bis **No changes** |

## Review-Fragen (PR)

- Enthält `Up()` und `Down()` sinnvolle Gegenstücke (bei Views: vollständige View-Definitionen)?
- Sind Secrets/Prod-Connection-Strings **nicht** in Migrationsdateien committed?
- Wurde dokumentiert, ob lokal `database update` / `Migrate()` ausgeführt wurde?
