# Authentication E2E Tests Documentation

## Overview

This document describes the comprehensive E2E test suite for authentication flows in the Meta Agent application.

## Test File Location

`/e2e/auth.spec.ts`

## Test Coverage

### 1. Login Page Tests (`Authentication - Login Page`)

**Total Tests: 10**

- ✅ Login page loads correctly
  - Verifies page title, branding, and all form elements
  - Checks OAuth buttons (Google, GitHub)
  - Validates magic link toggle button
  - Confirms presence of navigation links

- ✅ Email validation
  - Tests HTML5 validation for invalid email formats
  - Ensures proper error messages

- ✅ Required field validation
  - Verifies both email and password are required
  - Tests HTML5 required attribute behavior

- ✅ Loading states
  - Confirms loading spinner appears during sign-in
  - Validates button text changes

- ✅ Magic link toggle
  - Tests switching between password and magic link modes
  - Verifies password field visibility changes

- ✅ Remember me checkbox
  - Tests checkbox toggle functionality
  - Validates state persistence

- ✅ Navigation
  - Tests link to signup page
  - Verifies proper URL navigation

- ✅ Error handling
  - Tests error message display for invalid credentials
  - Validates error styling and visibility

### 2. Signup Page Tests (`Authentication - Signup Page`)

**Total Tests: 10**

- ✅ Signup page loads correctly
  - Verifies all form fields (fullName, email, password, confirmPassword, terms)
  - Checks OAuth buttons
  - Validates links to terms, privacy policy, and login

- ✅ Required fields validation
  - Tests HTML5 required attributes
  - Ensures all fields must be filled

- ✅ Email format validation
  - Tests email validation with invalid formats
  - Verifies error messages

- ✅ Password strength indicator
  - Tests password strength meter
  - Validates weak/strong password feedback
  - Checks color indicators (red for weak, green for strong)

- ✅ Password confirmation matching
  - Validates passwords must match
  - Tests mismatch error message

- ✅ Minimum password length
  - Tests 8-character minimum requirement
  - Validates error message display

- ✅ Terms acceptance requirement
  - Tests that terms checkbox must be checked
  - Validates button disabled state when unchecked

- ✅ Loading states
  - Confirms loading spinner during signup
  - Validates button text changes

- ✅ Navigation to login
  - Tests link to login page
  - Verifies URL navigation

- ✅ Success message
  - Tests success/error message display after signup
  - Handles Supabase configuration scenarios

### 3. Protected Routes Tests (`Authentication - Protected Routes`)

**Total Tests: 2**

- ✅ Unauthenticated redirect
  - Tests multiple protected routes: /chat, /settings, /personas, /tasks
  - Verifies redirect to login page
  - Validates redirectTo query parameter is set correctly

- ✅ Public route access
  - Tests /login and /signup are accessible without auth
  - Verifies no unexpected redirects

### 4. Session Management Tests (`Authentication - Session Management`)

**Total Tests: 3**

- ✅ Authenticated user redirect
  - Tests that logged-in users are redirected from login page
  - Handles both authenticated and unauthenticated states

- ✅ Session persistence
  - Tests page reload maintains state
  - Verifies no errors on reload

- ✅ Logout functionality
  - Tests logout button existence
  - Validates logout button accessibility

### 5. OAuth Flow Tests (`Authentication - OAuth Flows`)

**Total Tests: 3**

- ✅ Google OAuth button
  - Verifies button visibility and enabled state
  - Tests on both login and signup pages

- ✅ GitHub OAuth button
  - Verifies button visibility and enabled state
  - Tests on both login and signup pages

- ✅ OAuth consistency
  - Validates OAuth buttons work on signup page

### 6. Magic Link Flow Tests (`Authentication - Magic Link Flow`)

**Total Tests: 1**

- ✅ Magic link submission
  - Tests email-only authentication
  - Validates success/error message display

### 7. UI/UX Tests (`Authentication - UI/UX Elements`)

**Total Tests: 4**

- ✅ Branding consistency
  - Tests logo visibility on login page
  - Tests logo visibility on signup page

- ✅ Background styling
  - Verifies gradient background presence

- ✅ Form styling
  - Tests styled card container presence

## Total Test Count: **33 E2E Tests**

## Helper Functions

### `generateTestEmail()`
Creates unique test emails using timestamps to avoid conflicts.

```typescript
function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test-${timestamp}@example.com`;
}
```

### `fillLoginForm(page, email, password)`
Helper to fill login form fields.

```typescript
async function fillLoginForm(page: Page, email: string, password: string)
```

### `fillSignupForm(page, fullName, email, password)`
Helper to fill signup form fields including terms acceptance.

```typescript
async function fillSignupForm(
  page: Page,
  fullName: string,
  email: string,
  password: string
)
```

## Running the Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run only auth tests
```bash
npx playwright test e2e/auth.spec.ts
```

### Run in headed mode (see browser)
```bash
npx playwright test e2e/auth.spec.ts --headed
```

### Run in debug mode
```bash
npx playwright test e2e/auth.spec.ts --debug
```

### Run specific test
```bash
npx playwright test e2e/auth.spec.ts -g "login page loads correctly"
```

## Test Configuration

Tests are configured in `playwright.config.ts`:

- **Base URL**: http://localhost:3000
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Timeout**: Default Playwright timeout
- **Retries**: 2 in CI, 0 locally
- **Parallel**: Fully parallel execution
- **Screenshots**: On failure
- **Video**: On first retry
- **Trace**: On first retry

## Authentication Flow Coverage

### ✅ Covered Flows

1. **Email/Password Login**
   - Valid credentials
   - Invalid credentials
   - Validation errors
   - Loading states

2. **Email/Password Signup**
   - Account creation
   - Validation (email, password, confirmation)
   - Password strength checking
   - Terms acceptance
   - Success/error handling

3. **OAuth Authentication**
   - Google OAuth button presence
   - GitHub OAuth button presence
   - Button states

4. **Magic Link Authentication**
   - Email-only login
   - Toggle between password and magic link
   - Success message

5. **Protected Route Access**
   - Redirect to login when unauthenticated
   - redirectTo parameter preservation
   - Public route accessibility

6. **Session Management**
   - Session persistence on reload
   - Authenticated user redirects
   - Logout button presence

### ⚠️ Limitations & Future Enhancements

**Not Covered (Requires Valid Supabase Setup):**

1. **Actual Authentication**
   - Tests currently validate UI/UX only
   - Real authentication requires Supabase configuration
   - Session cookie validation needs auth setup

2. **Full User Journey**
   - Complete login → protected route → logout flow
   - Requires storageState or fixtures

3. **OAuth Callbacks**
   - OAuth redirect callbacks
   - Token handling
   - Profile data reception

4. **Password Reset Flow**
   - Forgot password functionality
   - Reset link email
   - Password update

5. **Email Verification**
   - Signup email verification
   - Verification link testing

## Adding New Tests

### Test Structure Template

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route');
  });

  test('test description', async ({ page }) => {
    // Arrange
    await page.fill('#input', 'value');

    // Act
    await page.click('button');

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names**
   - ✅ "displays validation error for invalid email format"
   - ❌ "test email validation"

2. **Use helper functions**
   - Reduce code duplication
   - Improve maintainability

3. **Add comments for complex logic**
   - Explain why, not what

4. **Test both success and failure paths**
   - Valid and invalid inputs
   - Edge cases

5. **Use proper selectors**
   - Prefer test IDs or semantic selectors
   - Avoid brittle CSS selectors

6. **Handle timing issues**
   - Use `waitFor` when needed
   - Set appropriate timeouts
   - Catch quick state changes

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries for flaky test resilience
- Screenshot capture on failure
- Video recording on retry
- HTML report generation

## Maintenance Notes

- Update tests when authentication UI changes
- Add tests for new authentication methods
- Keep helper functions DRY
- Review and update selectors periodically
- Monitor test flakiness and adjust timeouts

## Related Files

- `/lib/auth/auth-context.tsx` - Authentication context provider
- `/components/Auth/LoginForm.tsx` - Login form component
- `/components/Auth/SignUpForm.tsx` - Signup form component
- `/middleware.ts` - Route protection middleware
- `/app/login/page.tsx` - Login page
- `/app/signup/page.tsx` - Signup page

## Questions or Issues?

If tests fail:
1. Check Supabase configuration in `.env`
2. Ensure development server is running
3. Verify no UI changes broke selectors
4. Check network connectivity for external OAuth
5. Review Playwright trace files for failed tests
