---
name: angular-styling
description: Use when styling Angular components — component style encapsulation, :host/:host-context/::ng-deep selectors, native CSS enter/leave animations or the legacy @angular/animations DSL, or integrating Tailwind CSS. Triggers on ViewEncapsulation questions, animate.enter/animate.leave, trigger()/transition() animation DSL, or Tailwind setup/build errors.
---

# Angular Styling

## Component styles & encapsulation

```ts
@Component({
  styles: `img { border-radius: 50%; }`,   // inline
  styleUrl: 'photo.component.css',          // or external file
})
export class Photo {}
```

| Mode | Behavior |
|---|---|
| `Emulated` (default) | Scoped via unique HTML attributes — global styles can still leak in. |
| `ShadowDom` | Native Shadow DOM isolation. |
| `None` | No encapsulation — component styles become global. |
| `ExperimentalIsolatedShadowDom` | Strictly only this component's styles apply. |

```ts
@Component({ encapsulation: ViewEncapsulation.None })
```

## Special selectors

- `:host` — the component's own host element.
- `:host-context(.theme-dark)` — style based on an ancestor condition.
- `::ng-deep` — leaks a rule past encapsulation into children. Angular team discourages this; supported only for backwards compatibility.

`<style>` in a template still respects encapsulation. `<link>`/`@import` in CSS counts as external — **not** affected by emulated encapsulation.

## Animations

Check the project's Angular version first — **v20.2+**: prefer native CSS `animate.enter`/`animate.leave`. Older / already using `@angular/animations` heavily: legacy DSL. Don't mix both in one component. Full patterns (staggering, auto-height via CSS grid, programmatic control via `element.getAnimations()`, legacy `trigger()/transition()` DSL): [references/animations.md](references/animations.md).

## Tailwind CSS

Only if the project actually uses Tailwind — check for `tailwind`/`@tailwindcss/postcss` in `package.json` first, and check the project's own conventions for an outright ban before adding it. v4 setup, `ng add tailwindcss`, common v3→v4 mistakes to avoid: [references/tailwind.md](references/tailwind.md).
