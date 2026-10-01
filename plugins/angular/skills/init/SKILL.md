---
name: init
description: Use when dv-angular is set up in a project for the first time, or when the project CLAUDE.md should point agents to the Angular toolchain skill, to the hook that rejects other build and test tools, or to the Context7 and Microsoft Learn MCP servers.
disable-model-invocation: true
---

# dv-angular einrichten

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du stellst drei Fragen, jede mit Standard **Nein**, und ein Skript führt die Antworten aus. Bestehende Regeln der CLAUDE.md änderst du nie.

## Ablauf
1. Frage nacheinander, eine pro Nachricht:
   - „Hook einrichten? Er lehnt `ng build|test|lint`, `npx ng build|test|lint`, `npm test` und `npm run build|test|lint` im Bash-Tool sowie die Build/Test-Tools von dev-mcp ab und nennt den Skill `dv-angular:toolchain`. (Standard: Nein)“
   - „Microsoft Learn einrichten? Trägt den MCP `microsoft-learn` in die `.mcp.json` ein. Ist der MCP schon als Plugin installiert, wähle Nein. (Standard: Nein)“
   - „Context7 einrichten? Trägt den MCP `context7` in die `.mcp.json` ein. Ist der MCP schon als Plugin installiert, wähle Nein. (Standard: Nein)“
2. `node "<PLUGIN>/scripts/init.js" --hook <ja|nein> --mcp <liste>`. `<liste>` enthält die mit Ja beantworteten MCPs (`microsoft-learn`, `context7`), ohne Ja ist sie `""`.
3. Gib die Ausgabe des Skripts wieder. Sage danach: Regeln wie „Build und Test über dev-mcp“ entfernt der Mensch von Hand; nach neuen MCP-Einträgen Claude Code neu starten.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Hook oder MCP ohne Antwort einrichten | Standard ist Nein. |
| CLAUDE.md oder `.mcp.json` selbst bearbeiten | Nur das Skript ändert sie. |
