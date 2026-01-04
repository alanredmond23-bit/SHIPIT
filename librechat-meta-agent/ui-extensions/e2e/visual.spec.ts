import { test, expect } from '@playwright/test';

/**
 * Visual Screenshot Tests
 *
 * Creates visual screenshots of all main pages at:
 * - Desktop viewport (1920x1080)
 * - Mobile viewport (375x667)
 *
 * Screenshots saved to: /Users/alanredmond/Desktop/META-AGENT-SCREENSHOTS/
 */

const SCREENSHOT_DIR = '/Users/alanredmond/Desktop/META-AGENT-SCREENSHOTS';

// Wait for page to be stable before screenshot
const waitForStable = async (page: any) => {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  // Wait a bit for any animations/transitions
  await page.waitForTimeout(500);
};

test.describe('Visual Screenshots - Desktop 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('homepage/dashboard screenshot', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-home.png`,
      fullPage: true
    });

    console.log('✓ Desktop homepage screenshot saved');
  });

  test('chat page screenshot', async ({ page }) => {
    await page.goto('/chat');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-chat.png`,
      fullPage: true
    });

    console.log('✓ Desktop chat screenshot saved');
  });

  test('login page screenshot', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-login.png`,
      fullPage: true
    });

    console.log('✓ Desktop login screenshot saved');
  });

  test('settings page screenshot', async ({ page }) => {
    await page.goto('/settings');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-settings.png`,
      fullPage: true
    });

    console.log('✓ Desktop settings screenshot saved');
  });

  test('research page screenshot (if exists)', async ({ page }) => {
    const response = await page.goto('/research');
    await waitForStable(page);

    // Only take screenshot if page exists (not 404)
    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-research.png`,
        fullPage: true
      });
      console.log('✓ Desktop research screenshot saved');
    } else {
      console.log('⊘ Research page does not exist, skipping');
    }
  });

  test('agents page screenshot (if exists)', async ({ page }) => {
    const response = await page.goto('/agents');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-agents.png`,
        fullPage: true
      });
      console.log('✓ Desktop agents screenshot saved');
    } else {
      console.log('⊘ Agents page does not exist, skipping');
    }
  });

  test('profile page screenshot (if exists)', async ({ page }) => {
    const response = await page.goto('/profile');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-profile.png`,
        fullPage: true
      });
      console.log('✓ Desktop profile screenshot saved');
    } else {
      console.log('⊘ Profile page does not exist, skipping');
    }
  });

  test('admin page screenshot (if exists)', async ({ page }) => {
    const response = await page.goto('/admin');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-admin.png`,
        fullPage: true
      });
      console.log('✓ Desktop admin screenshot saved');
    } else {
      console.log('⊘ Admin page does not exist, skipping');
    }
  });
});

test.describe('Visual Screenshots - Mobile 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('homepage/dashboard screenshot mobile', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-home.png`,
      fullPage: true
    });

    console.log('✓ Mobile homepage screenshot saved');
  });

  test('chat page screenshot mobile', async ({ page }) => {
    await page.goto('/chat');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-chat.png`,
      fullPage: true
    });

    console.log('✓ Mobile chat screenshot saved');
  });

  test('login page screenshot mobile', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-login.png`,
      fullPage: true
    });

    console.log('✓ Mobile login screenshot saved');
  });

  test('settings page screenshot mobile', async ({ page }) => {
    await page.goto('/settings');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/mobile-settings.png`,
      fullPage: true
    });

    console.log('✓ Mobile settings screenshot saved');
  });

  test('research page screenshot mobile (if exists)', async ({ page }) => {
    const response = await page.goto('/research');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/mobile-research.png`,
        fullPage: true
      });
      console.log('✓ Mobile research screenshot saved');
    } else {
      console.log('⊘ Research page does not exist, skipping');
    }
  });

  test('agents page screenshot mobile (if exists)', async ({ page }) => {
    const response = await page.goto('/agents');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/mobile-agents.png`,
        fullPage: true
      });
      console.log('✓ Mobile agents screenshot saved');
    } else {
      console.log('⊘ Agents page does not exist, skipping');
    }
  });

  test('profile page screenshot mobile (if exists)', async ({ page }) => {
    const response = await page.goto('/profile');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/mobile-profile.png`,
        fullPage: true
      });
      console.log('✓ Mobile profile screenshot saved');
    } else {
      console.log('⊘ Profile page does not exist, skipping');
    }
  });

  test('admin page screenshot mobile (if exists)', async ({ page }) => {
    const response = await page.goto('/admin');
    await waitForStable(page);

    if (response && response.status() !== 404) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/mobile-admin.png`,
        fullPage: true
      });
      console.log('✓ Mobile admin screenshot saved');
    } else {
      console.log('⊘ Admin page does not exist, skipping');
    }
  });
});

test.describe('Visual Screenshots - Tablet 768x1024', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage screenshot tablet', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/tablet-home.png`,
      fullPage: true
    });

    console.log('✓ Tablet homepage screenshot saved');
  });

  test('chat page screenshot tablet', async ({ page }) => {
    await page.goto('/chat');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/tablet-chat.png`,
      fullPage: true
    });

    console.log('✓ Tablet chat screenshot saved');
  });

  test('login page screenshot tablet', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/tablet-login.png`,
      fullPage: true
    });

    console.log('✓ Tablet login screenshot saved');
  });

  test('settings page screenshot tablet', async ({ page }) => {
    await page.goto('/settings');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/tablet-settings.png`,
      fullPage: true
    });

    console.log('✓ Tablet settings screenshot saved');
  });
});

test.describe('Visual Screenshots - State Variations', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('chat with message input focused', async ({ page }) => {
    await page.goto('/chat');
    await waitForStable(page);

    // Focus the chat input if it exists
    const chatInput = page.locator('input[type="text"], textarea').first();
    if (await chatInput.count() > 0) {
      await chatInput.focus();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-chat-focused.png`,
        fullPage: true
      });
      console.log('✓ Chat with focused input screenshot saved');
    }
  });

  test('settings with modal open (if applicable)', async ({ page }) => {
    await page.goto('/settings');
    await waitForStable(page);

    // Try to find and click a button that might open a modal
    const modalButton = page.locator('button:has-text("Edit"), button:has-text("Add"), button:has-text("Configure")').first();
    if (await modalButton.count() > 0) {
      await modalButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-settings-modal.png`,
        fullPage: true
      });
      console.log('✓ Settings with modal screenshot saved');
    }
  });

  test('homepage dark mode (if toggle exists)', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    // Try to find and click dark mode toggle
    const darkModeToggle = page.locator('[aria-label*="dark"], [aria-label*="theme"], button:has-text("Dark")').first();
    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-home-dark.png`,
        fullPage: true
      });
      console.log('✓ Homepage dark mode screenshot saved');
    }
  });
});

test.describe('Visual Screenshots - Error States', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('404 page screenshot', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-404');
    await waitForStable(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/desktop-404.png`,
      fullPage: true
    });

    console.log('✓ 404 error page screenshot saved');
  });

  test('login page with validation error (if applicable)', async ({ page }) => {
    await page.goto('/login');
    await waitForStable(page);

    // Try to submit empty form to trigger validation
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-login-error.png`,
        fullPage: true
      });
      console.log('✓ Login validation error screenshot saved');
    }
  });
});
