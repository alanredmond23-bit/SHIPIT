/**
 * Auth Library
 * Export all authentication utilities from a single entry point
 */

export { createClient, getClient } from './supabase-client';
export { createClient as createServerClient, createRouteHandlerClient, getSession, getUser } from './supabase-server';
export { AuthProvider, useAuth } from './auth-context';
