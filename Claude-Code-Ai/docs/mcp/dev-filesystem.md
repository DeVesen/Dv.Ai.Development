# MCP: dev-filesystem-mcp

**Dev.Filesystem.Mcp** — Token-effizientes Lesen und Suchen in `.cs`- und `.ts`-Dateien.

> **Agent-Kanon (Pflicht):** [`skills/dev-filesystem-mcp/SKILL.md`](../.claude/skills/dev-filesystem-mcp/SKILL.md) — Tools, Parameter (`file_path`, `root`), JSON-Beispiele, Fehlerdiagnose. Diese Datei ist Menschen-Doku; bei Widersprüchen gilt der Skill.

| Eigenschaft | Wert |
|-------------|------|
| Stack | C# / .NET |
| Transport | stdio |
| Log-Port | 8091 |
| Volume-Mount | ✅ `-v ${workspaceFolder}:/project:ro` |
| Image | `devesen/dev-filesystem-mcp:latest` |
| Package | `packages/dev-filesystem-mcp.json` (+ `dependsOn`: `dev-tooling-mcp`) |

---

## Kurzüberblick

Statt ganzer Dateien liefert der Server Signaturen, einzelne Methoden oder Klassen-Übersichten — typisch ~90 % weniger Token als `Read`.

| Situation | Tool |
|-----------|------|
| Konkrete Datei bekannt | `read_signatures_only`, `read_class_summary` |
| Eine Methode | `read_method` |
| Interface-Implementierungen | `find_implementations` |
| Datei suchen | `find_file` |
| Inhalt (Regex) | `find_by_content` |

**Pfade:** immer `/project/<relativ-zu-workspace>`. **Nicht:** `path`, `filePath`, Windows-Pfade.

---

## Beispiel (JSON)

```json
{
  "file_path": "/project/src/backend/LAC.Core/Models/UserModel.cs"
}
```

Weitere Beispiele: Kanon-Skill.

---

## Konfiguration (settings.json)

Siehe `packages/dev-filesystem-mcp.json` und Referenz `.claude/settings.json`.

---

## Abgrenzung

| | dev-filesystem-mcp | codebase-analyzer |
|--|-------------------|-------------------|
| Lesen/Suchen token-sparend | ✅ | Überdimensioniert |
| Index, Review, Metriken | ❌ | ✅ |
| Mount | `/project` | `/workspace` |
