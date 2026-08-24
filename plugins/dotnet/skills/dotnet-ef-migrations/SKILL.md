---
name: dotnet-ef-migrations
description: >
  Use when creating, reviewing, or fixing EF Core migrations against Postgres: schema
  changes, Views, ModelSnapshot/PendingModelChanges drift, column errors.
  Triggers: @dotnet, @ef-migration, dotnet ef migrations add, Migrations-Ordner,
  42703 column does not exist, Schema/Spalte/View im Backend. Not for general .NET/C#
  backend code without a migration involved. Opt-out: ohne dotnet-ef-migrations.
---

# .NET — EF Core Migrations

Referenzen on-demand lesen — nicht alle vorab laden.

## EF Core Migrations

VERBOTEN: Neue Migrations-Dateien ohne `dotnet ef migrations add` anlegen.

| Bereich | Datei |
|---------|-------|
| Übersicht, Hard Rules & Repo-Layout | [references/ef-migrations/OVERVIEW.md](references/ef-migrations/OVERVIEW.md) |
| Standard-Migration (Tabellen/Spalten) | [references/ef-migrations/op-standard-migration.md](references/ef-migrations/op-standard-migration.md) |
| View-Migration | [references/ef-migrations/op-view-migration.md](references/ef-migrations/op-view-migration.md) |
| PendingModelChanges-Fix | [references/ef-migrations/op-pending-model-changes.md](references/ef-migrations/op-pending-model-changes.md) |
| CLI-Befehle | [references/ef-migrations/cli-commands.md](references/ef-migrations/cli-commands.md) |
| Triplet-Checkliste & Verbotene Muster | [references/ef-migrations/artifact-checklist.md](references/ef-migrations/artifact-checklist.md) |
| View-SQL-Muster & Down()-Symmetrie | [references/ef-migrations/view-and-sql-migrations.md](references/ef-migrations/view-and-sql-migrations.md) |
