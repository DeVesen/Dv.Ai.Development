# angular-testing-jest-conventions — Bootstrap-Op (`using-skill` / `bootstrap`)

Deterministischer Installer. Keine freie Interpretation, kein Überspringen.

## Schritt 1 — `CLAUDE.md` lokalisieren
Suche `CLAUDE.md` im CWD (direkt, keine Unterordner). Vorhanden → weiter. Fehlt → leere Datei anlegen.

## Schritt 2 — Marker-Block schreiben oder in-place ersetzen
Prüfe auf die Marker:
```
<!-- test-conventions:angular-jest START
<!-- test-conventions:angular-jest END
```
- **Marker fehlen:** Block am Ende der Datei anhängen (eine Leerzeile Abstand).
- **Marker vorhanden:** Text zwischen (inkl.) den Markern in-place ersetzen; Inhalt außerhalb bleibt unangetastet.

**Block-Inhalt (exakt so — keine Projekt-Anpassung):**
```markdown
<!-- test-conventions:angular-jest START — managed by `angular-testing-jest-conventions bootstrap`, do not hand-edit inside markers -->
## Test-Konventionen: Angular/Jest — gilt für JEDEN Agenten (auch dispatchte Subagenten)
Subagenten laden Skills nicht, sehen aber CLAUDE.md — darum steht der handlungsfähige Kern hier inline.
1. AAA je Test (`// Arrange` / `// Act` / `// Assert`).
2. Naming: `<method>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>` im `it(...)`. Kein `should work`.
3. Runner Jest + TestBed. Spies: `jest.fn()`/`jest.spyOn()`/`jest.mocked()` — NICHT `jasmine.createSpyObj`. `mockReturnValue`/`mockResolvedValue`, `expect.objectContaining`.
4. Spec co-located als `<name>.spec.ts` neben der Quelle; kein separates Testprojekt. HTTP via `HttpTestingController` + `provideHttpClient()`/`provideHttpClientTesting()`, `afterEach(() => httpMock.verify())`.
5. Magic-Strings: mehrfach genutzte API-Verträge (Routen, Feldnamen) → benannte Konstante.
6. Bestand respektieren: bestehende `it('should …')` nicht umbenennen; neue `it` nach Schema. Keine Mock-Lib-/Runner-Migration ohne ausdrücklichen Wunsch.
7. superpowers: Der Controller injiziert diese Konventionen in jeden Implementer-/Fix-Dispatch (Global-Constraints) und in die Reviewer-Lens.
8. Verifikation: Tests grün über den Standard-Testlauf des Projekts; kein stiller Shell-Fallback, falls das Projekt einen Test-MCP vorschreibt.
Details: Skill `angular-testing-jest-conventions`.
<!-- test-conventions:angular-jest END -->
```

## Schritt 3 — Memory-Verzeichnis auflösen
`~/.claude/projects/<cwd-slug>/memory/` (`<cwd-slug>` = CWD, jedes `:`,`\`,`/` → `-`).
Existiert → weiter. Nicht auflösbar → Inhalte (Schritt 4/5) im Chat ausgeben, Schritt 4/5 überspringen.

## Schritt 4 — Shared Memory `subagent-skill-gate.md` (create-if-missing)
Existiert → überspringen (nie überschreiben). Fehlt → anlegen:
```markdown
---
name: subagent-skill-gate
description: Subagenten sehen CLAUDE.md, laden aber Skill-Bodies nicht — subagenten-relevante Regeln gehören inline in CLAUDE.md; portable Skill-Regeln erreichen Subagenten nur per Dispatch-Injektion
metadata:
  type: feedback
---

Dispatchte Subagenten (Implementer, Reviewer, Planner) sehen `CLAUDE.md` und Skill-*Beschreibungen*, laden aber den Skill-*Body* nicht.

**Why:** Regeln, die Subagenten befolgen sollen, müssen inline in `CLAUDE.md` stehen. Ein portabler Skill erreicht dispatchte Subagenten nur, wenn der Orchestrator (z. B. superpowers-Controller) die Regeln explizit in den Dispatch-Prompt (Global-Constraints) injiziert.

**How to apply:** Neue subagenten-relevante Regeln in den Bootstrap-Template-Block des jeweiligen Skills schreiben (Single Source) — nicht pro Projekt von Hand wiederholen. Der `bootstrap`-Modus propagiert sie beim nächsten Run. [[subagent-mcp-first-gate]]
```
`MEMORY.md`-Indexzeile ergänzen (nur wenn fehlt):
```
- [Subagent skill gate](subagent-skill-gate.md) — Subagenten laden Skill-Bodies nicht → Regeln inline in CLAUDE.md / per Dispatch injizieren
```

## Schritt 5 — Gotcha-Memory `jest-vs-jasmine-spies.md` (create-if-missing)
Fehlt → anlegen:
```markdown
---
name: jest-vs-jasmine-spies
description: In Jest-Specs jest.fn/spyOn/mocked statt jasmine.createSpyObj; mockReturnValue statt .and.returnValue; expect.objectContaining statt jasmine.objectContaining
metadata:
  type: feedback
---

Jest-Specs verwenden nicht die Jasmine-Spy-API.

**Why:** Aus Jasmine kopierte Muster (`jasmine.createSpyObj`, `.and.returnValue`, `jasmine.objectContaining`) existieren unter Jest nicht bzw. verhalten sich anders und brechen den Test.

**How to apply:** Spies mit `jest.fn()` / `jest.spyOn()` bzw. getypt `jest.mocked(...)`; Rückgaben mit `mockReturnValue`/`mockReturnValueOnce`/`mockResolvedValue`; Matcher `expect.objectContaining` / `expect.any`. TestBed, `HttpTestingController` und `fakeAsync`/`tick` bleiben runner-unabhängig unverändert.
```
`MEMORY.md`-Indexzeile:
```
- [Jest vs Jasmine spies](jest-vs-jasmine-spies.md) — jest.fn/mockReturnValue/expect.objectContaining statt Jasmine-API
```

## Schritt 6 — Abschlussmeldung
> ✅ angular-testing-jest-conventions Bootstrap abgeschlossen.
> - CLAUDE.md-Block (marker-umzäunt) geschrieben / aktualisiert.
> - Memories geprüft / angelegt: `subagent-skill-gate.md`, `jest-vs-jasmine-spies.md`.
> - `MEMORY.md`-Index ergänzt.
>
> **Optional:** `dotnet-xunit-test-conventions bootstrap` für den Backend-Stack.
