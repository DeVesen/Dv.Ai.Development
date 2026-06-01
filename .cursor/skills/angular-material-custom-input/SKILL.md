---
name: angular-material-custom-input
description: >
  Build self-contained Angular Material form fields with multiple native controls inside
  one mat-form-field via MatFormFieldControl on .custom-input-range-wrapper (shell +
  directive pattern). Directory: Host-first puts directive + model under
  {component-prefix}-form-<feature>/reference/; Variante B shares {component-prefix}-<control>/ when two+ shells
  need the same directive. Use when creating or refactoring {component-prefix}-form-* custom inputs,
  MatFormFieldControl, custom-input-range-wrapper, number range fields, multi-input
  mat-form-field, mat-label/mat-hint/mat-error orchestration, label-placeholder overlap,
  or Option 1 Variante B. Load BEFORE implementing the shell; inner layout/CSS inside
  the wrapper is feature-specific and not prescribed here.
---

## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{code-root}` | Wurzelpfad des Code-Repositories (z. B. `my-project/`) |
| `{frontend-path}` | Pfad zum Frontend-Projekt innerhalb von `{code-root}` |
| `{component-prefix}` | Komponenten-Präfix (kebab-case + camelCase), z. B. `app` (Angular-Standard) |
| `{ComponentPrefix}` | Komponenten-Präfix (PascalCase), z. B. `App` — abgeleitet aus `{component-prefix}` |

# Angular Material Custom Input (Shell-Orchestrierung)

Dieser Skill beschreibt die **äußere Hülle** von Custom-Formularfeldern: von `mat-form-field` bis `.custom-input-range-wrapper`. Was **innerhalb** des Wrappers liegt (Inputs, Selects, Layout, SCSS), definierst du pro Feature — die Orchestrierung bleibt gleich.

**Referenzimplementierung im Repo:**

| Shell | Control (`reference/`) |
|-------|-------------------------|
| `{component-prefix}-form-myfeature/` | `{component-prefix}-myfeature-control.directive`, `myfeature.model` |

Vor Umsetzung zusätzlich laden: globale Angular-Skills (`angular-developer`, `angular-developer-extension`) und ggf. projektspezifische Shared-Component-Skills.

---

## Verzeichnisstruktur (`reference/` pro Shell)

Control-Children = **Direktive** + optional **Wertmodell** (`*.model.ts`) + Spec der Direktive. Shell-Dateien (Komponente, Shell-Spec, feature-Validatoren) liegen **direkt** in `{component-prefix}-form-<feature>/`; Control-Children **immer** unter **`reference/`**.

| Situation | Wo liegen Direktive + Modell? |
|-----------|------------------------------|
| **Standard** (jede Shell, eigene oder geteilte Logik pro Host) | `{component-prefix}-form-<feature>/reference/` |
| **Zwei+** Shells, **dieselbe** Direktive | Ausnahme **Variante B:** `{component-prefix}-<control>/` (Geschwister, flach) — siehe unten |

**Pflichtlayout:**

```text
{component-prefix}-form-myfeature/
├── {component-prefix}-form-myfeature.component.*
├── {component-prefix}-form-myfeature.component.spec.ts
├── optional: *-validators.ts
└── reference/
    ├── {component-prefix}-myfeature-control.directive.ts
    ├── {component-prefix}-myfeature-control.directive.spec.ts
    └── myfeature-value.model.ts
```

Imports in der Shell: `./reference/...`

**Variante B (selten):** Nur wenn wirklich **zwei+** Shells dieselbe Direktive teilen → nach `{component-prefix}-<control>/` auslagern. Nur **ein** Consumer → **nicht** als Geschwister-Ordner lassen; Control in `reference/` des einen Hosts belassen bzw. dorthin zurückführen.


**Nicht:** flach im Host-Root; separates `{component-prefix}-<control>/` bei einem Consumer; Skill-`references/` mit Code-`reference/` verwechseln; zweite Shell importiert fremdes `./reference/`.

Details: [references/directory-layout.md](references/directory-layout.md).

---

## Kernregel (Material)

`mat-form-field` akzeptiert **genau ein** `MatFormFieldControl` pro Feld.

| Erlaubt | Verboten |
|---------|----------|
| **Ein** Host-Element mit `MatFormFieldControl` (hier: `div.custom-input-range-wrapper` + Direktive) | Zwei oder mehr `matInput` im selben `mat-form-field` |
| Beliebig viele **native** `<input>`, `<select>`, Buttons **als Kinder** dieses einen Hosts | Die Shell-Komponente **gleichzeitig** als `MatFormFieldControl` **und** mit innerem `mat-form-field` |
| Shell-Komponente kapselt `mat-form-field` + Label/Hint/Error | `formControlName` auf dem Shell-Host ohne klare CVA-Strategie (MVP: `[control]` wie `{component-prefix}-form-input`) |

Material sieht **einen** Control-Provider; die Mehrfach-Steuerung passiert **im DOM innerhalb** des Wrappers.

---

## Zwei-Schichten-Architektur

```mermaid
flowchart TB
  subgraph shell [Shell-Komponente z.B. {component-prefix}-form-field-play]
    MFF[mat-form-field]
    LABEL[mat-label]
    HINT[mat-hint]
    ERR[mat-error ein Block via errorMessage]
    FC[effectiveControl FormControl]
  end
  subgraph wrapper [div.custom-input-range-wrapper + Direktive]
    MFC[MatFormFieldControl Provider]
    INNER[Feature-Inhalt: 2+ inputs / selects / …]
  end
  MFF --> LABEL
  MFF --> wrapper
  MFF --> HINT
  MFF --> ERR
  FC -->|value disabled errorState| wrapper
  wrapper --> MFC
  INNER -->|Events| FC
  wrapper -->|focused touched empty| MFC
  MFC -->|shouldLabelFloat errorState| MFF
```

### Schicht 1 — Shell-Komponente (Orchestrator)

**Verantwortung:** Material-UI-Rahmen, Reactive Forms, Fehlertexte, Sichtbarkeit des Wrappers.

- Template enthält **ein** `mat-form-field` mit `mat-label`, optional `mat-hint`, **ein** `mat-error`.
- Bindet `[control]` (optional) + `internalControl` → `effectiveControl` (wie `{component-prefix}-form-input`).
- Reicht Wert/Status an den Wrapper: `[value]`, `[disabled]`, `[errorState]`.
- Mappt Innen-Events auf `effectiveControl.setValue` / `markAsTouched`.
- **Kein** `MatFormFieldControl` auf der Shell-Klasse.

### Schicht 2 — `.custom-input-range-wrapper` + Direktive

**Verantwortung:** Das **eine** Material-Control; Fokus/Leer-Zustand über **alle** inneren Felder aggregiert.

- `selector: '[{component-prefix}XyzControl]'` (projektspezifisch), `standalone: true`.
- `providers: [{ provide: MatFormFieldControl, useExisting: forwardRef(() => …) }]`.
- Host: `div.custom-input-range-wrapper`.
- Implementiert `MatFormFieldControl<T>` vollständig (siehe [references/mat-form-field-control-contract.md](references/mat-form-field-control-contract.md)).
- **Kein** `matInput` auf Kind-Elementen.
- **Kein** `NG_VALUE_ACCESSOR` auf der Direktive — Formularwert lebt in der Shell (`FormControl`).

---

## Sichtbarkeit: `.custom-input-range-wrapper--hidden`

**Problem:** Bei Outline-Feldern überlappt `mat-label` mit Platzhaltern der inneren Inputs, solange das Label noch nicht „schwebt“.

**Lösung:** Wrapper-Inhalt ausblenden, bis Label schweben würde — gleiche Logik wie `shouldLabelFloat` am Control:

```text
showRangeContent = rangeFocused || hasValue
```

| Zustand | Wrapper sichtbar | Platzhalter innerer Felder |
|---------|------------------|----------------------------|
| Leer, nicht fokussiert | nein (`--hidden`) | leer (`''`) |
| Fokussiert | ja | gesetzt |
| Wert gesetzt, nicht fokussiert | ja | gesetzt |

**Shell (Beispiel):**

```typescript
rangeFocused = false;

get hasValue(): boolean { /* vom effectiveControl-Wert */ }

get showRangeContent(): boolean {
  return this.rangeFocused || this.hasValue;
}

onRangeFocusedChange(focused: boolean): void {
  this.rangeFocused = focused;
  this.cdr.markForCheck();
}
```

**Template:**

```html
<div
  class="custom-input-range-wrapper"
  [class.custom-input-range-wrapper--hidden]="!showRangeContent"
  {component-prefix}NumberRangeControl
  (focusedChange)="onRangeFocusedChange($event)"
  …
>
```

**Direktive:** `@Output() focusedChange` bei `focusin` / echtem `focusout` (Fokuswechsel **zwischen** inneren Feldern zählt nicht als Blur des Wrappers — `relatedTarget` prüfen).

**CSS (minimal):** Modifikator `--hidden` mit `opacity: 0` und `pointer-events: none`. Klick ins leere Feld triggert weiterhin `mat-form-field` → `onContainerClick` auf dem Control.

---

## Mehrere Inputs / Selects innerhalb eines `mat-form-field`

1. **Direktive** am umschließenden `div` (`.custom-input-range-wrapper`, nicht an jedem Input).
2. **`empty`:** alle relevanten Teile leer (z. B. `from` und `to` beide `null`).
3. **`focused`:** `focusin` auf Wrapper; `focusout` nur wenn Fokus den Wrapper **verlässt** (nicht bei Tab von Input 1 → Input 2).
4. **`onContainerClick(event)`:** Wenn `event.target` ein inneres Input ist → dieses fokussieren und **return**; sonst erstes fokussierbares Kind fokussieren. **Niemals** blind immer das erste Input fokussieren — das blockiert Klicks auf das zweite Feld.
5. **`stateChanges`:** nach jeder Änderung von `focused`, `empty`, `errorState`, `disabled`, `value` (von außen per `@Input`) `next()` aufrufen.
6. **`errorState`:** von Shell: `effectiveControl.invalid && effectiveControl.touched`.
7. Innere Controls: **native** Elemente oder projektspezifische Komponenten **ohne** eigenes `mat-form-field` / `matInput`.

Selects, Buttons, Chips im Wrapper sind zulässig; `empty`/`onContainerClick` ggf. anpassen (z. B. erstes `input, select` fokussieren).

---

## Shell-Template (Pflichtgerüst)

```html
<mat-form-field
  [appearance]="appearance"
  [subscriptSizing]="subscriptSizing"
  [ngClass]="cssClass"
  style="width: 100%"
>
  <mat-label>{{ label }}</mat-label>

  <div
    class="custom-input-range-wrapper"
    [class.custom-input-range-wrapper--hidden]="!showRangeContent"
    {component-prefix}XyzControl
    [value]="controlValue"
    [disabled]="isDisabled"
    [errorState]="showErrorState"
    [placeholder]="combinedPlaceholder"
    (touched)="onControlTouched()"
    (focusedChange)="onControlFocusedChange($event)"
  >
    <!-- NUR HIER: feature-spezifischer Inhalt (inputs, selects, …) -->
  </div>

  <mat-hint *ngIf="hint">{{ hint }}</mat-hint>

  <mat-error *ngIf="errorMessage">{{ errorMessage }}</mat-error>
</mat-form-field>
```

### `mat-error` — ein Block

Mehrere `mat-error` mit `*ngIf` pro Validator sind zulässig; bevorzugt **ein** `mat-error` + Getter `errorMessage` mit Priorität:

```typescript
get errorMessage(): string | null {
  const c = this.effectiveControl;
  if (!c.touched || !c.invalid) return null;
  if (c.hasError('required')) return this.requiredErrorMessage;
  if (c.hasError('invalidRange')) return this.invalidRangeErrorMessage;
  return null;
}
```

Texte optional per `@Input()` überschreibbar.

---

## Forms-API (Shell)

Wie `{component-prefix}-form-input`:

```typescript
@Input() control: FormControl<T | null> | null = null;
readonly internalControl = new FormControl<T | null>(null);

get effectiveControl(): FormControl<T | null> {
  return this.control ?? this.internalControl;
}
```

- `valueChanges` / `statusChanges` → `markForCheck()`.
- Validatoren am `FormControl` des Parents setzen (nicht in der Direktive).
- Export von Validator-Funktionen aus dem Feature-Ordner (z. B. `invalidRangeValidator()`).

**Nutzung:**

```html
<{component-prefix}-form-field-play [label]="'Bereich'" [control]="rangeFc" />
```

---

## Checkliste: neues Custom-Input (nur Hülle)

1. [ ] Shell: `mat-form-field` + `mat-label` + optional `mat-hint` + ein `mat-error` / `errorMessage`.
2. [ ] Shell: `effectiveControl`, **kein** `MatFormFieldControl` auf der Komponente.
3. [ ] Direktive auf `div.custom-input-range-wrapper` mit `MatFormFieldControl`-Provider.
4. [ ] Kein `matInput` auf Kindern; kein zweites `mat-form-field` innen.
5. [ ] `focused` / `focusout` mit `relatedTarget`-Prüfung; `focusedChange` an Shell.
6. [ ] `onContainerClick`: angeklicktes Input respektieren.
7. [ ] `showRangeContent` + `--hidden` + Platzhalter nur wenn sichtbar (Label-Kollision vermeiden).
8. [ ] `errorState` und `value`/`disabled` von Shell an Direktive.
9. [ ] `(touched)` von Direktive → `effectiveControl.markAsTouched()`.
10. [ ] Unit-Tests: Fokus zwischen zwei inneren Feldern; `onContainerClick` auf zweitem Input; `errorMessage`; Validator.
11. [ ] Verzeichnis: Direktive + Modell (+ Spec) unter `reference/`; nur bei **zweitem** Shell-Consumer derselben Direktive → Variante B nach `{component-prefix}-<control>/`.

---

## Häufige Fehler

| Symptom | Ursache | Fix |
|---------|---------|-----|
| Fokus springt immer auf erstes Feld | `onContainerClick` fokussiert immer `querySelector('input')` | Bei Klick auf Input: `target.focus(); return` |
| Label + Platzhalter doppelt | Wrapper sichtbar obwohl leer/unfokussiert | `showRangeContent` + leere Platzhalter |
| Material ignoriert zweites Feld | Mehrere `matInput` | Nur eine Direktive = ein Control |
| Outline rot, kein Text | `errorState` ohne `mat-error` | `errorMessage` + `*ngIf` |
| Wert kommt nicht an | Logik nur in Direktive ohne `FormControl` | Shell schreibt `effectiveControl` |

---

## Was dieser Skill **nicht** festlegt

- Anordnung, Abstände, Breiten der inneren Felder (SCSS unter `.custom-input-range-wrapper`).
- Konkreter Werttyp `T` (z. B. `NumberRange`) und Validatoren.
- Anzahl und Art der inneren Controls.

Dafür reicht eine kurze Feature-Beschreibung im Prompt; die Hülle aus diesem Skill bleibt unverändert.

---

## Weiterführend

- [references/directory-layout.md](references/directory-layout.md) — `reference/` (Host-first), Variante B, Legacy-Migration, Anti-Patterns
- [references/mat-form-field-control-contract.md](references/mat-form-field-control-contract.md) — Pflichtfelder der Direktive
- [references/shell-snippet.md](references/shell-snippet.md) — kopierbare TS/HTML-Gerüste
