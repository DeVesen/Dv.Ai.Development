## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{backend-path}` | Pfad zum Backend-Projekt innerhalb von `{code-root}` |

# EF CLI — {database-project}

Alle Befehle mit Arbeitsverzeichnis **`{backend-path}`**.

## Voraussetzungen

- `dotnet-ef` als globales oder lokales Tool verfügbar
- `Microsoft.EntityFrameworkCore.Design` am Startup-Projekt (`{startup-project}`)
- Dev-Connection-String aus `{startup-project}/appsettings.Development.json` → `ConnectionStrings:Database` (für `database update` nur lokal, nicht in den Chat kopieren)

## Migration anlegen (Pflicht)

```powershell
cd {backend-path}
dotnet ef migrations add <Name> --project {database-project} --startup-project {startup-project}
```

Ersetze `<Name>` durch einen PascalCase-Namen (z. B. `AddMachineToParameterSearchView`).

**Nach dem Befehl prüfen:**

- `{database-project}/Migrations/{timestamp}_{Name}.cs`
- `{database-project}/Migrations/{timestamp}_{Name}.Designer.cs`
- `{database-project}/Migrations/{DbContext}ModelSnapshot.cs` geändert

## Migrationen auflisten

```powershell
cd {backend-path}
dotnet ef migrations list --project {database-project} --startup-project {startup-project}
```

Mit Connection (empfohlen, weil `{DbContext}Factory` einen leeren Npgsql-String setzt):

```powershell
dotnet ef migrations list --project {database-project} --startup-project {startup-project} --connection "<ConnectionStrings:Database aus appsettings.Development.json>"
```

## Datenbank aktualisieren (lokal)

`{DbContext}Factory` (`{backend-path}/{database-project}/Context/{DbContext}Factory.cs`) verwendet `UseNpgsql("")` — **ohne** `--connection` schlägt Design-Time oft fehl.

```powershell
cd {backend-path}
dotnet ef database update --project {database-project} --startup-project {startup-project} --connection "<ConnectionStrings:Database>"
```

Optional auf eine bestimmte Migration:

```powershell
dotnet ef database update <MigrationName> --project {database-project} --startup-project {startup-project} --connection "<connection>"
```

## Letzte Migration entfernen (nur vor Deploy)

Nur wenn die Migration **noch nicht** auf gemeinsame/Produktions-DBs angewendet wurde:

```powershell
cd {backend-path}
dotnet ef migrations remove --project {database-project} --startup-project {startup-project}
```

Entfernt die letzte Migration inkl. Designer und setzt den Snapshot zurück. Bei Fehlstart mit orphan `.cs` ohne Designer: Datei manuell löschen, Entity korrigieren, `migrations add` erneut ausführen.

## Laufzeit (ohne CLI)

`{startup-project}` ruft beim Start `db.Database.Migrate()` auf (`{backend-path}/{startup-project}/Program.cs`). Das wendet alle ausstehenden Migrationen der EF-Kette an — **nicht** handgeschriebene Dateien ohne Designer-Eintrag in der Kette.
