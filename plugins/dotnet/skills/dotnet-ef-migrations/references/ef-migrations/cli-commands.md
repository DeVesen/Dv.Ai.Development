# EF CLI — Migrationen

Alle Operationen über **`mcp__dev-mcp__run_ef_migration`** — kein Shell-`dotnet ef` mehr.

**Hinweis:** `{backend-path}`, `{database-project-name}`, `{startup-project-name}`, `{DbContext}` sind projektspezifisch — aus Kontext ableiten.

## Voraussetzungen

- `dotnet-ef` als globales oder lokales Tool verfügbar
- `Microsoft.EntityFrameworkCore.Design` am Startup-Projekt (`{startup-project-name}`)
- Dev-Connection-String aus `{startup-project-name}/appsettings.Development.json` → `ConnectionStrings:Database` (für `database-update`/`list`/`has-pending-model-changes` nur lokal, nicht in den Chat kopieren — `connection`-Parameter wird von `run_ef_migration` nicht ins Tool-Call-Log oder die Console-Ausgabe geschrieben)

## Migration anlegen (Pflicht)

```
run_ef_migration(
  action: "add",
  backend_path: "{backend-path}",
  database_project: "{database-project-name}",
  startup_project: "{startup-project-name}",
  name: "<PascalCase-Name>"   // z. B. AddMachineToParameterSearchView
)
```

**Nach dem Aufruf prüfen:**

- `{database-project-name}/Migrations/{timestamp}_{Name}.cs`
- `{database-project-name}/Migrations/{timestamp}_{Name}.Designer.cs`
- `{database-project-name}/Migrations/{DbContext}ModelSnapshot.cs` geändert

## Migrationen auflisten

```
run_ef_migration(
  action: "list",
  backend_path: "{backend-path}",
  database_project: "{database-project-name}",
  startup_project: "{startup-project-name}",
  connection: "<ConnectionStrings:Database aus appsettings.Development.json>"   // empfohlen, {DbContext}Factory setzt sonst leeren Npgsql-String
)
```

## Datenbank aktualisieren (lokal)

`{DbContext}Factory` (`{backend-path}/{database-project-name}/Context/{DbContext}Factory.cs`) verwendet `UseNpgsql("")` — **ohne** `connection` schlägt Design-Time oft fehl.

```
run_ef_migration(
  action: "database-update",
  backend_path: "{backend-path}",
  database_project: "{database-project-name}",
  startup_project: "{startup-project-name}",
  connection: "<ConnectionStrings:Database>"
)
```

Optional auf eine bestimmte Migration mit `target_migration: "<MigrationName>"`.

## Letzte Migration entfernen (nur vor Deploy)

Nur wenn die Migration **noch nicht** auf gemeinsame/Produktions-DBs angewendet wurde:

```
run_ef_migration(
  action: "remove",
  backend_path: "{backend-path}",
  database_project: "{database-project-name}",
  startup_project: "{startup-project-name}"
)
```

Entfernt die letzte Migration inkl. Designer und setzt den Snapshot zurück. Bei Fehlstart mit orphan `.cs` ohne Designer: Datei manuell löschen, Entity korrigieren, `action: "add"` erneut ausführen.

## Pending-Model-Changes prüfen (Verify-Schritt)

```
run_ef_migration(
  action: "has-pending-model-changes",
  backend_path: "{backend-path}",
  database_project: "{database-project-name}",
  startup_project: "{startup-project-name}"
)
```

Ergebnis `Success: false` → Modell und letzte Migration weichen ab, `action: "add"` fehlt noch.

## Laufzeit (ohne CLI)

`{startup-project-name}` ruft beim Start `db.Database.Migrate()` auf. Das wendet alle ausstehenden Migrationen der EF-Kette an — **nicht** handgeschriebene Dateien ohne Designer-Eintrag in der Kette.
