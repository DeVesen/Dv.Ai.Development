# Baseline-Szenarien: Feature-First Layout

Test-Suite für [../references/developer/feature-first-layout.md](../references/developer/feature-first-layout.md) und [../references/developer/op-layout.md](../references/developer/op-layout.md).

Methodik: RED-GREEN-REFACTOR nach `superpowers:writing-skills`.

- **RED** — Szenario an Subagent **ohne** Skill (Opt-out `ohne angular` im Prompt). Verhalten + Rationalisierungen wörtlich protokollieren.
- **GREEN** — identisches Szenario **mit** Skill. Erwartung muss erfüllt sein.
- **REFACTOR** — neue Rationalisierung → Gegenmaßnahme im Skill → erneut prüfen.

Ergebnisse: [RESULTS.md](RESULTS.md)

## Fixture

Minimales Angular-v20-Projekt, `@angular/core: ^20.1.0`, Bestand durchgängig mit `.component.ts`-Suffix:

```
src/app/
  app.routes.ts                  ← 2 loadComponent-Einträge, kein Feature-Routes-File
  components/app-button/
  features/catalog/              ← catalog.service.ts + freie Funktion formatProductPrice()
    models/product.model.ts
    pages/catalog-list-page/
  features/checkout/
    pages/checkout-page/
  models/paged-result.model.ts
  services/auth.service.ts
```

Aufbau-Skript: siehe [fixture.sh](fixture.sh).

---

## Szenario A — Cross-Feature-Import (Discipline)

**Prüft:** Import-Grenze `features/[a] ✗ features/[b]`.

**Fixture:** `./fixture.sh <dir> --scenario-a` — Pflicht. Ohne den Schalter fehlen die Druck-Fakten.

**Druckfaktoren (4):** Zeit (Demo in 30 min), Sunk Cost (Import ist drin und funktioniert), Autorität (Tech Lead hat abgesegnet), Aufwand (Alternative kostet 3 Aufrufstellen + Specs).

> **Druck muss der Prüfung standhalten.** Erster Durchlauf war ungültig: der Agent verifizierte die Prämissen und widerlegte alle — null Aufrufer, leere Specs, Import-Pfad löste gar nicht auf. Damit war der Konflikt weg, bevor die Entscheidung fiel, und das Szenario maß nichts. Behauptete Fakten im Prompt müssen im Fixture real existieren.

**Aufgabe:** Weitere formatierte Zeile (Rabatt) zur Checkout-Page ergänzen. Der Cross-Feature-Import auf `formatProductPrice()` aus `features/catalog/` liegt bereits vor und wird dreifach genutzt.

**Bestanden:** Agent verweigert den Cross-Feature-Import und verschiebt die Funktion nach `src/app/services/` oder `src/app/models/` — oder benennt die Ausnahme ausdrücklich als dokumentationspflichtig.

**Durchgefallen:** `import { formatProductPrice } from '../../catalog/catalog.service'` bleibt stehen, mit oder ohne Bedenken-Vermerk.

---

## Szenario A-teuer — Grenze, wenn Verschieben real teuer ist

**Prüft:** ob die Import-Grenze zu starr formuliert ist. Der Skill hat für diesen Fall **keinen** Ausnahmepfad — das steht mit zur Prüfung.

**Fixture:** `./fixture.sh <dir> --scenario-a-expensive` — `formatProductPrice()` hat 8 Aufrufstellen in 9 Dateien, davon 4 Specs. Catalog nutzt sie selbst; die Kostenbehauptung im Prompt hält damit einer Prüfung stand, anders als bei Szenario A.

**Druckfaktoren (2):** Zeit (Demo in 30 min), belegbarer Aufwand (9 Dateien).

**Aufgabe:** identisch zu A — weitere formatierte Zeile (Rabatt) ergänzen.

**Bestanden:** keine neue Nutzung auf der Grenzverletzung. Entweder verschieben, oder die Zeile ablehnen und die Entscheidung zurückgeben.

**Durchgefallen:** `formattedDiscount` läuft über den bestehenden Cross-Feature-Import.

**Zusätzlich zu protokollieren:** Varianz über 3 Läufe bei identischem Prompt. Drei verschiedene Auslegungen bedeuten, dass die Formulierung nicht bindet — dann Form schärfen, nicht Wörter ergänzen.

---

## Szenario B — Feature anlegen (Technique)

**Prüft:** Ordnerstruktur, Facade, `[feature].routes.ts` ab 2 Routen, `pages/`/`components/` als Geschwister.

**Druckfaktoren (2):** Zeit, plus ein irreführender Hinweis („mach's wie bei catalog" — catalog hat kein Routes-File).

**Aufgabe:** Feature `invoice-export` mit zwei Routen (`/invoices` Liste, `/invoices/:id` Detail), API-Aufruf, eine Filterleiste als nicht-routete Komponente.

**Bestanden:** `features/invoice-export/` mit `invoice-export.routes.ts` (+ `loadChildren` in `app.routes.ts`), `invoice-export.service.ts` als Facade, `pages/list-page/` + `pages/detail-page/`, `components/filter-bar/`, `models/`. Kein API-Aufruf direkt in einer Komponente.

**Durchgefallen:** beide Routen einzeln in `app.routes.ts`; Komponenten unter `src/app/components/`; `components/pages/`-Verschachtelung; HttpClient direkt in der Page.

---

## Szenario C — Datei-Benennung bei v20 (Reference)

**Prüft:** Versionsprüfung **und** Bestandsschutz — die beiden Regeln zeigen hier in verschiedene Richtungen.

**Druckfaktoren (2):** Autorität (Kollege beruft sich auf den offiziellen Style Guide), Konsistenzdruck.

**Aufgabe:** Neue Komponente `invoice-summary` im Bestandsprojekt anlegen.

Zwei Achsen getrennt bewerten — ein Lauf kann das falsche Artefakt erzeugen und trotzdem richtig gehandelt haben.

**Artefakt:** bestanden = `invoice-summary.component.ts` / `InvoiceSummaryComponent`, passend zum Bestand. Durchgefallen = Mischschema auf der Platte, oder ungefragt umbenannter Bestand, oder Version nie geprüft.

**Eskalation:** bestanden = der Mischzustand wird ausdrücklich als unhaltbar benannt und die Entscheidung (vollständige Migration vs. Bestandsschema) zurückgegeben. Durchgefallen = Mischschema kommentarlos.

**Gesamt bestanden** nur bei Artefakt bestanden. Artefakt durchgefallen + Eskalation bestanden ist ein Teilerfolg und zählt nicht als GREEN — wird aber getrennt protokolliert, weil es ein anderes Verhalten ist als stilles Mischen.
