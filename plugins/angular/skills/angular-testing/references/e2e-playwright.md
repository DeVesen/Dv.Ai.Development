# E2E — Playwright

```typescript
import { test, expect } from '@playwright/test';

test('should submit the form and show a confirmation', async ({ page }) => {
  await page.goto('/orders/new');

  await page.getByLabel('Customer name').fill('Test User');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Order submitted')).toBeVisible();
});
```

## Best practices

- Prefer role/label/text locators (`getByRole`, `getByLabel`, `getByText`) over CSS selectors — resilient to markup changes.
- Prefer Playwright's built-in auto-waiting (`expect(locator).toBeVisible()`) over arbitrary `page.waitForTimeout()`.
- Use `test.step()` to structure multi-step flows for readable failure output.
- Run against a real build of the app, not mocked components — E2E is meant to catch integration issues unit/integration-style tests can't.
