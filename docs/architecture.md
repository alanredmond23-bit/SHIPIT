# Joanna - Architecture Documentation

## Overview

Joanna is an AI-powered personal assistant designed for solo entrepreneurs and one-person teams. It provides intelligent task management, workflow automation, and multi-agent orchestration.

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling (to be added)

### Backend
- **Supabase** - PostgreSQL database with realtime capabilities
- **Supabase Edge Functions** - Serverless functions for AI processing
- **Row Level Security (RLS)** - User data isolation

### AI/ML
- **OpenAI GPT-4** - Natural language understanding and generation
- **Anthropic Claude** - Advanced reasoning and task planning
- **pgvector** - Vector embeddings for semantic search

### Storage
- **Supabase S3-compatible Storage** - File uploads and artifacts
- Custom metadata indexing

## Architecture Layers

### 1. Data Layer (Supabase PostgreSQL)

**Core Tables:**
- `profiles` - User profiles and preferences
- `agents` - AI agent configurations
- `tasks` - Task management with hierarchical support
- `workflows` - Workflow definitions and state machines
- `conversations` - AI conversation history
- `messages` - Individual messages with embeddings
- `knowledge_items` - User knowledge base with vector search

**Security:**
- Row Level Security (RLS) on all tables
- User-scoped data access
- Service role for admin operations

### 2. Business Logic Layer

**AI Orchestrator** (`src/core/orchestrator/`)
- Routes messages to appropriate AI agents
- Manages multi-agent conversations
- Aggregates context from multiple sources

**Workflow Engine** (`src/workflows/engine/`)
- Executes workflow state machines
- Handles transitions and conditions
- Logs execution history

**Task Manager** (`src/tasks/`)
- Task CRUD operations
- Dependency management
- Priority calculation

### 3. Integration Layer

**AI Services** (`lib/ai/`)
- OpenAI integration for GPT models
- Anthropic integration for Claude
- Embedding generation

**External Services** (`src/integrations/`)
- Calendar integration
- Email integration
- File storage

### 4. API Layer (Edge Functions)

**task-processor**
- Auto-prioritize tasks
- Suggest task breakdowns
- Detect dependencies

**workflow-engine**
- Execute workflow transitions
- Manage state
- Handle conditions

**ai-orchestrator**
- Route AI requests
- Manage agent selection
- Context aggregation

## Data Flow

### Task Creation Flow
```
User Input → API → Task Validation → Database → AI Analysis → Priority Suggestion → User Confirmation
```

### Workflow Execution Flow
```
Trigger → Workflow Instance Creation → State Evaluation → Action Execution → Transition → Log → Repeat
```

### AI Conversation Flow
```
User Message → Agent Selection → Context Retrieval → AI Processing → Response Generation → Store → Return
```

## Vector Search Architecture

**Embeddings Storage:**
- Messages: 1536-dimension OpenAI embeddings
- Knowledge Items: Semantic search across documents
- Agent Memory: Context-aware retrieval

**Search Strategy:**
- IVFFlat indexing for fast similarity search
- Cosine similarity for relevance matching
- Configurable thresholds

## Scalability Considerations

1. **Database Partitioning** - Ready for time-based partitioning on large tables
2. **Edge Functions** - Serverless auto-scaling
3. **Vector Indexes** - Optimized for millions of embeddings
4. **Caching Strategy** - To be implemented with Redis/Vercel KV

## Security

1. **Authentication** - Supabase Auth with JWT
2. **Authorization** - RLS policies per table
3. **API Security** - Service role keys for admin operations
4. **Data Encryption** - At rest and in transit

## Monitoring & Observability

**To Be Implemented:**
- Edge Function logs
- Database query performance monitoring
- User activity analytics
- Error tracking (Sentry)

## Future Enhancements

1. **Real-time Collaboration** - Supabase Realtime subscriptions
2. **Advanced Workflow Builder** - Visual drag-and-drop interface
3. **Mobile Apps** - React Native applications
4. **Integrations Hub** - Zapier-like connector system
5. **Custom Agent Training** - Fine-tuned models per user
