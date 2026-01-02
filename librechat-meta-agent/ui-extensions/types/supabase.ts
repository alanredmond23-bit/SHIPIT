/**
 * Supabase Database Types
 *
 * This file contains TypeScript types for your Supabase database schema.
 * You can generate these types automatically using the Supabase CLI:
 *
 * supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
 *
 * For now, we use a basic Database type. Replace this with your actual schema types.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Add your table definitions here
      // Example:
      // users: {
      //   Row: {
      //     id: string;
      //     email: string;
      //     created_at: string;
      //   };
      //   Insert: {
      //     id?: string;
      //     email: string;
      //     created_at?: string;
      //   };
      //   Update: {
      //     id?: string;
      //     email?: string;
      //     created_at?: string;
      //   };
      // };
    };
    Views: {
      // Add your view definitions here
    };
    Functions: {
      // Add your function definitions here
    };
    Enums: {
      // Add your enum definitions here
    };
    CompositeTypes: {
      // Add your composite type definitions here
    };
  };
}
