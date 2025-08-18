import { test, expect } from '@playwright/test';

const email = 'giulia.ranchetti1995@gmail.com';
const password = 'Giulia1995@@';

test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/login/);

  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email' }).fill(email!);
  await page.waitForTimeout(1000);

  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Password' }).fill(password!);
  await page.waitForTimeout(1000);

  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForTimeout(2000);
});
