import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveTitle(/Agentcy Control/);
    await expect(page.locator('text=Sign in to your agency')).toBeVisible();
  });

  test('password validation shows on signup', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Get started');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'weak');
    await expect(page.locator('text=Password strength')).toBeVisible();
  });

  test('dashboard redirects unauthenticated users to auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth.*/);
  });
});
