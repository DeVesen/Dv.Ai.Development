---
name: backend-ef-migrations
description: >
  EF-Core-Migrationen im Datenbank-Projekt (Postgres): ausschließlich dotnet ef migrations add;
  Triplet-Pflicht (.cs, .Designer.cs, {DbContext}ModelSnapshot); View-SQL in Up/Down;
  database update mit --connection (leere {DbContext}Factory).
  Lesson Learned: manuelle Migration ohne Designer → 42703 column does not exist zur Laufzeit.
  Trigger: EF migration, dotnet ef migrations add, Migrations-Ordner, ModelSnapshot,
  Schema/Spalte/View im Backend, @backend-ef-migrations.
  Opt-out: ohne ef-migration-skill, ohne backend-ef-migrations-skill.
when_to_use: >
  Aktiviere sobald EF-Migrationen, Datenbankschema, neue Spalten/Tabellen/Views oder
  dotnet ef Befehle im Spiel sind. Auch bei Postgres-Fehler 42703 oder PendingModelChangesWarning.
  Nicht bei reinen Lese-Fragen ohne Schema-Änderung.
---

## Hard Rules (zuerst lesen)

**VERBOTEN: Neue Migrations-Dateien ohne `dotnet ef migrations add` anlegen.**

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

| VERBOTEN | Richtig |
|----------|---------|
| Neue oder geänderte `Migrations/{timestamp}_{Name}.cs` ohne CLI | `dotnet ef migrations add` ausführen |
| Nur Snapshot manuell ändern ohne frisches `migrations add` | Entity/Model anpassen, dann CLI |
| Snapshot/Migration manuell nachkorrigieren (nullable/`IsRequired`) | `migrations add` erzwingt korrekten Snapshot |
| Timestamp per Hand ohne `migrations add` | Kein gültiger Designer, keine Kette |

**Pflicht-Triplet vor Commit:** `.cs` + `.Designer.cs` + aktualisiertes `{DbContext}ModelSnapshot.cs`

**Nach Entity-/Snapshot-Änderung:** `dotnet ef migrations has-pending-model-changes` muss **No changes** melden, bevor `Migrate()` als „fertig" gilt.

**Kein „verifiziert"** allein aus `dotnet build` / Unit-Tests: Migration muss auf der Ziel-DB angewendet sein.

## Voraussetzungen

- `dotnet-ef` als globales oder lokales Tool verfügbar
- `Microsoft.EntityFrameworkCore.Design` am Startup-Projekt
- Design-Time Factory (`{DbContext}Factory.cs`) verwendet leeren Npgsql-Connection String → `--connection` bei CLI-Befehlen Pflicht

## Repo-Layout

| Element | Pfad-Muster |
|---------|-------------|
| DbContext | `{backend-path}/{database-project}/Context/{DbContext}.cs` |
| Migrations | `{backend-path}/{database-project}/Migrations/` |
| View-Entity | `{database-project}/Entities/{ViewEntity}.cs` |
| Startup | `{backend-path}/{startup-project}/Program.cs` |

**Hinweis:** `{backend-path}`, `{database-project}`, `{DbContext}`, `{startup-project}` sind projektspezifisch — vom Nutzer oder aus Kontext ableiten.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Schema/Spalte/Index anlegen, `migrations add` | Standard-Migration (Tabellen/Spalten) | [references/op-standard-migration.md](references/op-standard-migration.md) |
| View-Name, ViewEntity, View-Spalte, `42703` | View-Migration | [references/op-view-migration.md](references/op-view-migration.md) |
| `PendingModelChangesWarning`, Snapshot-Drift, `InvalidOperationException` bei `Migrate()` | PendingModelChanges-Fix | [references/op-pending-model-changes.md](references/op-pending-model-changes.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Geteilte Referenzen

| Thema | Datei |
|-------|-------|
| CLI-Befehle (`add`, `update`, `list`, `remove`) | [references/cli-commands.md](references/cli-commands.md) |
| Triplet-Checkliste, Verbotene Muster, Symptom-Tabelle | [references/artifact-checklist.md](references/artifact-checklist.md) |
| View-SQL-Muster, `Down()`-Symmetrie | [references/view-and-sql-migrations.md](references/view-and-sql-migrations.md) |

## Nicht auslösen

- Reine Lese-Fragen zu bestehenden Migrationen ohne Schema-Änderung
- Reines CRUD/API ohne DB-Schema
- Reine Erklärung: „Was steht im Skill?" ohne Migrations-Auftrag

## Opt-out

`ohne ef-migration-skill`, `ohne backend-ef-migrations-skill` → Skill **nicht** laden.

Keine Code-Beispiele ohne explizite Nachfrage.
