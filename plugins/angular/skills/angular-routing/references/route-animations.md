# Route Transition Animations

Angular Router supports the browser's View Transitions API for smooth visual transitions between routes.

```ts
provideRouter(routes, withViewTransitions());
```

Progressive enhancement — browsers without support still route, just without the animation.

## How it works

1. Browser screenshots the old state.
2. Router updates the DOM (activates the new component).
3. Browser screenshots the new state.
4. Browser animates between the two.

## Customizing with CSS

Define transitions in **global** CSS (not component-scoped) using `::view-transition-old()`/`::view-transition-new()`:

```css
::view-transition-old(root) { animation: 90ms cubic-bezier(0.4, 0, 1, 1) both fade-out; }
::view-transition-new(root) { animation: 210ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in; }
```

## Advanced control

```ts
withViewTransitions({
  onViewTransitionCreated: ({transition, from, to}) => {
    if (to.url === '/no-animation') transition.skipTransition();
  },
});
```

Assign unique `view-transition-name` to elements that should transition smoothly across routes (e.g. a header image).
