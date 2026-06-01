import { test, expect } from '@playwright/test';

test.describe('Incidents', () => {
  test('incidents page requires auth', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    await expect(page).toHaveURL(/.*auth.*/);
  });
});
