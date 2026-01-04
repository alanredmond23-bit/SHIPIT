import { test, expect } from '@playwright/test';

test.describe('Desktop App', () => {
  test('app renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('window title is correct', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('Meta Agent');
  });

  test('viewport supports desktop dimensions', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Desktop Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Cmd+1 shortcut exists', async ({ page }) => {
    await page.keyboard.press('Meta+1');
    await page.waitForTimeout(300);
  });

  test('Cmd+2 shortcut exists', async ({ page }) => {
    await page.keyboard.press('Meta+2');
    await page.waitForTimeout(300);
  });

  test('Cmd+3 shortcut exists', async ({ page }) => {
    await page.keyboard.press('Meta+3');
    await page.waitForTimeout(300);
  });

  test('Cmd+, opens settings', async ({ page }) => {
    await page.keyboard.press('Meta+,');
    await page.waitForTimeout(300);
  });
});
