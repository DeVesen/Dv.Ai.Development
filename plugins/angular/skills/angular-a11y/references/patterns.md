# Angular Aria — Pattern Reference

## Accordion

**Imports:** `import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';`
**Directives:** `ngAccordionGroup`, `ngAccordionTrigger`, `ngAccordionPanel`, `ngAccordionContent` (lazy loading).

```html
<div ngAccordionGroup [multiExpandable]="false">
  <div class="accordion-item">
    <button ngAccordionTrigger panelId="panel-1" class="accordion-header">
      Section 1 <span class="icon">▼</span>
    </button>
    <div ngAccordionPanel panelId="panel-1" class="accordion-panel">
      <ng-template ngAccordionContent><p>Lazy loaded content here.</p></ng-template>
    </div>
  </div>
</div>
```

```css
.accordion-header[aria-expanded='true'] .icon { transform: rotate(180deg); }
```

## Listbox

**Imports:** `import {Listbox, Option} from '@angular/aria/listbox';`
**Directives:** `ngListbox`, `ngOption`.

```html
<ul ngListbox [(values)]="selectedItems" orientation="horizontal" [multi]="true">
  <li ngOption value="apple" class="option">Apple</li>
  <li ngOption value="banana" class="option">Banana</li>
</ul>
```

```css
.option[aria-selected='true'] { background: #e0f7fa; font-weight: bold; }
.option:focus-visible { outline: 2px solid blue; }
```

## Combobox, Select, Multiselect

Combine `ngCombobox` with a popup containing an `ngListbox`. Combobox = text input + popup (autocomplete). Select = readonly Combobox + single-select Listbox. Multiselect = readonly Combobox + multi-select Listbox.

**Imports:**
```
import {Combobox, ComboboxInput, ComboboxPopupContainer} from '@angular/aria/combobox';
import {Listbox, Option} from '@angular/aria/listbox';
```

```html
<div ngCombobox [readonly]="true">
  <button ngComboboxInput class="select-trigger">{{ selectedValue() || 'Choose an option' }}</button>
  <ng-template ngComboboxPopupContainer>
    <ul ngListbox [(values)]="selectedValue" class="dropdown-menu">
      <li ngOption value="option1">Option 1</li>
    </ul>
  </ng-template>
</div>
```

Style the popup like a floating dropdown (often paired with CDK Overlay).

## Menu and Menubar

**Imports:** `import {MenuBar, Menu, MenuContent, MenuItem} from '@angular/aria/menu';`
**Directives:** `ngMenuBar`, `ngMenu`, `ngMenuItem`, `ngMenuTrigger`.

```html
<ul ngMenuBar class="menubar">
  <li ngMenuItem value="file"><button ngMenuTrigger [menu]="fileMenu">File</button></li>
</ul>
<ul ngMenu #fileMenu="ngMenu" class="menu">
  <li ngMenuItem value="new">New</li>
  <li ngMenuItem value="open">Open</li>
</ul>
```

Flexbox for the menubar; show/hide submenus based on trigger state.

## Tabs

**Imports:** `import {Tab, Tabs, TabList, TabPanel, TabContent} from '@angular/aria/tabs';`
**Directives:** `ngTabs`, `ngTabList`, `ngTab`, `ngTabPanel`, `ngTabContent`.

```html
<div ngTabs>
  <ul ngTabList class="tab-list">
    <li ngTab value="profile" class="tab-btn">Profile</li>
    <li ngTab value="security" class="tab-btn">Security</li>
  </ul>
  <div ngTabPanel value="profile" class="tab-panel">
    <ng-template ngTabContent>Profile Settings</ng-template>
  </div>
</div>
```

```css
.tab-btn[aria-selected='true'] { border-bottom-color: blue; font-weight: bold; }
```

## Toolbar

**Imports:** `import {Toolbar, ToolbarWidget, ToolbarWidgetGroup} from '@angular/aria/toolbar';`
**Directives:** `ngToolbar`, `ngToolbarWidget`, `ngToolbarWidgetGroup`.

```html
<div ngToolbar class="toolbar">
  <div ngToolbarWidgetGroup [multi]="true" role="group" aria-label="Formatting">
    <button ngToolbarWidget value="bold" class="tool-btn">B</button>
    <button ngToolbarWidget value="italic" class="tool-btn">I</button>
  </div>
</div>
```

Target `[aria-pressed="true"]` (toggle buttons) or `[aria-checked="true"]` (radio groups).

## Tree

**Imports:** `import {Tree, TreeItem, TreeItemGroup} from '@angular/aria/tree';`
**Directives:** `ngTree`, `ngTreeItem`, `ngTreeGroup`.

```html
<ul ngTree class="tree">
  <li ngTreeItem value="documents">
    <span class="tree-label">Documents</span>
    <ul ngTreeGroup class="tree-group"><li ngTreeItem value="resume">Resume.pdf</li></ul>
  </li>
</ul>
```

Target `[aria-expanded]` to show/hide children or rotate chevron icons; `padding-left` on nested groups for hierarchy.

## Grid

**Imports:** `import {Grid, GridRow, GridCell, GridCellWidget} from '@angular/aria/grid';`
**Directives:** `ngGrid`, `ngGridRow`, `ngGridCell`, `ngGridCellWidget`.

```html
<table ngGrid [multi]="true" [enableSelection]="true" class="grid-table">
  <tr ngGridRow>
    <th ngGridCell role="columnheader">Name</th>
  </tr>
  <tr ngGridRow>
    <td ngGridCell [(selected)]="isSelected">
      <button ngGridCellWidget (activated)="onActivate()">Active</button>
    </td>
  </tr>
</table>
```

Target `[aria-selected="true"]` for selected cells, `:focus-visible` for the active cell (roving tabindex), or `[aria-activedescendant]` on the container.
