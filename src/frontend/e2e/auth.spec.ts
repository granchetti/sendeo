import { test, expect } from '@playwright/test';

const uniqueId = Date.now();
const email = `testuser_${uniqueId}@yopmail.com`;
const password = `TestPass!${uniqueId}`;

test.describe('authentication flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('user can sign up and log in', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveURL(/\/signup/);

    await page.getByTestId('signup-email').fill(email);
    await expect(page.getByTestId('signup-email')).toHaveValue(
      email,
    );

    await page.getByTestId('signup-password').fill(password);
    await expect(page.getByTestId('signup-password')).toHaveValue(
      password,
    );

    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/\/login/);

    await page.getByTestId('login-email').fill(email);
    await expect(page.getByTestId('login-email')).toHaveValue(
      email,
    );

    await page.getByTestId('login-password').fill(password);
    await expect(page.getByTestId('login-password')).toHaveValue(
      password,
    );

    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(
      page.getByRole('heading', { name: 'Plan Your Perfect Route' }),
    ).toBeVisible();
  });
});
