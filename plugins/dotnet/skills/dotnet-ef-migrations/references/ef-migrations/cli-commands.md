# EF CLI — Migrationen

Alle Operationen direkt über `dotnet ef` im Ordner `{backend-path}`.

**Connection-String nie in den Befehl schreiben:** einmal die Umgebungsvariable `EF_CONNECTION` setzen (Wert aus `appsettings.Development.json` → `ConnectionStrings:Database`), im Befehl nur `$env:EF_CONNECTION`. So erscheint er weder im Chat noch im Protokoll.

**Hinweis:** `{backend-path}`, `{database-project-name}`, `{startup-project-name}`, `{DbContext}` sind projektspezifisch — aus Kontext ableiten.

## Voraussetzungen

- `dotnet-ef` als globales oder lokales Tool verfügbar
- `Microsoft.EntityFrameworkCore.Design` am Startup-Projekt (`{startup-project-name}`)
- Dev-Connection-String aus `{startup-project-name}/appsettings.Development.json` → `ConnectionStrings:Database` (für `database update`/`migrations list` über `EF_CONNECTION`, nie in den Chat kopieren)

## Migration anlegen (Pflicht)

```
dotnet ef migrations add <PascalCase-Name> --project {database-project-name} --startup-project {startup-project-name}
# z. B. AddMachineToParameterSearchView
```

**Nach dem Aufruf prüfen:**

- `{database-project-name}/Migrations/{timestamp}_{Name}.cs`
- `{database-project-name}/Migrations/{timestamp}_{Name}.Designer.cs`
- `{database-project-name}/Migrations/{DbContext}ModelSnapshot.cs` geändert

## Migrationen auflisten

```
dotnet ef migrations list --project {database-project-name} --startup-project {startup-project-name} --connection "$env:EF_CONNECTION"
# --connection empfohlen, {DbContext}Factory setzt sonst leeren Npgsql-String
```

## Datenbank aktualisieren (lokal)

`{DbContext}Factory` (`{backend-path}/{database-project-name}/Context/{DbContext}Factory.cs`) verwendet `UseNpgsql("")` — **ohne** `--connection` schlägt Design-Time oft fehl.

```
dotnet ef database update --project {database-project-name} --startup-project {startup-project-name} --connection "$env:EF_CONNECTION"
```

Optional auf eine bestimmte Migration: `dotnet ef database update <MigrationName> …`.

## Letzte Migration entfernen (nur vor Deploy)

Nur wenn die Migration **noch nicht** auf gemeinsame/Produktions-DBs angewendet wurde:

```
dotnet ef migrations remove --project {database-project-name} --startup-project {startup-project-name}
```

Entfernt die letzte Migration inkl. Designer und setzt den Snapshot zurück. Bei Fehlstart mit orphan `.cs` ohne Designer: Datei manuell löschen, Entity korrigieren, `dotnet ef migrations add` erneut ausführen.

## Pending-Model-Changes prüfen (Verify-Schritt)

```
dotnet ef migrations has-pending-model-changes --project {database-project-name} --startup-project {startup-project-name}
```

Exit-Code ungleich 0 bzw. Meldung „changes have been made“ → Modell und letzte Migration weichen ab, `migrations add` fehlt noch.

## Laufzeit (ohne CLI)

`{startup-project-name}` ruft beim Start `db.Database.Migrate()` auf. Das wendet alle ausstehenden Migrationen der EF-Kette an — **nicht** handgeschriebene Dateien ohne Designer-Eintrag in der Kette.
