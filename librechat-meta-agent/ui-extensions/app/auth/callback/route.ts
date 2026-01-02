import { createRouteHandlerClient } from '@/lib/auth/supabase-server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * OAuth callback handler
 * This route handles the callback from OAuth providers (Google, GitHub, etc.)
 * and magic link authentication
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth/Magic Link errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(
        errorDescription || 'Authentication failed'
      )}`
    );
  }

  // Exchange the code for a session
  if (code) {
    try {
      const supabase = await createRouteHandlerClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent(
            'Failed to complete authentication'
          )}`
        );
      }

      // Successful authentication - redirect to the requested page or home
      const redirectUrl = new URL(next, requestUrl.origin);

      // Security: Only allow redirects to same origin
      if (redirectUrl.origin === requestUrl.origin) {
        return NextResponse.redirect(redirectUrl);
      } else {
        return NextResponse.redirect(`${requestUrl.origin}/`);
      }
    } catch (err) {
      console.error('Unexpected callback error:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(
          'An unexpected error occurred'
        )}`
      );
    }
  }

  // No code present - invalid callback
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=${encodeURIComponent('Invalid authentication callback')}`
  );
}
