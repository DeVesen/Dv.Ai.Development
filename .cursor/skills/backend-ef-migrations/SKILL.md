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

## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{backend-path}` | Pfad zum Backend-Projekt innerhalb von `{code-root}` |
| `{agent-index}` | Datei mit der Repository-Agentenübersicht (z. B. `AGENTS.md`) |
| `{database-project}` | Name des EF-Datenbankprojekts (z. B. `MyApp.Database`) |
| `{startup-project}` | Name des Startprojekts mit `db.Database.Migrate()` (z. B. `MyApp.Api`) |
| `{DbContext}` | Basisname des DbContext (z. B. `AppDb` → `AppDbContext`, `AppDbModelSnapshot`) |
| `{view-name}` | Name der SQL-View, falls vorhanden (z. B. `my_search_view`) |
| `{ViewEntity}` | Name der EF-Entity-Klasse für die View (z. B. `MySearchViewEntity`) |

# Backend EF-Migrations ({database-project})

Guardrail-Skill für  Schema- und View-Änderungen in **`{backend-path}/{database-project}`** korrekt per **EF Core CLI** erzeugen und verifizieren — nicht nur kompilieren.

**Lesson Learned:** Manuelle `Migrations/*.cs` ohne `*.Designer.cs` + manuell angepasster Snapshot → `{startup-project}` wendet die Migration nicht an → Laufzeitfehler `42703: column p.Machine does not exist` auf `{view-name}`, obwohl Build/Unit-Tests grün waren. Korrektes Muster: `{backend-path}/{database-project}/Migrations/{timestamp}_{MigrationName}.cs`.

## Hard Rules (zuerst lesen)

1. **Neue Migrationen nur per CLI:** `dotnet ef migrations add` — **VERBOTEN:** neue oder geänderte `Migrations/{timestamp}_{Name}.cs` ohne diesen Befehl (kein Copy-Paste-Paar, kein „nur Up/Down schreiben“).
2. **Triplet-Pflicht vor Commit:** `{Name}.cs` + `{Name}.Designer.cs` + aktualisiertes `{DbContext}ModelSnapshot.cs` — siehe [references/artifact-checklist.md](references/artifact-checklist.md).
3. **VERBOTEN:** nur Snapshot manuell ändern ohne frisches `migrations add` nach Entity-/Model-Änderung.
4. **`{view-name}`:** nach `migrations add` oft leeres `Up()` — vollständiges `DROP VIEW IF EXISTS` + `CREATE VIEW` in `Up()`, Rollback-View in `Down()` — siehe [references/view-and-sql-migrations.md](references/view-and-sql-migrations.md).
5. **Kein „verifiziert“** allein aus `dotnet build` / Unit-Tests: Migration muss auf der Ziel-DB angewendet sein (`database update` oder `{startup-project}`-Start mit `Migrate()`).
6. **Snapshot/Migration nie manuell „nachkorrigieren“:** Änderungen an `nullable`, `IsRequired`, Spaltentypen oder `{DbContext}ModelSnapshot.cs` **ohne** anschließendes `dotnet ef migrations add` führen bei `Database.Migrate()` (EF Core 9+) zu **`PendingModelChangesWarning`** → **`InvalidOperationException`**. Statt Snapshot per Hand anzupassen: **`migrations add`** (ggf. leere Sync-Migration) — siehe [PendingModelChangesWarning](#pendingmodelchangeswarning-migrate).

## Zweck und Non-Goals

**In Scope**

- Tabellen/Spalten/Indizes über EF-Migrationen in `{database-project}`
- SQL-Views (insbesondere `{view-name}`) in generierten Migrationsdateien
- Design-Time-Befehle und Triplet-Checkliste
- Symptom-Diagnose `42703` / fehlende View-Spalte

**Non-Goals**

- Kein EF-Tutorial, keine allgemeine Entity-Doku (bleibt in `{code-root}/.skills/backend-*`)
- Kein Frontend-Schema
- Kein zweiter Skill unter `{code-root}/.skills/` (kanonisch nur hier + Rule + `{agent-index}`)
- Skill führt **keine** Migrationen automatisch aus — nur Anleitung

## Repo-Anker

| Element | Pfad |
|---------|------|
| DbContext | `{backend-path}/{database-project}/Context/{DbContext}.cs` |
| Migrations | `{backend-path}/{database-project}/Migrations/` |
| Design-Time Factory | `{database-project}/Context/{DbContext}Factory.cs` (Npgsql mit **leerem** Connection String) |
| Startup + `Migrate()` | `{backend-path}/{startup-project}/Program.cs` |
| Such-View-Entity | `{database-project}/Entities/{ViewEntity}.cs` → `ToView("{view-name}")` |

**Laufzeit:** Beim Start wendet `{startup-project}` `db.Database.Migrate()` an — nur Migrationen in der EF-Kette mit gültigem Triplet.

## Standard-Workflow (Tabellen/Spalten)

1. Entity / `OnModelCreating` in `{database-project}` anpassen.
2. CLI (CWD `{backend-path}`): siehe [references/cli-commands.md](references/cli-commands.md).
3. Diff prüfen: `.Designer.cs` und `{DbContext}ModelSnapshot.cs` müssen mit der Entity-Änderung konsistent sein.
4. Optional lokal: `dotnet ef database update` mit `--connection` (Factory liefert keinen String).
5. Triplet-Checkliste abschließen.
6. Bei Backend-Umsetzung zusätzlich [Implementation Workflow](../implementation-workflow/SKILL.md): Build/Test — ersetzt **nicht** den DB-Anwendungs-Check.

## View-Workflow (`{view-name}`)

1. Zuerst Entity-Eigenschaft(en) am `{ViewEntity}` (und ggf. Search-Service-Spalten) anpassen.
2. `dotnet ef migrations add <Name>` — erzeugt Triplet; `Up()`/`Down()` können leer oder unvollständig sein.
3. SQL aus letzter View-Migration kopieren/anpassen — Kanon: `Add{Feature}To{ViewEntity}` (projektspezifischer Migrationsname).
4. Details: [references/view-and-sql-migrations.md](references/view-and-sql-migrations.md).

## PendingModelChangesWarning (`Migrate`)

**Symptom (typisch EF Core 9+, `{startup-project}` Zeile `db.Database.Migrate()`):**

```text
InvalidOperationException: … PendingModelChangesWarning: The model for context '{DbContext}' has pending changes.
Add a new migration before updating the database.
```

**Ursache:** Das **aktuelle** Entity-Modell (DbContext + Entities + Konfiguration) stimmt **nicht** mit dem letzten Stand in `{DbContext}ModelSnapshot.cs` überein. Häufige Auslöser in diesem Repo:

- `{DbContext}ModelSnapshot.cs` oder eine bestehende `Migrations/*.cs` **manuell** geändert (z. B. `IsRequired()` entfernt, `nullable: false` → `true`), **ohne** neues `dotnet ef migrations add`
- Entity-Property geändert (`JsonDocument?` vs. `JsonDocument`), Designer/Snapshot nicht per CLI aktualisiert

**Pflicht-Fix (CWD `{backend-path}`):**

1. Entity/Model auf den gewünschten Endzustand bringen.
2. Prüfen: `dotnet ef migrations has-pending-model-changes --project {database-project} --startup-project {startup-project}`  
   - Ausgabe **„Changes have been made…“** → Schritt 3.  
   - **„No changes…“** → Modell und Snapshot sind synchron; anderes Problem (z. B. alte DLL, falsches Projekt).
3. `dotnet ef migrations add <BeschreibenderName> --project {database-project} --startup-project {startup-project}`
4. Migration prüfen:
   - Enthält `Up()`/`Down()` die erwarteten DDL-Schritte → committen.
   - Ist `Up()`/`Down()` **leer** → **trotzdem behalten** (Sync-Migration); sie gleicht nur Snapshot und Modell ab (z. B. nach manueller Nullable-Korrektur).
5. `dotnet ef migrations has-pending-model-changes` erneut → muss **„No changes…“** melden.
6. DB anwenden: `dotnet ef database update --project {database-project} --startup-project {startup-project} --connection "<connection-string>"` **oder** `{startup-project}` neu starten (`Migrate()`).

**VERBOTEN als Dauerlösung:** Warnung in `OnConfiguring`/`AddDbContext` unterdrücken (`ConfigureWarnings` → `Ignore(PendingModelChangesWarning)`), solange das Modell wirklich vom Snapshot abweicht — das verschleiert Schema-Drift.

## Verifikation (Pflicht bei Schema-Tasks)

| Check | Wie |
|-------|-----|
| Triplet vorhanden | Drei Dateien: `.cs`, `.Designer.cs`, Snapshot aktualisiert |
| Modell synchron | `dotnet ef migrations has-pending-model-changes` → **No changes** |
| Migration in Kette | `dotnet ef migrations list` — neue Migration sichtbar |
| DB angewendet | `database update` **oder** {startup-project}-Neustart; `__EFMigrationsHistory` enthält Timestamp |
| View-Spalte existiert | Bei View-Änderung: Spalte in Postgres prüfen oder Such-API ohne `42703` |
| Symptom 42703 | Migration nicht angewendet **oder** View-SQL in `Up()` fehlt/falsch — [artifact-checklist.md](references/artifact-checklist.md) |
| Symptom PendingModelChanges | Snapshot/Modell-Drift — Abschnitt [PendingModelChangesWarning](#pendingmodelchangeswarning-migrate) |

## Zusammenspiel

- **[Implementation Workflow](../implementation-workflow/SKILL.md):** Hard Gate Zeile 5 (Migrationen/Risiko) — bei EF-Scope diesen Skill laden; Backend-Build/Test zusätzlich, nicht als Ersatz für DB-Check.
- **Domain-Skills** (`{code-root}/.skills/backend-experiment`, `backend-search`): fachliche API — Schema-Änderungen **hier**.

## Reporting (Abschluss)

Kurz dokumentieren:

- Migrationsname (`{timestamp}_{Name}`)
- Betroffene Tabelle/View/Spalte
- Ziel-DB (Host/Database-Name, **ohne** Passwort)
- Angewendet: ja/nein (`database update` / `Migrate()`)
- Bei Fehler: Postgres-Code (z. B. `42703`) + vermutete Ursache aus Checkliste

## Referenzen

- [references/cli-commands.md](references/cli-commands.md) — `add`, `update`, `list`, `remove`
- [references/artifact-checklist.md](references/artifact-checklist.md) — Triplet, Orphans, Symptome
- [references/view-and-sql-migrations.md](references/view-and-sql-migrations.md) — `{view-name}`

## Opt-out

`ohne ef-migration-skill`, `ohne backend-ef-migrations-skill` → diesen Skill **nicht** laden.

## Pflege

Nach Trigger-Änderungen: Rule ⊇ Skill-`description` ⊇ `{agent-index}`-Absatz (siehe [`.cursor/rules/backend-ef-migrations-skill.mdc`](../../rules/backend-ef-migrations-skill.mdc)).
