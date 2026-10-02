# dotnet-xunit-conventions — Bootstrap-Op (`using-skill` / `bootstrap`)

Deterministischer Installer. Keine freie Interpretation, kein Überspringen.

## Schritt 1 — `CLAUDE.md` lokalisieren
Suche `CLAUDE.md` im CWD (direkt, keine Unterordner). Vorhanden → weiter. Fehlt → leere Datei anlegen.

## Schritt 2 — Marker-Block schreiben oder in-place ersetzen
Prüfe auf die Marker:
```
<!-- test-conventions:dotnet-xunit START
<!-- test-conventions:dotnet-xunit END
```
- **Marker fehlen:** Block am Ende der Datei anhängen (eine Leerzeile Abstand).
- **Marker vorhanden:** Text zwischen (inkl.) den Markern in-place ersetzen; Inhalt außerhalb bleibt unangetastet.

**Block-Inhalt (exakt so — keine Projekt-Anpassung):**
```markdown
<!-- test-conventions:dotnet-xunit START — managed by `dotnet-xunit-conventions bootstrap`, do not hand-edit inside markers -->
## Test-Konventionen: .NET/xUnit — gilt für JEDEN Agenten (auch dispatchte Subagenten)
Subagenten laden Skills nur, wenn der Dispatch-Prompt sie nennt (`/name` bzw. „nutze Skill X“), sehen aber immer CLAUDE.md — darum steht der handlungsfähige Kern hier inline.
1. AAA je Test (`// Arrange` / `// Act` / `// Assert`).
2. Naming: `<Method>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>`. Kein `WhenCalled`/`WithInput`/`ReturnsResult`.
3. Neue Tests: xUnit v3 + FluentAssertions + Moq. Interfaces via `Mock<T>` (Setup in Arrange, Verify in Assert).
4. Testprojekt `<Project>.Tests`, spiegelt Produktion 1:1 (Ordner + Namespace). Controller via `WebApplicationFactory<Program>` + `HttpClient` (kein Flurl). Integration in Top-Level `Integration-Tests/`.
5. Magic-Strings: mehrfach genutzte fachliche Literale → benannte Konstante.
6. Mehrstufige Testdaten (über Fremdschlüssel verkettete Entities, feste Anlege-Reihenfolge): über eine wiederverwendbare, testprojekt-lokale Bau-Hilfe erzeugen, gegliedert nach fachlicher Gruppe — nicht Entity für Entity in einer langen Arrange-Methode. Konvention als XML-Doc auf der Builder-Klasse. Wächst bei Bedarf mit (YAGNI).
7. Bestand respektieren: bestehende MSTest/NUnit-Klassen erweitern erlaubt, Framework behalten; KEINE Mitläufer-Migration ohne ausdrücklichen Wunsch.
8. superpowers: Der Controller injiziert diese Konventionen in jeden Implementer-/Fix-Dispatch (Global-Constraints) und in die Reviewer-Lens.
9. Verifikation: Tests grün über den Testbefehl des Projekts (dv-forge `Test:` bzw. die dort genannten Skripte), genau so, kein anderes Werkzeug mit gleichem Zweck; ein direkter Aufruf nur angekündigt zur Fehlerdiagnose, er zählt nie als grün.
Details: Skill `dotnet-xunit-conventions`.
<!-- test-conventions:dotnet-xunit END -->
```

## Schritt 3 — Memory-Verzeichnis auflösen
`~/.claude/projects/<cwd-slug>/memory/` (`<cwd-slug>` = CWD, jedes `:`,`\`,`/` → `-`).
Existiert → weiter. Nicht auflösbar → Inhalte (Schritt 4/5) im Chat ausgeben, Schritt 4/5 überspringen.

## Schritt 4 — Shared Memory `subagent-skill-gate.md` (create-if-missing)
Existiert → überspringen (nie überschreiben). Fehlt → anlegen:
```markdown
---
name: subagent-skill-gate
description: Subagenten sehen immer CLAUDE.md, laden einen Skill-Body aber nur, wenn der Dispatch-Prompt den Skill nennt — subagenten-relevante Regeln gehören inline in CLAUDE.md; Details per Skill-Nennung oder Dispatch-Injektion
metadata:
  type: feedback
---

Dispatchte Subagenten (Implementer, Reviewer, Planner) sehen immer `CLAUDE.md` und Skill-*Beschreibungen*; den Skill-*Body* laden sie nur, wenn der Dispatch-Prompt den Skill nennt (`/name` bzw. „nutze Skill X“).

**Why:** Regeln, die Subagenten befolgen sollen, müssen inline in `CLAUDE.md` stehen. Ein portabler Skill erreicht dispatchte Subagenten nur, wenn der Orchestrator (z. B. superpowers-Controller) ihn im Dispatch-Prompt nennt oder die Regeln explizit injiziert (Global-Constraints).

**How to apply:** Neue subagenten-relevante Regeln in den Bootstrap-Template-Block des jeweiligen Skills schreiben (Single Source) — nicht pro Projekt von Hand wiederholen. Der `bootstrap`-Modus propagiert sie beim nächsten Run. [[subagent-mcp-first-gate]]
```
`MEMORY.md`-Indexzeile ergänzen (nur wenn fehlt):
```
- [Subagent skill gate](subagent-skill-gate.md) — Subagenten laden Skill-Bodies nur bei Nennung im Dispatch → Kernregeln inline in CLAUDE.md, Details per Skill-Nennung
```

## Schritt 5 — Gotcha-Memory `fluentassertions-v8-license.md` (create-if-missing)
Fehlt → anlegen:
```markdown
---
name: fluentassertions-v8-license
description: FluentAssertions ist ab v8 kommerziell lizenziert (Xceed); für neue .NET-Testprojekte Lizenz klären oder Alternative wählen
metadata:
  type: reference
---

FluentAssertions ist ab Version 8 kommerziell lizenziert (Xceed). Version 7 bleibt kostenlos (MIT).

**Why:** Neue Testprojekte, die per Konvention FluentAssertions ziehen, können im kommerziellen Umfeld eine kostenpflichtige Lizenz erfordern.

**How to apply:** Lizenz klären, auf FluentAssertions 7.x pinnen, oder den drop-in-Fork `AwesomeAssertions` (FA-v7-API, MIT) bzw. natives xUnit `Assert` verwenden. Die Konvention „lesbare/fluente Assertions" bleibt; nur das Paket variiert.
```
`MEMORY.md`-Indexzeile:
```
- [FluentAssertions v8 license](fluentassertions-v8-license.md) — FA ab v8 kommerziell; v7 pinnen oder AwesomeAssertions/xUnit Assert
```

## Schritt 6 — Abschlussmeldung
> ✅ dotnet-xunit-conventions Bootstrap abgeschlossen.
> - CLAUDE.md-Block (marker-umzäunt) geschrieben / aktualisiert.
> - Memories geprüft / angelegt: `subagent-skill-gate.md`, `fluentassertions-v8-license.md`.
> - `MEMORY.md`-Index ergänzt.
>
> **Optional:** `angular-jest-test-conventions bootstrap` für den Frontend-Stack.
