# Angular — Regressions-Audit Playbook

## Voraussetzung

Stack-Erkennung hat `angular.json` + `@angular/core` bestätigt.
Angular-Version und Monorepo-Status (Nx ja/nein) vor dem ersten Schritt prüfen.

---

## Schritt 1: Betroffene Bereiche eingrenzen

**Nx-Monorepo vorhanden (`nx.json` existiert):**
```
nx affected:test --base=HEAD~<N-Tage-Commits> --head=HEAD --dry-run
```
Ausgabe zeigt, welche Projekte/Libraries betroffen sind. Audit auf diese Menge beschränken.

**Kein Nx:**
Geänderte Dateien aus dem Git-Log nehmen und zugehörige Module/Komponenten identifizieren.
Faustregel: Geänderte Datei `foo.component.ts` → prüfe `foo.component.spec.ts`.

---

## Schritt 2: Regressions-Signal prüfen (Y nicht mitgezogen?)

| Änderung X | Erwartetes Y |
|------------|-------------|
| `*.component.ts` geändert | `*.component.spec.ts` ebenfalls geändert oder neue Tests ergänzt |
| `*.service.ts` geändert | `*.service.spec.ts` ebenfalls geändert |
| Template-Binding ergänzt (neue Spalte, neues Feld) | Test prüft das neue Binding / keine bestehenden Tests brechen |
| Route oder Guard geändert | Routing-Tests oder E2E-Coverage vorhanden |
| Store/State geändert | State-Tests / Selector-Tests mitgezogen |

Fehlende Y-Dateien → gelb. Fehlende Y-Dateien bei sicherheitskritischen Pfaden (Auth, Guards) → rot.

---

## Schritt 3: Tests ausführen

Tests projektspezifisch ausführen — **welches Test-Framework** (Jest, Karma, …) bestimmt
das Projekt, nicht dieser Skill. Den in `package.json` konfigurierten Befehl verwenden:

```
# Scoped auf betroffene Dateien/Projekte
npm run test -- --testPathPattern=<betroffene-Dateien>
# oder bei Nx:
nx affected:test
```

Falls Playwright MCP verfügbar ist und UI-/E2E-Flows geändert wurden:
Playwright für kritische UI-Pfade (z.B. Suchtabellen mit View-Persistierung, Grid-Spalten)
manuell oder via Playwright MCP ausführen. Verfügbarkeit nicht voraussetzen — wenn nicht
verfügbar, im Report als Lücke vermerken.

---

## Schritt 4: Test-Drift-Signal

Testdatei geändert ohne erkennbare Anforderungsänderung → separat ausweisen:

```
git log --oneline --diff-filter=M -- "**/*.spec.ts" "**/*.e2e.ts"
```

Commit-Message und ggf. verknüpfte PR-Beschreibung auf Hinweise auf Anforderungsänderung prüfen.
Fehlt ein solcher Hinweis → gelb im Test-Drift-Abschnitt des Reports.

---

## Report-Hinweise für Angular

- Neue Template-Bindings ohne Test-Coverage sind der häufigste stille Regressionspfad.
- `OnPush`-Komponenten mit geänderter Input-Signatur aber unverändertem Test → immer rot.
- Fehlender Playwright-Lauf bei Grid/Table-Änderungen explizit als Lücke benennen.
