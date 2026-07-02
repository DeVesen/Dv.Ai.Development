# Angular Developer Skills

Skill-Verbund für Angular-Entwicklung mit v20+/v22+. Immer zusammen laden — die Extensions erweitern den Basis-Skill um Projektstruktur, Test-Policy und Signal-Architektur.

---

## Skill-Verbund: Immer laden

| Skill | Immer? | Wann zusätzlich |
|-------|--------|----------------|
| `angular-developer` | ✅ | Basis — immer |
| `angular-developer-extension` | ✅ | Immer mit Basis |
| `angular-new-app` + `angular-new-app-extension` | Nur bei neuem Projekt | `ng new`, Greenfield |
| `angular-refactor` | Nur bei Refactoring | Deprecated APIs, Migration |
| `angular-material` | Nur bei Material UI | `mat-button`, `mat-dialog`, etc. |
| `angular-material-custom-input` | Nur bei custom Form Fields | `MatFormFieldControl` |
| `angular-cache-busting` | Nur bei Cache-Problemen | Nutzer sehen alte App nach Deploy |

---

## angular-developer (Basis)

**Trigger:** Angular-Arbeit, Komponente, Service, Routing, Forms, Signals, SSR, Testing, CLI  
**Schwerpunkte:**
- Signals: `signal()`, `computed()`, `linkedSignal()`, `resource()`
- Dependency Injection: `inject()` statt Konstruktor-Injection
- Standalone Components (kein NgModule)
- Reaktive Forms, Routing, HTTP
- Accessibility (ARIA), Animations, Styling

---

## angular-developer-extension

Projektstruktur, Test-Policy und Signal-Architektur — verbindliche Erweiterung zum Basis-Skill.

- Layout-Regeln für Feature-Module und Shared-Struktur
- Test-Policy: wann Unit-Test, wann Integrations-Test
- Signal-Architektur: `input()`, `output()`, `model()`, `viewChild()`
- Migration-Leitfaden für ältere Patterns

---

## angular-new-app + angular-new-app-extension

Nur bei neuem Angular-Projekt (`ng new`).

- Documentation-first Validation
- Decision Gate (Questionnaire) vor CLI-Ausführung
- Schriftlicher Implementierungsplan vor `ng new`
- Scaffolding via `dev-angular-mcp` (kein Shell `ng new`)

---

## angular-refactor

Refactoring zu modernem Angular — deprecated APIs beseitigen, Test-Relevanz bewerten.

- Deprecated Patterns erkennen (z. B. `@Input()` → `input()`, `EventEmitter` → `output()`)
- Integration-Tests bewahren, Unit-Tests auf Relevanz prüfen
- Stabilität und Performance priorisieren

---

## angular-material

**Trigger:** `Angular Material`, `mat-button`, `mat-form-field`, `mat-dialog`, `mat-table`, `mat-sidenav`, `MatTheme`, `CDK`

Material v22+: Komponenten, Theming, CDK, a11y.

> Komponenten-Referenz: [`docs/skills/angular-material-v22-components.md`](./angular-material-v22-components.md)

---

## angular-material-custom-input

Custom Form Fields mit `MatFormFieldControl` — `mat-form-field` mit mehreren nativen Controls.

- Shell + Directive-Pattern (`custom-input-range-wrapper`)
- `mat-label` / `mat-hint` / `mat-error`-Orchestration
- Directory: Host-first oder geteilte Directive bei mehreren Shells

---

## angular-cache-busting

Browser-Cache-Probleme nach Deploy lösen — **nur App-Code, kein Server**.

**Trigger:** "Nutzer sehen alte App", "Ctrl+F5", `outputHashing`, `Cache-Control in index.html`

Scope: `angular.json`, `index.html`, Meta-Tags — kein nginx/IIS/Apache/CDN.

---

## Zusammenspiel mit anderen Skills

- **Build/Test:** [`dev-tooling-mcp`](./dev-tooling-mcp.md) → `dev-angular-mcp`
- **Code-Analyse:** [`codebase-analyzer`](./codebase-analyzer.md) für Angular-Index
- **Planung:** [`feature-delivery`](./feature-delivery.md) für Feature-Planung
