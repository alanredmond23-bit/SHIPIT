# Supabase Auth Quick Start

Get authentication up and running in 5 minutes!

## Step 1: Install Dependencies (1 min)

```bash
cd ui-extensions
npm install @supabase/ssr @supabase/supabase-js
```

## Step 2: Create Supabase Project (2 min)

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for database provisioning
5. Go to Settings > API

## Step 3: Configure Environment (1 min)

Create `ui-extensions/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy values from Supabase Dashboard > Settings > API

## Step 4: Start Development Server (1 min)

```bash
npm run dev
```

## That's It!

Visit http://localhost:3000/login to see the login page!

## What You Get Out of the Box

- **Login Page**: `/login` - Email/password, OAuth (Google, GitHub), Magic Link
- **Sign Up Page**: `/signup` - Registration with password validation
- **Protected Routes**: All routes except `/login`, `/signup`, `/auth/callback` require authentication
- **User Menu**: Import and use `<UserMenu />` component anywhere
- **Auth Hook**: Use `useAuth()` to access user state and auth methods

## Quick Examples

### Add User Menu to Navigation

```tsx
import { UserMenu } from '@/components/Auth';

export function Navigation() {
  return (
    <nav>
      {/* Your nav items */}
      <UserMenu />
    </nav>
  );
}
```

### Protect a Page

```tsx
import { AuthGuard } from '@/components/Auth';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourContent />
    </AuthGuard>
  );
}
```

### Use Auth Data

```tsx
'use client';
import { useAuth } from '@/lib/auth';

export function Profile() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <p>Email: {user?.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Optional: Configure OAuth Providers

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) > Create Project
2. APIs & Services > Credentials > Create OAuth Client ID
3. Add redirect: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Supabase > Authentication > Providers > Google > Paste Client ID & Secret

### GitHub OAuth

1. GitHub Settings > Developer > OAuth Apps > New
2. Callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Supabase > Authentication > Providers > GitHub > Paste Client ID & Secret

## Troubleshooting

**"Missing environment variables" error?**
- Make sure `.env.local` exists in `ui-extensions/` directory
- Restart dev server after creating `.env.local`

**OAuth not working?**
- Verify callback URLs match exactly
- Check OAuth provider is enabled in Supabase Dashboard

**Session not persisting?**
- Check browser cookies are enabled
- Clear browser cache and cookies

## Next Steps

- Read [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for complete documentation
- Configure email templates in Supabase Dashboard
- Set up Row Level Security (RLS) for database tables
- Generate TypeScript types: `supabase gen types typescript`

## File Structure

```
ui-extensions/
├── lib/auth/
│   ├── supabase-client.ts      # Browser client
│   ├── supabase-server.ts      # Server client
│   ├── auth-context.tsx        # React context + useAuth hook
│   └── index.ts                # Exports
├── components/Auth/
│   ├── LoginForm.tsx           # Login form component
│   ├── SignUpForm.tsx          # Sign up form component
│   ├── AuthGuard.tsx           # Route protection component
│   ├── UserMenu.tsx            # User menu dropdown
│   └── index.tsx               # Exports
├── app/
│   ├── login/page.tsx          # Login page
│   ├── signup/page.tsx         # Sign up page
│   ├── auth/callback/route.ts  # OAuth callback
│   └── providers.tsx           # ✅ Already updated with AuthProvider
├── middleware.ts               # Route protection
├── types/supabase.ts           # Database types
└── .env.local                  # Environment variables (create this!)
```

---

**Need help?** Check [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) for detailed documentation.
