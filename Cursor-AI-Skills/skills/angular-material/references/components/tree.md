# Tree

**Kategorie:** Layout
**Selector:** `<mat-tree>`, `mat-tree-node`, `mat-nested-tree-node`
**Import:** `MatTreeModule` from `@angular/material/tree`; Standalone: `MatTree`, `MatTreeNode`, `MatNestedTreeNode`, `MatTreeNodeDef`, `MatTreeNodePadding`, `MatTreeNodeToggle`
**URL:** https://material.angular.dev/components/tree/overview

## Übersicht

Hierarchischer Daten-Viewer basierend auf dem CDK-Tree. Zwei Rendering-Modi: flacher Tree (`FlatTreeControl`) für Virtualisierung bei großen Datenmengen, verschachtelter Tree (`NestedTreeControl`) für natürliche HTML-Hierarchien. Knoten über `MatTreeNodeDef`-Direktiven definiert.

## Wichtige Direktiven

| Direktive | Selektor | Beschreibung |
|-----------|---------|-------------|
| `MatTreeNodeDef` | `[matTreeNodeDef]` | Template für Tree-Knoten |
| `MatTreeNodePadding` | `[matTreeNodePadding]` | Einrückung für flache Trees |
| `MatTreeNodeToggle` | `[matTreeNodeToggle]` | Toggle für Knoten-Expansion |
| `MatTreeNodeOutlet` | `[matTreeNodeOutlet]` | Outlet für Knotenrendering |

## Verwendungsbeispiel

```html
<!-- Flacher Tree -->
<mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
  <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
    <button mat-icon-button disabled></button>
    {{ node.name }}
  </mat-tree-node>

  <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
    <button mat-icon-button [attr.aria-label]="'Toggle ' + node.name"
            matTreeNodeToggle>
      <mat-icon>
        {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
      </mat-icon>
    </button>
    {{ node.name }}
  </mat-tree-node>
</mat-tree>
```

## Besonderheiten / Gotchas

- `FlatTreeControl` für große Datensätze mit Virtual Scrolling empfohlen
- `NestedTreeControl` einfacheres API, weniger performant bei vielen Knoten
- Eigene Einrückung via `[matTreeNodePaddingIndent]` (in px)
