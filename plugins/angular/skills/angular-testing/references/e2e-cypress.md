# E2E — Cypress (legacy)

Prefer [Playwright](e2e-playwright.md) for new projects. Use Cypress only where a project's existing E2E suite already runs on it.

```typescript
describe('Profiler', () => {
  beforeEach(() => {
    cy.visit('/?e2e-app');
    cy.get('ng-devtools-tabs').find('a').contains('Profiler').click();
  });

  it('should record and display profiling data', () => {
    cy.get('button[aria-label="start-recording-button"]').click();
    cy.get('body').find('#cards button').first().click();
    cy.get('button[aria-label="stop-recording-button"]').click();
    cy.get('ng-devtools-recording-timeline').find('canvas').should('be.visible');
  });
});
```

## Best Practices

- Use `data-cy` (or similar) attributes for selecting elements — resilient to CSS/structural changes.
- Encapsulate common action sequences into custom commands (`cypress/support/`).
- Prefer waiting for specific UI elements or network requests over arbitrary `cy.wait(ms)`.
