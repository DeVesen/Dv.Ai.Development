# Azure DevOps für ein Projekt einrichten

Auslöser: „ADO einrichten“, „Azure DevOps für dieses Projekt einrichten“, oder `ado-setup.js show`
meldet fehlende bzw. ungültige `.claude/ado.json`.

`<SETUP>` = `node "<PLUGIN>/scripts/ado-setup.js"`. Alle Aufrufe im Projektordner
(Haupt-Checkout oder Worktree; das Skript schreibt immer in den Haupt-Checkout).

## Ablauf

1. **Werte vorschlagen:** `<SETUP> suggest`. Liefert `organization`, `project`, `repository` aus
   `git remote get-url origin` (Format `https://<org>@dev.azure.com/<org>/<project>/_git/<repo>`,
   Projekt URL-dekodiert). Dem Nutzer zeigen und bestätigen lassen; fehlende Werte erfragen.
2. **Erfragen:** Tenant-ID (GUID des Azure-Directorys der Org), Benutzerkonto (UPN, z. B.
   `name@firma.de`), PR-Ziel-Branch (z. B. `dev`). Nie raten.
3. **Schreiben**, nach Bestätigung der Werte:

   ```bash
   <SETUP> write --organization "<url>" --project "<projekt>" --repository "<repo>" \
     --tenant "<guid>" --user "<upn>" --pr-target "<branch>"
   ```

   Das Skript prüft mit `git check-ignore`, dass `.claude/azure/` und `.claude/ado.json`
   ignoriert sind. Sonst Abbruch (Exit 1): dem Nutzer sagen, welche Einträge in `.gitignore`
   fehlen. Die `.gitignore` ändert der Agent nur auf ausdrücklichen Wunsch.
   Bei Erfolg: `.claude/ado.json`, Ordner `.claude/azure/`, Eintrag `env.AZURE_CONFIG_DIR`
   (absoluter Pfad) in `.claude/settings.local.json`, Eintrag `.claude/settings.local.json` in `.worktreeinclude` (Worktrees der Claude-App bekommen die Variable so mit); bestehende Einträge bleiben.
4. **Session neu starten** lassen. `env` aus den Settings gilt erst ab der nächsten Session;
   bis dahin blockiert der Hook alle Azure-DevOps-Befehle.
5. **Login durch den Nutzer** — Befehl aus `<SETUP> login-command` nennen. Der Agent führt den
   Login nie aus (auch nicht das Skript); der Hook blockiert es.
6. **Prüfen**, in der neuen Session: `<SETUP> check-identity` (Exit 0 = passt). Danach einmal:

   ```bash
   az devops configure --defaults organization="<ORG>" project="<PROJECT>"
   ```

   Wirkt nur im Projekt-Config-Ordner, andere Projekte bleiben unberührt.

## Sicherheit

- In `.claude/azure/` liegen Zugangstokens. Inhalte nie lesen, ausgeben oder kopieren.
- Der Ordner gehört in keinen Index (graphify, codebase-analyzer), in kein Review-Paket und
  in keinen Commit.
- `.claude/ado.json` enthält keine Secrets, ist aber pro Rechner/Nutzer und bleibt deshalb
  ebenfalls ungetrackt.

## Migration von 0.1.x

Bisher lag die Anmeldung im globalen `%USERPROFILE%\.azure`. Pro Projekt einmal einrichten
und neu anmelden; den globalen Ordner lässt der Skill unangetastet.
