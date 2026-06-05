# Tree

**Kategorie:** Components
**Import:** `CdkTreeModule` from `@angular/cdk/tree`
**URL:** https://material.angular.dev/cdk/tree/overview

## Übersicht

Das `tree`-Paket bietet eine leistungsfähige, unstyled Baumstruktur-Komponente für Angular. Es unterstützt sowohl flache (Flat Tree) als auch verschachtelte (Nested Tree) Darstellungen. Die `cdk-tree`-Komponente verwaltet Knotenexpansion, Tastaturnavigation, ARIA-Attribute und bietet flexible Datenquellen-Unterstützung. `FlatTreeControl` und `NestedTreeControl` werden für ältere Implementierungen unterstützt; moderne Implementierungen verwenden `levelAccessor` und `childrenAccessor` direkt.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `CdkTreeModule` | NgModule | Haupt-Modul |
| `CdkTree<T, K>` | Komponente | Baum-Container; Selector: `cdk-tree` |
| `CdkTreeNode<T, K>` | Direktive | Baum-Knoten; Selector: `cdk-tree-node` |
| `CdkTreeNodeDef<T>` | Direktive | Knoten-Template; Selector: `[cdkTreeNodeDef]` |
| `CdkTreeNodePadding<T>` | Direktive | Einrückung; Selector: `[cdkTreeNodePadding]` |
| `CdkTreeNodeToggle<T>` | Direktive | Expand/Collapse-Button; Selector: `[cdkTreeNodeToggle]` |
| `CdkTreeNodeOutlet` | Direktive | Rendering-Outlet; Selector: `[cdkTreeNodeOutlet]` |
| `TreeControl<T>` | Interface | Abstrakte Baumsteuerung (veraltet) |
| `FlatTreeControl<T>` | Klasse | Steuerung für Flat Trees (veraltet) |
| `NestedTreeControl<T>` | Klasse | Steuerung für Nested Trees (veraltet) |

**CdkTree Inputs:**
- `dataSource: DataSource<T> | Observable<T[]> | T[]` — Datenquelle
- `treeControl: TreeControl<T>` — Baumsteuerung (veraltet)
- `levelAccessor: (node: T) => number` — Level-Berechnung (empfohlen)
- `childrenAccessor: (node: T) => T[] | Observable<T[]>` — Kind-Knoten (empfohlen)
- `trackBy: TrackByFunction<T>` — Identifikation

**CdkTreeNode Inputs:**
- `cdkTreeNodeTypeaheadLabel: string` — Typeahead-Label für Tastaturnavigation

**CdkTreeNodePadding Inputs:**
- `cdkTreeNodePaddingIndent: number` — Einrückung pro Level in px (Standard: 28)
- `level: number` — Manuell gesetztes Level

**CdkTreeNodeToggle:**
- `[cdkTreeNodeToggleRecursive]="true"` — Rekursives Expand/Collapse

## Verwendungsbeispiel

```typescript
interface FoodNode {
  name: string;
  children?: FoodNode[];
}

const TREE_DATA: FoodNode[] = [
  {
    name: 'Früchte',
    children: [
      { name: 'Apfel' },
      { name: 'Banane' },
      { name: 'Kirsche', children: [{ name: 'Sauerkirsche' }] }
    ]
  },
  { name: 'Gemüse', children: [{ name: 'Tomate' }, { name: 'Gurke' }] }
];

@Component({
  template: `
    <cdk-tree [dataSource]="dataSource" [childrenAccessor]="childrenAccessor">
      <cdk-tree-node *cdkTreeNodeDef="let node"
                     [cdkTreeNodePaddingIndent]="24"
                     cdkTreeNodePadding>
        <button cdkTreeNodeToggle [attr.aria-label]="'Toggle ' + node.name">
          {{ hasChildren(node) ? (isExpanded(node) ? '▼' : '▶') : '' }}
        </button>
        {{ node.name }}
      </cdk-tree-node>
    </cdk-tree>
  `
})
export class TreeComponent {
  dataSource = TREE_DATA;

  childrenAccessor = (node: FoodNode) => node.children ?? [];

  hasChildren = (_: number, node: FoodNode) =>
    !!node.children && node.children.length > 0;
}
```

```typescript
// Moderner Ansatz mit Observable-Datenquelle
import { CdkTreeModule } from '@angular/cdk/tree';
import { ArrayDataSource } from '@angular/cdk/collections';

// Flat Tree (alle Knoten auf einer Ebene, Level über levelAccessor)
interface FlatNode {
  name: string;
  level: number;
  expandable: boolean;
}

@Component({ ... })
export class FlatTreeComponent {
  flatNodes: FlatNode[] = [/* ... */];
  dataSource = new ArrayDataSource(this.flatNodes);
  levelAccessor = (node: FlatNode) => node.level;
}
```

## Besonderheiten

- **Flach vs. Verschachtelt**: Flat Trees speichern alle Knoten in einer flachen Liste mit Level-Information; Nested Trees haben verschachtelte Datenstrukturen. Flat Trees sind oft performanter.
- `FlatTreeControl` und `NestedTreeControl` sind **veraltet** — `levelAccessor` und `childrenAccessor` sind die empfohlene Alternative.
- Tastaturnavigation folgt WAI-ARIA Tree Pattern: Pfeiltasten zum Navigieren, Enter/Space zum Aktivieren, Home/End für erste/letzte Knoten.
- ARIA-Attribute (`role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset`) werden automatisch berechnet und gesetzt.
- `CdkTreeNodePadding` berechnet die Einrückung automatisch basierend auf dem Level.
