# Deep Research Integration Guide

## Quick Start Integration

This guide shows how to integrate the Deep Research Mode into your existing LibreChat Meta Agent orchestrator.

## Step 1: Update Package Dependencies

Add to `orchestrator/package.json`:

```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12",
    "node-fetch": "^2.6.7"
  }
}
```

Run:
```bash
cd orchestrator
npm install cheerio node-fetch
```

## Step 2: Apply Database Schema

```bash
psql -U postgres -d your_database -f schemas/005_research_schema.sql
```

Or if using Docker:
```bash
docker exec -i postgres_container psql -U postgres -d your_database < schemas/005_research_schema.sql
```

## Step 3: Configure Environment Variables

Add to `orchestrator/.env` or your environment:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional - More providers = better results
GOOGLE_API_KEY=AIzaxxxxx
GOOGLE_SEARCH_ENGINE_ID=xxxxx
BING_SEARCH_API_KEY=xxxxx
SERPAPI_KEY=xxxxx
NEWS_API_KEY=xxxxx
```

### Getting API Keys

1. **Google Custom Search**:
   - Create API key: https://console.cloud.google.com/apis/credentials
   - Create Custom Search Engine: https://programmablesearchengine.google.com/
   - Enable Custom Search API

2. **Bing Search**:
   - Sign up: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
   - Get API key from Azure portal

3. **SerpAPI** (for Google Scholar):
   - Sign up: https://serpapi.com/
   - Free tier: 100 searches/month

4. **NewsAPI**:
   - Sign up: https://newsapi.org/
   - Free tier: 100 requests/day

Note: The system works even without API keys - it will use free sources (Wikipedia, arXiv, Reddit, StackOverflow)

## Step 4: Update Main Server File

In `orchestrator/src/index.ts`, add the research engine:

```typescript
import express from 'express';
import { Pool } from 'pg';
import pino from 'pino';
import { DeepResearchEngine } from './services/deep-research';
import { setupResearchRoutes } from './api/research';

// ... existing imports

const app = express();
const logger = pino();

// Database connection
const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'librechat',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
});

// ... existing middleware

// Initialize Deep Research Engine
const researchEngine = new DeepResearchEngine(
  db,
  logger,
  process.env.ANTHROPIC_API_KEY || '',
  {
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    bingApiKey: process.env.BING_SEARCH_API_KEY,
    serpApiKey: process.env.SERPAPI_KEY,
    newsApiKey: process.env.NEWS_API_KEY,
  }
);

// Setup research routes
setupResearchRoutes(app, researchEngine, logger);

// ... existing routes

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
```

## Step 5: Update Routes Registry

If you have a central routes file (like `orchestrator/src/api/routes.ts`), add:

```typescript
import { setupResearchRoutes } from './research';

export function setupAllRoutes(app: Express, services: Services, logger: Logger) {
  // ... existing routes

  setupResearchRoutes(app, services.researchEngine, logger);

  logger.info('All routes registered');
}
```

## Step 6: Add UI Route

In `ui-extensions/app/research/page.tsx`:

```typescript
import { DeepResearch } from '@/components/Research';

export default function ResearchPage() {
  return (
    <div className="container mx-auto py-8">
      <DeepResearch />
    </div>
  );
}
```

## Step 7: Add Navigation Link

In your main navigation (e.g., `ui-extensions/app/layout.tsx`):

```typescript
<nav>
  {/* ... existing links */}
  <Link href="/research" className="nav-link">
    🔍 Deep Research
  </Link>
</nav>
```

## Step 8: Test the Integration

1. Start your orchestrator:
```bash
cd orchestrator
npm run dev
```

2. Start your UI:
```bash
cd ui-extensions
npm run dev
```

3. Navigate to `http://localhost:3000/research`

4. Try a test query:
```
Query: "What are the latest breakthroughs in quantum computing?"
Depth: Standard
```

5. Watch the real-time progress!

## API Testing

Test endpoints with curl:

```bash
# Start research
curl -X POST http://localhost:3001/api/research/start \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence trends 2024",
    "project_id": "test-project",
    "config": {
      "depth": "standard",
      "includeAcademic": true
    }
  }'

# Response: {"data": {"session_id": "uuid-here", ...}}

# Get session status
curl http://localhost:3001/api/research/SESSION_ID

# Stream updates (in browser or with proper SSE client)
curl -N http://localhost:3001/api/research/SESSION_ID/stream

# Get facts
curl http://localhost:3001/api/research/SESSION_ID/facts

# Export report
curl http://localhost:3001/api/research/SESSION_ID/export/md > report.md
```

## Monitoring

Add logging to track research performance:

```typescript
// In your logger configuration
logger.info({
  event: 'research_started',
  session_id: sessionId,
  query: query,
  depth: config.depth
});

logger.info({
  event: 'research_completed',
  session_id: sessionId,
  duration_ms: duration,
  sources_found: stats.sourcesSearched,
  facts_extracted: stats.factsExtracted
});
```

## Error Handling

Add error handlers:

```typescript
// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.message.includes('research')) {
    logger.error({ error: err }, 'Research error');
    return res.status(500).json({
      error: {
        message: 'Research operation failed',
        code: 'RESEARCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }
    });
  }
  next(err);
});
```

## Performance Tuning

### Database Indexes

Ensure indexes are created (included in schema):
```sql
CREATE INDEX idx_research_sessions_status ON research_sessions(status);
CREATE INDEX idx_research_sources_credibility ON research_sources(overall_credibility DESC);
CREATE INDEX idx_research_facts_confidence ON research_facts(confidence DESC);
```

### Connection Pooling

Configure PostgreSQL pool:
```typescript
const db = new Pool({
  // ... connection config
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});
```

### Rate Limiting

Add rate limiting for research endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const researchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 research sessions per window
  message: 'Too many research requests, please try again later'
});

app.post('/api/research/start', researchLimiter, async (req, res) => {
  // ... handler
});
```

## Customization Examples

### Custom Search Provider

Add a custom provider in `search-providers.ts`:

```typescript
export class CustomProvider implements SearchProvider {
  name = 'custom';

  constructor(private apiKey: string, private logger: Logger) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    // Your custom search logic
    const results = await fetch(`https://api.custom.com/search?q=${query}`);
    // Parse and return results
    return [];
  }
}

// Add to SearchOrchestrator
this.providers.push(new CustomProvider(config.customApiKey, logger));
```

### Custom Credibility Scoring

Modify credibility calculation in `deep-research.ts`:

```typescript
private async calculateCredibility(
  searchResult: SearchResult,
  extracted: ExtractedContent
): Promise<ResearchSource['credibility']> {
  // Your custom scoring logic
  let authorityScore = 0.5;

  // Example: Boost specific domains
  if (searchResult.url.includes('trusted-source.com')) {
    authorityScore = 0.95;
  }

  // Example: Use external API for bias detection
  const biasScore = await this.detectBias(extracted.content);

  return {
    authorityScore,
    recencyScore: this.calculateRecency(extracted.publishDate),
    biasScore,
    overallScore: (authorityScore * 0.4) + (recencyScore * 0.3) + ((1.0 - biasScore) * 0.3)
  };
}
```

### Custom Report Templates

Modify report generation in `deep-research.ts`:

```typescript
private async generateReportWithAI(session: any, facts: any[], sources: any[]): Promise<ResearchReport> {
  const prompt = `Generate a ${session.report_format} research report...

  ${session.report_format === 'academic' ? 'Include methodology and limitations.' : ''}
  ${session.report_format === 'summary' ? 'Keep it concise, max 500 words.' : ''}
  `;

  // ... generate report
}
```

## Troubleshooting

### Issue: "Module not found: cheerio"

Solution:
```bash
npm install cheerio
```

### Issue: "Database relation does not exist"

Solution:
```bash
psql -U postgres -d your_db -f schemas/005_research_schema.sql
```

### Issue: "SSE stream not updating"

Check that:
1. Nginx/reverse proxy allows SSE (set `proxy_buffering off;`)
2. Headers are correct
3. Connection isn't timing out

### Issue: "No search results found"

Check:
1. API keys are valid
2. Network connectivity
3. Rate limits not exceeded
4. Check logs: `tail -f orchestrator/logs/app.log`

## Production Deployment

### Environment Variables

Set in production:
```env
NODE_ENV=production
LOG_LEVEL=info
ANTHROPIC_API_KEY=sk-ant-prod-xxxxx
# ... other keys
```

### Scaling Considerations

1. **Horizontal Scaling**: Research sessions are stateless, can run on multiple instances
2. **Queue System**: Use Redis Bull for background research processing
3. **Caching**: Cache search results and extracted content
4. **CDN**: Serve exported reports from CDN

### Docker Deployment

```dockerfile
# In orchestrator/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose

```yaml
services:
  orchestrator:
    build: ./orchestrator
    ports:
      - "3001:3001"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      # ... other env vars
    depends_on:
      - postgres
```

## Next Steps

1. ✅ Complete basic integration
2. 🔄 Test with sample queries
3. 🎨 Customize UI theme
4. 📊 Add analytics tracking
5. 🚀 Deploy to production

For more details, see [DEEP_RESEARCH_GUIDE.md](./DEEP_RESEARCH_GUIDE.md)
