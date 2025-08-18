import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test('user can log in', async ({ page }) => {
  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD must be set');

  await page.goto('/login');
  await page.fill('input[type="email"]', email!);
  await page.fill('input[type="password"]', password!);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/routes/);
});
