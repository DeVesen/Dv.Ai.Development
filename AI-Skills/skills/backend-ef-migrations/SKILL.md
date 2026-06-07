---
name: backend-ef-migrations
description: >
  EF-Core-Migrationen in {database-project} (Postgres): ausschließlich dotnet ef migrations add;
  Triplet-Pflicht (.cs, .Designer.cs, {DbContext}ModelSnapshot); View-SQL für
  {view-name} in Up/Down; database update mit --connection (leere {DbContext}Factory).
  Lesson Learned: manuelle Migration ohne Designer → 42703 column does not exist zur Laufzeit.
  Trigger: EF migration, dotnet ef migrations add, {database-project}/Migrations, {view-name},
  {DbContext}ModelSnapshot, Schema/Spalte/View im Backend, @backend-ef-migrations.
  Opt-out: ohne ef-migration-skill, ohne backend-ef-migrations-skill.
disable-model-invocation: true
---

## Voraussetzungen

- `dotnet-ef` als globales oder lokales Tool verfügbar
- `Microsoft.EntityFrameworkCore.Design` am Startup-Projekt (`{startup-project}`)
- Design-Time Factory (`{DbContext}Factory.cs`) verwendet leeren Npgsql-Connection String → `--connection` bei CLI-Befehlen pflicht

## Repo-Layout

| Element | Pfad-Muster |
|---------|-------------|
| DbContext | `{backend-path}/{database-project}/Context/{DbContext}.cs` |
| Migrations | `{backend-path}/{database-project}/Migrations/` |
| View-Entity | `{database-project}/Entities/{ViewEntity}.cs` |
| Startup | `{backend-path}/{startup-project}/Program.cs` |

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Schema/Spalte/Index anlegen, `migrations add` | Standard-Migration (Tabellen/Spalten) | [references/op-standard-migration.md](references/op-standard-migration.md) |
| `{view-name}`, `{ViewEntity}`, View-Spalte, `42703` | View-Migration | [references/op-view-migration.md](references/op-view-migration.md) |
| `PendingModelChangesWarning`, Snapshot-Drift, `InvalidOperationException` bei `Migrate()` | PendingModelChanges-Fix | [references/op-pending-model-changes.md](references/op-pending-model-changes.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Datei |
|-------|-------|
| CLI-Befehle (`add`, `update`, `list`, `remove`) | [references/cli-commands.md](references/cli-commands.md) |
| Triplet-Checkliste, Verbotene Muster, Symptom-Tabelle | [references/artifact-checklist.md](references/artifact-checklist.md) |
| View-SQL-Muster, `Down()`-Symmetrie | [references/view-and-sql-migrations.md](references/view-and-sql-migrations.md) |

## Opt-out

`ohne ef-migration-skill`, `ohne backend-ef-migrations-skill` → Skill **nicht** laden.
