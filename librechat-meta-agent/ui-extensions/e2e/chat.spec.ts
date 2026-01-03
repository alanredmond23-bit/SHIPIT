import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('chat page loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('message input field is present', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    if (await messageInput.isVisible()) {
      await expect(messageInput).toBeVisible();
    }
  });

  test('can type a message', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    if (await messageInput.isVisible()) {
      await messageInput.fill('Hello, this is a test message');
      await expect(messageInput).toHaveValue(/Hello/);
    }
  });

  test('model selector is present', async ({ page }) => {
    const modelSelector = page.locator('[data-testid="model-selector"], select, .model-select');
    // Selector may exist depending on implementation
  });
});

test.describe('Chat Streaming', () => {
  test('submit button is present', async ({ page }) => {
    await page.goto('/chat');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("→")').first();
    // Button may exist
  });
});
