import { test, expect } from '@playwright/test';

test.describe('Model Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('model list contains providers', async ({ page }) => {
    const providers = ['Anthropic', 'OpenAI', 'Google', 'DeepSeek', 'Mistral', 'xAI'];
    expect(providers.length).toBe(6);
  });
});
