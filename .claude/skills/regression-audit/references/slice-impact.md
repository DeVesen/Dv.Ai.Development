# Slice Impact — Index-Check & analyze_slice_impact

## Index prüfen

Tool: `codebase-analyzer` → `index_status`

| Status | Aktion |
|--------|--------|
| Vorhanden, nicht veraltet | Direkt mit analyze_slice_impact fortfahren |
| Veraltet oder fehlend | **Stoppen:** „Index fehlt / veraltet — soll zuerst `index_project` ausgeführt werden? (ja / nein / überspringen)" |

- User antwortet „ja" → `index_project` für den erkannten Stack aufrufen, dann fortfahren
- User antwortet „nein" / „überspringen" → mit Warning im Report fortfahren: „Index veraltet — Ergebnisse möglicherweise unvollständig"

---

## analyze_slice_impact aufrufen

Ein Call pro Stack-Typ. `filePaths[]` = alle geänderten Dateien des jeweiligen Typs aus dem
Git-Log (Windows-Absolutpfade). Beide Calls parallel absetzen wenn beide Stacks vorhanden sind.

```
codebase-analyzer.analyze_slice_impact(
  filePaths: ["C:\\..\\<datei1.ts>", "C:\\..\\<datei2.ts>"],
  format: "compact"
)

codebase-analyzer.analyze_slice_impact(
  filePaths: ["C:\\..\\<datei1.cs>", "C:\\..\\<datei2.cs>"],
  format: "compact"
)
```

---

## Ergebnis-Mapping auf Audit-Signale

| analyze_slice_impact Kategorie | Audit-Signal |
|-------------------------------|--------------|
| Compiler Errors | **Rot** — Blocker; sofort im Report benennen |
| Untested Public API | TDD-Verletzungs-Signal (rot wenn neue Symbole, gelb wenn bestehend) |
| Refactoring Safety Warnings | **Gelb** — Regressions-Risiko |
| BoyScout Findings | **Gelb** — hygienisch, kein Blocker |
| Keine Findings | **Grün** für diesen Stack-Bereich |
