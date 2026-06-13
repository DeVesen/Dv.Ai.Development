# Drag and Drop

**Kategorie:** Components
**Import:** `DragDropModule` from `@angular/cdk/drag-drop`
**URL:** https://material.angular.dev/cdk/drag-drop/overview

## Übersicht

Das `drag-drop`-Paket bietet eine vollständige Drag-and-Drop-Lösung für Angular-Anwendungen. Elemente können mit der `cdkDrag`-Direktive versehen werden, um sie draggable zu machen. Durch `cdkDropList` können Drop-Zonen definiert werden, die automatisch Sortierung und Übertragung zwischen Listen ermöglichen. Das Modul unterstützt sowohl freies Drag als auch listenbasiertes Sortieren, mit zahlreichen Anpassungsoptionen für Vorschau-Elemente, Platzhalter und Achsenbeschränkungen.

## Wichtige Direktiven/Services/Tokens

| Symbol | Typ | Beschreibung |
|---|---|---|
| `DragDropModule` | NgModule | Haupt-Modul |
| `CdkDrag` | Direktive | Macht Element draggable; Selector: `[cdkDrag]` |
| `CdkDropList` | Direktive | Drop-Zone; Selector: `[cdkDropList]` |
| `CdkDropListGroup` | Direktive | Gruppe von Drop-Listen |
| `CdkDragHandle` | Direktive | Drag-Handle; Selector: `[cdkDragHandle]` |
| `CdkDragPreview` | Direktive | Benutzerdefinierte Drag-Vorschau |
| `CdkDragPlaceholder` | Direktive | Platzhalter während des Drags |
| `DragDrop` | Service | Programmatische API |
| `DragDropRegistry` | Service | Globale Registrierung aller Drag-Instanzen |

**CdkDrag Inputs:**
- `cdkDragData: T` — Beliebige Daten am Drag-Element
- `cdkDragLockAxis: 'x' | 'y'` — Bewegungsachse einschränken
- `cdkDragBoundary: string | Element` — Bewegungsgrenze
- `cdkDragRootElement: string` — CSS-Selektor für Root-Element
- `cdkDragStartDelay: number | {touch, mouse}` — Verzögerung
- `cdkDragFreeDragPosition: Point` — Position für freies Drag
- `cdkDragDisabled: boolean` — Drag deaktivieren
- `cdkDragConstrainPosition: (point, dragRef) => Point` — Position einschränken
- `cdkDragPreviewClass: string | string[]` — CSS-Klassen für Preview
- `cdkDragPreviewContainer: 'global' | 'parent' | ElementRef` — Preview-Container

**CdkDrag Outputs:**
- `cdkDragStarted: CdkDragStart` — Drag begonnen
- `cdkDragEnded: CdkDragEnd` — Drag beendet
- `cdkDragEntered: CdkDragEnter` — Element in neue Liste eingetreten
- `cdkDragExited: CdkDragExit` — Element aus Liste ausgetreten
- `cdkDragDropped: CdkDragDrop` — Element abgelegt
- `cdkDragMoved: Observable<CdkDragMove>` — Während Bewegung

**CdkDrag Methoden:**
- `getPlaceholderElement(): HTMLElement`
- `getRootElement(): HTMLElement`
- `reset()` — Position zurücksetzen
- `getFreeDragPosition(): Point`
- `setFreeDragPosition(value: Point): void`

**CdkDropList Inputs:**
- `cdkDropListData: T[]` — Verbundene Datenliste
- `cdkDropListConnectedTo: CdkDropList[]` — Verknüpfte Drop-Listen
- `cdkDropListOrientation: 'horizontal' | 'vertical' | 'mixed'`
- `cdkDropListDisabled: boolean`
- `cdkDropListSortingDisabled: boolean`
- `cdkDropListEnterPredicate: (drag, drop) => boolean`
- `cdkDropListSortPredicate: (index, drag, drop) => boolean`

**CdkDropList Outputs:**
- `cdkDropListDropped: CdkDragDrop<T>` — Element abgelegt
- `cdkDropListEntered: CdkDragEnter<T>` — Element eingetreten
- `cdkDropListExited: CdkDragExit<T>` — Element ausgetreten
- `cdkDropListSorted: CdkDragSortEvent<T>` — Reihenfolge geändert

## Verwendungsbeispiel

```html
<!-- Sortierbare Liste -->
<div
  cdkDropList
  [cdkDropListData]="items"
  (cdkDropListDropped)="drop($event)">
  <div
    *ngFor="let item of items"
    cdkDrag
    [cdkDragData]="item"
    class="drag-item">
    {{ item.name }}
    <span cdkDragHandle>⠿</span>
  </div>
</div>
```

```typescript
import { moveItemInArray, transferArrayItem, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({ ... })
export class DragListComponent {
  items = [
    { name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }
  ];

  drop(event: CdkDragDrop<typeof this.items>) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }
}
```

```html
<!-- Zwischen zwei Listen verschieben -->
<div cdkDropList #list1="cdkDropList" [cdkDropListConnectedTo]="[list2]"
     [cdkDropListData]="list1Items" (cdkDropListDropped)="drop($event)">
  <div *ngFor="let item of list1Items" cdkDrag>{{ item }}</div>
</div>
<div cdkDropList #list2="cdkDropList" [cdkDropListConnectedTo]="[list1]"
     [cdkDropListData]="list2Items" (cdkDropListDropped)="drop($event)">
  <div *ngFor="let item of list2Items" cdkDrag>{{ item }}</div>
</div>
```

```typescript
drop(event: CdkDragDrop<string[]>) {
  if (event.previousContainer === event.container) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  } else {
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
}
```

## Besonderheiten

- **Hilfsfunktionen**: `moveItemInArray()` und `transferArrayItem()` erleichtern Array-Manipulation nach Drops.
- **Animationen**: CSS-Transitions können auf `.cdk-drag-animating` angewendet werden.
- **Vorschau-Element**: Das Standard-Preview kann durch `<ng-template cdkDragPreview>` überschrieben werden.
- **Platzhalter**: Anpassbar durch `<ng-template cdkDragPlaceholder>`.
- **Scroll**: Automatisches Scrollen ist unterstützt; `cdkScrollable` muss ggf. hinzugefügt werden.
- **Touch**: Funktioniert auf Touch-Geräten; `cdkDragStartDelay` verhindert versehentliches Drag beim Scrollen.
