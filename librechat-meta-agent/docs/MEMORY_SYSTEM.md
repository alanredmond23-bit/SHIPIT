# Memory/Personalization System

A ChatGPT-like memory feature for the LibreChat Meta Agent that enables context-aware, personalized AI interactions through intelligent memory storage and retrieval.

## Overview

The memory system automatically learns from conversations and stores important facts, preferences, instructions, and context. It uses semantic search with pgvector to retrieve relevant memories, making AI responses more personalized and context-aware.

## Features

- **Automatic Memory Extraction**: AI analyzes conversations and extracts important information
- **Semantic Search**: Find relevant memories using vector embeddings
- **Memory Categories**: Organize memories as preferences, facts, instructions, or context
- **Importance Scoring**: Prioritize memories based on relevance
- **Enable/Disable**: Toggle memories on/off without deleting them
- **Full CRUD API**: Complete REST API for memory management
- **Rich UI Dashboard**: User-friendly interface for managing all memories

## Architecture

### Database Schema

Located in `/schemas/002_memory_schema.sql`:

- Extends `meta_memory_facts` table with user-specific fields
- Adds `user_id`, `category`, `enabled`, and `last_accessed_at` columns
- Creates indexes for efficient querying and semantic search
- Provides SQL functions for searching and retrieving memories

### Backend Service

Located in `/orchestrator/src/services/memory-service.ts`:

**Key Methods:**
- `createMemory()` - Create a new memory with automatic embedding generation
- `listMemories()` - List memories with flexible filtering
- `searchMemories()` - Semantic search using vector similarity
- `extractMemories()` - Auto-extract memories from conversations
- `getRelevantMemories()` - Get contextually relevant memories
- `updateMemory()` - Update existing memories
- `deleteMemory()` - Remove memories

### API Endpoints

Located in `/orchestrator/src/api/memory.ts`:

```
GET    /api/memory           - List all memories
GET    /api/memory/stats     - Get memory statistics
GET    /api/memory/:id       - Get specific memory
POST   /api/memory           - Create new memory
PATCH  /api/memory/:id       - Update memory
DELETE /api/memory/:id       - Delete memory
POST   /api/memory/search    - Semantic search
POST   /api/memory/extract   - Extract from conversation
POST   /api/memory/relevant  - Get relevant memories
POST   /api/memory/bulk-toggle - Bulk enable/disable
DELETE /api/memory/bulk      - Bulk delete
```

### Frontend UI

Located in `/ui-extensions/app/memory/page.tsx`:

A comprehensive React dashboard with:
- Real-time statistics
- Advanced filtering (category, status, search)
- Add/edit/delete memories
- Bulk operations
- Toggle memories on/off
- Visual importance indicators
- Category badges

## Setup

### 1. Database Migration

Run the schema migration:

```bash
psql -U postgres -d librechat_meta -f schemas/002_memory_schema.sql
```

Or if using Docker:

```bash
docker-compose exec postgres psql -U postgres -d librechat_meta -f /schemas/002_memory_schema.sql
```

### 2. Environment Variables

Ensure your `.env` file has:

```bash
ANTHROPIC_API_KEY=your-api-key-here
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=librechat_meta
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

### 3. Start Services

```bash
# Start orchestrator (backend)
cd orchestrator
npm install
npm run dev

# Start UI (frontend)
cd ui-extensions
npm install
npm run dev
```

### 4. Access Memory UI

Navigate to: `http://localhost:3000/memory`

## Usage Examples

### Creating a Memory via API

```bash
curl -X POST http://localhost:3001/api/memory \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "default",
    "content": "User prefers Python over JavaScript for backend development",
    "category": "preference",
    "importance_score": 0.8
  }'
```

### Searching Memories

```bash
curl -X POST http://localhost:3001/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What programming languages does the user prefer?",
    "user_id": "user-123",
    "limit": 5
  }'
```

### Auto-Extracting Memories

```bash
curl -X POST http://localhost:3001/api/memory/extract \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "default",
    "user_id": "user-123",
    "auto_save": true,
    "conversation": [
      {
        "role": "user",
        "content": "I work at Acme Corp as a senior engineer. I prefer TypeScript and always use strict mode."
      },
      {
        "role": "assistant",
        "content": "Got it! I'\''ll remember that you work at Acme Corp and prefer TypeScript with strict mode."
      }
    ]
  }'
```

### Getting Relevant Memories

```bash
curl -X POST http://localhost:3001/api/memory/relevant \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "default",
    "user_id": "user-123",
    "context": "Help me write a backend API",
    "limit": 5
  }'
```

## Memory Categories

### Preference
User preferences and personal choices:
- "Prefers concise explanations"
- "Likes dark mode"
- "Uses tabs instead of spaces"

### Fact
Factual information about the user:
- "Works at Acme Corp"
- "Has 5 years of Python experience"
- "Lives in San Francisco"

### Instruction
Standing instructions that should always be followed:
- "Always add type hints to Python code"
- "Use British English spelling"
- "Include error handling in all functions"

### Context
Important contextual information:
- "Currently working on e-commerce project"
- "Team uses microservices architecture"
- "Deadline is next Friday"

## Integration with Chat

To use memories in your chat application, retrieve relevant memories before each response:

```typescript
// Get relevant memories based on user's message
const memories = await memoryService.getRelevantMemories({
  user_id: userId,
  project_id: projectId,
  context: userMessage,
  limit: 5
});

// Include memories in system prompt
const systemPrompt = `
You are a helpful assistant. Here are some things you should remember about the user:

${memories.map(m => `- ${m.content}`).join('\n')}

Now respond to the user's message keeping these memories in mind.
`;
```

## Important Notes

### Embedding Generation

⚠️ **IMPORTANT**: The current implementation uses a placeholder embedding function. For production use, you MUST integrate a real embedding service:

**Recommended Options:**
1. **OpenAI Embeddings** (text-embedding-3-small)
2. **Cohere Embeddings** (embed-english-v3.0)
3. **Voyage AI** (voyage-2)
4. **Self-hosted** (Sentence Transformers)

**To integrate OpenAI embeddings:**

```typescript
// In memory-service.ts, update generateEmbedding():
private async generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### Performance Optimization

For large-scale deployments:

1. **Index Tuning**: Adjust the ivfflat index parameters
2. **Caching**: Cache frequently accessed memories
3. **Batch Processing**: Extract memories in batches
4. **Expiration**: Set `expires_at` for temporary context

### Privacy Considerations

- Memories can contain sensitive user information
- Implement proper user authentication and authorization
- Consider data retention policies
- Provide users with data export and deletion options
- Encrypt sensitive memories at rest

## API Response Examples

### List Memories Response

```json
{
  "data": [
    {
      "id": "uuid-here",
      "user_id": "user-123",
      "project_id": "default",
      "content": "User prefers Python for backend development",
      "summary": "Python preference for backend",
      "category": "preference",
      "enabled": true,
      "importance_score": 0.8,
      "created_at": "2024-01-15T10:30:00Z",
      "last_accessed_at": "2024-01-20T15:45:00Z"
    }
  ],
  "count": 1
}
```

### Search Response

```json
{
  "data": [
    {
      "id": "uuid-here",
      "content": "User prefers Python for backend development",
      "category": "preference",
      "importance_score": 0.8,
      "similarity": 0.92,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### Stats Response

```json
{
  "data": {
    "total": 42,
    "enabled": 38,
    "disabled": 4,
    "by_category": {
      "preference": 15,
      "fact": 18,
      "instruction": 6,
      "context": 3
    }
  }
}
```

## Troubleshooting

### Embeddings not working
- Verify pgvector extension is installed: `CREATE EXTENSION IF NOT EXISTS vector;`
- Check embedding dimension matches (1536 for OpenAI's text-embedding-3-small)
- Replace placeholder embedding function with real service

### Memories not appearing
- Check `enabled` flag is true
- Verify `expires_at` is null or in the future
- Ensure proper `user_id` and `project_id` filtering

### Slow searches
- Verify indexes are created: `\d meta_memory_facts`
- Tune ivfflat index parameters
- Consider limiting search results
- Add caching layer

## Future Enhancements

- [ ] Memory importance decay over time
- [ ] Automatic memory consolidation (merge similar memories)
- [ ] Memory conflict resolution
- [ ] User memory export (GDPR compliance)
- [ ] Memory sharing between users (with permissions)
- [ ] Conversation-level context windows
- [ ] Memory versioning and history
- [ ] A/B testing memory retrieval strategies

## Contributing

When adding new features to the memory system:

1. Update database schema in a new migration file
2. Add service methods with proper TypeScript types
3. Create corresponding API endpoints
4. Update frontend UI components
5. Add tests for new functionality
6. Update this documentation

## License

Part of the LibreChat Meta Agent project.
