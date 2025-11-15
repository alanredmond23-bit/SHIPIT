# Declarative Schemas

This directory contains declarative schema definitions for easier management of database objects.

Declarative schemas allow you to edit database objects (like views, functions, and triggers) in-place
without creating new migration files for every change.

## Files

- `profiles.sql` - User profile extensions
- `storage_extensions.sql` - Enhanced storage metadata functions

## Usage

These schemas are automatically applied in the order specified in `supabase/config.toml`.

For more information, see: https://supabase.com/docs/guides/local-development/declarative-database-schemas
