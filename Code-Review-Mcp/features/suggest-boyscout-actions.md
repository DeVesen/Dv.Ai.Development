# Feature: suggest_boyscout_actions

## Was es verbessert

Die BoyScoutRule sagt: „Hinterlasse den Code besser als du ihn vorgefunden hast."  
Bisher muss dafür manuell `analyze_dead_code`, `analyze_nullability`, `analyze_complexity` etc. einzeln aufgerufen werden — zu viel Overhead für einen Routine-Check nach der Implementierung.

Dieses Feature ist das BoyScoutRule-Werkzeug: eine Liste geänderter Dateien rein, eine priorisierte Top-5-Verbesserungsliste raus — leichtgewichtig, direkt nach jedem Implementierungs-Schritt einsetzbar.

**Post-Implementation** (primärer Use-Case): nach jedem Commit-Block oder Slice-Abschluss.  
**Pessimist Phase 5**: als pre-check auf Scout-Scope um konkrete Risiken zu finden.  
**Buddy**: beim Durchsehen von Code — schneller Qualitäts-Puls ohne full review.

## Gilt für

- .NET: ✅
- Angular: ✅

## Ziel-Tool

```
suggest_boyscout_actions(filePaths[], type, maxPerFile?: number)
```

Default: `maxPerFile: 5`.  
Rückgabe pro Datei: priorisierte Liste mit `{ severity, category, line, message, quickfix? }`.  
Severity-Reihenfolge: `critical` → `warning` → `suggestion`.

---

## MCP-Umsetzung

**Orchestrierung intern (kein neuer Analyzer):**  
Das Tool ruft bestehende Analyzer im Lightweight-Modus auf und aggregiert:

| Interner Check | Quelle | Gewicht |
|---|---|---|
| Nullability-Crash-Risiken | `analyze_nullability` (limitiert auf filePaths) | critical |
| Tote Methoden / unused imports | `analyze_dead_code` (filePaths only) | warning |
| CC ≥ 10 Methoden | `analyze_complexity` (nur Methoden über Schwelle) | warning |
| Ungetestete public API | `detect_untested_public_api` (depth: "file") | suggestion |
| Extraktionskandidaten | `analyze_method_extraction_candidates` (CC ≥ 10 only) | suggestion |

**Deduplication:** Gleiche Zeile/Symbol nicht doppelt ausgeben wenn mehrere Checks sie treffen.  
**Priorisierung:** Score = `severity_weight × (1 + 0.2 × repetition_count)`.  
**Implementierung:** Neue Orchestrator-Funktion in `src/index.ts` oder eigene `src/features/boyscout-runner.ts`.

**Neues Tool in `src/index.ts`:**
```ts
{
  name: "suggest_boyscout_actions",
  inputSchema: {
    filePaths: string[],
    type: "angular"|"dotnet"|"auto",
    maxPerFile?: number   // default: 5
  }
}
```

Output-Format: Compact (kein Raw-AST), Markdown-Liste, direkt lesbar.

---

## Skills / Agents Erweiterung

**SKILL.md (code-review-mcp)** — neuer Abschnitt „BoyScoutRule — Post-Implementation":
```
Nach Implementierung (nach jedem Slice-Abschluss):
suggest_boyscout_actions(filePaths: [alle geänderten Dateien], type)
→ Top-Findings direkt ausgeben, keine Schwelle nötig
→ Opt-out: kein boyscout, skip boyscout
```

**op-tool-overview.md** — neue Kategorie ⑦ BoyScoutRule:  
Einzelner Eintrag `suggest_boyscout_actions`.

**plan-agent-pessimist.md** — Optional MCP checks (Phase 5):  
`suggest_boyscout_actions` auf Scout-Scope-Dateien als schneller Qualitäts-Puls — ergänzt gezieltes `analyze_coverage` / `analyze_nullability`.

**SKILL.md (planning-workflow)** — Phase 6 Synthesize:  
Hinweis: nach Umsetzungs-Topologie „Implementation Workflow sollte `suggest_boyscout_actions` als letzten Schritt pro Slice einplanen."

---

## Abhängigkeiten

Setzt `detect_untested_public_api` und `analyze_method_extraction_candidates` voraus (separate Features).  
Optional bei `depth: "project"`: `detect_god_classes` (Top-1 pro Stack) für kompakten God-Class-Hinweis.  
Kann mit Stubs für diese Tools starten und schrittweise vollständig werden.
