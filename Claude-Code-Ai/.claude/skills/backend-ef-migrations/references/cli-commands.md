# EF CLI — Migrationen

Alle Befehle mit Arbeitsverzeichnis **`{backend-path}`**.

**Hinweis:** `{backend-path}`, `{database-project-name}`, `{startup-project-name}`, `{DbContext}` sind projektspezifisch — aus Kontext ableiten.

## Voraussetzungen

- `dotnet-ef` als globales oder lokales Tool verfügbar
- `Microsoft.EntityFrameworkCore.Design` am Startup-Projekt (`{startup-project-name}`)
- Dev-Connection-String aus `{startup-project-name}/appsettings.Development.json` → `ConnectionStrings:Database` (für `database update` nur lokal, nicht in den Chat kopieren)

## Migration anlegen (Pflicht)

```powershell
cd {backend-path}
dotnet ef migrations add <Name> --project {database-project-name} --startup-project {startup-project-name}
```

Ersetze `<Name>` durch einen PascalCase-Namen (z. B. `AddMachineToParameterSearchView`).

**Nach dem Befehl prüfen:**

- `{database-project-name}/Migrations/{timestamp}_{Name}.cs`
- `{database-project-name}/Migrations/{timestamp}_{Name}.Designer.cs`
- `{database-project-name}/Migrations/{DbContext}ModelSnapshot.cs` geändert

## Migrationen auflisten

```powershell
cd {backend-path}
dotnet ef migrations list --project {database-project-name} --startup-project {startup-project-name}
```

Mit Connection (empfohlen, weil `{DbContext}Factory` einen leeren Npgsql-String setzt):

```powershell
dotnet ef migrations list --project {database-project-name} --startup-project {startup-project-name} --connection "<ConnectionStrings:Database aus appsettings.Development.json>"
```

## Datenbank aktualisieren (lokal)

`{DbContext}Factory` (`{backend-path}/{database-project-name}/Context/{DbContext}Factory.cs`) verwendet `UseNpgsql("")` — **ohne** `--connection` schlägt Design-Time oft fehl.

```powershell
cd {backend-path}
dotnet ef database update --project {database-project-name} --startup-project {startup-project-name} --connection "<ConnectionStrings:Database>"
```

Optional auf eine bestimmte Migration:

```powershell
dotnet ef database update <MigrationName> --project {database-project-name} --startup-project {startup-project-name} --connection "<connection>"
```

## Letzte Migration entfernen (nur vor Deploy)

Nur wenn die Migration **noch nicht** auf gemeinsame/Produktions-DBs angewendet wurde:

```powershell
cd {backend-path}
dotnet ef migrations remove --project {database-project-name} --startup-project {startup-project-name}
```

Entfernt die letzte Migration inkl. Designer und setzt den Snapshot zurück. Bei Fehlstart mit orphan `.cs` ohne Designer: Datei manuell löschen, Entity korrigieren, `migrations add` erneut ausführen.

## Laufzeit (ohne CLI)

`{startup-project-name}` ruft beim Start `db.Database.Migrate()` auf. Das wendet alle ausstehenden Migrationen der EF-Kette an — **nicht** handgeschriebene Dateien ohne Designer-Eintrag in der Kette.
