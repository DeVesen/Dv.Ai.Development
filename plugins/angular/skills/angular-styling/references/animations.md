# Angular Animations

Check the project's Angular version in `package.json` first.

## Native CSS animations (v20.2+, recommended)

`animate.enter`/`animate.leave` apply CSS classes as an element enters/leaves the DOM. Angular removes the enter classes when done; for `animate.leave` it waits for the animation to finish before removing the element.

```html
@if (isShown()) {
  <div class="enter-container" animate.enter="enter-animation">
    <p>The box is entering.</p>
  </div>
}
```

```css
.enter-animation { animation: slide-fade 1s; }
@keyframes slide-fade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Bind to events, or hand off to a JS library (e.g. GSAP):

```html
@if (show()) { <div (animate.leave)="onLeave($event)">...</div> }
```

```ts
onLeave(event: AnimationCallbackEvent) {
  // CRITICAL: must call animationComplete() or Angular never removes the element
  event.animationComplete();
}
```

## Advanced CSS animations

Toggle a class via property binding to trigger a transition:

```html
<div [class.open]="isOpen">...</div>
```
```css
div { transition: height 0.3s ease-out; height: 100px; }
div.open { height: 200px; }
```

Animate to auto-height via CSS grid:

```css
.container { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s; }
.container.open { grid-template-rows: 1fr; }
.container > div { overflow: hidden; }
```

- **Staggering:** different `animation-delay`/`transition-delay` per list item.
- **Parallel:** multiple animations in one `animation` shorthand (`animation: rotate 3s, fade-in 2s;`).
- **Programmatic control:** `element.getAnimations()` (standard Web API) — `.pause()`, etc.

## Legacy animations DSL (deprecated)

Pre-v20.2, or a project already heavily using `@angular/animations`. **Never mix legacy animations and `animate.enter`/`leave` in the same component.**

```ts
bootstrapApplication(App, { providers: [provideAnimationsAsync()] });
```

```ts
@Component({
  animations: [
    trigger('openClose', [
      state('open', style({opacity: 1})),
      state('closed', style({opacity: 0})),
      transition('open <=> closed', [animate('0.5s')]),
    ]),
  ],
  template: `<div [@openClose]="isOpen() ? 'open' : 'closed'">...</div>`,
})
export class OpenClose {
  isOpen = signal(true);
}
```
