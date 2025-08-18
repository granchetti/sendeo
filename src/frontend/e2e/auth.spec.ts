import { test, expect } from '@playwright/test';

// Generate a random user to avoid collisions with existing accounts
const uniqueId = Date.now();
const email = `testuser_${uniqueId}@example.com`;
const password = `TestPass!${uniqueId}`;

test.describe('authentication flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('user can sign up', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);

    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Password' }).fill(password);

    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // After sign up, the user should be redirected to confirm signup page
    await expect(page).toHaveURL(/\/confirm-signup/);
  });

  test('user can log in', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);

    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Password' }).fill(password);

    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL(/\/routes/);
  });
});
