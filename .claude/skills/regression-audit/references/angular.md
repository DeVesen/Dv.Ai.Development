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

## Schritt 2: Verhaltens-Verifikation (kumulativ)

Die Verifikation läuft **einmalig pro Bereich** gegen den aktuellen Stand — nicht isoliert
pro Commit. Intent aus `commit-intent.md` ist der Maßstab.

| Aktueller Intent (aus letztem Commit) | Was zu prüfen ist |
|---------------------------------------|-------------------|
| „add <Feature>" | Feature vorhanden + Test deckt es ab |
| „extend <Komponente>" | **Gesamte** Komponente testen — nicht nur der neue Teil |
| „fix <Problem>" | Fehler-Szenario tritt nicht mehr auf |
| „refactor <Bereich>" | Alle bisherigen Tests noch grün, kein Verhalten-Delta |

**Kumulativ bedeutet:** Eine Komponente, die in 3 verschiedenen Commits berührt wurde,
wird **einmal** vollständig geprüft — nicht dreimal mit Teilscope.

**Tests ausführen** — welches Test-Framework (Jest, Karma, …) bestimmt das Projekt:

```bash
# Scoped auf betroffene Komponenten/Module
npm run test -- --testPathPattern=<Bereich>

# Nx: alle betroffenen Projekte auf einmal
nx affected:test
```

Falls Playwright MCP verfügbar und UI-Flows betroffen (Grid, Suchtabelle, View-Persistierung):
Playwright für kritische Pfade ausführen. Nicht verfügbar → im Report als Lücke benennen.

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
