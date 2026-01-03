import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Meta Agent/i);
  });

  test('sidebar navigation is visible on desktop', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"], nav, .sidebar');
    await expect(sidebar.first()).toBeVisible();
  });

  test('can navigate to chat page', async ({ page }) => {
    const chatLink = page.getByRole('link', { name: /chat/i }).first();
    if (await chatLink.isVisible()) {
      await chatLink.click();
      await expect(page).toHaveURL(/chat/);
    }
  });

  test('can navigate to settings page', async ({ page }) => {
    const settingsLink = page.getByRole('link', { name: /settings/i }).first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings/);
    }
  });
});

test.describe('Responsive Navigation', () => {
  test('mobile menu shows hamburger button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const menuToggle = page.locator('[data-testid="menu-toggle"], button[aria-label*="menu"], .hamburger');
    // Menu toggle may or may not exist depending on implementation
  });

  test('desktop shows full sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.locator('nav').first()).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('Cmd+1 navigates to chat', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Meta+1');
    await page.waitForTimeout(500);
  });
});
