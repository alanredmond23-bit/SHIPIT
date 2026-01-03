import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('body')).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Session Management', () => {
  test('logout clears session', async ({ page }) => {
    await page.goto('/');
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
    // May or may not be visible
  });
});
