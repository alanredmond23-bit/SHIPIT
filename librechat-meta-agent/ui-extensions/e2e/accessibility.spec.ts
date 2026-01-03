import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Test Suite
 *
 * Tests all main pages for WCAG 2.1 Level AA compliance using axe-core.
 *
 * Coverage:
 * - Homepage accessibility
 * - Login page accessibility
 * - Chat page accessibility
 * - Settings page accessibility
 * - Heading structure validation
 * - Image alt text validation
 * - Form label validation
 * - Color contrast validation
 * - Focus indicator visibility
 */

test.describe('Accessibility - Core Pages', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page has no accessibility violations', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('chat page has no accessibility violations', async ({ page }) => {
    // Navigate to chat (may require authentication)
    await page.goto('/chat');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings page has no accessibility violations', async ({ page }) => {
    await page.goto('/settings');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - Heading Structure', () => {
  test('all pages have proper heading hierarchy', async ({ page }) => {
    const pages = ['/', '/login', '/chat', '/settings'];

    for (const url of pages) {
      await page.goto(url);

      // Check for heading hierarchy violations
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('h1, h2, h3, h4, h5, h6')
        .withRules(['heading-order'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('homepage has exactly one h1 heading', async ({ page }) => {
    await page.goto('/');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('login page has exactly one h1 heading', async ({ page }) => {
    await page.goto('/login');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('chat page has proper heading structure', async ({ page }) => {
    await page.goto('/chat');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Verify heading hierarchy
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings page has proper heading structure', async ({ page }) => {
    await page.goto('/settings');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - Images and Alt Text', () => {
  test('all images have alt text on homepage', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('all images have alt text on login page', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('all images have alt text on chat page', async ({ page }) => {
    await page.goto('/chat');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('all images have meaningful alt text', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');

      // Alt text should exist and not be empty or just whitespace
      expect(alt).toBeTruthy();
      expect(alt?.trim()).not.toBe('');

      // Alt text should not be generic placeholders
      expect(alt?.toLowerCase()).not.toMatch(/^(image|picture|photo|img)$/);
    }
  });
});

test.describe('Accessibility - Forms and Labels', () => {
  test('all form inputs have proper labels on login page', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'form-field-multiple-labels'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('all form inputs have proper labels on settings page', async ({ page }) => {
    await page.goto('/settings');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'form-field-multiple-labels'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('form inputs have accessible names', async ({ page }) => {
    await page.goto('/login');

    const inputs = await page.locator('input, textarea, select').all();

    for (const input of inputs) {
      // Each input should have either a label, aria-label, or aria-labelledby
      const hasLabel = await input.evaluate((el) => {
        const id = el.getAttribute('id');
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) return true;
        }

        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return true;

        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        if (ariaLabelledBy) return true;

        return false;
      });

      expect(hasLabel).toBe(true);
    }
  });

  test('required form fields are properly marked', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-required-attr', 'aria-required-children'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('homepage has adequate color contrast', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page has adequate color contrast', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('chat page has adequate color contrast', async ({ page }) => {
    await page.goto('/chat');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings page has adequate color contrast', async ({ page }) => {
    await page.goto('/settings');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('text meets WCAG AA contrast ratios', async ({ page }) => {
    await page.goto('/');

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - Focus Indicators', () => {
  test('all interactive elements have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['focus-order-semantics'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('buttons have visible focus states on login page', async ({ page }) => {
    await page.goto('/login');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      await button.focus();

      // Check if the button has a visible outline or other focus indicator
      const hasFocusIndicator = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const outlineWidth = styles.outlineWidth;
        const boxShadow = styles.boxShadow;

        // Check for outline or box-shadow (common focus indicators)
        return (
          (outline && outline !== 'none' && outlineWidth !== '0px') ||
          (boxShadow && boxShadow !== 'none')
        );
      });

      expect(hasFocusIndicator).toBe(true);
    }
  });

  test('links have visible focus states on homepage', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a').all();

    for (const link of links) {
      await link.focus();

      const hasFocusIndicator = await link.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const outlineWidth = styles.outlineWidth;
        const boxShadow = styles.boxShadow;

        return (
          (outline && outline !== 'none' && outlineWidth !== '0px') ||
          (boxShadow && boxShadow !== 'none')
        );
      });

      expect(hasFocusIndicator).toBe(true);
    }
  });

  test('focus order is logical on chat page', async ({ page }) => {
    await page.goto('/chat');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['tabindex', 'focus-order-semantics'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('no elements have positive tabindex values', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['tabindex'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['keyboard', 'focus-order-semantics'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login form can be completed using keyboard only', async ({ page }) => {
    await page.goto('/login');

    // Tab through all form elements
    await page.keyboard.press('Tab');
    await page.keyboard.type('test@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('password123');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify no accessibility violations during keyboard navigation
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['keyboard'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('chat interface is keyboard navigable', async ({ page }) => {
    await page.goto('/chat');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['keyboard', 'focus-order-semantics'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - ARIA and Semantic HTML', () => {
  test('all pages use semantic HTML elements', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['region', 'landmark-one-main', 'landmark-no-duplicate-banner'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA attributes are used correctly', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules([
        'aria-valid-attr',
        'aria-valid-attr-value',
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-required-children',
        'aria-required-parent'
      ])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page has valid language attribute', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['html-has-lang', 'html-lang-valid'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('page has descriptive title', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['document-title'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.trim()).not.toBe('');
  });
});

test.describe('Accessibility - Screen Reader Support', () => {
  test('all pages have skip links for screen readers', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['bypass', 'skip-link'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('dynamic content changes are announced to screen readers', async ({ page }) => {
    await page.goto('/chat');

    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThan(0);
  });

  test('error messages are accessible to screen readers', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-valid-attr-value', 'aria-required-attr'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - Responsive and Mobile', () => {
  test('mobile viewport has no accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('tablet viewport has no accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('touch targets are appropriately sized on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['target-size'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
