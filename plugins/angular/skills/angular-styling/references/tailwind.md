# Tailwind CSS with Angular

**Tailwind v4 only.** Do not revert to v3 patterns (`tailwind.config.js`, `@tailwind base/components/utilities`) — that breaks the build.

## Automated setup (recommended)

```shell
ng add tailwindcss
```

Installs Tailwind + peer deps, configures the project, adds the import to global styles.

## Manual setup (v4)

```shell
npm install tailwindcss @tailwindcss/postcss postcss
```

`.postcssrc.json`:

```json
{ "plugins": { "@tailwindcss/postcss": {} } }
```

Do **not** create a `tailwind.config.js` — v4 configuration lives in CSS via theme variables.

Global styles (`styles.css`):

```css
@import 'tailwindcss';
```

SCSS: `@use 'tailwindcss';` instead.

```html
<h1 class="text-3xl font-bold underline">Hello world!</h1>
```

## Summary

- Use `@import 'tailwindcss';` — never `@tailwind base; @tailwind components; @tailwind utilities;`.
- No `tailwind.config.js` — configuration via CSS theme variables / PostCSS config.
- Stick strictly to v4 syntax.
