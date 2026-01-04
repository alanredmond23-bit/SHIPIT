# Database Schema Documentation

## Meta Agent A++ Platform - Complete Schema Reference

**Last Updated:** January 3, 2026
**Total Schema Files:** 21
**Total Tables Defined:** 120+
**Database:** Supabase (PostgreSQL with pgvector)

---

## Table of Contents

1. [ER Diagram (ASCII)](#er-diagram)
2. [Migration Order](#migration-order)
3. [Deployment Status](#deployment-status)
4. [Schema Details by File](#schema-details)
5. [Missing Schemas for A++ Features](#missing-schemas)
6. [Key Features](#key-features)

---

## ER Diagram

```
                                    META AGENT DATABASE SCHEMA
                                    ==========================

+------------------+         +--------------------+         +------------------+
|  meta_projects   |<------->|  meta_workstreams  |<------->|    meta_tasks    |
+------------------+         +--------------------+         +------------------+
| id (PK)          |         | id (PK)            |         | id (PK)          |
| name             |         | project_id (FK)    |         | workstream_id(FK)|
| description      |         | name               |         | parent_task_id   |
| status           |         | lead_agent         |         | title            |
| owner_id         |         | priority           |         | status           |
| metadata         |         +--------------------+         | assigned_agent   |
+------------------+                 |                      | model_tier       |
        |                            |                      | thread_id        |
        |                            v                      +------------------+
        |                    +------------------+                   |
        |                    | meta_decisions   |                   |
        |                    +------------------+                   v
        |                    | id (PK)          |           +------------------+
        +<------------------>| project_id (FK)  |           | meta_task_runs   |
        |                    | task_id (FK)     |           +------------------+
        |                    | decision_text    |           | id (PK)          |
        |                    +------------------+           | task_id (FK)     |
        |                                                   | agent_id         |
        v                                                   | tokens_used      |
+------------------+         +--------------------+         | cost             |
| meta_budgets     |         | meta_artifacts     |         +------------------+
+------------------+         +--------------------+
| id (PK)          |         | id (PK)            |
| project_id (FK)  |         | task_id (FK)       |
| model_tier       |         | storage_path       |
| allocated_tokens |         | status             |
| used_tokens      |         +--------------------+
+------------------+

+------------------+         +--------------------+         +------------------+
| meta_memory_facts|         | thinking_sessions  |         | research_sessions|
+------------------+         +--------------------+         +------------------+
| id (PK)          |         | id (PK)            |         | id (PK)          |
| project_id (FK)  |         | user_id            |         | user_id          |
| user_id          |         | query              |         | query            |
| content          |         | root_node_id       |         | status           |
| embedding (vec)  |         | stats              |         | max_sources      |
| importance_score |         | final_conclusion   |         +------------------+
+------------------+         +--------------------+                 |
                                     |                              |
                                     v                              v
                             +------------------+         +------------------+
                             | thought_nodes    |         | research_sources |
                             +------------------+         +------------------+
                             | id (PK)          |         | id (PK)          |
                             | session_id (FK)  |         | session_id (FK)  |
                             | parent_id        |         | url              |
                             | content          |         | credibility_score|
                             | type             |         +------------------+
                             | confidence       |
                             +------------------+

+------------------+         +--------------------+         +------------------+
| generated_images |         | generated_videos   |         | voice_sessions   |
+------------------+         +--------------------+         +------------------+
| id (PK)          |         | id (PK)            |         | id (PK)          |
| user_id          |         | user_id            |         | user_id          |
| prompt           |         | prompt             |         | status           |
| provider         |         | provider           |         | config           |
| url              |         | video_url          |         | duration_seconds |
| status           |         | status             |         +------------------+
| cost_usd         |         +--------------------+                 |
+------------------+                                                v
                                                            +------------------+
+------------------+         +--------------------+         | voice_transcripts|
| computer_sessions|         | personas           |         +------------------+
+------------------+         +--------------------+         | id (PK)          |
| id (PK)          |         | id (PK)            |         | session_id (FK)  |
| user_id          |         | creator_id         |         | role             |
| type             |         | name               |         | text             |
| status           |         | system_prompt      |         | emotion          |
| current_url      |         | capabilities       |         +------------------+
+------------------+         | visibility         |
        |                    +--------------------+
        v
+------------------+         +--------------------+         +------------------+
| computer_actions |         | persona_knowledge  |         | custom_voices    |
+------------------+         +--------------------+         +------------------+
| id (PK)          |         | id (PK)            |         | id (PK)          |
| session_id (FK)  |         | persona_id (FK)    |         | user_id          |
| action_type      |         | file_name          |         | provider         |
| params           |         | storage_path       |         | name             |
| result           |         +--------------------+         +------------------+

+------------------+         +--------------------+         +------------------+
| scheduled_tasks  |         | meta_workflows     |         | meta_conversations|
+------------------+         +--------------------+         +------------------+
| id (PK)          |         | id (PK)            |         | id (PK)          |
| user_id          |         | project_id (FK)    |         | user_id          |
| name             |         | user_id            |         | agent_type       |
| type             |         | trigger_type       |         | title            |
| schedule         |         | status             |         | total_tokens     |
| action           |         +--------------------+         +------------------+
| next_run_at      |                 |                              |
+------------------+                 v                              v
                             +------------------+         +------------------+
+------------------+         | workflow_states  |         | meta_messages    |
| task_executions  |         +------------------+         +------------------+
+------------------+         | id (PK)          |         | id (PK)          |
| id (PK)          |         | workflow_id (FK) |         | conversation_id  |
| task_id (FK)     |         | state_type       |         | role             |
| status           |         | action_config    |         | content          |
| duration_ms      |         +------------------+         | embedding (vec)  |
+------------------+                                      +------------------+

+------------------+         +--------------------+         +------------------+
| google_oauth     |         | files              |         | users            |
+------------------+         +--------------------+         +------------------+
| user_id (PK)     |         | id (PK)            |         | id (PK)          |
| access_token     |         | filename           |         | email            |
| refresh_token    |         | mime_type          |         | password_hash    |
| expires_at       |         | extracted_text     |         | role             |
+------------------+         | analysis_result    |         | last_login_at    |
                             +--------------------+         +------------------+
                                                                   |
+------------------+         +--------------------+                v
| user_settings    |         | presence_status    |         +------------------+
+------------------+         +--------------------+         | sessions         |
| id (PK)          |         | user_id (PK)       |         +------------------+
| user_id          |         | status             |         | id (PK)          |
| model_parameters |         | current_view       |         | user_id (FK)     |
| reasoning_config |         | cursor             |         | token            |
| rag_config       |         | last_active        |         | expires_at       |
+------------------+         +--------------------+         +------------------+

+------------------+         +--------------------+         +------------------+
| idea_projects    |         | idea_project_phases|         | idea_phase_artifacts|
+------------------+         +--------------------+         +------------------+
| id (PK)          |         | id (PK)            |         | id (PK)          |
| user_id          |         | project_id (FK)    |         | phase_id (FK)    |
| template_id      |         | phase              |         | name             |
| current_phase    |         | status             |         | content          |
| overall_status   |         | inputs             |         | content_embedding|
+------------------+         | gate_status        |         +------------------+
                             +--------------------+
```

---

## Migration Order

Execute schemas in this exact order to maintain foreign key dependencies:

| Order | File | Description | Dependencies |
|-------|------|-------------|--------------|
| 1 | `001_initial_schema.sql` | Core meta tables (projects, tasks, workstreams) | None |
| 2 | `002_memory_schema.sql` | Memory/personalization extensions | 001 |
| 3 | `003_files_schema.sql` | File upload and analysis | None |
| 4 | `004_thinking_schema.sql` | Extended thinking engine | None |
| 5 | `005_research_schema.sql` | Deep research system | Requires projects table |
| 6 | `006_images_schema.sql` | Image generation system | None |
| 7 | `007_voice_schema.sql` | Voice conversation system | Requires users table |
| 8 | `008_computer_schema.sql` | Browser automation | None |
| 9 | `009_personas_schema.sql` | Custom AI personas | None |
| 10 | `010_video_schema.sql` | Video generation | None |
| 11 | `011_google_workspace_schema.sql` | Google integration | None |
| 12 | `012_scheduled_tasks_schema.sql` | Task scheduling | None |
| 13 | `013_auth_schema.sql` | Authentication system | None |
| 14 | `013_rls_policies.sql` | Row-level security | All previous |
| 15 | `014_task_history.sql` | Audit trail | 001 |
| 16 | `015_workflow_state_machine.sql` | Visual workflows | 001 |
| 17 | `016_conversations.sql` | Conversation history | 001 |
| 18 | `017_storage_buckets.sql` | File storage config | 001, 016 |
| 19 | `018_realtime_schema.sql` | Real-time collaboration | None |
| 20 | `019_idea_to_launch.sql` | Idea-to-launch framework | Requires auth.users |
| 21 | `020_advanced_settings.sql` | A++ settings | None |

---

## Deployment Status

### Deployed to Supabase (Confirmed)

| Table | Schema File | RLS | Rows |
|-------|-------------|-----|------|
| `prompt_library` | Custom | Yes | 0 |
| `prompt_assets` | Custom | Yes | 0 |
| `prompt_categories` | Custom | Yes | 0 |
| `prompt_embeddings` | Custom | Yes | 0 |
| `leads` | Custom | Yes | 0 |
| `conversations` | Custom | Yes | 0 |
| `messages` | Custom | Yes | 0 |
| `machines` | Custom | No | 3 |
| `repo_registry` | Custom | No | 0 |
| `local_repos` | Custom | No | 0 |
| `ide_settings` | Custom | No | 1 |
| `active_sessions` | Custom | No | 0 |
| `file_cursors` | Custom | No | 0 |
| `chat_histories` | Custom | No | 0 |
| `agent_memory` | Custom | No | 0 |
| `sync_events` | Custom | No | 0 |
| `embeddings` | Custom | No | 0 |

### Pending Deployment (From Schema Files)

| Table | Schema File | Priority |
|-------|-------------|----------|
| `meta_projects` | 001_initial_schema.sql | HIGH |
| `meta_workstreams` | 001_initial_schema.sql | HIGH |
| `meta_tasks` | 001_initial_schema.sql | HIGH |
| `meta_task_dependencies` | 001_initial_schema.sql | HIGH |
| `meta_task_runs` | 001_initial_schema.sql | HIGH |
| `meta_artifacts` | 001_initial_schema.sql | HIGH |
| `meta_decisions` | 001_initial_schema.sql | HIGH |
| `meta_memory_facts` | 001_initial_schema.sql | HIGH |
| `meta_budgets` | 001_initial_schema.sql | HIGH |
| `thinking_sessions` | 004_thinking_schema.sql | HIGH |
| `thought_nodes` | 004_thinking_schema.sql | HIGH |
| `thinking_templates` | 004_thinking_schema.sql | MEDIUM |
| `research_sessions` | 005_research_schema.sql | HIGH |
| `research_sources` | 005_research_schema.sql | HIGH |
| `research_facts` | 005_research_schema.sql | HIGH |
| `knowledge_nodes` | 005_research_schema.sql | MEDIUM |
| `generated_images` | 006_images_schema.sql | HIGH |
| `prompt_templates` | 006_images_schema.sql | MEDIUM |
| `image_collections` | 006_images_schema.sql | LOW |
| `voice_sessions` | 007_voice_schema.sql | HIGH |
| `voice_transcripts` | 007_voice_schema.sql | HIGH |
| `custom_voices` | 007_voice_schema.sql | MEDIUM |
| `computer_sessions` | 008_computer_schema.sql | HIGH |
| `computer_actions` | 008_computer_schema.sql | HIGH |
| `saved_workflows` | 008_computer_schema.sql | MEDIUM |
| `personas` | 009_personas_schema.sql | HIGH |
| `persona_knowledge` | 009_personas_schema.sql | HIGH |
| `persona_conversations` | 009_personas_schema.sql | HIGH |
| `generated_videos` | 010_video_schema.sql | MEDIUM |
| `video_collections` | 010_video_schema.sql | LOW |
| `google_oauth_tokens` | 011_google_workspace_schema.sql | HIGH |
| `google_workspace_actions` | 011_google_workspace_schema.sql | MEDIUM |
| `scheduled_tasks` | 012_scheduled_tasks_schema.sql | HIGH |
| `task_executions` | 012_scheduled_tasks_schema.sql | HIGH |
| `users` | 013_auth_schema.sql | HIGH |
| `sessions` | 013_auth_schema.sql | HIGH |
| `api_keys` | 013_auth_schema.sql | HIGH |
| `permissions` | 013_auth_schema.sql | MEDIUM |
| `roles` | 013_auth_schema.sql | MEDIUM |
| `meta_task_history` | 014_task_history.sql | HIGH |
| `meta_project_history` | 014_task_history.sql | HIGH |
| `meta_workflows` | 015_workflow_state_machine.sql | HIGH |
| `meta_workflow_states` | 015_workflow_state_machine.sql | HIGH |
| `meta_workflow_instances` | 015_workflow_state_machine.sql | HIGH |
| `meta_conversations` | 016_conversations.sql | HIGH |
| `meta_messages` | 016_conversations.sql | HIGH |
| `meta_file_metadata` | 017_storage_buckets.sql | MEDIUM |
| `meta_storage_quotas` | 017_storage_buckets.sql | MEDIUM |
| `presence_status` | 018_realtime_schema.sql | HIGH |
| `collaboration_sessions` | 018_realtime_schema.sql | HIGH |
| `realtime_operations` | 018_realtime_schema.sql | MEDIUM |
| `idea_project_templates` | 019_idea_to_launch.sql | HIGH |
| `idea_projects` | 019_idea_to_launch.sql | HIGH |
| `idea_project_phases` | 019_idea_to_launch.sql | HIGH |
| `idea_phase_artifacts` | 019_idea_to_launch.sql | HIGH |
| `user_settings` | 020_advanced_settings.sql | HIGH |
| `parameter_presets` | 020_advanced_settings.sql | HIGH |
| `user_rules` | 020_advanced_settings.sql | MEDIUM |
| `custom_agents` | 020_advanced_settings.sql | HIGH |
| `skills` | 020_advanced_settings.sql | HIGH |
| `mcp_configs` | 020_advanced_settings.sql | HIGH |
| `custom_functions` | 020_advanced_settings.sql | MEDIUM |

---

## Schema Details

### 001_initial_schema.sql - Core Meta Tables

**Tables:**
- `meta_projects` - Project containers with status tracking
- `meta_workstreams` - Logical groupings within projects
- `meta_tasks` - Individual work items with agent assignment
- `meta_task_dependencies` - Task dependency relationships
- `meta_task_runs` - Execution history and cost tracking
- `meta_artifacts` - Generated files and outputs
- `meta_decisions` - Recorded decisions with rationale
- `meta_memory_facts` - Semantic memory with vector embeddings
- `meta_budgets` - Token and cost budgets by model tier

**Extensions:**
- `vector` - pgvector for embeddings
- `uuid-ossp` - UUID generation

**Key Indexes:**
- `idx_meta_tasks_status` - Task status queries
- `idx_meta_memory_embedding` - Vector similarity search (ivfflat)

**Functions:**
- `get_ready_tasks()` - Returns tasks with satisfied dependencies

---

### 002_memory_schema.sql - Memory System

**Columns Added to `meta_memory_facts`:**
- `user_id` - Multi-user support
- `category` - preference, fact, instruction, context
- `enabled` - Active/inactive toggle
- `last_accessed_at` - Usage tracking

**Functions:**
- `search_user_memories()` - Semantic search by user
- `get_user_memories()` - List active memories

---

### 003_files_schema.sql - File Management

**Tables:**
- `files` - File metadata with analysis results

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) | SHA-256 hash |
| filename | VARCHAR(255) | Stored filename |
| mime_type | VARCHAR(100) | File type |
| extracted_text | TEXT | OCR/parsed content |
| analysis_result | JSONB | AI analysis |

**Indexes:**
- Full-text search on `extracted_text`
- GIN index on `analysis_result`

---

### 004_thinking_schema.sql - Extended Thinking

**Tables:**
- `thinking_sessions` - Reasoning sessions
- `thought_nodes` - Individual thoughts in tree structure
- `thinking_templates` - Pre-built reasoning frameworks
- `bookmarked_thoughts` - Saved thought branches

**Node Types:**
`observation`, `hypothesis`, `analysis`, `critique`, `conclusion`, `question`, `evidence`, `alternative`, `synthesis`

**Pre-built Templates:**
1. Problem Solving
2. Code Review
3. Research Analysis
4. Creative Ideation
5. Systematic Debugging
6. Decision Analysis

**Functions:**
- `get_thinking_path()` - Trace from node to root
- `get_thinking_subtree()` - Get all descendants
- `calculate_session_stats()` - Comprehensive statistics
- `find_high_confidence_branches()` - Quality branches

---

### 005_research_schema.sql - Deep Research

**Tables:**
- `research_sessions` - Research queries
- `research_sources` - Found sources with credibility
- `research_facts` - Extracted facts
- `fact_sources` - Fact-source mapping
- `fact_contradictions` - Conflicting facts
- `knowledge_nodes` - Knowledge graph entities
- `knowledge_relationships` - Entity connections
- `research_follow_ups` - Suggested questions
- `research_reports` - Generated reports
- `research_events` - SSE progress updates

**Credibility Scoring:**
- Authority score (40%)
- Recency score (30%)
- Bias score (30%)

---

### 006_images_schema.sql - Image Generation

**Tables:**
- `generated_images` - All generated images
- `image_favorites` - User favorites
- `prompt_templates` - Reusable prompts
- `image_collections` - Albums
- `image_generation_stats` - Usage analytics

**Providers Supported:**
- DALL-E 3
- Stability AI
- Replicate

**Edit Types:**
`inpaint`, `outpaint`, `variation`, `upscale`, `style-transfer`

---

### 007_voice_schema.sql - Voice System

**Tables:**
- `voice_sessions` - Conversation sessions
- `voice_transcripts` - Message transcripts
- `custom_voices` - Cloned voices
- `voice_analytics` - Usage tracking

**Providers:**
- OpenAI
- ElevenLabs
- PlayHT

---

### 008_computer_schema.sql - Browser Automation

**Tables:**
- `computer_sessions` - Automation sessions
- `computer_actions` - Individual actions
- `saved_workflows` - Reusable workflows
- `workflow_executions` - Execution history
- `screen_snapshots` - Screenshots
- `element_interactions` - Click tracking
- `computer_task_executions` - AI task planning
- `computer_downloads` - Downloaded files

**Action Types:**
`click`, `type`, `scroll`, `navigate`, `screenshot`, `wait`, `select`, `hover`, `drag`, `key_press`

---

### 009_personas_schema.sql - Custom Personas

**Tables:**
- `personas` - AI persona definitions
- `persona_knowledge` - Knowledge files
- `persona_conversations` - Chat sessions
- `persona_messages` - Messages
- `persona_likes` - Social likes
- `persona_stats` - Usage statistics

**Visibility Levels:**
`private`, `unlisted`, `public`

---

### 010_video_schema.sql - Video Generation

**Tables:**
- `generated_videos` - Generated videos
- `video_favorites` - Favorites
- `video_collections` - Playlists
- `video_prompt_templates` - Prompt presets
- `video_provider_performance` - Provider metrics
- `video_generation_queue` - Job queue
- `video_analytics` - View tracking

---

### 011_google_workspace_schema.sql - Google Integration

**Tables:**
- `google_oauth_tokens` - OAuth credentials
- `google_workspace_actions` - Action audit
- `google_email_cache` - Gmail cache
- `google_calendar_events` - Calendar cache
- `google_drive_files` - Drive metadata
- `google_workspace_analytics` - Usage stats
- `google_ai_features_usage` - AI feature tracking

---

### 012_scheduled_tasks_schema.sql - Task Scheduling

**Tables:**
- `scheduled_tasks` - Task definitions
- `task_executions` - Execution history
- `task_webhooks` - Webhook triggers

**Task Types:**
`one-time`, `recurring`, `trigger`

**Functions:**
- `get_due_tasks()` - Ready tasks for worker
- `get_upcoming_user_tasks()` - User's upcoming tasks
- `get_task_stats()` - Execution statistics

---

### 013_auth_schema.sql - Authentication

**Tables:**
- `users` - User accounts
- `sessions` - Active sessions
- `api_keys` - API access tokens
- `oauth_accounts` - OAuth connections
- `permissions` - Permission definitions
- `roles` - Role definitions
- `role_permissions` - Role-permission mapping
- `user_roles` - User-role mapping
- `auth_audit_log` - Auth events

**Default Roles:**
`user`, `admin`, `super_admin`

**RLS Policies:**
- Users see own data
- Admins see all

---

### 013_rls_policies.sql - Row Level Security

Enables RLS and creates policies for:
- `meta_projects`
- `meta_workstreams`
- `meta_tasks`
- `meta_task_dependencies`
- `meta_task_runs`
- `meta_artifacts`
- `meta_decisions`
- `meta_memory_facts`
- `meta_budgets`
- All feature tables

---

### 014_task_history.sql - Audit Trail

**Tables:**
- `meta_task_history` - Task changes
- `meta_project_history` - Project changes

**Tracked Fields:**
`title`, `description`, `status`, `priority`, `assigned_agent`, `model_tier`

**Functions:**
- `get_task_history()` - Task change log
- `get_project_activity_feed()` - Combined activity

---

### 015_workflow_state_machine.sql - Visual Workflows

**Tables:**
- `meta_workflows` - Workflow definitions
- `meta_workflow_states` - State nodes
- `meta_workflow_transitions` - State transitions
- `meta_workflow_instances` - Running instances
- `meta_workflow_logs` - Execution logs
- `meta_workflow_schedules` - CRON schedules

**State Types:**
`start`, `action`, `decision`, `parallel`, `wait`, `end`

**Trigger Types:**
`manual`, `scheduled`, `event`, `ai_suggested`, `webhook`

**Functions:**
- `get_workflow_start_state()` - Find start node
- `get_available_transitions()` - Valid next states
- `clone_workflow()` - Template cloning

---

### 016_conversations.sql - Chat History

**Tables:**
- `meta_conversations` - Conversation containers
- `meta_messages` - Individual messages
- `meta_message_attachments` - File attachments
- `meta_conversation_shares` - Sharing links

**Features:**
- Vector embeddings for semantic search
- Branching conversations
- User ratings/feedback

**Functions:**
- `search_messages_by_similarity()` - Semantic search
- `get_conversation_with_messages()` - Full conversation

---

### 017_storage_buckets.sql - File Storage

**Supabase Buckets:**
| Bucket | Public | Size Limit | MIME Types |
|--------|--------|------------|------------|
| user-uploads | No | 50MB | image/*, pdf, text |
| task-attachments | No | 100MB | Any |
| workflow-templates | No | 10MB | JSON |
| agent-artifacts | No | 100MB | Any |
| knowledge-base | No | 50MB | pdf, text, JSON, Office |
| generated-images | Yes | 20MB | image/* |
| generated-videos | Yes | 500MB | video/* |
| voice-recordings | No | 100MB | audio/* |
| conversation-exports | No | 50MB | JSON, text, pdf |

**Tables:**
- `meta_file_metadata` - Extended metadata
- `meta_storage_quotas` - User quotas

**Functions:**
- `search_files_by_content()` - Semantic file search
- `get_storage_summary()` - Usage breakdown

---

### 018_realtime_schema.sql - Real-time Collaboration

**Tables:**
- `presence_status` - User online status
- `presence_history` - Session history
- `realtime_events` - Event log
- `collaboration_sessions` - Active rooms
- `session_participants` - Room members
- `realtime_resource_state` - Sync state
- `realtime_operations` - OT operations
- `sync_conflicts` - Conflict log

**Enum Types:**
- `presence_status_enum`: online, away, busy, offline
- `collaboration_role`: owner, editor, viewer
- `operation_type_enum`: insert, delete, update, move

**Functions:**
- `get_active_room_users()` - Room participants
- `get_users_viewing_resource()` - Who's looking
- `cleanup_stale_presence()` - Remove inactive
- `end_inactive_sessions()` - Auto-cleanup

---

### 019_idea_to_launch.sql - Idea Framework

**Tables:**
- `idea_project_templates` - Project templates
- `idea_projects` - User projects
- `idea_project_phases` - Phase data
- `idea_phase_artifacts` - Generated docs
- `idea_artifact_revisions` - Version history
- `idea_phase_conversations` - AI chats
- `idea_conversation_messages` - Messages
- `idea_project_decisions` - Key decisions

**Project Phases:**
`discovery`, `ideation`, `specification`, `planning`, `implementation`, `launch`

**Pre-built Templates:**
1. New Product
2. Marketing Campaign
3. Lead Generation System
4. AI Bot / Assistant

---

### 020_advanced_settings.sql - A++ Settings

**Tables:**
- `user_settings` - Master settings
- `parameter_presets` - Saved presets
- `user_rules` - Custom rules (CLAUDE.md style)
- `custom_agents` - YAML agent definitions
- `skills` - Reusable capabilities
- `user_skills` - Installed skills
- `mcp_configs` - MCP server configs
- `custom_functions` - User-defined tools
- `settings_history` - Change log
- `thinking_sessions` - Reasoning metrics

**Exposed Parameters (What Competitors Hide):**
- `temperature`, `top_p`, `top_k`
- `frequency_penalty`, `presence_penalty`
- `reasoning_effort`, `thinking_budget`
- `search_depth`, `max_sources`
- `chunk_size`, `similarity_threshold`

**System Presets:**
1. Creative - Higher temperature
2. Precise - Lower temperature
3. Balanced - Default
4. Maximum Reasoning - Deep thinking

---

## Missing Schemas for A++ Features

Based on the A++ feature roadmap, the following schemas may need additions:

### Not Yet Implemented

1. **Canvas/Artifacts Schema** - For split-screen editing artifacts
2. **MCP Marketplace Schema** - For installing/sharing MCP configs
3. **Agent Marketplace Schema** - For sharing custom agents
4. **Skill Sharing Schema** - For community skills
5. **Theme/Branding Schema** - For custom UI themes
6. **API Usage/Billing Schema** - For token tracking and billing
7. **Team/Organization Schema** - For multi-user workspaces
8. **Notification Schema** - For alerts and notifications
9. **Export/Import Schema** - For data portability
10. **Feedback/Ratings Schema** - For marketplace ratings

### Recommended Additions

```sql
-- Canvas Artifacts
CREATE TABLE canvas_artifacts (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT, -- 'code', 'markdown', 'react', 'html'
  version INTEGER,
  is_published BOOLEAN,
  created_at TIMESTAMPTZ
);

-- API Usage Tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY,
  user_id UUID,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL,
  endpoint TEXT,
  created_at TIMESTAMPTZ
);

-- Team Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_id UUID,
  billing_plan TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE organization_members (
  org_id UUID,
  user_id UUID,
  role TEXT, -- 'owner', 'admin', 'member'
  PRIMARY KEY (org_id, user_id)
);
```

---

## Key Features

### Vector Search (pgvector)

Used in:
- `meta_memory_facts.embedding` - Memory search
- `meta_messages.embedding` - Conversation search
- `prompt_embeddings.embedding` - Prompt search
- `idea_phase_artifacts.content_embedding` - Document search
- `meta_file_metadata.text_embedding` - File search

Index type: `ivfflat` with `vector_cosine_ops`

### Row Level Security

All user-facing tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Admins can access all data
- Public items are accessible to all
- Shared items respect share settings

### Audit Trails

- `meta_task_history` - Task changes
- `meta_project_history` - Project changes
- `settings_history` - Settings changes
- `auth_audit_log` - Authentication events
- `research_events` - Research progress
- `realtime_events` - Collaboration events

### Automatic Triggers

- `updated_at` timestamp updates
- Statistics aggregation
- Quota tracking
- History logging
- Cascade deletes

---

## Quick Start Commands

```bash
# Deploy all schemas in order
cd /Users/alanredmond/githubrepos/SHIPIT/librechat-meta-agent/schemas

# Apply each migration
psql $DATABASE_URL -f 001_initial_schema.sql
psql $DATABASE_URL -f 002_memory_schema.sql
# ... continue through 020

# Verify deployment
psql $DATABASE_URL -c "\dt public.*"

# Check RLS status
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

*Documentation generated by Database Analyst Agent*
