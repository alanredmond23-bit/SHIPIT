# META AGENT BATTLE PLAN
## Beat OpenAI, Claude, and Gemini on Every Metric

**Generated**: January 6, 2026
**Status**: Strategic Plan for Production
**Goal**: Ship a product that beats all competitors on measurable metrics

---

## COMPETITIVE BENCHMARKS TO BEAT

### Deep Research Comparison

| Metric | OpenAI | Claude | Gemini | **META AGENT TARGET** |
|--------|--------|--------|--------|----------------------|
| Max research time | 30 min | N/A | 60 min | **Unlimited** |
| Sources analyzed | "Hundreds" | 10/query | 100+ | **500+** |
| Iterations | Unclear | N/A | Multiple | **Configurable 1-20** |
| Export formats | PDF, Word, MD | MD | PDF, MD | **PDF, Word, MD, JSON, HTML** |
| Research visibility | Opaque | N/A | Opaque | **Full tree visible** |

### Extended Thinking Comparison

| Metric | OpenAI o3 | Claude | Gemini Deep Think | **META AGENT TARGET** |
|--------|-----------|--------|-------------------|----------------------|
| Thinking tokens | 1K-32K | 1K-64K | Up to 32K | **1K-128K** |
| Visibility | Hidden | Summary | Hidden | **Full visibility** |
| Effort levels | 4 (20-95%) | 3 (low/med/high) | Configurable | **5 levels + custom** |
| Inflection tracking | No | No | No | **Yes - count shown** |
| Reflection tracking | No | No | No | **Yes - count shown** |
| Confidence score | No | Yes | No | **Yes - real-time** |

### Context & Memory Comparison

| Metric | OpenAI | Claude | Gemini | **META AGENT TARGET** |
|--------|--------|--------|--------|----------------------|
| Context window | 128K-200K | 200K (1M beta) | 1M-2M | **2M standard** |
| Memory persistence | Yes | Rolling out | Yes | **Yes + project isolation** |
| Memory search | Basic | Yes | Yes | **Semantic vector search** |
| Memory editing | No | No | No | **Full CRUD** |

### API Control Comparison

| Parameter | OpenAI | Claude | Gemini | **META AGENT TARGET** |
|-----------|--------|--------|--------|----------------------|
| Temperature | Hidden in o3 | 0-1 | 0-1 | **0-2 with presets** |
| Top-P | Via API only | Via API only | Via API only | **UI slider** |
| Top-K | No | Via API only | Via API only | **UI slider** |
| Max tokens | Limited | 64K | 192K output | **128K output** |
| Frequency penalty | Via API | Via API | Via API | **UI slider** |
| Presence penalty | Via API | Via API | Via API | **UI slider** |
| Stop sequences | Via API | Via API | Via API | **UI editor** |

### MCP/Tools Comparison

| Metric | OpenAI | Claude | Gemini | **META AGENT TARGET** |
|--------|--------|--------|--------|----------------------|
| Tool count | ~10 | 75+ MCP | 20+ extensions | **75+ MCP functional** |
| Custom tools | GPT Actions | MCP servers | Extensions | **Custom functions + MCP** |
| Tool status | Hidden | Hidden | Hidden | **Real-time health** |
| Tool marketplace | Yes | Coming | Yes | **Yes with ratings** |

---

## PHASE 1: MAKE SETTINGS REAL (Priority: CRITICAL)

**Current State**: All settings UI is demo-only, disconnected from backend
**Target State**: Every slider, toggle, and input persists and affects AI output

### 1.1 Create Settings API Endpoints

```
POST   /api/settings                    - Save all settings
GET    /api/settings                    - Load user settings
PATCH  /api/settings/model-params       - Update model parameters
PATCH  /api/settings/reasoning          - Update reasoning config
PATCH  /api/settings/rag                - Update RAG config
PATCH  /api/settings/search             - Update search config
POST   /api/settings/presets            - Save custom preset
GET    /api/settings/presets            - List presets
DELETE /api/settings/presets/:id        - Delete preset
```

### 1.2 Create SettingsContext Provider

```typescript
// What user controls MUST affect:
interface UserSettings {
  modelParameters: {
    temperature: number;        // 0-2
    top_p: number;             // 0-1
    top_k: number;             // 1-100
    frequency_penalty: number; // -2 to 2
    presence_penalty: number;  // -2 to 2
    max_output_tokens: number; // 1-128000
    seed: number | null;
    stop_sequences: string[];
  };
  reasoningConfig: {
    reasoning_effort: 'low' | 'medium' | 'high' | 'max' | 'custom';
    thinking_budget: number;   // 1000-128000
    show_thinking: boolean;
    max_inflections: number;
    max_reflections: number;
    confidence_threshold: number;
  };
  ragConfig: {
    chunk_size: number;
    chunk_overlap: number;
    similarity_threshold: number;
    max_chunks: number;
    embedding_model: string;
  };
  searchConfig: {
    search_depth: number;      // 1-10
    max_sources: number;       // 1-500
    source_quality: 'any' | 'verified' | 'academic';
    include_domains: string[];
    exclude_domains: string[];
  };
}
```

### 1.3 Wire Settings to Chat API

**Before** (current broken flow):
```
User sets temp=0.3 → Local state → IGNORED → Claude gets default
```

**After** (target flow):
```
User sets temp=0.3 → POST /api/settings → DB → Chat reads DB → Claude gets 0.3
```

**Effort**: 6-8 hours
**Files to modify**:
- `ui-extensions/lib/settings-context.tsx` (create)
- `ui-extensions/app/api/settings/route.ts` (create)
- `ui-extensions/app/api/chat/route.ts` (modify to read settings)
- `orchestrator/src/api/settings.ts` (create)
- All Settings components (wire to context)

---

## PHASE 2: BEAT COMPETITOR RESEARCH

**Goal**: 500+ sources, unlimited time, full visibility

### 2.1 Research Engine Upgrades

| Feature | Implementation |
|---------|---------------|
| Source count | Configurable 10-500 sources |
| Research time | No timeout (user can cancel) |
| Iteration count | Show "Iteration 3 of 10" live |
| Source tree | Visual tree of all sources explored |
| Citation quality | Academic, News, Official, Community labels |
| Export | PDF with footnotes, Word with endnotes, MD with links |

### 2.2 Research Visibility Dashboard

```typescript
interface ResearchProgress {
  iteration: number;
  totalIterations: number;
  sourcesFound: number;
  sourcesAnalyzed: number;
  knowledgeGaps: string[];
  nextQueries: string[];
  confidence: number;
  estimatedTimeRemaining: number;
}
```

### 2.3 Research API Enhancements

```
POST /api/research/start
  body: { query, maxSources: 500, maxIterations: 20, quality: 'academic' }

GET /api/research/:id/stream
  returns: SSE with ResearchProgress updates every 2 seconds

GET /api/research/:id/sources
  returns: Full source tree with metadata

POST /api/research/:id/export
  body: { format: 'pdf' | 'docx' | 'md' | 'json' }
```

**Effort**: 8-12 hours
**Benchmark**: Must exceed Gemini's 100+ sources and 60-min limit

---

## PHASE 3: BEAT COMPETITOR THINKING

**Goal**: 128K thinking tokens, full visibility, real metrics

### 3.1 Thinking Engine Upgrades

| Metric | Current | Target |
|--------|---------|--------|
| Max thinking tokens | 64K (Claude limit) | 128K (multi-turn) |
| Visibility | Partial | Full tree with branches |
| Inflection count | Not tracked | Real-time counter |
| Reflection count | Not tracked | Real-time counter |
| Turn count | Not tracked | Real-time counter |
| Confidence | Basic | Per-thought confidence |

### 3.2 Thinking Visualization

```typescript
interface ThinkingState {
  isThinking: boolean;
  currentPhase: 'hypothesis' | 'analysis' | 'synthesis' | 'verification';
  thoughts: Thought[];
  inflectionCount: number;    // Times AI changed direction
  reflectionCount: number;    // Times AI questioned itself
  turnCount: number;          // Reasoning turns
  thinkingTokens: number;
  confidence: number;         // 0-100
  branches: ThinkingBranch[]; // Alternative paths considered
}
```

### 3.3 Wire to Extended Thinking API

Claude's extended thinking API parameters:
```typescript
{
  thinking: {
    type: "enabled",
    budget_tokens: 128000  // Our target: beat their 64K
  }
}
```

**Effort**: 6-8 hours
**Benchmark**: Must show MORE than Claude's "summary" - full reasoning tree

---

## PHASE 4: MAKE MCP FUNCTIONAL

**Goal**: 75 MCP servers actually work, not just display

### 4.1 MCP Integration Requirements

| Feature | Current | Target |
|---------|---------|--------|
| Server listing | ✅ 75 servers | ✅ Keep |
| Installation | ❌ Fake | ✅ Real npm/pip install |
| Configuration | ❌ Fake | ✅ Persisted to DB |
| Health checking | ❌ Mock | ✅ Real ping |
| Tool invocation | ❌ None | ✅ Working |

### 4.2 MCP API Endpoints

```
POST   /api/mcp/servers/:id/install     - Install server
POST   /api/mcp/servers/:id/uninstall   - Uninstall server
POST   /api/mcp/servers/:id/configure   - Save configuration
GET    /api/mcp/servers/:id/health      - Check health
POST   /api/mcp/servers/:id/invoke      - Invoke tool
GET    /api/mcp/servers                 - List with status
```

### 4.3 Priority Servers to Make Functional

1. **Filesystem** - Read/write files
2. **GitHub** - Repo access
3. **PostgreSQL** - Database queries
4. **Brave Search** - Web search
5. **Puppeteer** - Browser automation
6. **Memory** - Knowledge graph
7. **Slack** - Messaging
8. **Google Drive** - File access

**Effort**: 10-15 hours
**Benchmark**: At least 8 servers fully functional

---

## PHASE 5: ADD PERSISTENCE

**Goal**: Nothing is lost on refresh

### 5.1 Conversation Persistence

```typescript
// Save on every message
POST /api/conversations/:id/messages
  body: { role, content, model, settings_snapshot }

// Load on page open
GET /api/conversations/:id
  returns: { messages[], settings, created_at, updated_at }

// List conversations
GET /api/conversations
  returns: { id, title, preview, updated_at }[]
```

### 5.2 Settings Persistence

```typescript
// Auto-save on change (debounced)
PATCH /api/settings
  body: { [changed_field]: new_value }

// Load on app init
GET /api/settings
  returns: UserSettings
```

### 5.3 Session Persistence

```typescript
// Research sessions
POST /api/research/sessions
GET /api/research/sessions/:id

// Decision sessions
POST /api/decisions/sessions
GET /api/decisions/sessions/:id

// Thinking sessions
POST /api/thinking/sessions
GET /api/thinking/sessions/:id
```

**Effort**: 8-10 hours
**Benchmark**: 100% persistence - nothing lost

---

## PHASE 6: EXPORT & COLLABORATION

**Goal**: Get work OUT of the app

### 6.1 Export Formats

| Format | Conversations | Research | Decisions |
|--------|--------------|----------|-----------|
| Markdown | ✅ | ✅ | ✅ |
| PDF | ✅ | ✅ | ✅ |
| Word (.docx) | ✅ | ✅ | ✅ |
| JSON | ✅ | ✅ | ✅ |
| HTML | ✅ | ✅ | ✅ |

### 6.2 Export API

```
POST /api/export/conversation/:id
  body: { format: 'pdf' | 'docx' | 'md' | 'json' | 'html' }
  returns: { download_url }

POST /api/export/research/:id
  body: { format, include_sources: boolean, citation_style: 'apa' | 'mla' | 'chicago' }

POST /api/export/decision/:id
  body: { format, include_analysis: boolean }
```

### 6.3 Share Links

```
POST /api/share/conversation/:id
  body: { expires_in: '24h' | '7d' | 'never', password?: string }
  returns: { share_url, access_code }

GET /api/shared/:code
  returns: Read-only conversation view
```

**Effort**: 6-8 hours
**Benchmark**: All 5 formats working for all content types

---

## MATHEMATICAL TARGETS

### Research Quality Score
```
ResearchScore = (Sources × 0.3) + (Iterations × 0.2) + (QualityScore × 0.3) + (Speed × 0.2)

Target: ResearchScore > 85 (vs Gemini ~70, OpenAI ~65)
```

### Thinking Depth Score
```
ThinkingScore = (ThinkingTokens / 1000) + (Inflections × 5) + (Reflections × 5) + Confidence

Target: ThinkingScore > 150 (vs Claude ~100, OpenAI ~80)
```

### User Control Score
```
ControlScore = (ExposedParameters / TotalPossible) × 100

Current: 0% (nothing wired)
Target: 95%+ (every parameter user-controllable)
```

### Persistence Score
```
PersistenceScore = (SavedItems / TotalItems) × 100

Current: 0% (nothing persists)
Target: 100% (everything persists)
```

---

## IMPLEMENTATION ORDER

### Week 1: Foundation (20 hours)
1. SettingsContext + API (6 hrs)
2. Wire Settings to Chat (4 hrs)
3. Conversation Persistence (6 hrs)
4. Auth Enforcement (4 hrs)

### Week 2: Competitive Features (25 hours)
5. Research Engine Upgrades (10 hrs)
6. Thinking Engine Upgrades (8 hrs)
7. Export System (7 hrs)

### Week 3: Integration (20 hours)
8. MCP Functional Integration (12 hrs)
9. Database Migration Runner (3 hrs)
10. Testing & Polish (5 hrs)

---

## SUCCESS CRITERIA

| Metric | Competitor Best | Our Target | Pass/Fail |
|--------|-----------------|------------|-----------|
| Sources per research | 100 (Gemini) | 500 | ≥500 |
| Thinking tokens | 64K (Claude) | 128K | ≥100K |
| User parameters exposed | ~5 | 15+ | ≥12 |
| Persistence | Partial | 100% | 100% |
| MCP servers working | 0 | 75 | ≥8 |
| Export formats | 3 | 5 | 5 |
| Research visibility | Opaque | Full tree | Full |
| Thinking visibility | Summary | Full | Full |

---

## FILES TO CREATE/MODIFY

### New Files
- `ui-extensions/lib/settings-context.tsx`
- `ui-extensions/app/api/settings/route.ts`
- `ui-extensions/app/api/export/route.ts`
- `ui-extensions/app/api/share/route.ts`
- `orchestrator/src/api/settings.ts`
- `orchestrator/src/api/export.ts`
- `orchestrator/src/api/mcp-integration.ts`
- `scripts/migrate.ts`

### Files to Modify
- `ui-extensions/app/api/chat/route.ts` - Read settings
- `ui-extensions/app/chat/page.tsx` - Persist conversations
- `ui-extensions/components/Settings/*.tsx` - Wire to context
- `ui-extensions/hooks/useMCPManager.ts` - Real API calls
- `orchestrator/src/api/chat.ts` - Apply user settings
- `orchestrator/src/services/deep-research.ts` - Upgrade limits

---

**Total Estimated Effort**: 65 hours
**Timeline**: 3 weeks focused development
**Outcome**: Beat every competitor on every measurable metric

---

*This is the battle plan. Let's execute.*
