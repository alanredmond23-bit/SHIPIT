# Supabase Auth Integration Setup Guide

Complete authentication system for Meta Agent using Supabase Auth.

## Features

- **Email/Password Authentication** - Traditional login with email and password
- **OAuth Providers** - Google and GitHub OAuth integration
- **Magic Link** - Passwordless authentication via email
- **Protected Routes** - Middleware-based route protection
- **Auth Guards** - React components for client-side protection
- **Session Management** - Automatic token refresh and session handling
- **Password Validation** - Real-time password strength indicator
- **Error Handling** - Comprehensive error messages and loading states

## Files Created

### Core Auth Library (`/lib/auth/`)

1. **supabase-client.ts** - Browser-side Supabase client
2. **supabase-server.ts** - Server-side Supabase client for API routes and Server Components
3. **auth-context.tsx** - React Context Provider with useAuth hook
4. **index.ts** - Central export file for all auth utilities

### Components (`/components/Auth/`)

1. **LoginForm.tsx** - Beautiful login form with OAuth, email/password, and magic link
2. **SignUpForm.tsx** - Sign up form with password validation and strength indicator
3. **AuthGuard.tsx** - HOC/wrapper for protecting routes client-side
4. **index.tsx** - Central export file for all auth components

### Routes

1. **middleware.ts** - Next.js middleware for server-side route protection
2. **app/auth/callback/route.ts** - OAuth callback handler
3. **app/login/page.tsx** - Login page
4. **app/signup/page.tsx** - Sign up page

### Types

1. **types/supabase.ts** - TypeScript types for Supabase database schema

## Setup Instructions

### 1. Install Dependencies

```bash
cd ui-extensions
npm install @supabase/ssr @supabase/supabase-js
```

### 2. Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to Project Settings > API to find your credentials

### 3. Configure Environment Variables

Create a `.env.local` file in the `ui-extensions` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Configure OAuth Providers (Optional)

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
6. In Supabase Dashboard > Authentication > Providers > Google:
   - Enable Google provider
   - Add Client ID and Client Secret

#### GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Authentication > Providers > GitHub:
   - Enable GitHub provider
   - Add Client ID and Client Secret

### 5. Configure Email Templates (Optional)

Go to Supabase Dashboard > Authentication > Email Templates to customize:

- Confirmation email
- Magic link email
- Password reset email
- Email change confirmation

### 6. Update Database Types (Optional)

Generate TypeScript types from your Supabase schema:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Generate types
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## Usage

### Protecting Routes with Middleware

Routes are automatically protected by the middleware. Configure which routes require auth in `middleware.ts`:

```typescript
// Public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/auth/callback'];
```

### Using AuthGuard Component

Protect individual pages or components:

```tsx
import { AuthGuard } from '@/components/Auth';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourProtectedContent />
    </AuthGuard>
  );
}
```

For pages that should redirect authenticated users (like login):

```tsx
import { AuthGuard } from '@/components/Auth';

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false} redirectTo="/">
      <LoginForm />
    </AuthGuard>
  );
}
```

### Using the useAuth Hook

Access authentication state and methods anywhere in your app:

```tsx
'use client';

import { useAuth } from '@/lib/auth';

export function UserProfile() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Email: {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Available Auth Methods

The `useAuth` hook provides:

```typescript
const {
  user,                    // Current user object or null
  session,                 // Current session or null
  loading,                 // Loading state
  signIn,                  // Sign in with email/password
  signUp,                  // Sign up with email/password
  signInWithOAuth,         // Sign in with Google or GitHub
  signInWithMagicLink,     // Send magic link email
  signOut,                 // Sign out
  resetPassword,           // Send password reset email
  updatePassword,          // Update user password
} = useAuth();
```

### Server-Side Auth

Access user data in Server Components:

```tsx
import { getUser, getSession } from '@/lib/auth/supabase-server';

export default async function ServerPage() {
  const user = await getUser();
  const session = await getSession();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome {user.email}</div>;
}
```

### API Routes

Use auth in API routes:

```typescript
import { createRouteHandlerClient } from '@/lib/auth/supabase-server';

export async function GET(request: Request) {
  const supabase = await createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Your API logic here
  return Response.json({ message: 'Success' });
}
```

## Customization

### Styling

All components use Tailwind CSS and match the existing Meta Agent design:

- Dark theme (bg-slate-950)
- Purple/pink gradients
- Consistent rounded corners and borders
- Smooth transitions and hover effects

### Password Validation

The sign-up form includes real-time password validation:

- Minimum 8 characters
- Mixed case letters
- Numbers
- Special characters
- Visual strength indicator (Weak/Fair/Good/Strong)

### Error Handling

All auth operations include comprehensive error handling:

- Network errors
- Invalid credentials
- Email already in use
- Weak passwords
- OAuth failures

## Security Best Practices

1. **HTTPS Only** - Always use HTTPS in production
2. **Environment Variables** - Never commit `.env.local` to git
3. **Row Level Security** - Enable RLS on all Supabase tables
4. **Email Verification** - Require email verification for new accounts
5. **Rate Limiting** - Configure Supabase rate limits for auth endpoints
6. **CORS** - Configure allowed origins in Supabase settings

## Troubleshooting

### "Missing Supabase environment variables" Error

Make sure you've created `.env.local` with the correct variables and restarted your dev server.

### OAuth Redirect Issues

Verify callback URLs in OAuth provider settings match:
`https://your-project-ref.supabase.co/auth/v1/callback`

### Session Not Persisting

Check that cookies are enabled in your browser and not blocked by extensions.

### "Invalid JWT" Errors

Your JWT secret might have changed. Sign out and sign in again, or clear application cookies.

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Auth UI](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:

1. Check Supabase Dashboard > Logs for error details
2. Review browser console for client-side errors
3. Check middleware logs for route protection issues
4. Verify environment variables are set correctly

---

**Note**: Remember to update `types/supabase.ts` with your actual database schema types for full type safety.
