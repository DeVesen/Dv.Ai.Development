# Feature: detect_god_classes

## Was es verbessert

`suggest_class_splits` analysiert eine einzelne Datei auf Anfrage — du musst wissen welche Datei.  
Dieses Feature scannt ein ganzes Projekt und liefert ein priorisiertes Ranking aller Klassen die gegen das Single-Responsibility-Prinzip verstoßen: zu groß, zu viele Verantwortlichkeiten, zu viele Abhängigkeiten.

**BoyScoutRule projektweit**: ohne Datei-Input sofort die schlimmsten Offender im ganzen Projekt sehen.  
**Scout Phase 3**: nach `index_project` direkt den Scope um God-Class-Kandidaten im betroffenen Bereich erweitern.  
**Post-Implementation**: nach einem Slice prüfen ob neue Klassen bereits in Richtung God-Class wachsen.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
detect_god_classes(projectPath, type, top?: number)
```

Default: `top: 10` — die 10 schlimmsten Klassen.  
Rückgabe pro Klasse:
```json
{
  "class": "OrderProcessingService",
  "file": "/workspace/src/Services/OrderProcessingService.cs",
  "line": 1,
  "metrics": {
    "methodCount": 47,
    "fieldCount": 23,
    "lcom": 0.81,
    "dependencies": 14,
    "linesOfCode": 890
  },
  "urgency": "critical",
  "reasons": ["methodCount > 20", "lcom > 0.7", "dependencies > 10"]
}
```

---

## MCP-Umsetzung

**Schwellwerte (konfigurierbar, Defaults):**

| Metrik | Warning | Critical |
|--------|---------|----------|
| Method Count | ≥ 15 | ≥ 25 |
| Lines of Code | ≥ 300 | ≥ 600 |
| LCOM | ≥ 0.6 | ≥ 0.8 |
| Dependencies (injected/imported) | ≥ 8 | ≥ 12 |

Urgency = `critical` wenn 2+ Critical-Schwellen überschritten, `high` wenn 1 Critical oder 3+ Warnings.

**Angular (ts-morph):**  
Alle Klassen in `projectPath` iterieren, pro Klasse: Methodenanzahl, LOC, Imports, LCOM (Field-Access-Matrix).  
Bestehende LCOM-Logik aus `ts-class-split.ts` wiederverwenden.  
Implementierung in `src/features/ts-advanced-features.ts`.

**dotnet (Roslyn):**  
Alle non-test Klassen im Projekt laden, gleiche Metriken via bestehenden `roslyn-split.csx`-Code.  
Neuer Modus `project-scan` in `roslyn-split.csx` statt neuem Script.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "detect_god_classes",
  inputSchema: {
    projectPath: string,
    type: "angular"|"dotnet"|"auto",
    top?: number   // default: 10
  }
}
```

---

## Skills / Agents Erweiterung

**op-tool-overview.md** — Kategorie ④ Klassen-Schnitt:  
Neuer Eintrag `detect_god_classes` — „projektweit, kein Datei-Input nötig".

**plan-agent-scout.md** — Schritt 1 (nach index_project):  
Wenn Scope-Bereich > 3 Dateien → `detect_god_classes(projectPath, top: 5)` → God-Class-Kandidaten im Scope-Bereich in Abschnitt 6 (Komplexitäts-Hotspots) ergänzen.

**SKILL.md (code-review-mcp)** — BoyScoutRule Post-Implementation:  
`detect_god_classes(projectPath, top: 3)` nach Implementierung — wenn neue Klasse unter Top-3 auftaucht: als `warning` ausgeben.

**suggest_boyscout_actions** (Feature-Abhängigkeit):  
`detect_god_classes` als optionalen Check ergänzen wenn `depth: "project"` gesetzt — nur Top-1 pro Stack um Output kompakt zu halten.

---

## Limitationen

- **Datei-Cap (400):** Angular (tsconfig- und Walk-Pfad) und .NET (`.Take(400)`) verarbeiten höchstens 400 Dateien. Bei Cap: `capReached` + Warnung `⚠️ Datei-Limit (400) erreicht` im Tool-Output.
- **`.spec.ts` / Test-CS ausgeschlossen:** Konsistent mit `find_symbol_references` — Test-Dateien erscheinen nicht im Scan.
- **Mindest-Methodenanzahl:** Klassen mit < 3 Methoden werden übersprungen (wie `suggest_class_splits`).
- **Kein Split-Plan:** Nur Ranking + Urgency — konkrete Splits via `suggest_class_splits`.
- **.NET nur im Container:** `dotnet-split-runner.ts` nutzt `/app/roslyn-analyzer/roslyn-split.csx` — läuft im Docker-Image, lokal nur via `dotnet script` (Test-Harness).
- **BE-Tests lokal:** Ohne `dotnet-script` werden BE-Assertions übersprungen; `SKIP_BE_ASSERTIONS=1` für reine FE-Läufe.

## Abgrenzung zu `suggest_class_splits`

| | `suggest_class_splits` | `detect_god_classes` |
|---|---|---|
| Input | Eine Datei | Ganzes Projekt |
| Output | Konkrete Split-Vorschläge mit Methodenzuteilung | Ranking + Urgency, kein Split-Plan |
| Use Case | „Wie splitte ich diese Klasse?" | „Welche Klassen sollte ich anschauen?" |
| Folgeschritt | Direkte Implementierung | → `suggest_class_splits` auf Kandidaten |
