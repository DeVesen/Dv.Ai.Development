# dv-workitems

Workitems spezifizieren und anlegen: vom rohen Wunsch zu entwicklungsfertigen Stories, bis hinein in Azure DevOps.

## Skills

| Skill | Wofür |
|---|---|
| `requirement-definition` | Wunsch im Chat zu einem kompakten Requirement klaeren und eine Empfehlung geben, wie es in Steps geschnitten wird; legt nichts ab, Akzeptanzkriterien auf Nutzerebene, Grenzen in `limits.json` |
| `writing-workitem` | Titel und Description einer User Story für Azure DevOps schreiben, WAS statt WIE, testbare Akzeptanzkriterien |
| `definition-of-ready` | Requirement, Spec, Plan oder Workitem gegen die Definition of Ready prüfen, mit Urteil je Kriterium, Lückenliste und Empfehlung für den Ready-Review |
| `ado-cli` | Einziger Weg zu Azure DevOps über die Azure CLI (`az` + `azure-devops`): Work Items lesen, anlegen und eng begrenzt ändern, Pull Requests mit Reviewern und Kommentar-Threads, WIQL, `az devops invoke`; Schreiben jeweils nach Bestätigung, immer mit der Identität des Projekts |

## Einrichten

```text
/plugin install dv-workitems@dv-ai-development
```

## Azure DevOps pro Projekt (ab 0.2.0)

Jedes Projekt hat seine eigene Azure-DevOps-Identität. Die Azure CLI speichert Login,
Token-Cache und `az devops`-Defaults in `AZURE_CONFIG_DIR`. Das Plugin legt diesen Ordner pro
Projekt nach `<Haupt-Checkout>/.claude/azure`. Projekte mit verschiedenen Orgs, Tenants und
Konten bleiben so getrennt angemeldet, auch bei parallelen Sessions.

### Projekt-Konfiguration `.claude/ado.json`

```json
{
  "organization": "https://dev.azure.com/<org>",
  "project": "<Projektname>",
  "repository": "<repo>",
  "tenantId": "<tenant-guid>",
  "user": "<user@domain>",
  "prTargetBranch": "dev"
}
```

Alle Felder sind Pflicht. `organization` ist eine `https://dev.azure.com/<org>`-URL, `tenantId` eine GUID.
Skill, Hook und Skripte lesen nur diese Werte; im Plugin steht keine Org, kein Projekt, kein User.
Fehlt die Datei, führt `ado-cli` keine Azure-DevOps-Aktion aus und bietet die Einrichtung an.

Worktrees unter `.claude/worktrees/<name>` nutzen `ado.json` und Config-Ordner des Haupt-Checkouts.
Der Haupt-Checkout wird über `git rev-parse --path-format=absolute --git-common-dir` ermittelt.
Dessen Elternordner ist der Haupt-Checkout.

Eine Session in einem Worktree braucht dort trotzdem `env.AZURE_CONFIG_DIR`. Die Einrichtung trägt deshalb
`.claude/settings.local.json` in `.worktreeinclude` ein. Worktrees, die Claude Code anlegt, kopieren die
Datei dann mit, und der absolute Pfad zeigt weiter auf den Haupt-Checkout.
Bei Worktrees von Hand (`git worktree add`) fehlt die Datei. Der Hook blockiert dann DevOps-Befehle.
Abhilfe: `.claude/settings.local.json` aus dem Haupt-Checkout in den Worktree kopieren.

### Einrichtung

Im Projekt „ADO einrichten“ sagen. `ado-cli` folgt dann `skills/ado-cli/references/setup.md`:

1. Org, Projekt und Repo aus `git remote get-url origin` vorschlagen, Tenant, User und PR-Ziel-Branch erfragen.
2. Prüfen, dass `.claude/azure/` und `.claude/ado.json` gitignored sind, sonst Abbruch.
3. `.claude/ado.json` schreiben, `.claude/azure/` anlegen, `env.AZURE_CONFIG_DIR` (absolut) in `.claude/settings.local.json` ergänzen und `.claude/settings.local.json` in `.worktreeinclude` eintragen. Bestehende Einträge bleiben.
4. Session neu starten.
5. Der Nutzer meldet sich an (siehe unten).
6. Identität prüfen und `az devops configure --defaults` setzen. Die Defaults wirken nur im Projektordner.

Skript dazu: `node scripts/ado-setup.js show|suggest|write|check-identity|login-command [--cwd <dir>]`.

### Login

Den Login führt **nur der Nutzer** aus, im Projektordner, einmal pro Projekt:

```powershell
& "<Plugin-Pfad>/scripts/ado-login.ps1"
```

```bash
bash "<Plugin-Pfad>/scripts/ado-login.sh"
```

Das Skript setzt `AZURE_CONFIG_DIR` nur, solange es läuft. Die PowerShell-Variante stellt danach den alten Wert der Shell wieder her.
Es liest `tenantId` aus `ado.json`.
Danach ruft es `az login --tenant <tenantId>` auf und prüft die Identität gegen `ado.json`.
Den genauen Aufruf mit Pfad nennt `node scripts/ado-setup.js login-command`.

### Warum `settings.local.json` und nicht `CLAUDE_ENV_FILE`

Ein SessionStart-Hook kann Variablen über `CLAUDE_ENV_FILE` an die Shell-Befehle der Session geben.
Laut Claude-Code-Doku (Hooks, „Persisted variables in PowerShell commands“) bekommt das
PowerShell-Tool unter Windows aber keine Variable, deren Wert `/` oder `\` enthält.
Sandboxed PowerShell bekommt gar keine. `AZURE_CONFIG_DIR` ist immer ein Pfad.

Deshalb trägt die Einrichtung `env.AZURE_CONFIG_DIR` in `.claude/settings.local.json` ein.
`env` aus den Settings gilt für den ganzen Claude-Code-Prozess, also für Bash- und PowerShell-Tool,
Hooks und Subagenten. Es greift ab der nächsten Session.
Der SessionStart-Hook (`scripts/ado-session.js`) meldet nur, ob die Variable passt.

### Hook

`hooks/hooks.json` registriert einen PreToolUse-Hook (`scripts/ado-guard.js`) auf `Bash|PowerShell`.

| Befehl | Ergebnis |
|---|---|
| `az login`, `az logout`, `az account set`, `az account clear` | blockiert |
| Setzen, Überschreiben, Entfernen von `AZURE_CONFIG_DIR` (`NAME=…`, `export`, `unset`, `env -u`, `$env:NAME = …`, `Remove-Item/Set-Item Env:…`, `[Environment]::SetEnvironmentVariable`, `setx`) | blockiert |
| Aufruf des Login-Skripts `ado-login` durch einen Agenten | blockiert |
| `az boards\|repos\|devops\|pipelines\|artifacts …` ohne gültige `ado.json` oder mit `AZURE_CONFIG_DIR` ≠ `<Haupt-Checkout>/.claude/azure` | blockiert |
| `--org`/`--organization` mit einer anderen Org als in `ado.json` | blockiert |
| alles andere, auch `az account show`, `az account get-access-token`, Lesen von `AZURE_CONFIG_DIR` | durchgelassen |

Der Grund im Deny nennt den nächsten Schritt: Einrichtung, Neustart oder Login-Befehl.
In Projekten ohne `ado.json` betrifft der Hook nur Anmelde-Befehle, `AZURE_CONFIG_DIR` und DevOps-Befehle.
Alles andere läuft unverändert durch.
Fehler im Hook selbst, etwa unlesbare Eingabe, lassen den Befehl durch (fail-open), damit ein defekter
Hook nicht jede Shell blockiert.

**Grenzen der Erkennung:** Der Hook prüft den Befehlstext mit regulären Ausdrücken.
Erkannt werden:

- Ketten mit `&&`, `||`, `;`, `|`
- mehrzeilige Befehle und Zeilenfortsetzung
- globale Flags vor dem Unterbefehl (`az --debug login`)
- `"az"` in Anführungszeichen
- Bash- und PowerShell-Syntax

Text in Anführungszeichen mit Leerzeichen gilt als Daten, ebenso Heredocs und PowerShell-Here-Strings.
`git commit -m "az login dokumentiert"` und `grep "az login"` laufen deshalb durch.
Das Login-Skript zählt nur an Befehlsposition: `git diff scripts/ado-login.ps1` ist erlaubt.

Nicht erkannt wird Indirektion:

- Befehl in einer Variable (`$c='login'; az $c`)
- `Invoke-Expression`
- `cmd /c`, `Start-Process`
- Skriptdateien
- Aliase und Funktionen
- kodierte Befehle

`--org` mit Variable (`--org "$ORG"`) prüft er nicht. `ado-cli` setzt deshalb Literalwerte ein.

`az devops configure --defaults organization=…` prüft er gegen `ado.json`. `env -i` vor einem DevOps-Befehl blockiert er.

Umgekehrt kann ungequoteter Text, der wie ein Befehl aussieht, blockiert werden, etwa `echo az login`.
Der Hook ist eine Leitplanke gegen Versehen, keine Sicherheitsgrenze gegen Absicht.

### Sicherheit

- In `.claude/azure/` liegen Zugangstokens. Der Ordner gehört in keinen Index (graphify,
  codebase-analyzer), in kein Review-Paket und in keinen Commit. Inhalte werden nie ausgegeben.
- Die Einrichtung bricht ab, wenn `.claude/azure/` oder `.claude/ado.json` nicht gitignored sind.

### Andere Plugins

Andere Plugins und Skills, die `az` direkt aufrufen, profitieren automatisch vom gesetzten
`AZURE_CONFIG_DIR`. Ein Beispiel sind die Adapter in `generic-development-work`
(`adapters/code-host/ado.md`, `adapters/tracker/ado-boards.md`).
Der Hook kontrolliert sie ebenfalls. Trotzdem sollen Azure-DevOps-Zugriffe über `ado-cli` laufen.

### Migration von 0.1.x

0.2.0 ist ein Breaking Change: Die festen Werte (TrumpfCorp / Laser Application Database) sind entfallen.
Ohne `ado.json` blockiert der Hook alle DevOps-Befehle.

1. Pro Projekt einmal einrichten.
2. Pro Projekt einmal neu anmelden.

Die bisherige Anmeldung im globalen `%USERPROFILE%\.azure` bleibt unangetastet und wird nicht mehr genutzt.

### Ausblick PAT

PAT-basierter Zugriff (`AZURE_DEVOPS_EXT_PAT`) ist nicht umgesetzt.
Braucht ein Projekt ihn, gilt dieselbe Trennung pro Projekt: PAT nur in der lokalen Projekt-Konfiguration, nie global, nie im Repo.

## Tests

```text
node --test tests/*.test.js
```

## Prüfskript

```text
node scripts/check-requirement.js [--limits <limits.json>] [--strict] [<stand-block.md>]
```

Liest den Stand-Block aus Datei oder Stdin. `FEHLER` (kaputte Struktur, Zyklus, fehlendes Ziel) beenden mit Exit 1, `WARNUNG` (Leitplanke überschritten, Technikbegriff im Kriterium) nur mit `--strict`. Exit 2 bei falschem Aufruf oder unvollständiger `limits.json`. Tests: `node --test tests/*.test.js`.

## Grenzen

- `requirement-definition` arbeitet nur im Chat. Ablage und Zielformat (Markdown, Azure DevOps, Jira) übernehmen andere Skills.
- Die Zahlen für Requirement und Steps in `skills/requirement-definition/limits.json` sind Schätzwerte und nach Praxis anzupassen.
- Das Prüfskript `scripts/check-requirement.js` prüft nur Struktur und Zahlen. Ob ein Step wirklich ein beobachtbares Ergebnis hat, bleibt Urteil. Implementierungsdetails in Kriterien (Pfad, Backticks, Klassenname, Endpunkt) meldet der Lint von `definition-of-ready`; Wörter wie „Datenbank“ erkennt er nicht.
- `requirement-definition` beachtet die Definition of Ready automatisch (Katalog beim Klären, Lint beim Prüfen), gibt aber nie ein Bereitschaftsurteil ab. Das tut nur `definition-of-ready`.
- `pruefkatalog.md` und `splitting-patterns.md` stammen aus der Git-Historie (vor `eae8e47`) und sind nur auf Requirement/Step angepasst.
