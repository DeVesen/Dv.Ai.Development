# Rendering Strategies

## Client-Side Rendering (CSR) — default

Rendered entirely in the browser. Interactive dashboards, internal tools. Simplest to configure, low server cost — but poor SEO and slower initial content visibility.

## Static Site Generation (SSG / prerendering)

Pre-rendered to static HTML at build time. Marketing pages, blogs, docs. Fastest initial load, best SEO, CDN-friendly — but needs a rebuild for content updates, and isn't for user-specific data.

## Server-Side Rendering (SSR)

Rendered on the server for the initial request; subsequent navigation is client-side. E-commerce, news, personalized dynamic content. Excellent SEO, fast initial content — but needs a Node.js server, higher cost/latency.

## Hydration

Makes server-rendered HTML interactive in the browser.

- **Full hydration:** entire app becomes interactive at once.
- **Incremental hydration:** parts become interactive as needed via `@defer` blocks.
- **Event replay:** captures and replays user events that happened before hydration finished.
- **Debugging a stuck hydration (`NG0506`, app never reports stable):** add `provideStabilityDebugging()` to the app providers — logs diagnostics about what's blocking `ApplicationRef` stability if it doesn't stabilize within 10s. Included by default in dev mode alongside `provideClientHydration()`; add it manually for production builds or SSR without hydration.

## Decision matrix

| Requirement | Strategy |
|---|---|
| SEO + static content | SSG |
| SEO + dynamic content | SSR |
| No SEO, high interactivity | CSR |
| Mixed | Hybrid (route-based) |
