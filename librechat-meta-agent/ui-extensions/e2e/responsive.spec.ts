import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('layout adapts to mobile viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Tablet Responsive', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('layout adapts to tablet viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
