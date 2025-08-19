import { test, expect } from '@playwright/test';

// Generate a random user to avoid collisions with existing accounts
const uniqueId = Date.now();
const email = `testuser_${uniqueId}@yopmail.com`;
const password = `TestPass!${uniqueId}`;

test.describe('authentication flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('user can sign up and log in', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveURL(/\/signup/);

    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);

    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Password' }).fill(password);

    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/\/login/);

    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);

    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Password' }).fill(password);

    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: 'Login' }).click();
    
  });
});
