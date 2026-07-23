# Angular — Regressions-Audit Playbook

## Voraussetzung

Stack-Erkennung hat `angular.json` + `@angular/core` bestätigt.
Angular-Version und Monorepo-Status (Nx ja/nein) vor dem ersten Schritt prüfen.
Intent-Extraktion (→ `commit-intent.md`) muss abgeschlossen sein.

---

## Schritt 1: Betroffene Bereiche eingrenzen

**Nx-Monorepo vorhanden (`nx.json` existiert):**
```bash
nx affected:test --base=HEAD~<N-Tage-Commits> --head=HEAD --dry-run
```
Ausgabe zeigt betroffene Projekte/Libraries. Audit auf diese Menge beschränken.

**Kein Nx:**
Geänderte Dateien aus dem Git-Log nehmen und zugehörige Module/Komponenten identifizieren.
Alle in N Tagen berührten Bereiche **als Gesamtmenge** notieren — nicht pro Commit trennen.

---

## Schritt 2: Verhaltens-Verifikation via analyze_slice_impact

Index-Check und Tool-Aufruf: → [`slice-impact.md`](slice-impact.md)

`filePaths[]` = alle geänderten `.ts`-Dateien aus Schritt 1, Windows-Absolutpfade.

Intent aus `commit-intent.md` als Maßstab für die Bewertung der Findings:

| Commit-Typ im Bereich | Erwartetes analyze_slice_impact Ergebnis |
|-----------------------|-----------------------------------------|
| `add <Feature>` | Kein Untested-API-Finding für neue Symbole |
| `extend <Komponente>` | Kein Refactoring-Safety-Warning für vorhandene Consumers |
| `fix <Problem>` | Keine Compiler Errors |
| `refactor <Bereich>` | Kein Compiler Error + kein Refactoring-Safety-Warning |
| Mehrere Typen kombiniert | Union aller obigen Erwartungen |

Falls Playwright MCP verfügbar und UI-Flows betroffen (Grid, Suchtabelle, View-Persistierung):
Playwright für kritische Pfade zusätzlich ausführen. Nicht verfügbar → im Report als Lücke benennen.

---

## Schritt 3: TDD-Verletzungs-Signal

Feature hinzugefügt ohne begleitenden Test?

```bash
# Neue Produktivdateien ohne zugehörige Spec im selben Commit
git log --since="N days ago" --diff-filter=A --name-only -- "*.component.ts" "*.service.ts" "*.directive.ts"
```

Pro gefundener neuer Datei prüfen:
1. Existiert eine `*.spec.ts` im **selben Commit-Diff**? → kein Signal
2. Existiert eine `*.spec.ts` in einem **unmittelbaren Folge-Commit** mit erklärender Message? → gelb (TDD verletzt, aber nachgeholt)
3. Keine `*.spec.ts` zu finden? → **rot** (Feature ungetestet)

> Dieses Signal ist eigenständig — nie mit Test-Drift vermischen.

---

## Schritt 4: Test-Drift-Signal

Testdatei geändert ohne erkennbare Anforderungsänderung:

```bash
git log --oneline --since="N days ago" --diff-filter=M --name-only -- "**/*.spec.ts" "**/*.e2e.ts"
```

Commit-Message und ggf. PR-Beschreibung prüfen. Fehlt ein Hinweis auf Anforderungsänderung
→ gelb im Test-Drift-Abschnitt des Reports.

---

## Report-Hinweise für Angular

- `extend`-Commits sind das höchste Regressions-Risiko: **immer** die Gesamtkomponente testen, nicht nur den neuen Teil.
- `OnPush`-Komponenten mit geänderter Input-Signatur aber unverändertem Test → rot.
- Neue Template-Bindings (neue Spalte, neues Feld) ohne Test-Coverage → rot wenn sicherheitskritisch, gelb sonst.
- Fehlender Playwright-Lauf bei Grid/Table/UI-Flow-Änderungen immer explizit als Lücke benennen.
