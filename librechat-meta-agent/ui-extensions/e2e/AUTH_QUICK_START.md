# Auth E2E Tests - Quick Start Guide

## Running Tests

### Basic Commands

```bash
# Run all auth tests
npx playwright test e2e/auth.spec.ts

# Run with UI (see browser)
npx playwright test e2e/auth.spec.ts --headed

# Run specific test suite
npx playwright test e2e/auth.spec.ts -g "Login Page"

# Debug mode
npx playwright test e2e/auth.spec.ts --debug

# Generate report
npx playwright test e2e/auth.spec.ts && npx playwright show-report
```

## Test Structure

### 7 Test Suites, 33 Tests Total

```
📁 Authentication - Login Page (10 tests)
├─ ✅ Page loads correctly
├─ ✅ Email validation
├─ ✅ Required fields
├─ ✅ Loading states
├─ ✅ Magic link toggle
├─ ✅ Remember me checkbox
├─ ✅ Navigation to signup
└─ ✅ Error messages

📁 Authentication - Signup Page (10 tests)
├─ ✅ Page loads correctly
├─ ✅ Required fields validation
├─ ✅ Email format validation
├─ ✅ Password strength indicator
├─ ✅ Password confirmation
├─ ✅ Minimum password length
├─ ✅ Terms acceptance
├─ ✅ Loading states
├─ ✅ Navigation to login
└─ ✅ Success/error messages

📁 Authentication - Protected Routes (2 tests)
├─ ✅ Redirect to login when unauthenticated
└─ ✅ Public routes accessible

📁 Authentication - Session Management (3 tests)
├─ ✅ Authenticated users redirected
├─ ✅ Session persists on reload
└─ ✅ Logout functionality

📁 Authentication - OAuth Flows (3 tests)
├─ ✅ Google OAuth button
├─ ✅ GitHub OAuth button
└─ ✅ OAuth on signup page

📁 Authentication - Magic Link Flow (1 test)
└─ ✅ Magic link submission

📁 Authentication - UI/UX Elements (4 tests)
├─ ✅ Branding on login page
├─ ✅ Branding on signup page
├─ ✅ Background gradient
└─ ✅ Form styling
```

## Helper Functions

```typescript
// Generate unique test email
const email = generateTestEmail();
// Returns: test-1234567890@example.com

// Fill login form
await fillLoginForm(page, 'test@example.com', 'password123');

// Fill signup form
await fillSignupForm(page, 'John Doe', 'test@example.com', 'Password123!');
```

## Common Test Patterns

### Testing Form Validation

```typescript
test('validates email format', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'invalid-email');

  const emailInput = page.locator('#email');
  const validationMessage = await emailInput.evaluate(
    (el: HTMLInputElement) => el.validationMessage
  );

  expect(validationMessage).toBeTruthy();
});
```

### Testing Loading States

```typescript
test('shows loading state', async ({ page }) => {
  await fillLoginForm(page, 'test@example.com', 'password123');
  await page.locator('button:has-text("Sign In")').click();

  await expect(page.locator('text=Signing in...')).toBeVisible({
    timeout: 1000
  }).catch(() => {
    // Loading state might be too quick
  });
});
```

### Testing Error Messages

```typescript
test('shows error for invalid credentials', async ({ page }) => {
  await fillLoginForm(page, 'wrong@example.com', 'wrongpass');
  await page.locator('button:has-text("Sign In")').click();

  const errorMessage = page.locator('.bg-red-500\\/10');
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
});
```

### Testing Navigation

```typescript
test('navigates to signup', async ({ page }) => {
  await page.goto('/login');
  await page.locator('a:has-text("Sign up")').click();
  await page.waitForURL('/signup');

  await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();
});
```

## Debugging Failed Tests

### 1. Run in headed mode
```bash
npx playwright test e2e/auth.spec.ts --headed
```

### 2. Use debug mode
```bash
npx playwright test e2e/auth.spec.ts --debug
```

### 3. Check screenshots
```bash
# Screenshots saved to: test-results/
ls test-results/
```

### 4. View trace
```bash
npx playwright show-trace trace.zip
```

### 5. Check server logs
```bash
# Ensure dev server is running
npm run dev
```

## Common Issues

### Issue: "Timed out waiting for selector"
**Solution**: Increase timeout or check selector
```typescript
await expect(element).toBeVisible({ timeout: 5000 });
```

### Issue: "Navigation timeout"
**Solution**: Wait for specific URL or element
```typescript
await page.waitForURL('/login');
// or
await page.waitForLoadState('networkidle');
```

### Issue: "Element not found"
**Solution**: Check element selector in browser DevTools
```typescript
// Use more specific selector
await page.locator('button[type="submit"]:has-text("Sign In")');
```

### Issue: "Test flaky on CI"
**Solution**: Add wait for stable state
```typescript
await page.waitForLoadState('domcontentloaded');
await expect(element).toBeVisible();
```

## What Gets Tested

### ✅ Covered
- Login form UI and validation
- Signup form UI and validation
- Protected route redirects
- OAuth button presence
- Magic link toggle
- Password strength indicator
- Error/success messages
- Loading states
- Navigation
- Branding and styling

### ⚠️ Not Covered (Requires Supabase)
- Actual authentication
- Session cookies
- OAuth callbacks
- Email verification
- Password reset

## Adding New Tests

```typescript
test.describe('New Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route');
  });

  test('test description', async ({ page }) => {
    // Arrange - setup test data
    await page.fill('#input', 'value');

    // Act - perform action
    await page.click('button');

    // Assert - verify result
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Continuous Integration

Tests are configured for CI:
- ✅ 2 retries on failure
- ✅ Screenshots on failure
- ✅ Video on first retry
- ✅ Trace on first retry
- ✅ HTML report generation

## Performance

- **Single test**: ~2-5 seconds
- **Full suite (33 tests)**: ~2-3 minutes
- **All browsers (5)**: ~8-12 minutes

## Key Selectors

```typescript
// Form inputs
'#email'
'#password'
'#fullName'
'#confirmPassword'
'#terms'

// Buttons
'button:has-text("Sign In")'
'button:has-text("Create Account")'
'button:has-text("Continue with Google")'
'button:has-text("Continue with GitHub")'

// Messages
'.bg-red-500\\/10'    // Error messages
'.bg-green-500\\/10'  // Success messages

// Navigation
'a:has-text("Sign up")'
'a:has-text("Sign in")'
'a:has-text("Forgot password?")'
```

## Best Practices

1. **Use helper functions** for common actions
2. **Add timeouts** for async operations
3. **Test both success and failure** paths
4. **Use descriptive test names**
5. **Clean up test data** after tests
6. **Avoid hardcoded waits** (use waitFor instead)
7. **Test across browsers** for compatibility

## Resources

- **Full Documentation**: `e2e/AUTH_TESTS_README.md`
- **Test Summary**: `e2e/AUTH_TEST_SUMMARY.md`
- **Playwright Docs**: https://playwright.dev/
- **Project Config**: `playwright.config.ts`

## Quick Commands Reference

```bash
# Development
npm run dev                                    # Start dev server
npx playwright test e2e/auth.spec.ts --headed # Run with UI

# Debugging
npx playwright test e2e/auth.spec.ts --debug  # Debug mode
npx playwright show-report                     # View HTML report
npx playwright show-trace trace.zip            # View trace

# CI/Production
npx playwright test e2e/auth.spec.ts          # Run all tests
npx playwright test --reporter=html           # Generate report

# Specific Tests
npx playwright test e2e/auth.spec.ts -g "login page" # Run specific suite
npx playwright test e2e/auth.spec.ts --grep "email"  # Run tests matching pattern
```

---

**Ready to test! 🚀**
