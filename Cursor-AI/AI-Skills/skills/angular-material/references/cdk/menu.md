# Menu

**Kategorie:** Components
**Import:** `CdkMenuModule` from `@angular/cdk/menu`
**URL:** https://material.angular.dev/cdk/menu/overview

## Übersicht

Das `menu`-Paket implementiert barrierefreie Menü-Komponenten gemäß WAI-ARIA Menu Pattern. Es unterstützt verschachtelte Submenüs, Menüleisten, Kontext-Menüs (Rechtsklick), Checkbox-Items und Radio-Items. Alle Komponenten sind vollständig unstyled und bauen auf dem Overlay-CDK auf. Die Navigation erfolgt per Tastatur gemäß ARIA-Spezifikation (Pfeiltasten, Escape, Tab).

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkMenuModule` | NgModule | Haupt-Modul |
| `CdkMenu` | Direktive | Menü-Container; Selector: `[cdkMenu]` |
| `CdkMenuBar` | Direktive | Horizontale Menüleiste; Selector: `[cdkMenuBar]` |
| `CdkMenuItem` | Direktive | Menü-Item; Selector: `[cdkMenuItem]` |
| `CdkMenuItemCheckbox` | Direktive | Checkbox-Item; Selector: `[cdkMenuItemCheckbox]` |
| `CdkMenuItemRadio` | Direktive | Radio-Item; Selector: `[cdkMenuItemRadio]` |
| `CdkMenuGroup` | Direktive | Gruppierung für Radio/Checkbox-Items |
| `CdkMenuTrigger` | Direktive | Trigger für Submenüs; Selector: `[cdkMenuTriggerFor]` |
| `CdkContextMenuTrigger` | Direktive | Kontextmenü-Trigger; Selector: `[cdkContextMenuTriggerFor]` |
| `MenuStack` | Service | Verwaltung des Menü-Stacks |

**CdkMenu Outputs:**
- `closed: EventEmitter<void>` — Menü geschlossen

**CdkMenuItem Inputs:**
- `cdkMenuItemDisabled: boolean` — Item deaktivieren
- `cdkMenuItemTriggersSubmenu: boolean` — Zeigt an ob Submenü vorhanden

**CdkMenuTrigger Inputs:**
- `cdkMenuTriggerFor: TemplateRef` — Template des Submenüs
- `cdkMenuPosition: ConnectedPosition[]` — Positionierung

**CdkContextMenuTrigger Inputs:**
- `cdkContextMenuTriggerFor: TemplateRef` — Template des Kontextmenüs

## Verwendungsbeispiel

```html
<!-- Einfaches Menü -->
<button [cdkMenuTriggerFor]="myMenu">Menü öffnen</button>

<ng-template #myMenu>
  <div cdkMenu>
    <button cdkMenuItem (cdkMenuItemTriggered)="onNew()">Neu</button>
    <button cdkMenuItem (cdkMenuItemTriggered)="onOpen()">Öffnen</button>
    <button cdkMenuItem [cdkMenuItemDisabled]="!canSave" (cdkMenuItemTriggered)="onSave()">
      Speichern
    </button>
  </div>
</ng-template>
```

```html
<!-- Menüleiste mit Submenüs -->
<div cdkMenuBar>
  <button cdkMenuItem [cdkMenuTriggerFor]="fileMenu">Datei</button>
  <button cdkMenuItem [cdkMenuTriggerFor]="editMenu">Bearbeiten</button>
</div>

<ng-template #fileMenu>
  <div cdkMenu>
    <button cdkMenuItem (cdkMenuItemTriggered)="onNew()">Neu</button>
    <button cdkMenuItem [cdkMenuTriggerFor]="recentMenu">Zuletzt verwendet</button>
  </div>
</ng-template>
```

```html
<!-- Kontextmenü -->
<div [cdkContextMenuTriggerFor]="contextMenu">
  Rechtsklick auf mich!
</div>

<ng-template #contextMenu>
  <div cdkMenu>
    <button cdkMenuItem (cdkMenuItemTriggered)="onCopy()">Kopieren</button>
    <button cdkMenuItem (cdkMenuItemTriggered)="onPaste()">Einfügen</button>
  </div>
</ng-template>
```

```html
<!-- Checkbox und Radio Items -->
<ng-template #optionsMenu>
  <div cdkMenu>
    <div cdkMenuGroup>
      <button cdkMenuItemRadio [cdkMenuItemChecked]="view==='grid'"
              (cdkMenuItemTriggered)="view='grid'">
        Rasteransicht
      </button>
      <button cdkMenuItemRadio [cdkMenuItemChecked]="view==='list'"
              (cdkMenuItemTriggered)="view='list'">
        Listenansicht
      </button>
    </div>
  </div>
</ng-template>
```

## Besonderheiten

- ARIA-Attribute (`role="menu"`, `role="menuitem"`, `role="menuitemcheckbox"`, `role="menuitemradio"`) werden automatisch gesetzt.
- Tastaturnavigation: Pfeiltasten für Navigation, Enter/Space zum Aktivieren, Escape zum Schließen, Tab zum Verlassen.
- Menüs öffnen/schließen automatisch bei Hover in Menüleisten.
- `CdkMenuItemSelectable` ist die abstrakte Basisklasse für Checkbox- und Radio-Items.
