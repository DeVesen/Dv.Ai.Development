# ADO-MCP Init — .mcp.json einrichten

## Ablauf

1. **Frage den User (sequenziell, eine Frage pro Schritt):**

   a. *„Wie lautet deine Azure DevOps Organisation? (z. B. `contoso` aus `https://dev.azure.com/contoso`)"*
   b. *„Authentifizierung: interaktiv (Browser-Login), PAT, oder Azure CLI (`az login`)?"*
   c. Nur bei PAT: *„Gib deinen PAT als base64-codierten String `email:pat` an, oder tippe ihn ein — ich schreibe ihn in `PERSONAL_ACCESS_TOKEN`."*

2. **Lies `.mcp.json` im aktuellen Arbeitsverzeichnis** (falls vorhanden).

3. **Füge den `ado`-Eintrag hinzu** (oder ersetze ihn wenn er bereits existiert):

### Interaktiv (Standard — Browser-Login)
```json
"ado": {
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "<org>"]
}
```

### PAT-Authentifizierung
```json
"ado": {
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "<org>", "--authentication", "pat"],
  "env": {
    "PERSONAL_ACCESS_TOKEN": "<base64(email:pat)>"
  }
}
```

### Azure CLI (`az login` vorab)
```json
"ado": {
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "<org>", "--authentication", "azcli"]
}
```

4. **Schreibe die aktualisierte `.mcp.json` zurück.**
   - Datei existiert nicht → anlegen mit `{ "mcpServers": { ... } }`
   - Datei existiert → bestehende Server behalten, `ado`-Eintrag hinzufügen/ersetzen

5. **Bestätige:**
   *„`ado` wurde in `.mcp.json` eingetragen. Claude Code neu starten — danach ist der MCP verfügbar."*

---

## Sicherheitshinweis

PAT-Token **nicht** in `.mcp.json` committen wenn das Repo geteilt wird.
Alternative: Token über OS-Umgebungsvariable setzen und aus `env` weglassen — das MCP liest `PERSONAL_ACCESS_TOKEN` auch aus dem Prozess-Environment.

---

## PAT erstellen (Kurzreferenz)

URL: `https://dev.azure.com/<org>/_usersSettings/tokens`
Benötigte Scopes: **Work Items (Read & Write)**, **Project and Team (Read)**

base64-Encoding (PowerShell):
```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("email@domain.com:meinPAT"))
```
