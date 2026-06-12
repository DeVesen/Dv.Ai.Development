# Op: Standard-Migration (Tabellen/Spalten)

## Hard Rules (zuerst lesen)

1. **Neue Migrationen nur per CLI:** `dotnet ef migrations add` — **VERBOTEN:** neue oder geänderte `Migrations/{timestamp}_{Name}.cs` ohne diesen Befehl (kein Copy-Paste-Paar, kein „nur Up/Down schreiben").
2. **Triplet-Pflicht vor Commit:** `{Name}.cs` + `{Name}.Designer.cs` + aktualisiertes `{DbContext}ModelSnapshot.cs` — siehe [artifact-checklist.md](artifact-checklist.md).
3. **VERBOTEN:** nur Snapshot manuell ändern ohne frisches `migrations add` nach Entity-/Model-Änderung.
4. **Kein „verifiziert"** allein aus `dotnet build` / Unit-Tests: Migration muss auf der Ziel-DB angewendet sein (`database update` oder `{startup-project}`-Start mit `Migrate()`).

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Workflow

1. Entity / `OnModelCreating` im Datenbankprojekt anpassen.
2. CLI (CWD `{backend-path}`): siehe [cli-commands.md](cli-commands.md).
3. Diff prüfen: `.Designer.cs` und `{DbContext}ModelSnapshot.cs` müssen mit der Entity-Änderung konsistent sein.
4. Optional lokal: `dotnet ef database update` mit `--connection` (Factory liefert keinen String).
5. Triplet-Checkliste abschließen: [artifact-checklist.md](artifact-checklist.md).

## Repo-Anker

| Element | Pfad |
|---------|------|
| DbContext | `{backend-path}/{database-project}/Context/{DbContext}.cs` |
| Migrations | `{backend-path}/{database-project}/Migrations/` |
| Design-Time Factory | `{database-project}/Context/{DbContext}Factory.cs` (Npgsql mit **leerem** Connection String) |
| Startup + `Migrate()` | `{backend-path}/{startup-project}/Program.cs` |

**Laufzeit:** Beim Start wendet `{startup-project}` `db.Database.Migrate()` an — nur Migrationen in der EF-Kette mit gültigem Triplet.

## Verifikation (Pflicht)

| Check | Wie |
|-------|-----|
| Triplet vorhanden | Drei Dateien: `.cs`, `.Designer.cs`, Snapshot aktualisiert |
| Modell synchron | `dotnet ef migrations has-pending-model-changes` → **No changes** |
| Migration in Kette | `dotnet ef migrations list` — neue Migration sichtbar |
| DB angewendet | `database update` **oder** `{startup-project}`-Neustart; `__EFMigrationsHistory` enthält Timestamp |

## Reporting (Abschluss)

- Migrationsname (`{timestamp}_{Name}`)
- Betroffene Tabelle/Spalte
- Ziel-DB (Host/Database-Name, **ohne** Passwort)
- Angewendet: ja/nein (`database update` / `Migrate()`)
- Bei Fehler: Postgres-Code + vermutete Ursache aus [artifact-checklist.md](artifact-checklist.md)
