---
name: dotnet
description: >
  .NET / C# backend development: EF Core migrations (Postgres), schema changes,
  Views, ModelSnapshot, PendingModelChanges. Trigger: EF migration, dotnet ef
  migrations add, Migrations-Ordner, ModelSnapshot, Schema/Spalte/View im Backend,
  42703 column does not exist, @dotnet, @ef-migration.
  Opt-out: ohne dotnet.
---

# .NET

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
