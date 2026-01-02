-- ============================================================================
-- Meta Agent Database Initialization Script
-- ============================================================================
-- This script initializes the complete Meta Agent database by running all
-- schema files in the correct order.
--
-- Schema files are executed sequentially to ensure proper dependency order:
-- 1. Core schema (projects, tasks, artifacts)
-- 2. Memory system
-- 3. File management
-- 4. Feature-specific schemas (thinking, research, images, voice, etc.)
-- 5. RLS policies and security
-- 6. Workflow and state management
-- 7. Storage configuration
-- ============================================================================

\echo '============================================================================'
\echo 'Meta Agent Database Initialization'
\echo '============================================================================'
\echo ''

-- Set client encoding to UTF8
SET client_encoding = 'UTF8';

-- Create database if it doesn't exist (this is handled by docker-compose)
-- Ensure extensions are available
\echo 'Installing required PostgreSQL extensions...'

-- Install pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Install UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo '✓ Extensions installed successfully'
\echo ''

-- ============================================================================
-- Schema File 001: Initial Core Schema
-- ============================================================================
\echo '→ Loading 001_initial_schema.sql - Core tables and types...'
\ir ../schemas/001_initial_schema.sql
\echo '✓ Core schema loaded'
\echo ''

-- ============================================================================
-- Schema File 002: Memory System
-- ============================================================================
\echo '→ Loading 002_memory_schema.sql - Memory and knowledge management...'
\ir ../schemas/002_memory_schema.sql
\echo '✓ Memory schema loaded'
\echo ''

-- ============================================================================
-- Schema File 003: File Management
-- ============================================================================
\echo '→ Loading 003_files_schema.sql - File storage and processing...'
\ir ../schemas/003_files_schema.sql
\echo '✓ Files schema loaded'
\echo ''

-- ============================================================================
-- Schema File 004: Thinking System
-- ============================================================================
\echo '→ Loading 004_thinking_schema.sql - Extended thinking and reasoning...'
\ir ../schemas/004_thinking_schema.sql
\echo '✓ Thinking schema loaded'
\echo ''

-- ============================================================================
-- Schema File 005: Research System
-- ============================================================================
\echo '→ Loading 005_research_schema.sql - Research and web search...'
\ir ../schemas/005_research_schema.sql
\echo '✓ Research schema loaded'
\echo ''

-- ============================================================================
-- Schema File 006: Image Generation
-- ============================================================================
\echo '→ Loading 006_images_schema.sql - Image generation and processing...'
\ir ../schemas/006_images_schema.sql
\echo '✓ Images schema loaded'
\echo ''

-- ============================================================================
-- Schema File 007: Voice System
-- ============================================================================
\echo '→ Loading 007_voice_schema.sql - Voice synthesis and processing...'
\ir ../schemas/007_voice_schema.sql
\echo '✓ Voice schema loaded'
\echo ''

-- ============================================================================
-- Schema File 008: Computer Use
-- ============================================================================
\echo '→ Loading 008_computer_schema.sql - Computer use and automation...'
\ir ../schemas/008_computer_schema.sql
\echo '✓ Computer schema loaded'
\echo ''

-- ============================================================================
-- Schema File 009: Personas System
-- ============================================================================
\echo '→ Loading 009_personas_schema.sql - User personas and preferences...'
\ir ../schemas/009_personas_schema.sql
\echo '✓ Personas schema loaded'
\echo ''

-- ============================================================================
-- Schema File 010: Video Processing
-- ============================================================================
\echo '→ Loading 010_video_schema.sql - Video generation and processing...'
\ir ../schemas/010_video_schema.sql
\echo '✓ Video schema loaded'
\echo ''

-- ============================================================================
-- Schema File 011: Google Workspace
-- ============================================================================
\echo '→ Loading 011_google_workspace_schema.sql - Google Workspace integration...'
\ir ../schemas/011_google_workspace_schema.sql
\echo '✓ Google Workspace schema loaded'
\echo ''

-- ============================================================================
-- Schema File 012: Scheduled Tasks
-- ============================================================================
\echo '→ Loading 012_scheduled_tasks_schema.sql - Task scheduling and automation...'
\ir ../schemas/012_scheduled_tasks_schema.sql
\echo '✓ Scheduled Tasks schema loaded'
\echo ''

-- ============================================================================
-- Schema File 013: Row Level Security (RLS) Policies
-- ============================================================================
\echo '→ Loading 013_rls_policies.sql - Security policies and access control...'
\ir ../schemas/013_rls_policies.sql
\echo '✓ RLS policies loaded'
\echo ''

-- ============================================================================
-- Schema File 014: Task History
-- ============================================================================
\echo '→ Loading 014_task_history.sql - Task history and audit trails...'
\ir ../schemas/014_task_history.sql
\echo '✓ Task History schema loaded'
\echo ''

-- ============================================================================
-- Schema File 015: Workflow State Machine
-- ============================================================================
\echo '→ Loading 015_workflow_state_machine.sql - Workflow orchestration...'
\ir ../schemas/015_workflow_state_machine.sql
\echo '✓ Workflow State Machine loaded'
\echo ''

-- ============================================================================
-- Schema File 016: Conversations
-- ============================================================================
\echo '→ Loading 016_conversations.sql - Conversation management...'
\ir ../schemas/016_conversations.sql
\echo '✓ Conversations schema loaded'
\echo ''

-- ============================================================================
-- Schema File 017: Storage Buckets
-- ============================================================================
\echo '→ Loading 017_storage_buckets.sql - Storage bucket configuration...'
\ir ../schemas/017_storage_buckets.sql
\echo '✓ Storage Buckets schema loaded'
\echo ''

-- ============================================================================
-- Post-Installation Setup
-- ============================================================================
\echo ''
\echo '→ Running post-installation setup...'

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO PUBLIC;

\echo '✓ Permissions configured'
\echo ''

-- ============================================================================
-- Verification
-- ============================================================================
\echo '→ Verifying database setup...'

-- Count tables
\echo 'Tables created:'
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- List all tables
\echo ''
\echo 'Table list:'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

\echo ''
\echo '============================================================================'
\echo '✓ Meta Agent Database Initialization Complete!'
\echo '============================================================================'
\echo ''
\echo 'All 17 schema files have been successfully loaded.'
\echo 'The database is ready for use.'
\echo ''
\echo 'Next steps:'
\echo '  1. Start the orchestrator service'
\echo '  2. Start the UI service'
\echo '  3. Access the application at http://localhost:3000'
\echo ''
\echo '============================================================================'
