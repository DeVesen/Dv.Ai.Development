# Op: PendingModelChangesWarning (`Migrate`)

## Symptom (typisch EF Core 9+)

```text
InvalidOperationException: … PendingModelChangesWarning: The model for context '{DbContext}' has pending changes.
Add a new migration before updating the database.
```

Auslöser (beim Start von `{startup-project}`, Zeile `db.Database.Migrate()`).

## Ursache

Das **aktuelle** Entity-Modell (DbContext + Entities + Konfiguration) stimmt **nicht** mit dem letzten Stand in `{DbContext}ModelSnapshot.cs` überein. Häufige Auslöser:

- `{DbContext}ModelSnapshot.cs` oder eine bestehende `Migrations/*.cs` **manuell** geändert (z. B. `IsRequired()` entfernt, `nullable: false` → `true`), **ohne** neues `dotnet ef migrations add`
- Entity-Property geändert (`JsonDocument?` vs. `JsonDocument`), Designer/Snapshot nicht per CLI aktualisiert

## Pflicht-Fix (CWD `{backend-path}`)

1. Entity/Model auf den gewünschten Endzustand bringen.
2. Prüfen:
   ```powershell
   dotnet ef migrations has-pending-model-changes --project {database-project} --startup-project {startup-project}
   ```
   - Ausgabe **„Changes have been made…"** → Schritt 3.
   - **„No changes…"** → Modell und Snapshot sind synchron; anderes Problem (z. B. alte DLL, falsches Projekt).
3. ```powershell
   dotnet ef migrations add <BeschreibenderName> --project {database-project} --startup-project {startup-project}
   ```
4. Migration prüfen:
   - Enthält `Up()`/`Down()` die erwarteten DDL-Schritte → committen.
   - Ist `Up()`/`Down()` **leer** → **trotzdem behalten** (Sync-Migration); sie gleicht nur Snapshot und Modell ab.
5. `dotnet ef migrations has-pending-model-changes` erneut → muss **„No changes…"** melden.
6. DB anwenden:
   ```powershell
   dotnet ef database update --project {database-project} --startup-project {startup-project} --connection "<connection-string>"
   ```
   **oder** `{startup-project}` neu starten (`Migrate()`).

## VERBOTEN als Dauerlösung

Warnung in `OnConfiguring`/`AddDbContext` unterdrücken (`ConfigureWarnings` → `Ignore(PendingModelChangesWarning)`), solange das Modell wirklich vom Snapshot abweicht — das verschleiert Schema-Drift.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Weiterführend

- CLI-Befehle: [cli-commands.md](cli-commands.md)
- Triplet-Checkliste: [artifact-checklist.md](artifact-checklist.md)
